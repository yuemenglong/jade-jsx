var babel = require("babel-core");

function jsxToJs(src) {
    return babel.transform(src, {
        plugins: ["transform-react-jsx"]
    }).code;
}

module.exports = jsxToJs;

