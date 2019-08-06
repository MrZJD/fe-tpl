/**
 * inquirer wrapper
 */
const inquirer = require('inquirer')

module.exports = {
    async confirm (message, def) {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                message,
                name: 'confirm',
                default: def === undefined ? true : def
            }
        ])
        return confirm
    },
    async list (message, choices) {
        const { result } = await inquirer.prompt([
            {
                type: 'list',
                message,
                name: 'result',
                choices
            }
        ])
        return result
    },
    async checkbox (message, choices) {
        const { result } = await inquirer.prompt([
            {
                type: 'checkbox',
                message,
                name: 'result',
                choices
            }
        ])
        return result
    },
    async input (message) {
        const { result } = await inquirer.prompt([
            {
                type: 'input',
                message,
                name: 'result'
            }
        ])
        return result
    }
}
