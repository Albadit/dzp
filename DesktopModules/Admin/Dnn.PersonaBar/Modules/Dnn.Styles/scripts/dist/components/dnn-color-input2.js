import { proxyCustomElement, HTMLElement, createEvent, h, Host } from '@stencil/core/internal/client';
import { a as generateRandomId } from './stringUtilities.js';
import { d as defineCustomElement$6 } from './dnn-button2.js';
import { d as defineCustomElement$5 } from './dnn-color-picker2.js';
import { d as defineCustomElement$4 } from './dnn-fieldset2.js';
import { d as defineCustomElement$3 } from './dnn-modal2.js';
import { d as defineCustomElement$2 } from './dnn-tab2.js';
import { d as defineCustomElement$1 } from './dnn-tabs2.js';

const dnnColorInputCss = ":host{display:inline-block;--foreground-color:var(--dnn-color-foreground, #000);--background-color:var(--dnn-color-background, #fff);--focus-color:var(--dnn-color-primary, #3792ED);--control-radius:var(--dnn-controls-radius, 3px);--contast-text-align:left}dnn-fieldset{width:100%}.inner-container{display:flex;justify-content:space-between;position:relative;width:100%;background-color:var(--background-color)}button{margin:0 0 0 1em;padding:0;border:none;background-color:transparent;width:1em;height:1em}button svg{fill:var(--dnn-color-primary);transform:scale(1.5)}.color-preview{min-height:1em;min-width:10em;display:flex;width:100%;position:relative}.color-preview>div{flex:1}.color-preview .contrast{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;justify-content:space-around;align-items:center}.color-preview .contrast hr{min-width:1em;border-width:0.1em 0 0.1em 0;border-style:solid}h3{text-align:center}.modal-content{margin:0.5em}.controls{display:flex;justify-content:space-between;margin-top:1em}dnn-fieldset{--fieldset-foreground-color:var(--foreground-color);--fieldset-background-color:var(--background-color);--fieldset-focus-color:var(--focus-color);--fieldset-danger-color:var(--danger-color);--fieldset-control-radius:var(--control-radius)}";

const DnnColorInput = /*@__PURE__*/ proxyCustomElement(class DnnColorInput extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.colorChange = createEvent(this, "colorChange", 7);
        this.colorInput = createEvent(this, "colorInput", 7);
        this.internals = this.attachInternals();
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
        this.labelId = generateRandomId();
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
        return (h(Host, { key: '424f07506afa34b13ef575f371bffb26aa8df5e8', tabIndex: this.focused ? -1 : 0, onFocus: () => this.button.focus(), onBlur: () => this.button.blur() }, h("dnn-fieldset", { key: 'bed1657cda621e400f2a96b711ec57d20b68d66e', label: this.label, id: this.labelId, focused: this.focused, helpText: this.helpText }, h("div", { key: 'afae4be0967c51a523433c6d8363f16c05812e9f', class: "inner-container" }, h("slot", { key: 'd9227294be1c5af5e0d67b28094d898d8040c1ac', name: "prefix" }), h("div", { key: 'c13adc8149043453af9cbefdabec88cc59f98464', class: "color-preview" }, this.useLightColor &&
            h("div", { key: '166aae1704c155399a032b43b2a55856be56dc7a', style: { backgroundColor: `#${this.lightColor}` } }), h("div", { key: '89fb9c7c817f943dddd50050d19674aab45fe368', style: { backgroundColor: `#${this.color}` } }), this.useDarkColor &&
            h("div", { key: '4486780eba2bb5c6a14cba0d520ad8f6224612a3', style: { backgroundColor: `#${this.darkColor}` } }), this.useContrastColor &&
            h("div", { key: '8274f695cca37a384033ac65ca601c705f00a5cc', class: "contrast", style: { color: `#${this.contrastColor}` } }, h("hr", { key: 'e5abd71316c9dd979a1a4cc92913ed180c843442', style: { color: `#${this.contrastColor}` } }), h("span", { key: '7abfc85788a477af5e9fef3e1a00ca418f6a6eb6' }, this.localization.contrast), h("hr", { key: '0998aba2694a8216d29270e1acbf7b2aa803c883', style: { color: `#${this.contrastColor}` } }))), !this.readonly &&
            h("button", { key: 'e01a5c24ea162e0e89b0fc0b7bfe42e602c5742e', ref: el => this.button = el, "aria-labelledby": this.labelId, onClick: () => this.showPicker(), onFocus: () => this.focused = true, onBlur: () => this.focused = false }, h("svg", { key: 'e8dbe0a3a503e54c526f5910ca911c0cbbab4694', xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960" }, h("path", { key: '522803b70b2d39a8a2094f90b3bdf75d8f4a2f9d', d: "M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z" }))), h("slot", { key: 'cd5f7eac13c7e1160c03a9a85c5022103bb59af1', name: "suffix" }))), h("dnn-modal", { key: '6be663f95cd8a1b746a844520fc1e9b765d6a008', ref: el => this.colorModal = el, preventBackdropDismiss: true }, this.currentColor &&
            h("div", { key: '6134ede7e437da64f100a39ecfc6fb09e339565b', class: "modal-content" }, this.hasMultipleColors() &&
                h("dnn-tabs", { key: '2d57ee0ef497a5ef25b119842cd0f20d6082281e' }, h("dnn-tab", { key: 'be922d36985b3aff5ed498294a56d9d2f97c20b5', tabTitle: this.localization.normal }, h("dnn-color-picker", { key: '373dc41051d63d82f47124b45e9fd79c2d9b7d87', color: (_a = this.currentColor) === null || _a === void 0 ? void 0 : _a.color, onColorChanged: e => this.currentColor = Object.assign(Object.assign({}, this.currentColor), { color: e.detail.hex }) })), this.useLightColor &&
                    h("dnn-tab", { key: '327aec332b3e1ce849d5587fbfbf16c8beb0ca1e', tabTitle: this.localization.light }, h("dnn-color-picker", { key: '961f580e7ccf252dd2d8f016e60b9a998b17df3f', color: (_b = this.currentColor) === null || _b === void 0 ? void 0 : _b.lightColor, onColorChanged: e => this.currentColor = Object.assign(Object.assign({}, this.currentColor), { lightColor: e.detail.hex }) })), this.useDarkColor &&
                    h("dnn-tab", { key: '927ab00df7afba5c61fe06df998728720812e984', tabTitle: this.localization.dark }, h("dnn-color-picker", { key: 'a403ec0f086f2c3af782905ddff58b1a39aaad02', color: (_c = this.currentColor) === null || _c === void 0 ? void 0 : _c.darkColor, onColorChanged: e => this.currentColor = Object.assign(Object.assign({}, this.currentColor), { darkColor: e.detail.hex }) })), this.useContrastColor &&
                    h("dnn-tab", { key: '5a2b0b693a6ee69012130cf8a444e3272cd8255a', tabTitle: this.localization.contrast }, h("dnn-color-picker", { key: '583d385d8c96676c8f8f3f724f189b4745a63724', color: (_d = this.currentColor) === null || _d === void 0 ? void 0 : _d.contrastColor, onColorChanged: e => this.currentColor = Object.assign(Object.assign({}, this.currentColor), { contrastColor: e.detail.hex }) }))), !this.hasMultipleColors() &&
                h("dnn-color-picker", { key: 'b4957b698893374e9362d696d80af0238056d3c2', color: (_e = this.currentColor) === null || _e === void 0 ? void 0 : _e.color, onColorChanged: e => this.currentColor = Object.assign(Object.assign({}, this.currentColor), { color: e.detail.hex }) }), h("h3", { key: '06577335e3d638aac5f48c18da1fc71372799372' }, "Preview"), h("div", { key: 'bf27be80c9b2e0bd9a16aa2ffe17e0820090bcd6', class: "color-preview" }, this.useLightColor &&
                h("div", { key: '936cde13af20746755621b98c741b0210597c01f', style: { backgroundColor: `#${this.currentColor.lightColor}` } }), h("div", { key: '24255b4c0b0544668e6c8c93e5dd02e385db8cab', style: { backgroundColor: `#${this.currentColor.color}` } }), this.useDarkColor &&
                h("div", { key: 'c2c4fd7ed435dd14d68eb53d5144d468343ecb1f', style: { backgroundColor: `#${this.currentColor.darkColor}` } }), this.useContrastColor &&
                h("div", { key: 'e16542ecb15b0a0eb1fdad07223b771f9bfec8da', class: "contrast", style: { color: `#${this.currentColor.contrastColor}` } }, h("hr", { key: '81dbbbee7c12753293ee0d8c95f0955128c665a2', style: { color: `#${this.currentColor.contrastColor}` } }), h("span", { key: '2ac0cf657b282c603d8a798fe2b0e7c75546e905' }, this.localization.contrast), h("hr", { key: 'a107e0d7badecceaef3a67e3d8285c0fa4eb7fd6', style: { color: `#${this.currentColor.contrastColor}` } }))), h("div", { key: 'd5d1ffcd13fb0d261d24cb1d49608100e73281bc', class: "controls" }, h("dnn-button", { key: '0a5b9fffdb9c8bddbc6ee43bcd8804e07ed71bb6', reversed: true, onClick: () => this.colorModal.hide() }, this.localization.cancel), h("dnn-button", { key: 'ad12f079e47999000e4d386b05559a902eb663db', onClick: () => this.saveColor() }, this.localization.confirm))))));
    }
    static get formAssociated() { return true; }
    static get watchers() { return {
        "currentColor": ["currentColorChanged"]
    }; }
    static get style() { return dnnColorInputCss; }
}, [321, "dnn-color-input", {
        "color": [1025],
        "contrastColor": [1025, "contrast-color"],
        "lightColor": [1025, "light-color"],
        "darkColor": [1025, "dark-color"],
        "label": [1],
        "readonly": [4],
        "localization": [16],
        "name": [1],
        "helpText": [1, "help-text"],
        "useContrastColor": [4, "use-contrast-color"],
        "useLightColor": [4, "use-light-color"],
        "useDarkColor": [4, "use-dark-color"],
        "currentColor": [32],
        "focused": [32]
    }, undefined, {
        "currentColor": ["currentColorChanged"]
    }]);
function defineCustomElement() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-color-input", "dnn-button", "dnn-color-picker", "dnn-fieldset", "dnn-modal", "dnn-tab", "dnn-tabs"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-color-input":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnColorInput);
            }
            break;
        case "dnn-button":
            if (!customElements.get(tagName)) {
                defineCustomElement$6();
            }
            break;
        case "dnn-color-picker":
            if (!customElements.get(tagName)) {
                defineCustomElement$5();
            }
            break;
        case "dnn-fieldset":
            if (!customElements.get(tagName)) {
                defineCustomElement$4();
            }
            break;
        case "dnn-modal":
            if (!customElements.get(tagName)) {
                defineCustomElement$3();
            }
            break;
        case "dnn-tab":
            if (!customElements.get(tagName)) {
                defineCustomElement$2();
            }
            break;
        case "dnn-tabs":
            if (!customElements.get(tagName)) {
                defineCustomElement$1();
            }
            break;
    } });
}

export { DnnColorInput as D, defineCustomElement as d };
//# sourceMappingURL=dnn-color-input2.js.map

//# sourceMappingURL=dnn-color-input2.js.map