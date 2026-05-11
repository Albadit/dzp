// Shared toast notification used across CompanyEdit, DiscoverEdit, etc.
// Mirrors the visual style from the original company-edit.js implementation:
// bottom-right floating chip with Lucide icon, success/error variants,
// auto-dismiss + fade-out. Exposed as window.DZToast.show(msg, ok).
(function (global) {
    'use strict';

    var toast = null;
    var hideTimer = null;
    var fadeTimer = null;

    function escHtml(s) {
        var d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function show(message, ok) {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
        if (toast) { toast.remove(); toast = null; }

        toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-opacity duration-300 max-w-[350px] '
            + (ok ? 'bg-success-50 border border-success-200 text-success-800'
                  : 'bg-danger-50 border border-danger-200 text-danger-800');
        toast.innerHTML = '<i data-lucide="' + (ok ? 'check-circle-2' : 'alert-circle')
            + '" class="size-4 shrink-0"></i><span>' + escHtml(message) + '</span>';
        document.body.appendChild(toast);

        if (global.lucide && typeof global.lucide.createIcons === 'function') {
            global.lucide.createIcons();
        }

        hideTimer = setTimeout(function () {
            if (!toast) return;
            toast.style.opacity = '0';
            fadeTimer = setTimeout(function () {
                if (toast) { toast.remove(); toast = null; }
            }, 300);
        }, 3000);
    }

    function success(msg) { show(msg, true);  }
    function error(msg)   { show(msg, false); }

    global.DZToast = { show: show, success: success, error: error };
})(window);
