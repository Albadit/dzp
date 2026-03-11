'use strict';

var index = require('./index-CoZy11qT.js');

const dnnSortIconCss = ":host{--color:#888;--color-sorted:var(--dnn-color-primary, rgb(2,139,255));--color-hover:var(--dnn-color-primary-light, #36a1ff);display:inline-block}button{cursor:pointer;outline:none;border:none;margin:0;padding:0;background-color:transparent;outline:none;display:inline-block;line-height:1em;position:relative;top:0.25em}button svg{height:1.5em;width:auto;fill:var(--color)}button.active svg{fill:var(--color-sorted)}button:hover svg,button:focus-visible svg{fill:var(--color-hover)}";

const DnnSortIcon = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.sortChanged = index.createEvent(this, "sortChanged", 7);
        /** Defines the current sort direction */
        this.sortDirection = "none";
        this.focused = false;
    }
    changeSort() {
        switch (this.sortDirection) {
            case "asc":
                this.sortDirection = "desc";
                break;
            case "desc":
                this.sortDirection = "asc";
                break;
            case "none":
                this.sortDirection = "asc";
                break;
        }
        this.sortChanged.emit(this.sortDirection);
    }
    render() {
        return (index.h(index.Host, { key: '65ef040e304f6a5296b8e97e365348aba01e05fd', tabIndex: this.focused ? -1 : 0, onFocus: () => this.button.focus(), onBlur: () => this.button.blur() }, index.h("button", { key: 'a69d64e0d6229b6365f3a739f2091bcc03846ece', ref: el => this.button = el, class: { "active": this.sortDirection != "none" }, onClick: () => this.changeSort(), onFocus: () => this.focused = true, onBlur: () => this.focused = false }, this.sortDirection == "none" &&
            index.h("svg", { key: 'c4f728e89eb6d7a4a4cf24a7546aff15f0190b89', xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 12 16" }, index.h("path", { key: '2dd7f732cdff8a657ae4bc1440e3fb559750d7fc', d: "M 0 7 H 12 L 6 0 Z M 0 9 H 12 L 6 16 Z" })), this.sortDirection == "asc" &&
            index.h("svg", { key: 'f1858da394bac3453ff97bc63a4d4f50c6d6f62a', xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 12 16" }, index.h("path", { key: '8e0b8442dfc610cfb1d966cd03ee35386f6507b5', d: "M 0 7 H 12 L 6 0 Z" })), this.sortDirection == "desc" &&
            index.h("svg", { key: 'bea8e991559951ff15374120af5429c7c661d7aa', xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 12 16" }, index.h("path", { key: '42e2146d8fc9579ac95b02d2268142f8a4f87a8e', d: "M 0 9 H 12 L 6 16 Z" })))));
    }
};
DnnSortIcon.style = dnnSortIconCss;

exports.dnn_sort_icon = DnnSortIcon;
//# sourceMappingURL=dnn-sort-icon.entry.cjs.js.map
