var esprima = require("esprima");
var escodegen = require("escodegen");
var estraverse = require("estraverse");
var util = require("util");
var assert = require('assert');

var compile = require("./jade-compile");

function getSrc(ast) {
    return escodegen.generate(ast);
}

function getAst(src) {
    return esprima.parse(src);
}

function getTargetNodes(ast, fn) {
    fn = fn || "jade";
    var result = [];
    var currentStack = [];
    estraverse.replace(ast, {
        enter: function(node) {
            if (currentStack.length) {
                node.$parent = currentStack[0];
            }
            if (node.type === "CallExpression" &&
                node.callee.type === "Identifier" &&
                node.callee.name === fn) {
                result.unshift(node);
            }
            currentStack.unshift(node);
        },
        leave: function(node) {
            currentStack.shift();
        }
    })
    return result;
}

function getJadeCode(node) {
    if (node.type === "Literal") {
        return node.value;
    } else if (node.type === "TemplateLiteral") {
        return node.quasis[0].value.raw;
    } else {
        throw new Error("Invalid Arguments Type, " + node.type);
    }
}

function checkHasReturn(ast) {
    var find = false;
    estraverse.traverse(ast, {
        enter: function(node) {
            if (node.type === "CallExpression") {
                return estraverse.VisitorOption.Skip;
            }
            if (node.type === "ReturnStatement") {
                find = true;
            }
        }
    })
    if (!find) {
        throw new Error("Function Must Have Return Statement");
    }
}

function getFnCode(node) {
    if (node.type === "FunctionExpression") {
        // if (node.body.type !== "BlockStatement" ||
        //     node.body.body.length !== 1 ||
        //     node.body.body[0].type !== "ExpressionStatement") {
        //     throw new Error("Expect Single Statement Funciton");
        // }
        // return "{" + getSrc(node.body.body[0].expression) + "}";
        checkHasReturn(node);
        return "{" + getSrc(node) + "()" + "}";
    } else if (node.type === "CallExpression") {
        return "{" + getSrc(node) + "}";
    }
}

function setNodeText(node, text) {
    node.type = "Identifier";
    node.name = text;
}

function debug(node) {
    var ret = JSON.stringify(node, function(k, v) {
        if (k[0] === "$") {
            return;
        } else {
            return v;
        }
    }, "  ");
    console.log(ret);
    return ret;
}

function jadeToJsx(src, fn) {
    var root = getAst(src);
    var list = getTargetNodes(root, fn);
    list.map(function(node) {
        var jadeNode = node.arguments[0];
        var jade = getJadeCode(jadeNode);
        var fn = compile(jade);
        var args = node.arguments.slice(1).map(function(fnNode) {
            return getFnCode(fnNode);
        })
        var ret = fn.apply(null, args);
        setNodeText(node, ret);
    })
    return getSrc(root);
}

module.exports = jadeToJsx;

if (require.main == module) {
    var src = `jade("div", function(){});`;
    console.log(jadeToJsx(src));
    // var ast = getAst(src);
    // var node = getTargetNodes(ast)[0];
    // debug(node);
    // var src = `jade("div", function(){}());`;
    // var ast = getAst(src);
    // var node = getTargetNodes(ast)[0];
    // debug(node);
    // var s = getSrc(node.arguments[1]);
    // console.log(s);
    // var src = `jade("div", f());`;
    // var ast = getAst(src);
    // var node = getTargetNodes(ast)[0];
    // debug(node);
}
