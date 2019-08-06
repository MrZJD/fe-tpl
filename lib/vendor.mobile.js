// vendor 入口文件

import '../node_modules/core-js/es/promise/index'
import common from './vendor_mobile/common'
import './vendor_mobile/wxShare'

window.common = common

export default {
    common,
    wxShare: 'wxShare'
}
