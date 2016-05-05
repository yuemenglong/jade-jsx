var pug = require("pug");
var lexer = require("../pug-lexer");
var parser = require("pug-parser");
var loader = require("pug-loader");
var walk = require("pug-walk");
var gen = require("pug-code-gen");
var _ = require("lodash");

var util = require("util");

function getAst(jade) {
    var tokens = lexer(jade);
    var ast = parser(tokens);
    return ast;
}

function getTextAst(text) {
    return {
        type: "Block",
        nodes: [{ type: "Text", val: text }],
    }
}

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

function getRelateNode(root, type, level, prop) {
    level = level === undefined ? 1 : level;
    if (level === 0) {
        return root;
    }
    var node = root[prop];
    if (!node) {
        throw new Error("Not Enough Depth Of " + prop);
    }
    if (node.type === type) {
        level--;
    }
    return getRelateNode(node, type, level, prop);
}

function getChild(root, type, level) {
    return getRelateNode(root, type, level, "$child");
}

function getParent(root, type, level) {
    return getRelateNode(root, type, level, "$parent");
}

function getNth(root, type, n, prop) {
    n = n || 1;
    if (root.type === type && n === 1) {
        return root;
    }
    if (root.type === type) {
        n--;
    }
    if (!root[prop]) {
        throw new Error("Not Enough " + prop);
    }
    return getNth(root[prop], type, n, prop);
}

function getFirst(root, type, n) {
    return getNth(root, type, n, "$child");
}

function getLast(root, type, n) {
    while (root.$child) {
        root = root.$child;
    }
    return getNth(root, type, n, "$parent");
}

function appendChild(ast, node) {
    var newNode = null;
    if (typeof node === "string") {
        newNode = { type: "Text", val: node };
    } else {
        newNode = node;
    }
    if (ast.type === "Tag") {
        ast.block.nodes.push(newNode);
    } else if (ast.type === "Block") {
        ast.nodes.push(newNode);
    } else {
        throw new Exception("Not Support Op Type " + ast.type);
    }
    return newNode;
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

//{node, op, next}
function mergeNodeChain(chain) {
    if (!chain || !chain.node) {
        return null;
    }
    var root = chain.node;
    var level = 1;
    var handleTag = getLast(root, "Tag");
    var targetTags = [handleTag];
    for (; chain.op; chain = chain.next) {
        var addedNode = chain.next.node.$child;
        if (!addedNode) {
            throw new Error("Op Must Have Target Node");
        }
        var targetTag = null;
        if (chain.op === "inner") {
            targetTag = _.nth(targetTags, -1);
        } else if (chain.op === "and") {
            targetTag = _.nth(targetTags, -2);
        } else {
            throw new Error("Invalid Chain Op Or Src/Text")
        }
        targetTag.$child.nodes.push(addedNode);
        targetTag.$child.$child = addedNode;
        addedNode.$parent = targetTag.$child;
        if (chain.src) {
            targetTags.push(getLast(root, "Tag"));
        }
    }
    return root;
}

//{src/text, op, next}
function mergeSrcChain(chain) {
    var head = chain;
    for (; chain; chain = chain.next) {
        if (chain.src) {
            chain.node = build(getAst(chain.src));
        } else if (chain.text) {
            chain.node = build(getTextAst(chain.text));
        } else {
            throw new Error("Must Have Src Or Text");
        }
    }
    return mergeNodeChain(head);
}

function jadeToHtml(chain) {
    var ast = mergeSrcChain(chain);
    return render(ast);
}

module.exports = jadeToHtml;

if (require.main == module) {
    var chain = {
        "src": "div",
        "op": "inner",
        "next": {
            "text": "{this.state.lines.map(function (item) {\n    return <line {...item}>\n</line>\n;\n})}",
            "op": "and",
            "next": {
                "text": "{this.state.rects.map(function (item) {\n    return <rect {...item}>\n</rect>\n;\n})}"
            }
        }
    };
    var html = jadeToHtml(chain);
    console.log(html);
}
