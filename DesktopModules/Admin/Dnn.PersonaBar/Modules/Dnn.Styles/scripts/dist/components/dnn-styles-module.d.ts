import type { Components, JSX } from "../types/components";

interface DnnStylesModule extends Components.DnnStylesModule, HTMLElement {}
export const DnnStylesModule: {
    prototype: DnnStylesModule;
    new (): DnnStylesModule;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
