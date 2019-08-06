/**
 * lib模块 build脚本
 */
require('./helpers/init')()

const myInquirer = require('./helpers/inquirer')
const getConfig = require('./helpers/getRollupConfig')
const rollup = require('rollup')
const chalk = require('chalk')
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')
const terser = require('terser')

// 清理目录
const cleanDir = (function () {
    let isCleaned = false
    return function (dist) {
        if (isCleaned) return
        isCleaned = true
        const dir = path.dirname(dist)
        const files = fs.readdirSync(dir)
        files.map(f => {
            fs.unlinkSync(path.resolve(dir, f))
        })
    }
})()

function getSize (code) {
    return (code.length / 1024).toFixed(2) + 'kb'
}

function write (file, code) {
    return new Promise((resolve, reject) => {
        function report (extra) {
            console.log(chalk.green(path.relative(process.cwd(), file)) + ' ' + getSize(code) + (extra || ''))
            resolve()
        }

        fs.writeFile(file, code, err => {
            if (err) return reject(err)
            zlib.gzip(code, (err, zipped) => {
                if (err) return reject(err)
                report(' (gzipped: ' + getSize(zipped) + ')')
            })
        })
    })
}

function compiler (env, type, pt) {
    const config = getConfig(type, pt, env)

    cleanDir(config.output.file)
    console.log(chalk.blue(`Start Compiler [${type}] [${pt}]`))

    return rollup.rollup(config)
        .then(bundle => bundle.generate(config.output))
        .then(({ output: [{ code, map }] }) => {
            // uglify // -> 这边没有输出map文件
            // if (!isDev) {
            const minified = terser.minify(code, {
                toplevel: true,
                output: {
                    ascii_only: true
                },
                compress: {
                    pure_funcs: ['makeMap']
                }
            }).code
            return write(config.output.file, minified)
            // } else {
            //     return write(config.output.file, code)
            // }
        })
        .catch(err => {
            console.log(chalk.red(`[Error]: ${err.message}\n`))
        })
}

async function starter () {
    if (!await myInquirer.confirm('确认开始构建 lib?')) {
        process.exit(0)
    }

    const env = await myInquirer.list('请选择编译环境', [
        {
            name: 'test',
            value: 'development'
        }, {
            name: 'trunk',
            value: 'production'
        }
    ])
    const type = await myInquirer.list('请选择编译类型', [
        {
            name: 'all',
            value: ['dll', 'vendor']
        }, {
            name: 'dll',
            value: ['dll']
        }, {
            name: 'vendor',
            value: ['vendor']
        }
    ])
    const pt = await myInquirer.list('请选择编译平台', [
        {
            name: 'all',
            value: ['web', 'mobile']
        },
        {
            name: 'web',
            value: ['web']
        },
        {
            name: 'mobile',
            value: ['mobile']
        }
    ])

    for (let ti = 0; ti < type.length; ti++) {
        for (let pi = 0; pi < pt.length; pi++) {
            await compiler(env, type[ti], pt[pi])
        }
    }

    console.log('\n' + chalk.green('~_~ lib 编译完成!'))
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
