import { proxyCustomElement, HTMLElement, h, Host } from '@stencil/core/internal/client';

const dnnProgressBarCss = ":host{--min-width:160px;--height:2rem;--background-color:var(--dnn-color-neutral-light, #eee);--value-background-color:var(--dnn-color-primary, green);--gradient-color-start:var(--dnn-color-primary, #09c);--gradient-color-end:var(--dnn-color-primary-light, #f44);--gradient-direction:left;--border-radius:var(--dnn-controls-radius, 5px);display:inline-block}:host progress{height:var(--height);min-width:var(--min-width);width:100%}:host progress[value]{-webkit-appearance:none;appearance:none}:host progress[value]::-webkit-progress-bar{background-color:var(--background-color);border-radius:var(--border-radius);box-shadow:0 2px 5px rgba(0, 0, 0, 0.25) inset}:host progress[value]::-webkit-progress-value{border-radius:var(--border-radius);background-color:var(--value-background-color);background-size:calc(var(--height) * 1.75) var(--height), 100% 100%, 100% 100%}:host progress[value].use-gradient::-webkit-progress-value{background-image:-webkit-linear-gradient(-45deg, transparent 33%, rgba(255, 255, 255, 0.2) 33%, rgba(255, 255, 255, 0.2) 66%, transparent 66%), -webkit-linear-gradient(var(--gradient-direction), var(--gradient-color-start), var(--gradient-color-end));border-radius:var(--border-radius);background-size:calc(var(--height) * 1.75) var(--height), 100% 100%, 100% 100%}";

const DnnProgressBar$1 = /*@__PURE__*/ proxyCustomElement(class DnnProgressBar extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        /** Sets to current value for the progress bar. */
        this.value = 0;
        /** Sets the max value for the progress bar. */
        this.max = 100;
        /** Determines if gradient colors will be used for progress bar. */
        this.useGradient = false;
    }
    getProgressClass() {
        const classes = [];
        if (this.useGradient) {
            classes.push("use-gradient");
        }
        return classes.join(" ");
    }
    render() {
        return (h(Host, { key: '04cd93887008110d0280770c25a16518026c3c7e' }, h("progress", { key: '66894a7d6b4e858faac3f1b9767c84316d989451', class: this.getProgressClass(), max: this.max, value: this.value })));
    }
    static get style() { return dnnProgressBarCss; }
}, [257, "dnn-progress-bar", {
        "value": [2],
        "max": [2],
        "useGradient": [4, "use-gradient"]
    }]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-progress-bar"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-progress-bar":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnProgressBar$1);
            }
            break;
    } });
}

const DnnProgressBar = DnnProgressBar$1;
const defineCustomElement = defineCustomElement$1;

export { DnnProgressBar, defineCustomElement };
//# sourceMappingURL=dnn-progress-bar.js.map

//# sourceMappingURL=dnn-progress-bar.js.map