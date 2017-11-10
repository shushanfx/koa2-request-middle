var koa = require("koa");
var middle = require("../lib/lib");

var app = new koa();
app.use(new middle({
	onBefore: function(){
		console.info("come");
		return true;
	}
}));
app.use(ctx => {
	ctx.body = "test";
});
app.listen(1111);