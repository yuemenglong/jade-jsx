var esprima = require("esprima");
var escodegen = require("escodegen");
var estraverse = require("estraverse");
var util = require("util");

var jadeChainTransform = require("./jade-chain-transform");

function getSrc(ast) {
    return escodegen.generate(ast);
}

function getAst(src) {
    return esprima.parse(src);
}

function getTargetNode(ast, fn) {
    fn = fn || "html";
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

//{src/text, op, next}
function getChainFromTargetNode(node) {
    var alternate = ["CallExpression", "MemberExpression"];
    var chain = {};
    var head = chain;
    for (var alt = 0; //
        node.type === alternate[alt % 2]; //
        node = node.$parent, alt++) {
        if (chain.src) {
            chain.op = node.property.name;
            chain.next = {};
            chain = chain.next;
        } else if (node.arguments[0].type === "Literal") {
            chain.src = node.arguments[0].value;
        } else if (node.arguments[0].type === "FunctionExpression" &&
            node.arguments[0].body.type === "BlockStatement" &&
            node.arguments[0].body.body[0].type === "ExpressionStatement") {
            chain.text = "{" + getSrc(node.arguments[0].body.body[0].expression) + "}";
        } else {
            throw new Error("Invalid Arguments Type, " + node.arguments[0].type);
        }
    }
    return head;
}

function replaceTargetNode(node, jsx) {
    var stmt = null;
    var alternate = ["MemberExpression", "CallExpression"];
    var alt = 0;
    for (var child = node, node = node.$parent; //
        node && node.type === alternate[alt % 2]; // 
        child = node, node = node.$parent, alt++) {
        //
    }
    if (!node || !child) {
        throw new Error("Can't Find Top Node On Parent Chain");
    }
    child.type = "Identifier";
    child.name = jsx;
    return child;
}

function print(ast) {
    var intent = 0;
    estraverse.replace(ast, {
        enter: function(node) {
            console.log(new Array(intent).join("  ") + "<<" + node.type + " " + node.name);
            intent++;
        },
        leave: function(node) {
            intent--;
            console.log(new Array(intent).join("  ") + ">>" + node.type);
        }
    })
}

function transform(src) {
    var ast = getAst(src);
    var list = getTargetNode(ast);
    for (var i = 0; i < list.length; i++) {
        var chain = getChainFromTargetNode(list[i]);
        var jsx = jadeChainTransform(chain);
        var head = replaceTargetNode(list[i], jsx);
    }
    return getSrc(ast);
}

module.exports = transform;

if (require.main == module) {

    var src = "html('div')";
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
