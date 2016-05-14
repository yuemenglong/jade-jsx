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

function getFnCode(node) {
    if (node.type !== "FunctionExpression" ||
        node.body.type !== "BlockStatement" ||
        node.body.body.length !== 1 ||
        node.body.body[0].type !== "ExpressionStatement") {
        throw new Error("Expect Single Statement Funciton");
    }
    return "{" + getSrc(node.body.body[0].expression) + "}";
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
    function f() {
        var a = 1;
    };
    var ast = getAst(f.toString());
    debug(ast);
}
