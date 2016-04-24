var babel = require("babel-core");

function transform(src) {
    return babel.transform(src, {
        plugins: ["transform-react-jsx"]
    }).code;
}

module.exports = transform;

if (require.main == module) {
    var fs = require("fs");
    var ret = transform(fs.readFileSync("jsx/index.jsx"));
    console.log(ret);
}
