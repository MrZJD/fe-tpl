const chalk = require('chalk')

module.exports = function warn (msg) {
    console.log(chalk.red(msg))
}
