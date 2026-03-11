import { r as registerInstance, c as createEvent, h, H as Host, g as getElement } from './index-BokBNxfI.js';

const dnnModalCss = ":host{display:block}:host .overlay{background-color:rgba(0, 0, 0, 0.5);position:fixed;top:0;left:0;width:100%;height:100%;z-index:1002;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(2px);transition:all 300ms ease-in-out;visibility:hidden;opacity:0}:host .overlay .modal{max-width:var(--max-width, 1200px);background-color:white;padding:30px;transform:scale(2);transition:transform 300ms ease-in-out;z-index:2;position:relative;max-height:80%;border-radius:var(--dnn-controls-radius, 5px);box-shadow:10px 10px 20px 0 rgba(0, 0, 0, 0.5);display:block}:host .overlay .modal .content{max-width:80vw;max-height:80vh;overflow:auto}:host .overlay .modal .se{position:absolute;height:10px;width:10px;bottom:-5px;right:-5px;cursor:se-resize}:host .overlay .modal .close{position:absolute;background-color:white;border:2px solid white;border-radius:50%;padding:0;margin:0;top:-12px;right:-12px;outline:none;display:flex;justify-content:center;align-items:center}:host .overlay .modal .close:focus-visible,:host .overlay .modal .close:hover{box-shadow:0 0 2px 2px var(--dnn-color-primary, blue)}:host .overlay .modal .close svg{width:24px;height:24px;color:grey}:host .overlay.visible{visibility:visible;opacity:1}:host .overlay.visible .modal{transform:scale(1);box-shadow:4px 4px 10px 0px rgba(0, 0, 0, 0.5);display:block}";

const DnnModal = class {
    constructor(hostRef) {
        registerInstance(this, hostRef);
        this.dismissed = createEvent(this, "dismissed", 7);
        /**
         * Pass true to remove the backdrop click auto-dismiss feature.
         * Defaults to false.
         */
        this.preventBackdropDismiss = false;
        /**
         * Optionally pass the aria-label text for the close button.
         * Defaults to "Close modal" if not provided.
         */
        this.closeText = "Close modal";
        /**
         * If set to true, the modal becomes resizable.
         */
        this.resizable = false;
        /**
         * Optionally you can pass true to not show the close button.
         * If you decide to do so, you should either not also prevent dismissal by clicking the backdrop
         * or provide your own dismissal logic in the modal content.
         */
        this.hideCloseButton = false;
        /**
         * Reflects the visible state of the modal.
         */
        this.visible = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.w = 0;
        this.h = 0;
        // FOR RESIZING
        this.handleResizeMouseMove = (ev) => {
            // deviding by two because the modal is centered. 
            const dx = (ev.clientX - this.mouseX) * 2;
            const dy = (ev.clientY - this.mouseY) * 2;
            this.modal.style.width = `${this.w + dx}px`;
            this.modal.style.height = `${this.h + dy}px`;
        };
        this.handleResizeMouseDown = (ev) => {
            addEventListener("mousemove", this.handleResizeMouseMove);
            this.mouseX = ev.clientX;
            this.mouseY = ev.clientY;
            const modalStyles = getComputedStyle(this.modal);
            this.w = parseInt(modalStyles.width, 10);
            this.h = parseInt(modalStyles.height, 10);
        };
        this.handleResizeMouseUp = () => {
            removeEventListener("mousemove", this.handleResizeMouseMove);
        };
    }
    /**
     * Shows the modal
    */
    async show() {
        this.visible = true;
    }
    /**
     * Hides the modal
    */
    async hide() {
        this.visible = false;
    }
    componentWillLoad() {
        if (this.backdropDismiss != undefined) {
            console.warn("The 'backdropDismiss' prop is deprecated. Use 'preventBackdropDismiss' instead.");
            this.preventBackdropDismiss = !this.backdropDismiss;
        }
        if (this.showCloseButton != undefined) {
            console.warn("The 'showCloseButton' prop is deprecated. Use 'hideCloseButton' instead.");
            this.hideCloseButton = !this.showCloseButton;
        }
    }
    componentDidLoad() {
        var _a;
        (_a = this.seDrag) === null || _a === void 0 ? void 0 : _a.addEventListener("mousedown", this.handleResizeMouseDown);
        addEventListener("mouseup", this.handleResizeMouseUp);
    }
    disconnectedCallback() {
        var _a;
        (_a = this.seDrag) === null || _a === void 0 ? void 0 : _a.removeEventListener("mousedown", this.handleResizeMouseDown);
        removeEventListener("mouseup", this.handleResizeMouseUp);
    }
    handleDismiss() {
        this.visible = false;
        this.dismissed.emit();
    }
    // FOR BACKDROP CLICK
    handleBackdropClick(e) {
        const element = e.target;
        if (element.id === "backdrop" && !this.preventBackdropDismiss) {
            this.handleDismiss();
        }
    }
    render() {
        return (h(Host, { key: 'ddeada006779331fcb74c7f2281bbda06a49e5d3' }, h("div", { key: '7c7d637a303053b61c476e4f6bbb532c36854f7b', id: "backdrop", class: this.visible ? 'overlay visible' : 'overlay', onClick: e => this.handleBackdropClick(e) }, h("div", { key: 'bc52fa86e8044021c807b3598d7227d785aea0e2', class: "modal", ref: el => this.modal = el }, !this.hideCloseButton &&
            h("button", { key: '9cf2795520c1b72bfea7af95e87b02633ee1ccb4', class: "close", "aria-label": this.closeText, onClick: () => this.handleDismiss() }, h("svg", { key: '79ac8158160b83d05c40629a2a9a2bdab257996a', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { key: '2357184605325b21c6beadfb307b03144b5107bf', d: "M0 0h24v24H0z", fill: "none" }), h("path", { key: '0276464aa40478c06e2725f3019593969aec7623', d: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" }))), h("div", { key: '1e1c69007aaa127e06b3a0806571f8b6af7528f7', class: "content" }, h("slot", { key: '97760d2eeee42b0ac407457a33b3b8a1c459d86e' })), this.resizable && h("div", { key: 'ae36ffb6d05bdbc573577123c1b8318819b659ad', class: 'se', ref: el => this.seDrag = el })))));
    }
    get el() { return getElement(this); }
};
DnnModal.style = dnnModalCss;

export { DnnModal as dnn_modal };
//# sourceMappingURL=dnn-modal.entry.js.map
