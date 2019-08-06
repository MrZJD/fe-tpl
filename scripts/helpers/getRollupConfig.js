'use strict'

const cjs = require('rollup-plugin-commonjs')

const nodeBuiltins = require('rollup-plugin-node-builtins')
const node = require('rollup-plugin-node-resolve')
const babel = require('rollup-plugin-babel')

const postcss = require('rollup-plugin-postcss') // postcss
const autoprefixer = require('autoprefixer') // postcss - autoprefixer
const cssnano = require('cssnano') // postcss - cssnano
const vuePlugin = require('rollup-plugin-vue')
const image = require('rollup-plugin-img')

const alias = require('rollup-plugin-alias')

const warn = require('./warn')
const path = require('path')

const NODE_MODULE = path.resolve(__dirname, '../../node_modules')

const resolve = p => {
    return path.resolve(__dirname, '../../lib', p)
}

const builtin = {
    'dll-web': {
        name: 'dll',
        input: resolve('dll.web.js'),
        dest: resolve('dist/dll.web.js')
    },
    'dll-mobile': {
        name: 'dll',
        input: resolve('dll.mobile.js'),
        dest: resolve('dist/dll.mobile.js')
    },
    'vendor-web': {
        name: 'vendor',
        input: resolve('vendor.web.js'),
        dest: resolve('dist/vendor.web.js'),
        plugins: [
            nodeBuiltins(),
            image({
                output: '/images', // default the root
                extensions: /\.(png|jpg|jpeg|gif|svg)$/, // support png|jpg|jpeg|gif|svg, and it's alse the default value
                limit: 8192, // default 8192(8k)
                exclude: 'node_modules/**'
            }),
            vuePlugin(),
            postcss({
                extensions: ['.css', '.less'],
                plugins: [autoprefixer, cssnano]
            })
        ],
        external: ['vue', 'axios', 'jquery', 'layer'],
        globals: {
            vue: 'Vue',
            axios: 'axios',
            jquery: 'jquery',
            layer: 'layer'
        }
    },
    'vendor-mobile': {
        name: 'vendor',
        input: resolve('vendor.mobile.js'),
        dest: resolve('dist/vendor.mobile.js'),
        plugins: [
            postcss({
                extensions: ['.css', '.less'],
                plugins: [autoprefixer, cssnano]
            })
        ],
        external: ['vue', 'axios', 'webpack-zepto', 'weixin-js-sdk', 'layer'],
        globals: {
            vue: 'Vue',
            axios: 'axios',
            'webpack-zepto': 'Zepto',
            'weixin-js-sdk': 'wx',
            layer: 'layer'
        }
    }
}

module.exports = function getRollupConfig (type, pt, env) {
    const target = builtin[type + '-' + pt]
    if (!target) {
        warn('rollup config does not exist')
        return
    }
    const isDev = env === 'development'
    const external = target.external
    return {
        input: target.input,
        plugins: [
            alias({
                'vue@source': isDev ? 'node_modules/vue/dist/vue.js' : 'node_modules/vue/dist/vue.min.js'
            }),
            cjs(), // commonjs 载入
            node(), // npm模块载入
            babel({
                exclude: NODE_MODULE,
                runtimeHelpers: true
            })
        ].concat(target.plugins || []),
        external (id) {
            return /@babel\/runtime/.test(id) || (external && external.indexOf(id) !== -1)
        },
        output: {
            file: target.dest,
            format: 'umd',
            name: target.name,
            globals: target.globals,
            // sourcemap: isDev ? true : false
            sourcemap: true,
            strict: false
        }
    }
}
