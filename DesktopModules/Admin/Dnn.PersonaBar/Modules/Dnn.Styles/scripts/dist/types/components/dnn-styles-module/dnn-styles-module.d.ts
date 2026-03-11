import { IStylesResx } from '../../window.dnn';
import { IPortalStyles } from '../../clients/styles-client';
export declare class DnnStylesModule {
    resx: IStylesResx;
    originalStyles: IPortalStyles;
    styles: IPortalStyles;
    isHost: boolean;
    el: HTMLDnnStylesModuleElement;
    private stylesClient;
    private resizeObserver;
    private componentWidth;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    componentWillLoad(): void;
    private handleColorChange;
    private handleSave;
    private handleRestoreDefault;
    render(): any;
}
