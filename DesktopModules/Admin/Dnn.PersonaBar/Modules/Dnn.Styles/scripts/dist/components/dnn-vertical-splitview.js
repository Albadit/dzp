import { proxyCustomElement, HTMLElement, createEvent, h, Host } from '@stencil/core/internal/client';
import { g as getMovementFromEvent } from './mouseUtilities.js';

const dnnVerticalSplitviewCss = ":host{display:flex;align-items:stretch;margin:0 auto;position:relative;--left-pane-background-color:transparent;--right-pane-background-color:transparent}button{border:none;margin:0;padding:0;cursor:ew-resize;position:absolute;height:100%;background-color:transparent}button.transition{transition:all 300ms ease-in-out}.pane{overflow-y:auto}.pane.transition{transition:all 300ms ease-in-out}.pane.left{background-color:var(--left-pane-background-color)}.pane.right{background-color:var(--right-pane-background-color);flex-grow:1}";

const DnnVerticalSplitview$1 = /*@__PURE__*/ proxyCustomElement(class DnnVerticalSplitview extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.widthChanged = createEvent(this, "widthChanged", 7);
        /** The width of the splitter area. */
        this.splitterWidth = 16;
        /** The percentage position of the splitter in the container. */
        this.splitWidthPercentage = 30;
        this.leftWidth = 0;
        this.rightWidth = 0;
    }
    /** Sets the width percentage of the divider */
    async setSplitWidthPercentage(newWidth) {
        const panes = this.element.shadowRoot.querySelectorAll(".pane");
        requestAnimationFrame(() => {
            panes.forEach(pane => pane.classList.add("transition"));
            this.splitter.classList.add("transition");
            requestAnimationFrame(() => {
                const fullWidth = this.element.getBoundingClientRect().width;
                let newLeft = fullWidth * newWidth / 100;
                if (newLeft < 0) {
                    newLeft = 0;
                }
                if (newLeft > fullWidth) {
                    newLeft = fullWidth;
                }
                this.leftWidth = newLeft;
                this.rightWidth = fullWidth - newLeft;
                setTimeout(() => {
                    panes.forEach(pane => pane.classList.remove("transition"));
                    this.splitter.classList.remove("transition");
                }, 300);
            });
        });
    }
    /** Gets the current divider position percentage. */
    async getSplitWidthPercentage() {
        const fullWidth = this.element.getBoundingClientRect().width;
        return this.leftWidth / fullWidth;
    }
    componentDidLoad() {
        requestAnimationFrame(() => {
            this.resizeObserver = new ResizeObserver(() => {
                const fullWidth = this.element.getBoundingClientRect().width;
                this.leftWidth = fullWidth * this.splitWidthPercentage / 100;
                this.rightWidth = fullWidth - this.leftWidth;
                this.widthChanged.emit(this.splitWidthPercentage);
            });
            this.resizeObserver.observe(this.element);
        });
    }
    handleMouseDown(event) {
        event.preventDefault();
        const handleDrag = (ev) => {
            requestAnimationFrame(() => {
                let fullWidth = this.element.getBoundingClientRect().width;
                let { movementX } = getMovementFromEvent(ev, this.previousTouch);
                let newLeft = this.leftWidth + movementX;
                if (newLeft < 0) {
                    newLeft = 0;
                }
                if (newLeft > fullWidth) {
                    newLeft = fullWidth;
                }
                this.leftWidth = newLeft;
                this.rightWidth = fullWidth - newLeft;
                this.splitWidthPercentage = this.leftWidth / fullWidth * 100;
            });
        };
        const handleDragFinished = () => {
            document.removeEventListener("mousemove", handleDrag);
            document.removeEventListener("touchmove", handleDrag);
            const fullWidth = this.element.getBoundingClientRect().width;
            const newPercentage = this.leftWidth / fullWidth * 100;
            this.widthChanged.emit(newPercentage);
        };
        document.addEventListener("mouseup", handleDragFinished);
        document.addEventListener("touchend", handleDragFinished);
        document.addEventListener("mousemove", handleDrag);
        document.addEventListener("touchmove", handleDrag);
    }
    handleKeyDown(e) {
        let movementX = 0;
        switch (e.key) {
            case "ArrowLeft":
                movementX = -10;
                break;
            case "ArrowRight":
                movementX = 10;
                break;
            default:
                return;
        }
        if (e.shiftKey) {
            movementX = movementX * 10;
        }
        const fullWidth = this.element.getBoundingClientRect().width;
        let newLeft = this.leftWidth + movementX;
        if (newLeft < 0) {
            newLeft = 0;
        }
        if (newLeft > fullWidth) {
            newLeft = fullWidth;
        }
        this.leftWidth = newLeft;
        this.rightWidth = fullWidth - this.leftWidth;
    }
    render() {
        return (h(Host, { key: '973c2ce7e73ad5a85289742fbc763fd0d85ae778' }, h("div", { key: '05364ed25d82a0f9f24c5f6eb353779143c44a3d', class: "left pane", style: {
                width: `${this.leftWidth}px`,
            } }, h("slot", { key: 'd323a96a7a346a2ce460d9f059ad5903b10bac4a', name: "left" })), h("button", { key: '396549b3475dde05f990ee044937c19c831102d8', onMouseDown: e => this.handleMouseDown(e), onTouchStart: e => this.handleMouseDown(e), onKeyDown: e => this.handleKeyDown(e), ref: el => this.splitter = el, style: {
                minWidth: `${this.splitterWidth.toString()}px`,
                left: `${this.leftWidth - 2}px`,
            } }, h("slot", { key: '6b8c2671b8f2ccd559f3218631c3af252d1c41a1' })), h("div", { key: 'fbc6413754c4a90b562e7f329848a9d3650e41d4', class: "right pane", style: {
                width: `${this.rightWidth}px`,
            } }, h("slot", { key: 'ed0fea3f906ba6cf1b007c35788c0c3b362d2d0a', name: "right" }))));
    }
    get element() { return this; }
    static get style() { return dnnVerticalSplitviewCss; }
}, [257, "dnn-vertical-splitview", {
        "splitterWidth": [2, "splitter-width"],
        "splitWidthPercentage": [1026, "split-width-percentage"],
        "leftWidth": [32],
        "rightWidth": [32],
        "setSplitWidthPercentage": [64],
        "getSplitWidthPercentage": [64]
    }]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-vertical-splitview"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-vertical-splitview":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnVerticalSplitview$1);
            }
            break;
    } });
}

const DnnVerticalSplitview = DnnVerticalSplitview$1;
const defineCustomElement = defineCustomElement$1;

export { DnnVerticalSplitview, defineCustomElement };
//# sourceMappingURL=dnn-vertical-splitview.js.map

//# sourceMappingURL=dnn-vertical-splitview.js.map