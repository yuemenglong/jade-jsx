# jade-jsx
将jade语法转为jsx语法
## usage
npm install jade-jsx -g
将jade语法放到jade函数内
例如：test.js
React.createClass({
    render:function(){
        return jade(`
            div
                a(href={this.link}) 点击跳转
            `)
    }
})
命令行：jade-jsx test.js
输出为
React.createClass({
    render: function () {
        return <div><a href={this.link}>点击跳转</a></div>;
    }
});
