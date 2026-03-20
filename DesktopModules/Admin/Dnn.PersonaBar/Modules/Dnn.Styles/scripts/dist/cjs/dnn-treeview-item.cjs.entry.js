'use strict';

var index = require('./index-CoZy11qT.js');

const dnnTreeviewItemCss = ":host{display:flex;overflow:visible}.expander{width:24px;height:24px}.expander button{transition:all 150ms ease-in-out;background-color:transparent;border:none;padding:0;margin:0;height:1em;display:flex;justify-content:center;align-items:center;cursor:pointer;position:relative;top:2px}.expander button svg :first-child{transition:all 150ms ease-in-out;fill:white;stroke:black}.expander.expanded button{transform:rotate(45deg)}.expander.expanded button svg :first-child{fill:black;stroke:black}div.item .item-slot{display:flex;align-items:center;gap:0.25em;min-height:24px}div.item div.children{overflow:hidden;height:0;transition:all 150ms ease-in-out}";

const DnnTreeviewItem = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.userExpanded = index.createEvent(this, "userExpanded", 3);
        this.userCollapsed = index.createEvent(this, "userCollapsed", 3);
        /** Defines if the current node is expanded.  */
        this.expanded = false;
        /** Manages state for whether or not item has children. */
        this.hasChildren = false;
        this.focused = false;
    }
    /** Watch expanded Prop */
    watchExpanded(expanded) {
        if (expanded) {
            this.expander.classList.add("expanded");
            this.collapsible.expanded = true;
            return;
        }
        this.expander.classList.remove("expanded");
        this.collapsible.expanded = false;
    }
    componentDidLoad() {
        requestAnimationFrame(() => {
            const child = this.childElement.children[0];
            const count = child.assignedElements().length;
            if (count > 0) {
                this.hasChildren = true;
            }
            if (this.expanded) {
                this.expander.classList.add("expanded");
                this.collapsible.expanded = false;
                setTimeout(() => {
                    this.collapsible.expanded = true;
                }, 300);
            }
        });
    }
    toggleCollapse() {
        this.expanded = !this.expanded;
        if (this.expanded) {
            this.expander.classList.add("expanded");
            this.userExpanded.emit();
            return;
        }
        this.expander.classList.remove("expanded");
        this.userCollapsed.emit();
    }
    getTabIndex() {
        if (!this.hasChildren) {
            return -1;
        }
        return this.focused ? -1 : 0;
    }
    render() {
        return (index.h(index.Host, { key: 'b32bade09b126b1a91d88050074519e2e1affb91', tabIndex: this.getTabIndex(), onFocus: () => { var _a; return (_a = this.button) === null || _a === void 0 ? void 0 : _a.focus(); }, onBlur: () => { var _a; return (_a = this.button) === null || _a === void 0 ? void 0 : _a.blur(); } }, index.h("div", { key: '8adc790b19a8b37ea47b36970dab87ef893a33e5', class: "expander", ref: el => this.expander = el }, this.hasChildren &&
            index.h("button", { key: 'a807cc7914c34872dce9d21e8133d0bf8b0cd439', ref: el => this.button = el, onClick: () => this.toggleCollapse(), onFocus: () => this.focused = true, onBlur: () => this.focused = false }, index.h("svg", { key: '480648610c35e0069f030cd2d1e574d9ab435be7', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, index.h("path", { key: '1dabc5f3fdd0705b8b793bf4ee27f0e949121d91', d: "M10 17l5-5-5-5v10z" }), index.h("path", { key: 'a22101b07a0806e7cf217170c698ba735d1218b7', d: "M0 24V0h24v24H0z", fill: "none" })))), index.h("div", { key: 'fcd756745287aa3fdd3b58cbdc5d3ded05118c60', class: "item" }, index.h("div", { key: '908efc693bb8aa2090a4cd618bca4bd281d49f82', class: "item-slot" }, index.h("slot", { key: 'bb1588df404b508d360341ba9f81b5ca106597ce' })), index.h("dnn-collapsible", { key: '51d4faba1d6ab1581bd8807236a65e217a07a0fd', ref: el => this.collapsible = el, expanded: this.expanded }, index.h("div", { key: '1484760af24d262703e3c56da78dd20e70b2cdb9', ref: el => this.childElement = el }, index.h("slot", { key: '3f0afc10e8aab35e84a2b71e5491b4f0336d0418', name: "children" }))))));
    }
    get el() { return index.getElement(this); }
    static get watchers() { return {
        "expanded": ["watchExpanded"]
    }; }
};
DnnTreeviewItem.style = dnnTreeviewItemCss;

exports.dnn_treeview_item = DnnTreeviewItem;
//# sourceMappingURL=dnn-treeview-item.entry.cjs.js.map
