/**
 * webpack config 配置组装
 *
 * 包括部分环境的判断
 */
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const basic = require('./basic')
const PUBLIC = require('./config')
const libVer = require('../../lib/version.json')

const isProd = process.env.NODE_ENV === 'production'

function resolve (...name) {
    return path.resolve(__dirname, ...name)
}

const EXTERNALS = {
    PC: {
        // dll_pc
        vue: 'Vue',
        axios: 'axios',
        jquery: 'jquery',
        // vendor_pc
        common: 'common',
        user: 'user'
    },
    MOBILE: {
        // dll_mobile
        vue: 'Vue',
        axios: 'axios',
        Zepto: 'Zepto',
        wx: 'wx',
        // vendor_mobile
        common: 'common',
        wxShare: 'wxShare'
    }
}

// 获取lib版本url
const getLib = function (platform, dllVer, vendorVer) {
    const lib = []
    const dll = `dll.${platform.toLowerCase()}.js`
    const vendor = `vendor.${platform.toLowerCase()}.js`

    if (dllVer === 'latest') {
        dllVer = libVer[dll].latest
    }
    if (vendorVer === 'latest') {
        vendorVer = libVer[vendor].latest
    }

    lib.push(PUBLIC.STATIC + PUBLIC.lib + dllVer + '/' + dll)
    lib.push(PUBLIC.STATIC + PUBLIC.lib + vendorVer + '/' + vendor)

    return lib
}

/* 配置工厂 */
const factory = {
    htmlMinifyOption: isProd ? {
        removeComments: true, // 移除 html 注释
        collapseWhitespace: true // html 压缩为一行
    } : false,
    /* 纯净配置 */
    pure ({ filename, platform, data }) {
        const config = basic(filename, platform)
        config.entry = resolve('../../src/index.js')
        config.output = {
            filename: `js/${filename}.js?v=[hash:8]`,
            path: resolve('../../dist/', platform),
            publicPath: PUBLIC.STATIC + PUBLIC[platform]
        }
        config.plugins.push(
            new HtmlWebpackPlugin({
                filename: `html/${filename}.html`,
                template: resolve('../../src/layout.html'),
                inject: true,
                app: data,
                minify: factory.htmlMinifyOption
            })
        )
        return config
    },
    /* 通用PC配置 */
    pc ({ filename, dir, dllVer, vendorVer, data }) {
        const config = basic(filename, 'pc')
        config.entry = resolve('../../src', dir, 'index.js')
        config.output = {
            filename: `js/${filename}.js?v=[hash:8]`,
            path: resolve('../../dist/', 'pc'),
            publicPath: PUBLIC.STATIC + PUBLIC.pc
        }
        config.externals = EXTERNALS.PC
        config.plugins.push(
            new HtmlWebpackPlugin({
                filename: `html/${filename}.html`,
                template: resolve('../../src', dir, 'layout.html'),
                inject: true,
                externals: getLib('web', dllVer, vendorVer),
                app: data,
                minify: factory.htmlMinifyOption
            })
        )
        return config
    },
    /* 通用Mobile配置 */
    mobile ({ filename, dir, dllVer, vendorVer, data }) {
        const config = basic(filename, 'mobile')
        config.entry = resolve('../../src', dir, 'index.js')
        config.output = {
            filename: `js/${filename}.js?v=[hash:8]`,
            path: resolve('../../dist/', 'mobile'),
            publicPath: PUBLIC.STATIC + PUBLIC.mobile
        }
        config.externals = EXTERNALS.MOBILE
        config.plugins.push(
            new HtmlWebpackPlugin({
                filename: `html/${filename}.html`,
                template: resolve('../../src', dir, 'layout.html'),
                inject: true,
                externals: getLib('mobile', dllVer, vendorVer),
                app: data,
                injectScripts: [
                    resolve('../../packages/flexible.js')
                ],
                minify: factory.htmlMinifyOption
            })
        )
        return config
    }
}

function getConfig (use, { filename, dllVer, vendorVer, platform }, data) {
    if (use in factory) {
        return factory[use]({
            filename,
            dllVer,
            vendorVer,
            platform,
            data,
            dir: ''
        })
    } else {
        let mobileDll = dllVer
        let pcDll = dllVer
        if (dllVer !== 'string') { // 子版本
            mobileDll = dllVer.mobile
            pcDll = dllVer.pc
        }
        let mobileVendor = vendorVer
        let pcVendor = vendorVer
        if (typeof vendorVer !== 'string') { // 子版本
            mobileVendor = vendorVer.mobile
            pcVendor = vendorVer.pc
        }
        return [
            factory.pc({
                filename,
                dllVer: pcDll,
                vendorVer: pcVendor,
                data,
                dir: 'pc'
            }),
            factory.mobile({
                filename,
                dllVer: mobileDll,
                vendorVer: mobileVendor,
                data,
                dir: 'mobile'
            })
        ]
    }
}

module.exports = getConfig
