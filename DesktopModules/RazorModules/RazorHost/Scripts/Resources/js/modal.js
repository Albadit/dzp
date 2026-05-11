// Shared modal helper. Pairs with Shared/Components/_Modal.cshtml.
// Renders a single global confirm dialog and exposes:
//   window.DZModal.confirm({
//       title:        'Categorie verwijderen?',
//       message:      'Dit kan niet ongedaan gemaakt worden.',
//       confirmLabel: 'Verwijderen',
//       cancelLabel:  'Annuleren',
//       kind:         'danger' | 'primary',   // default: 'danger'
//       icon:         'alert-triangle',       // lucide icon name
//       onConfirm:    function () { ... }
//   });
(function (global) {
    'use strict';

    var modal           = null;
    var titleEl         = null;
    var messageEl       = null;
    var confirmBtn      = null;
    var confirmLabelEl  = null;
    var cancelBtn       = null;
    var cancelLabelEl   = null;
    var iconWrap        = null;
    var iconEl          = null;
    var backdrop        = null;
    var currentOnConfirm = null;
    var lastFocused     = null;

    var kindMap = {
        danger:  {
            wrap:    'border-danger-200 bg-danger-50 text-danger-700',
            confirm: 'bg-danger text-white hover:bg-danger/90'
        },
        primary: {
            wrap:    'border-primary/30 bg-primary/10 text-primary',
            confirm: 'bg-primary text-white hover:bg-primary/90'
        }
    };

    function cacheRefs() {
        if (modal) return;
        modal          = document.getElementById('dz-modal');
        if (!modal) return;
        titleEl        = modal.querySelector('[data-dz-modal-title]');
        messageEl      = modal.querySelector('[data-dz-modal-message]');
        confirmBtn     = modal.querySelector('[data-dz-modal-confirm]');
        confirmLabelEl = modal.querySelector('[data-dz-modal-confirm-label]');
        cancelBtn      = modal.querySelector('[data-dz-modal-cancel]');
        cancelLabelEl  = modal.querySelector('[data-dz-modal-cancel-label]');
        iconWrap       = modal.querySelector('[data-dz-modal-icon-wrap]');
        iconEl         = modal.querySelector('[data-dz-modal-icon]');
        backdrop       = modal.querySelector('[data-dz-modal-backdrop]');

        confirmBtn.addEventListener('click', onConfirmClick);
        cancelBtn.addEventListener('click', close);
        backdrop.addEventListener('click', close);
        document.addEventListener('keydown', onKeydown);
    }

    function onKeydown(e) {
        if (!modal || modal.classList.contains('hidden')) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); }
    }

    function onConfirmClick() {
        var fn = currentOnConfirm;
        close();
        if (typeof fn === 'function') fn();
    }

    function setKind(kind) {
        var k = kindMap[kind] || kindMap.danger;
        // wipe known palette classes then re-apply.
        var allWrap = [].concat(kindMap.danger.wrap.split(' '), kindMap.primary.wrap.split(' '));
        var allConf = [].concat(kindMap.danger.confirm.split(' '), kindMap.primary.confirm.split(' '));
        allWrap.forEach(function (c) { iconWrap.classList.remove(c); });
        allConf.forEach(function (c) { confirmBtn.classList.remove(c); });
        k.wrap.split(' ').forEach(function (c) { iconWrap.classList.add(c); });
        k.confirm.split(' ').forEach(function (c) { confirmBtn.classList.add(c); });
    }

    function setIcon(name) {
        if (!iconEl) return;
        // Lucide swaps <i> for <svg> on first render. Recreate to swap icon.
        var fresh = document.createElement('i');
        fresh.setAttribute('data-dz-modal-icon', '');
        fresh.setAttribute('data-lucide', name || 'alert-triangle');
        fresh.className = 'size-5';
        iconEl.replaceWith(fresh);
        iconEl = fresh;
        if (global.lucide && typeof global.lucide.createIcons === 'function') {
            global.lucide.createIcons();
        }
    }

    function confirm(opts) {
        cacheRefs();
        if (!modal) {
            if (global.window && global.window.confirm) {
                if (global.window.confirm((opts && opts.message) || 'Weet je het zeker?')
                    && opts && typeof opts.onConfirm === 'function') {
                    opts.onConfirm();
                }
            }
            return;
        }
        opts = opts || {};
        titleEl.textContent        = opts.title        || 'Bevestigen';
        messageEl.textContent      = opts.message      || 'Weet je het zeker?';
        confirmLabelEl.textContent = opts.confirmLabel || 'Verwijderen';
        cancelLabelEl.textContent  = opts.cancelLabel  || 'Annuleren';
        setKind(opts.kind || 'danger');
        setIcon(opts.icon || 'alert-triangle');
        currentOnConfirm = opts.onConfirm || null;
        lastFocused = document.activeElement;
        modal.classList.remove('hidden');
        setTimeout(function () { try { confirmBtn.focus(); } catch (e) {} }, 0);
    }

    function close() {
        if (!modal) return;
        modal.classList.add('hidden');
        currentOnConfirm = null;
        if (lastFocused && typeof lastFocused.focus === 'function') {
            try { lastFocused.focus(); } catch (e) {}
        }
        lastFocused = null;
    }

    global.DZModal = { confirm: confirm, close: close };
})(window);
