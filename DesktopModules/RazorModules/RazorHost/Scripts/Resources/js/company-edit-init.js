/*
    Bootstraps the dropzone for the company-edit banner. Re-runs lucide
    icons after init. Reads no globals; expects window.DtDropzone from
    dropzone.js to be loaded first.
*/
(function () {
    function initBannerDz() {
        if (window.DtDropzone && typeof window.DtDropzone.initAll === 'function') {
            window.DtDropzone.initAll(document);
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) { lucide.createIcons(); }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBannerDz);
    } else {
        initBannerDz();
    }
})();
