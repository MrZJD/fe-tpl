// dll 入口文件

import Vue from 'vue@source' // eslint-disable-line
import axios from 'axios/dist/axios'
import jquery from 'jquery/dist/jquery'
import './dll/layer'

window.Vue = Vue
window.axios = axios
window.jquery = jquery
window.$ = jquery

export default {
    Vue, axios, jquery
}
