// Generic image-upload dropzone for table cell editors.
// Mirrors the pattern in Dnn.Modules.Blog (drag/drop, click, preview, remove).
//
// Markup contract (rendered by Views/Item/Index.cshtml):
//   <div class="dt-dropzone ..." data-upload-url="/.../UploadImage.ashx"
//        data-input-name="_dt_new_Image">
//     <input type="hidden" name="_dt_new_Image" value="" class="dt-dz-value" />
//     <input type="file" class="dt-dz-input sr-only" accept="image/*" />
//     <div class="dt-dz-empty">…drop hint…</div>
//     <div class="dt-dz-preview hidden">
//       <img class="dt-dz-preview-img" />
//       <button type="button" class="dt-dz-remove">×</button>
//     </div>
//     <div class="dt-dz-progress hidden">…spinner…</div>
//   </div>
(function (global) {
    'use strict';

    var MAX_BYTES = 10 * 1024 * 1024; // 10 MB

    function setValue(dz, url) {
        var hidden  = dz.querySelector('.dt-dz-value');
        var empty   = dz.querySelector('.dt-dz-empty');
        var preview = dz.querySelector('.dt-dz-preview');
        var img     = dz.querySelector('.dt-dz-preview-img');
        if (hidden) hidden.value = url || '';
        if (url) {
            if (img) img.src = url;
            if (empty)   empty.classList.add('hidden');
            if (preview) preview.classList.remove('hidden');
        } else {
            if (empty)   empty.classList.remove('hidden');
            if (preview) preview.classList.add('hidden');
            if (img) img.removeAttribute('src');
        }
        // Fire change so live-validation listeners can update.
        if (hidden) {
            try { hidden.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { /* ie */ }
        }
    }

    function uploadFile(dz, file) {
        if (!file || !file.type || file.type.indexOf('image/') !== 0) return;
        if (file.size > MAX_BYTES) {
            alert('File too large (max 10 MB).');
            return;
        }
        var url = dz.getAttribute('data-upload-url');
        if (!url) { alert('Upload URL not configured.'); return; }
        var progress = dz.querySelector('.dt-dz-progress');
        if (progress) progress.classList.remove('hidden');

        var fd = new FormData();
        fd.append('file', file);

        // DNN's WebAPI returns 401 for non-superuser callers unless the
        // request carries the ServicesFramework headers. Match the headers
        // that Dnn.Modules.Blog's upload uses (those work end-to-end for
        // community beheer / company owner roles).
        var headers = { 'Accept': 'application/json' };
        try {
            // RequestVerificationToken: prefer ServicesFramework, fall back
            // to the page-level hidden input.
            var tok = '';
            if (window.jQuery && typeof jQuery.ServicesFramework === 'function') {
                var sf = jQuery.ServicesFramework(0);
                if (sf && typeof sf.getAntiForgeryValue === 'function') {
                    tok = sf.getAntiForgeryValue() || '';
                }
            }
            if (!tok) {
                var input = document.querySelector('input[name="__RequestVerificationToken"]')
                         || document.getElementById('__RequestVerificationToken');
                if (input && input.value) tok = input.value;
            }
            if (tok) headers['RequestVerificationToken'] = tok;

            // ModuleId: try data-module-id on a wrapping element, else 0.
            var modIdEl = dz.closest('[data-module-id]');
            headers['ModuleId'] = (modIdEl && modIdEl.getAttribute('data-module-id')) || '0';

            // TabId: DNN exposes it through dnn.getVar('sf_tabId').
            headers['TabId'] = (window.dnn && dnn.getVar && dnn.getVar('sf_tabId')) || '';
        } catch (_) { /* best-effort */ }

        fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: headers,
            body: fd
        })
        .then(function (r) {
            if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { return Promise.reject(j); });
            return r.json();
        })
        .then(function (res) {
            if (res && res.ok && res.url) setValue(dz, res.url);
            else throw res;
        })
        .catch(function (err) {
            var msg = (err && err.error) ? err.error : 'Upload failed.';
            alert(msg);
        })
        .then(function () { if (progress) progress.classList.add('hidden'); });
    }

    function init(dz) {
        if (!dz || dz._dzInit) return;
        dz._dzInit = true;
        var fileInput = dz.querySelector('.dt-dz-input');

        dz.addEventListener('click', function (e) {
            // Click on remove button → clear value, swallow event
            if (e.target.closest('.dt-dz-remove')) {
                e.preventDefault();
                e.stopPropagation();
                setValue(dz, '');
                return;
            }
            if (e.target.closest('.dt-dz-preview-img')) return;
            if (fileInput) fileInput.click();
        });
        dz.addEventListener('keydown', function (e) {
            if ((e.key === 'Enter' || e.key === ' ') && fileInput) {
                e.preventDefault();
                fileInput.click();
            }
        });
        if (fileInput) {
            fileInput.addEventListener('change', function (e) {
                var f = e.target.files && e.target.files[0];
                if (f) uploadFile(dz, f);
                // Reset so picking the same file again still fires change.
                e.target.value = '';
            });
        }
        ['dragenter', 'dragover'].forEach(function (ev) {
            dz.addEventListener(ev, function (e) {
                e.preventDefault();
                e.stopPropagation();
                dz.classList.add('dt-dz-active');
            });
        });
        ['dragleave', 'drop'].forEach(function (ev) {
            dz.addEventListener(ev, function (e) {
                e.preventDefault();
                e.stopPropagation();
                dz.classList.remove('dt-dz-active');
            });
        });
        dz.addEventListener('drop', function (e) {
            var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) uploadFile(dz, f);
        });
    }

    function initAll(container) {
        if (!container) return;
        var list = container.querySelectorAll('.dt-dropzone');
        for (var i = 0; i < list.length; i++) init(list[i]);
    }

    global.DtDropzone = { init: init, initAll: initAll, setValue: setValue };
})(window);
