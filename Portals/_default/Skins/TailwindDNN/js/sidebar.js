(function () {
    function setup() {
        var sidebar  = document.getElementById('sidebar');
        var overlay  = document.getElementById('sidebar-overlay');
        var closeBtn = document.getElementById('sidebar-close');

        function closeSidebar() {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }

        if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
        if (overlay)  overlay.addEventListener('click', closeSidebar);

        sidebar.querySelectorAll('.sidebar-submenu-toggle').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var parent  = btn.closest('[data-submenu-parent]');
                var submenu = parent.nextElementSibling;
                var chevron = btn.querySelector('svg') || btn.querySelector('[data-lucide]');
                var isOpen  = parent.getAttribute('aria-expanded') === 'true';

                parent.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
                submenu.style.gridTemplateRows = isOpen ? '0fr' : '1fr';
                if (chevron) chevron.classList.toggle('rotate-90');
            });
        });
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', function () { setTimeout(setup, 50); });
    else
        setTimeout(setup, 50);
})();
