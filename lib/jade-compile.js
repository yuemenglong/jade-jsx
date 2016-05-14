var pug = require("pug");
var lexer = require("../../yy-pug-lexer");
var parser = require("pug-parser");
var loader = require("pug-loader");
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
        return util.format("<%s%s>\n", node.name, attrStr);
    }

    function renderTagEnd(node) {
        return util.format("</%s>\n", node.name);
    }

    var output = "";
    walk(ast, function(ast) {
        if (ast.type === "Tag") {
            output += renderTagBegin(ast);
        } else if (ast.type === "Text") {
            output += ast.val + "\n";
        }
    }, function(ast) {
        if (ast.type === "Tag") {
            output += renderTagEnd(ast);
        }
    });
    return output;
}

function build(root) {
    var stack = [];
    walk(root, function(ast) {
        if (stack.length) {
            ast.$parent = stack[0];
            stack[0].$child = ast;
        }
        stack.unshift(ast);
    }, function(ast) {
        stack.shift();
    });
    return root;
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

function debug(node) {
    console.log("==============================");
    console.log(JSON.stringify(node, function(key, value) {
        if (key.slice(0, 1) === "$") {
            return undefined;
        }
        return value;
    }, "  "));
    console.log("==============================");
}

function getAst(jade) {
    jade = trimIndent(jade);
    var tokens = lexer(jade);
    var ast = parser(tokens);
    return ast;
}

function getTextAst(text) {
    // return {
    //     type: "Block",
    //     nodes: [{ type: "Text", val: text }],
    // }
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
    if (!targetNodes.length) {
        jade += " #{}";
        return compile(jade);
    }
    return function() {
        if (targetNodes.length !== arguments.length) {
            throw new Error("Arguments Count Not Match");
        }
        for (var i = 0; i < targetNodes.length; i++) {
            var newNode = getTextAst(arguments[i]);
            targetNodes[i].$parent.nodes[targetNodes[i].$index] = newNode;
        }
        return render(ast);
    }
}


function jadeToHtml(chain) {
    var ast = mergeSrcChain(chain);
    return render(ast);
}

module.exports = jadeToHtml;

if (require.main == module) {
    // var chain = {
    //     "src": "div",
    //     "op": "inner",
    //     "next": {
    //         "text": "{this.state.lines.map(function (item) {\n    return <line {...item}>\n</line>\n;\n})}",
    //         "op": "and",
    //         "next": {
    //             "text": "{this.state.rects.map(function (item) {\n    return <rect {...item}>\n</rect>\n;\n})}"
    //         }
    //     }
    // };
    // var html = jadeToHtml(chain);
    // console.log(html);
    var src = `
        div
            thead  #{}`
    var ast = getAst(src);
    // console.log(JSON.stringify(ast, null, "  "));
    // var list = getTargetNodes(ast);
    // list.map(item => debug(item));
    var fn = compile(src);
    var ret = fn("hello");
    console.log(ret);
}
