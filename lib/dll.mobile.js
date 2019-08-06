// dll 入口文件

import Vue from 'vue@source' // eslint-disable-line
import axios from 'axios/dist/axios'
import Zepto from 'webpack-zepto'
import wx from 'weixin-js-sdk/index'
import './dll/layer'

window.Vue = Vue
window.axios = axios
window.Zepto = Zepto
window.$ = Zepto
window.wx = wx

export default {
    Vue, axios, Zepto, wx
}
