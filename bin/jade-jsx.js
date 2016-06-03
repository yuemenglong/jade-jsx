#!/usr/bin/env node

var jadeToJsx = require("..");
var fs = require("fs");

function getAbsoluteDir() {
    var p = path.resolve(process.cwd(), process.argv[2]);
    var dir = path.parse(p).dir;
    return dir;
}

if (require.main == module) {
    if (process.argv.length < 3) {
        console.log("Usage: jade-jsx in [out]");
        return;
    }
    var inFile = process.argv[2];
    var src = fs.readFileSync(inFile).toString();
    var jsx = jadeToJsx(src, "jade", getAbsoluteDir());
    console.log(jsx);
    var outFile = process.argv[3];
    if (outFile) {
        fs.writeFileSync(outFile, jsx);
    }
}
