/**
 * ssh2 utils wrapper
 */
const path = require('path')
const fs = require('fs')
const { Client } = require('ssh2')
const promisify = require('util').promisify
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

class SSH2Utils {
    constructor () {
        this.conn = new Client()
        this._isReady = true
        this._sftp = null
    }

    createConn (option) {
        return new Promise((resolve, reject) => {
            this.conn.on('ready', () => {
                this._isReady = true
                this.conn.sftp((err, sftp) => {
                    if (err) {
                        reject(err)
                    }
                    this._sftp = sftp
                    resolve()
                })
            }).connect(option)
        })
    }

    // 上传一个文件
    putFile (localPath, remoteDir) {
        return new Promise((resolve, reject) => {
            const filename = path.basename(localPath)
            this._sftp.fastPut(
                localPath,
                [remoteDir, filename].join('/'),
                function (err) {
                    if (err) {
                        reject(err)
                    }
                    resolve()
                }
            )
        })
    }

    stat (remotePath) {
        return new Promise((resolve, reject) => {
            this._sftp.stat(remotePath, (err, stats) => {
                if (err) {
                    reject(err)
                }
                resolve()
            })
        })
    }

    ensureDir (remoteDir) {
        return this.stat(remoteDir).then(() => {
            // 目录存在
            return Promise.resolve()
        }).catch(err => {
            if (err.message === 'No such file') {
                // 目录不存在
                // 递归父目录
                return this.ensureDir(path.dirname(remoteDir)).then(() => {
                    return new Promise((resolve, reject) => {
                        this._sftp.mkdir(remoteDir, function (err) {
                            if (err) {
                                reject(err)
                            } else {
                                resolve()
                            }
                        })
                    })
                })
            } else {
                // 其他错误
                return Promise.reject(err)
            }
        })
    }

    // 上传一个目录
    async putDir (localDir, remoteDir) {
        return readdir(localDir).then(async (files) => {
            // 1. ensureDir
            await this.ensureDir(remoteDir)
            for (let i = 0; i < files.length; i++) {
                const fileStat = await stat(path.resolve(localDir, files[i]))
                if (fileStat.isFile()) {
                    // 2. 文件上传
                    await this.putFile(path.resolve(localDir, files[i]), remoteDir)
                }
                if (fileStat.isDirectory()) {
                    // 3. 子目录 递归上传
                    await this.putDir(
                        path.resolve(localDir, files[i]),
                        [remoteDir, files[i]].join('/')
                    )
                }
            }
        })
    }

    end () {
        this.conn.end()
    }
}

module.exports = SSH2Utils
