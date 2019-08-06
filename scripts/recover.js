/**
 * 从页面/模板归档中恢复编辑
 */
require('./helpers/init')()

const ora = require('ora')()
const chalk = require('chalk')
const commander = require('commander')
const path = require('path')
const myInquirer = require('./helpers/inquirer')
const { git } = require('./helpers/git')
const fse = require('fs-extra')

commander.option('-t, --type <value>', 'Archive Type: 归档类型 (page | tpl)')
    .parse(process.argv)

if (commander.type !== 'page' && commander.type !== 'tpl') {
    console.log(chalk.red('未知的归档类型'))
    process.exit(0)
}

const resolve = (...name) => {
    return path.resolve(__dirname, ...name)
}

async function starter () {
    const A_TYPE = commander.type
    const BADGE = chalk.blue(A_TYPE)

    if (!await myInquirer.confirm(`确认开始 从归档 ${BADGE} 恢复编辑页面 ?`)) {
        process.exit(0)
    }

    let archives
    if (A_TYPE === 'page') {
        archives = require('../pages/pages.json')
    }
    if (A_TYPE === 'tpl') {
        archives = require('../templates/templates.json')
    }

    // * 1. 输入归档页面项目名
    const choices = Object.keys(archives)
    if (choices.length === 0) {
        console.log(chalk.red(`当前本地Git仓库没有可用的${BADGE}分支!`))
        process.exit(0)
    }

    choices.unshift({ name: '手动输入名称', value: 'CUSTOM_INPUT' })
    let chosen = await myInquirer.list('请选择 需要恢复的页面项目 :', choices)
    if (chosen === 'CUSTOM_INPUT') {
        chosen = await myInquirer.input('请输入 需要恢复的页面项目名称 :')
        if (!archives[chosen]) {
            console.log(chalk.red('归档中不存在该项目记录，请确认后重新执行!'))
            process.exit(0)
        }
    }

    const target = archives[chosen]
    const br = target.branch
    // * 2. 新建分支
    ora.start(`正在恢复 ${br} 分支`)
    const branches = await git.branchLocal()
    if (branches.all.includes(br)) {
        console.log(chalk.red('本地git仓库已有该名称项目的分支，请确认后重新操作!'))
        process.exit(0)
    }
    await git.checkoutLocalBranch(br)
    ora.succeed(`${br} 分支 已恢复`)

    // * 3. copy pages/$ 到 src 目录
    ora.start('正在恢复 src 目录代码')
    const targetRoot = {
        page: resolve('../pages', target.name),
        tpl: resolve('../templates', target.name)
    }[A_TYPE]
    await fse.copy(targetRoot, resolve('../src'))
    ora.succeed('src 目录代码 已恢复')

    // ! 这边删不删除 pages/$目录 都可以
    console.log(chalk.green(`已恢复 ${target.name} 项目 ~_~`))
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
