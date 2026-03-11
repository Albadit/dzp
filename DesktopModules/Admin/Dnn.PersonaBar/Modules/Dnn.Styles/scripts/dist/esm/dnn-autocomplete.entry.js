import { r as registerInstance, c as createEvent, h, H as Host, g as getElement } from './index-BokBNxfI.js';
import { D as Debounce } from './debounce-DI6iaKDl.js';

const dnnAutocompleteCss = ":host{display:inline-block;--foreground-color:var(--dnn-color-foreground, #000);--background-color:var(--dnn-color-background, #fff);--focus-color:var(--dnn-color-primary, #3792ED);--danger-color:var(--dnn-color-danger, #900);--control-radius:var(--dnn-controls-radius, 3px)}dnn-fieldset{width:100%}@keyframes shift{0%{background-position:0% 0}50%{background-position:100% 0}100%{background-position:200% 0}}.inner-container{display:flex;justify-content:space-between;position:relative;width:100%}.inner-container input{border:none;outline:none;background-color:transparent;color:var(--foreground-color);text-align:var(--input-text-align);width:100%}.inner-container svg.chevron-down{height:1rem;width:auto;transform:scale(1.2);fill:var(--foreground-color);cursor:pointer}.inner-container ul{position:absolute;border:1px solid lightgray;margin:0;padding:var(--dnn-controls-radius, 3px) 0;overflow-y:auto;width:100%;box-shadow:2px 2px 6px 1px rgba(0, 0, 0, 0.3);background-color:var(--dnn-color-background, white);border-radius:var(--dnn-controls-radius, 3px);z-index:2;display:none;scroll-behavior:smooth}.inner-container ul.show{display:block}.inner-container ul li{display:block;list-style-type:none;cursor:pointer;padding:0 0.5rem}.inner-container ul li.selected{background-color:lightgray}.inner-container ul li:hover{background-color:lightgray}.inner-container ul .loading{width:100%;height:0.5rem;border-radius:0.5rem;background:linear-gradient(to right, var(--background-color) 0%, var(--foreground-color) 50%, var(--background-color) 100%);background-size:200% 100%;animation:shift 2s linear infinite;width:75%;margin:0 auto;opacity:0.5}dnn-fieldset{--fieldset-foreground-color:var(--foreground-color);--fieldset-background-color:var(--background-color);--fieldset-focus-color:var(--focus-color);--fieldset-danger-color:var(--danger-color);--fieldset-control-radius:var(--control-radius)}svg.error{fill:red;width:1em;height:1em;transform:scale(1.5);margin-right:0.5em}";

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
const DnnAutocomplete = class {
    constructor(hostRef) {
        registerInstance(this, hostRef);
        this.valueChange = createEvent(this, "valueChange", 7);
        this.valueInput = createEvent(this, "valueInput", 7);
        this.needMoreItems = createEvent(this, "needMoreItems", 7);
        this.searchQueryChanged = createEvent(this, "searchQueryChanged", 7);
        this.itemSelected = createEvent(this, "itemSelected", 7);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
        /** Defines the value for this autocomplete */
        this.value = "";
        /** Sets the list of suggestions. */
        this.suggestions = [];
        /** How many suggestions to preload in pixels of their height.
        * This is used to calculate the virtual scroll height and request
        * more items before they get into view.
        */
        this.preloadThresholdPixels = 1000;
        /** Defines the type of automatic completion the browser could use.
        * See https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
        */
        this.autocomplete = "off";
        this.focused = false;
        this.valid = true;
        this.positionInitialized = false;
        this.lastScrollTop = 0;
        this.displayValue = "";
        this.adjustDropdownPosition = () => {
            var itemHeight = this.findAverageSuggestionHeight();
            requestAnimationFrame(() => {
                this.positionInitialized = true;
            });
            // If we can fit 3 items below the input and there is still 3em left, we show the dropdown under.
            // Otherwise, we show it above.
            var spaceBelow = window.innerHeight - this.inputField.getBoundingClientRect().bottom;
            const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
            const fitsDown = spaceBelow > 3 * itemHeight + 3 * rem;
            if (fitsDown) {
                this.suggestionsContainer.style.top = "1.2rem";
            }
            else {
                this.suggestionsContainer.style.bottom = "1.2rem";
            }
            // Set the max height to not overflow the screen.
            if (fitsDown) {
                this.suggestionsContainer.style.maxHeight = `${spaceBelow - 3 * rem}px`;
            }
            else {
                this.suggestionsContainer.style.maxHeight = `${this.inputField.getBoundingClientRect().top - 3 * rem}px`;
            }
            this.checkIfMoreItemsNeeded();
        };
    }
    /** Reports the input validity details. See https://developer.mozilla.org/en-US/docs/Web/API/ValidityState */
    async checkValidity() {
        var validity = this.inputField.checkValidity();
        if (!validity) {
            this.fieldset.setValidity(false, this.inputField.validationMessage);
        }
        this.fieldset.setValidity(true, "");
        this.valid = validity;
        this.internals.setValidity(this.inputField.validity, this.inputField.validationMessage);
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
    handleValueChange(newValue) {
        this.displayValue = newValue;
        // Find the index of the selected item
        this.selectedIndex = this.suggestions.findIndex(s => s.value === newValue);
    }
    /** Listener for mouse down event */
    handleClick(e) {
        const path = e.composedPath();
        if (!path.includes(this.element)) {
            this.focused = false;
        }
    }
    componentDidRender() {
        if (this.focused && this.suggestions.length > 0 && !this.positionInitialized) {
            this.adjustDropdownPosition();
        }
    }
    formResetCallback() {
        this.inputField.setCustomValidity("");
        this.valid = true;
        this.value = "";
        this.internals.setValidity({});
        this.internals.setFormValue("");
    }
    handleInput(e) {
        const inputValue = e.target.value;
        this.displayValue = inputValue;
        this.value = inputValue;
        var valid = this.inputField.checkValidity();
        this.valid = valid;
        this.valueInput.emit(inputValue);
        this.handleSearchQueryChanged(inputValue);
    }
    handleSearchQueryChanged(value) {
        this.searchQueryChanged.emit(value);
    }
    handleInvalid() {
        this.valid = false;
        if (this.customValidityMessage == undefined) {
            this.customValidityMessage = this.inputField.validationMessage;
        }
        this.fieldset.setValidity(false, this.inputField.validationMessage);
        this.internals.setValidity(this.inputField.validity, this.inputField.validationMessage);
    }
    handleChange() {
        this.valueChange.emit(this.value);
        if (this.name != undefined) {
            var data = new FormData();
            data.append(this.name, this.value);
            this.internals.setFormValue(data);
        }
    }
    /** Check if the label should float */
    shouldLabelFloat() {
        if (this.focused) {
            return false;
        }
        if (this.value != "") {
            return false;
        }
        return true;
    }
    findAverageSuggestionHeight() {
        const suggestionItems = this.suggestionsContainer.querySelectorAll("li");
        var totalHeight = 0;
        for (let i = 0; i < suggestionItems.length; i++) {
            totalHeight += suggestionItems[i].clientHeight;
        }
        return totalHeight / suggestionItems.length;
    }
    handleKeyDown(e) {
        var _a;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (this.selectedIndex == undefined) {
                this.selectedIndex = 0;
            }
            else {
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
            }
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (this.selectedIndex == undefined) {
                this.selectedIndex = this.suggestions.length - 1;
            }
            else {
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            }
        }
        this.value = this.selectedIndex == undefined ? this.value : (_a = this.suggestions[this.selectedIndex]) === null || _a === void 0 ? void 0 : _a.value;
        if (e.key === "Enter") {
            if (this.selectedIndex != undefined) {
                var selectedItem = this.suggestions[this.selectedIndex];
                this.value = selectedItem.value;
                this.inputField.value = selectedItem.label;
                this.itemSelected.emit(selectedItem.value);
                this.focused = false;
            }
        }
        if (e.key === "Tab") {
            this.focused = false;
        }
    }
    selectItem(e, index) {
        e.preventDefault();
        e.stopPropagation();
        this.selectedIndex = index;
        this.value = this.suggestions[this.selectedIndex].value;
        this.displayValue = this.suggestions[this.selectedIndex].label;
        this.inputField.value = this.displayValue;
        this.checkValidity();
        this.focused = false;
        this.itemSelected.emit(this.suggestions[this.selectedIndex].value);
    }
    getVirtualScrollHeight() {
        const itemHeight = this.findAverageSuggestionHeight();
        const upcomingItems = (this.totalSuggestions || NaN) - this.suggestions.length;
        return itemHeight * upcomingItems;
    }
    handleDropdownClick() {
        this.handleSearchQueryChanged(this.value);
    }
    handleSuggestionsScroll() {
        const container = this.suggestionsContainer;
        const currentScrollTop = container.scrollTop;
        // Only act if we are scrolling down
        if (currentScrollTop > this.lastScrollTop) {
            const loadingDiv = container.querySelector('.loading');
            if (loadingDiv == undefined) {
                this.lastScrollTop = currentScrollTop;
                return;
            }
            const loadingDivPosition = loadingDiv.offsetTop;
            const loadingDivHeight = loadingDiv.offsetHeight;
            const loadingDivBottom = loadingDivPosition + loadingDivHeight;
            // Calculate the visible bottom of the scroll container
            const visibleBottom = currentScrollTop + container.clientHeight;
            // Prevent scrolling past the loading div by checking if the visible bottom surpasses the loading div's bottom
            if (visibleBottom > loadingDivBottom) {
                // Adjust scrollTop so it doesn't scroll past the loading div
                container.scrollTop = loadingDivBottom - container.clientHeight;
            }
            // Check if more items are needed based on the position of the loading div
            this.checkIfMoreItemsNeeded();
        }
        // Update the last scroll position
        this.lastScrollTop = currentScrollTop;
    }
    checkIfMoreItemsNeeded() {
        const container = this.suggestionsContainer;
        const loadingDiv = container.querySelector('.loading');
        if (loadingDiv == undefined)
            return; // Exit if there's no loading div
        const scrollPosition = container.scrollTop + container.clientHeight;
        const loadingDivPosition = loadingDiv.offsetTop;
        // Check if the loading div is within the threshold of becoming visible
        if (loadingDivPosition - scrollPosition < this.preloadThresholdPixels) {
            const eventArgs = {
                searchTerm: this.inputField.value,
            };
            this.needMoreItems.emit(eventArgs);
        }
    }
    handleBlur() {
        var validity = this.inputField.checkValidity();
        this.valid = validity;
        this.fieldset.setValidity(validity, this.inputField.validationMessage);
        this.internals.setValidity(this.inputField.validity, this.inputField.validationMessage);
    }
    render() {
        var _a;
        return (h(Host, { key: '1e292d089aaa274d1aa4b9898bd0d9d15b7d6d70', tabIndex: this.focused ? -1 : 0, onFocus: () => this.inputField.focus(), onBlur: () => this.inputField.blur() }, h("dnn-fieldset", { key: 'd70181acb451533a2ecb842b16bb9a1f4786d5e5', ref: el => this.fieldset = el, invalid: !this.valid, focused: this.focused, label: `${(_a = this.label) !== null && _a !== void 0 ? _a : ""}${this.required ? " *" : ""}`, helpText: this.helpText, id: this.labelId, disabled: this.disabled, floatLabel: this.shouldLabelFloat() }, h("div", { key: 'b91badc6ea15ecaeeb7b8f24383b8dbc7eeb1ceb', class: "inner-container" }, h("input", { key: 'e2dd5f4e2179dc5d61e6e5faf5f62bfac8e96ae1', ref: (el) => this.inputField = el, name: this.name, type: "search", role: "combobox", "aria-haspopup": "listbox", "aria-expanded": this.focused.toString(), "aria-activedescendant": this.selectedIndex !== undefined ? `option-${this.selectedIndex}` : undefined, disabled: this.disabled, required: this.required, autoComplete: this.autocomplete, value: this.displayValue, onFocus: () => {
                this.searchQueryChanged.emit(this.value);
                this.focused = true;
            }, onBlur: () => this.handleBlur(), onInput: e => this.handleInput(e), onInvalid: () => this.handleInvalid(), onChange: () => this.handleChange(), "aria-labelledby": this.labelId, onKeyDown: e => this.handleKeyDown(e) }), !this.valid &&
            h("svg", { key: 'c5678ec6aebde3e12654d23996f5e7800a44011d', xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960", class: "error" }, h("path", { key: 'e3d61322deab9289f34f64f03dbda93721334f3b', d: "M479.982-280q14.018 0 23.518-9.482 9.5-9.483 9.5-23.5 0-14.018-9.482-23.518-9.483-9.5-23.5-9.5-14.018 0-23.518 9.482-9.5 9.483-9.5 23.5 0 14.018 9.482 23.518 9.483 9.5 23.5 9.5ZM453-433h60v-253h-60v253Zm27.266 353q-82.734 0-155.5-31.5t-127.266-86q-54.5-54.5-86-127.341Q80-397.681 80-480.5q0-82.819 31.5-155.659Q143-709 197.5-763t127.341-85.5Q397.681-880 480.5-880q82.819 0 155.659 31.5Q709-817 763-763t85.5 127Q880-563 880-480.266q0 82.734-31.5 155.5T763-197.684q-54 54.316-127 86Q563-80 480.266-80Zm.234-60Q622-140 721-239.5t99-241Q820-622 721.188-721 622.375-820 480-820q-141 0-240.5 98.812Q140-622.375 140-480q0 141 99.5 240.5t241 99.5Zm-.5-340Z" })), h("ul", { key: '46bf9ea05343a94b1bef9fabbed0e4f31536952d', class: this.focused && this.suggestions.length > 0 ? "show" : "", role: "listbox", ref: el => this.suggestionsContainer = el, onScroll: () => this.handleSuggestionsScroll() }, this.suggestions.map((suggestion, index) => (h("li", { id: `option-${index}`, role: "option", "aria-selected": this.selectedIndex == index, class: this.selectedIndex == index ? "selected" : "", onClick: e => this.selectItem(e, index) }, this.renderSuggestion != undefined ? this.renderSuggestion(suggestion) : suggestion.label))), this.totalSuggestions != undefined && this.totalSuggestions > this.suggestions.length &&
            h("div", { key: '6a0e9fc2f6dbbb0e7333631d60e131aa3e24ed05', class: "loading" }), this.totalSuggestions != undefined && this.totalSuggestions > this.suggestions.length && this.positionInitialized &&
            h("div", { key: '5b5195357e3f0f257837485dd08e487f3302830e', style: { height: `${this.getVirtualScrollHeight()}px` } })), h("svg", { key: '6add57764f3df4fde8d95fc049e1e1f9a03afb96', onClick: () => this.handleDropdownClick(), class: "chevron-down", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960" }, h("path", { key: '2f25891e79ba26598884234386e6b57612741c48', d: "M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z" }))))));
    }
    static get formAssociated() { return true; }
    get element() { return getElement(this); }
    static get watchers() { return {
        "value": ["handleValueChange"]
    }; }
};
__decorate([
    Debounce(300)
], DnnAutocomplete.prototype, "handleSearchQueryChanged", null);
__decorate([
    Debounce(100)
], DnnAutocomplete.prototype, "handleSuggestionsScroll", null);
__decorate([
    Debounce()
], DnnAutocomplete.prototype, "checkIfMoreItemsNeeded", null);
DnnAutocomplete.style = dnnAutocompleteCss;

export { DnnAutocomplete as dnn_autocomplete };
//# sourceMappingURL=dnn-autocomplete.entry.js.map
