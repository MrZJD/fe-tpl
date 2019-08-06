<template>
    <div
        v-show="state"
        class="toast-container"
        @click="hide"
    >
        <div class="toast-msg">
            {{ msg }}
        </div>
    </div>
</template>

<style lang="less">
// 样式请在 活动页中指定
// 样式列表模板
// .toast-container {
//     .toast-msg {}
// }
</style>

<script>
/**
 * Toast
 * horace 2019-7-16
 */

let timer = null
const duration = 3000

export default {
    name: 'Toast',
    props: {
        // show: {
        //     type: Boolean,
        //     required: true
        // }
    },
    data () {
        return {
            state: false,
            msg: ''
        }
    },
    methods: {
        show (msg) {
            if (timer) clearTimeout(timer)

            this.state = true
            this.msg = msg

            timer = setTimeout(() => {
                this.state = false
                this.msg = ''
            }, duration)
        },
        hide () {
            clearTimeout(duration)
            this.state = false
            this.msg = ''
        }
    }
}
</script>
