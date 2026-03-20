import { proxyCustomElement, HTMLElement, createEvent, h, Host } from '@stencil/core/internal/client';
import { a as generateRandomId } from './stringUtilities.js';
import { d as defineCustomElement$2 } from './dnn-fieldset2.js';

const dnnSelectCss = ":host{display:inline-block;--foreground-color:var(--dnn-color-foreground, #000);--background-color:var(--dnn-color-background, #fff);--focus-color:var(--dnn-color-primary, #3792ED);--danger-color:var(--dnn-color-danger, #900);--control-radius:var(--dnn-controls-radius, 3px);--input-text-align:left}dnn-fieldset{width:100%}.inner-container{display:flex;justify-content:space-between;position:relative;width:100%;background-color:var(--background-color)}select{border:none;outline:none;background-color:var(--background-color);color:var(--foreground-color);text-align:var(--input-text-align);width:100%;cursor:pointer}.prefix,.suffix{font-size:0.8em}svg.error{fill:red;width:1em;height:1em;transform:scale(1.5)}dnn-fieldset{--fieldset-foreground-color:var(--foreground-color);--fieldset-background-color:var(--background-color);--fieldset-focus-color:var(--focus-color);--fieldset-danger-color:var(--danger-color);--fieldset-control-radius:var(--control-radius)}";

const DnnSelect$1 = /*@__PURE__*/ proxyCustomElement(class DnnSelect extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.valueChange = createEvent(this, "valueChange", 7);
        this.internals = this.attachInternals();
        /** Defines the type of automatic completion the browser can use.
         * See https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
         */
        this.autocomplete = "off";
        /** The value of the input. */
        this.value = "";
        this.focused = false;
        this.valid = true;
    }
    /** Reports the input validity details. See https://developer.mozilla.org/en-US/docs/Web/API/ValidityState */
    async checkValidity() {
        var validity = this.select.checkValidity();
        if (!validity) {
            this.fieldset.setValidity(false, this.select.validationMessage);
        }
        return this.select.validity;
    }
    componentWillLoad() {
        this.labelId = generateRandomId();
        this.observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    this.applySlottedItemsToSelect();
                }
            }
        });
        const config = { attributes: true, childList: true, subtree: true };
        this.observer.observe(this.el, config);
    }
    componentDidLoad() {
        requestAnimationFrame(() => {
            this.applySlottedItemsToSelect();
            // Initialize value based on the "selected" attribute of slotted options
            const slottedItems = this.el.querySelectorAll('option');
            const selectedOption = Array.from(slottedItems).find(option => option.hasAttribute('selected'));
            if (selectedOption) {
                this.value = selectedOption.getAttribute('value') || selectedOption.textContent || '';
            }
            else if (slottedItems.length > 0) {
                this.value = slottedItems[0].getAttribute('value') || slottedItems[0].textContent || '';
            }
            // Set the original value for form reset
            this.originalValue = this.value;
            var validity = this.select.validity;
            var validityMessage = validity.valid ? "" : this.select.validationMessage;
            this.internals.setValidity(this.select.validity, validityMessage);
            this.setFormValue();
        });
    }
    formResetCallback() {
        this.internals.setValidity({});
        this.value = this.originalValue;
        this.internals.setFormValue("");
        this.select.selectedIndex = -1;
    }
    applySlottedItemsToSelect() {
        var _a;
        const slottedItems = (_a = this.slot) === null || _a === void 0 ? void 0 : _a.assignedElements();
        slottedItems === null || slottedItems === void 0 ? void 0 : slottedItems.forEach((item) => {
            if (item.nodeName === "OPTION") {
                const optionElement = item;
                this.select.appendChild(optionElement);
            }
        });
    }
    setFormValue() {
        if (this.name != undefined) {
            var data = new FormData();
            data.append(this.name, this.value);
            this.internals.setFormValue(data);
        }
    }
    handleChange(value) {
        this.value = value;
        var valid = this.select.checkValidity();
        this.valid = valid;
        this.valueChange.emit(this.value);
        this.setFormValue();
        if (this.valid) {
            this.internals.setValidity({});
            this.fieldset.setValidity(true);
        }
        else {
            this.internals.setValidity({ customError: true }, this.select.validationMessage);
            this.fieldset.setValidity(false, this.select.validationMessage);
        }
    }
    handleInvalid() {
        this.valid = false;
        if (this.customValidityMessage == undefined) {
            this.customValidityMessage = this.select.validationMessage;
        }
    }
    handleBlur() {
        this.focused = false;
        var validity = this.select.checkValidity();
        this.valid = validity;
        this.fieldset.setValidity(validity, this.select.validationMessage);
        this.internals.setValidity(this.select.validity, this.select.validationMessage);
    }
    render() {
        var _a;
        return (h(Host, { key: '9a06de24df8409118d3e43bee181cd7f5becd0e7', tabIndex: this.focused ? -1 : 0, onFocus: () => this.select.focus(), onBlur: () => this.select.blur() }, h("dnn-fieldset", { key: 'd655375b6921a00e92238cd75cfaa99dd1cf92c2', invalid: !this.valid, focused: this.focused, label: `${(_a = this.label) !== null && _a !== void 0 ? _a : ""}${this.required ? " *" : ""}`, helpText: this.helpText, id: this.labelId, onClick: () => !this.focused && this.select.focus(), ref: el => this.fieldset = el }, h("div", { key: '81452cbd3aa519987afd370bdb42fae734a5c813', class: "inner-container" }, h("select", { key: 'b23cd83de8bc9c398a530e8609e2bc497f045c39', ref: el => this.select = el, autoComplete: this.autocomplete, onFocus: () => this.focused = true, onBlur: () => this.handleBlur(), onChange: e => this.handleChange(e.target.value), onInvalid: () => this.handleInvalid(), required: this.required, disabled: this.disabled, "aria-labelledby": this.labelId }, h("slot", { key: '0bfa355c48c24fb702c9e5ca3fb83eedddf4fb56', ref: el => this.slot = el })), !this.valid &&
            h("svg", { key: '94c30242f40bc2b8201eae203b86e9f37aba6c9b', xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960", class: "error" }, h("path", { key: '4ec2609d531fc24062f360df8c65959ea9aea79c', d: "M479.982-280q14.018 0 23.518-9.482 9.5-9.483 9.5-23.5 0-14.018-9.482-23.518-9.483-9.5-23.5-9.5-14.018 0-23.518 9.482-9.5 9.483-9.5 23.5 0 14.018 9.482 23.518 9.483 9.5 23.5 9.5ZM453-433h60v-253h-60v253Zm27.266 353q-82.734 0-155.5-31.5t-127.266-86q-54.5-54.5-86-127.341Q80-397.681 80-480.5q0-82.819 31.5-155.659Q143-709 197.5-763t127.341-85.5Q397.681-880 480.5-880q82.819 0 155.659 31.5Q709-817 763-763t85.5 127Q880-563 880-480.266q0 82.734-31.5 155.5T763-197.684q-54 54.316-127 86Q563-80 480.266-80Zm.234-60Q622-140 721-239.5t99-241Q820-622 721.188-721 622.375-820 480-820q-141 0-240.5 98.812Q140-622.375 140-480q0 141 99.5 240.5t241 99.5Zm-.5-340Z" }))))));
    }
    static get formAssociated() { return true; }
    get el() { return this; }
    static get style() { return dnnSelectCss; }
}, [321, "dnn-select", {
        "label": [1],
        "name": [1],
        "required": [4],
        "helpText": [1, "help-text"],
        "disabled": [4],
        "autocomplete": [1],
        "value": [1537],
        "focused": [32],
        "valid": [32],
        "customValidityMessage": [32],
        "checkValidity": [64]
    }]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-select", "dnn-fieldset"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-select":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnSelect$1);
            }
            break;
        case "dnn-fieldset":
            if (!customElements.get(tagName)) {
                defineCustomElement$2();
            }
            break;
    } });
}

const DnnSelect = DnnSelect$1;
const defineCustomElement = defineCustomElement$1;

export { DnnSelect, defineCustomElement };
//# sourceMappingURL=dnn-select.js.map

//# sourceMappingURL=dnn-select.js.map