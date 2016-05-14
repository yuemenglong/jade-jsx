#!/usr/bin/env node

var jadeToJsx = require("..");
var fs = require("fs");

if (require.main == module) {
    if (process.argv.length < 3) {
        console.log("Usage: jade-js in [out]");
        return;
    }
    var inFile = process.argv[2];
    var src = fs.readFileSync(inFile).toString();
    var jsx = jadeToJsx(src);
    console.log(jsx);
    var outFile = process.argv[3];
    if (outFile) {
        fs.writeFileSync(outFile, jsx);
    }
}
