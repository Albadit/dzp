import { proxyCustomElement, HTMLElement, createEvent, h, Host } from '@stencil/core/internal/client';
import * as monaco from '@timkendrick/monaco-editor';

const dnnMonacoEditorCss = ".sc-dnn-monaco-editor-h{--monaco-editor-width:100%;--monaco-editor-height:50vh}.editor-container.sc-dnn-monaco-editor{width:var(--monaco-editor-width);height:var(--monaco-editor-height)}";

const DnnMonacoEditor$1 = /*@__PURE__*/ proxyCustomElement(class DnnMonacoEditor extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.contentChanged = createEvent(this, "contentChanged", 7);
        this.internals = this.attachInternals();
        /** Defines the language for the editor. */
        this.language = "html";
        /** Sets the code contained in the editor */
        this.value = "";
        this.focused = false;
    }
    languageChanged(newValue, oldValue) {
        if (newValue != oldValue) {
            monaco.editor.setModelLanguage(this.editor.getModel(), newValue);
        }
    }
    valueChanged(newValue, oldValue) {
        if (newValue != oldValue) {
            this.editor.setValue(newValue);
        }
    }
    componentDidLoad() {
        this.originalValue = this.value;
        this.editor = monaco.editor.create(this.editorContainer, {
            value: this.value,
            language: this.language,
            theme: "vs-dark",
            automaticLayout: true,
        });
        this.setFormValue();
        this.editor.onDidChangeModelContent(() => {
            this.value = this.editor.getValue();
            this.contentChanged.emit(this.value);
            this.setFormValue();
        });
        this.textArea = this.editorContainer.querySelector("textarea");
        this.textArea.addEventListener("focus", () => {
            this.focused = true;
        });
        this.textArea.addEventListener("blur", () => this.focused = false);
        this.textArea.addEventListener("focus", () => this.focused = true);
    }
    formResetCallback() {
        this.internals.setValidity({});
        this.value = this.originalValue;
        this.setFormValue();
    }
    focusElement() {
        var element = this.editorContainer.querySelector("textarea");
        element.focus();
    }
    setFormValue() {
        if (this.name != undefined) {
            var data = new FormData();
            data.append(this.name, this.value);
            this.internals.setFormValue(data);
        }
    }
    render() {
        return (h(Host, { key: '80e7a86ac6f01d6b264847dc83d0f0c82c430174', tabIndex: this.focused ? -1 : 0, onFocus: () => this.focusElement(), onBlur: () => this.textArea.blur() }, h("div", { key: 'de0de50626050cc130dee6ae0b2560f800ea70b3', class: "editor-container", ref: el => this.editorContainer = el })));
    }
    static get formAssociated() { return true; }
    static get watchers() { return {
        "language": ["languageChanged"],
        "value": ["valueChanged"]
    }; }
    static get style() { return dnnMonacoEditorCss; }
}, [322, "dnn-monaco-editor", {
        "language": [1],
        "value": [1025],
        "name": [1],
        "focused": [32]
    }, undefined, {
        "language": ["languageChanged"],
        "value": ["valueChanged"]
    }]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-monaco-editor"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-monaco-editor":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnMonacoEditor$1);
            }
            break;
    } });
}

const DnnMonacoEditor = DnnMonacoEditor$1;
const defineCustomElement = defineCustomElement$1;

export { DnnMonacoEditor, defineCustomElement };
//# sourceMappingURL=dnn-monaco-editor.js.map

//# sourceMappingURL=dnn-monaco-editor.js.map