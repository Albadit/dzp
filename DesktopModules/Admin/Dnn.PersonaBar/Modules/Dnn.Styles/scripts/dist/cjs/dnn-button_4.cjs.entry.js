'use strict';

var index = require('./index-CoZy11qT.js');
var debounce = require('./debounce-Bgh0pHeI.js');

const dnnButtonCss = ":host{--background-color:transparent;--color:#333;--border-size:1px;--border-color:var(--backround-color);--border-radius:var(--dnn-controls-radius, 5px);--padding:var(--dnn-controls-padding, 5px);display:inline-block;width:auto}:host(.primary){--background-color:var(--dnn-color-primary, #3792ED);--color:var(--dnn-color-primary-contrast, white);--focus-color:var(--background-color)}:host(.primary.reversed){--background-color:var(--dnn-color-primary-contrast, white);--color:var(--dnn-color-primary, #3792ED);--border-color:var(--dnn-color-primary, #3792ED);--focus-color:var(--color)}:host(.secondary){--background-color:var(--dnn-color-secondary, #CCC);--color:var(--dnn-color-secondary-contrast, #222);--focus-color:var(--background-color)}:host(.secondary.reversed){--background-color:var(--dnn-color-secondary-contrast, #222);--color:var(--dnn-color-secondary, #CCC);--border-color:var(--dnn-color-secondary, #CCC);--focus-color:var(--color)}:host(.danger){--background-color:var(--dnn-color-danger, #dc3545);--color:var(--dnn-color-danger-contrast,white);--focus-color:var(--background-color)}:host(.danger.reversed){--background-color:var(--dnn-color-danger-contrast, white);--color:var(--dnn-color-danger, #dc3545);--border-color:var(--dnn-color-danger, #dc3545);--focus-color:var(--color)}:host(.tertiary){--background-color:var(--dnn-color-tertiary, #EAEAEA);--color:var(--dnn-color-tertiary-contrast, black);--focus-color:var(--background-color)}:host(.tertiary.reversed){--background-color:var(--dnn-color-tertiary-contrast, #333);--color:var(--dnn-color-tertiary, #EAEAEA);--border-color:var(--dnn-color-tertiary, #EAEAEA);--focus-color:var(--color)}:host(.hydrated) button{border:var(--border-size) solid var(--border-color);border-radius:var(--border-radius);padding:var(--padding) calc(var(--padding) * 2);background-color:transparent;background-color:var(--background-color);color:var(--color);outline:none}:host(.hydrated) button:focus-visible,:host(.hydrated) button:hover{box-shadow:0 0 2px 2px var(--focus-color)}:host(.disabled){position:relative;filter:saturate(0.5) opacity(0.7);pointer-events:all !important;box-shadow:none}:host(.disabled)::after{cursor:not-allowed;content:\"\";position:absolute;width:100%;height:100%;top:0px;left:0px}:host(.small) button{padding:calc(var(--padding) / 2) var(--padding);font-size:0.7em}:host(.large) button{padding:calc(var(--padding) * 1.5) calc(var(--padding) * 3);font-size:1.2em}button{height:100%;width:100%;cursor:pointer}";

const DnnButton = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.confirmed = index.createEvent(this, "confirmed", 7);
        this.canceled = index.createEvent(this, "canceled", 7);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
        /**
         * Defines the look of the button.
         */
        this.appearance = 'primary';
        /**
         * Optional button type,
         * can be either submit, reset or button and defaults to button if not specified.
         * Warning: DNN wraps the whole page in a form, only use this if you are handling
         * form submission manually.
         */
        this.type = 'button';
        /**
        * @deprecated Use type instead.
        * Optional button type,
        * can be either submit, reset or button and defaults to button if not specified.
        * Warning: DNN wraps the whole page in a form, only use this if you are handling
        * form submission manually.
        * Warning: This will be deprecated in the next version and replaced with a new 'type' property.
        */
        this.formButtonType = 'button';
        /**
         * Optionally reverses the button style.
         */
        this.reversed = false;
        /**
         * Optionally sets the button size, small normal or large, defaults to normal
         */
        this.size = 'normal';
        /**
         * Optionally add a confirmation dialog before firing the action.
         */
        this.confirm = false;
        /**
         * The text of the yes button for confirmation.
         */
        this.confirmYesText = "Yes";
        /**
         * The text of the no button for confirmation.
         */
        this.confirmNoText = "No";
        /**
         * The text of the confirmation message;
         */
        this.confirmMessage = "Are you sure ?";
        /**
         * Disables the button
         */
        this.disabled = false;
        this.focused = false;
        this.modalVisible = false;
    }
    componentDidLoad() {
        this.modal = this.el.shadowRoot.querySelector('dnn-modal');
    }
    handleConfirm() {
        this.modal.hide();
        this.modalVisible = false;
        this.confirmed.emit();
    }
    handleCancel() {
        this.modal.hide();
        this.modalVisible = false;
        this.canceled.emit();
    }
    handleClick() {
        if (this.confirm && !this.modalVisible) {
            this.modal.show();
            this.modalVisible = true;
            return;
        }
        if (this.type === 'submit') {
            var form = this.internals.form;
            if (form) {
                var validity = form.checkValidity();
                if (validity) {
                    const submitButton = document.createElement('button');
                    submitButton.type = 'submit';
                    submitButton.style.display = 'none';
                    form.appendChild(submitButton);
                    submitButton.click();
                    form.removeChild(submitButton);
                }
                else {
                    const invalidEvent = new window.Event('invalid', { bubbles: true, cancelable: true });
                    form.dispatchEvent(invalidEvent);
                    var formControls = form.elements;
                    for (let i = 0; i < formControls.length; i++) {
                        var control = formControls[i];
                        try {
                            if ('checkValidity' in control && typeof control['checkValidity'] === 'function') {
                                control.checkValidity();
                            }
                        }
                        catch (e) {
                            console.error(e, control);
                        }
                    }
                    var elementToScrollTo = form.querySelector(':invalid');
                    if (elementToScrollTo) {
                        elementToScrollTo.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        if ('focus' in elementToScrollTo && typeof elementToScrollTo['focus'] === 'function') {
                            elementToScrollTo.focus();
                        }
                    }
                }
            }
        }
        if (this.type === 'reset') {
            var form = this.internals.form;
            if (form) {
                var resetButton = document.createElement('button');
                resetButton.type = 'reset';
                resetButton.style.display = 'none';
                form.appendChild(resetButton);
                resetButton.click();
                form.removeChild(resetButton);
            }
        }
    }
    getElementClasses() {
        const classes = [];
        classes.push(this.appearance);
        if (this.reversed) {
            classes.push('reversed');
        }
        if (this.size !== 'normal' && this.size !== undefined) {
            classes.push(this.size);
        }
        if (this.disabled) {
            classes.push('disabled');
        }
        return classes.join(' ');
    }
    render() {
        return (index.h(index.Host, { key: '2d3ec410a18888582d846d0e3306d1f95e7144e5', class: this.getElementClasses(), tabIndex: this.focused ? -1 : 0, onFocus: () => this.button.focus(), onBlur: () => this.button.blur() }, index.h("button", { key: '252d3528e68c0833a9d45e336563e70c13bf4267', ref: el => this.button = el, class: "button", onClick: () => this.handleClick(), disabled: this.disabled, onFocus: () => this.focused = true, onBlur: () => this.focused = false }, index.h("slot", { key: '9cfbe7a1cc15da1c8471e0641a82b1243114ad3f' })), this.confirm &&
            index.h("dnn-modal", { key: 'bd788c30986dfa0766d0ca21dbba502813f6548e', hideCloseButton: true, preventBackdropDismiss: true }, index.h("p", { key: '4ad7e6d564df45737e47c9e6e6e21fd763ec6128' }, this.confirmMessage), index.h("div", { key: '8243f08813c6e574fda8949382ee3f04932e1302', style: {
                    display: 'flex',
                    justifyContent: 'flex-end'
                } }, index.h("dnn-button", { key: 'cb0ec269ad877c15cebbc1d2248a1e76b37e89d9', appearance: 'primary', reversed: true, style: { margin: '5px' }, onClick: () => this.handleCancel() }, this.confirmNoText), index.h("dnn-button", { key: 'b5fa961a7f8b85d68132b440a12937d611d86eba', appearance: 'primary', style: { margin: '5px' }, onClick: () => this.handleConfirm() }, this.confirmYesText)))));
    }
    static get formAssociated() { return true; }
    get el() { return index.getElement(this); }
};
DnnButton.style = dnnButtonCss;

/** Color utility class with hsl and rgb converters
 * based on math at https://en.wikipedia.org/wiki/HSL_and_HSV
 * @copyright Copyright (c) .NET Foundation. All rights reserved.
 * @license MIT
 */
class ColorInfo {
    constructor() {
        this._hue = 0;
        this._saturation = 0;
        this._lightness = 0;
    }
    /** gets the color hue
     * @returns a number between 0 and 359, could contain decimals
     */
    get hue() { return this._hue; }
    set hue(value) {
        if (value < 0) {
            value = 0;
        }
        if (value > 359) {
            value = 359;
        }
        this._hue = value;
    }
    /** gets the color saturation
     * @returns a number between 0 and 1, could contain decimals
    */
    get saturation() { return this._saturation; }
    set saturation(value) {
        if (value < 0) {
            value = 0;
        }
        if (value > 1) {
            value = 1;
        }
        this._saturation = value;
    }
    /** gets the color lightness
     * @returns a number between 0 and 1, could contain decimals
     */
    get lightness() { return this._lightness; }
    set lightness(value) {
        if (value < 0) {
            value = 0;
        }
        if (value > 1) {
            value = 1;
        }
        this._lightness = value;
    }
    /** gets or sets the red component
     * @returns an integer between 0 and 255
    */
    get red() {
        return this.getRGB().red;
    }
    set red(value) {
        this.setHSL(value, this.green, this.blue);
    }
    /** gets or sets the green component
     * @returns an integer between 0 and 255
     */
    get green() {
        return this.getRGB().green;
    }
    set green(value) {
        this.setHSL(this.red, value, this.blue);
    }
    /** gets or sets the blue component
     * @returns an integer between 0 and 255
     */
    get blue() {
        return this.getRGB().blue;
    }
    set blue(value) {
        this.setHSL(this.red, this.green, value);
    }
    /** gets or sets the hex color value, expresses as 6 hexadecimal characters.
     * @returns hex representation of the color
     */
    get hex() {
        var r = this.getHex(this.red);
        var g = this.getHex(this.green);
        var b = this.getHex(this.blue);
        return r + g + b;
    }
    set hex(value) {
        this.red = parseInt(value.substr(0, 2));
        this.green = parseInt(value.substr(2, 2));
        this.blue = parseInt(value.substr(4, 2));
    }
    /** gets white or black color that is a good oposite to the current color
     * @returns - "000000" or "FFFFFF"
     */
    get contrastColor() {
        const brightness = (this.red * 299 + this.green * 587 + this.blue * 114) / 1000;
        if (brightness > 127) {
            return "000000";
        }
        return "FFFFFF";
    }
    getRGB() {
        const chroma = (1 - Math.abs((2 * this._lightness) - 1)) * this.saturation;
        // find the quandrant of the hue
        const quadrant = this._hue / 60;
        // calculate the offset from the quandrant center
        const offset = chroma * (1 - Math.abs(quadrant % 2 - 1));
        // Apply the chroma to the primary component and the offset to the 2nd most important component
        let r = 0, g = 0, b = 0;
        if (0 <= quadrant && quadrant <= 1) {
            r = chroma;
            g = offset; // red to yellow
        }
        else if (1 <= quadrant && quadrant <= 2) {
            g = chroma;
            r = offset; // yellow to green
        }
        else if (2 <= quadrant && quadrant <= 3) {
            g = chroma;
            b = offset; // green to cyan
        }
        else if (3 <= quadrant && quadrant <= 4) {
            b = chroma;
            g = offset; // cyan to blue
        }
        else if (4 <= quadrant && quadrant <= 5) {
            b = chroma;
            r = offset; // blue to magenta
        }
        else if (5 <= quadrant && quadrant <= 6) {
            r = chroma;
            b = offset; // magenta to red
        }
        // calculate the bias to add to all channels to match the lightness
        const bias = this._lightness - (chroma / 2);
        return {
            red: Math.round((r + bias) * 255),
            green: Math.round((g + bias) * 255),
            blue: Math.round((b + bias) * 255)
        };
    }
    setHSL(red, green, blue) {
        // GENERAL DATA
        // all math is based on values from 0 to 1
        const r = red / 255, g = green / 255, b = blue / 255;
        // we need to max, min and the difference between them to derive hsl
        const min = Math.min(r, g, b);
        const max = Math.max(r, g, b);
        const diff = max - min;
        let h = 0, s = 0, l = 0;
        // HUE
        if (diff === 0) { // neutral
            h = 0;
        }
        else if (max === r) { // red (magenta to yellow range)
            h = 60 * ((g - b) / diff);
        }
        else if (max === g) { // green (yellow to cyan range)
            h = 60 * (2 + ((b - r) / diff));
        }
        else if (max === b) { // blue (cyan to magenta range)
            h = 60 * (4 + ((r - g) / diff));
        }
        if (h < 0) {
            h = h + 360;
        } // ensures positive hues only
        if (h > 359) {
            h = 359;
        } // ensures we never return 360 for simplicity since it is the same as 0
        // LIGHTNESS
        l = (max + min) / 2;
        // SATURATION
        if (max === 0 || min === 1) { // pure black or white have no saturation
            s = 0;
        }
        else {
            s = (max - l) / (Math.min(l, 1 - l));
        }
        this._hue = h;
        this._saturation = s;
        this._lightness = l;
    }
    getHex(value) {
        var hex = value.toString(16);
        if (hex.length < 2) {
            hex = "0" + hex;
        }
        return hex;
    }
}

const dnnColorPickerCss = ".dnn-color-picker{padding:15px;max-width:400px}.dnn-color-picker .dnn-color-sliders{display:flex;flex-direction:column;min-width:200px}.dnn-color-picker .dnn-color-sliders .dnn-color-s-b{border:1px solid #ccc;padding-bottom:var(--color-box-height, 50%);position:relative;background-color:red}.dnn-color-picker .dnn-color-sliders .dnn-color-s-b:before{content:\"\";position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;background:linear-gradient(to right, white, red);mix-blend-mode:saturation}.dnn-color-picker .dnn-color-sliders .dnn-color-s-b:after{content:\"\";position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;background:linear-gradient(to bottom, white, black);mix-blend-mode:luminosity}.dnn-color-picker .dnn-color-sliders .dnn-color-s-b button{position:absolute;bottom:calc(50% - 4px);left:calc(50% - 4px);width:8px;height:8px;z-index:3;display:block;background:none;border:none;margin-left:-4px;margin-bottom:-4px;padding:7px;background-color:#fff;border-radius:50%}.dnn-color-picker .dnn-color-sliders .dnn-color-s-b button:before{content:\"\";position:absolute;top:-1px;left:-1px;border-radius:50%}.dnn-color-picker .dnn-color-sliders .dnn-color-s-b button:after{content:\"\";position:absolute;top:0px;left:0px;border-radius:50%;width:10px;height:10px;border:2px solid #ccc}.dnn-color-picker .dnn-color-sliders .dnn-color-bar{display:flex;align-items:center;margin-top:15px}.dnn-color-picker .dnn-color-sliders .dnn-color-bar .dnn-color-result{flex-direction:column;width:50px;height:50px;border-radius:50%;background:red}.dnn-color-picker .dnn-color-sliders .dnn-color-bar .dnn-color-hue{flex:auto;margin-left:10px;height:16px;border:1px solid #ccc;position:relative;background:linear-gradient(to right, #f00 0, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 84%, #f00 100%)}.dnn-color-picker .dnn-color-sliders .dnn-color-bar .dnn-color-hue button{width:10px;height:20px;position:absolute;top:-2px;left:calc(50% - 4px);border:0;padding:0;background-color:transparent;padding-left:-8px}.dnn-color-picker .dnn-color-sliders .dnn-color-bar .dnn-color-hue button:before{content:\"\";position:absolute;top:-2px;left:0px;border-radius:3px;width:100%;height:100%;border:1px solid #ccc;background-color:#fff}.dnn-color-picker .dnn-color-fields{display:flex;flex-direction:column;justify-content:space-between}.dnn-color-picker .dnn-color-fields .dnn-color-mode-switch{display:flex;align-items:flex-end;padding:0.5em}.dnn-color-picker .dnn-color-fields .dnn-color-mode-switch button{background-color:transparent;border:none}.dnn-color-picker .dnn-color-fields .dnn-color-mode-switch button svg{width:3em;height:3em;pointer-events:none;outline:none}.dnn-color-picker .dnn-color-fields .dnn-rgb-color-fields{display:flex;justify-content:space-evenly}.dnn-color-picker .dnn-color-fields .dnn-rgb-color-fields .dnn-rgb-color-field{display:flex;flex-direction:column;flex:auto;text-align:center;padding:0.5em}.dnn-color-picker .dnn-color-fields .dnn-rgb-color-fields .dnn-rgb-color-field label{padding-bottom:0.25em}.dnn-color-picker .dnn-color-fields .dnn-rgb-color-fields .dnn-rgb-color-field input{border-radius:var(--dnn-button-radius, 3px);border:1px solid #ccc;padding:0.5em;padding-left:1.3em;text-align:center}.dnn-color-picker .dnn-color-fields .dnn-rgb-color-fields .dnn-rgb-color-field input.red{border-color:red}.dnn-color-picker .dnn-color-fields .dnn-rgb-color-fields .dnn-rgb-color-field input.green{border-color:green}.dnn-color-picker .dnn-color-fields .dnn-rgb-color-fields .dnn-rgb-color-field input.blue{border-color:blue}.dnn-color-picker .dnn-color-fields .dnn-hsl-color-fields{display:flex;justify-content:space-evenly}.dnn-color-picker .dnn-color-fields .dnn-hsl-color-fields .dnn-hsl-color-field{display:flex;flex-direction:column;flex:auto;text-align:center;padding:0.5em}.dnn-color-picker .dnn-color-fields .dnn-hsl-color-fields .dnn-hsl-color-field label{padding-bottom:0.25em}.dnn-color-picker .dnn-color-fields .dnn-hsl-color-fields .dnn-hsl-color-field input{border-radius:var(--dnn-button-radius, 3px);border:1px solid #ccc;padding:0.5em;padding-left:1.3em;text-align:center}.dnn-color-picker .dnn-color-fields .dnn-hex-color-fields{display:flex;justify-content:space-evenly}.dnn-color-picker .dnn-color-fields .dnn-hex-color-fields .dnn-hex-color-field{display:flex;flex-direction:column;flex:auto;text-align:center;padding:0.5em}.dnn-color-picker .dnn-color-fields .dnn-hex-color-fields .dnn-hex-color-field label{padding-bottom:0.25em}.dnn-color-picker .dnn-color-fields .dnn-hex-color-fields .dnn-hex-color-field .hex-input{position:relative;border-radius:var(--dnn-button-radius, 3px);border:1px solid #ccc;padding:0.323em;text-align:center}.dnn-color-picker .dnn-color-fields .dnn-hex-color-fields .dnn-hex-color-field .hex-input input{border:0;padding:0;margin:0;width:100%;height:100%;text-align:center}.dnn-color-picker .dnn-color-fields .dnn-hex-color-fields .dnn-hex-color-field .hex-input button{position:absolute;height:100%;top:0;right:1em;background-color:transparent;border:0;padding:0;margin:0}.dnn-color-picker .dnn-color-fields .dnn-hex-color-fields .dnn-hex-color-field .hex-input button svg{min-width:1em}";

/** Reusable DNN UI component to pick a color
 * @copyright Copyright (c) .NET Foundation. All rights reserved.
 * @license MIT
 */
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
    else
        for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const DnnColorPicker = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.colorChanged = index.createEvent(this, "colorChanged", 7);
        /** Sets the initial color, must be a valid 8 character hexadecimal string without the # sign. */
        this.color = "FFFFFF";
        /** Sets the width-height ratio of the color picker saturation-lightness box.
         * @example 100% renders a perfect square
         */
        this.colorBoxHeight = "50%";
        this.rgbDisplay = "flex";
        this.hslDisplay = "none";
        this.hexDisplay = "none";
        this.focused = false;
        this.handleSaturationLightnessMouseDown = (e) => {
            e.preventDefault();
            this.handleDragLightnessSaturation(e);
            window.addEventListener('mousemove', this.handleDragLightnessSaturation);
            window.addEventListener('mouseup', this.handleSaturationLightnessMouseUp);
        };
        this.handleDragLightnessSaturation = (e) => {
            const rect = this.saturationLightnessBox.getBoundingClientRect();
            let x = e.clientX - rect.left;
            if (x < 0) {
                x = 0;
            }
            if (x > rect.width) {
                x = rect.width;
            }
            x = x / rect.width;
            let y = e.clientY - rect.top;
            if (y < 0) {
                y = 0;
            }
            if (y > rect.height) {
                y = rect.height;
            }
            y = 1 - (y / rect.height);
            const newColor = new ColorInfo();
            newColor.hue = this.currentColor.hue;
            newColor.saturation = x;
            newColor.lightness = y;
            this.currentColor = newColor;
        };
        this.handleSaturationLightnessMouseUp = () => {
            window.removeEventListener('mousemove', this.handleDragLightnessSaturation);
            window.removeEventListener('mouseup', this.handleSaturationLightnessMouseUp);
        };
        this.handleHueMouseDown = (e) => {
            e.preventDefault();
            this.handleDragHue(e);
            window.addEventListener('mousemove', this.handleDragHue);
            window.addEventListener('mouseup', this.handleHueMouseUp);
        };
        this.handleHueMouseUp = () => {
            window.removeEventListener('mousemove', this.handleDragHue);
            window.removeEventListener('mouseup', this.handleHueMouseUp);
        };
        this.handleDragHue = (e) => {
            const rect = this.hueRange.getBoundingClientRect();
            let x = e.clientX - rect.left;
            if (x < 0) {
                x = 0;
            }
            if (x > rect.width) {
                x = rect.width;
            }
            x = x / rect.width * 360;
            const newColor = new ColorInfo();
            newColor.hue = x;
            newColor.saturation = this.currentColor.saturation;
            newColor.lightness = this.currentColor.lightness;
            this.currentColor = newColor;
        };
        this.handleComponentValueChange = (e, channel) => {
            let value = parseInt(e.target.value);
            if (isNaN(value)) {
                return;
            }
            const newColor = new ColorInfo();
            if (value < 0) {
                value = 0;
            }
            if (value > 255) {
                value = 255;
            }
            let r = this.currentColor.red;
            let g = this.currentColor.green;
            let b = this.currentColor.blue;
            switch (channel) {
                case 'red':
                    r = value;
                    break;
                case 'green':
                    g = value;
                    break;
                case 'blue':
                    b = value;
                    break;
            }
            newColor.green = g;
            newColor.red = r;
            newColor.blue = b;
            this.currentColor = newColor;
        };
        this.handleHSLChange = (e, component) => {
            let value = parseInt(e.target.value);
            if (isNaN(value)) {
                return;
            }
            const newColor = new ColorInfo();
            if (value != null) {
                let h = this.currentColor.hue;
                let s = this.currentColor.saturation;
                let l = this.currentColor.lightness;
                switch (component) {
                    case "hue":
                        if (value < 0) {
                            value = 0;
                        }
                        if (value > 359) {
                            value = 0;
                        }
                        h = value;
                        break;
                    case "saturation":
                        if (value < 0) {
                            value = 0;
                        }
                        if (value > 100) {
                            value = 100;
                        }
                        s = value / 100;
                        break;
                    case "lightness":
                        if (value < 0) {
                            value = 0;
                        }
                        if (value > 100) {
                            value = 100;
                        }
                        l = value / 100;
                        break;
                }
                newColor.hue = h;
                newColor.saturation = s;
                newColor.lightness = l;
                this.currentColor = newColor;
            }
        };
        this.handleSaturationLightnessKeyDown = (e) => {
            let newColor = new ColorInfo();
            newColor.hue = this.currentColor.hue;
            newColor.saturation = this.currentColor.saturation;
            newColor.lightness = this.currentColor.lightness;
            let value = 0.01;
            if (e.shiftKey) {
                value = 0.1;
            }
            switch (e.key) {
                case "ArrowUp":
                    newColor.lightness += value;
                    break;
                case "ArrowDown":
                    newColor.lightness -= value;
                    break;
                case "ArrowLeft":
                    newColor.saturation -= value;
                    break;
                case "ArrowRight":
                    newColor.saturation += value;
                    break;
            }
            this.currentColor = newColor;
        };
        this.handleHueKeyDown = (e) => {
            let newColor = new ColorInfo();
            newColor.hue = this.currentColor.hue;
            newColor.saturation = this.currentColor.saturation;
            newColor.lightness = this.currentColor.lightness;
            let value = 1;
            if (e.shiftKey) {
                value = 10;
            }
            switch (e.key) {
                case "ArrowLeft":
                    newColor.hue -= value;
                    break;
                case "ArrowRight":
                    newColor.hue += value;
            }
            this.currentColor = newColor;
        };
    }
    colorChangedHandler(color) {
        this.colorChanged.emit(color);
    }
    handeCurrentColorChanged(newValue) {
        this.colorChangedHandler(newValue);
    }
    componentWillLoad() {
        this.handleHexChange(this.color);
    }
    componentDidLoad() {
        this.el.style.setProperty("--color-box-height", this.colorBoxHeight.toString());
    }
    getHex() {
        return this.getDoublet(this.currentColor.red) + this.getDoublet(this.currentColor.green) + this.getDoublet(this.currentColor.blue);
    }
    getContrast() {
        return this.currentColor.contrastColor;
    }
    getDoublet(value) {
        const valueString = value.toString(16).toUpperCase();
        if (valueString.length === 1) {
            return '0' + valueString;
        }
        return valueString;
    }
    handleHexChange(value) {
        const newColor = new ColorInfo();
        if (value.match(/^(?:[\da-f]{3}|[\da-f]{6})$/i).length > 0) {
            if (value.length === 3) {
                let expanded = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
                value = expanded;
            }
            newColor.red = parseInt(value.substr(0, 2), 16);
            newColor.green = parseInt(value.substr(2, 2), 16);
            newColor.blue = parseInt(value.substr(4, 2), 16);
        }
        else {
            newColor.red = this.currentColor.red;
            newColor.green = this.currentColor.green;
            newColor.blue = this.currentColor.blue;
        }
        this.currentColor = newColor;
    }
    switchColorMode(e) {
        switch (e.target.id) {
            case "rgb-switch":
                this.rgbDisplay = "none";
                this.hslDisplay = "none";
                this.hexDisplay = "flex";
                break;
            case "hex-switch":
                this.rgbDisplay = "none";
                this.hslDisplay = "flex";
                this.hexDisplay = "none";
                break;
            case "hsl-switch":
                this.rgbDisplay = "flex";
                this.hslDisplay = "none";
                this.hexDisplay = "none";
                break;
            default:
                this.rgbDisplay = "flex";
                this.hslDisplay = "none";
                this.hexDisplay = "none";
        }
    }
    render() {
        const hue = this.currentColor.hue;
        const saturation = this.currentColor.saturation;
        const lightness = this.currentColor.lightness;
        const red = this.currentColor.red;
        const green = this.currentColor.green;
        const blue = this.currentColor.blue;
        return (index.h(index.Host, { key: 'f908b04a53ce6599333a7794efb20bb2a65af251', tabIndex: this.focused ? -1 : 0, onFocus: () => this.saturationBrightnessButton.focus(), onBlur: () => this.saturationBrightnessButton.blur() }, index.h("div", { key: 'c4523480f16ebf5cfea121ac5d79c643a4e0c69e', class: "dnn-color-picker" }, index.h("div", { key: '83b8d5779d81296117903ac8e0379ab2f45c9231', class: "dnn-color-sliders" }, index.h("div", { key: '2de249d2eb985d1094066cf1fc263443090f01ce', class: "dnn-color-s-b", ref: (element) => this.saturationLightnessBox = element, style: { backgroundColor: `hsl(${hue},100%,50%)` }, onMouseDown: this.handleSaturationLightnessMouseDown.bind(this) }, index.h("button", { key: 'a80d2a3e40f688836ab882052f6ab65ac8a9b045', ref: el => this.saturationBrightnessButton = el, class: "dnn-s-b-picker", "aria-label": "Press up or down to adjust lightness, left or right to adjust saturation, hold shift to move by 10%", role: "slider", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuetext": `Saturation: ${Math.round(this.currentColor.saturation * 100)}%, Lightness: ${Math.round(this.currentColor.lightness * 100)}%`, style: {
                left: Math.round(saturation * 100) + "%",
                bottom: Math.round(lightness * 100) + "%"
            }, onKeyDown: e => this.handleSaturationLightnessKeyDown(e), onFocus: () => this.focused = true, onBlur: () => this.focused = false })), index.h("div", { key: 'e1e22edc8488004623ec8d87ec7258b47517037c', class: "dnn-color-bar" }, index.h("div", { key: '32205dfe097de2f4c71f1df2754eb9f8a2d6e7d9', class: "dnn-color-result", style: {
                backgroundColor: '#' + this.getHex(),
                boxShadow: "0 0 2px 1px " + "#" + this.getContrast()
            } }), index.h("div", { key: '08964c013a6769a395b5a845961f2ad1d6048dca', class: "dnn-color-hue", ref: (element) => this.hueRange = element, onMouseDown: this.handleHueMouseDown.bind(this) }, index.h("button", { key: 'ac7054bcb822e3517b3c44fcd2f7b9f7f2e4a72c', class: "dnn-hue-picker", "aria-label": "Press left or right to adjust hue, hold shift to move by 10 degrees", role: "slider", "aria-valuemin": "0", "aria-valuemax": "359", "aria-valuenow": Math.round(hue), style: { left: (hue / 359 * 100).toString() + "%" }, onKeyDown: (e) => this.handleHueKeyDown(e) })))), index.h("div", { key: '3374859dfa3b34cf237df1c814612614839aadea', class: "dnn-color-fields" }, index.h("div", { key: 'fe4046f3547b5251ca26a5b1cc29628c0630504f', class: "dnn-rgb-color-fields", style: { display: this.rgbDisplay } }, index.h("div", { key: 'ad2cf085848f5cf8552f17d37f798bae169081f8', class: "dnn-rgb-color-field" }, index.h("label", { key: '9e67bab0ea36a39abcf852ad3c2f527d28dc2471' }, "R"), index.h("input", { key: '2507e10e0fd6612b722659bc70da9b3ac6ac0276', type: "number", min: "0", max: "255", step: "1", class: "red", value: red, "aria-label": "red value", onChange: (e) => this.handleComponentValueChange(e, 'red') })), index.h("div", { key: '58d845aed33e870a6667fc31307f207bdf42734a', class: "dnn-rgb-color-field" }, index.h("label", { key: 'f36e027885207712c901a19a607ee31b57edcf45' }, "G"), index.h("input", { key: '03ce9f1ae4c37c311cf0b273884d7aa336914afb', type: "number", min: "0", max: "255", class: "green", value: green, "aria-label": "green value", onChange: (e) => this.handleComponentValueChange(e, 'green') })), index.h("div", { key: '9849f8b17444e0eb6b0f727a3f3a49ea6cbe9f98', class: "dnn-rgb-color-field" }, index.h("label", { key: '6434d5775c8b899e5cbdf79aaf1900e027739c16' }, "B"), index.h("input", { key: '0a88320ff47db01511bc7c48fd95f82d3a575947', type: "number", min: "0", max: "255", class: "blue", value: blue, "aria-label": "blue value", onChange: (e) => this.handleComponentValueChange(e, 'blue') })), index.h("div", { key: '2cafd9eb04193e0248c586d122693668d9a4abba', class: "dnn-color-mode-switch" }, index.h("button", { key: '107e1fb9b01f8f9447810de88a95f60e975bcee6', id: "rgb-switch", onClick: this.switchColorMode.bind(this), "aria-label": "switch to hexadecimal value entry" }, index.h("svg", { key: 'ac1611786d63808054037ef3c80578e2cdb86b96', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, index.h("path", { key: '6889b846dad41346d0fe0f4da46c0fbd738fc1c6', d: "M0 0h24v24H0z", fill: "none" }), index.h("path", { key: 'afece13ea369951f847eb277d03ba63ad568d85a', d: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" }))))), index.h("div", { key: '433bab4749873cece4786fc14ebf8dcaaa315586', class: "dnn-hsl-color-fields", style: { display: this.hslDisplay } }, index.h("div", { key: 'cb3443684a0630a674d2e6af6aa3719658126fe4', class: "dnn-hsl-color-field" }, index.h("label", { key: '6eb7a63d5a915919d45c585eca10766ac03bedce' }, "H"), index.h("input", { key: '8ebce2cd82de3f682f52cd9f851e37782567665d', type: "number", min: "0", max: "359", step: 1, value: Math.round(hue), "aria-label": "Hue", onChange: (e) => this.handleHSLChange(e, 'hue') })), index.h("div", { key: '88b1a0a344af2e4504ea86504cca3b0a0a877afb', class: "dnn-hsl-color-field" }, index.h("label", { key: '2b41a0003c2b7821eddac0719125e5f5df04f562' }, "S"), index.h("input", { key: 'd63cf42953ed94b472c7697f1c12e2274bb3da18', type: "number", min: "0", max: "100", step: 1, value: Math.round(saturation * 100), "aria-label": "Saturation", onChange: (e) => this.handleHSLChange(e, 'saturation') })), index.h("div", { key: '603aa4a11f53dcd81c9b1c65de6de0aafd9b5916', class: "dnn-hsl-color-field" }, index.h("label", { key: 'f1950202a61d91ff43c80df6241aacc1ee71c678' }, "L"), index.h("input", { key: '341b0079f8bf0bf8facc9d5d7be36c49972e976f', type: "number", min: "0", max: "100", step: 1, value: Math.round(lightness * 100), "aria-label": "Lightness", onChange: (e) => this.handleHSLChange(e, 'lightness') })), index.h("div", { key: 'bc8679b6d48eae8adabd3f27cd4fae63df20d415', class: "dnn-color-mode-switch" }, index.h("button", { key: 'c61834d10e93cce9d4475faf3f62fd72f977271c', id: "hsl-switch", onClick: this.switchColorMode.bind(this), "aria-label": "Switch to red, green, blue entry mode" }, index.h("svg", { key: '9139a6361b12820c47a2978fae13d4790667a5b9', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, index.h("path", { key: '1bbbc318c6691269fe88f8d94182566290487434', d: "M0 0h24v24H0z", fill: "none" }), index.h("path", { key: '5c86619418305089e5db2035b58a686a51a0d08f', d: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" }))))), index.h("div", { key: '0d8a617bee36c4887253f6653d0c8b986ac0b19b', class: "dnn-hex-color-fields", style: { display: this.hexDisplay } }, index.h("div", { key: '0f78740de447d7ffb74ea4560a21211e797bd424', class: "dnn-hex-color-field" }, index.h("label", { key: '7344acdb65b35cf50060b516c619ed896edd8f78' }, "HEX"), index.h("div", { key: '937978421c11afb45b482d39e218e5dd576f7c59', class: "hex-input" }, index.h("input", { key: 'd6d530cbf357c1b05c517823f7f339b0fabe6f93', type: "text", "aria-label": "Hexadecimal value", value: this.getHex(), onChange: e => this.handleHexChange(e.target.value) }), index.h("button", { key: '15a4c70cf71ac5030b1f955ff987d6524f523a04', class: "copy", "aria-label": "copy value" }, index.h("svg", { key: '49668dabf7a7a1461214b7686006c26e6aeaec91', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, index.h("path", { key: 'fcacb45fb8db45f3cd7d4c0a6d6014780188a82a', d: "M0 0h24v24H0z", fill: "none" }), index.h("path", { key: '41569930b5b3ae6d43de0438dcb15e24378bbed1', d: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" }))))), index.h("div", { key: 'b5d101d894b54e4f71c3d8790647cd88456edfac', class: "dnn-color-mode-switch" }, index.h("button", { key: '99fa128f296cd477f4c746ccfb2720c7852a8a28', id: "hex-switch", onClick: this.switchColorMode.bind(this), "aria-label": "Switch to hue saturation lightness values" }, index.h("svg", { key: '80a1c8189a305aed9142a435967390db1a147f09', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, index.h("path", { key: '00a595f9a95d749c6cf5c55d0906abbd016f3154', d: "M0 0h24v24H0z", fill: "none" }), index.h("path", { key: '51ef41e5b8beee6a566f145443c9f9fa8c5c2984', d: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" })))))))));
    }
    get el() { return index.getElement(this); }
    static get watchers() { return {
        "currentColor": ["handeCurrentColorChanged"]
    }; }
};
__decorate([
    debounce.Debounce(100)
], DnnColorPicker.prototype, "colorChangedHandler", null);
DnnColorPicker.style = dnnColorPickerCss;

const dnnTabCss = "";

const DnnTab = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
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
        return (index.h(index.Host, { key: 'f1753017740f4972aa6a05c603a0263543e28f21' }, this.visible &&
            index.h("slot", { key: '9da17b18540dab0ce7a0f23aebe00e488ee64539' })));
    }
};
DnnTab.style = dnnTabCss;

const dnnTabsCss = ":host{display:block;--color-background:var(--dnn-color-secondary-dark, lightgray);--color-text:var(--dnn-color-secondary-contrast, #333);--color-visible:var(--dnn-color-primary, #3792ED);--color-visible-text:var(--dnn-color-primary-contrast, #FFF);--color-focus:var(--dnn-color-primary, #3792ed)}.tabTitles{display:flex;background-color:var(--color-background)}.tabTitles button{cursor:pointer;padding:0.5rem 1rem;border:0;margin:0;background-color:transparent;color:var(--color-text)}.tabTitles button.visible{background-color:var(--color-visible);color:var(--color-visible-text)}.tabTitles button:focus-visible,.tabTitles button:hover{outline:none;box-shadow:0 0 2px 2px var(--color-focus)}.currentTab{border:1px solid var(--color-background)}";

const DnnTabs = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.tabTitles = [];
        this.selectedTabTitle = "";
    }
    componentDidLoad() {
        requestAnimationFrame(() => {
            this.updateTitles();
            this.showFirstTab();
        });
    }
    getTabs() {
        return this.component.shadowRoot.querySelector("slot").assignedElements();
    }
    updateTitles() {
        const tabs = this.getTabs();
        tabs.forEach(tab => this.tabTitles = [...this.tabTitles, tab.tabTitle]);
    }
    showFirstTab() {
        const tab = this.getTabs()[0];
        tab.show();
        this.selectedTabTitle = tab.tabTitle;
    }
    showTab(tabTitle) {
        const tabs = this.getTabs();
        tabs.forEach(tab => {
            if (tab.tabTitle == tabTitle) {
                tab.show();
                return;
            }
            tab.hide();
        });
        this.selectedTabTitle = tabTitle;
    }
    render() {
        return (index.h(index.Host, { key: '0539c6341025695a08f80819549740d7e0b7f528', ref: el => this.component = el }, index.h("div", { key: '4f40c443bf2d28f0b85fed38b2fbb896315ee2db', class: "tabTitles" }, this.tabTitles.map(tabTitle => index.h("button", { class: this.selectedTabTitle == tabTitle ? "visible" : "", onClick: () => this.showTab(tabTitle) }, tabTitle))), index.h("div", { key: '60dc98ad1393d011fb38e470a15770aee85a0226', class: "currentTab" }, index.h("slot", { key: '75cda75169225218cfd4e6f939fd43f43b8602ab' }))));
    }
};
DnnTabs.style = dnnTabsCss;

exports.dnn_button = DnnButton;
exports.dnn_color_picker = DnnColorPicker;
exports.dnn_tab = DnnTab;
exports.dnn_tabs = DnnTabs;
//# sourceMappingURL=dnn-button.dnn-color-picker.dnn-tab.dnn-tabs.entry.cjs.js.map
