<template>
    <div
        v-show="state"
        class="svg-layer"
        @click="stopSvg">
        <div class="svg-container"/>
    </div>
</template>

<style lang="less">
// 样式请在 活动页中指定
// 样式列表模板
// .svg-layer {
//     .svg-container { }
// }
</style>

<script>
/**
 * svg-player 动效播放
 * horace 2019-7-16
 */
import bodymovin from '../../component/bodymovin.min.js'

let aniPool = {
    // key: path
    // val: bodyMovin Instance
}
let currIns = null

export default {
    name: 'SvgPlayer',
    data () {
        return {
            state: false
        }
    },
    methods: {
        goPlay (path, type) {
            var svgContainer = document.querySelector('.svg-container')
            return bodymovin.loadAnimation({
                wrapper: svgContainer,
                animType: type || 'html',
                loop: true,
                autoplay: false,
                path: path
            })
        },
        playSvg (path) {
            if (!aniPool[path]) {
                aniPool[path] = this.goPlay(path)
            }

            aniPool[path].play()
            currIns = aniPool[path]
            this.state = true
        },
        stopSvg () {
            this.state = false
            if (currIns) {
                currIns.stop()
                currIns = null
            }
        }
    }
}
</script>
