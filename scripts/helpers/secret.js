/**
 * 服务器信息
 */

module.exports = {
    local: { /* ! 本地测试 发布服务器 功能时使用 (其他情况请勿使用) ! */
        host: 'LOCAL_HOST',
        username: 'LOCAL_USERNAME',
        password: 'LOCAL_USERPSWD'
    },
    test: {
        /* 测试服务器信息 */
        host: 'TEST_HOST',
        username: 'TEST_SERVER_USERNAME',
        password: 'TEST_SERVER_USERPSWD'
    }
}
