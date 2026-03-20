import { r as registerInstance, c as createEvent, h, H as Host, g as getElement } from './index-BokBNxfI.js';

const dnnCheckboxCss = ":host{--focus-color:var(--dnn-color-primary, #3792ED);display:inline-flex;align-items:center;gap:0.25rem;margin:3px}button{cursor:pointer;background-color:transparent;border:0;padding:0;margin:0;outline:none;display:flex;justify-content:center;align-items:center}button .unchecked,button .checked,button .intermediate{display:none}button.checked .checked,button.unchecked .unchecked,button.intermediate .intermediate{display:block}button svg.undefined{opacity:0.45;cursor:default}button:focus-visible{box-shadow:0 0 2px 2px var(--focus-color)}button.invalid{border:2px solid var(--dnn-color-danger)}label{cursor:pointer}";

const DnnCheckbox = class {
    constructor(hostRef) {
        registerInstance(this, hostRef);
        this.checkedchange = createEvent(this, "checkedchange", 7);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
        /** Defines if the checkbox is checked (true) or unchecked (false) or in an intermediate state (undefined) */
        this.checked = "unchecked";
        /** Defines if clicking the checkbox will go through the intermediate state between checked and unchecked (tri-state) */
        this.useIntermediate = false;
        /** The value for this checkbox (not to be confused with its checked state). */
        this.value = "on";
        /** The name to show in the formData (if using forms). */
        this.name = "";
        /** If true, the checkbox needs to be checked for the form validation to succeed. */
        this.required = false;
        /** A function that will be called when the checkbox needs to change state and returns the next state.
         * Can be used to customize the order of the states when the component is clicked.
         * Only called if you also use the tri-state feature (useIntermediate).
         */
        this.nextStateHandler = (currentState) => this.defaultNextStateHandler(currentState);
        /** Can be used to customize the validation message when the field is required but not checked. */
        this.requiredMessage = "The checkbox must be checked";
        this.focused = false;
        this.valid = true;
    }
    handleClick() {
        this.changeState();
    }
    /** Reports the input validity details. See https://developer.mozilla.org/en-US/docs/Web/API/ValidityState */
    async checkValidity() {
        if (this.required && this.checked != "checked") {
            this.valid = false;
        }
        if (!this.valid) {
            this.internals.setValidity({ valueMissing: true }, this.requiredMessage);
        }
        return this.internals.validity;
    }
    componentWillLoad() {
        this.originalChecked = this.checked;
        this.internals.setFormValue(this.checked);
    }
    handleCheckedChange(newValue, oldValue) {
        if (newValue !== oldValue && this.checked == "checked") {
            var data = new FormData();
            data.append(this.name, this.value);
            this.internals.setFormValue(data);
            this.internals.setValidity({});
            this.valid = true;
        }
        if (newValue != "checked" && this.required) {
            this.valid = false;
            this.internals.setValidity({ valueMissing: true }, this.requiredMessage);
        }
    }
    formResetCallback() {
        this.internals.setValidity({});
        this.checked = this.originalChecked;
    }
    defaultNextStateHandler(currentState) {
        switch (currentState) {
            case "checked":
                return "intermediate";
            case "intermediate":
                return "unchecked";
            case "unchecked":
                return "checked";
        }
    }
    changeState() {
        if (!this.useIntermediate) {
            switch (this.checked) {
                case "checked":
                    this.checked = "unchecked";
                    break;
                case "unchecked":
                case "intermediate":
                    this.checked = "checked";
                    break;
            }
            this.checkedchange.emit(this.checked);
            return;
        }
        this.checked = this.nextStateHandler(this.checked);
        this.checkedchange.emit(this.checked);
    }
    getButtonClasses() {
        let classes = `icon ${this.checked}`;
        if (!this.valid) {
            classes += " invalid";
        }
        return classes;
    }
    render() {
        return (h(Host, { key: '49b2d5869f04de1a9944fb564dc4412ac9f10e4d', tabIndex: this.focused ? -1 : 0, onFocus: () => this.button.focus(), onBlur: () => this.button.blur() }, h("button", { key: '8b2429b3d910ff34aa62bd09aa64044f38356fc7', ref: el => this.button = el, onFocus: () => this.focused = true, onBlur: () => this.focused = false, class: this.getButtonClasses() }, h("div", { key: '19ad9e0263b892dbc4a82e9fc415b9653a73bd4b', class: "unchecked" }, h("slot", { key: '94e37e53bbe5edb6f58621e69107218be8d1ad07', name: "uncheckedicon" }, h("svg", { key: '548f8bc35a5c5d733ba9f9ed8612522879b24f3e', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { key: '9478741e09aceb96d68e8aa5111287b9fc940472', d: "M0 0h24v24H0z", fill: "none" }), h("path", { key: '56b4bb4262e5e9d10d9174c0cad44ff61eba1741', d: "M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" })))), h("div", { key: '532c59227a1c24e6129cc4a755c63b3e33d335a4', class: "checked" }, h("slot", { key: 'd06a535e89b8e280ca22739091a76de0827c0f32', name: "checkedicon" }, h("svg", { key: '2d896ae0582821c8ca47cc113accd9e8e6389f9f', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { key: '563b605e835d9ec257b9e350021a90eff79fcc58', d: "M0 0h24v24H0z", fill: "none" }), h("path", { key: '5c922a9869dac44d8c994f20f03012bb14df60f2', d: "M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" })))), h("div", { key: 'dce07e94818fcd15cb06f895f3310830e56f5f03', class: "intermediate" }, h("slot", { key: '479043ee32c0c953a2d0c13beea1f83aafad3c12', name: "intermediateicon" }, h("svg", { key: 'd67fc1226be45932ab0604818aee417ed18d503d', class: "undefined", xmlns: "http://www.w3.org/2000/svg", "enable-background": "new 0 0 24 24", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("g", { key: 'a12a7bad9f8f497e8bee3e28bb65b633c77ceaf2' }, h("rect", { key: 'e520a504f3413b3a37ec2ce9f43d83718597a0ed', fill: "none", height: "24", width: "24" })), h("g", { key: '5fc329fb565b4ac5d0d1abd3d397abe44d77692c' }, h("g", { key: '56812a73ece958c4d9a4d2c39f3e6e86abed7329' }, h("g", { key: '2f2dfa3ccd2d9775bdc54082fb760dac9c65287c' }, h("path", { key: 'e3d7949eaf391241f2ee822898ec30bd1e7576a8', d: "M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M17,13H7v-2h10V13z" }))))))))));
    }
    static get formAssociated() { return true; }
    get el() { return getElement(this); }
    static get watchers() { return {
        "checked": ["handleCheckedChange"]
    }; }
};
DnnCheckbox.style = dnnCheckboxCss;

const dnnSearchboxCss = ":host{position:relative;display:flex;justify-content:space-between;--background-color:transparent;--color:#333;--border-size:1px;--border-color:grey;--border-active-color:black;--border-radius:var(--dnn-controls-radius, 5px);--padding:var(--dnn-controls-padding, 5px);--focus-color:var(--dnn-color-primary, blue)}:host input{width:100%;border:var(--border-size) solid var(--border-color);outline:none;border-radius:var(--border-radius);padding:var(--padding);padding-right:32px;transition:all 300ms ease-in-out}:host input:focus-visible,:host input:hover{outline:none;box-shadow:0 0 2px 2px var(--focus-color)}:host svg{position:absolute;top:0;right:0;height:100%;transform:scale(0.7);fill:var(--color);outline:var(--color);color:var(--color);transition:all 300ms ease-in-out}:host button{background:transparent;border:0;margin:0;padding:0}:host button:focus-visible svg,:host button:hover svg{fill:var(--focus-color);outline:var(--focus-color);color:var(--focus-color)}";

const DnnSearchbox = class {
    constructor(hostRef) {
        registerInstance(this, hostRef);
        this.queryChanged = createEvent(this, "queryChanged", 7);
        /**
         * Sets the field placeholder text.
         */
        this.placeholder = "";
        /**
         * How many milliseconds to wait before firing the queryChanged event.
         */
        this.debounceTime = 500;
        /** Sets the query */
        this.query = "";
        this.debounceTimer = null;
    }
    handleQueryChanged() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.queryChanged.emit(this.query);
        }, this.debounceTime);
    }
    render() {
        return (h(Host, { key: 'a3153c12892f7f8c11f19021b812fd3a419ff1fb', tabIndex: this.focused ? -1 : 0, onFocus: () => this.inputField.focus(), onBlur: () => this.inputField.blur() }, h("input", { key: '76e5e3ad7489f9ba04fff4fad32b076326535c22', ref: el => this.inputField = el, type: "text", value: this.query, placeholder: this.placeholder, onInput: e => this.query = e.target.value, onFocus: () => this.focused = true, onBlur: () => this.focused = false }), this.query !== "" ?
            h("button", { class: "svg clear", onClick: () => this.query = "" }, h("svg", { xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { d: "M0 0h24v24H0z", fill: "none" }), h("path", { d: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" })))
            :
                h("svg", { xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { d: "M0 0h24v24H0z", fill: "none" }), h("path", { d: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" }))));
    }
    static get watchers() { return {
        "query": ["handleQueryChanged"]
    }; }
};
DnnSearchbox.style = dnnSearchboxCss;

export { DnnCheckbox as dnn_checkbox, DnnSearchbox as dnn_searchbox };
//# sourceMappingURL=dnn-checkbox.dnn-searchbox.entry.js.map
