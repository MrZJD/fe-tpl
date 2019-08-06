/**
 * 创建页面项目
 */
require('./helpers/init')()

const myInquirer = require('./helpers/inquirer')
const chalk = require('chalk')
const path = require('path')
const ora = require('ora')()
const git = require('./helpers/git')
const readdirSync = require('fs').readdirSync
const fs = require('fs-extra')

const pages = require('../pages/pages.json')
const templates = require('../templates/templates.json')

async function getSouceTpl (type) {
    if (type === 'blank') {
        return '_blank'
    }
    if (type === 'basic') {
        // -> 直接新建空模板(only mobile | only pc | mobile & PC 同构 | mobile & PC 异构)内容
        const source = await myInquirer.list('请选择基础模板类型:', [
            {
                name: 'only mobile',
                value: '_basic_mobile'
            },
            {
                name: 'only pc',
                value: '_basic_pc'
            },
            {
                name: 'mobile & pc 同构',
                value: '_basic_mixin'
            },
            {
                name: 'mobile & pc 异构',
                value: '_basic_singleton'
            }
        ])
        return source
    }
    if (type === 'exists') {
        // -> 从其他模板基础上新建模板
        const source = await myInquirer.list('请选择:', Object.keys(templates))
        return source
    }
    return '_blank'
}

async function starter () {
    const confirm = await myInquirer.confirm('确认新建页面项目?')

    if (!confirm) {
        process.exit(0)
    }

    let pageName = await myInquirer.input('请输入新建的页面项目名')

    pageName = pageName.trim()
    if (!pageName) {
        console.log(chalk.red('页面项目名不能为空'))
        process.exit(0)
    }

    if (pages[pageName]) {
        console.log(chalk.red('该页面项目已存在!'))
        process.exit(0)
    }

    // 检查src目录
    const files = readdirSync(path.resolve(__dirname, '../src'))
    if (files.length > 1 || (files.length === 1 && files[0] !== '.gitkeep')) {
        console.log(chalk.red('src目录已存在其他文件，请确认无其他文件后，再新建(除.gitkeep外)!'))
        process.exit(0)
    }

    // 1. 新建模板分支
    const branchName = `page/${pageName}`
    ora.start(`正在新建分支 ${branchName}`)
    await git.pull('origin', 'master')
    await git.checkout(branchName, 'master')
    ora.succeed(`新建模板分支 ${branchName} success!`)

    // 2. 复制模板内容
    const type = await myInquirer.list('选择页面模板类型', [
        {
            name: '基础模板',
            value: 'basic'
        },
        {
            name: '空模板(空源码文件)',
            value: 'blank'
        }
    ].concat(
        Object.keys(templates).length !== 0 ? [{
            name: '从已有模板中选择',
            value: 'exists'
        }] : []
    ))

    const fromTpl = await getSouceTpl(type)

    // 2.1 拷贝目录
    ora.start(`正在创建源码目录`)
    await fs.copy(
        path.resolve(__dirname, '../templates', fromTpl),
        path.resolve(__dirname, '../src')
    )
    // 2.2 写入config文件
    const user = (await git.getUserInfo()) || {}
    await fs.writeJSON(
        path.resolve(__dirname, '../src', 'config.json'),
        {
            ...user,
            type: 'page',
            name: pageName,
            useTpl: fromTpl,
            branch: branchName,
            created: new Date().toString(),
            app: {
                pageTitle: '页面标题'
            }
        },
        {
            spaces: 4
        }
    )
    ora.succeed('创建源码目录 success!')
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
