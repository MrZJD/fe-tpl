/**
 * 发布工具
 */
const SSH2Utils = require('./ssh2utils')
const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
const PUBLISH_DIR = path.resolve(__dirname, '../../.publish')

const TEST_ENV = require('./secret').test

let client = null

async function pubDir (env, dir, dest) {
    if (!client) {
        client = new SSH2Utils()
        await client.createConn(env)
    }
    await client.putDir(dir, dest)
}

// 测试是直接发布到服务器
async function pub2test (files, dest) {
    // 1. 将文件列表移入一个目录下
    if (await fsExtra.exists(PUBLISH_DIR)) {
        await fsExtra.remove(PUBLISH_DIR)
    }
    await fsExtra.ensureDir(PUBLISH_DIR)

    for (let i = 0; i < files.length; i++) {
        let dirDest = PUBLISH_DIR
        if (files[i].dir) {
            dirDest = path.resolve(PUBLISH_DIR, files[i].dir)
            await fsExtra.ensureDir(dirDest)
        }
        dirDest = path.resolve(dirDest, path.basename(files[i].path))
        if (fs.statSync(files[i].path).isFile()) {
            await fsExtra.copyFile(files[i].path, dirDest) // 2. 拷贝文件
        }
    }

    // 2. publish
    await pubDir(TEST_ENV, PUBLISH_DIR, dest)

    // 3. delete tmp
    await fsExtra.remove(PUBLISH_DIR)
}

// 线上是发布到本地svn库
async function pub2TrunkSvn (files, dest) {
    for (let i = 0; i < files.length; i++) {
        let dirDest = dest
        if (files[i].dir) {
            dirDest = path.resolve(dest, files[i].dir)
            await fsExtra.ensureDir(dirDest) // 1. 确保目录
        }
        dirDest = path.resolve(dirDest, path.basename(files[i].path))
        if (fs.statSync(files[i].path).isFile()) {
            await fsExtra.copyFile(files[i].path, dirDest) // 2. 拷贝文件
        }
    }
}

module.exports = {
    pub2test,
    pub2TrunkSvn,
    pubClose: function () {
        if (!client) return
        client.end()
        client = null
    }
}
