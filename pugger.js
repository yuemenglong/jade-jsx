var pug = require("pug");
var lexer = require("pug-lexer");
var parser = require("pug-parser");
var loader = require("pug-loader");
var walk = require("pug-walk");
var gen = require("pug-code-gen");

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
            var kv = util.format("%s=%s", node.attrs[i].name, node.attrs[i].val);
            attrArr.push(kv);
        }
        var attrStr = attrArr.length ? " " + attrArr.join(" ") : "";
        return util.format("<%s%s>\n", node.name, attrStr);
    }

    function renderTagEnd(node) {
        return util.format("<\\%s>\n", node.name);
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

//{node, op, next}
function mergeNodeChain(chain) {
    if (!chain || !chain.node) {
        return null;
    }
    var root = chain.node;
    var level = 1;
    var handleTag = getLast(root, "Tag");
    for (; chain.op; chain = chain.next) {
        var target = chain.next.node.$child;
        if (chain.op === "inner") {
            if (!target) {
                throw new Error("Inner Must Have Node");
            }
            handleTag.$child.nodes.push(target);
            handleTag.$child.$child = target;
            target.$parent = handleTag.$child;
            handleTag = getLast(root, "Tag");
        } else if (chain.op === "and") {
            if (!target) {
                throw new Error("And Must Have Node");
            }
            handleTag.$parent.nodes.push(target);
            handleTag.$parent.$child = target;
            target.$parent = handleTag.$parent;
            handleTag = getLast(root, "Tag");
        } else if (chain.op === "outer") {
            //outer can be empty
            if (!chain.next.node) {
                handleTag = getParent(handleTag, "Tag");
                continue;
            }
            var parentTag = getParent(handleTag, "Tag");
            parentTag.$parent.nodes.push(target);
            parentTag.$parent.$child = target;
            target.$parent = parentTag.$parent;
            handleTag = getLast(root, "Tag");
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

function transform(chain) {
    var ast = mergeSrcChain(chain);
    return render(ast);
}

module.exports = {
    transform: transform
}

if (require.main == module) {
    var chain = {
        "src": "h1",
        "op": "inner",
        "next": {
            "src": "h2",
            "op": "inner",
            "next": {
                "text": "{for(var i = 0; i < 1; i++){}}"
            }
        }
    };
    var html = transform(chain);
    console.log(html);
}
