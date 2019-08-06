<template>
    <div
        ref="wrapper"
        class="scroller" >
        <slot />
        <div
            ref="ss"
            :style="{
                right: right + 'px',
                width: width + 'px'
            }"
            class="scroller-container" >
            <div
                ref="ssThumb"
                :style="{
                    display: 'block',
                    top: '0px',
                    backgroundColor: thumbColor
                }"
                class="scroller-thumb" />
        </div>
    </div>
</template>

<script>
// PC滚动条优化 组件版
// date: 2019-2-16
// author: horace
export default {
    name: 'PCScroller',
    props: {
        // top: {
        //     type: Number,
        //     default: 0
        // },
        right: {
            type: Number,
            default: 0
        },
        width: {
            type: Number,
            default: 8
        },
        thumbColor: {
            type: String,
            default: '#fff'
        }
    },
    data () {
        return {
            draging: false,
            dragSY: 0,
            boxSize: {},
            isFF: false
        }
    },
    mounted () {
        this.init()

        document.body.addEventListener('mouseup', () => {
            this.draging = false
        })

        document.body.addEventListener('mouseleave', () => {
            this.draging = false
        })
    },
    methods: {
        _resetBox () {
            this.boxSize = {
                height: this.$refs.wrapper.scrollHeight,
                clientHeight: this.$refs.wrapper.clientHeight,
                h: this.$refs.wrapper.scrollHeight - this.$refs.wrapper.clientHeight,
                top: 0,
                ssTop: 0,
                ssHeight: 60 // 默认滚动条高度
            }
        },

        /**
         * @private
         * @method init
         * @desc 初始化
         */
        init () {
            this._resetBox()

            this.isFF = typeof this.$refs.wrapper.onmousewheel === 'undefined' // firefox unsupport event 'onmousewheel'

            this._reset()
            this._refresh()

            this._addMWEvent(this.$refs.wrapper, this._scroll)
            this._addDragEvent(this.$refs.ssThumb)
        },

        /**
         * @private
         * @method _reset
         * @desc 默认滚动条样式置空
         */
        _reset () {
            this.$refs.wrapper.style.overflow = 'hidden'
            this.$refs.wrapper.style.position = 'relative'
        },

        _refreshH () {
            this.boxSize.height = this.$refs.wrapper.scrollHeight
            this.boxSize.clientHeight = this.$refs.wrapper.clientHeight
        },

        /**
         * @private
         * @method _scroll
         * @param {event} evt
         * @desc onmousewheel 事件处理: node滚动位置scrollTop滚动
         * @return {void}
         */
        _scroll (evt) {
            // this.boxSize.top -= evt.wheelDeltaY
            this._refreshH()
            let delta = -1
            if (this.isFF) {
                if (evt.detail > 0) {
                    delta = 1
                }
            } else {
                if (evt.wheelDelta < 0) {
                    delta = 1
                }
            }
            this.boxSize.top += 40 * delta

            if (this.boxSize.top <= 0) {
                this.boxSize.top = 0
            } else if (this.boxSize.top >= this.boxSize.h) {
                this.boxSize.top = this.boxSize.h
            } else {
                evt.preventDefault()
                evt.stopPropagation()
                evt.cancelBubble = true
            }

            this.boxSize.ssTop = (this.boxSize.top / this.boxSize.h) * (this.$refs.ss.clientHeight - this.boxSize.ssHeight)

            this._refresh()

            return false
        },

        /**
         * @private
         * @param {event} evt
         * @desc 拖拽滚动滑块处理方法
         */
        _dragScroller (evt) {
            if (!this.draging) return

            let deltaY = evt.pageY - this.dragSY // 滚动差值
            this.dragSY = evt.pageY

            this.boxSize.ssTop += deltaY

            if (this.boxSize.ssTop <= 0) {
                this.boxSize.ssTop = 0
            }

            let maxH = this.$refs.ss.clientHeight - this.boxSize.ssHeight
            if (this.boxSize.ssTop >= maxH) {
                this.boxSize.ssTop = maxH
            }

            // 计算百分比
            this.boxSize.top = (this.boxSize.ssTop / (this.$refs.ss.clientHeight - this.boxSize.ssHeight)) * this.boxSize.h

            this._refresh()
        },

        /**
         * @private
         * @method _refresh
         * @desc 滚动条位置刷新
         */
        _refresh () {
            if (this.boxSize.clientHeight >= this.boxSize.height) {
                this.$refs.ssThumb.style.display = 'none'
                return
            } else {
                this.$refs.ssThumb.style.display = 'block'
            }
            this.$refs.wrapper.scrollTop = this.boxSize.top
            this.$refs.ss.style.top = this.boxSize.top + 'px'
            this.$refs.ssThumb.style.top = this.boxSize.ssTop + 'px'
        },

        /**
         * @private
         * @method_addMWEvent
         * @param {Node} element
         * @param {func} func
         * @desc 监听鼠标滚动
         */
        _addMWEvent (element, func) {
            let self = this
            if (!this.isFF) {
                element.onmousewheel = function (evt) {
                    func.call(self, evt)
                }
            }

            if (this.isFF) {
                element.addEventListener('DOMMouseScroll', function (evt) {
                    func.call(self, evt)
                }, false)
            }
        },

        /**
         * @private
         * @method _addDragEvent
         * @param {Node} element
         * @desc 监听滚动滑块拖动
         */
        _addDragEvent (element) {
            element.addEventListener('mousedown', (evt) => {
                this.draging = true
                this.dragSY = evt.pageY
            })
            element.addEventListener('mouseup', () => {
                this.draging = false
            })

            element.addEventListener('mousemove', this._dragScroller.bind(this))
            document.body.addEventListener('mousemove', this._dragScroller.bind(this))
        },

        /**
         * @public
         * @method refreshDOM
         * @desc 当内部元素发生变化时，应调用此方法刷新滚动位置
         */
        refreshDOM () {
            this.draging = false
            this._refreshH()

            this.boxSize.h = this.$refs.wrapper.scrollHeight - this.$refs.wrapper.clientHeight || 1

            this.boxSize.ssTop = (this.boxSize.top / this.boxSize.h) * (this.$refs.ss.clientHeight - this.boxSize.ssHeight)

            this._refresh()
        }
    }
}
</script>

<style>
.scroller-container {
    position: absolute;
    top: 0px;
    height: 100%;
    padding-bottom: 60px;
    box-sizing: border-box;
}

.scroller-container .scroller-thumb {
    position: relative;
    width: 100%;
    height: 46px;
    border-radius: 16px;
}

.scroller > * {
    user-select: none;
}
</style>
