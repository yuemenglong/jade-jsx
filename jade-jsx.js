var esprima = require("esprima");
var escodegen = require("escodegen");
var estraverse = require("estraverse");
var util = require("util");

var jadeToHtml = require("./jade-html");

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

//{src/text, op, next}
function getJadeAstFromTargetNode(node) {
    var alternate = ["CallExpression", "MemberExpression"];
    var chain = {};
    var head = chain;
    for (var alt = 0; //
        node.type === alternate[alt % 2]; //
        node = node.$parent, alt++) {
        if (node.type === "MemberExpression") {
            chain.op = node.property.name;
            chain.next = {};
            chain = chain.next;
        } else if (node.arguments[0].type === "Literal") {
            chain.src = node.arguments[0].value;
        } else if (node.arguments[0].type === "TemplateLiteral") {
            chain.src = trimIndent(node.arguments[0].quasis[0].value.raw);
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

function jadeToJsx(src) {
    var ast = getAst(src);
    var list = getTargetNode(ast);
    for (var i = 0; i < list.length; i++) {
        var chain = getJadeAstFromTargetNode(list[i]);
        var jsx = jadeToHtml(chain);
        var head = replaceTargetNode(list[i], jsx);
    }
    return getSrc(ast);
}

module.exports = jadeToJsx;

if (require.main == module) {
    // var src = `
    //     html("div").inner(function() {
    //         this.state.lines.map(function(item) {
    //             return html("line({...item})");
    //         })
    //     }).and(function() {
    //         this.state.rects.map(function(item) {
    //             return html("rect({...item})");
    //         });
    //     });`
    var src = `html("a").inner("b").and("c")`;
    // var ast = getAst(src);
    // var nodeList = getTargetNode(ast);
    // var chain = getJadeAstFromTargetNode(nodeList[0]);
    // console.log(JSON.stringify(chain, null, "  "));
    var jsx = jadeToJsx(src);
    console.log(jsx);
}
