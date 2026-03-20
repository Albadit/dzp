import { proxyCustomElement, HTMLElement, h, Host } from '@stencil/core/internal/client';

const dnnTabsCss = ":host{display:block;--color-background:var(--dnn-color-secondary-dark, lightgray);--color-text:var(--dnn-color-secondary-contrast, #333);--color-visible:var(--dnn-color-primary, #3792ED);--color-visible-text:var(--dnn-color-primary-contrast, #FFF);--color-focus:var(--dnn-color-primary, #3792ed)}.tabTitles{display:flex;background-color:var(--color-background)}.tabTitles button{cursor:pointer;padding:0.5rem 1rem;border:0;margin:0;background-color:transparent;color:var(--color-text)}.tabTitles button.visible{background-color:var(--color-visible);color:var(--color-visible-text)}.tabTitles button:focus-visible,.tabTitles button:hover{outline:none;box-shadow:0 0 2px 2px var(--color-focus)}.currentTab{border:1px solid var(--color-background)}";

const DnnTabs = /*@__PURE__*/ proxyCustomElement(class DnnTabs extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
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
        return (h(Host, { key: '0539c6341025695a08f80819549740d7e0b7f528', ref: el => this.component = el }, h("div", { key: '4f40c443bf2d28f0b85fed38b2fbb896315ee2db', class: "tabTitles" }, this.tabTitles.map(tabTitle => h("button", { class: this.selectedTabTitle == tabTitle ? "visible" : "", onClick: () => this.showTab(tabTitle) }, tabTitle))), h("div", { key: '60dc98ad1393d011fb38e470a15770aee85a0226', class: "currentTab" }, h("slot", { key: '75cda75169225218cfd4e6f939fd43f43b8602ab' }))));
    }
    static get style() { return dnnTabsCss; }
}, [257, "dnn-tabs", {
        "tabTitles": [32],
        "selectedTabTitle": [32]
    }]);
function defineCustomElement() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-tabs"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-tabs":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnTabs);
            }
            break;
    } });
}

export { DnnTabs as D, defineCustomElement as d };
//# sourceMappingURL=dnn-tabs2.js.map

//# sourceMappingURL=dnn-tabs2.js.map