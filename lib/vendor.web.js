// vendor 入口文件

import '../node_modules/core-js/es/promise/index'
import common from './vendor_pc/common'

window.common = common

export default {
    common,
    user
}
