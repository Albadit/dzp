'use strict';

var index = require('./index-CoZy11qT.js');

const dnnContextMenuCss = ":host{--color-background:var(--dnn-color-background, white);--color-border:var(--dnn-color-foreground, black);--padding:0.25rem;display:none;flex-direction:column;position:fixed;z-index:1;background-color:var(--color-background);border:1px solid var(--color-border);padding:var(--padding)}::slotted(*){display:flex;width:100%;white-space:nowrap}";

const DnnContextMenu = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        /** If true, the menu will close when an item is clicked. */
        this.closeOnClick = false;
        this.isOpen = false;
        this.position = { x: 0, y: 0 };
        this.positioned = false;
    }
    /** Opens the menu using a pointer event. */
    async open(event) {
        await this.handleOpen(event);
    }
    /** Closes the menu. */
    async close() {
        await this.handleClose();
    }
    // Close when clicking outside the menu.
    onWindowMouseDown(ev) {
        if (!this.isOpen)
            return;
        const path = ev.composedPath();
        const clickedInside = path.includes(this.el);
        if (!clickedInside)
            this.close();
    }
    // Close on scroll of the window.
    onWindowScroll() {
        if (this.isOpen)
            this.close();
    }
    // Close on window resize.
    onWindowResize() {
        if (this.isOpen)
            this.close();
    }
    // Close on Escape key.
    onWindowKeyDown(ev) {
        if (!this.isOpen)
            return;
        if (ev.key === 'Escape') {
            ev.preventDefault();
            this.close();
            return;
        }
    }
    async handleOpen(event) {
        // Open first so slot content renders and we can measure it.
        this.isOpen = true;
        // Ensure we start hidden while measuring to avoid flashing
        this.positioned = false;
        // Determine initial origin point (viewport coordinates)
        let originX = 0;
        let originY = 0;
        const usedPointer = event.button === 2;
        if (usedPointer) {
            // Right click was used, so position the menu at the pointer location
            originX = event.clientX;
            originY = event.clientY;
        }
        else {
            // Keyboard was used, so position the menu relative to the source element.
            const targetRect = event.target.getBoundingClientRect();
            originX = targetRect.left;
            originY = targetRect.bottom;
        }
        // Set a provisional position so the menu renders and can be measured.
        this.position = { x: originX, y: originY };
        // Wait a frame to ensure the element is rendered and layouted.
        await new Promise(requestAnimationFrame);
        // Measure the menu
        const menuRect = this.el.getBoundingClientRect();
        const menuWidth = menuRect.width;
        const menuHeight = menuRect.height;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let x = originX;
        let y = originY;
        // If opening to the right would overflow the viewport, open to the left instead.
        if (x + menuWidth > vw) {
            if (usedPointer) {
                x = Math.max(0, originX - menuWidth);
            }
            else {
                // For keyboard anchoring, align the menu's right edge with the target's right edge.
                const targetRect = event.target.getBoundingClientRect();
                x = Math.max(0, targetRect.right - menuWidth);
            }
        }
        // If opening downward would overflow the viewport, open upward instead.
        if (y + menuHeight > vh) {
            if (usedPointer) {
                y = Math.max(0, originY - menuHeight);
            }
            else {
                const targetRect = event.target.getBoundingClientRect();
                y = Math.max(0, targetRect.top - menuHeight);
            }
        }
        // Final clamp to viewport in case of extreme sizes
        x = Math.max(0, Math.min(x, Math.max(0, vw - menuWidth)));
        y = Math.max(0, Math.min(y, Math.max(0, vh - menuHeight)));
        this.position = { x, y };
        // Ensure the browser painted the new position then show with a transition
        await new Promise(requestAnimationFrame);
        this.positioned = true;
    }
    async handleClose() {
        this.positioned = false;
        // Wait for the opacity transition to finish before hiding the element
        await new Promise(resolve => setTimeout(resolve, 160));
        this.isOpen = false;
    }
    async handleMenuClick() {
        if (this.closeOnClick) {
            await this.handleClose();
        }
    }
    render() {
        return (index.h(index.Host, { key: '74a362fce64875e9c0b48cbb9b4393a2e9b1f47a', "aria-hidden": !this.isOpen, role: "menu", style: {
                display: this.isOpen ? 'flex' : 'none',
                left: `${this.position.x}px`,
                top: `${this.position.y}px`,
                opacity: this.positioned ? '1' : '0',
                transition: 'opacity 160ms ease',
                pointerEvents: this.positioned ? 'auto' : 'none',
            }, onclick: () => void this.handleMenuClick() }, index.h("slot", { key: 'ef292d332d8bdb334813465aaaca4efa89b63922' })));
    }
    get el() { return index.getElement(this); }
};
DnnContextMenu.style = dnnContextMenuCss;

exports.dnn_context_menu = DnnContextMenu;
//# sourceMappingURL=dnn-context-menu.entry.cjs.js.map
