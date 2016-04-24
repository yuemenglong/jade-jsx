var esprima = require("esprima");
var escodegen = require("escodegen");
var estraverse = require("estraverse");
var util = require("util");

var pugChainTransform = require("./pug-chain-transform");

function getSrc(ast) {
    return escodegen.generate(ast);
}

function getAst(src) {
    return esprima.parse(src);
}

function getTargetNode(ast, mark) {
    mark = mark || "html";
    var result = [];
    var currentStack = [];
    estraverse.replace(ast, {
        enter: function(node) {
            if (currentStack.length) {
                node.$parent = currentStack[0];
            }
            if (node.type === "CallExpression" &&
                node.callee.type === "Identifier" &&
                node.callee.name === mark) {
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

//{src/text, op, next}
function getChainFromTargetNode(node) {
    if (node.arguments[0].type !== "Literal") {
        throw new Error("First Param Must String");
    }
    var chain = { src: node.arguments[0].value };
    var head = chain;
    node = node.$parent;
    while (!node.type.match(/.*Statement/)) {
        if (!chain.op) {
            chain.op = node.property.name;
        } else if (node.arguments[0].type === "Literal") {
            chain.next = { src: node.arguments[0].value };
            chain = chain.next;
        } else if (node.arguments[0].type === "FunctionExpression" &&
            node.arguments[0].body.type === "BlockStatement" &&
            node.arguments[0].body.body[0].type === "ExpressionStatement") {
            chain.next = { text: getSrc(node.arguments[0].body.body[0].expression) };
            chain = chain.next;
        } else {
            throw new Error("Invalid Arguments Type, " + node.arguments[0].type);
        }
        node = node.$parent;
    }
    return head;
}

function replaceTargetNode(node, jsx) {
    var stmt = null;
    var child = null;
    while (node) {
        if (node.type.match(/.*Statement/)) {
            break;
        }
        child = node;
        node = node.$parent;
    }
    if (!node || !child) {
        throw new Error("Can't Find Statement On Parent Chain");
    }
    child.type = "Identifier";
    child.name = jsx;
    return child;
}

function transform(src) {
    var ast = getAst(src);
    var list = getTargetNode(ast);
    for (var i = 0; i < list.length; i++) {
        var chain = getChainFromTargetNode(list[i]);
        var jsx = pugChainTransform(chain);
        var head = replaceTargetNode(list[i], jsx);
    }
    return getSrc(ast).slice(0, -1);
}

module.exports = transform;

if (require.main == module) {

    var src = `
    html(function (){
        b;
    })
`;
    // var ast = getAst(src);
    // console.log(JSON.stringify(ast, null, "  "));
    // var code = getSrc(ast.body[0].expression);
    // console.log(code);

    var res = transform(src);
    console.log(res);

    // var ast = getAst(src);
    // var list = getTargetNode(ast);
    // var chain = getChainFromTargetNode(list[0]);
    // var html = pugger.transform(chain);

    // console.log(JSON.stringify(ast, null, "  "));
    // console.log(JSON.stringify(chain, null, "  "));
    // console.log(html);
}
