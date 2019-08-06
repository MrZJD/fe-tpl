/**
 * 从归档中选取一个新建 页面项目分支
 */
require('./helpers/init')()

const ora = require('ora')()
const chalk = require('chalk')
const path = require('path')
const myInquirer = require('./helpers/inquirer')
const { git, getUserInfo } = require('./helpers/git')
const fse = require('fs-extra')

const resolve = (...name) => {
    return path.resolve(__dirname, ...name)
}

const pages = require('../pages/pages.json')

async function starter () {
    if (!await myInquirer.confirm('确认开始 从归档新建页面项目 ?')) {
        process.exit(0)
    }

    // * 1. 输入归档页面项目名
    const choices = Object.keys(pages)
    choices.unshift({ name: '手动输入名称', value: 'CUSTOM_INPUT' })
    let chosen = await myInquirer.list('请选择 目标的归档项目 :', choices)
    if (chosen === 'CUSTOM_INPUT') {
        chosen = await myInquirer.input('请输入 目标的归档项目名称 :')
        if (!pages[chosen]) {
            console.log(chalk.red('归档中不存在该项目记录，请确认后重新执行!'))
            process.exit(0)
        }
    }

    // * 2. 输入新建的页面项目名
    let projName
    do {
        projName = await myInquirer.input('请输入 新建的页面项目名 :')
        if (pages[projName]) {
            console.log(chalk.red('该项目名已存在，请重新输入项目名称 :'))
        }
    } while (pages[projName])

    const target = pages[chosen]
    const br = `page/${projName}`
    // * 2. 新建分支
    ora.start(`正在新建 ${br} 分支`)
    const branches = await git.branchLocal()
    if (branches.all.includes(br)) {
        console.log(chalk.red('本地git仓库已有该名称项目的分支，请确认后重新操作!'))
        process.exit(0)
    }
    await git.checkoutLocalBranch(br)
    ora.succeed(`${br} 分支 新建成功!`)

    // * 3. copy pages/$ 到 src 目录
    ora.start(`正在拷贝 归档(${chosen}) 代码文件`)
    await fse.copy(resolve('../pages', target.name), resolve('../src'))
    ora.succeed(`拷贝 归档(${chosen}) 代码文件 成功!`)

    // * 4. 修改 config.json 数据
    ora.start(`正在修改 ${br} 配置文件`)
    const pageConfigFile = resolve('../src/config.json')
    const pageConfig = await fse.readJSON(pageConfigFile)
    const gitInfo = await getUserInfo()
    pageConfig.author = gitInfo.author
    pageConfig.email = gitInfo.email
    pageConfig.name = projName
    pageConfig.branch = br
    pageConfig.created = (new Date()).toString()

    await fse.writeJSON(pageConfigFile, pageConfig, { spaces: 4 })
    ora.succeed(`${br} 配置文件 修改成功!`)

    console.log(chalk.green(`新建 ${projName} 页面项目成功 ~_~`))
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
