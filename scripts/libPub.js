/**
 * lib 模块发布 及 版本管理
 */
require('./helpers/init')()

const myInquirer = require('./helpers/inquirer')
const chalk = require('chalk')
const ora = require('ora')()
const version = require('../lib/version.json')
const path = require('path')
const fsExtra = require('fs-extra')
const { pub2test, pub2TrunkSvn, pubClose } = require('./helpers/publish')

const resolve = (...name) => {
    return path.resolve(__dirname, ...name)
}

const TRUNKSVN = resolve('../.trunksvn')
const LIB_SERVER_DIR = '<!-- lib 文件服务器目录 -->'
const LIB_TRUNK_DIR = '<!-- lib 本地trunk相对路径 relative .trunksvn -->'

// 增量修改 ver
function minor (ver) {
    let version = ver.slice(1).split('.').map(num => Number(num)).reduce((prev, curr) => {
        return prev * 10 + curr
    })
    version += 1
    version = String(version)
    version = '000'.slice(version.length) + version
    return 'v' + [
        version.slice(0, -2),
        version.slice(-2, -1),
        version.slice(-1)
    ].join('.')
}

async function pubProxy (env, ver, dest) {
    const files = []

    for (const libType in ver) {
        const target = resolve(`../lib/dist/${libType}`)
        await fsExtra.ensureFile(target)
        files.push({
            path: target,
            dir: `${ver[libType]}`
        })
    }

    if (env === 'test') {
        await pub2test(files, dest)
    }
    if (env === 'trunk') {
        await pub2TrunkSvn(files, dest)
    }

    pubClose()
}

// 发布测试server
async function pubTest (ver) {
    await pubProxy('test', ver, LIB_SERVER_DIR)
}

async function initTrunk () {
    // await
    let isexist = await fsExtra.exists(TRUNKSVN)
    if (isexist) {
        return
    }

    const trunksvn = await myInquirer.input('请输入本地videochat trunk路径: ')
    isexist = await fsExtra.exists(trunksvn)
    if (!isexist) {
        console.log(chalk.red('输入的路径 无效!'))
        process.exit(0)
    }
    await fsExtra.writeFile(
        TRUNKSVN,
        trunksvn
    )
}

// 发布线上svn
async function pubTrunk (ver) {
    // await
    await initTrunk()

    const trunksvn = await fsExtra.readFile(TRUNKSVN, { encoding: 'utf8' })
    if (!await fsExtra.exists(trunksvn)) {
        console.log(chalk.red('.trunksvn配置中的路径 无效! 请修改确认后再发布'))
        process.exit(0)
    }

    ora.start(`[publish 2 trunk svn] 开始拷贝文件...`)
    await pubProxy('trunk', ver, path.resolve(trunksvn, LIB_TRUNK_DIR))
    ora.succeed('[publish 2 trunk svn] 拷贝文件成功!')
}

async function starter () {
    const start = await myInquirer.confirm('确认发布 lib 模块?', true)
    if (!start) {
        process.exit(0)
    }

    console.log(chalk.red('!!! 发布前 请先拉取 lib/version.json 已更新发布版本 !!!'))
    const ensureGit = await myInquirer.confirm('是否已同步代码')
    if (!ensureGit) {
        process.exit(0)
    }

    const env = await myInquirer.list('请选择发布环境:', ['test', 'trunk'])
    if (!env) {
        console.log(chalk.red('发布环境不能为空'))
        process.exit(0)
    }

    const cate = await myInquirer.checkbox('请选择 dll vendor:', [
        {
            value: 'dll.mobile.js',
            checked: true
        },
        {
            value: 'dll.web.js',
            checked: true
        },
        {
            value: 'vendor.mobile.js',
            checked: true
        },
        {
            value: 'vendor.web.js',
            checked: true
        }
    ])

    const MinorMode = '增量发布(版本号自动+1)'
    const CoverMode = '覆盖已有版本发布'
    const pubMode = await myInquirer.list('请选择发布版本:', [MinorMode, CoverMode])
    const pubVer = {}
    if (pubMode === MinorMode) {
        cate.forEach((libType) => {
            pubVer[libType] = minor(version[libType].latest)
        })
    } else {
        for (let i = 0; i < cate.length; i++) {
            const libType = cate[i]
            const choices = Object.keys(version[libType]).filter(ver => ver !== 'latest')
            const ver = await myInquirer.list(
                `请选择 ${libType} 覆盖发布版本:`,
                choices.length === 0 ? [{
                    name: '无可覆盖版本，增量发布(版本号自动+1)',
                    value: minor(version[libType].latest)
                }] : choices
            )
            pubVer[libType] = ver
        }
    }

    // -> 发布
    // 确认是否覆盖发布，可能会对已有线上代码产生影响 (覆盖主要是线上发布)
    const confirm = await myInquirer.confirm(`请确认以下信息:
${JSON.stringify(pubVer, null, 2)}
${pubMode !== MinorMode ? chalk.red('选择旧版本发布，会覆盖选中版本代码，可能造成side effect。请确认影响后继续。') : ''}`)

    if (!confirm) {
        process.exit(0)
    }

    if (env === 'test') {
        ora.start('[publish 2 test] 开始发布传输文件...')
        await pubTest(pubVer)
        ora.succeed('[publish 2 test] 发布文件成功!')
    }
    if (env === 'trunk') {
        await pubTrunk(pubVer)
    }

    // 记录发布成功
    let record
    const now = (new Date()).toString()
    if (pubMode === MinorMode) {
        record = {
            pubTest: env === 'test',
            pubTestTime: env === 'test' ? now : null,
            pubTrunk: env === 'trunk',
            pubTrunkTime: env === 'trunk' ? now : null
        }
    } else {
        record = {}
        if (env === 'test') {
            record.pubTest = true
            record.pubTestTime = now
        }
        if (env === 'trunk') {
            record.pubTrunk = true
            record.pubTrunkTime = now
        }
    }

    Object.keys(pubVer).forEach(type => {
        const v = pubVer[type]
        if (pubMode === MinorMode) {
            version[type].latest = v
            version[type][v] = record
        } else {
            Object.assign(version[type][v], record)
        }
    })
    await fsExtra.writeJSON(resolve(__dirname, '../lib/version.json'), version, { spaces: 4 })
    console.log(chalk.green('发布 lib 成功! 前往 lib/version.json 查看版本详情'))
    console.log(chalk.red('!!! 请手动发布 lib/version.json 至 git仓库 以添加版本管理 !!!'))
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
