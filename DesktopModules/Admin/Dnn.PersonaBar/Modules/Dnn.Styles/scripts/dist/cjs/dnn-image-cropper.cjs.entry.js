'use strict';

var index = require('./index-CoZy11qT.js');
var mouseUtilities = require('./mouseUtilities-DnlYSUQ7.js');

var CornerType;
(function (CornerType) {
    CornerType[CornerType["nw"] = 0] = "nw";
    CornerType[CornerType["ne"] = 1] = "ne";
    CornerType[CornerType["se"] = 2] = "se";
    CornerType[CornerType["sw"] = 3] = "sw";
})(CornerType || (CornerType = {}));
var CornerType$1 = CornerType;

/** Creates a file object with only a dataUrl and a filename.*/
function dataURLtoFile(dataUrl, filename) {
    // A dataUrl has metadate before the coma and the data after.
    let dataUrlParts = dataUrl.split(',');
    let mime = dataUrlParts[0].match(/:(.*?);/)[1]; // Extract mime type
    let binaryString = atob(dataUrlParts[1]); // Decode base64 (convert ascii to binary)
    let length = binaryString.length;
    // Assign binary data to typed array
    let u8arr = new Uint8Array(length); // Create an 8-bit unsigned array
    while (length > 0) {
        length--;
        u8arr[length] = binaryString.charCodeAt(length);
    }
    // Create a blob from the typed array and specify the MIME type
    let blob = new Blob([u8arr], { type: mime });
    // Return a File object based on the Blob
    return new File([blob], filename, { type: mime });
}

const dnnImageCropperCss = ":host{display:block}canvas{display:none}.view{visibility:hidden;opacity:0;height:0;overflow:hidden;transition:all 300ms ease-in-out}.view.visible{visibility:visible;opacity:1;height:initial;overflow:visible}.view .cropper{position:relative;width:100%}.view .cropper img{width:100%;display:block;margin:0 auto}.view .cropper .backdrop{backdrop-filter:saturate(0.5);backdrop-filter:brightness(0.5);position:absolute;left:0;top:0;width:100%;height:100%}.view .cropper .crop{position:absolute;top:0;left:0;width:100%;height:100%;outline:2px dashed white;box-shadow:black 0 0 0px 2px;backdrop-filter:saturate(2);backdrop-filter:brightness(2);cursor:move}.view .cropper .crop>div{width:20px;height:20px;background-color:white;border:2px solid rgba(0, 0, 0, 0.5);position:absolute}.view .cropper .crop>div.nw,.view .cropper .crop>div.ne{top:-17px}.view .cropper .crop>div.ne,.view .cropper .crop>div.se{right:-17px}.view .cropper .crop>div.se,.view .cropper .crop>div.sw{bottom:-17px}.view .cropper .crop>div.sw,.view .cropper .crop>div.nw{left:-17px}.view .cropper .crop>div.nw,.view .cropper .crop>div.se{cursor:nwse-resize}.view .cropper .crop>div.ne,.view .cropper .crop>div.sw{cursor:nesw-resize}dnn-modal{--max-width:512px}";

const DnnImageCropper = class {
    constructor(hostRef) {
        index.registerInstance(this, hostRef);
        this.imageCropChanged = index.createEvent(this, "imageCropChanged", 7);
        this.imageFileCropChanged = index.createEvent(this, "imageFileCropChanged", 7);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
        /** Sets the output quality of the cropped image (number between 0 and 1). */
        this.quality = 0.8;
        /** When set to true, prevents cropping an image smaller than the required size, which would blow pixel and make the final picture look blurry. */
        this.preventUndersized = false;
        this.focused = false;
        this.defaultResx = {
            capture: "Capture",
            dragAndDropFile: "Drag and drop an image",
            or: "or",
            takePicture: "Take a picture",
            uploadFile: "Upload an image",
            imageTooSmall: "The image you are attempting to upload does not meet the minimum size requirement of {width} pixels by {height} pixels. Please upload a larger image.",
            modalCloseText: "Close",
        };
        this.initializeCropBox = () => {
            const imageRect = this.image.getBoundingClientRect();
            const wantedRatio = (this.width == undefined || this.height == undefined) ? NaN : this.width / this.height;
            // Calculate initial dimensions of the crop box.
            let newWidth, newHeight;
            // Determine if the width or the height is the limiting dimension.
            if (imageRect.width / imageRect.height > wantedRatio) {
                // Image is wider than the wanted ratio, so height is the limiting factor.
                newHeight = imageRect.height;
                newWidth = newHeight * wantedRatio;
            }
            else {
                // Image is taller than the wanted ratio, so width is the limiting factor.
                newWidth = imageRect.width;
                newHeight = newWidth / wantedRatio;
            }
            // Calculate initial position of the crop box.
            const newTop = (imageRect.height - newHeight) / 2;
            const newLeft = (imageRect.width - newWidth) / 2;
            // Apply initial dimensions and position.
            this.crop.style.top = `${Math.round(newTop)}px`;
            this.crop.style.left = `${Math.round(newLeft)}px`;
            this.crop.style.width = `${Math.round(newWidth)}px`;
            this.crop.style.height = `${Math.round(newHeight)}px`;
        };
        this.handleCropMouseDown = (event) => {
            event.stopPropagation();
            event.preventDefault();
            const element = event.target;
            const className = element.classList[0];
            document.addEventListener("mouseup", this.handleImageCropFinished, false);
            document.addEventListener("touchend", this.handleImageCropFinished, false);
            switch (className) {
                case "crop":
                    document.addEventListener("mousemove", this.handleCropDrag, false);
                    document.addEventListener("touchmove", this.handleCropDrag, false);
                    document.addEventListener("mouseup", () => document.removeEventListener("mousemove", this.handleCropDrag));
                    document.addEventListener("touchend", () => document.removeEventListener("touchmove", this.handleCropDrag));
                    break;
                case "nw":
                    document.addEventListener("mousemove", this.handleNwMouseMove, false);
                    document.addEventListener("touchmove", this.handleNwMouseMove, false);
                    document.addEventListener("mouseup", () => document.removeEventListener("mousemove", this.handleNwMouseMove));
                    document.addEventListener("touchend", () => document.removeEventListener("touchmove", this.handleNwMouseMove));
                    break;
                case "ne":
                    document.addEventListener("mousemove", this.handleNeMouseMove, false);
                    document.addEventListener("touchmove", this.handleNeMouseMove, false);
                    document.addEventListener("mouseup", () => document.removeEventListener("mousemove", this.handleNeMouseMove));
                    document.addEventListener("touchend", () => document.removeEventListener("touchmove", this.handleNeMouseMove));
                    break;
                case "se":
                    document.addEventListener("mousemove", this.handleSeMouseMove, false);
                    document.addEventListener("touchmove", this.handleSeMouseMove, false);
                    document.addEventListener("mouseup", () => document.removeEventListener("mousemove", this.handleSeMouseMove));
                    document.addEventListener("touchend", () => document.removeEventListener("touchmove", this.handleSeMouseMove));
                    break;
                case "sw":
                    document.addEventListener("mousemove", this.handleSwMouseMove, false);
                    document.addEventListener("touchmove", this.handleSwMouseMove, false);
                    document.addEventListener("mouseup", () => document.removeEventListener("mousemove", this.handleSwMouseMove));
                    document.addEventListener("touchend", () => document.removeEventListener("touchmove", this.handleSwMouseMove));
                    break;
            }
        };
        this.handleImageCropFinished = (_ev) => {
            this.emitImage();
            document.removeEventListener("mouseup", this.handleImageCropFinished);
            this.previousTouch = undefined;
        };
        this.handleNwMouseMove = (event) => {
            this.handleCornerDrag(event, CornerType$1.nw);
        };
        this.handleNeMouseMove = (event) => {
            this.handleCornerDrag(event, CornerType$1.ne);
        };
        this.handleSeMouseMove = (event) => {
            this.handleCornerDrag(event, CornerType$1.se);
        };
        this.handleSwMouseMove = (event) => {
            this.handleCornerDrag(event, CornerType$1.sw);
        };
        this.handleCornerDrag = (event, corner) => {
            const wantedRatio = (this.width == undefined || this.height == undefined) ? NaN : this.width / this.height;
            const cropRect = this.crop.getBoundingClientRect();
            const imageRect = this.image.getBoundingClientRect();
            let { movementX, movementY } = mouseUtilities.getMovementFromEvent(event, this.previousTouch);
            let newWidth, newHeight;
            switch (corner) {
                case CornerType$1.nw:
                    newWidth = cropRect.width - movementX;
                    newHeight = cropRect.height - movementY;
                    break;
                case CornerType$1.ne:
                    newWidth = cropRect.width + movementX;
                    newHeight = cropRect.height - movementY;
                    break;
                case CornerType$1.se:
                    newWidth = cropRect.width + movementX;
                    newHeight = cropRect.height + movementY;
                    break;
                case CornerType$1.sw:
                    newWidth = cropRect.width - movementX;
                    newHeight = cropRect.height + movementY;
            }
            let newTop, newLeft;
            if (!isNaN(wantedRatio)) {
                switch (corner) {
                    case CornerType$1.nw:
                        newHeight = newWidth / wantedRatio;
                        newTop = cropRect.bottom - newHeight;
                        break;
                    case CornerType$1.se:
                        newWidth = newHeight * wantedRatio;
                        break;
                    case CornerType$1.ne:
                        newHeight = newWidth / wantedRatio;
                        newTop = cropRect.bottom - newHeight;
                        break;
                    case CornerType$1.sw:
                        newWidth = newHeight * wantedRatio;
                        newLeft = cropRect.right - newWidth;
                        break;
                }
            }
            switch (corner) {
                case CornerType$1.nw:
                    newTop = this.crop.offsetTop + (cropRect.height - newHeight);
                    newLeft = this.crop.offsetLeft + (cropRect.width - newWidth);
                    break;
                case CornerType$1.ne:
                    newTop = this.crop.offsetTop + (cropRect.height - newHeight);
                    newLeft = this.crop.offsetLeft;
                    break;
                case CornerType$1.se:
                    newTop = this.crop.offsetTop;
                    newLeft = this.crop.offsetLeft;
                    break;
                case CornerType$1.sw:
                    newTop = this.crop.offsetTop;
                    newLeft = this.crop.offsetLeft + (cropRect.width - newWidth);
                    break;
            }
            if (newLeft < 0) {
                newWidth += newLeft;
                newLeft = 0;
            }
            if (newTop < 0) {
                newHeight += newTop;
                newTop = 0;
            }
            if (newLeft + newWidth > imageRect.width) {
                newWidth = imageRect.width - newLeft;
            }
            if (newTop + newHeight > imageRect.height) {
                newHeight = imageRect.height - newTop;
            }
            // After the boundary checks, recalculate the width and height based on the ratio
            if (!isNaN(wantedRatio)) {
                switch (corner) {
                    case CornerType$1.se:
                    case CornerType$1.sw:
                        newWidth = newHeight * wantedRatio;
                        if (newLeft + newWidth > imageRect.width) {
                            newWidth = imageRect.width - newLeft;
                            // Recalculate the height after adjusting the width
                            newHeight = newWidth / wantedRatio;
                        }
                        break;
                }
            }
            if (this.preventUndersized) {
                const zoomRatio = this.image.width / this.image.naturalWidth;
                if (newWidth / zoomRatio < (this.width || NaN) || newHeight / zoomRatio < (this.height || NaN)) {
                    return;
                }
            }
            this.crop.style.top = `${newTop}px`;
            this.crop.style.left = `${newLeft}px`;
            this.crop.style.width = `${newWidth}px`;
            this.crop.style.height = `${newHeight}px`;
        };
        this.handleCropDrag = (ev) => {
            if (!this.isMouseStillInTarget(ev)) {
                return;
            }
            let { movementX, movementY } = mouseUtilities.getMovementFromEvent(ev, this.previousTouch);
            let newLeft = this.crop.offsetLeft + movementX;
            let newTop = this.crop.offsetTop + movementY;
            var imageRect = this.image.getBoundingClientRect();
            var cropRect = this.crop.getBoundingClientRect();
            if (newLeft < 0) {
                newLeft = 0;
            }
            if (newTop < 0) {
                newTop = 0;
            }
            if (newLeft + cropRect.width > imageRect.width) {
                newLeft = this.crop.offsetLeft;
            }
            if (newTop + cropRect.height > imageRect.height) {
                newTop = this.crop.offsetTop;
            }
            this.crop.style.left = newLeft + "px";
            this.crop.style.top = newTop + "px";
        };
    }
    /** Clears the current image and crop (resets the component). */
    async clear() {
        this.setView("noPictureView");
    }
    componentWillLoad() {
        this.mergeResx();
    }
    componentDidLoad() {
        requestAnimationFrame(() => {
            this.setView("noPictureView");
        });
    }
    resxChanged() {
        this.mergeResx();
    }
    formResetCallback() {
        this.clear();
        this.internals.setValidity({});
        this.internals.setFormValue("");
    }
    mergeResx() {
        this.localResx = Object.assign(Object.assign({}, this.defaultResx), this.resx);
    }
    setView(newView) {
        const views = this.host.shadowRoot.querySelectorAll(".view");
        views.forEach(v => v.classList.remove("visible"));
        switch (newView) {
            case "noPictureView":
                this.noPictureView.classList.add("visible");
                break;
            case "hasPictureView":
                this.hasPictureView.classList.add("visible");
                break;
        }
        this.view = newView;
    }
    initCrop() {
        /** Force full size to prevent a Firefox timing issue */
        this.crop.style.top = "0px";
        this.crop.style.left = "0px";
        this.crop.style.width = "100%";
        this.crop.style.height = "100%";
        if (this.width == null || this.height == null) {
            return;
        }
        const wantedRatio = this.width / this.height;
        const imageRect = this.image.getBoundingClientRect();
        const imageRatio = imageRect.width / imageRect.height;
        if (wantedRatio > imageRatio) {
            const wantedHeight = imageRect.width / wantedRatio;
            const diff = imageRect.height - wantedHeight;
            this.crop.style.top = `${Math.round(diff / 2)}px`;
            this.crop.style.height = `${Math.round(wantedHeight)}px`;
        }
        else {
            const wantedWidth = imageRect.height * wantedRatio;
            const diff = imageRect.width - wantedWidth;
            this.crop.style.left = `${Math.round(diff / 2)}px`;
            this.crop.style.width = `${Math.round(wantedWidth)}px`;
        }
    }
    setImage() {
        this.image.addEventListener('load', () => {
            this.initCrop();
            this.emitImage();
        });
        this.image.src = this.canvas.toDataURL();
    }
    handleNewFile(file) {
        if (file.type.split('/')[0] != "image") {
            return;
        }
        this.fileName = file.name;
        var reader = new FileReader();
        reader.onload = readerLoadEvent => {
            var img = new Image();
            img.onload = () => {
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                if (this.preventUndersized && this.width != undefined && this.height != undefined && (img.width < this.width || img.height < this.height)) {
                    this.imageTooSmallModal.show();
                    return;
                }
                var ctx = this.canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                requestAnimationFrame(() => {
                    this.setView("hasPictureView");
                });
                requestAnimationFrame(() => {
                    this.setImage();
                });
                requestAnimationFrame(() => {
                    this.initializeCropBox();
                });
            };
            img.src = readerLoadEvent.target.result.toString();
        };
        reader.readAsDataURL(file);
    }
    emitImage() {
        var _a, _b;
        var x = this.crop.offsetLeft / this.image.width * this.image.naturalWidth;
        var y = this.crop.offsetTop / this.image.height * this.image.naturalHeight;
        var cropRect = this.crop.getBoundingClientRect();
        var width = cropRect.width / this.image.width * this.image.naturalWidth;
        var height = cropRect.height / this.image.height * this.image.naturalHeight;
        if (x < 0)
            x = 0;
        if (x > this.image.naturalWidth)
            x = this.image.naturalWidth;
        if (y < 0)
            y = 0;
        if (y > this.image.naturalWidth)
            y = this.image.naturalWidth;
        if (width > this.image.naturalWidth)
            width = this.image.naturalWidth;
        if (height > this.image.naturalHeight)
            height = this.image.naturalHeight;
        var dataUrl = this.generateCroppedImage(x, y, width, height, (_a = this.width) !== null && _a !== void 0 ? _a : width, (_b = this.height) !== null && _b !== void 0 ? _b : height);
        this.imageCropChanged.emit(dataUrl);
        var file = dataURLtoFile(dataUrl, this.fileName);
        this.imageFileCropChanged.emit(file);
        if (this.name != undefined) {
            var data = new FormData();
            data.append(this.name, file);
            this.internals.setFormValue(data);
        }
    }
    generateCroppedImage(x, y, width, height, desiredWidth, desiredHeight) {
        this.canvas.width = desiredWidth;
        this.canvas.height = desiredHeight;
        const context = this.canvas.getContext("2d");
        context.clearRect(0, 0, desiredWidth, desiredHeight);
        context.drawImage(this.image, x, y, width, height, 0, 0, desiredWidth, desiredHeight);
        return this.canvas.toDataURL("image/jpeg", this.quality);
    }
    isMouseStillInTarget(event) {
        var inside = false;
        let mouseX = 0;
        let mouseY = 0;
        const imageRect = this.image.getBoundingClientRect();
        if (event instanceof MouseEvent) {
            mouseX = event.clientX;
            mouseY = event.clientY;
        }
        if (typeof TouchEvent !== "undefined") {
            if (event instanceof TouchEvent) {
                var touch = event.touches[0];
                mouseX = touch.clientX;
                mouseY = touch.clientY;
            }
        }
        if (mouseX >= imageRect.x &&
            mouseY >= imageRect.y &&
            mouseX <= imageRect.left + imageRect.width &&
            mouseY <= imageRect.top + imageRect.height) {
            inside = true;
        }
        var corners = this.crop.querySelectorAll("div");
        corners.forEach(corner => {
            var cornerRect = corner.getBoundingClientRect();
            if (mouseX >= cornerRect.x &&
                mouseY >= cornerRect.y &&
                mouseX <= cornerRect.left + cornerRect.width &&
                mouseY <= cornerRect.top + cornerRect.height) {
                inside = true;
            }
        });
        return inside;
    }
    render() {
        var _a, _b;
        return (index.h(index.Host, { key: '04f542324c97fca17dd55a31267a9b99b74b98cd', tabIndex: this.focused ? -1 : 0, onFocus: () => this.inputField.focus(), onBlur: () => this.inputField.blur() }, index.h("canvas", { key: 'ae9850c0afe4fd28f0e01ed735bb856390924585', ref: el => this.canvas = el }), index.h("div", { key: '014daf060281e159d5a1c8e8aa1d36a5224f511c', class: "view", ref: el => this.hasPictureView = el }, index.h("div", { key: '8f311d19ba47736d646bec01492fc6f6d8f42144', class: "cropper" }, index.h("img", { key: '85bc0164102ff3bc2f1092dd4a191376f7f4084d', ref: el => this.image = el, alt: this.fileName }), index.h("div", { key: 'f12fa9ec9ee05495d05dfcec60622bcb97ee4ad8', class: "backdrop" }), index.h("div", { key: 'dd6646f48fe7f2633ec3278b205492c4a6884d78', class: "crop", ref: e => this.crop = e, onMouseDown: this.handleCropMouseDown, onTouchStart: this.handleCropMouseDown }, index.h("div", { key: '727b9143c421c4dfa020a57b04052fe5ef94750f', class: "nw" }), index.h("div", { key: '99d5f951ab4fb0e46946936a746eee0656e66009', class: "ne" }), index.h("div", { key: '35885077d8e27c0298441d96e95783ff818dfd47', class: "se" }), index.h("div", { key: '0e971dc8306d6ebd3fae6e24ea26dfa480dec392', class: "sw" })))), index.h("div", { key: '0676343525b07fd136a728860a80c9cf549fa737', class: "view", ref: el => this.noPictureView = el }, index.h("dnn-dropzone", { key: '504c17c986048191286f10f25506fae99563a227', allowCameraMode: true, onFilesSelected: e => this.handleNewFile(e.detail[0]), allowedExtensions: ['jpg', 'jpeg', 'gif', 'png', 'svg', 'webp', 'bmp'], resx: {
                capture: this.localResx.capture,
                dragAndDropFile: this.localResx.dragAndDropFile,
                or: this.localResx.or,
                takePicture: this.localResx.takePicture,
                uploadFile: this.localResx.uploadFile,
                uploadSizeTooLarge: "The file you tried to upload is too large.",
                fileSizeLimit: "The maximum size is",
            }, ref: el => this.inputField = el, onFocus: () => this.focused = true, onBlur: () => this.focused = false })), index.h("dnn-modal", { key: 'bd451392d5b96f05275fff12cc4f18e253ef815c', ref: el => this.imageTooSmallModal = el, "close-text": this.localResx.modalCloseText }, index.h("p", { key: '78c1b9e5e23dd86ecd9b3c1cb7e6196249902f22' }, this.localResx.imageTooSmall.replace("{width}", ((_a = this.width) === null || _a === void 0 ? void 0 : _a.toString()) || "").replace("{height}", ((_b = this.height) === null || _b === void 0 ? void 0 : _b.toString()) || "")))));
    }
    static get formAssociated() { return true; }
    get host() { return index.getElement(this); }
    static get watchers() { return {
        "resx": ["resxChanged"]
    }; }
};
DnnImageCropper.style = dnnImageCropperCss;

exports.dnn_image_cropper = DnnImageCropper;
//# sourceMappingURL=dnn-image-cropper.entry.cjs.js.map
