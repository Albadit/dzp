'use strict';

var index = require('./index-CoZy11qT.js');

const dnnChevronCss = ":host{display:inline-block}button{cursor:pointer;border:none;padding:0px;margin:0px;min-width:15px;min-height:15px;display:flex;justify-content:center;align-items:center;background-color:transparent}svg{height:2em;width:2em;transition:all 300ms ease-in-out}button:focus-visible svg,button:hover svg{color:var(--dnn-color-primary)}:host([expanded]) svg{transform:rotate(90deg)}";

const DnnChevron = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.changed = index.createEvent(this, "changed", 7);
        /** Expand text for screen readers */
        this.expandText = "expand";
        /** Collapse text for screen readers */
        this.collapseText = "collapse";
        /** Is the chevron expanded */
        this.expanded = false;
    }
    handleExpandedChanged(newValue) {
        this.changed.emit(newValue);
    }
    render() {
        return (index.h(index.Host, { key: 'c001180e714b5e803f196d4832ac9d7f77afe1dc', tabIndex: this.focused ? -1 : 0, onFocus: () => this.button.focus(), onBlur: () => this.button.blur() }, index.h("button", { key: '9fabb0018d815619edf0c38d6c41651a900e8115', ref: el => this.button = el, "aria-label": this.expanded ? this.collapseText : this.expandText, onClick: () => this.expanded = !this.expanded, onFocus: () => this.focused = true, onBlur: () => this.focused = false }, index.h("svg", { key: '8258366e1e45ded06aa6127ebe2cfb8ef66d509b', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, index.h("path", { key: '9360e6ed6aa20d3b7aaa1d6162948319231d255e', d: "M0 0h24v24H0z", fill: "none" }), index.h("path", { key: 'c116570891918f909e50bc14e8a26fe00913c8be', d: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" })))));
    }
    static get watchers() { return {
        "expanded": ["handleExpandedChanged"]
    }; }
};
DnnChevron.style = dnnChevronCss;

exports.dnn_chevron = DnnChevron;
//# sourceMappingURL=dnn-chevron.entry.cjs.js.map
