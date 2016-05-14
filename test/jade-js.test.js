var jadeToJsx = require("..");

var babel = require("babel-core");

function jsxToJs(src) {
    return babel.transform(src, {
        plugins: ["transform-react-jsx"]
    }).code;
}

module.exports = jsxToJs;

describe('jadeToJs', function() {
    it('Basic', function(done) {
        var src = `
        jade("div({...props}, a={prop.a}) #{}#{}", function(){
            ["a", "b"].map(function(item){
                return jade('div(key={item}) {item}');
            })
        },function(){
            ["c","d"].map(function(item){
                return jade('div(id="1" key="2") {item}');
            })
        });
        `;
        var jsx = jadeToJsx(src);
        console.log(jsx);
        var js = jsxToJs(jsx);
        console.log(js);
        done();
    })
    it('Default', function(done) {
        var src = `
        jade("div(a={prop.a})", function(){
            ["a", "b"].map(function(item){
                return jade('div(key={item}) {item}');
            })
        });
        `;
        var jsx = jadeToJsx(src);
        console.log(jsx);
        var js = jsxToJs(jsx);
        console.log(js);
        done();
    })
});
