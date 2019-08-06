/**
 * lib模块 dev脚本
 */
require('./helpers/init')()

const myInquirer = require('./helpers/inquirer')
const getConfig = require('./helpers/getRollupConfig')
const rollup = require('rollup')
const chalk = require('chalk')

function compiler (type, pt) {
    const watcher = rollup.watch({
        ...getConfig(type, pt, process.env.NODE_ENV),
        watch: {
            exclude: 'node_modules/**'
        }
    })

    watcher.on('event', ({ code, error }) => {
        if (code === 'START') {
            console.log(chalk.green(`[${type}][${pt}] compiler start!\n`))
            return
        }
        if (code === 'FATAL') {
            console.log(chalk.red(`[Error]: ${error}\n`))
            return
        }

        console.log(chalk.blue(`-~-~-~-~- ${code} -~-~-~-~-`))
    })
}

async function starter () {
    if (!await myInquirer.confirm('确认开始 构建lib ?')) {
        process.exit(0)
    }

    const type = await myInquirer.list('请选择编译类型', ['dll', 'vendor'])
    const pt = await myInquirer.list('请选择编译平台', ['web', 'mobile'])

    compiler(type, pt)
}

async function main () {
    try {
        await starter()
    } catch (e) {
        console.log(chalk.red(e))
        console.log(chalk.red('请确认错误类型，若为配置错误，请查看相关文档。若为代码缺陷，请提交至git issue fix后使用。'))
    }
}

main()
