var esprima = require("esprima");
var escodegen = require("escodegen");
var estraverse = require("estraverse");
var util = require("util");

var pugger = require("./pugger");

function getSrc(ast) {
    return escodegen.generate(ast);
}

function getAst(src) {
    return esprima.parse(src);
}

function getTargetAstList(ast, mark) {
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
                var ret = [node];
                for (var i = 0; i < currentStack.length; i++) {
                    var parentNode = currentStack[i];
                    if (parentNode.type.match(/.+Statement/)) {
                        break
                    }
                    ret.push(parentNode);
                }
                result.unshift(ret);
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
function getChainFromAstList(list) {
    var node = list[0];
    var chain = { src: node.arguments[0].value };
    var head = chain;
    for (var i = 1; i < list.length; i++) {
        node = list[i];
        if (chain.src) {
            chain.op = node.property.name;
            chain.next = {};
            chain = chain.next;
        } else if (node.arguments[0].type === "Literal") {
            chain.src = node.arguments[0].value;
        } else if (node.arguments[0].type === "FunctionExpression") {
            chain.text = getSrc(node.arguments[0].body);
        } else {
            throw new Error("Invalid Arguments Type, " + node.arguments[0].type);
        }
    }
    return head;
}

function transform(src) {
    var ast = getAst(src);
    var result = getTargetAstList(ast);
    for (var i = 0; i < result.length; i++) {
        var chain = getChainFromAstList(result[0]);
        var jsx = pugger.transform(chain);
    }
    return pugger.transform(chain);
}

module.exports = {}

if (require.main == module) {

    var src = `
html("h1").inner(function(){var i = 1;});
`;
    // var ast = getAst(src);
    var html = transform(src);
    // console.log(JSON.stringify(ast, null, "  "));
    console.log(html);
}
