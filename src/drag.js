import { assign } from 'lodash';

export default {
    bind(el, { modifiers }, vnode) {
        const contextComponent = vnode.context;

        const dragData = {
            dragging: false,
            initX: 0,
            initY: 0,

            mousedownHandler(event) {
                const { clientX, clientY } = event;
                if (dragData.dragging) {
                    return;
                }

                dragData.dragging = true;
                dragData.initX = clientX;
                dragData.initY = clientY;
                contextComponent.$emit('dragstart', { event });

                function selectStartHandler(e) {
                    e.preventDefault();
                }

                function mouseMoveHandler(evt) {
                    const { clientX: cx, clientY: cy } = evt;
                    if (!dragData.dragging) {
                        return;
                    }

                    contextComponent.$emit('drag', {
                        distanceX: cx - dragData.initX,
                        distanceY: cy - dragData.initY,
                        event: evt
                    });
                }

                function mouseupHandler(evt) {
                    dragData.dragging = false;
                    contextComponent.$emit('dragend', { event: evt });
                    window.removeEventListener('mousemove', mouseMoveHandler);
                    window.removeEventListener('mouseup', mouseupHandler);
                    window.removeEventListener('selectstart', selectStartHandler);
                }

                // TODO: 非IE下面不用移除选区
                document.getSelection().removeAllRanges();
                window.addEventListener('selectstart', selectStartHandler);

                window.addEventListener('mousemove', mouseMoveHandler);
                window.addEventListener('mouseup', mouseupHandler);
            }
        };

        el.addEventListener('mousedown', dragData.mousedownHandler);
        assign(el, {
            dragData
        });
    },
    unbind(el) {
        const dragData = el.dragData;
        el.removeEventListener('mousedown', dragData.mousedownHandler);
        assign(el, {
            dragData: null
        });
    }
};
