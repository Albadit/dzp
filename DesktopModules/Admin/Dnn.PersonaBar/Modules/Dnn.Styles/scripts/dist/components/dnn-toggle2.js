import { proxyCustomElement, HTMLElement, createEvent, h, Host } from '@stencil/core/internal/client';

const dnnToggleCss = ":host{display:inline-block;outline:none;cursor:pointer}button{height:1.5em;width:2.5em;outline:none;background-color:var(--background, #888);border:0;border-radius:var(--border-radius, var(--dnn-controls-radius, 0.75em));padding:0.1em;position:relative;margin:0;transition:background-color 300ms ease-in-out;position:relative;cursor:pointer}button:hover,button:focus-visible{box-shadow:0 0 2px 2px var(--dnn-color-primary)}button.checked{background-color:var(--background-checked, var(--dnn-color-primary, blue))}button.checked .handle{left:calc(1em + 4px)}button:disabled{opacity:0.5;cursor:not-allowed;box-shadow:none}button .handle{transition:all 300ms ease-in-out;background-color:white;width:1em;height:1em;border-radius:var(--handle-border-radius, var(--dnn-controls-radius, 50%));position:absolute;top:calc(50% - 0.5em);left:2px}";

const DnnToggle = /*@__PURE__*/ proxyCustomElement(class DnnToggle extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.checkChanged = createEvent(this, "checkChanged", 7);
        this.internals = this.attachInternals();
        /** If 'true' the toggle is checked (on). */
        this.checked = false;
        /** If 'true' the toggle is not be interacted with. */
        this.disabled = false;
        /** The value to post when used in forms. */
        this.value = "on";
        this.focused = false;
    }
    handleClick() {
        this.checked = !this.checked;
    }
    checkedChanged(newValue) {
        this.checkChanged.emit({ checked: newValue });
        this.setFormValue();
    }
    componentWillLoad() {
        this.originalChecked = this.checked;
        this.setFormValue();
    }
    formResetCallback() {
        this.internals.setValidity({});
        this.checked = this.originalChecked;
    }
    setFormValue() {
        if (this.name != undefined && this.name.length > 0) {
            if (this.checked) {
                var data = new FormData();
                data.append(this.name, this.value);
                this.internals.setFormValue(data);
            }
            else {
                this.internals.setFormValue("");
            }
        }
    }
    render() {
        return (h(Host, { key: '3cc6ae98b11d5aa5db0b065d5ac998e24cbf81c4', tabIndex: this.focused ? -1 : 0, onFocus: () => this.button.focus(), onBlur: () => this.button.blur() }, h("button", { key: '59ad3d27c67052057e0718bfc54d143b3fe8e5a9', ref: el => this.button = el, disabled: this.disabled, class: { 'checked': this.checked }, onFocus: () => this.focused = true, onBlur: () => this.focused = false }, h("div", { key: 'a7eab538b67034a917f9bd4040a724b39de02dfc', class: "handle" }))));
    }
    static get formAssociated() { return true; }
    get element() { return this; }
    static get watchers() { return {
        "checked": ["checkedChanged"]
    }; }
    static get style() { return dnnToggleCss; }
}, [321, "dnn-toggle", {
        "checked": [1028],
        "disabled": [4],
        "name": [1],
        "value": [1],
        "focused": [32]
    }, [[2, "click", "handleClick"]], {
        "checked": ["checkedChanged"]
    }]);
function defineCustomElement() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-toggle"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-toggle":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnToggle);
            }
            break;
    } });
}

export { DnnToggle as D, defineCustomElement as d };
//# sourceMappingURL=dnn-toggle2.js.map

//# sourceMappingURL=dnn-toggle2.js.map