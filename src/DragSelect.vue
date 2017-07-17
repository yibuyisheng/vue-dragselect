<template>
    <div class="drag-select" v-drag>
        <div class="drag-select-content">
            <slot></slot>
        </div>

        <div class="drag-select-mask" ref="mask"></div>

        <div class="real-selected-rect"
            ref="realSelectedRect"
            v-for="(rect, index) in realRectList"
            :key="index"
            :style="rect | rectToStyle">
            <slot name="realSelected" :rect="rect" :index="index"></slot>
        </div>
        <div class="selected-rect"
            v-for="(rect, index) in localRectList"
            :key="index"
            :style="rect | rectToStyle"
            :class="{dragging: draggingIndex === index}"
            :data-rect-index="index">
            <div class="selected-rect-close" @click.stop="removeRect(index)">
                <icon name="close"></icon>
            </div>

            <i class="selected-rect-node selected-rect-top" :data-rect-index="index"></i>
            <i class="selected-rect-node selected-rect-top-right" :data-rect-index="index"></i>
            <i class="selected-rect-node selected-rect-top-left" :data-rect-index="index"></i>
            <i class="selected-rect-node selected-rect-right" :data-rect-index="index"></i>
            <i class="selected-rect-node selected-rect-bottom-right" :data-rect-index="index"></i>
            <i class="selected-rect-node selected-rect-bottom" :data-rect-index="index"></i>
            <i class="selected-rect-node selected-rect-bottom-left" :data-rect-index="index"></i>
            <i class="selected-rect-node selected-rect-left" :data-rect-index="index"></i>

            <slot name="selected" :rect="rect" :index="index"></slot>
        </div>
    </div>
</template>

<script>
import 'vue-awesome/icons/close';
import { cloneDeep, clone, isString, includes, find } from 'lodash';
import drag from './drag';

export default {
    name: 'DragSelect',
    directives: {
        drag
    },
    props: {
        rectList: {
            type: Array,
            default() {
                return [];
            }
        }
    },
    data() {
        return {
            localRectList: cloneDeep(this.rectList),
            realRectList: cloneDeep(this.rectList),
            draggingIndex: -1
        };
    },
    watch: {
        rectList(value) {
            this.localRectList = cloneDeep(value);
            this.realRectList = cloneDeep(value);
        }
    },
    created() {
        let currentRect;
        let isDragging = false;
        let dragType;
        let startX;
        let startY;
        let startWidth;
        let startHeight;
        this.$on('dragstart', ({ event }) => {
            const target = event.target;

            // 拖拽有三种大的情况：
            // 1、鼠标在mask上面触发拖拽开始事件，就认为是要新建矩形区域了；
            // 2、鼠标在锚点上触发拖拽开始时间，此时的拖拽主要是改变矩形区域的大小；
            // 3、鼠标在矩形区域内部触发拖拽，此时的拖拽主要是改变矩形区域的位置。
            //
            // 其中，第二种情况又可以细分为八种小情况，分别对应八个锚点。
            //
            // dragType变量标识了拖拽的类型（情况）
            if (target.tagName.toLowerCase() === 'i') {
                dragType = target.className.match(/selected-rect-(top|top-right|top-left|right|bottom-right|bottom|bottom-left|left)/)[1];
                this.draggingIndex = parseInt(target.getAttribute('data-rect-index'), 10);
                isDragging = true;
                currentRect = clone(this.localRectList[this.draggingIndex]);
                startX = currentRect.left;
                startY = currentRect.top;
                startWidth = currentRect.width;
                startHeight = currentRect.height;
            } else if (target === this.$refs.mask) {
                isDragging = true;
                currentRect = {};
                currentRect.top = (event.clientY - this.$el.offsetTop)
                    + this.$el.parentNode.scrollTop;
                currentRect.left = (event.clientX - this.$el.offsetLeft)
                    + this.$el.parentNode.scrollLeft;
                this.addRect(currentRect);

                this.draggingIndex = this.localRectList.length - 1;
            } else if (
                isString(target.className)
                && includes(target.className.split(/\s+/), 'selected-rect')
            ) {
                this.draggingIndex = parseInt(target.getAttribute('data-rect-index'), 10);
                isDragging = true;
                currentRect = clone(this.localRectList[this.draggingIndex]);
                startX = currentRect.left;
                startY = currentRect.top;
                startWidth = currentRect.width;
                startHeight = currentRect.height;
                dragType = 'move';
            }
        });
        this.$on('drag', ({ distanceX, distanceY }) => {
            if (!isDragging) {
                return;
            }

            let newTop = startY || currentRect.top;
            let newLeft = startX || currentRect.left;
            let newWidth = startWidth || currentRect.width || 0;
            let newHeight = startHeight || currentRect.height || 0;
            switch (dragType) {
                case 'top': {
                    newTop = startY + distanceY;
                    newHeight = startHeight - distanceY;
                    break;
                }
                case 'right': {
                    newWidth = startWidth + distanceX;
                    break;
                }
                case 'bottom': {
                    newHeight = startHeight + distanceY;
                    break;
                }
                case 'left': {
                    newLeft = startX + distanceX;
                    newWidth = startWidth - distanceX;
                    break;
                }
                case 'top-right': {
                    newTop = startY + distanceY;
                    newHeight = startHeight - distanceY;
                    newWidth = startWidth + distanceX;
                    break;
                }
                case 'bottom-right': {
                    newHeight = startHeight + distanceY;
                    newWidth = startWidth + distanceX;
                    break;
                }
                case 'bottom-left': {
                    newHeight = startHeight + distanceY;
                    newLeft = startX + distanceX;
                    newWidth = startWidth - distanceX;
                    break;
                }
                case 'top-left': {
                    newTop = startY + distanceY;
                    newHeight = startHeight - distanceY;
                    newLeft = startX + distanceX;
                    newWidth = startWidth - distanceX;
                    break;
                }
                case 'move': {
                    newTop = startY + distanceY;
                    newLeft = startX + distanceX;
                    break;
                }
                default: {
                    newWidth = distanceX;
                    newHeight = distanceY;
                }
            }

            // 边界检查
            const containerWidth = this.$el.offsetWidth;
            if (newLeft >= 0 && newLeft + newWidth <= containerWidth) {
                currentRect.left = newLeft;
                currentRect.width = newWidth;
            } else if (newLeft < 0) {
                currentRect.left = 0;
            } else if (includes(['top-right', 'right', 'bottom-right'], dragType) || !dragType) {
                currentRect.width = containerWidth - newLeft;
            } else if (dragType === 'move') {
                currentRect.left = containerWidth - currentRect.width;
            }

            const containerHeight = this.$el.offsetHeight;
            if (newTop >= 0 && newTop + newHeight <= containerHeight) {
                currentRect.top = newTop;
                currentRect.height = newHeight;
            } else if (newTop < 0) {
                currentRect.top = 0;
            } else if (includes(['bottom-left', 'bottom', 'bottom-right'], dragType) || !dragType) {
                currentRect.height = containerHeight - newTop;
            } else if (dragType === 'move') {
                currentRect.top = containerHeight - currentRect.height;
            }

            this.setRect(this.localRectList, this.draggingIndex, currentRect);
        });
        this.$on('dragend', () => {
            if (!isDragging) {
                return;
            }

            isDragging = false;

            // 如果有碰撞，那么最终拖拽的矩形区域设为拖拽过程中第一次没有碰撞的区域
            // 检查是否存在碰撞的矩形区域
            const collisionRect = find(
                this.localRectList,
                (localRect, index) =>
                    index !== this.draggingIndex
                        && this.checkCollision(currentRect, localRect)
            );

            // 发生了碰撞
            if (collisionRect) {
                this.setRect(
                    this.localRectList,
                    this.draggingIndex,
                    this.realRectList[this.draggingIndex]
                );
            } else {
                this.setRect(this.realRectList, this.draggingIndex, currentRect);
            }
            this.$emit('update:rectList', this.realRectList);

            this.draggingIndex = -1;
            currentRect = null;
            dragType = null;
            startX = null;
            startY = null;
            startWidth = null;
            startHeight = null;
        });
    },
    methods: {
        setRect(rectList, index, rect) {
            rectList.splice(index, 1, clone(rect));
        },
        addRect(rect) {
            this.localRectList.push(clone(rect));
            this.realRectList.push(clone(rect));
            this.$emit('update:rectList', this.realRectList);
        },
        removeRect(index) {
            this.localRectList.splice(index, 1);
            this.realRectList.splice(index, 1);
            this.$emit('update:rectList', this.realRectList);
        },
        checkCollision(rect, otherRect) {
            const isHorizonCrash = rect.left + rect.width >= otherRect.left
                && rect.left <= otherRect.left + otherRect.width;
            const isVerticalCrash = rect.top + rect.height >= otherRect.top
                && rect.top <= otherRect.top + otherRect.height;

            return isHorizonCrash && isVerticalCrash;
        }
    },
    filters: {
        rectToStyle(rect) {
            return {
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                transform: `translate(${rect.left}px,${rect.top}px)`
            };
        }
    }
};
</script>

<style lang="scss">
@import "../css/variables";

.drag-select {
    position: relative;

    &-mask {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #000;
        opacity: .3;
    }

    .real-selected-rect {
        position: absolute;
        top: 0;
        left: 0;
        border: 1px dashed $kaiy-dark-blue;
        background-repeat: no-repeat;
        box-sizing: border-box;
    }
    .selected-rect {
        position: absolute;
        top: 0;
        left: 0;
        border: 1px dashed $kaiy-dark-blue;
        box-sizing: border-box;

        &.collision-target,
        &.collision-dragging {
            border-color: #f00;
        }

        &-close {
            width: 24px;
            height: 24px;
            line-height: 24px;
            box-sizing: border-box;
            text-align: center;
            position: absolute;
            right: -1px;
            top: -25px;
            cursor: pointer;
            background: $kaiy-dark-blue;
            color: #fff;
            opacity: .8;
            padding-top: 3px;
            display: none;
        }

        &:hover .selected-rect-close {
            display: block;
        }

        &-node {
            position: absolute;
            width: 10px;
            height: 10px;
            border-radius: 5px;
            box-sizing: border-box;
            background: #fff;
            border: 1px solid $kaiy-dark-blue;
            display: none;

            &:hover {
                cursor: default;
            }
        }
        &-top,
        &-top-left,
        &-top-right {
            top: -5px;
        }
        &-bottom,
        &-bottom-left,
        &-bottom-right {
            bottom: -5px;
        }
        &-top-right,
        &-right,
        &-bottom-right {
            right: -5px;
        }
        &-top-left,
        &-left,
        &-bottom-left {
            left: -5px;
        }
        &-top,
        &-bottom {
            left: 50%;
            margin-left: -5px;
        }
        &-left,
        &-right {
            top: 50%;
            margin-top: -5px;
        }
        &:hover i,
        &.dragging i {
            display: block;
        }

        &:hover {
            cursor: move;
        }

        &-fake {
            position: relative;
            width: 100%;
            height: 100%;
        }
    }
}
</style>
