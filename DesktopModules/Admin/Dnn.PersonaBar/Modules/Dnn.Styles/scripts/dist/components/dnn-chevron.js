import { proxyCustomElement, HTMLElement, createEvent, h, Host } from '@stencil/core/internal/client';

const dnnChevronCss = ":host{display:inline-block}button{cursor:pointer;border:none;padding:0px;margin:0px;min-width:15px;min-height:15px;display:flex;justify-content:center;align-items:center;background-color:transparent}svg{height:2em;width:2em;transition:all 300ms ease-in-out}button:focus-visible svg,button:hover svg{color:var(--dnn-color-primary)}:host([expanded]) svg{transform:rotate(90deg)}";

const DnnChevron$1 = /*@__PURE__*/ proxyCustomElement(class DnnChevron extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.changed = createEvent(this, "changed", 7);
        /** Expand text for screen readers */
        this.expandText = "expand";
        /** Collapse text for screen readers */
        this.collapseText = "collapse";
        /** Is the chevron expanded */
        this.expanded = false;
    }
    handleExpandedChanged(newValue) {
        this.changed.emit(newValue);
    }
    render() {
        return (h(Host, { key: 'c001180e714b5e803f196d4832ac9d7f77afe1dc', tabIndex: this.focused ? -1 : 0, onFocus: () => this.button.focus(), onBlur: () => this.button.blur() }, h("button", { key: '9fabb0018d815619edf0c38d6c41651a900e8115', ref: el => this.button = el, "aria-label": this.expanded ? this.collapseText : this.expandText, onClick: () => this.expanded = !this.expanded, onFocus: () => this.focused = true, onBlur: () => this.focused = false }, h("svg", { key: '8258366e1e45ded06aa6127ebe2cfb8ef66d509b', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { key: '9360e6ed6aa20d3b7aaa1d6162948319231d255e', d: "M0 0h24v24H0z", fill: "none" }), h("path", { key: 'c116570891918f909e50bc14e8a26fe00913c8be', d: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" })))));
    }
    static get watchers() { return {
        "expanded": ["handleExpandedChanged"]
    }; }
    static get style() { return dnnChevronCss; }
}, [257, "dnn-chevron", {
        "expandText": [1, "expand-text"],
        "collapseText": [1, "collapse-text"],
        "expanded": [1540],
        "focused": [32]
    }, undefined, {
        "expanded": ["handleExpandedChanged"]
    }]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-chevron"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-chevron":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnChevron$1);
            }
            break;
    } });
}

const DnnChevron = DnnChevron$1;
const defineCustomElement = defineCustomElement$1;

export { DnnChevron, defineCustomElement };
//# sourceMappingURL=dnn-chevron.js.map

//# sourceMappingURL=dnn-chevron.js.map