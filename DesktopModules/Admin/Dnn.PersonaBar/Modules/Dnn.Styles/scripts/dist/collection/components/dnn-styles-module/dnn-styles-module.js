import { Host, h } from "@stencil/core";
import StylesClient from "../../clients/styles-client";
export class DnnStylesModule {
    constructor() {
        this.isHost = false;
        this.stylesClient = new StylesClient();
    }
    connectedCallback() {
        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const newWidth = entry.contentRect.width;
                if (this.componentWidth == newWidth) {
                    return;
                }
                this.componentWidth = newWidth;
                this.el.classList.remove("small", "medium", "large");
                if (newWidth < 576) {
                    this.el.classList.add("small");
                }
                else if (newWidth < 992) {
                    this.el.classList.add("medium");
                }
                else {
                    this.el.classList.add("large");
                }
            }
        });
        this.resizeObserver.observe(this.el);
    }
    disconnectedCallback() {
        this.resizeObserver.unobserve(this.el);
    }
    componentWillLoad() {
        var _a, _b;
        const dnnStyles = window.dnn;
        this.resx = (_b = (_a = dnnStyles.initStyles().utility) === null || _a === void 0 ? void 0 : _a.resx) === null || _b === void 0 ? void 0 : _b.Styles;
        const header = document.querySelector("#dnnStylesHeader h3");
        if (header) {
            header.textContent = this.resx.nav_Styles;
        }
        this.stylesClient.getStyles()
            .then(response => {
            this.originalStyles = response;
            this.styles = Object.assign({}, this.originalStyles);
        })
            .catch(error => {
            var _a;
            alert((_a = this.resx) === null || _a === void 0 ? void 0 : _a.GetStylesError);
            console.error(error);
        });
        this.isHost = this.stylesClient.isHostUser;
    }
    handleColorChange(colorName, detail) {
        this.styles = Object.assign(Object.assign({}, this.styles), { [`Color${colorName}`]: detail.color, [`Color${colorName}Contrast`]: detail.contrastColor, [`Color${colorName}Light`]: detail.lightColor, [`Color${colorName}Dark`]: detail.darkColor });
    }
    handleSave() {
        this.stylesClient.saveStyles(this.styles)
            .then(() => {
            var _a;
            this.originalStyles = this.styles;
            this.stylesClient.notify((_a = this.resx) === null || _a === void 0 ? void 0 : _a.SaveSuccess);
        })
            .catch(error => {
            var _a;
            this.stylesClient.notifyError((_a = this.resx) === null || _a === void 0 ? void 0 : _a.SaveError);
            console.error(error);
        });
    }
    handleRestoreDefault() {
        this.stylesClient.restoreStyles()
            .then(response => {
            this.originalStyles = response;
            this.styles = Object.assign({}, this.originalStyles);
        })
            .catch(error => {
            var _a;
            this.stylesClient.notifyError((_a = this.resx) === null || _a === void 0 ? void 0 : _a.SaveError);
            console.error(error);
        });
    }
    render() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55, _56, _57, _58, _59, _60, _61, _62, _63;
        return (h(Host, { key: '4d77454b01c6d3a8e55401292e36adaaff84fa20' }, h("form", { key: 'ddf9c9a4d5a2d87d242812547ca3ab9855a9120c', onSubmit: e => {
                e.preventDefault();
                this.handleSave();
            } }, h("p", { key: '7406a9fb3c60956d7660e4c7ec5df8841f9acda5' }, (_a = this.resx) === null || _a === void 0 ? void 0 : _a.ModuleDescription), this.styles && this.resx &&
            h("div", { key: 'ba4c7fe51c53da501bd328ea8e81aae23c819ef3', class: "sections" }, h("div", { key: 'd8f2eb44295ce502d105bf862e436748240553cb', class: "section" }, h("h3", { key: 'c5e4886febf710007b49a6672ddec4d21e390d59' }, (_b = this.resx) === null || _b === void 0 ? void 0 : _b.GeneralColors), h("dnn-color-input", { key: '19b3e22ecabf82629a071f5819f1c09a017c0dd0', label: (_c = this.resx) === null || _c === void 0 ? void 0 : _c.BackgroundColor, helpText: (_d = this.resx) === null || _d === void 0 ? void 0 : _d.BackgroundColorHelp, color: (_e = this.styles) === null || _e === void 0 ? void 0 : _e.ColorBackground, contrastColor: (_f = this.styles) === null || _f === void 0 ? void 0 : _f.ColorBackgroundContrast, lightColor: (_g = this.styles) === null || _g === void 0 ? void 0 : _g.ColorBackgroundLight, darkColor: (_h = this.styles) === null || _h === void 0 ? void 0 : _h.ColorBackgroundDark, useContrastColor: true, useLightColor: true, useDarkColor: true, onColorChange: e => this.handleColorChange("Background", e.detail) }), h("dnn-color-input", { key: '17b9fdb3d1b03cff6f217ac1289300008e01bc1d', label: (_j = this.resx) === null || _j === void 0 ? void 0 : _j.ForegroundColor, helpText: (_k = this.resx) === null || _k === void 0 ? void 0 : _k.ForegroundColorHelp, color: (_l = this.styles) === null || _l === void 0 ? void 0 : _l.ColorForeground, contrastColor: (_m = this.styles) === null || _m === void 0 ? void 0 : _m.ColorForegroundContrast, lightColor: (_o = this.styles) === null || _o === void 0 ? void 0 : _o.ColorForegroundLight, darkColor: (_p = this.styles) === null || _p === void 0 ? void 0 : _p.ColorForegroundDark, useContrastColor: true, useLightColor: true, useDarkColor: true, onColorChange: e => this.handleColorChange("Foreground", e.detail) }), h("dnn-color-input", { key: 'eb7db53965ec5918e770f535328316c702cd1963', label: (_q = this.resx) === null || _q === void 0 ? void 0 : _q.NeutralColor, helpText: (_r = this.resx) === null || _r === void 0 ? void 0 : _r.NeutralColorHelp, color: (_s = this.styles) === null || _s === void 0 ? void 0 : _s.ColorNeutral, contrastColor: (_t = this.styles) === null || _t === void 0 ? void 0 : _t.ColorNeutralContrast, lightColor: (_u = this.styles) === null || _u === void 0 ? void 0 : _u.ColorNeutralLight, darkColor: (_v = this.styles) === null || _v === void 0 ? void 0 : _v.ColorNeutralDark, useContrastColor: true, useLightColor: true, useDarkColor: true, onColorChange: e => this.handleColorChange("Neutral", e.detail) }), h("dnn-color-input", { key: '10079df9752d561603b7628f0c1f309633785004', label: (_w = this.resx) === null || _w === void 0 ? void 0 : _w.SurfaceColor, helpText: this.resx.SurfaceColorHelp, color: (_x = this.styles) === null || _x === void 0 ? void 0 : _x.ColorSurface, contrastColor: (_y = this.styles) === null || _y === void 0 ? void 0 : _y.ColorSurfaceContrast, lightColor: (_z = this.styles) === null || _z === void 0 ? void 0 : _z.ColorSurfaceLight, darkColor: (_0 = this.styles) === null || _0 === void 0 ? void 0 : _0.ColorSurfaceDark, useContrastColor: true, useLightColor: true, useDarkColor: true, onColorChange: e => this.handleColorChange("Surface", e.detail) })), h("div", { key: '37be2eaf88472c1d01b724371ff61ba0d88e5389', class: "section" }, h("h3", { key: '267a3240a525201c2e6cafedfbf31c76779b5a26' }, (_1 = this.resx) === null || _1 === void 0 ? void 0 : _1.ActionColors), h("dnn-color-input", { key: '72e58e5ea8c75fe085e817b953bd8bfd4d8fec33', label: (_2 = this.resx) === null || _2 === void 0 ? void 0 : _2.InformationColor, helpText: (_3 = this.resx) === null || _3 === void 0 ? void 0 : _3.InformationColorHelp, color: (_4 = this.styles) === null || _4 === void 0 ? void 0 : _4.ColorInfo, contrastColor: (_5 = this.styles) === null || _5 === void 0 ? void 0 : _5.ColorInfoContrast, lightColor: (_6 = this.styles) === null || _6 === void 0 ? void 0 : _6.ColorInfoLight, darkColor: (_7 = this.styles) === null || _7 === void 0 ? void 0 : _7.ColorInfoDark, useContrastColor: true, useLightColor: true, useDarkColor: true, onColorChange: e => this.handleColorChange("Info", e.detail) }), h("dnn-color-input", { key: '0065250ba6bdce52e2dbc3718b749dc16c1b0df8', label: (_8 = this.resx) === null || _8 === void 0 ? void 0 : _8.SuccessColor, helpText: (_9 = this.resx) === null || _9 === void 0 ? void 0 : _9.SuccessColorHelp, color: (_10 = this.styles) === null || _10 === void 0 ? void 0 : _10.ColorSuccess, contrastColor: (_11 = this.styles) === null || _11 === void 0 ? void 0 : _11.ColorSuccessContrast, lightColor: (_12 = this.styles) === null || _12 === void 0 ? void 0 : _12.ColorSuccessLight, darkColor: (_13 = this.styles) === null || _13 === void 0 ? void 0 : _13.ColorSuccessDark, useContrastColor: true, useLightColor: true, useDarkColor: true, onColorChange: e => this.handleColorChange("Success", e.detail) }), h("dnn-color-input", { key: 'fe71766a2d94f1d7d4117c20ae2d4d7687d073a6', label: (_14 = this.resx) === null || _14 === void 0 ? void 0 : _14.WarningColor, helpText: (_15 = this.resx) === null || _15 === void 0 ? void 0 : _15.WarningColorHelp, color: (_16 = this.styles) === null || _16 === void 0 ? void 0 : _16.ColorWarning, contrastColor: (_17 = this.styles) === null || _17 === void 0 ? void 0 : _17.ColorWarningContrast, lightColor: (_18 = this.styles) === null || _18 === void 0 ? void 0 : _18.ColorWarningLight, darkColor: (_19 = this.styles) === null || _19 === void 0 ? void 0 : _19.ColorWarningDark, useContrastColor: true, useLightColor: true, useDarkColor: true, onColorChange: e => this.handleColorChange("Warning", e.detail) }), h("dnn-color-input", { key: '24342a515be821d452c8111ec3a55a5829743d9d', label: (_20 = this.resx) === null || _20 === void 0 ? void 0 : _20.DangerColor, helpText: (_21 = this.resx) === null || _21 === void 0 ? void 0 : _21.DangerColorHelp, color: (_22 = this.styles) === null || _22 === void 0 ? void 0 : _22.ColorDanger, contrastColor: (_23 = this.styles) === null || _23 === void 0 ? void 0 : _23.ColorDangerContrast, lightColor: (_24 = this.styles) === null || _24 === void 0 ? void 0 : _24.ColorDangerLight, darkColor: (_25 = this.styles) === null || _25 === void 0 ? void 0 : _25.ColorDangerDark, useContrastColor: true, useLightColor: true, useDarkColor: true, onColorChange: e => this.handleColorChange("Danger", e.detail) })), h("div", { key: 'cf1cc9a3caed4323ddcbddba30203e0e8c4bb31c', class: "section" }, h("h3", { key: '18d336ebefa907b826024b4c4554260857028844' }, (_26 = this.resx) === null || _26 === void 0 ? void 0 : _26.BrandColors), h("dnn-color-input", { key: '28b49aad30e38bd59a300a10dca194ddfd336781', label: (_27 = this.resx) === null || _27 === void 0 ? void 0 : _27.PrimaryColor, helpText: (_28 = this.resx) === null || _28 === void 0 ? void 0 : _28.PrimaryColorHelp, color: (_29 = this.styles) === null || _29 === void 0 ? void 0 : _29.ColorPrimary, contrastColor: (_30 = this.styles) === null || _30 === void 0 ? void 0 : _30.ColorPrimaryContrast, lightColor: (_31 = this.styles) === null || _31 === void 0 ? void 0 : _31.ColorPrimaryLight, darkColor: (_32 = this.styles) === null || _32 === void 0 ? void 0 : _32.ColorPrimaryDark, useContrastColor: true, useLightColor: true, useDarkColor: true, onColorChange: e => this.handleColorChange("Primary", e.detail) }), h("dnn-color-input", { key: '60538cf6db87a838cceb1daaf4da6cf1f4d3ccac', label: (_33 = this.resx) === null || _33 === void 0 ? void 0 : _33.SecondaryColor, helpText: (_34 = this.resx) === null || _34 === void 0 ? void 0 : _34.PrimaryColorHelp, color: (_35 = this.styles) === null || _35 === void 0 ? void 0 : _35.ColorSecondary, contrastColor: (_36 = this.styles) === null || _36 === void 0 ? void 0 : _36.ColorSecondaryContrast, lightColor: (_37 = this.styles) === null || _37 === void 0 ? void 0 : _37.ColorSecondaryLight, darkColor: (_38 = this.styles) === null || _38 === void 0 ? void 0 : _38.ColorSecondaryDark, useContrastColor: true, useLightColor: true, useDarkColor: true, onColorChange: e => this.handleColorChange("Secondary", e.detail) }), h("dnn-color-input", { key: '87d2b323f4d6dc99d5c54a83ab1674fe5f25383b', label: (_39 = this.resx) === null || _39 === void 0 ? void 0 : _39.TertiaryColor, helpText: (_40 = this.resx) === null || _40 === void 0 ? void 0 : _40.TertiaryColorHelp, color: (_41 = this.styles) === null || _41 === void 0 ? void 0 : _41.ColorTertiary, contrastColor: (_42 = this.styles) === null || _42 === void 0 ? void 0 : _42.ColorTertiaryContrast, lightColor: (_43 = this.styles) === null || _43 === void 0 ? void 0 : _43.ColorTertiaryLight, darkColor: (_44 = this.styles) === null || _44 === void 0 ? void 0 : _44.ColorTertiaryDark, useContrastColor: true, useLightColor: true, useDarkColor: true, onColorChange: e => this.handleColorChange("Tertiary", e.detail) })), h("div", { key: 'beaed3d4a40e0080bcac783e348885ebf29a786e', class: "section" }, h("h3", { key: 'a69fcab21754a43be133c3bc5c4a9d94169f283c' }, (_45 = this.resx) === null || _45 === void 0 ? void 0 : _45.Controls), h("dnn-input", { key: 'cfacd866da9cbfe40edc7f65c32c7f55d7817e15', type: "number", min: 0, required: true, label: (_46 = this.resx) === null || _46 === void 0 ? void 0 : _46.ControlsRadius, helpText: (_47 = this.resx) === null || _47 === void 0 ? void 0 : _47.ControlsRadiusHelp, value: this.styles.ControlsRadius, onValueChange: e => this.styles = Object.assign(Object.assign({}, this.styles), { ControlsRadius: e.detail }) }), h("dnn-input", { key: '8ad48f8c09ff332794e92efad8bb8270770f4592', type: "number", min: 0, required: true, label: (_48 = this.resx) === null || _48 === void 0 ? void 0 : _48.ControlsPadding, helpText: (_49 = this.resx) === null || _49 === void 0 ? void 0 : _49.ControlsPaddingHelp, value: this.styles.ControlsPadding, onValueChange: e => this.styles = Object.assign(Object.assign({}, this.styles), { ControlsPadding: e.detail }) })), h("div", { key: '1ce78a5949a212ebd25440df042a6f390e4a23c4', class: "section" }, h("h3", { key: 'f067a2b97ff2623b817a96c2e1b4202f314e41b5' }, (_50 = this.resx) === null || _50 === void 0 ? void 0 : _50.Colors), h("dnn-input", { key: 'de63f862ec507a43cba11aa2534680829d8021d1', type: "number", min: 0, max: 1, step: 0.01, required: true, label: (_51 = this.resx) === null || _51 === void 0 ? void 0 : _51.ColorVariationOpacity, helpText: (_52 = this.resx) === null || _52 === void 0 ? void 0 : _52.ColorVariationOpacityHelp, value: this.styles.VariationOpacity, onValueChange: e => this.styles = Object.assign(Object.assign({}, this.styles), { VariationOpacity: e.detail }) })), h("div", { key: '0fae61fbb127e9420cfc4c149f28e448bcaf4ca6', class: "section" }, h("h3", { key: '3c30d8cadfaf2f78388660c611e0597343832e87' }, this.resx.Typography), h("dnn-input", { key: 'd2cc81e601e0ab8718b691175e80e0ffd7991401', type: "number", min: 0, required: true, label: (_53 = this.resx) === null || _53 === void 0 ? void 0 : _53.BaseFontSize, helpText: (_54 = this.resx) === null || _54 === void 0 ? void 0 : _54.BaseFontSizeHelp, value: this.styles.BaseFontSize, onValueChange: e => this.styles = Object.assign(Object.assign({}, this.styles), { BaseFontSize: e.detail }) }))), this.isHost &&
            h("div", { key: 'b6fd111139390612cd5b6b1c5de8ddc9888c6389', class: "permissions-section" }, h("h3", { key: '1455501d98c5fac3a5e8e2e9a24a0cff6f37d3ff' }, (_55 = this.resx) === null || _55 === void 0 ? void 0 : _55.Permissions), h("label", { key: '30182b05c8e10019ff687c1c459243a18bb058fa' }, h("dnn-toggle", { key: '4a5529292614c6e347f096107c275b7953437450', checked: (_56 = this.styles) === null || _56 === void 0 ? void 0 : _56.AllowAdminEdits, onCheckChanged: e => this.styles = Object.assign(Object.assign({}, this.styles), { AllowAdminEdits: e.detail.checked }) }), (_57 = this.resx) === null || _57 === void 0 ? void 0 :
                _57.AllowAdminEdits), h("em", { key: '5d4c4cfb91edcd503d1a4fd3effe40342117a18e' }, this.resx.AllowAdminEditsHelp)), h("div", { key: '4fc25b6f24f226e27a1cab2406d952cc09af703c', class: "controls" }, h("dnn-button", { key: '715ae5c85d5fb159d4d9e23c9cc45197e2a928ad', reversed: true, onClick: () => {
                this.styles = this.originalStyles;
            } }, (_58 = this.resx) === null || _58 === void 0 ? void 0 : _58.Reset), h("dnn-button", { key: '0e17401390bbe82980fbefa9231732c6f59fb7c4', appearance: "danger", confirm: true, confirmMessage: (_59 = this.resx) === null || _59 === void 0 ? void 0 : _59.RestoreDefaultMessage, confirmNoText: (_60 = this.resx) === null || _60 === void 0 ? void 0 : _60.No, confirmYesText: (_61 = this.resx) === null || _61 === void 0 ? void 0 : _61.Yes, onConfirmed: () => this.handleRestoreDefault() }, (_62 = this.resx) === null || _62 === void 0 ? void 0 : _62.RestoreDefault), h("dnn-button", { key: 'b8dcd8db3ebd91d0ed4689ac9ae069a7de30d5c3', type: 'submit' }, (_63 = this.resx) === null || _63 === void 0 ? void 0 : _63.Save)))));
    }
    static get is() { return "dnn-styles-module"; }
    static get encapsulation() { return "shadow"; }
    static get originalStyleUrls() {
        return {
            "$": ["dnn-styles-module.scss"]
        };
    }
    static get styleUrls() {
        return {
            "$": ["dnn-styles-module.css"]
        };
    }
    static get states() {
        return {
            "resx": {},
            "originalStyles": {},
            "styles": {},
            "isHost": {}
        };
    }
    static get elementRef() { return "el"; }
}
//# sourceMappingURL=dnn-styles-module.js.map
