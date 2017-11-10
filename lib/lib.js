var request = require("request-promise");
var mimeType = require("mime-types");
var querystring = require("querystring");
var iconv = require("iconv-lite");

function createRequestOption(mock, ctx) {
	let protocol = ctx.protocol,
		host = mock && mock.host ? mock.host : ctx.host,
		path = mock && mock.path ? mock.path : ctx.path,
		port = mock && mock.port ? mock.port : ctx.port,
		query = mock && mock.query ? mock.query : ctx.query;
	let buildUrl = function () {
		var arr = [protocol, "://", host, port == "80" ? "" : (":" + port),
			path
		];
		if (query) {
			let tmpArray = [];
			Object.keys(query).forEach(key => {
				// discast mock api.
				if (key.startsWith("proxy-")) {
					return true;
				}
				tmpArray.push(encodeURIComponent(key) + "=" + encodeURIComponent(query[key] || ""));
			});
			if (tmpArray.length > 0) {
				arr.push("?", tmpArray.join("&"));
			}
		}
		return arr.join("");
	};
	let options = {
		url: buildUrl(protocol, host, path, port, query),
		method: ctx.method,
		resolveWithFullResponse: true,
		encoding: null,
		gzip: true
	};
	options.headers = {};
	if (ctx.headers) {
		Object.keys(ctx.headers).forEach(key => {
			// handle cache header.
			if (key === "if-modified-since" || key === "if-none-match") {
				return true;
			}
			options.headers[key] = ctx.headers[key];
		});
	}
	if(!options.headers["user-agent"]){
		options.headers["user-agent"] = mock.userAgent;
	}
	options.headers["host"] = host + (port == 80 ? "" : (":" + port));
	if (ctx.method.toLowerCase() in {
			"post": 1,
			"put": 1,
			"patch": 1
		}) {
		options.body = ctx.request.rawBody;
	}
	return options;
}

function isAsyncFunction(func) {
	if (typeof func === "function" && func.constructor && func.constructor.name === "AsyncFunction") {
		return true;
	}
	return false;
}

function merge() {
	var obj = Object.create(null);
	for (let i = 0; i < arguments.length; i++) {
		let item = arguments[i];
		if (item && typeof item === "object") {
			Object.keys(item).forEach(key => {
				obj[key] = item[key];
			});
		}
	}
	return obj;
}

function renderToBody(proxy, ctx) {
	var type = typeof proxy.type === "string" ? proxy.type : "json";
	var callback = ctx.query["callback"];
	var result = proxy.result || "";
	ctx.status = 200;
	if (callback) {
		// jsonp
		ctx.type = "js";
		switch (type) {
			case "xml":
			case "html":
			case "txt":
				result = result.replace(/\'/g, '\\\'').replace(/\n/g, "").replace(/\r/g, "");
				ctx.body = ["try{\n\t", callback, "('", result, "');\n}catch(e){}"].join("");
				break;
			default:
				ctx.body = ["try{\n\t", callback, "(", typeof (result) === "object" ? JSON.stringify(result, null, 4) : result, ");\n}catch(e){}"].join("");
		}
	} else {
		switch (type) {
			case "xml":
			case "html":
			case "text":
				ctx.type = type;
				ctx.body = result;
				break;
			case "javascript":
				ctx.type = "js";
				ctx.body = result;
			default:
				ctx.type = "json";
				ctx.body = typeof (result) === "object" ? JSON.stringify(result, null, 4) : result;
		}
	}
}

module.exports = function (options) {
	var op = Object.create(null);
	if (options && typeof options === "object") {
		Object.keys(options).forEach(item => {
			op[item] = options[item];
		});
	}

	let uniqServerID = op.proxyID || "koa2-request-proxy";
	let extList = ["txt", "html", "xml", "js", "json"];
	let userAgent = op.userAgent|| op.uniqServerID;
	let filter = op.filter,
		filterType = typeof filter,
		onBefore = op.onBefore,
		onBeforeAsync = isAsyncFunction(onBefore),
		onAfter = op.onAfter,
		onAfterAsync = isAsyncFunction(onAfter);

	let filterFunction = null;
	if (!filter) {
		// 默认
		filterFunction = function (proxy, ctx) {
			return true;
		}
	} else if (filterType === "string") {
		// 字符串触发条件
		let filterList = filterType.splice("|");
		filterFunction = function (proxy, ctx) {
			let path = proxy.path;
			for (let i = 0; i < filterList.length; i++) {
				let item = filterList[i];
				if (path && path.indexOf(item) !== -1) {
					return true;
				}
			}
			return false;
		}
	} else if (filterType === "function") {
		filterFunction = filter;
	}

	return async function (ctx, next) {
		// check whether to fire.
		let headers = ctx.headers;
		let comeFrom = headers && headers["x-come-from"] ? headers["x-come-from"] : "";

		let query = ctx.query;
		let path = ctx.path,
			host = ctx.hostname,
			port = ctx.port;
		if (query && query["proxy-host"]) {
			host = ctx.query["proxy-host"];
		}
		if (query && query["proxy-port"]) {
			port = ctx.query["proxy-port"];
		}
		if (query && query["proxy-path"]) {
			path = ctx.query["proxy-path"];
			if (path.indexOf("?") != -1) {
				let newPath = path.substring(0, path.indexOf("?"));
				query = merge(query, querystring.parse(path.substring(path.indexOf("?") + 1)));
				path = newPath;
			}
		}
		port = port || 80;
		let proxy = {
			host,
			port,
			path,
			query,
			userAgent
		};
		let isFilter = false;
		let isResponse = false;

		if (typeof filterFunction === "function") {
			isFilter = filterFunction(proxy, ctx);
		}
		if (comeFrom != uniqServerID && isFilter) {
			// can fetch
			try {
				ctx.headers["x-come-from"] = uniqServerID;
				let ret = true;
				let returnImmidately = false;
				if (typeof onBefore === "function") {
					if (onBeforeAsync) {
						ret = await onBefore(proxy, ctx);
					} else {
						ret = onBefore(proxy, ctx);
					}
				}
				if (typeof ret !== "boolean" || ret === true) {
					let fetchObject = createRequestOption(proxy, ctx);
					let response = await request(fetchObject);
					if (response) {
						let ext = mimeType.extension(response.headers["content-type"]);
						let charset = mimeType.charset(response.headers["content-type"]);
						proxy.response = response;
						proxy.type = ext;
						proxy.charset = charset;
						if (extList.indexOf(ext) !== -1 && typeof charset === "string") {
							proxy.result = iconv.decode(response.body, charset);
						} else {
							// return immdiately
							proxy.result = response.body;
							returnImmidately = true;
						}
					}
				}
				if (proxy.result && !returnImmidately && typeof onAfter === "function") {
					if (onAfterAsync) {
						await onAfter(proxy, ctx);
					} else {
						onAfter(proxy, ctx);
					}
				}
				if (proxy.result) {
					let headers = proxy.response && proxy.response.headers;
					if (headers) {
						Object.keys(headers).forEach(key => {
							if (key === "content-encoding") {
								// discast content-encoding
								return ;
							}
							else if(key === "transfer-encoding"){
								// discast transfer encoding.
								return ;
							}
							if (!returnImmidately) {
								if (key === "content-length") {
									return;
								}
							}
							ctx.set(key, headers[key]);
						});
					}
					if (returnImmidately) {
						ctx.status = proxy.response.statusCode || "200";
						ctx.body = proxy.response.body;
					} else {
						renderToBody(proxy, ctx);
					}
					return ;
				}
			} catch (e) {
				// 抓取失败！
			}
		}
		await next();
	};
};