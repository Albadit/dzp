import { proxyCustomElement, HTMLElement, createEvent, h, Host } from '@stencil/core/internal/client';
import { d as defineCustomElement$1 } from './dnn-modal2.js';

const dnnButtonCss = ":host{--background-color:transparent;--color:#333;--border-size:1px;--border-color:var(--backround-color);--border-radius:var(--dnn-controls-radius, 5px);--padding:var(--dnn-controls-padding, 5px);display:inline-block;width:auto}:host(.primary){--background-color:var(--dnn-color-primary, #3792ED);--color:var(--dnn-color-primary-contrast, white);--focus-color:var(--background-color)}:host(.primary.reversed){--background-color:var(--dnn-color-primary-contrast, white);--color:var(--dnn-color-primary, #3792ED);--border-color:var(--dnn-color-primary, #3792ED);--focus-color:var(--color)}:host(.secondary){--background-color:var(--dnn-color-secondary, #CCC);--color:var(--dnn-color-secondary-contrast, #222);--focus-color:var(--background-color)}:host(.secondary.reversed){--background-color:var(--dnn-color-secondary-contrast, #222);--color:var(--dnn-color-secondary, #CCC);--border-color:var(--dnn-color-secondary, #CCC);--focus-color:var(--color)}:host(.danger){--background-color:var(--dnn-color-danger, #dc3545);--color:var(--dnn-color-danger-contrast,white);--focus-color:var(--background-color)}:host(.danger.reversed){--background-color:var(--dnn-color-danger-contrast, white);--color:var(--dnn-color-danger, #dc3545);--border-color:var(--dnn-color-danger, #dc3545);--focus-color:var(--color)}:host(.tertiary){--background-color:var(--dnn-color-tertiary, #EAEAEA);--color:var(--dnn-color-tertiary-contrast, black);--focus-color:var(--background-color)}:host(.tertiary.reversed){--background-color:var(--dnn-color-tertiary-contrast, #333);--color:var(--dnn-color-tertiary, #EAEAEA);--border-color:var(--dnn-color-tertiary, #EAEAEA);--focus-color:var(--color)}:host(.hydrated) button{border:var(--border-size) solid var(--border-color);border-radius:var(--border-radius);padding:var(--padding) calc(var(--padding) * 2);background-color:transparent;background-color:var(--background-color);color:var(--color);outline:none}:host(.hydrated) button:focus-visible,:host(.hydrated) button:hover{box-shadow:0 0 2px 2px var(--focus-color)}:host(.disabled){position:relative;filter:saturate(0.5) opacity(0.7);pointer-events:all !important;box-shadow:none}:host(.disabled)::after{cursor:not-allowed;content:\"\";position:absolute;width:100%;height:100%;top:0px;left:0px}:host(.small) button{padding:calc(var(--padding) / 2) var(--padding);font-size:0.7em}:host(.large) button{padding:calc(var(--padding) * 1.5) calc(var(--padding) * 3);font-size:1.2em}button{height:100%;width:100%;cursor:pointer}";

const DnnButton = /*@__PURE__*/ proxyCustomElement(class DnnButton extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.confirmed = createEvent(this, "confirmed", 7);
        this.canceled = createEvent(this, "canceled", 7);
        this.internals = this.attachInternals();
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
        return (h(Host, { key: '2d3ec410a18888582d846d0e3306d1f95e7144e5', class: this.getElementClasses(), tabIndex: this.focused ? -1 : 0, onFocus: () => this.button.focus(), onBlur: () => this.button.blur() }, h("button", { key: '252d3528e68c0833a9d45e336563e70c13bf4267', ref: el => this.button = el, class: "button", onClick: () => this.handleClick(), disabled: this.disabled, onFocus: () => this.focused = true, onBlur: () => this.focused = false }, h("slot", { key: '9cfbe7a1cc15da1c8471e0641a82b1243114ad3f' })), this.confirm &&
            h("dnn-modal", { key: 'bd788c30986dfa0766d0ca21dbba502813f6548e', hideCloseButton: true, preventBackdropDismiss: true }, h("p", { key: '4ad7e6d564df45737e47c9e6e6e21fd763ec6128' }, this.confirmMessage), h("div", { key: '8243f08813c6e574fda8949382ee3f04932e1302', style: {
                    display: 'flex',
                    justifyContent: 'flex-end'
                } }, h("dnn-button", { key: 'cb0ec269ad877c15cebbc1d2248a1e76b37e89d9', appearance: 'primary', reversed: true, style: { margin: '5px' }, onClick: () => this.handleCancel() }, this.confirmNoText), h("dnn-button", { key: 'b5fa961a7f8b85d68132b440a12937d611d86eba', appearance: 'primary', style: { margin: '5px' }, onClick: () => this.handleConfirm() }, this.confirmYesText)))));
    }
    static get formAssociated() { return true; }
    get el() { return this; }
    static get style() { return dnnButtonCss; }
}, [321, "dnn-button", {
        "appearance": [1],
        "type": [1],
        "formButtonType": [1, "form-button-type"],
        "reversed": [4],
        "size": [1],
        "confirm": [4],
        "confirmYesText": [1, "confirm-yes-text"],
        "confirmNoText": [1, "confirm-no-text"],
        "confirmMessage": [1, "confirm-message"],
        "disabled": [4],
        "focused": [32],
        "modalVisible": [32]
    }]);
function defineCustomElement() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-button", "dnn-button", "dnn-modal"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-button":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnButton);
            }
            break;
        case "dnn-button":
            if (!customElements.get(tagName)) {
                defineCustomElement();
            }
            break;
        case "dnn-modal":
            if (!customElements.get(tagName)) {
                defineCustomElement$1();
            }
            break;
    } });
}

export { DnnButton as D, defineCustomElement as d };
//# sourceMappingURL=dnn-button2.js.map

//# sourceMappingURL=dnn-button2.js.map