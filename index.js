var jadeToJsx = require("./jade-jsx");
var jsxToJs = require("./jsx-js");
var jadeToJs = require("./jade-js");
var fs = require("fs");

var trans = {
    jadeToJs: jadeToJs,
    jadeToJsx: jadeToJsx,
    jsxToJs: jsxToJs,
}

module.exports = trans;

if (require.main == module) {
    if (process.argv.length < 3) {
        console.log("Usage: jade-js in [out]");
        return;
    }
    var inFile = process.argv[2];
    var src = fs.readFileSync(inFile).toString();
    var jsx = jadeToJsx(src);
    console.log(jsx);
    var js = jsxToJs(jsx);
    var outFile = process.argv[3];
    if (outFile) {
        fs.writeFileSync(outFile, js);
    }
}
