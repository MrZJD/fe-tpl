/**
 * promisify simple git api & full with logic
 * 集中监控git操作
 */

const path = require('path')
const git = require('simple-git/promise')(path.resolve(__dirname, '../../'))

exports.git = git

exports.getRemotes = git.getRemotes

exports.pull = async function pull (remote, branch, options) {
    const remotes = await git.getRemotes(true)
    if (remotes.length !== 0) { // 远程分支存在 才需要拉
        await git.silent(false).pull(remote, branch, options)
    }
}

exports.checkout = git.checkoutBranch

exports.getUserInfo = async function getUserInfo () {
    const name = await git.raw([
        'config',
        '--global',
        '--get',
        'user.name'
    ])
    const email = await git.raw([
        'config',
        '--global',
        '--get',
        'user.email'
    ])
    return {
        author: name.trim(),
        email: email.trim()
    }
}
