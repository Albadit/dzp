import { r as registerInstance, c as createEvent, h, H as Host } from './index-BokBNxfI.js';
import * as monaco from '@timkendrick/monaco-editor';

const dnnMonacoEditorCss = ".sc-dnn-monaco-editor-h{--monaco-editor-width:100%;--monaco-editor-height:50vh}.editor-container.sc-dnn-monaco-editor{width:var(--monaco-editor-width);height:var(--monaco-editor-height)}";

const DnnMonacoEditor = class {
    constructor(hostRef) {
        registerInstance(this, hostRef);
        this.contentChanged = createEvent(this, "contentChanged", 7);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
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
};
DnnMonacoEditor.style = dnnMonacoEditorCss;

export { DnnMonacoEditor as dnn_monaco_editor };
//# sourceMappingURL=dnn-monaco-editor.entry.js.map
