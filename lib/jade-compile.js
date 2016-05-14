var lexer = require("yy-pug-lexer");
var parser = require("pug-parser");
var walk = require("pug-walk");
var gen = require("pug-code-gen");
var _ = require("lodash");

var util = require("util");

function render(ast) {
    function renderTagBegin(node) {
        var attrArr = [];
        for (var i in node.attrs) {
            var attr = node.attrs[i];
            if (attr.name.match(/^\{\.{3}.+\}$/)) {
                attrArr.push(attr.name);
            } else {
                var kv = util.format("%s=%s", attr.name, attr.val);
                attrArr.push(kv);
            }
        }
        var attrStr = attrArr.length ? " " + attrArr.join(" ") : "";
        return util.format("<%s%s>", node.name, attrStr);
    }

    function renderTagEnd(node) {
        return util.format("</%s>", node.name);
    }

    var output = "";
    walk(ast, function(ast) {
        if (ast.type === "Tag") {
            output += renderTagBegin(ast);
        } else if (ast.type === "Text") {
            output += ast.val + "";
        }
    }, function(ast) {
        if (ast.type === "Tag") {
            output += renderTagEnd(ast);
        }
    });
    return output;
}

function trimIndent(raw) {
    var lines = raw.match(/.+/g);
    if (!lines || !lines[0]) {
        throw new Error("Raw Is Empty");
    }
    var first = lines[0];
    var indent = first.match(/\s*/)[0];
    if (!indent.length) {
        return raw;
    }
    for (var i = 0; i < lines.length; i++) {
        lines[i] = lines[i].replace(indent, "");
    }
    return lines.join("\n");
}

function getAst(jade) {
    jade = trimIndent(jade);
    var tokens = lexer(jade);
    var ast = parser(tokens);
    return ast;
}

function getTextAst(text) {
    return { type: "Text", val: text };
}

function getTargetNodes(ast) {
    var ret = [];
    var stack = [];
    walk(ast, function(node) {
        node.$child = [];
        if (stack.length) {
            node.$parent = stack[0];
            node.$index = node.$parent.$child.length;
            node.$parent.$child.push(node);
        }
        if (node.type === "Code" && node.val === "") {
            ret.push(node);
        }
        stack.unshift(node);
    }, function(node) {
        stack.shift();
    });
    return ret;
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

function compile(jade) {
    var ast = getAst(jade);
    var targetNodes = getTargetNodes(ast);
    return function() {
        if (targetNodes.length === 0 && arguments.length === 1) {
            jade += " #{}";
            var fn = compile(jade);
            return fn.apply(null, arguments);
        }
        if (targetNodes.length !== arguments.length) {
            var info = { need: targetNodes.length, act: arguments.length };
            throw new Error("Arguments Count Not Match, " + JSON.stringify(info));
        }
        for (var i = 0; i < targetNodes.length; i++) {
            var newNode = getTextAst(arguments[i]);
            targetNodes[i].$parent.nodes[targetNodes[i].$index] = newNode;
        }
        return render(ast);
    }
}

module.exports = compile;

if (require.main == module) {

}
