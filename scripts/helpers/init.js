const chalk = require('chalk')

let count = false

module.exports = function init () {
    if (count) return
    count = true
    console.log(chalk.green('欢迎使用fe-tpl页面模板系统!\n'))
}
