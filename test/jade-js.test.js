var trans = require("..");
var jadeToJs = trans.jadeToJs;

describe('jadeToJs', function() {
    it('Basic', function(done) {
        var src = `
        html("div").inner(function(){
            ["a", "b"].map(function(item){
                return html('div(key={item}) {item}');
            })
        })
        `;
        var js = jadeToJs(src);
        console.log(js);
        done();
    })
});
