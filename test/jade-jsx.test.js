var jadeToJsx = require("..");

var babel = require("babel-core");

function jsxToJs(src) {
    return babel.transform(src, {
        plugins: ["transform-react-jsx"]
    }).code;
}

module.exports = jsxToJs;

describe('jadeToJsx', function() {
    it('Basic', function(done) {
        var src = `
        jade("div({...props}, a={prop.a}) #{}#{}", function(){
            return ["a", "b"].map(function(item){
                return jade('div(key={item}) {item}');
            })
        },function(){
            return ["c","d"].map(function(item){
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
            return ["a", "b"].map(function(item){
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
    it('Recursive', function(done) {
        var src = `
        jade("div #{} #{}", 
        function(){
            return [0, 0].map(function(item){
                return jade("div {item}");
            })
        }, 
        function(){
            return [[1,2],[3,4]].map(function(pair){
                return jade("div", function(){
                    return pair.map(function(item){
                        return jade("div {item}");
                    })
                })
            })
        });
        `;
        var jsx = jadeToJsx(src);
        console.log(jsx);
        var js = jsxToJs(jsx);
        console.log(js);
        done();
    })
    it('Function Call', function(done) {
        var src = `
        function render(value){
            return jade("div {value}");
        }
        jade("div", render(1)); 
        `;
        var jsx = jadeToJsx(src);
        console.log(jsx);
        var js = jsxToJs(jsx);
        console.log(js);
        done();
    })
    it('Use Jade As Arg', function(done) {
        var src = `
        jade("div", jade("div 1")); 
        `;
        var jsx = jadeToJsx(src);
        console.log(jsx);
        var js = jsxToJs(jsx);
        console.log(js);
        done();
    })
    it('Use Identifier In Jade', function(done) {
        var src = `
        var tpl = 'div(id="1")';
        jade(tpl);
        `;
        var jsx = jadeToJsx(src);
        console.log(jsx);
        var js = jsxToJs(jsx);
        console.log(js);
        done();
    })
    it('Use File In Jade', function(done) {
        var src = `
        var tpl = './test.jade';
        jade(tpl);
        `;
        var jsx = jadeToJsx(src, "jade", __dirname);
        console.log(jsx);
        var js = jsxToJs(jsx);
        console.log(js);
        done();
    })
    it('Use New Line For Child', function(done) {
        var src = `
        jade(\`
        div 
            #{}
        \`, function(){return jade("span")});
        `;
        var jsx = jadeToJsx(src, "jade", __dirname);
        console.log(jsx);
        var js = jsxToJs(jsx);
        console.log(js);
        done();
    })
});
