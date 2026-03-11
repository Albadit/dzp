'use strict';

var index = require('./index-CoZy11qT.js');

const dnnCollapsibleCss = ":host{display:block}#container{max-height:0;overflow:hidden;transition:max-height 300ms ease-in-out}";

const DnnCollapsible = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.dnnCollapsibleHeightChanged = index.createEvent(this, "dnnCollapsibleHeightChanged", 7);
        /** Defines if the panel is expanded or not. */
        this.expanded = false;
        /** Defines the transition time in ms, defaults to 150ms */
        this.transitionDuration = 150;
    }
    handleHeightChanged() {
        requestAnimationFrame(() => {
            this.updateSize();
        });
    }
    /**
     * Updates the component height, use to update after a slot content changes.
     */
    async updateSize() {
        if (this.expanded) {
            requestAnimationFrame(() => {
                this.container.style.maxHeight = `${this.container.scrollHeight}px`;
            });
            setTimeout(() => {
                this.container.style.maxHeight = "none";
                this.container.style.overflow = "visible";
            }, this.transitionDuration);
        }
    }
    handledExpandedChanged(expanded) {
        if (expanded) {
            this.updateSize();
        }
        else {
            requestAnimationFrame(() => {
                this.container.style.maxHeight = `${this.container.scrollHeight}px`;
                this.container.style.overflow = "hidden";
                requestAnimationFrame(() => {
                    this.container.style.maxHeight = "0px";
                });
            });
        }
        setTimeout(() => {
            requestAnimationFrame(() => {
                this.dnnCollapsibleHeightChanged.emit();
            });
        }, this.transitionDuration);
    }
    componentDidLoad() {
        this.container.style.transition = `max-height ${this.transitionDuration}ms ease-in-out`;
    }
    render() {
        return (index.h(index.Host, { key: '36c06ac3bc17ce96266636d57dc7c45e71789055' }, index.h("div", { key: '4923d5661faaed36acd4537320826bfedd6ffba3', id: "container", class: { "expanded": this.expanded }, ref: el => this.container = el, style: { transition: `max-height ${this.transitionDuration}ms ease-in-out` } }, index.h("slot", { key: '698b62d4c96c8fd9954331a5c2c2b11c6cb51338' }))));
    }
    get el() { return index.getElement(this); }
    static get watchers() { return {
        "expanded": ["handledExpandedChanged"]
    }; }
};
DnnCollapsible.style = dnnCollapsibleCss;

exports.dnn_collapsible = DnnCollapsible;
//# sourceMappingURL=dnn-collapsible.entry.cjs.js.map
