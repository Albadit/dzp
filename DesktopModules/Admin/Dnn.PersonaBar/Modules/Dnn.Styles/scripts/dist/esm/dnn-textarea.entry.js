import { r as registerInstance, c as createEvent, h, H as Host } from './index-BokBNxfI.js';
import { g as generateRandomId } from './stringUtilities-D7CP7b6z.js';

const dnnTextareaCss = ":host{display:inline-block;--foreground-color:var(--dnn-color-foreground, #000);--background-color:var(--dnn-color-background, #fff);--focus-color:var(--dnn-color-primary, #3792ED);--danger-color:var(--dnn-color-danger, #900);--control-radius:var(--dnn-controls-radius, 3px)}dnn-fieldset{width:100%}textarea{border:none;outline:none;background-color:transparent;color:var(--foreground-color);width:calc(100% - 1em);height:calc(100% - 1em);line-height:1.5em;resize:none}dnn-fieldset{--fieldset-foreground-color:var(--foreground-color);--fieldset-background-color:var(--background-color);--fieldset-focus-color:var(--focus-color);--fieldset-danger-color:var(--danger-color);--fieldset-control-radius:var(--control-radius)}svg.error{fill:red;width:1em;height:1em;transform:scale(1.5);position:absolute;right:0.5rem;top:0.5rem}";

const DnnTextarea = class {
    constructor(hostRef) {
        registerInstance(this, hostRef);
        this.valueInput = createEvent(this, "valueInput", 7);
        this.valueChange = createEvent(this, "valueChange", 7);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
        /** Can be set to change how the user can resize the field. */
        this.resizable = "block";
        /** Sets the value of the textarea. */
        this.value = "";
        /** Defines the type of auto-completion to use for this field, see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete. */
        this.autocomplete = "off";
        /** Defines how many rows (lines of text) to initially show. */
        this.rows = 3;
        this.focused = false;
        this.valid = true;
    }
    /** Reports the input validity details. See https://developer.mozilla.org/en-US/docs/Web/API/ValidityState */
    async checkValidity() {
        var validity = this.textarea.checkValidity();
        if (!validity) {
            this.fieldset.setValidity(false, this.textarea.validationMessage);
        }
        return this.textarea.validity;
    }
    /** Can be used to set a custom validity message. */
    async setCustomValidity(message) {
        if (message == undefined || message == "") {
            this.textarea.setCustomValidity("");
            this.valid = true;
            this.fieldset.setValidity(true);
            return;
        }
        this.customValidityMessage = message;
        this.valid = false;
        this.textarea.setCustomValidity(message);
    }
    componentWillLoad() {
        this.labelId = generateRandomId();
    }
    componentDidLoad() {
        this.textarea.style.minHeight = `${this.rows * 1.5}em`;
    }
    formResetCallback() {
        this.textarea.setCustomValidity("");
        this.valid = true;
        this.value = "";
        this.internals.setValidity({});
        this.internals.setFormValue("");
    }
    handleInput(value) {
        this.value = value;
        var valid = this.textarea.checkValidity();
        this.valid = valid;
        this.valueInput.emit(this.value);
    }
    handleInvalid() {
        this.valid = false; // Ensure the valid state is updated
        if (this.customValidityMessage == undefined) {
            this.customValidityMessage = this.textarea.validationMessage;
        }
        this.fieldset.setValidity(false, this.textarea.validationMessage);
        this.internals.setValidity(this.textarea.validity, this.textarea.validationMessage);
    }
    handleChange() {
        var _a, _b;
        this.valueChange.emit(this.value);
        if (this.name != undefined) {
            var data = new FormData();
            data.append(this.name, (_b = (_a = this.value) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "");
            this.internals.setFormValue(data);
        }
    }
    shouldLabelFloat() {
        if (this.focused) {
            return false;
        }
        if (this.value != undefined && this.value != "") {
            return false;
        }
        return true;
    }
    render() {
        var _a;
        return (h(Host, { key: 'a8354021dd87e1e8688d44609690e8fd67f6cd02', tabIndex: this.focused ? -1 : 0, onFocus: () => this.textarea.focus(), onBlur: () => this.textarea.blur() }, h("dnn-fieldset", { key: '802782779e7e30428548a50116daf62ea1096b8b', ref: el => this.fieldset = el, invalid: !this.valid, focused: this.focused, resizable: this.resizable, label: `${(_a = this.label) !== null && _a !== void 0 ? _a : ""}${this.required ? " *" : ""}`, helpText: this.helpText, disabled: this.disabled, id: this.labelId, floatLabel: this.shouldLabelFloat(), onClick: () => !this.focused && this.textarea.focus() }, h("textarea", { key: '6ed50178260427c933ae1a83d5e3731e63f164fd', ref: el => this.textarea = el, name: this.name, value: this.value, required: this.required, onBlur: () => this.focused = false, onFocus: () => this.focused = true, onChange: () => this.handleChange(), onInput: e => this.handleInput(e.target.value), onInvalid: () => this.handleInvalid(), disabled: this.disabled, autoComplete: this.autocomplete, minlength: this.minlength, maxlength: this.maxlength, readonly: this.readonly, "aria-labelledby": this.labelId, rows: this.rows }), !this.valid &&
            h("svg", { key: '0bbaad7891f76d7c83205799d8aa8b2be6eb7eeb', xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960", class: "error" }, h("path", { key: '4bf589951c12c92c12c51a881f34eabf1b1c5179', d: "M479.982-280q14.018 0 23.518-9.482 9.5-9.483 9.5-23.5 0-14.018-9.482-23.518-9.483-9.5-23.5-9.5-14.018 0-23.518 9.482-9.5 9.483-9.5 23.5 0 14.018 9.482 23.518 9.483 9.5 23.5 9.5ZM453-433h60v-253h-60v253Zm27.266 353q-82.734 0-155.5-31.5t-127.266-86q-54.5-54.5-86-127.341Q80-397.681 80-480.5q0-82.819 31.5-155.659Q143-709 197.5-763t127.341-85.5Q397.681-880 480.5-880q82.819 0 155.659 31.5Q709-817 763-763t85.5 127Q880-563 880-480.266q0 82.734-31.5 155.5T763-197.684q-54 54.316-127 86Q563-80 480.266-80Zm.234-60Q622-140 721-239.5t99-241Q820-622 721.188-721 622.375-820 480-820q-141 0-240.5 98.812Q140-622.375 140-480q0 141 99.5 240.5t241 99.5Zm-.5-340Z" })))));
    }
    static get formAssociated() { return true; }
};
DnnTextarea.style = dnnTextareaCss;

export { DnnTextarea as dnn_textarea };
//# sourceMappingURL=dnn-textarea.entry.js.map
