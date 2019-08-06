/**
 * 页面发布脚本
 */
require('./helpers/init')()

const path = require('path')
const myInquirer = require('./helpers/inquirer')
const chalk = require('chalk')
const ora = require('ora')()
const fse = require('fs-extra')
const glob = require('glob')
const { pub2test, pub2TrunkSvn, pubClose } = require('./helpers/publish')

let target
let info

function resolve (...name) {
    return path.resolve(__dirname, ...name)
}

try {
    target = require('../src/compiler')
    info = require('../src/config.json')
} catch (e) {
    console.log(chalk.red('Error: src/[compiler.js | config.json] 文件不存在'))
    process.exit(0)
}

/* 测试结点 */
const HTML_SERVER_ROOT = '<!-- HTML 服务器存放路径 -->'
const HTML_DIR = {
    mobile: 'mobile/dist/vmaker/',
    pc: 'pc/dist/vmaker/'
}
const STATIC_SERVER_DIR = '<!-- STATIC 服务器存放路径 -->'
/* trunk svn结点 */
const TRUNKSVN = resolve('../.trunksvn')
const HTML_TRUNK_DIR = '<!-- 本地 trunk svn HTML 目录 -->'
const STATIC_TRUNK_DIR = '<!-- 本地 trunk svn STATIC 目录 -->'

async function pubEnv (env, files, dest) {
    if (!dest) {
        console.log(chalk.red('目标路劲未指定'))
        process.exit(0)
    }
    if (env === 'test') {
        await pub2test(files, dest)
    }
    if (env === 'trunk') {
        await pub2TrunkSvn(files, dest)
    }
}

async function pubHTML (env, pt) {
    const ptRoot = `../dist/${pt}`

    // 1. html
    const htmlsRoot = resolve(ptRoot, 'html')
    const htmls = glob.sync(htmlsRoot + '/**/*').map(fpath => {
        return {
            path: fpath,
            dir: path.join(HTML_DIR[pt], path.dirname(path.relative(htmlsRoot, fpath)))
        }
    })

    let dest
    if (env === 'test') {
        dest = HTML_SERVER_ROOT
    }
    if (env === 'trunk') {
        dest = HTML_TRUNK_DIR
    }
    await pubEnv(env, htmls, dest)
}

async function pubStatic (env, pt) {
    const ptRoot = `../dist/${pt}`
    // 2.1 images
    const imagesRoot = resolve(ptRoot, 'images')
    const images = glob.sync(imagesRoot + '/**/*').map(fpath => {
        return {
            path: fpath,
            // images 需要带目录 (构建目录已有，所以这里不用写)
            dir: path.join(`${pt}/images/`, path.dirname(path.relative(imagesRoot, fpath)))
        }
    })
    // 2.2 css
    const cssRoot = resolve(ptRoot, 'style')
    const css = glob.sync(cssRoot + '/**/*').map(fpath => {
        return {
            path: fpath,
            // css 不需要带项目目录
            dir: path.join(`${pt}/style/`, path.dirname(path.relative(cssRoot, fpath)))
        }
    })
    // 2.3 js
    const jsRoot = resolve(ptRoot, 'js')
    const js = glob.sync(jsRoot + '/**/*').map(fpath => {
        return {
            path: fpath,
            // js 不需要带项目目录
            dir: path.join(`${pt}/js/`, path.dirname(path.relative(jsRoot, fpath)))
        }
    })

    let dest
    if (env === 'test') {
        dest = STATIC_SERVER_DIR
    }
    if (env === 'trunk') {
        dest = STATIC_TRUNK_DIR
    }
    await pubEnv(env, [...images, ...css, ...js], dest)
}

async function pubProxy (env) {
    if (await fse.exists(resolve('../dist/mobile'))) {
        await pubHTML(env, 'mobile')
        await pubStatic(env, 'mobile')
    }

    if (await fse.exists(resolve('../dist/pc'))) {
        await pubHTML(env, 'pc')
        await pubStatic(env, 'pc')
    }

    env === 'test' && pubClose() // test 使用了 ssh 发布 需要手动断开连接
}

async function pubTest () {
    await pubProxy('test')
}

async function initTrunk () {
    // await
    let isexist = await fse.exists(TRUNKSVN)
    if (isexist) return

    const trunksvn = await myInquirer.input('请输入本地videochat trunk路径: ')
    isexist = await fse.exists(trunksvn)
    if (!isexist) {
        console.log(chalk.red('输入的路径 无效!'))
        process.exit(0)
    }
    await fse.writeFile(
        TRUNKSVN,
        trunksvn
    )
}

// 发布线上svn
async function pubTrunk (ver) {
    // await
    await initTrunk()

    const trunksvn = await fse.readFile(TRUNKSVN, { encoding: 'utf8' })
    if (!await fse.exists(trunksvn)) {
        console.log(chalk.red('.trunksvn配置中的路径 无效! 请修改确认后再发布'))
        process.exit(0)
    }

    ora.start(`[publish 2 trunk svn] 开始拷贝文件...`)

    await pubProxy('trunk')

    ora.succeed('[publish 2 trunk svn] 拷贝文件成功!')
}

async function starter () {
    const start = await myInquirer.confirm(`确认开始发布: ${info.name} ${target.use}?`)

    if (!start) {
        process.exit(0)
    }

    if (info.type !== 'page') {
        console.log(chalk.red('当前src目录不是page类型！'))
        process.exit(0)
    }

    const env = await myInquirer.list('请选择发布环境', ['test', 'trunk'])

    // 测试
    if (env === 'test') {
        ora.start('开始前置 dev 构建')
        process.env.NODE_ENV = 'development' // eslint-disable-line
        const packer = require('./pack')
        await packer()
        ora.succeed('dev 构建成功!')

        ora.start('[publish 2 test] 开始发布传输文件...')
        await pubTest()
        ora.succeed('[publish 2 test] 发布文件成功!')
        return
    }

    // 线上
    if (env === 'trunk') {
        ora.start('开始前置 build 构建')
        process.env.NODE_ENV = 'production' // eslint-disable-line
        const packer = require('./pack')
        await packer()
        ora.succeed('build 构建成功!')
        await pubTrunk()
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

main()
