var babel = require("babel-core");

function jsxTransform(src) {
    return babel.transform(src, {
        plugins: ["transform-react-jsx"]
    }).code;
}

module.exports = jsxTransform;

if (require.main == module) {
    var fs = require("fs");
    var ret = jsxTransform(fs.readFileSync("jsx/index.jsx"));
    console.log(ret);
}
