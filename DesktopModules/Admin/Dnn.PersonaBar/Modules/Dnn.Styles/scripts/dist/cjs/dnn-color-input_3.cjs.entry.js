'use strict';

var index = require('./index-CoZy11qT.js');
var stringUtilities = require('./stringUtilities-B05yL9oU.js');

const dnnColorInputCss = ":host{display:inline-block;--foreground-color:var(--dnn-color-foreground, #000);--background-color:var(--dnn-color-background, #fff);--focus-color:var(--dnn-color-primary, #3792ED);--control-radius:var(--dnn-controls-radius, 3px);--contast-text-align:left}dnn-fieldset{width:100%}.inner-container{display:flex;justify-content:space-between;position:relative;width:100%;background-color:var(--background-color)}button{margin:0 0 0 1em;padding:0;border:none;background-color:transparent;width:1em;height:1em}button svg{fill:var(--dnn-color-primary);transform:scale(1.5)}.color-preview{min-height:1em;min-width:10em;display:flex;width:100%;position:relative}.color-preview>div{flex:1}.color-preview .contrast{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;justify-content:space-around;align-items:center}.color-preview .contrast hr{min-width:1em;border-width:0.1em 0 0.1em 0;border-style:solid}h3{text-align:center}.modal-content{margin:0.5em}.controls{display:flex;justify-content:space-between;margin-top:1em}dnn-fieldset{--fieldset-foreground-color:var(--foreground-color);--fieldset-background-color:var(--background-color);--fieldset-focus-color:var(--focus-color);--fieldset-danger-color:var(--danger-color);--fieldset-control-radius:var(--control-radius)}";

const DnnColorInput = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.colorChange = index.createEvent(this, "colorChange", 7);
        this.colorInput = index.createEvent(this, "colorInput", 7);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
        /** Sets the initial color, must be a valid 8 character hexadecimal string without the # sign. */
        this.color = "000088";
        /** Sets the initial contrast color, must be a valid 8 character hexadecimal string without the # sign. */
        this.contrastColor = "FFFFFF";
        /** Sets the initial light color, must be a valid 8 character hexadecimal string without the # sign. */
        this.lightColor = "00000FF";
        /** Sets the initial dark color, must be a valid 8 character hexadecimal string without the # sign. */
        this.darkColor = "0000044";
        /** Can be used to customize the text language. */
        this.localization = {
            contrast: "Contrast",
            preview: "Preview",
            cancel: "Cancel",
            confirm: "Confirm",
            normal: "Normal",
            light: "Light",
            dark: "Dark",
        };
        this.hasMultipleColors = () => {
            return this.useContrastColor || this.useLightColor || this.useDarkColor;
        };
    }
    currentColorChanged(oldValue, newValue) {
        if (oldValue != newValue) {
            this.colorInput.emit(newValue);
            this.setFormValue();
        }
    }
    componentWillLoad() {
        this.labelId = stringUtilities.generateRandomId();
        this.currentColor = {
            color: this.color,
            contrastColor: this.contrastColor,
            lightColor: this.lightColor,
            darkColor: this.darkColor
        };
        this.originalColor = this.currentColor;
    }
    componentDidLoad() {
        this.setFormValue();
    }
    formResetCallback() {
        this.internals.setValidity({});
        this.color = this.originalColor.color;
        this.contrastColor = this.originalColor.contrastColor;
        this.lightColor = this.originalColor.lightColor;
        this.darkColor = this.originalColor.darkColor;
        this.currentColor = this.originalColor;
    }
    showPicker() {
        this.currentColor = {
            color: this.color,
            contrastColor: this.contrastColor,
            lightColor: this.lightColor,
            darkColor: this.darkColor
        };
        this.colorModal.show();
    }
    saveColor() {
        this.color = this.currentColor.color;
        this.contrastColor = this.currentColor.contrastColor;
        this.lightColor = this.currentColor.lightColor;
        this.darkColor = this.currentColor.darkColor;
        this.colorModal.hide();
        this.colorChange.emit(this.currentColor);
    }
    setFormValue() {
        if (this.name != undefined) {
            var formData = new FormData();
            formData.append(this.name, JSON.stringify(this.currentColor));
            this.internals.setFormValue(formData);
        }
    }
    render() {
        var _a, _b, _c, _d, _e;
        return (index.h(index.Host, { key: '424f07506afa34b13ef575f371bffb26aa8df5e8', tabIndex: this.focused ? -1 : 0, onFocus: () => this.button.focus(), onBlur: () => this.button.blur() }, index.h("dnn-fieldset", { key: 'bed1657cda621e400f2a96b711ec57d20b68d66e', label: this.label, id: this.labelId, focused: this.focused, helpText: this.helpText }, index.h("div", { key: 'afae4be0967c51a523433c6d8363f16c05812e9f', class: "inner-container" }, index.h("slot", { key: 'd9227294be1c5af5e0d67b28094d898d8040c1ac', name: "prefix" }), index.h("div", { key: 'c13adc8149043453af9cbefdabec88cc59f98464', class: "color-preview" }, this.useLightColor &&
            index.h("div", { key: '166aae1704c155399a032b43b2a55856be56dc7a', style: { backgroundColor: `#${this.lightColor}` } }), index.h("div", { key: '89fb9c7c817f943dddd50050d19674aab45fe368', style: { backgroundColor: `#${this.color}` } }), this.useDarkColor &&
            index.h("div", { key: '4486780eba2bb5c6a14cba0d520ad8f6224612a3', style: { backgroundColor: `#${this.darkColor}` } }), this.useContrastColor &&
            index.h("div", { key: '8274f695cca37a384033ac65ca601c705f00a5cc', class: "contrast", style: { color: `#${this.contrastColor}` } }, index.h("hr", { key: 'e5abd71316c9dd979a1a4cc92913ed180c843442', style: { color: `#${this.contrastColor}` } }), index.h("span", { key: '7abfc85788a477af5e9fef3e1a00ca418f6a6eb6' }, this.localization.contrast), index.h("hr", { key: '0998aba2694a8216d29270e1acbf7b2aa803c883', style: { color: `#${this.contrastColor}` } }))), !this.readonly &&
            index.h("button", { key: 'e01a5c24ea162e0e89b0fc0b7bfe42e602c5742e', ref: el => this.button = el, "aria-labelledby": this.labelId, onClick: () => this.showPicker(), onFocus: () => this.focused = true, onBlur: () => this.focused = false }, index.h("svg", { key: 'e8dbe0a3a503e54c526f5910ca911c0cbbab4694', xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960" }, index.h("path", { key: '522803b70b2d39a8a2094f90b3bdf75d8f4a2f9d', d: "M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z" }))), index.h("slot", { key: 'cd5f7eac13c7e1160c03a9a85c5022103bb59af1', name: "suffix" }))), index.h("dnn-modal", { key: '6be663f95cd8a1b746a844520fc1e9b765d6a008', ref: el => this.colorModal = el, preventBackdropDismiss: true }, this.currentColor &&
            index.h("div", { key: '6134ede7e437da64f100a39ecfc6fb09e339565b', class: "modal-content" }, this.hasMultipleColors() &&
                index.h("dnn-tabs", { key: '2d57ee0ef497a5ef25b119842cd0f20d6082281e' }, index.h("dnn-tab", { key: 'be922d36985b3aff5ed498294a56d9d2f97c20b5', tabTitle: this.localization.normal }, index.h("dnn-color-picker", { key: '373dc41051d63d82f47124b45e9fd79c2d9b7d87', color: (_a = this.currentColor) === null || _a === void 0 ? void 0 : _a.color, onColorChanged: e => this.currentColor = Object.assign(Object.assign({}, this.currentColor), { color: e.detail.hex }) })), this.useLightColor &&
                    index.h("dnn-tab", { key: '327aec332b3e1ce849d5587fbfbf16c8beb0ca1e', tabTitle: this.localization.light }, index.h("dnn-color-picker", { key: '961f580e7ccf252dd2d8f016e60b9a998b17df3f', color: (_b = this.currentColor) === null || _b === void 0 ? void 0 : _b.lightColor, onColorChanged: e => this.currentColor = Object.assign(Object.assign({}, this.currentColor), { lightColor: e.detail.hex }) })), this.useDarkColor &&
                    index.h("dnn-tab", { key: '927ab00df7afba5c61fe06df998728720812e984', tabTitle: this.localization.dark }, index.h("dnn-color-picker", { key: 'a403ec0f086f2c3af782905ddff58b1a39aaad02', color: (_c = this.currentColor) === null || _c === void 0 ? void 0 : _c.darkColor, onColorChanged: e => this.currentColor = Object.assign(Object.assign({}, this.currentColor), { darkColor: e.detail.hex }) })), this.useContrastColor &&
                    index.h("dnn-tab", { key: '5a2b0b693a6ee69012130cf8a444e3272cd8255a', tabTitle: this.localization.contrast }, index.h("dnn-color-picker", { key: '583d385d8c96676c8f8f3f724f189b4745a63724', color: (_d = this.currentColor) === null || _d === void 0 ? void 0 : _d.contrastColor, onColorChanged: e => this.currentColor = Object.assign(Object.assign({}, this.currentColor), { contrastColor: e.detail.hex }) }))), !this.hasMultipleColors() &&
                index.h("dnn-color-picker", { key: 'b4957b698893374e9362d696d80af0238056d3c2', color: (_e = this.currentColor) === null || _e === void 0 ? void 0 : _e.color, onColorChanged: e => this.currentColor = Object.assign(Object.assign({}, this.currentColor), { color: e.detail.hex }) }), index.h("h3", { key: '06577335e3d638aac5f48c18da1fc71372799372' }, "Preview"), index.h("div", { key: 'bf27be80c9b2e0bd9a16aa2ffe17e0820090bcd6', class: "color-preview" }, this.useLightColor &&
                index.h("div", { key: '936cde13af20746755621b98c741b0210597c01f', style: { backgroundColor: `#${this.currentColor.lightColor}` } }), index.h("div", { key: '24255b4c0b0544668e6c8c93e5dd02e385db8cab', style: { backgroundColor: `#${this.currentColor.color}` } }), this.useDarkColor &&
                index.h("div", { key: 'c2c4fd7ed435dd14d68eb53d5144d468343ecb1f', style: { backgroundColor: `#${this.currentColor.darkColor}` } }), this.useContrastColor &&
                index.h("div", { key: 'e16542ecb15b0a0eb1fdad07223b771f9bfec8da', class: "contrast", style: { color: `#${this.currentColor.contrastColor}` } }, index.h("hr", { key: '81dbbbee7c12753293ee0d8c95f0955128c665a2', style: { color: `#${this.currentColor.contrastColor}` } }), index.h("span", { key: '2ac0cf657b282c603d8a798fe2b0e7c75546e905' }, this.localization.contrast), index.h("hr", { key: 'a107e0d7badecceaef3a67e3d8285c0fa4eb7fd6', style: { color: `#${this.currentColor.contrastColor}` } }))), index.h("div", { key: 'd5d1ffcd13fb0d261d24cb1d49608100e73281bc', class: "controls" }, index.h("dnn-button", { key: '0a5b9fffdb9c8bddbc6ee43bcd8804e07ed71bb6', reversed: true, onClick: () => this.colorModal.hide() }, this.localization.cancel), index.h("dnn-button", { key: 'ad12f079e47999000e4d386b05559a902eb663db', onClick: () => this.saveColor() }, this.localization.confirm))))));
    }
    static get formAssociated() { return true; }
    static get watchers() { return {
        "currentColor": ["currentColorChanged"]
    }; }
};
DnnColorInput.style = dnnColorInputCss;

const dnnInputCss = ":host{display:inline-block;--foreground-color:var(--dnn-color-foreground, #000);--background-color:var(--dnn-color-background, #fff);--focus-color:var(--dnn-color-primary, #3792ED);--danger-color:var(--dnn-color-danger, #900);--control-radius:var(--dnn-controls-radius, 3px);--input-text-align:left}dnn-fieldset{width:100%}.inner-container{display:flex;justify-content:space-between;position:relative;width:100%}input{border:none;outline:none;background-color:transparent;color:var(--foreground);text-align:var(--input-text-align);width:100%}.prefix,.suffix{font-size:0.8em}svg.error{fill:red;width:1em;height:1em;transform:scale(1.5);margin-right:0.5em}button.show-password{border:none;background-color:transparent;margin:0;padding:0}button.show-password svg{height:1em;width:auto;fill:var(--foreground);transform:scale(1.5)}dnn-fieldset{--fieldset-foreground-color:var(--foreground-color);--fieldset-background-color:var(--background-color);--fieldset-focus-color:var(--focus-color);--fieldset-danger-color:var(--danger-color);--fieldset-control-radius:var(--control-radius)}";

const DnnInput = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.valueChange = index.createEvent(this, "valueChange", 7);
        this.valueInput = index.createEvent(this, "valueInput", 7);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
        /** The input type, supports most of html standard input type, see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types. */
        this.type = "text";
        /** The value of the input. */
        this.value = "";
        /** Defines the type of auto-completion to use for this field, see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete. */
        this.autocomplete = "off";
        this.focused = false;
        this.valid = true;
    }
    /** Reports the input validity details. See https://developer.mozilla.org/en-US/docs/Web/API/ValidityState */
    async checkValidity() {
        var validity = this.inputField.checkValidity();
        if (!validity) {
            this.fieldset.setValidity(false, this.inputField.validationMessage);
        }
        return this.inputField.validity;
    }
    /** Can be used to set a custom validity message. */
    async setCustomValidity(message) {
        if (message == undefined || message == "") {
            this.inputField.setCustomValidity("");
            this.valid = true;
            this.fieldset.setValidity(true);
            return;
        }
        this.inputField.setCustomValidity(message);
        this.valid = false;
        this.fieldset.setValidity(false, message);
    }
    componentWillLoad() {
        this.labelId = stringUtilities.generateRandomId();
    }
    componentDidLoad() {
        requestAnimationFrame(() => {
            var validity = this.inputField.validity;
            var validityMessage = validity.valid ? "" : this.inputField.validationMessage;
            this.internals.setValidity(this.inputField.validity, validityMessage);
        });
    }
    formResetCallback() {
        this.inputField.setCustomValidity("");
        this.value = "";
        this.internals.setValidity({});
        this.internals.setFormValue("");
    }
    handleInput(e) {
        if (this.type === "number" && e.data === "-") {
            // Ignore the minus sign if the input type is number
            return;
        }
        var value = e.target.value;
        this.value = value;
        var valid = this.inputField.checkValidity();
        this.valid = valid;
        this.valueInput.emit(this.value);
    }
    handleInvalid() {
        this.valid = false;
        this.fieldset.setValidity(false, this.inputField.validationMessage);
        this.internals.setValidity(this.inputField.validity, this.inputField.validationMessage);
    }
    handleChange() {
        this.valueChange.emit(this.value);
        if (this.name != undefined) {
            var data = new FormData();
            data.append(this.name, this.value.toString());
            this.internals.setFormValue(data);
        }
    }
    switchPasswordVisibility() {
        if (this.type === "password") {
            this.type = "text";
            return;
        }
        if (this.type === "text") {
            this.type = "password";
            return;
        }
    }
    shouldLabelFloat() {
        if (this.type === "number" && isNaN(this.value)) {
            return true;
        }
        if (this.focused) {
            return false;
        }
        if (this.value != undefined && this.value != "") {
            return false;
        }
        if (this.type == "date" || this.type == "datetime-local" || this.type == "time") {
            return false;
        }
        if ((typeof this.value === "string" && this.value === "0") || (typeof this.value === "number" && this.value === 0)) {
            return false;
        }
        return true;
    }
    getInputMode() {
        if (this.inputmode != undefined) {
            return this.inputmode;
        }
        if (this.type === "number" && this.min != undefined) {
            var min = parseFloat(this.min.toString());
            if ((this.step === 1 || this.step == undefined) && min >= 0) {
                return "numeric";
            }
            return "decimal";
        }
        if (this.type === "tel") {
            return "tel";
        }
        if (this.type === "url") {
            return "url";
        }
        if (this.type === "email") {
            return "email";
        }
        if (this.type === "search") {
            return "search";
        }
        return "text";
    }
    handleBlur() {
        this.focused = false;
        var validity = this.inputField.checkValidity();
        this.valid = validity;
        this.fieldset.setValidity(validity, this.inputField.validationMessage);
        this.internals.setValidity(this.inputField.validity, this.inputField.validationMessage);
    }
    render() {
        var _a;
        return (index.h(index.Host, { key: '180c61c149a2818e6acaa01ae25e7d736fd8fd1a', tabIndex: this.focused ? -1 : 0, onFocus: () => this.inputField.focus(), onBlur: () => this.inputField.blur() }, index.h("dnn-fieldset", { key: '2e632a91af264a0ee0a64a6ae34a1549baf126eb', ref: el => this.fieldset = el, invalid: !this.valid, focused: this.focused, label: `${(_a = this.label) !== null && _a !== void 0 ? _a : ""}${this.required ? " *" : ""}`, helpText: this.helpText, id: this.labelId, disabled: this.disabled, floatLabel: this.shouldLabelFloat(), onClick: () => !this.focused && this.inputField.focus(), onFocus: () => this.focused = true, onBlur: () => this.focused = false }, index.h("div", { key: '85f6b9530c8cb6beac5e307bde46e60a2c96b945', class: "inner-container" }, !this.shouldLabelFloat() &&
            index.h("slot", { key: 'f468f0594abda09dca5d750983fb2c2551abff0d', name: "prefix" }), index.h("input", { key: '5e14975b602af9da81eed90f8f5c25437472bf82', ref: el => this.inputField = el, name: this.name, type: this.type, inputMode: this.getInputMode(), disabled: this.disabled, required: this.required, autoComplete: this.autocomplete, min: this.min, max: this.max, minlength: this.minlength, maxlength: this.maxlength, multiple: this.multiple, pattern: this.pattern, readonly: this.readonly, step: this.step, value: this.value, onBlur: () => this.handleBlur(), onFocus: () => this.focused = true, onInput: e => this.handleInput(e), onInvalid: () => this.handleInvalid(), onChange: () => this.handleChange(), "aria-labelledby": this.labelId }), !this.shouldLabelFloat() &&
            index.h("slot", { key: 'd2a4ea97cf775711a3acf640ab268576a8d86e7e', name: "suffix" }), !this.valid &&
            index.h("svg", { key: '158811fec2c20e750983f8704feb8b6209130789', xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960", class: "error" }, index.h("path", { key: 'a4c4cda8b7704bc2515aa6348e0fa9d301ae60b8', d: "M479.982-280q14.018 0 23.518-9.482 9.5-9.483 9.5-23.5 0-14.018-9.482-23.518-9.483-9.5-23.5-9.5-14.018 0-23.518 9.482-9.5 9.483-9.5 23.5 0 14.018 9.482 23.518 9.483 9.5 23.5 9.5ZM453-433h60v-253h-60v253Zm27.266 353q-82.734 0-155.5-31.5t-127.266-86q-54.5-54.5-86-127.341Q80-397.681 80-480.5q0-82.819 31.5-155.659Q143-709 197.5-763t127.341-85.5Q397.681-880 480.5-880q82.819 0 155.659 31.5Q709-817 763-763t85.5 127Q880-563 880-480.266q0 82.734-31.5 155.5T763-197.684q-54 54.316-127 86Q563-80 480.266-80Zm.234-60Q622-140 721-239.5t99-241Q820-622 721.188-721 622.375-820 480-820q-141 0-240.5 98.812Q140-622.375 140-480q0 141 99.5 240.5t241 99.5Zm-.5-340Z" })), this.allowShowPassword &&
            index.h("button", { key: 'fb0fd7b105d05c65b36ec6716fa941a54ca58b96', class: "show-password", onClick: () => this.switchPasswordVisibility() }, this.type === "text" &&
                index.h("svg", { key: 'ff33b9c6d9cad984ab04d3c54e4f3d3f2ac29fa0', xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960" }, index.h("path", { key: '074df09836c12016a3d38e40dacb72dc10751ccb', d: "M480.118-330Q551-330 600.5-379.618q49.5-49.617 49.5-120.5Q650-571 600.382-620.5q-49.617-49.5-120.5-49.5Q409-670 359.5-620.382q-49.5 49.617-49.5 120.5Q310-429 359.618-379.5q49.617 49.5 120.5 49.5Zm-.353-58Q433-388 400.5-420.735q-32.5-32.736-32.5-79.5Q368-547 400.735-579.5q32.736-32.5 79.5-32.5Q527-612 559.5-579.265q32.5 32.736 32.5 79.5Q592-453 559.265-420.5q-32.736 32.5-79.5 32.5ZM480-200q-146 0-264-83T40-500q58-134 176-217t264-83q146 0 264 83t176 217q-58 134-176 217t-264 83Zm0-300Zm-.169 240Q601-260 702.5-325.5 804-391 857-500q-53-109-154.331-174.5-101.332-65.5-222.5-65.5Q359-740 257.5-674.5 156-609 102-500q54 109 155.331 174.5 101.332 65.5 222.5 65.5Z" })), this.type == "password" &&
                index.h("svg", { key: 'e2e4d68cd34902ba23d65c94b777cbe11aa37863', xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960" }, index.h("path", { key: 'fbb52510b02ad84be23cddc4cb468caa3a275298', d: "m629-419-44-44q26-71-27-118t-115-24l-44-44q17-11 38-16t43-5q71 0 120.5 49.5T650-500q0 22-5.5 43.5T629-419Zm129 129-40-40q49-36 85.5-80.5T857-500q-50-111-150-175.5T490-740q-42 0-86 8t-69 19l-46-47q35-16 89.5-28T485-800q143 0 261.5 81.5T920-500q-26 64-67 117t-95 93Zm58 226L648-229q-35 14-79 21.5t-89 7.5q-146 0-265-81.5T40-500q20-52 55.5-101.5T182-696L56-822l42-43 757 757-39 44ZM223-654q-37 27-71.5 71T102-500q51 111 153.5 175.5T488-260q33 0 65-4t48-12l-64-64q-11 5-27 7.5t-30 2.5q-70 0-120-49t-50-121q0-15 2.5-30t7.5-27l-97-97Zm305 142Zm-116 58Z" })))))));
    }
    static get formAssociated() { return true; }
};
DnnInput.style = dnnInputCss;

const dnnToggleCss = ":host{display:inline-block;outline:none;cursor:pointer}button{height:1.5em;width:2.5em;outline:none;background-color:var(--background, #888);border:0;border-radius:var(--border-radius, var(--dnn-controls-radius, 0.75em));padding:0.1em;position:relative;margin:0;transition:background-color 300ms ease-in-out;position:relative;cursor:pointer}button:hover,button:focus-visible{box-shadow:0 0 2px 2px var(--dnn-color-primary)}button.checked{background-color:var(--background-checked, var(--dnn-color-primary, blue))}button.checked .handle{left:calc(1em + 4px)}button:disabled{opacity:0.5;cursor:not-allowed;box-shadow:none}button .handle{transition:all 300ms ease-in-out;background-color:white;width:1em;height:1em;border-radius:var(--handle-border-radius, var(--dnn-controls-radius, 50%));position:absolute;top:calc(50% - 0.5em);left:2px}";

const DnnToggle = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.checkChanged = index.createEvent(this, "checkChanged", 7);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
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
        return (index.h(index.Host, { key: '3cc6ae98b11d5aa5db0b065d5ac998e24cbf81c4', tabIndex: this.focused ? -1 : 0, onFocus: () => this.button.focus(), onBlur: () => this.button.blur() }, index.h("button", { key: '59ad3d27c67052057e0718bfc54d143b3fe8e5a9', ref: el => this.button = el, disabled: this.disabled, class: { 'checked': this.checked }, onFocus: () => this.focused = true, onBlur: () => this.focused = false }, index.h("div", { key: 'a7eab538b67034a917f9bd4040a724b39de02dfc', class: "handle" }))));
    }
    static get formAssociated() { return true; }
    get element() { return index.getElement(this); }
    static get watchers() { return {
        "checked": ["checkedChanged"]
    }; }
};
DnnToggle.style = dnnToggleCss;

exports.dnn_color_input = DnnColorInput;
exports.dnn_input = DnnInput;
exports.dnn_toggle = DnnToggle;
//# sourceMappingURL=dnn-color-input.dnn-input.dnn-toggle.entry.cjs.js.map
