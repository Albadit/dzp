import { proxyCustomElement, HTMLElement, h, Host } from '@stencil/core/internal/client';

const dnnVerticalOverflowMenuCss = ":host{--background-color:var(--dnn-color-primary-contrast, white);--foreground-color:var(--dnn-color-primary, #3792ED);display:block}.menu-container{display:flex;justify-content:flex-start;align-items:center;background-color:var(--background-color)}.menu-container .menu{margin:0.5em;display:flex;gap:1em;justify-content:flex-start;align-items:center;white-space:nowrap;width:100%}.menu-container .overflow{margin-left:auto;position:relative}.menu-container .overflow button{cursor:pointer}.menu-container .overflow button svg{fill:var(--foreground-color)}.menu-container .overflow button{padding:0;margin:0;background-color:transparent;border:none}.menu-container .overflow .dropdown{position:absolute;display:flex;flex-direction:column;white-space:nowrap;right:0;transition:100ms ease-in-out;height:0;overflow:hidden}.menu-container .overflow .dropdown.visible{padding:1em;gap:0.5em;background-color:var(--background-color);box-shadow:2px 2px 4px rgba(0, 0, 0, 0.7)}";

const DnnVerticalOverflowMenu$1 = /*@__PURE__*/ proxyCustomElement(class DnnVerticalOverflowMenu extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.showDropdownButton = false;
        this.showDropdownMenu = false;
        this.previousMenuWidth = 0;
    }
    componentDidRender() {
        requestAnimationFrame(() => {
            this.moveItemsToDropDownIfNecessery();
            this.resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    if (entry.contentRect.width < this.previousMenuWidth) {
                        this.moveItemsToDropDownIfNecessery();
                    }
                    if (this.previousMenuWidth > 0 && entry.contentRect.width > this.previousMenuWidth) {
                        this.moveItemsToMenuIfPossible();
                    }
                    this.previousMenuWidth = entry.contentRect.width;
                }
            });
            this.resizeObserver.observe(this.element);
        });
    }
    moveItemsToDropDownIfNecessery() {
        const menuItems = Array.from(this.menu.querySelector("slot").assignedElements());
        const availableWidth = this.menu.getBoundingClientRect().width;
        let neededWidth = parseFloat(getComputedStyle(this.element).fontSize) * 2;
        menuItems.forEach(item => neededWidth += this.getFullWidth(item));
        neededWidth += (menuItems.length - 1) * parseFloat(getComputedStyle(this.element).fontSize);
        if (neededWidth > availableWidth) {
            this.showDropdownButton = true;
            var lastItem = menuItems[menuItems.length - 1];
            if (this.dropdown == undefined) {
                return;
            }
            lastItem.slot = "dropdown";
            this.moveItemsToDropDownIfNecessery();
        }
    }
    moveItemsToMenuIfPossible() {
        if (this.dropdown == undefined || !this.dropdown.hasChildNodes()) {
            return;
        }
        const menuItems = Array.from(this.menu.querySelector("slot").assignedElements());
        const availableWidth = this.menu.getBoundingClientRect().width;
        let neededWidth = parseFloat(getComputedStyle(this.element).fontSize) * 2;
        neededWidth += (menuItems.length - 1) * parseFloat(getComputedStyle(this.element).fontSize);
        menuItems.forEach(item => neededWidth += this.getFullWidth(item));
        const firstItem = this.dropdown.querySelector("slot").assignedElements()[0];
        if (firstItem != undefined) {
            neededWidth += this.getFullWidth(firstItem);
        }
        if (neededWidth < availableWidth) {
            if (firstItem != undefined) {
                firstItem.slot = "";
            }
            if (firstItem == undefined) {
                this.dropdown.classList.remove("visible");
                this.showDropdownMenu = false;
                this.showDropdownButton = false;
            }
        }
    }
    getFullWidth(item) {
        var width = item.getBoundingClientRect().width;
        var styles = getComputedStyle(item);
        width += parseFloat(styles.marginLeft);
        width += parseFloat(styles.marginRight);
        width += parseFloat(styles.paddingLeft);
        width += parseFloat(styles.paddingRight);
        return width;
    }
    toggleOverflowMenu() {
        this.showDropdownMenu = !this.showDropdownMenu;
        if (this.showDropdownMenu) {
            this.dropdown.classList.add("visible");
            let contentHeight = 0;
            const items = Array.from(this.dropdown.querySelector("slot").assignedElements());
            items.forEach(item => contentHeight += item.getBoundingClientRect().height);
            const emHeight = parseFloat(getComputedStyle(this.dropdown).fontSize);
            const gapsHeight = emHeight * (this.dropdown.children.length - 1) / 2;
            contentHeight += gapsHeight;
            const marginHeight = emHeight * 2;
            contentHeight += marginHeight;
            this.dropdown.style.height = `${contentHeight}px`;
            const dismissMenu = (e) => {
                const buttonRect = this.button.getBoundingClientRect();
                if (e.clientX < buttonRect.left ||
                    e.clientX > buttonRect.right ||
                    e.clientY < buttonRect.top ||
                    e.clientY > buttonRect.bottom) {
                    this.toggleOverflowMenu();
                }
                document.removeEventListener("click", dismissMenu);
            };
            setTimeout(() => {
                document.addEventListener("click", dismissMenu, false);
            }, 100);
        }
        else {
            this.dropdown.classList.remove("visible");
            this.dropdown.style.height = "0px";
        }
    }
    render() {
        return (h(Host, { key: '2364aa395039a41afab0bfee412f3d6233b19cdb' }, h("div", { key: '75668da9020f756b9744e71eb5c231d954e78331', class: "menu-container" }, h("div", { key: '36115df47584d24df883c8cc4db3016565c288bd', class: "menu", ref: el => this.menu = el }, h("slot", { key: '9b77dcb5d7f3cbb7ad0e523cfcc8e08298bdf1aa' })), this.showDropdownButton &&
            h("div", { key: '44d66e5f7678a0822e4a28a3174b824a4c035f10', class: "overflow" }, h("button", { key: '40247829bafed117a5ff180f87ec0a1b25477775', ref: el => this.button = el, class: "icon", onClick: () => this.toggleOverflowMenu() }, h("svg", { key: 'd0f7567401ac63e3f69d236fad1cfbc5c4ceaae0', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { key: '146a8994c8febbdd67ba5e1063af0045e8e3f523', d: "M0 0h24v24H0z", fill: "none" }), h("path", { key: '5b0e043b91068ca0a0be62571ef3249762a13bd8', d: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" }))), h("div", { key: '69318fbe2921e8f9c6f3e292e734e8f6a06a456b', class: "dropdown", ref: el => this.dropdown = el }, h("slot", { key: '5e9ce3e4d3ad7765f70423764d1cccf4f83ab034', name: "dropdown" }))))));
    }
    get element() { return this; }
    static get style() { return dnnVerticalOverflowMenuCss; }
}, [257, "dnn-vertical-overflow-menu", {
        "showDropdownButton": [32],
        "showDropdownMenu": [32]
    }]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-vertical-overflow-menu"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-vertical-overflow-menu":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnVerticalOverflowMenu$1);
            }
            break;
    } });
}

const DnnVerticalOverflowMenu = DnnVerticalOverflowMenu$1;
const defineCustomElement = defineCustomElement$1;

export { DnnVerticalOverflowMenu, defineCustomElement };
//# sourceMappingURL=dnn-vertical-overflow-menu.js.map

//# sourceMappingURL=dnn-vertical-overflow-menu.js.map