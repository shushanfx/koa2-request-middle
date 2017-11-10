var koa = require("koa");
var middle = require("../../lib/lib");
var request = require("supertest");

describe("Test Case", function(){
	let requestAPI = null;

	beforeAll(function(){
		var app = new koa();
		app.use(new middle({
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
});