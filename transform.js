var jadeTransform = require("./jade-transform");
var jsxTransform = require("./jsx-transform");
var fs = require("fs");

function transform(src) {

}

if (require.main == module) {
    if (process.argv.length < 3) {
        console.log("Usage: node transform in [out]");
        return;
    }
    var inFile = process.argv[2];
    var src = fs.readFileSync(inFile).toString();
    var jsx = jadeTransform(src);
    console.log(jsx);
    var js = jsxTransform(jsx);
    var outFile = process.argv[3];
    if (outFile) {
        fs.writeFileSync(outFile, js);
    }
}
