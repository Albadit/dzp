// Roles + Permissions page controller.
//
// Pairs with:
//   _Permissions.cshtml                 (server orchestrator + AJAX endpoint)
//   Shared/Permissions/_Toolbar.cshtml
//   Shared/Permissions/_Table.cshtml    (composes _DataTable + _Pagination + _KebabMenu)
//   Shared/Permissions/_Modal.cshtml
//
// Reads window.DZ_PERMISSIONS:
//   roles    [{ id, name, group, description, isSystem, perms:[key,...] }]
//   catalog  [{ id, key, area, label }]
//   saveUrl  string  POST endpoint accepting { roleId, permissionIds:[id,...] }
//
// Layout: rows are <div> flex containers (no <table>). Column widths must match
// _Table.cshtml columns: w-10 / flex-1 / flex-1 / w-32 / w-24.
(function (global) {
    'use strict';

    var DATA = global.DZ_PERMISSIONS || { roles: [], catalog: [], saveUrl: '' };

    var TABLE_ID = 'dzRole';

    var state = {
        filter:   '',
        page:     1,
        pageSize: 10,
        openMenuRoleId: null
    };

    var $rows, $empty, $search, $count;
    var $pagePrev, $pageNext, $pageNum, $pageTotal, $pageSizeHost;
    var $modal, $modalTitle, $modalSub, $modalBody, $modalStatus, $modalSave;
    var $actionsTpl;

    function $(id) { return document.getElementById(id); }

    function init() {
        $rows         = $(TABLE_ID + 'Rows');
        $empty        = $(TABLE_ID + 'Empty');
        $search       = $('dzRoleSearch');
        $count        = $(TABLE_ID + 'CountNum');
        $pagePrev     = $(TABLE_ID + 'Prev');
        $pageNext     = $(TABLE_ID + 'Next');
        $pageNum      = $(TABLE_ID + 'Page');
        $pageTotal    = $(TABLE_ID + 'Total');
        $pageSizeHost = $(TABLE_ID + 'Size');
        $modal        = $('dzPermModal');
        $modalTitle   = $('dzPermModalTitle');
        $modalSub     = $('dzPermModalSub');
        $modalBody    = $('dzPermModalBody');
        $modalStatus  = $('dzPermModalStatus');
        $modalSave    = $('dzPermModalSave');
        $actionsTpl   = $('dzRoleActionsTpl');
        if (!$rows) return;

        bindEvents();
        bootstrapPageSize();
        render();
    }

    function bindEvents() {
        $search.addEventListener('input', function () {
            state.filter = $search.value.trim().toLowerCase();
            state.page = 1;
            render();
        });

        $pagePrev.addEventListener('click', function () {
            if (state.page > 1) { state.page--; render(); }
        });
        $pageNext.addEventListener('click', function () {
            if (state.page < totalPages()) { state.page++; render(); }
        });
        $pageNum.addEventListener('change', function () {
            var v = parseInt($pageNum.value, 10);
            var max = totalPages();
            if (isNaN(v) || v < 1) v = 1;
            if (v > max) v = max;
            state.page = v;
            render();
        });

        document.addEventListener('click', function (e) {
            if (state.openMenuRoleId == null) return;
            var menu = document.querySelector('[data-dz-actions-menu]');
            var trigger = document.querySelector('[data-dz-actions-trigger="' + state.openMenuRoleId + '"]');
            if (menu && (menu.contains(e.target) || (trigger && trigger.contains(e.target)))) return;
            closeMenu();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if (!$modal.classList.contains('hidden')) { closeModal(); }
                else if (state.openMenuRoleId != null) { closeMenu(); }
            }
        });

        $modal.querySelectorAll('[data-dz-perm-close]').forEach(function (b) {
            b.addEventListener('click', closeModal);
        });
        var bd = $modal.querySelector('[data-dz-modal-backdrop]');
        if (bd) bd.addEventListener('click', closeModal);

        $modalSave.addEventListener('click', saveModal);
    }

    // Upgrade the page-size host <div> into a MultiSelect dropdown so it
    // matches the rest of the app's selects.
    function bootstrapPageSize() {
        if (!$pageSizeHost || typeof global.MultiSelect === 'undefined') return;
        var optsAttr = $pageSizeHost.getAttribute('data-dz-options') || '[]';
        var selAttr  = $pageSizeHost.getAttribute('data-dz-selected') || '[]';
        var opts, sel;
        try { opts = JSON.parse(optsAttr); } catch (e) { opts = []; }
        try { sel  = JSON.parse(selAttr); }  catch (e) { sel  = []; }
        if (sel.length) state.pageSize = parseInt(sel[0], 10) || 10;

        global.MultiSelect.create($pageSizeHost, {
            placeholder: 'Per page',
            options:     opts,
            selected:    sel,
            single:      true,
            onChange:    function (vals) {
                if (!vals || !vals.length) return;
                state.pageSize = parseInt(vals[0], 10) || 10;
                state.page = 1;
                render();
            }
        });
    }

    // ---- helpers ---------------------------------------------------------
    function filteredRoles() {
        if (!state.filter) return DATA.roles;
        return DATA.roles.filter(function (r) {
            return (r.name || '').toLowerCase().indexOf(state.filter) >= 0
                || (r.description || '').toLowerCase().indexOf(state.filter) >= 0
                || (r.group || '').toLowerCase().indexOf(state.filter) >= 0;
        });
    }
    function totalPages() {
        return Math.max(1, Math.ceil(filteredRoles().length / state.pageSize));
    }
    function pageSlice() {
        var rows  = filteredRoles();
        var start = (state.page - 1) * state.pageSize;
        return rows.slice(start, start + state.pageSize);
    }
    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function refreshIcons() {
        if (global.lucide && typeof global.lucide.createIcons === 'function') {
            global.lucide.createIcons();
        }
    }

    // ---- rendering -------------------------------------------------------
    function render() {
        var all  = filteredRoles();
        var max  = totalPages();
        if (state.page > max) state.page = max;
        var rows = pageSlice();

        $count.textContent     = all.length;
        $pageTotal.textContent = max;
        $pageNum.value         = state.page;
        $pagePrev.disabled     = state.page <= 1;
        $pageNext.disabled     = state.page >= max;

        if (rows.length === 0) {
            $rows.innerHTML = '';
            $empty.classList.remove('hidden');
            return;
        }
        $empty.classList.add('hidden');

        var html = rows.map(function (r) {
            var typeLabel = r.isSystem ? 'System' : 'Custom';
            var typeClass = r.isSystem
                ? 'bg-secondary/10 text-secondary-700'
                : 'bg-primary/10 text-primary-700';
            return ''
                + '<div class="flex items-center gap-4 min-h-14 border-t border-divider hover:bg-default-50/50 transition-colors">'
                +   '<div class="w-10 flex items-center justify-center">'
                +     '<i data-lucide="' + (r.isSystem ? 'lock' : 'shield') + '" class="size-4 text-foreground-400"></i>'
                +   '</div>'
                +   '<div class="flex-1 min-w-0 flex flex-col gap-0.5">'
                +     '<span class="font-semibold text-foreground-900 truncate">' + escapeHtml(r.name) + '</span>'
                +     '<span class="text-xs text-foreground-500 truncate">RoleID ' + r.id + ' &middot; ' + (r.perms ? r.perms.length : 0) + ' permission(s)</span>'
                +   '</div>'
                +   '<div class="flex-1 min-w-0 text-foreground-600 truncate">' + escapeHtml(r.description || r.group || '—') + '</div>'
                +   '<div class="w-32 flex items-center">'
                +     '<span class="inline-flex items-center gap-1 h-6 rounded-full text-xs font-medium ' + typeClass + '">'
                +       '<span class="w-6 flex items-center justify-center">'
                +         '<i data-lucide="' + (r.isSystem ? 'lock' : 'user') + '" class="size-3"></i>'
                +       '</span>'
                +       '<span class="pr-2">' + typeLabel + '</span>'
                +     '</span>'
                +   '</div>'
                +   '<div class="w-24 flex items-center justify-end">'
                +     '<div class="relative">'
                +       '<button type="button" data-dz-actions-trigger="' + r.id + '"'
                +              ' class="inline-flex items-center justify-center size-8 rounded-md text-foreground-500 hover:bg-default-100 hover:text-primary transition">'
                +         '<i data-lucide="more-vertical" class="size-4"></i>'
                +       '</button>'
                +       '<div data-dz-actions-host="' + r.id + '"></div>'
                +     '</div>'
                +   '</div>'
                + '</div>';
        }).join('');
        $rows.innerHTML = html;

        $rows.querySelectorAll('[data-dz-actions-trigger]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var rid = parseInt(btn.getAttribute('data-dz-actions-trigger'), 10);
                toggleMenu(rid);
            });
        });
        refreshIcons();
    }

    // ---- kebab dropdown --------------------------------------------------
    function toggleMenu(roleId) {
        if (state.openMenuRoleId === roleId) { closeMenu(); return; }
        closeMenu();
        var host = $rows.querySelector('[data-dz-actions-host="' + roleId + '"]');
        if (!host || !$actionsTpl) return;
        var node = $actionsTpl.content.firstElementChild.cloneNode(true);
        node.setAttribute('data-dz-actions-menu', String(roleId));
        host.appendChild(node);

        node.querySelectorAll('[data-action]').forEach(function (b) {
            b.addEventListener('click', function () {
                var action = b.getAttribute('data-action');
                var role = DATA.roles.find(function (x) { return x.id === roleId; });
                closeMenu();
                if (!role) return;
                if (action === 'permissions')  { openModal(role); }
                else if (action === 'edit')    { alert('Edit role is not implemented yet.'); }
                else if (action === 'delete')  { alert('Delete role is not implemented yet.'); }
            });
        });

        state.openMenuRoleId = roleId;
        refreshIcons();
    }
    function closeMenu() {
        if (state.openMenuRoleId == null) return;
        var menu = document.querySelector('[data-dz-actions-menu]');
        if (menu && menu.parentNode) menu.parentNode.removeChild(menu);
        state.openMenuRoleId = null;
    }

    // ---- modal -----------------------------------------------------------
    var modalRoleId = 0;

    function openModal(role) {
        modalRoleId = role.id;
        $modalTitle.textContent  = 'Manage Permissions: ' + role.name;
        $modalSub.textContent    = (role.group || '') + ' · RoleID ' + role.id;
        $modalStatus.textContent = '';
        $modalSave.disabled      = false;

        var byArea = {};
        DATA.catalog.forEach(function (p) {
            (byArea[p.area] = byArea[p.area] || []).push(p);
        });
        var have = {};
        (role.perms || []).forEach(function (k) { have[String(k).toLowerCase()] = true; });

        var html = Object.keys(byArea).map(function (area) {
            var items = byArea[area].map(function (p) {
                var checked = have[String(p.key || '').toLowerCase()] ? 'checked' : '';
                return ''
                    + '<label class="flex items-center gap-2 min-h-8 cursor-pointer hover:text-primary transition">'
                    +   '<input type="checkbox" data-dz-perm-id="' + p.id + '" ' + checked
                    +       ' class="size-4 rounded text-primary focus:ring-primary cursor-pointer" />'
                    +   '<span class="text-sm text-foreground-700">' + escapeHtml(p.label) + '</span>'
                    +   '<code class="text-[11px] text-foreground-400">' + escapeHtml(p.key) + '</code>'
                    + '</label>';
            }).join('');
            return ''
                + '<section class="flex flex-col gap-2 border border-divider rounded-lg">'
                +   '<header class="flex items-center gap-2 min-h-9 border-b border-divider">'
                +     '<span class="w-3"></span>'
                +     '<h4 class="text-xs font-semibold uppercase text-foreground-500">' + escapeHtml(area) + '</h4>'
                +   '</header>'
                +   '<div class="flex flex-wrap gap-x-6 gap-y-1">' + items + '</div>'
                + '</section>';
        }).join('');
        $modalBody.innerHTML = html;

        $modal.classList.remove('hidden');
        refreshIcons();
        setTimeout(function () { try { $modalSave.focus(); } catch (e) {} }, 0);
    }
    function closeModal() {
        $modal.classList.add('hidden');
        modalRoleId = 0;
    }

    function saveModal() {
        if (!modalRoleId || !DATA.saveUrl) return;
        var ids = [];
        $modalBody.querySelectorAll('input[type="checkbox"][data-dz-perm-id]').forEach(function (cb) {
            if (cb.checked) ids.push(parseInt(cb.getAttribute('data-dz-perm-id'), 10));
        });

        $modalSave.disabled      = true;
        $modalStatus.textContent = 'Saving...';

        fetch(DATA.saveUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type':    'application/json',
                'X-Requested-With':'XMLHttpRequest'
            },
            body: JSON.stringify({ roleId: modalRoleId, permissionIds: ids })
        }).then(function (resp) {
            return resp.json().catch(function () { return { ok: false, error: 'Bad response' }; });
        }).then(function (result) {
            if (!result || !result.ok) {
                $modalStatus.textContent = 'Save failed: ' + ((result && result.error) || 'unknown error');
                $modalSave.disabled = false;
                return;
            }
            var role = DATA.roles.find(function (x) { return x.id === modalRoleId; });
            if (role) {
                var keys = [];
                ids.forEach(function (pid) {
                    var p = DATA.catalog.find(function (c) { return c.id === pid; });
                    if (p) keys.push(p.key);
                });
                role.perms = keys;
            }
            $modalStatus.textContent = 'Saved.';
            $modalSave.disabled = false;
            render();
        }).catch(function (err) {
            $modalStatus.textContent = 'Save failed: ' + (err && err.message ? err.message : err);
            $modalSave.disabled = false;
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window);
