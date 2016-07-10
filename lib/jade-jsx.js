var esprima = require("esprima");
var escodegen = require("escodegen");
var estraverse = require("estraverse");
var util = require("util");
var assert = require('assert');
var fs = require("fs");
var path = require("path");
var _ = require("lodash");

var compile = require("./jade-compile");

function getSrc(ast) {
    return escodegen.generate(ast);
}

function getAst(src) {
    return esprima.parse(src, { sourceType: "module" });
}

function getIdentifierValueAndRemove(ast, id) {
    var target = null;
    estraverse.replace(ast, {
        enter: function(node) {
            if (target) this.break();
            if (node.type === "VariableDeclarator" &&
                node.id.type === "Identifier" &&
                node.id.name === id &&
                node.init != null) {
                target = node;
                this.break();
            }
        }
    })
    if (!target) {
        throw new Error("Can't Find Identifier: " + id);
    }
    removeDeclareNode(target);
    switch (target.init.type) {
        case "Literal":
            return target.init.value;
        case "TemplateLiteral":
            return target.init.quasis[0].value.raw;
        default:
            throw new Error("Invalid Type Of Identifier '${id}': ${node.type}");
    }
}

function getTargetNodesWithRelation(ast, fn) {
    fn = fn || "jade";
    var result = [];
    var currentStack = [];
    estraverse.replace(ast, {
        enter: function(node) {
            if (currentStack.length) {
                node.$parent = currentStack[0];
                node.$parent.$length = node.$parent.$length || 0;
                node.$index = node.$parent.$length;
                node.$parent.$length++;
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

function getJadeCode(node, ast, dir) {
    //ast used to handle declaration value
    //dir used to handle jade tpl file outside
    var ret = null;
    switch (node.type) {
        case "Literal":
            ret = node.value;
            break;
        case "TemplateLiteral":
            ret = node.quasis[0].value.raw;
            break;
        case "Identifier":
            ret = getIdentifierValueAndRemove(ast, node.name)
            break;
        default:
            throw new Error("Invalid Arguments Type, " + node.type);
    }
    if (ret[0] === "." && !dir) {
        throw new Error("Must Specify Dir When Use Jade File")
    }
    if (ret[0] === ".") {
        ret = fs.readFileSync(path.resolve(dir, ret)).toString();
    }
    return ret;
}

function checkHasReturnStatement(ast) {
    var find = false;
    estraverse.traverse(ast, {
        enter: function(node) {
            if (find) this.break;
            if (node.type === "CallExpression") {
                return estraverse.VisitorOption.Skip;
            }
            if (node.type === "ReturnStatement") {
                find = true;
                this.break();
            }
        }
    })
    if (!find) {
        throw new Error("Function Must Have Return Statement");
    }
}

function bindFunc(node) {
    if (node.callee.type == "MemberExpression" &&
        node.callee.object.type == "FunctionExpression" &&
        node.callee.property.type == "Identifier" &&
        node.callee.property.name == "bind"
    ) {
        checkHasReturnStatement(node.callee.object);
        return "{" + getSrc(node) + "()" + "}";
    }
    return;
}

function getArgsText(node) {
    switch (node.type) {
        case "FunctionExpression":
            checkHasReturnStatement(node);
            return "{" + getSrc(node) + "()" + "}";
        case "CallExpression":
            return bindFunc(node) || "{" + getSrc(node) + "}";
        case "Identifier":
            return node.name;
        default:
            throw new Error("Invalide Node Type: " + node.type);
    }
}

function setNodeText(node, text) {
    node.type = "Identifier";
    node.name = text;
}

function removeDeclareNode(node) {
    if (!node.$parent || !node.$parent.$parent) {
        throw new Error("Can't Remove Top Level Node")
    }
    if (!node.$parent.declarations || node.$parent.declarations.length !== 1) {
        throw new Error("Not Support Multi Declaration In One Statement");
    }
    //remove parent 
    node.$parent.type = "Identifier";
    node.$parent.name = "";
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

function jadeToJsx(src, fn, dir) {
    var root = typeof src === "object" ? src : getAst(src);
    var list = getTargetNodesWithRelation(root, fn);
    list.map(function(node) {
        var jadeNode = node.arguments[0];
        var jade = getJadeCode(jadeNode, root, dir);
        var fn = compile(jade);
        var args = node.arguments.slice(1).map(function(fnNode) {
            return getArgsText(fnNode);
        })
        var ret = fn.apply(null, args);
        setNodeText(node, ret);
    })
    return getSrc(root);
}

module.exports = jadeToJsx;

if (require.main == module) {
}
