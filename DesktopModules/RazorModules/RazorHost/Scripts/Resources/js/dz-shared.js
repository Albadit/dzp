// Shared client-side helpers used by discover-edit.js, company-edit.js,
// community-companies.js, etc. Exposed as a single window.DZ namespace
// so consumers don't need any module loader.
//
//   DZ.icons()           — re-run lucide.createIcons() if available
//   DZ.eyeToggle(btn,on) — flip an "eye on/off" pill button (Tailwind classes
//                          + aria-pressed + lucide swap)
//   DZ.ajax(url, opts)   — minimal fetch wrapper that always sends the
//                          X-Requested-With:fetch marker and parses JSON
//   DZ.submitForm(form)  — collect a <form> as urlencoded, POST it via
//                          DZ.ajax, return the JSON
//   DZ.toast(msg, ok)    — thin wrapper around DZToast.show with sane fallback
//
// Keep this file dependency-free: it must work even before lucide loads.
(function (global) {
    'use strict';

    var EYE_ON_CLASSES  = ['border-primary/30', 'bg-primary/10', 'text-primary', 'hover:bg-primary/20'];
    var EYE_OFF_CLASSES = ['border-divider', 'bg-content2', 'text-foreground-400', 'hover:text-foreground-700', 'hover:bg-content3'];

    function icons() {
        if (global.lucide && typeof global.lucide.createIcons === 'function') {
            global.lucide.createIcons();
        }
    }

    function eyeToggle(btn, on, opts) {
        if (!btn) return;
        opts = opts || {};
        var addCls    = on ? EYE_ON_CLASSES  : EYE_OFF_CLASSES;
        var removeCls = on ? EYE_OFF_CLASSES : EYE_ON_CLASSES;
        for (var i = 0; i < removeCls.length; i++) { btn.classList.remove(removeCls[i]); }
        for (var j = 0; j < addCls.length; j++)    { btn.classList.add(addCls[j]); }
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.setAttribute('title', on ? (opts.onTitle || 'Verbergen') : (opts.offTitle || 'Tonen'));
        // Lucide replaces <i data-lucide=...> with <svg>, so reset and re-render.
        btn.innerHTML = '<i data-lucide="' + (on ? 'eye' : 'eye-off') + '" class="size-4"></i>';
        icons();
    }

    function toast(msg, ok) {
        if (global.DZToast && typeof global.DZToast.show === 'function') {
            global.DZToast.show(msg, ok !== false);
        } else if (!ok) {
            try { console.warn('toast:', msg); } catch (e) { /* ignore */ }
        }
    }

    // Generic fetch wrapper. Always sends our AJAX marker header so the
    // server's IsAjax check returns true. opts: { method, body, headers }.
    // body can be a string, FormData, or null. FormData triggers multipart
    // (Content-Type set automatically by fetch); string triggers urlencoded.
    function ajax(url, opts) {
        opts = opts || {};
        var headers = { 'X-Requested-With': 'fetch' };
        var body = opts.body;
        if (body != null && typeof body === 'string') {
            // Default to urlencoded only if caller didn't override Content-Type.
            if (!opts.headers || !opts.headers['Content-Type']) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
            }
        }
        // FormData: leave Content-Type unset so fetch adds the multipart boundary.
        if (opts.headers) {
            for (var k in opts.headers) {
                if (Object.prototype.hasOwnProperty.call(opts.headers, k)) { headers[k] = opts.headers[k]; }
            }
        }
        return fetch(url, {
            method:      opts.method || (body ? 'POST' : 'GET'),
            credentials: 'same-origin',
            headers:     headers,
            body:        body || null
        }).then(function (res) {
            return res.text().then(function (txt) {
                var data = null;
                if (txt) { try { data = JSON.parse(txt); } catch (e) { /* not json */ } }
                return { ok: res.ok, status: res.status, data: data, text: txt };
            });
        });
    }

    // Build a urlencoded body from a <form>. Optionally merge extra fields.
    function formBody(form, extra) {
        var fd = new FormData(form);
        if (extra) {
            for (var k in extra) {
                if (Object.prototype.hasOwnProperty.call(extra, k)) { fd.append(k, extra[k]); }
            }
        }
        var parts = [];
        fd.forEach(function (v, k) { parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v)); });
        return parts.join('&');
    }

    // Submit a <form> via AJAX. Disables the submit button while in flight,
    // shows a toast on success/error, and returns the parsed JSON response.
    function submitForm(form, opts) {
        opts = opts || {};
        var btn = form.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.classList.add('opacity-60'); }
        return ajax(form.getAttribute('action') || global.location.href, {
            method: 'POST',
            body:   formBody(form, opts.extra)
        }).then(function (res) {
            if (btn) { btn.disabled = false; btn.classList.remove('opacity-60'); }
            var d = res.data || {};
            if (res.ok && d.ok !== false) {
                if (typeof opts.onSuccess === 'function') { opts.onSuccess(d, res); }
                if (opts.successToast !== false) { toast(d.msg || 'Opgeslagen.', true); }
            } else {
                if (typeof opts.onError === 'function') { opts.onError(d, res); }
                toast((d && d.msg) || ('Fout (' + res.status + ')'), false);
            }
            return res;
        }).catch(function (err) {
            if (btn) { btn.disabled = false; btn.classList.remove('opacity-60'); }
            toast('Netwerkfout: ' + (err && err.message ? err.message : ''), false);
            throw err;
        });
    }

    // ── DZ.fetch ──────────────────────────────────────────────────────────
    // Reusable, pure-JS HTTP helpers built on top of `ajax`. Every method
    // returns the same shape: Promise<{ ok, status, data, text }> where
    // `data` is the JSON-parsed body (or null if the response wasn't JSON).
    //
    //   DZ.fetch.get(url, opts?)
    //   DZ.fetch.post(url, body?, opts?)        // body: string | FormData | object
    //   DZ.fetch.put(url, body?, opts?)
    //   DZ.fetch.del(url, opts?)                // DELETE
    //   DZ.fetch.json(url, obj, opts?)          // POST application/json
    //   DZ.fetch.form(url, formOrObj, opts?)    // POST x-www-form-urlencoded
    //
    // `opts` is merged into the underlying fetch call: { headers, method }.
    // The X-Requested-With:fetch marker is sent on every request.
    function objToFormBody(obj) {
        if (obj == null) return '';
        if (typeof obj === 'string') return obj;
        // FormData is passed straight through (handled by ajaxBody, see below).
        if (obj instanceof FormData) return obj;
        if (obj.nodeType === 1 && obj.tagName === 'FORM') { return new FormData(obj); }
        // plain object → urlencoded string
        var out = [];
        for (var k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                out.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k] == null ? '' : obj[k]));
            }
        }
        return out.join('&');
    }

    var dzFetch = {
        get: function (url, opts) {
            return ajax(url, Object.assign({}, opts || {}, { method: 'GET' }));
        },
        post: function (url, body, opts) {
            return ajax(url, Object.assign({}, opts || {}, {
                method: 'POST',
                body:   objToFormBody(body)
            }));
        },
        put: function (url, body, opts) {
            return ajax(url, Object.assign({}, opts || {}, {
                method: 'PUT',
                body:   objToFormBody(body)
            }));
        },
        del: function (url, opts) {
            return ajax(url, Object.assign({}, opts || {}, { method: 'DELETE' }));
        },
        json: function (url, obj, opts) {
            opts = opts || {};
            var headers = Object.assign({ 'Content-Type': 'application/json; charset=UTF-8' }, opts.headers || {});
            return ajax(url, Object.assign({}, opts, {
                method:  opts.method || 'POST',
                headers: headers,
                body:    typeof obj === 'string' ? obj : JSON.stringify(obj)
            }));
        },
        form: function (url, formOrObj, opts) {
            return ajax(url, Object.assign({}, opts || {}, {
                method: 'POST',
                body:   objToFormBody(formOrObj)
            }));
        }
    };

    global.DZ = {
        icons:      icons,
        eyeToggle:  eyeToggle,
        ajax:       ajax,            // low-level (kept for backward compat)
        fetch:      dzFetch,         // ← new: DZ.fetch.get / .post / .put / .del / .json / .form
        formBody:   formBody,
        submitForm: submitForm,
        toast:      toast
    };
})(window);
