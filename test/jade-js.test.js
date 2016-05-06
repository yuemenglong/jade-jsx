var trans = require("..");
var jadeToJs = trans.jadeToJs;

describe('jadeToJs', function() {
    it('Basic', function(done) {
        var src = `
        html("div({...props}, a={prop.a})").inner(function(){
            ["a", "b"].map(function(item){
                return html('div(key={item}) {item}');
            })
        }).and(function(){
            ["c","d"].map(function(item){
                return html('div(id="1" key="2") {item}')
            })
        })
        `;
        var js = jadeToJs(src);
        console.log(js);
        done();
    })
});
