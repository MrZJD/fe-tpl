/**
 * src. tpl/page 开发/构建 脚本
 */
require('./helpers/init')()

const path = require('path')
const chalk = require('chalk')
const myInquirer = require('./helpers/inquirer')
const webpack = require('webpack')
const emptyDir = require('fs-extra').emptyDir
const PUBLIC = require('./webpack/config')
const getConfig = require('./webpack/getConfig')

const isProd = process.env.NODE_ENV === 'production'
const isMain = require.main === module

let target
let info

function resolve (...name) {
    return path.resolve(__dirname, ...name)
}

try {
    target = require('../src/compiler') // eslint-disable-line
    info = require('../src/config.json') // eslint-disable-line
} catch (e) {
    console.log(chalk.red('Error: src/[compiler.js | config.json] 文件不存在'))
    process.exit(0)
}

function compiler (config, hooks) {
    const packer = webpack(config)
    const std = (err, stats) => {
        if (err) {
            console.error(err)
            return
        }

        console.log(stats.toString({
            chunks: false, // 使构建过程更静默无输出
            colors: true // 在控制台展示颜色
        }))

        hooks(stats)
    }
    if (isProd || !isMain) {
        packer.run(std)
    } else {
        packer.watch({
            ignored: /node_modules/
        }, std)
    }
}

async function starter () {
    if (isMain) {
        const confirm = await myInquirer.confirm(`确认开始构建: ${process.env.NODE_ENV} ${info.name} ${target.use}?`)

        if (!confirm) {
            process.exit(0)
        }
    }

    if (isProd && info.type !== 'page') {
        console.log(chalk.red('当前src目录不是page类型！'))
        process.exit(0)
    }

    const filename = info.name
    const config = getConfig(target.use, {
        filename,
        dllVer: target.dll,
        vendorVer: target.vendor,
        platform: target.platform
    }, info.app)

    await emptyDir(resolve('../dist'))

    const callback = (stats) => {
        console.log('\n')
        if (Array.isArray(config)) {
            console.log(chalk.blue(`OPEN Url: ${PUBLIC.SEVER.mobile + filename}.html`))
            console.log(chalk.blue(`OPEN Url: ${PUBLIC.SEVER.pc + filename}.html`))
        } else {
            if (target.use === 'pure') {
                console.log(chalk.blue(`OPEN Url: ${PUBLIC.SEVER[target.platform] + filename}.html`))
            } else {
                console.log(chalk.blue(`OPEN Url: ${PUBLIC.SEVER[target.use] + filename}.html`))
            }
        }
    }

    if (isMain) {
        compiler(config, callback)
    } else {
        return new Promise((resolve, reject) => {
            compiler(config, () => {
                callback()
                resolve()
            })
        })
    }
}

async function main () {
    try {
        await starter()
    } catch (e) {
        console.log(chalk.red(e))
        console.log(chalk.red('请确认错误类型，若为配置错误，请查看相关文档。若为代码缺陷，请提交至git issue fix后使用。'))
    }
}

if (isMain) {
    main()
} else {
    module.exports = starter
}
