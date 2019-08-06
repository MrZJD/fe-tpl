/**
 * path config
 */
module.exports = {
    STATIC: '<!-- 静态文件 publicPath -->',
    SEVER: {
        mobile: '<!-- Mobile Domain HTML publicPath -->',
        pc: '<!-- PC Domain HTML publicPath -->'
    },
    lib: 'lib/', // publibPath + lib # lib assets dir
    mobile: 'mobile', // publicPath + mobile # mobile assets dir
    pc: 'pc' // publicPath + pc # pc assets dir
}
