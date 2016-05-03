var jadeToJsx = require("./jade-jsx");
var jsxToJs = require("./jsx-js");
var fs = require("fs");

function jadeToJs(src) {
    var jsx = jadeToJsx(src);
    var js = jsxToJs(jsx);
    return js;
}

module.exports = jadeToJs;
