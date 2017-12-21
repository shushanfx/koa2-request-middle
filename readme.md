# Koa2 Request Middle
When request data from remote url, what will you do? Emeded an request module and do it yourself. Fortunately this middle do it for you.

## How to use
Easy to use.
```bash
npm install koa-request-middle --save
```
```javascript
var koa = require("koa");
var RequestMiddle = require("koa-requet-middle");

var app = new koa();
app.use(new RequestMiddle({
	filter: function(proxy, ctx){
		
		return true;
	},
	onBefore: function(proxy, ctx){
		// before fetch from url.
	},
	onAfter: function(proxy, ctx){
		// after fetch from url.
	}
}));
app.listen(8001);
```

## Options
**proxy object**, a proxy instance all through the middle ware procude, it cantains request information, such as :
```javascript
{
	protocol: "", // the request protocol
	host: "", // the request host,
	port: 80, // the request port,
	path: "", // the request path,
	query: "", // the request query,
	type: "", // the response body type
	charset: "", // the response body charset.
}
```
You can use it in the filter/onBefore/onAfter function, and you can change the value to fix your solution.
>
> As you can see, the proxy object don't have the request body. Because i think it is not safe to read body content and in most case, there is not need to read it.
     
**protocol**         
The protocol to use, default is null, you can change it as you wish. When null, use ctx.protocol.
              
**host**           
The fetch host, comes from parameter `proxy-host` or ctx.hostname.
            
**port**         
The fetch port, comes from parameter `proxy-port` or ctx.port.
                     
**path** 
The fetch path, comes from parameter `proxy-path` or ctx.path. 

**query**
The query object of fetch object, comes from parameter `proxy-path` **and** ctx.query with an merge operation.



```javascript
var options = {
	proxyID: "", // proxy id. default "koa2-request-middle"
	filter: "null | string | function", // the url that matched.
	onBefore: "AsyncFunction|Function",  // do some thing before the fetch.
	onAfter: "AsyncFunction|Function", // do some thing after the fetch.
	useAgent: "String", // user agent.
	cache: "true | false", // whether to use the cache of client.
	ext: "string | Array<String> ", // the type of response body to call the onAfter function. default value is ["txt", "html", "xml", "js", "json"]
}
```

## LICENSE
MIT