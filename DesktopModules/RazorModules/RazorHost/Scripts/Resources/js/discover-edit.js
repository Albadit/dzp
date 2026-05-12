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

    // initIcons / toast are thin proxies onto window.DZ (dz-shared.js).
    // For HTTP, call DZ.fetch.{get,post,json,...} directly.
    function initIcons()       { window.DZ.icons(); }
    function toast(msg, kind)  { window.DZ.toast(msg, kind !== 'error'); }

    function initDropzones(root) {
        if (window.DtDropzone && typeof window.DtDropzone.initAll === 'function') {
            window.DtDropzone.initAll(root || document);
        }
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

        window.DZ.fetch.post(url, fd)
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

    // Recompute and write the "Knoppen (N)" counter in the collapsible
    // summary, plus the "N knoppen" subtitle in the cat header. Pass any
    // element inside the cat card; we walk up to .dt-sort-item.
    function updateBtnCount(anyEl) {
        if (!anyEl) return;
        var card = anyEl.closest && anyEl.closest('.dt-sort-item[data-id]');
        if (!card) return;
        var listEl = card.querySelector('[data-sortable="btn"]');
        if (!listEl) return;
        var n = listEl.querySelectorAll('[data-edit-btn-form]').length;
        // 1) Collapsible summary counter — <h3>Knoppen <span>(N)</span></h3>
        var headings = card.querySelectorAll('summary h3');
        for (var i = 0; i < headings.length; i++) {
            var h3 = headings[i];
            if (!/Knoppen/i.test(h3.textContent)) continue;
            var span = h3.querySelector('span');
            if (span) { span.textContent = '(' + n + ')'; }
            else      { h3.innerHTML = 'Knoppen <span class="text-foreground-400 normal-case font-medium">(' + n + ')</span>'; }
        }
        // 2) Cat header subtitle — <p>N knoppen</p> (or "1 knop")
        var sub = card.querySelector('summary p');
        if (sub) { sub.textContent = n + ' knop' + (n === 1 ? '' : 'pen'); }
    }

    // Build a button row matching the server-rendered template in
    // _CategoryItem.cshtml so we can append a new row in-place after a
    // successful AJAX add (no full page reload).
    function renderButtonRow(bId, catId, label, icon, url, visible) {
        var row = document.createElement('div');
        row.setAttribute('data-edit-btn-form', '');
        row.setAttribute('data-btn-id', String(bId));
        row.setAttribute('data-cat-id', String(catId));
        row.setAttribute('data-id', String(bId));
        row.className = 'dt-sort-item bg-content1 rounded-lg border border-divider p-4 flex flex-wrap items-end gap-3';
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
            +   '<label class="text-xs font-medium text-foreground-500">Label <span class="text-danger">*</span></label>'
            +   '<input id="btnLabel_' + esc(bId) + '" name="label" type="text" value="' + esc(label) + '" required '
            +   'class="w-full px-4 py-2.5 rounded-lg bg-content2 text-sm text-foreground-700 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />'
            + '</div>'
            + '<div class="w-full sm:w-auto sm:basis-32 sm:shrink-0 flex flex-col gap-1.5">'
            +   '<label class="text-xs font-medium text-foreground-500">Icon</label>'
            +   '<input id="btnIcon_' + esc(bId) + '" name="icon" type="text" value="' + esc(icon) + '" placeholder="chevron-right" data-icon-picker '
            +   'class="w-full px-4 py-2.5 rounded-lg bg-content2 text-sm text-foreground-700 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />'
            + '</div>'
            + '<div class="w-full sm:w-auto sm:flex-[2] sm:min-w-[12rem] flex flex-col gap-1.5">'
            +   '<label class="text-xs font-medium text-foreground-500">URL <span class="text-danger">*</span></label>'
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
            +   '<button type="button" data-ajax-delete="btn" data-btn-id="' + esc(bId) + '" title="Verwijderen" '
            +   'class="flex-1 sm:flex-none inline-flex items-center justify-center h-9 sm:size-9 rounded-lg border border-danger bg-danger text-white hover:bg-danger/90 transition">'
            +     '<i data-lucide="trash-2" class="size-4"></i>'
            +   '</button>'
            + '</div>';
        return row;
    }

    // Build a category card matching the server template in
    // Shared/DiscoverEdit/_CategoryItem.cshtml so a freshly-added category
    // appears in-place after AJAX save (no full page reload).
    function renderCategoryCard(catId, title, desc, icon, visible) {
        var card = document.createElement('div');
        card.className = 'dt-sort-item bg-content1 rounded-xl border border-divider overflow-hidden';
        card.setAttribute('data-id', String(catId));
        var initial = title && title.length > 0 ? title.charAt(0).toUpperCase() : '?';
        var visBtnCls = visible
            ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
            : 'border-divider bg-content2 text-foreground-400 hover:text-foreground-700 hover:bg-content3';
        card.innerHTML =
              '<details open>'
            +   '<summary class="cursor-pointer flex items-center gap-3 p-5 sm:p-6 hover:bg-content2/50 transition">'
            +     '<span class="dt-sort-handle shrink-0 inline-flex items-center justify-center size-8 rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-content2 cursor-grab active:cursor-grabbing" title="Sleep om te verplaatsen" onclick="event.preventDefault(); event.stopPropagation();">'
            +       '<i data-lucide="grip-vertical" class="size-4"></i>'
            +     '</span>'
            +     '<div class="size-10 rounded-lg flex items-center justify-center bg-primary/10 shrink-0 overflow-hidden">'
            +       (icon
                        ? '<i data-lucide="' + esc(icon) + '" class="size-5 text-primary"></i>'
                        : '<span class="text-sm font-bold text-primary">' + esc(initial) + '</span>')
            +     '</div>'
            +     '<div class="flex-1 min-w-0">'
            +       '<h2 class="text-base font-semibold text-foreground-900 truncate">' + esc(title) + '</h2>'
            +       '<p class="text-xs text-foreground-500 truncate">0 knoppen</p>'
            +     '</div>'
            +     (visible ? '' : '<span class="shrink-0 text-xs px-2 py-1 rounded-full bg-warning/10 text-warning-700 font-medium">verborgen</span>')
            +     '<i data-lucide="chevron-down" class="size-5 text-foreground-400 shrink-0 group-open:rotate-180"></i>'
            +   '</summary>'
            +   '<div class="p-5 sm:p-6 flex flex-col gap-4">'
            +     '<div data-edit-cat-form data-cat-id="' + esc(catId) + '" class="contents">'
            +       '<input type="hidden" name="formAction" value="cat-save" />'
            +       '<input type="hidden" name="catId" value="' + esc(catId) + '" />'
            +       '<div class="flex flex-col gap-1.5">'
            +         '<label class="text-sm font-medium text-foreground-700">Titel <span class="text-danger">*</span></label>'
            +         '<input id="catTitle_' + esc(catId) + '" name="title" type="text" value="' + esc(title) + '" required '
            +         'class="w-full px-4 py-2.5 rounded-lg bg-content2 text-sm text-foreground-700 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />'
            +       '</div>'
            +       '<div class="flex flex-col gap-1.5">'
            +         '<label class="text-sm font-medium text-foreground-700">Beschrijving</label>'
            +         '<textarea id="catDesc_' + esc(catId) + '" name="description" rows="3" '
            +         'class="w-full px-4 py-2.5 rounded-lg bg-content2 text-sm text-foreground-700 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition">' + esc(desc) + '</textarea>'
            +       '</div>'
            +       '<div class="flex flex-col gap-1.5">'
            +         '<label class="text-sm font-medium text-foreground-700">Icon</label>'
            +         '<input id="catIcon_' + esc(catId) + '" name="icon" type="text" value="' + esc(icon) + '" placeholder="bijv. map-pin" data-icon-picker '
            +         'class="w-full px-4 py-2.5 rounded-lg bg-content2 text-sm text-foreground-700 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />'
            +       '</div>'
            +       '<div class="flex items-center gap-4">'
            +         '<input type="hidden" name="isVisible" value="' + (visible ? '1' : '0') + '" data-vis-input />'
            +         '<button type="button" data-vis-toggle aria-pressed="' + (visible ? 'true' : 'false') + '" '
            +         'title="' + (visible ? 'Verbergen op de Ondekt-pagina' : 'Tonen op de Ondekt-pagina') + '" '
            +         'class="inline-flex items-center justify-center size-9 rounded-lg border transition-colors shrink-0 ' + visBtnCls + '">'
            +           '<i data-lucide="' + (visible ? 'eye' : 'eye-off') + '" class="size-4"></i>'
            +         '</button>'
            +         '<span class="text-sm font-medium text-foreground-700">Zichtbaar op de Ondekt-pagina</span>'
            +       '</div>'
            +       '<hr class="border-divider m-0" />'
            +       '<div class="flex flex-col-reverse sm:flex-row sm:flex-wrap items-stretch sm:items-center sm:justify-end gap-3">'
            +         '<button type="button" data-ajax-delete="cat" data-cat-id="' + esc(catId) + '" '
            +         'class="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-danger/40 bg-danger/10 text-danger-700 text-sm font-medium hover:bg-danger/20 transition">'
            +           '<span>Verwijderen</span>'
            +         '</button>'
            +         '<button type="submit" '
            +         'class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition">'
            +           '<i data-lucide="save" class="size-4"></i><span>Opslaan</span>'
            +         '</button>'
            +       '</div>'
            +     '</div>'
            +   '</div>'
            +   '<hr class="border-divider m-0" />'
            +   '<div class="bg-content2/30">'
            +     '<details class="group">'
            +       '<summary class="cursor-pointer flex items-center justify-between gap-2 list-none py-4">'
            +         '<h3 class="text-xs font-bold uppercase tracking-wider text-foreground-500">Knoppen <span class="text-foreground-400 normal-case font-medium">(0)</span></h3>'
            +         '<i data-lucide="chevron-down" class="size-4 text-foreground-400 group-open:rotate-180"></i>'
            +       '</summary>'
            +       '<div class="flex flex-col gap-4">'
            +         '<div class="flex flex-col gap-3" data-sortable="btn" data-cat-id="' + esc(catId) + '" data-reorder-url="' + esc(pageUrl) + '"></div>'
            +         '<button type="button" data-add-btn-trigger="' + esc(catId) + '" '
            +         'class="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-divider text-sm font-medium text-primary hover:border-primary hover:bg-primary/5 transition">'
            +           '<i data-lucide="plus" class="size-4"></i><span>Knop toevoegen</span>'
            +         '</button>'
            +       '</div>'
            +     '</details>'
            +   '</div>'
            + '</details>';
        return card;
    }

    function insertCategoryCard(catId, title, desc, icon, visible) {
        // Find the categories list (container with data-sortable="cat").
        var list = document.querySelector('[data-sortable="cat"]');
        if (!list) {
            // No categories yet — create the list right before the add-cat wrap.
            var addWrap = document.querySelector('[data-add-cat-wrap]');
            if (!addWrap || !addWrap.parentElement) { return; }
            list = document.createElement('div');
            list.className = 'flex flex-col gap-4';
            list.setAttribute('data-sortable', 'cat');
            list.setAttribute('data-reorder-url', pageUrl);
            addWrap.parentElement.insertBefore(list, addWrap);
        }
        var card = renderCategoryCard(catId, title, desc, icon, visible);
        list.appendChild(card);
        // Wire up everything inside the freshly-inserted card.
        initSortables(card);
        initSortables(list.parentElement || document);
        initDropzones(card);
        initIcons();
        try { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* ignore */ }
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

        // For an existing-category save, also collect every button row in the
        // same card and ship them along as a JSON payload. The server updates
        // them in one transaction so the user only needs the cat "Opslaan"
        // button to persist the whole panel.
        if (container.hasAttribute && container.hasAttribute('data-edit-cat-form')) {
            var card = container.closest('.dt-sort-item');
            if (card) {
                var btnRows = card.querySelectorAll('[data-edit-btn-form]');
                var arr = [];
                for (var bi = 0; bi < btnRows.length; bi++) {
                    var row = btnRows[bi];
                    var label = row.querySelector('input[name="label"]');
                    var iconI = row.querySelector('input[name="icon"]');
                    var url   = row.querySelector('input[name="url"]');
                    var visI  = row.querySelector('input[name="isVisible"]');
                    arr.push({
                        id:        row.getAttribute('data-btn-id') || '0',
                        tempId:    row.getAttribute('data-temp-id') || '',
                        label:     label ? label.value : '',
                        icon:      iconI ? iconI.value : '',
                        url:       url   ? url.value   : '',
                        isVisible: !!(visI && visI.value === '1')
                    });
                }
                fd.append('btnsJson', JSON.stringify(arr));
            }
        }
        if (!btn) btn = container.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.classList.add('opacity-60'); }

        // 'form' alias: rest of the code reads .querySelector / .closest / .reset / classList on it.
        var form = container;

        window.DZ.fetch.post(pageUrl, fd).then(function (res) {
            if (btn) { btn.disabled = false; btn.classList.remove('opacity-60'); }
            var d = res.data || {};
            if (res.ok && d.ok) {
                if (d.kind === 'cat' && d.id) {
                    var hCat = form.querySelector('input[name="catId"]');
                    if (hCat && hCat.value === '0') { hCat.value = String(d.id); }
                    if (form.hasAttribute('data-add-cat-form')) {
                        form.classList.add('hidden');
                        // Reset inputs manually (no <form> to call .reset() on).
                        var newTitle = '';
                        var newDesc  = '';
                        var newIcon  = '';
                        var newVis   = true;
                        var resetInputs = form.querySelectorAll('input, textarea, select');
                        for (var r = 0; r < resetInputs.length; r++) {
                            var ri = resetInputs[r];
                            if (ri.name === 'title')       { newTitle = ri.value; }
                            else if (ri.name === 'description') { newDesc = ri.value; }
                            else if (ri.name === 'icon')        { newIcon = ri.value; }
                            else if (ri.name === 'isVisible')   { newVis  = ri.value === '1'; }
                        }
                        for (var r2 = 0; r2 < resetInputs.length; r2++) {
                            var ri2 = resetInputs[r2];
                            if (ri2.name === 'catId') ri2.value = '0';
                            else if (ri2.name === 'formAction') { /* keep */ }
                            else if (ri2.name === 'isVisible')  { ri2.value = '1'; }
                            else if (ri2.type !== 'hidden') ri2.value = ri2.defaultValue || '';
                        }
                        // Reset the visibility eye button to default (visible).
                        var addVisBtn = form.querySelector('[data-vis-toggle]');
                        if (addVisBtn) {
                            addVisBtn.setAttribute('aria-pressed', 'true');
                            addVisBtn.setAttribute('title', 'Verbergen op de Ondekt-pagina');
                            addVisBtn.className = 'inline-flex items-center justify-center size-9 rounded-lg border transition-colors shrink-0 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20';
                            addVisBtn.innerHTML = '<i data-lucide="eye" class="size-4"></i>';
                        }
                        // Insert the new category card into the list (no reload).
                        insertCategoryCard(d.id, newTitle, newDesc, newIcon, newVis);
                        toast(d.msg || 'Categorie aangemaakt.', 'success');
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
                            var label   = (form.querySelector('input[name="label"]') || {}).value || '';
                            var icon    = (form.querySelector('input[name="icon"]')  || {}).value || '';
                            var url     = (form.querySelector('input[name="url"]')   || {}).value || '';
                            var visCb   = form.querySelector('input[name="isVisible"]');
                            var visible = !!(visCb && (visCb.type === 'checkbox' ? visCb.checked : visCb.value === '1'));

                            var row = renderButtonRow(d.id, catId, label, icon, url, visible);
                            listEl.appendChild(row);
                            initSortables(listEl.parentElement || document);
                            initDropzones(row);
                            initIcons();
                            try { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* ignore */ }
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
                // Existing-row edit: refresh on-screen labels so saved
                // values are reflected without a full page reload.
                if (d.kind === 'cat' && form.hasAttribute('data-edit-cat-form')) {
                    var card = form.closest('.dt-sort-item');
                    if (card) {
                        var newT = (form.querySelector('input[name="title"]') || {}).value || '';
                        var h2 = card.querySelector('summary h2');
                        if (h2) h2.textContent = newT;
                        var visI = form.querySelector('input[name="isVisible"]');
                        var isVis = !!(visI && visI.value === '1');
                        var hiddenBadge = card.querySelector('summary .bg-warning\\/10');
                        if (!isVis && !hiddenBadge) {
                            var chevron = card.querySelector('summary > i[data-lucide="chevron-down"]');
                            var badge = document.createElement('span');
                            badge.className = 'shrink-0 text-xs px-2 py-1 rounded-full bg-warning/10 text-warning-700 font-medium';
                            badge.textContent = 'verborgen';
                            if (chevron) chevron.parentNode.insertBefore(badge, chevron);
                        } else if (isVis && hiddenBadge) {
                            hiddenBadge.remove();
                        }
                        // Promote any not-yet-saved rows: the server returns
                        // an "inserts" map { tempId: newId } so we can stamp
                        // the real id onto the row and re-enable per-row delete.
                        if (d.inserts) {
                            for (var tk in d.inserts) {
                                if (!Object.prototype.hasOwnProperty.call(d.inserts, tk)) { continue; }
                                var tmpRow = card.querySelector('[data-temp-id="' + tk + '"]');
                                if (!tmpRow) { continue; }
                                var newBtnId = String(d.inserts[tk]);
                                tmpRow.setAttribute('data-btn-id', newBtnId);
                                tmpRow.setAttribute('data-id', newBtnId);
                                tmpRow.removeAttribute('data-temp-id');
                                var del = tmpRow.querySelector('[data-temp-remove]');
                                if (del) {
                                    del.removeAttribute('data-temp-remove');
                                    del.setAttribute('data-ajax-delete', 'btn');
                                    del.setAttribute('data-btn-id', newBtnId);
                                }
                                // Stamp the hidden btnId input too.
                                var hb = tmpRow.querySelector('input[name="btnId"]');
                                if (hb) { hb.value = newBtnId; }
                            }
                        }
                        // Bubble per-row update msgs (e.g. validation skips).
                        if (d.btnSkipped) {
                            toast(d.btnSkipped, 'error');
                        }
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
            window.DZ.eyeToggle(visBtn, nowVisible);
            return;
        }

        var addBtnTrig = e.target.closest && e.target.closest('[data-add-btn-trigger]');
        if (addBtnTrig) {
            e.preventDefault();
            var cid = addBtnTrig.getAttribute('data-add-btn-trigger');
            // Find this category's button list and append a fresh empty
            // draggable row. The category-level "Opslaan" will INSERT it.
            var card = addBtnTrig.closest('.dt-sort-item');
            var listEl = card && card.querySelector('[data-sortable="btn"][data-cat-id="' + cid + '"]');
            if (listEl) {
                var tempId = 't' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
                var row = renderButtonRow(0, cid, '', '', '', true);
                row.setAttribute('data-temp-id', tempId);
                row.removeAttribute('data-btn-id');           // not yet a real btn
                row.setAttribute('data-id', tempId);          // keep SortableJS happy
                // Hide the per-row delete on a not-yet-saved row: clicking
                // delete with btnId=0 wouldn't do anything server-side. Users
                // can just clear+remove the row manually before saving.
                var delEl = row.querySelector('[data-ajax-delete="btn"]');
                if (delEl) {
                    delEl.setAttribute('data-temp-remove', '1');
                    delEl.removeAttribute('data-ajax-delete');
                    delEl.setAttribute('title', 'Verwijderen');
                }
                listEl.appendChild(row);
                initSortables(listEl);
                initDropzones(row);
                initIcons();
                updateBtnCount(listEl);
                var firstInput = row.querySelector('input[name="label"]');
                if (firstInput) { firstInput.focus(); }
            }
            return;
        }

        // Pre-save delete for not-yet-persisted rows: just remove the row.
        var tmpDel = e.target.closest && e.target.closest('[data-temp-remove]');
        if (tmpDel) {
            e.preventDefault();
            var tmpRow = tmpDel.closest('.dt-sort-item');
            if (tmpRow) {
                var parent = tmpRow.parentElement;
                tmpRow.remove();
                updateBtnCount(parent);
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

            window.DZ.fetch.post(pageUrl, fd).then(function (res) {
                var d = res.data || {};
                if (res.ok && d.ok) {
                    var row = kind === 'btn'
                        ? delBtn.closest('[data-edit-btn-form]') || delBtn.closest('.dt-sort-item')
                        : delBtn.closest('.dt-sort-item');
                    if (row) {
                        var rowParent = row.parentElement;
                        row.remove();
                        if (kind === 'btn') { updateBtnCount(rowParent); }
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
