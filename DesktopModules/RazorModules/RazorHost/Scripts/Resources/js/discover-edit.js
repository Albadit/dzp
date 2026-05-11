/*
    Client-side wiring for the discovery edit page (_DiscoverEdit.cshtml).
      - renders Lucide icons after load
      - initializes all dropzones via DtDropzone.initAll
      - drag-to-reorder via SortableJS: posts new order to the same page
      - AJAX form submit (data-ajax) for category + button save (no reload)
      - AJAX delete (data-ajax-delete) for category + button
      - Survey-style "+ Add" inline triggers reveal hidden forms

    Server contract for AJAX:
      Request must send header X-Requested-With: fetch.
      JSON response: { ok: bool, id: int, kind: "cat"|"btn", msg: string }

    Assumes dropzone.js (window.DtDropzone), lucide.js and Sortable
    (window.Sortable) are already loaded.
*/
(function () {
    'use strict';

    var pageUrl = window.location.pathname + window.location.search;

    function initIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function initDropzones(root) {
        if (window.DtDropzone && typeof window.DtDropzone.initAll === 'function') {
            window.DtDropzone.initAll(root || document);
        }
    }

    function toast(message, kind) {
        // Use the shared toast if available so DiscoverEdit and CompanyEdit
        // share the exact same look-and-feel.
        if (window.DZToast && typeof window.DZToast.show === 'function') {
            window.DZToast.show(message, kind !== 'error');
            return;
        }
        // Fallback: in-page region (kept around for when the shared script
        // is unavailable, e.g. cached/legacy pages).
        var region = document.getElementById('de-toast-region');
        if (!region) return;
        var color = kind === 'error'
            ? 'border-danger/40 bg-danger/10 text-danger-700'
            : 'border-success/40 bg-success/10 text-success-700';
        var icon = kind === 'error' ? 'alert-circle' : 'check-circle-2';
        var el = document.createElement('div');
        el.className = 'pointer-events-auto px-3 py-2 rounded-lg border text-sm shadow-md flex items-center gap-2 ' + color;
        el.innerHTML = '<i data-lucide="' + icon + '" class="size-4"></i><span></span>';
        el.querySelector('span').textContent = message || '';
        region.appendChild(el);
        initIcons();
        setTimeout(function () {
            el.style.transition = 'opacity .3s';
            el.style.opacity = '0';
            setTimeout(function () { el.remove(); }, 350);
        }, 2200);
    }

    function ajaxPost(url, fd) {        return fetch(url, {
            method: 'POST',
            body: fd,
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'fetch' }
        }).then(function (r) {
            return r.text().then(function (text) {
                var data = null;
                try { data = JSON.parse(text); } catch (e) { /* not JSON */ }
                return { status: r.status, ok: r.ok, data: data, raw: text };
            });
        });
    }

    function postReorder(container) {
        var url   = container.getAttribute('data-reorder-url') || pageUrl;
        var kind  = container.getAttribute('data-sortable'); // "cat" or "btn"
        var catId = container.getAttribute('data-cat-id') || '';
        var ids   = Array.prototype.map.call(
            container.querySelectorAll('.dt-sort-item'),
            function (el) { return el.getAttribute('data-id'); }
        ).filter(function (x) { return x && x !== '0'; }).join(',');

        var fd = new FormData();
        fd.append('formAction', kind === 'cat' ? 'cat-reorder' : 'btn-reorder');
        fd.append('orderedIds', ids);
        if (catId) { fd.append('catId', catId); }

        container.classList.add('dt-sort-saving');

        fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function () {
                container.classList.remove('dt-sort-saving');
                container.classList.add('dt-sort-saved');
                setTimeout(function () { container.classList.remove('dt-sort-saved'); }, 800);
            })
            .catch(function () {
                container.classList.remove('dt-sort-saving');
                container.classList.add('dt-sort-error');
                setTimeout(function () { container.classList.remove('dt-sort-error'); }, 1500);
            });
    }

    function initSortables(root) {
        if (!window.Sortable) return;
        var nodes = (root || document).querySelectorAll('[data-sortable]:not([data-sort-init])');
        Array.prototype.forEach.call(nodes, function (container) {
            container.setAttribute('data-sort-init', '1');
            window.Sortable.create(container, {
                handle: '.dt-sort-handle',
                animation: 150,
                ghostClass: 'dt-sort-ghost',
                chosenClass: 'dt-sort-chosen',
                onEnd: function () { postReorder(container); }
            });
        });
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Build a button row matching the server-rendered template in
    // _DiscoverEdit.cshtml so we can append a new row in-place after a
    // successful AJAX add (no full page reload).
    function renderButtonRow(bId, catId, label, icon, url, visible) {
        var row = document.createElement('form');
        row.method = 'post';
        row.setAttribute('data-ajax', 'btn-save');
        row.className = 'dt-sort-item bg-content1 rounded-lg border border-divider p-4 flex flex-wrap items-end gap-3';
        row.setAttribute('data-id', String(bId));
        var onCls  = 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20';
        var offCls = 'border-divider bg-content2 text-foreground-400 hover:text-foreground-700 hover:bg-content3';
        row.innerHTML =
              '<input type="hidden" name="formAction" value="btn-save" />'
            + '<input type="hidden" name="catId"      value="' + esc(catId) + '" />'
            + '<input type="hidden" name="btnId"      value="' + esc(bId) + '" />'
            + '<span class="dt-sort-handle hidden sm:inline-flex items-center justify-center size-9 rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-content2 cursor-grab active:cursor-grabbing shrink-0" title="Sleep om te verplaatsen">'
            +   '<i data-lucide="grip-vertical" class="size-4"></i>'
            + '</span>'
            + '<div class="w-full sm:w-auto sm:flex-1 sm:min-w-[10rem] flex flex-col gap-1.5">'
            +   '<label class="text-xs font-medium text-foreground-500">Label *</label>'
            +   '<input id="btnLabel_' + esc(bId) + '" name="label" type="text" value="' + esc(label) + '" required '
            +   'class="w-full px-4 py-2.5 rounded-lg bg-content2 text-sm text-foreground-700 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />'
            + '</div>'
            + '<div class="w-full sm:w-auto sm:basis-32 sm:shrink-0 flex flex-col gap-1.5">'
            +   '<label class="text-xs font-medium text-foreground-500">Icon</label>'
            +   '<input id="btnIcon_' + esc(bId) + '" name="icon" type="text" value="' + esc(icon) + '" placeholder="chevron-right" '
            +   'class="w-full px-4 py-2.5 rounded-lg bg-content2 text-sm text-foreground-700 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />'
            + '</div>'
            + '<div class="w-full sm:w-auto sm:flex-[2] sm:min-w-[12rem] flex flex-col gap-1.5">'
            +   '<label class="text-xs font-medium text-foreground-500">URL *</label>'
            +   '<input id="btnUrl_' + esc(bId) + '" name="url" type="text" value="' + esc(url) + '" required '
            +   'class="w-full px-4 py-2.5 rounded-lg bg-content2 text-sm text-foreground-700 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />'
            + '</div>'
            + '<div class="w-full sm:w-auto flex items-center gap-2 sm:justify-end">'
            +   '<input type="hidden" name="isVisible" value="' + (visible ? '1' : '0') + '" data-vis-input />'
            +   '<button type="button" data-vis-toggle aria-pressed="' + (visible ? 'true' : 'false') + '" '
            +   'title="' + (visible ? 'Verbergen' : 'Tonen') + '" '
            +   'class="flex-1 sm:flex-none inline-flex items-center justify-center h-9 sm:size-9 rounded-lg border transition-colors ' + (visible ? onCls : offCls) + '">'
            +     '<i data-lucide="' + (visible ? 'eye' : 'eye-off') + '" class="size-4"></i>'
            +   '</button>'
            +   '<button type="submit" title="Opslaan" '
            +   'class="flex-1 sm:flex-none inline-flex items-center justify-center h-9 sm:size-9 rounded-lg bg-primary text-white hover:bg-primary/90 transition">'
            +     '<i data-lucide="save" class="size-4"></i>'
            +   '</button>'
            +   '<button type="button" data-ajax-delete="btn" data-btn-id="' + esc(bId) + '" title="Verwijderen" '
            +   'class="flex-1 sm:flex-none inline-flex items-center justify-center h-9 sm:size-9 rounded-lg border border-divider text-foreground-700 hover:bg-content2 hover:border-danger/40 hover:text-danger-700 transition">'
            +     '<i data-lucide="trash-2" class="size-4"></i>'
            +   '</button>'
            + '</div>';
        return row;
    }

    /* ── AJAX form submit ──
       NOTE: DNN wraps the whole page in a single <form id="Form">, and the
       browser's HTML5 parser strips any nested <form> elements (their content
       is promoted into the parent, attributes lost). That means our
       <form data-ajax> wrappers do not survive in the DOM. To submit
       reliably we listen for clicks on submit buttons INSIDE our marker
       containers ([data-add-cat-form], [data-add-btn-form], [data-ajax])
       and synthesize the AJAX POST from the inputs in that container.
       We also catch the bubble-up "submit" event on DNN's outer form so
       pressing Enter in one of our inputs does not accidentally post the
       whole DNN page. */

    function findAjaxContainer(el) {
        // Direct AJAX container (when <form data-ajax> survives, e.g. existing
        // button-row <div data-ajax="btn-save"> rendered by JS).
        var c = el.closest('[data-ajax]');
        if (c) return c;
        // Fallback: marker divs around stripped <form> content.
        return el.closest('[data-add-cat-form], [data-add-btn-form], [data-edit-cat-form], [data-edit-btn-form]');
    }

    function submitContainer(container, btn) {
        if (!container) return;
        var fd = new FormData();
        var inputs = container.querySelectorAll('input[name], select[name], textarea[name]');
        for (var i = 0; i < inputs.length; i++) {
            var ip = inputs[i];
            if (ip.type === 'checkbox' || ip.type === 'radio') {
                if (ip.checked) fd.append(ip.name, ip.value);
            } else if (ip.type === 'file') {
                if (ip.files) {
                    for (var k = 0; k < ip.files.length; k++) fd.append(ip.name, ip.files[k]);
                }
            } else {
                fd.append(ip.name, ip.value);
            }
        }
        if (!btn) btn = container.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.classList.add('opacity-60'); }

        // 'form' alias: rest of the code reads .querySelector / .closest / .reset / classList on it.
        var form = container;

        ajaxPost(pageUrl, fd).then(function (res) {
            if (btn) { btn.disabled = false; btn.classList.remove('opacity-60'); }
            var d = res.data || {};
            if (res.ok && d.ok) {
                if (d.kind === 'cat' && d.id) {
                    var hCat = form.querySelector('input[name="catId"]');
                    if (hCat && hCat.value === '0') { hCat.value = String(d.id); }
                    if (form.hasAttribute('data-add-cat-form')) {
                        form.classList.add('hidden');
                        // Reset inputs manually (no <form> to call .reset() on).
                        var resetInputs = form.querySelectorAll('input, textarea, select');
                        for (var r = 0; r < resetInputs.length; r++) {
                            var ri = resetInputs[r];
                            if (ri.name === 'catId') ri.value = '0';
                            else if (ri.name === 'formAction') { /* keep */ }
                            else if (ri.type !== 'hidden') ri.value = ri.defaultValue || '';
                        }
                        toast(d.msg || 'Categorie aangemaakt.', 'success');
                        setTimeout(function () { window.location.reload(); }, 700);
                        return;
                    }
                } else if (d.kind === 'btn' && d.id) {
                    var hBtn = form.querySelector('input[name="btnId"]');
                    if (hBtn && hBtn.value === '0') { hBtn.value = String(d.id); }
                    if (form.hasAttribute('data-add-btn-form')) {
                        var wrap   = form.closest('[data-add-btn-wrap]');
                        var catEl  = wrap && wrap.previousElementSibling;
                        while (catEl && !(catEl.getAttribute && catEl.getAttribute('data-sortable') === 'btn')) {
                            catEl = catEl.previousElementSibling;
                        }
                        var listEl = catEl;
                        var catId  = form.querySelector('input[name="catId"]') ? form.querySelector('input[name="catId"]').value : '0';
                        if (listEl) {
                            var ph = listEl.parentElement && listEl.parentElement.querySelector('p.italic');
                            if (ph) ph.remove();

                            var label   = (form.querySelector('input[name="label"]') || {}).value || '';
                            var icon    = (form.querySelector('input[name="icon"]')  || {}).value || '';
                            var url     = (form.querySelector('input[name="url"]')   || {}).value || '';
                            var visCb   = form.querySelector('input[name="isVisible"]');
                            var visible = !!(visCb && (visCb.type === 'checkbox' ? visCb.checked : visCb.value === '1'));

                            var row = renderButtonRow(d.id, catId, label, icon, url, visible);
                            listEl.appendChild(row);
                            initSortables(listEl.parentElement || document);
                            initIcons();
                        }
                        // Reset visible fields manually.
                        var bResetInputs = form.querySelectorAll('input, textarea, select');
                        for (var br = 0; br < bResetInputs.length; br++) {
                            var bri = bResetInputs[br];
                            if (bri.name === 'btnId') bri.value = '0';
                            else if (bri.name === 'catId' || bri.name === 'formAction') { /* keep */ }
                            else if (bri.name === 'isVisible') bri.value = '1';
                            else if (bri.type !== 'hidden') bri.value = bri.defaultValue || '';
                        }
                        toast(d.msg || 'Knop toegevoegd.', 'success');
                        return;
                    }
                }
                toast(d.msg || 'Opgeslagen.', 'success');
            } else {
                toast((d && d.msg) || ('Fout (' + res.status + ')'), 'error');
            }
        }).catch(function (err) {
            if (btn) { btn.disabled = false; btn.classList.remove('opacity-60'); }
            toast('Netwerkfout: ' + (err && err.message ? err.message : ''), 'error');
        });
    }

    function onFormSubmit(e) {
        // Real <form data-ajax> elements (rare — most are stripped by the parser).
        var form = e.target;
        if (form && form.tagName === 'FORM' && form.hasAttribute('data-ajax')) {
            e.preventDefault();
            submitContainer(form, form.querySelector('button[type="submit"]'));
            return;
        }
        // DNN's outer form: if a submit click came from one of our inputs/buttons
        // inside an AJAX container, block the page-wide POST.
        if (form && form.tagName === 'FORM' && form.id === 'Form') {
            var active = document.activeElement;
            var container = active && findAjaxContainer(active);
            if (container) {
                e.preventDefault();
                submitContainer(container, container.querySelector('button[type="submit"]'));
            }
        }
    }

    function onSubmitButtonClick(e) {
        var btn = e.target.closest && e.target.closest('button[type="submit"]');
        if (!btn) return;
        var container = findAjaxContainer(btn);
        if (!container) return;
        // If the container IS an actual <form data-ajax>, the native submit event
        // will fire — let it. Otherwise, the <form> was stripped, so we must
        // handle the click ourselves.
        if (container.tagName === 'FORM') return;
        e.preventDefault();
        submitContainer(container, btn);
    }

    /* ── Click handler: inline-add toggles + AJAX delete ── */
    function onClick(e) {        var addCatTrig = e.target.closest && e.target.closest('[data-add-cat-trigger]');
        if (addCatTrig) {
            var wrap = addCatTrig.closest('[data-add-cat-wrap]');
            var f = wrap && wrap.querySelector('[data-add-cat-form]');
            if (f) {
                f.classList.toggle('hidden');
                if (!f.classList.contains('hidden')) {
                    initDropzones(f);
                    initIcons();
                    var first = f.querySelector('input[type="text"], input:not([type])');
                    if (first) first.focus();
                }
            }
            return;
        }
        var addCatCancel = e.target.closest && e.target.closest('[data-add-cat-cancel]');
        if (addCatCancel) {
            var f2 = addCatCancel.closest('[data-add-cat-form]');
            if (f2) { f2.classList.add('hidden'); f2.reset(); }
            return;
        }
        var visBtn = e.target.closest && e.target.closest('[data-vis-toggle]');
        if (visBtn) {
            e.preventDefault();
            // Hidden input lives next to the button in the same wrapper.
            var input = visBtn.parentElement && visBtn.parentElement.querySelector('[data-vis-input]');
            var nowVisible = !(input && input.value === '1');
            if (input) input.value = nowVisible ? '1' : '0';
            // Match CompanyEdit's setEyeButtonState pattern.
            var onCls  = ['border-primary/30','bg-primary/10','text-primary','hover:bg-primary/20'];
            var offCls = ['border-divider','bg-content2','text-foreground-400','hover:text-foreground-700','hover:bg-content3'];
            (nowVisible ? offCls : onCls).forEach(function (c) { visBtn.classList.remove(c); });
            (nowVisible ? onCls : offCls).forEach(function (c) { visBtn.classList.add(c); });
            visBtn.setAttribute('aria-pressed', nowVisible ? 'true' : 'false');
            visBtn.setAttribute('title', nowVisible ? 'Verbergen' : 'Tonen');
            // Lucide has already replaced the original <i> with an <svg>; reset
            // the inner markup with a fresh <i> and re-run lucide to swap the icon.
            visBtn.innerHTML = '<i data-lucide="' + (nowVisible ? 'eye' : 'eye-off') + '" class="size-4"></i>';
            initIcons();
            return;
        }

        var addBtnTrig = e.target.closest && e.target.closest('[data-add-btn-trigger]');
        if (addBtnTrig) {
            var cid = addBtnTrig.getAttribute('data-add-btn-trigger');
            var bf = document.querySelector('[data-add-btn-form="' + cid + '"]');
            if (bf) {
                bf.classList.toggle('hidden');
                if (!bf.classList.contains('hidden')) {
                    initIcons();
                    var firstB = bf.querySelector('input[type="text"], input:not([type])');
                    if (firstB) firstB.focus();
                }
            }
            return;
        }

        var delBtn = e.target.closest && e.target.closest('[data-ajax-delete]');
        if (!delBtn) return;
        e.preventDefault();
        var kind = delBtn.getAttribute('data-ajax-delete');
        var modalOpts = kind === 'cat'
            ? { title: 'Categorie verwijderen?',
                message: 'De categorie en alle bijbehorende knoppen worden verwijderd. Dit kan niet ongedaan gemaakt worden.',
                confirmLabel: 'Verwijderen' }
            : { title: 'Knop verwijderen?',
                message: 'Deze knop wordt verwijderd. Dit kan niet ongedaan gemaakt worden.',
                confirmLabel: 'Verwijderen' };

        function doDelete() {
            var fd = new FormData();
            if (kind === 'cat') {
                fd.append('formAction', 'cat-delete');
                fd.append('catId', delBtn.getAttribute('data-cat-id') || '0');
            } else {
                fd.append('formAction', 'btn-delete');
                fd.append('btnId', delBtn.getAttribute('data-btn-id') || '0');
            }

            delBtn.disabled = true;
            delBtn.classList.add('opacity-60');

            ajaxPost(pageUrl, fd).then(function (res) {
                var d = res.data || {};
                if (res.ok && d.ok) {
                    var row = kind === 'btn'
                        ? delBtn.closest('form.dt-sort-item')
                        : delBtn.closest('.dt-sort-item');
                    if (row) {
                        row.style.transition = 'opacity .25s';
                        row.style.opacity = '0';
                        setTimeout(function () { row.remove(); }, 260);
                    }
                    toast(d.msg || 'Verwijderd.', 'success');
                } else {
                    delBtn.disabled = false;
                    delBtn.classList.remove('opacity-60');
                    toast((d && d.msg) || ('Fout (' + res.status + ')'), 'error');
                }
            }).catch(function (err) {
                delBtn.disabled = false;
                delBtn.classList.remove('opacity-60');
                toast('Netwerkfout: ' + (err && err.message ? err.message : ''), 'error');
            });
        }

        if (window.DZModal && typeof window.DZModal.confirm === 'function') {
            window.DZModal.confirm({
                title: modalOpts.title,
                message: modalOpts.message,
                confirmLabel: modalOpts.confirmLabel,
                kind: 'danger',
                icon: 'trash-2',
                onConfirm: doDelete
            });
        } else if (window.confirm(modalOpts.message)) {
            doDelete();
        }
    }

    function onReady() {
        initIcons();
        initDropzones(document);
        initSortables(document);

        document.addEventListener('submit', onFormSubmit, true);
        document.addEventListener('click', onSubmitButtonClick, true);
        document.addEventListener('click', onClick, false);

        // <details> 'toggle' events do not bubble; capture phase.
        document.addEventListener('toggle', function (e) {
            var t = e.target;
            if (t && t.tagName === 'DETAILS' && t.open) {
                initDropzones(t);
                initSortables(t);
                initIcons();
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})();
