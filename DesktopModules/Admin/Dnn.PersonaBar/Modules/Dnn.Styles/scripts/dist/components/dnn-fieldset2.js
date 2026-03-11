import { proxyCustomElement, HTMLElement, h, Host } from '@stencil/core/internal/client';

const dnnFieldsetCss = ":host{display:inline-block;--fieldset-foreground-color:var(--dnn-color-foreground, #000);--fieldset-background-color:var(--dnn-color-background, #fff);--fieldset-focus-color:var(--dnn-color-primary, #3792ED);--fieldset-danger-color:var(--dnn-color-danger, #900);--fieldset-control-radius:var(--dnn-controls-radius, 3px)}.container{border:1px solid var(--fieldset-foreground-color, #000);border-radius:var(--fieldset-control-radius, 3px);padding:0.75em;display:flex;justify-content:space-between;gap:0.1em;position:relative;background-color:var(--fieldset-background-color);margin-top:1em;line-height:1em}.container .resizer{width:100%}.container .inner-container{position:relative;width:100%;background-color:var(--fieldset-background-color);height:calc(100% - 1em)}.container label{display:inline-flex;position:absolute;opacity:1;transition:all 150ms ease-in-out;left:0.5em;top:-1.5em;padding:0 0.5em;background-color:var(--fieldset-background-color);white-space:nowrap;max-width:100%;border-radius:var(--fieldset-control-radius);font-size:1em;margin-top:1em;z-index:1;pointer-events:none;line-height:1em}.container.focused{border:1px solid var(--fieldset-focus-color);box-shadow:0 0 0 1px var(--fieldset-focus-color)}.container.focused.invalid{border:1px solid var(--fieldset-danger-color);box-shadow:0 0 0 1px var(--fieldset-danger-color)}.container.focused input{color:var(--fieldset-foreground-color, #000)}.container.float-label label{opacity:0.6;left:0;top:calc(50% - 0.5em);margin-top:0}.container.disabled{opacity:0.5}.container.invalid{border-color:var(--fieldset-danger-color)}.help-text,.error-message{font-style:italic;opacity:0.7;font-size:0.8em;margin:0.25em}.error-message{color:var(--fieldset-danger-color);font-style:normal;font-weight:bold}";

const DnnFieldset = /*@__PURE__*/ proxyCustomElement(class DnnFieldset extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        /** Can be set to specify if the fieldset can be resized by the user. */
        this.resizable = "none";
    }
    /** Sets the fieldset to the focused state. */
    async setFocused() {
        this.focused = true;
    }
    /** Unsets the fieldset focused state. */
    async setBlurred() {
        this.focused = false;
    }
    /** Sets the fieldset to a disabled state. */
    async disable() {
        this.disabled = true;
    }
    /** Sets the fieldset to an enabled state. */
    async enable() {
        this.disabled = false;
    }
    /** Places the label on the top of the container. */
    async pinLabel() {
        this.floatLabel = false;
    }
    /** Places the label in the vertical middle of the container. */
    async unpinLabel() {
        this.floatLabel = true;
    }
    /** Sets the validity of the field. */
    async setValidity(valid, message) {
        this.invalid = !valid;
        this.customValidityMessage = message;
    }
    getContainerClasses() {
        const classes = ["container"];
        if (this.focused) {
            classes.push("focused");
        }
        if (this.disabled) {
            classes.push("disabled");
        }
        if (this.invalid) {
            classes.push("invalid");
        }
        if (this.floatLabel && !this.focused) {
            classes.push("float-label");
        }
        return classes.join(" ");
    }
    render() {
        return (h(Host, { key: 'fe8ba6fbc3b6e61eed3b709ba20a8f669cbc74e4' }, h("div", { key: '336493d5afce0324edbcad1f3687dfdd474a3cc4', class: this.getContainerClasses() }, this.label &&
            h("label", { key: '6e69b3b52fcb975168f820c466dc6398410ca5e0' }, h("slot", { key: '70062926cad1a279981162fc13051ce676aea58e', name: "label-prefix" }), this.label, h("slot", { key: '729cb660ab4ece9985d62b579d1a7c0fe6c81c1a', name: "label-suffix" })), h("div", { key: '57f44330a0a71706f324f84bad17b949827395de', class: "resizer", style: { resize: this.resizable, overflow: this.resizable == "none" ? "visible" : "auto" } }, h("div", { key: '5aa38e2dd1e6a37656f27f8ab4f44ee7ac8ef68b', class: "inner-container" }, h("slot", { key: 'd74472bef8497f13887912187e171531ac9aba65' })))), this.invalid && this.customValidityMessage &&
            h("div", { key: '7ad7002b2475eccd52f5c50765c28e618e6f803e', class: "error-message" }, this.customValidityMessage), !this.invalid &&
            h("div", { key: 'e19f234a8b3747c8188b4d23b13da47362b5875c', class: "help-text" }, this.helpText)));
    }
    static get style() { return dnnFieldsetCss; }
}, [257, "dnn-fieldset", {
        "focused": [1540],
        "disabled": [1540],
        "invalid": [1540],
        "label": [1],
        "floatLabel": [1540, "float-label"],
        "helpText": [1, "help-text"],
        "resizable": [1],
        "customValidityMessage": [32],
        "setFocused": [64],
        "setBlurred": [64],
        "disable": [64],
        "enable": [64],
        "pinLabel": [64],
        "unpinLabel": [64],
        "setValidity": [64]
    }]);
function defineCustomElement() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-fieldset"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-fieldset":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnFieldset);
            }
            break;
    } });
}

export { DnnFieldset as D, defineCustomElement as d };
//# sourceMappingURL=dnn-fieldset2.js.map

//# sourceMappingURL=dnn-fieldset2.js.map