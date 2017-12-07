var koa = require("koa");
var middle = require("../../lib/lib");
var request = require("supertest");
var fs = require("fs");
var path = require("path");

describe("Test Case", function(){
	let requestAPI = null;

	beforeAll(function(){
		var app = new koa();
		app.use(new middle({
			ext: ["bin", false],
			onAfter: function(proxy, ctx){
			}
		}));
		requestAPI = request(app.listen());
	});

	it("Test string", function(done){
		return requestAPI.get("/proxy")
			.query({
				"proxy-host": "www.sogou.com",
				"proxy-path": "/"
			})
			.end(function(err, res){
				if(err){
					throw err;
				}
				console.info(res.text);
				done();
			})
	});

	it("Test image", function(done){
		return requestAPI.get("/proxy")
			.query({
				"proxy-protocol": "https",
				"proxy-host": "www.sogou.com",
				"proxy-path": "/web/index/images/logo_440x140.v.1.png"
			})
			.end(function(err, res){
				if(err){
					throw err;
				}
				console.info(res.body);
				fs.writeFile(path.resolve(__dirname, "./image.png"),  res.body, done)
			})
	});

	it("Test binary", function(done){
		return requestAPI.get("/proxy")
		.query({
			"proxy-protocol": "https",
			"proxy-host": "www.npmjs.com",
			"proxy-path": "/-/search?text=koa&from=10&size=10&quality=1.95&popularity=3.3&maintenance=2.05"
		})
		.end(function(err, res){
			if(err){
				throw err;
			}
			console.info(res.body);
			done();
		})
	});
});