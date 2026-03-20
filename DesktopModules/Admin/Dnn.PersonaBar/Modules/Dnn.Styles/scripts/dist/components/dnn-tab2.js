import { proxyCustomElement, HTMLElement, h, Host } from '@stencil/core/internal/client';

const dnnTabCss = "";

const DnnTab = /*@__PURE__*/ proxyCustomElement(class DnnTab extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.visible = false;
    }
    /** Shows the tab. */
    async show() {
        this.visible = true;
    }
    /** Hides the modal */
    async hide() {
        this.visible = false;
    }
    render() {
        return (h(Host, { key: 'f1753017740f4972aa6a05c603a0263543e28f21' }, this.visible &&
            h("slot", { key: '9da17b18540dab0ce7a0f23aebe00e488ee64539' })));
    }
    static get style() { return dnnTabCss; }
}, [257, "dnn-tab", {
        "tabTitle": [1, "tab-title"],
        "visible": [32],
        "show": [64],
        "hide": [64]
    }]);
function defineCustomElement() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-tab"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-tab":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnTab);
            }
            break;
    } });
}

export { DnnTab as D, defineCustomElement as d };
//# sourceMappingURL=dnn-tab2.js.map

//# sourceMappingURL=dnn-tab2.js.map