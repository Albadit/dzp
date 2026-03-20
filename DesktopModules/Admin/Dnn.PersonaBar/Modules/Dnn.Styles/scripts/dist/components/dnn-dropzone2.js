import { proxyCustomElement, HTMLElement, createEvent, h, Host } from '@stencil/core/internal/client';
import { g as getReadableFileSizeString } from './stringUtilities.js';

const dnnDropzoneCss = ":host{--border-color:var(--dnn-color-foreground-light, lightgray);--border-radius:var(--dnn-controls-radius, 5px);--drop-background-color:var(--dnn-color-neutral, #b2b2b2);display:flex;flex-direction:column;gap:1rem;text-align:center;border:2px dashed var(--border-color);border-radius:var(--border-radius);padding:1rem;transition:all 300ms ease-in-out}:host(.dropping){background-color:var(--drop-background-color)}p{margin:0;padding:0}button{display:flex;justify-content:center;align-items:center;border:0px;margin:0;padding:0;background-color:transparent}button:hover{cursor:pointer}button svg{margin-right:0.5rem}label.upload-file{display:flex;justify-content:center;align-items:center;cursor:pointer}label.upload-file input{display:none}.video-preview{display:flex;flex-direction:column;align-items:center}.video-preview button{margin:1rem}.error{color:red}";

const DnnDropzone = /*@__PURE__*/ proxyCustomElement(class DnnDropzone extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.filesSelected = createEvent(this, "filesSelected", 7);
        this.internals = this.attachInternals();
        /**
         * If true, will allow the user to take a snapshot
         * using the device camera. (only works over https).
         */
        this.allowCameraMode = false;
        /**
         * Specifies the jpeg quality for when the device
         * camera is used to generate a picture.
         * Needs to be a number between 0 and 1 and defaults to 0.8
         */
        this.captureQuality = 0.8;
        /** If true, allows multiple file selection. */
        this.multiple = false;
        this.canTakeSnapshots = false;
        this.takingPicture = false;
        this.fileTooLarge = false;
        this.invalidExtension = false;
        this.tooManyFiles = false;
        this.focused = false;
        this.handleDragOver = (event) => {
            event.stopPropagation();
            event.preventDefault();
            if (event.dataTransfer != null) {
                event.dataTransfer.dropEffect = "copy";
            }
            this.dropzone.classList.add("dropping");
        };
        this.handleDrop = (dropEvent) => {
            this.invalidExtension = false;
            this.fileTooLarge = false;
            this.tooManyFiles = false;
            dropEvent.stopPropagation();
            dropEvent.preventDefault();
            const files = dropEvent.dataTransfer.files;
            if (!this.multiple && files.length > 1) {
                this.tooManyFiles = true;
                return;
            }
            if (this.hasInvalidExtensions(Array.from(files))) {
                this.invalidExtension = true;
                return;
            }
            if (this.isAnyFileLargerThanAllowed(Array.from(files))) {
                this.fileTooLarge = true;
                return;
            }
            var fileList = this.getFilesFromFileList(files);
            this.filesSelected.emit(fileList);
        };
    }
    get defaultResx() {
        return {
            dragAndDropFile: this.multiple ? "Drag and drop files" : "Drag and drop a file",
            capture: "Capture",
            or: "or",
            takePicture: "Take a picture",
            uploadFile: this.multiple ? "Upload files" : "Upload a file",
            uploadSizeTooLarge: this.multiple
                ? "One or more files you tried to upload are too large."
                : "The file you tried to upload is too large.",
            fileSizeLimit: "The maximum size is {0}",
            invalidExtension: this.multiple
                ? "One or more files you tried to upload have an invalid extension."
                : "The file you tried to upload has an invalid extension.",
            allowedFileExtensions: "Allowed file extensions: {0}",
            tooManyFiles: "Only one file can be uploaded at a time.",
        };
    }
    componentWillLoad() {
        this.mergeResx();
    }
    componentDidLoad() {
        if (this.allowCameraMode) {
            this.checkIfBrowserCanTakeSnapshots()
                .then(result => this.canTakeSnapshots = result);
        }
        if (this.allowedExtensions != undefined && this.allowedExtensions.length > 0) {
            var extensionsWithDots = this.allowedExtensions.map(e => `.${e}`);
            var extensionsList = extensionsWithDots.join(",");
            this.fileInput.accept = extensionsList;
        }
    }
    resxChanged() {
        this.mergeResx();
    }
    multipleChanged() {
        this.mergeResx();
    }
    formResetCallback() {
        this.internals.setValidity({});
        this.fileInput.value = "";
        this.internals.setFormValue("");
        this.fileTooLarge = false;
        this.invalidExtension = false;
        this.tooManyFiles = false;
    }
    mergeResx() {
        this.localResx = Object.assign(Object.assign({}, this.defaultResx), this.resx);
    }
    checkIfBrowserCanTakeSnapshots() {
        return new Promise((resolve) => {
            const mediaDevices = navigator.mediaDevices;
            if (mediaDevices == undefined || mediaDevices.enumerateDevices == undefined) {
                resolve(false);
            }
            mediaDevices.enumerateDevices()
                .then(devices => {
                var result = devices.some(device => device.kind == "videoinput");
                resolve(result);
            });
        });
    }
    getFilesFromFileList(files) {
        var fileList = [];
        if (files == undefined) {
            return fileList;
        }
        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            fileList.push(file);
        }
        return fileList;
    }
    isAnyFileLargerThanAllowed(files) {
        if (this.maxFileSize == undefined || this.maxFileSize <= 0) {
            return false;
        }
        if (this.maxFileSize != undefined && files.some(file => file.size > this.maxFileSize)) {
            return true;
        }
        return false;
    }
    handleUploadKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.fileInput.click();
        }
    }
    handleUploadButton(element) {
        this.fileTooLarge = false;
        this.invalidExtension = false;
        this.tooManyFiles = false;
        let files = this.getFilesFromFileList(element.files);
        if (!this.multiple && files.length > 1) {
            this.tooManyFiles = true;
            return;
        }
        if (this.isAnyFileLargerThanAllowed(files)) {
            this.fileTooLarge = true;
            return;
        }
        if (this.hasInvalidExtensions(files)) {
            this.invalidExtension = true;
            return;
        }
        this.filesSelected.emit(files);
        if (this.name != undefined && this.name.length > 0) {
            var data = new FormData();
            files.forEach(file => {
                data.append(this.name || "", file);
            });
            this.internals.setFormValue(data);
        }
    }
    hasInvalidExtensions(files) {
        if (!this.allowedExtensions) {
            return false;
        }
        const loweredAllowedExtensions = new Set(this.allowedExtensions.map(ext => ext.toLowerCase()));
        return files
            .map(file => { var _a; return (_a = /(?:\.([^.]+))?$/.exec(file.name)[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase(); })
            .some(ext => !loweredAllowedExtensions.has(ext));
    }
    takeSnapshot() {
        this.takingPicture = true;
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
            this.videoPreview.srcObject = stream;
            this.videoPreview.play()
                .then(() => {
                this.videoSettings = stream.getVideoTracks()[0].getSettings();
            });
        })
            .catch(error => alert(error));
    }
    applySnapshot() {
        var canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = this.videoSettings.width;
        canvas.height = this.videoSettings.height;
        context.drawImage(this.videoPreview, 0, 0);
        canvas.toBlob(blob => {
            var file = new File([blob], "image.jpeg", { type: "image/jpeg" });
            this.takingPicture = false;
            var fileList = [file];
            this.filesSelected.emit(fileList);
        }, "image/jpeg", this.captureQuality);
    }
    getInvalidExtensionsMessage() {
        var message = this.localResx.allowedFileExtensions;
        var message = message.replace("{0}", this.allowedExtensions.join(", "));
        return message;
    }
    render() {
        var _a, _b, _c, _d, _e, _f;
        return (h(Host, { key: '6afbd43dc08c9a8f4d2d6e70fd4e9da44575da1d', ref: e => this.dropzone = e, class: "dropzone", onDragOver: (e) => this.handleDragOver(e), onDrop: (e) => this.handleDrop(e), onDragLeave: () => this.dropzone.classList.remove("dropping"), tabIndex: this.focused ? -1 : 0, onFocus: () => this.uploadLabel.focus(), onBlur: () => this.uploadLabel.blur() }, !this.takingPicture &&
            [
                h("p", { key: '52a956ffce19af95129321c8ea6a1d195bb6374b' }, (_a = this.localResx) === null || _a === void 0 ? void 0 : _a.dragAndDropFile),
                h("p", { key: '47a5513a09f4da9540a17a4354b347f2e40f7e8f' }, "- ", (_b = this.localResx) === null || _b === void 0 ? void 0 :
                    _b.or, " -"),
                h("label", { key: 'bd575758d9d85841b90ab8971d52bcd5f660eb98', class: "upload-file", tabIndex: 0, onKeyDown: e => this.handleUploadKeyDown(e), ref: el => this.uploadLabel = el, onFocus: () => this.focused = true, onBlur: () => this.focused = false }, h("input", { key: '49977eb4d50560d2263879a2c83cb267aaabfdd5', type: "file", multiple: this.multiple, ref: el => this.fileInput = el, onChange: e => this.handleUploadButton(e.target) }), h("span", { key: 'dc9a7eead227d48e649419634cf05e46c7d6e533' }, h("svg", { key: '874b990688778550d3e212cfb55e45e14e1e5f4f', xmlns: "http://www.w3.org/2000/svg", "enable-background": "new 0 0 24 24", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("g", { key: 'bc1b85b37f73bd209a0e097097d418968a6b9779' }, h("rect", { key: '677877a5fc635f1ad1f7ea89cba7eb0af0830b36', fill: "none", height: "24", width: "24" })), h("g", { key: 'e15125b0ffffbfe1539c2b6527eb57e6da032db5' }, h("path", { key: '48804afd143bc14bf00e4f87d25676873c127b59', d: "M5,20h14v-2H5V20z M5,10h4v6h6v-6h4l-7-7L5,10z" })))), "\u00A0", (_c = this.localResx) === null || _c === void 0 ? void 0 :
                    _c.uploadFile),
                this.canTakeSnapshots &&
                    [
                        h("p", { key: '5b7d4b29327887ee334f60bba05f68d0cb0050ea' }, "- ", (_d = this.localResx) === null || _d === void 0 ? void 0 :
                            _d.or, " -"),
                        h("button", { key: '8b53c83b639ea2552603ee0038a3212213ab092c', onClick: () => this.takeSnapshot() }, h("svg", { key: '32f46086e231b95b6782268be79546d44ac27d55', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { key: 'bc8248d422252bbcfd7984c618e2ca6329d705bd', d: "M0 0h24v24H0z", fill: "none" }), h("circle", { key: '59c541fb6d9cb85ba90acff3a7725e4028762778', cx: "12", cy: "12", r: "3.2" }), h("path", { key: 'bb5d850d68b3a2d0fe07d21240394aa35d781363', d: "M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" })), (_e = this.localResx) === null || _e === void 0 ? void 0 :
                            _e.takePicture)
                    ]
            ], this.takingPicture &&
            h("div", { key: 'd4636db0d52ff8bc11639f2c100af65e52979355', class: "video-preview" }, h("video", { key: 'f42c27eef55dc128ce071ed46924008cfeb5d963', ref: e => this.videoPreview = e }), h("button", { key: '2d967b299fb12db3bb424dbfd4d3f05d3ce4b69d', onClick: () => this.applySnapshot() }, h("svg", { key: 'ca96b57d1f39a39ad502121ceb10f4ee956e3fd0', xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { key: 'd4b2bb785022399e154d9b8244c4283757ca8b9c', d: "M0 0h24v24H0z", fill: "none" }), h("circle", { key: '286677522f43f7867f80869b8be7926bebf69659', cx: "12", cy: "12", r: "3.2" }), h("path", { key: '70f49fe3b9e9a2051608241beaae94d37b2cab10', d: "M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" })), "\u00A0", (_f = this.localResx) === null || _f === void 0 ? void 0 :
                _f.capture)), this.fileTooLarge &&
            h("div", { key: '4f224b7688102bf3654162f9315f59054ed3cf79', class: 'error' }, h("p", { key: '9b6043e18a9580e1b2dffb1315f835643dbfddcc' }, this.localResx.uploadSizeTooLarge, h("br", { key: 'f67fc7237a82d893d3849393907b5ba47d37d8ba' }), this.localResx.fileSizeLimit.replace("{0}", getReadableFileSizeString(this.maxFileSize)))), this.tooManyFiles &&
            h("div", { key: 'a6af7f2a274141237c9d26d18969836ee863b476', class: 'error' }, h("p", { key: 'a1754a70cf142806ac8b8199f6c560e08650c25b' }, this.localResx.tooManyFiles)), this.invalidExtension &&
            h("div", { key: '36418cbfb1ff206ed6dcf9f7d27b53dbe801b9c0', class: 'error' }, h("p", { key: 'dad9da75b7ec67709ef5b73cc57f55389005d6e9' }, this.localResx.invalidExtension, h("br", { key: 'd123d2188989aea5e14311e6c52602b3b3215c08' }), this.getInvalidExtensionsMessage()))));
    }
    static get formAssociated() { return true; }
    static get watchers() { return {
        "resx": ["resxChanged"],
        "multiple": ["multipleChanged"]
    }; }
    static get style() { return dnnDropzoneCss; }
}, [321, "dnn-dropzone", {
        "resx": [16],
        "allowedExtensions": [16],
        "allowCameraMode": [4, "allow-camera-mode"],
        "captureQuality": [2, "capture-quality"],
        "maxFileSize": [2, "max-file-size"],
        "name": [1],
        "multiple": [4],
        "canTakeSnapshots": [32],
        "takingPicture": [32],
        "fileTooLarge": [32],
        "invalidExtension": [32],
        "tooManyFiles": [32],
        "localResx": [32],
        "focused": [32]
    }, undefined, {
        "resx": ["resxChanged"],
        "multiple": ["multipleChanged"]
    }]);
function defineCustomElement() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-dropzone"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-dropzone":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnDropzone);
            }
            break;
    } });
}

export { DnnDropzone as D, defineCustomElement as d };
//# sourceMappingURL=dnn-dropzone2.js.map

//# sourceMappingURL=dnn-dropzone2.js.map