export default class StylesClient {
    constructor() {
        var _a, _b, _c, _d;
        this.isHost = false;
        const dnnStyles = window.dnn;
        this.config = dnnStyles.initStyles();
        if (this.config == undefined) {
            throw new Error("dnn.initStyles() is not defined.");
        }
        if (this.config.utility == undefined) {
            throw new Error("dnn.initStyles().utility is not defined.");
        }
        const sf = this.config.utility.sf;
        sf.moduleRoot = "PersonaBar";
        this.serviceRoot = sf.getServiceRoot();
        this.serviceRoot += "Styles/";
        const headers = new Headers();
        headers.append("RequestVerificationToken", sf.antiForgeryToken);
        headers.append("Content-Type", "application/json");
        this.headers = headers;
        this.isHost = (_d = (_c = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.params) === null || _b === void 0 ? void 0 : _b.settings) === null || _c === void 0 ? void 0 : _c.isHost) !== null && _d !== void 0 ? _d : false;
    }
    get isHostUser() {
        return this.isHost;
    }
    getStyles() {
        return new Promise((resolve, reject) => {
            fetch(`${this.serviceRoot}GetStyles`, {
                method: "GET",
            })
                .then((response) => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response.json();
            })
                .then((response) => {
                resolve(response);
            })
                .catch(error => {
                reject(Error(error));
            });
        });
    }
    saveStyles(styles) {
        return new Promise((resolve, reject) => {
            fetch(`${this.serviceRoot}SaveStyles`, {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify(styles),
            })
                .then(response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                resolve();
            })
                .catch((error) => {
                reject(new Error(error));
            });
        });
    }
    restoreStyles() {
        return new Promise((resolve, reject) => {
            fetch(`${this.serviceRoot}RestoreStyles`, {
                method: "POST",
                headers: this.headers,
            })
                .then(response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response.json();
            })
                .then((response) => {
                resolve(response);
            })
                .catch((error) => {
                reject(Error(error));
            });
        });
    }
    notify(message, options) {
        this.config.utility.notify(message, options);
    }
    notifyError(message, options) {
        if (options == undefined) {
            options = {
                clickToClose: true,
            };
        }
        if (options.clickToClose == undefined) {
            options.clickToClose = true;
        }
        this.config.utility.notifyError(message, options);
    }
}
//# sourceMappingURL=styles-client.js.map
