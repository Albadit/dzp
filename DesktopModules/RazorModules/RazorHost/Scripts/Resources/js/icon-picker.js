/*
    Lucide icon picker.

    Auto-attaches to any <input data-icon-picker>. Renders a popover
    underneath the input on focus / click containing a search box (the
    input itself doubles as the search) and a scrollable grid of all
    icons exposed by window.lucide.icons. Clicking an icon sets the
    input value (kebab-case name, ready to drop into data-lucide=...)
    and closes the popover.

    Requires window.lucide (the lucide.js UMD bundle) to be loaded
    BEFORE this script runs, so we can read lucide.icons.

    No dependencies. No CSS file — uses Tailwind utility classes that
    are already in the bundle on the host pages.
*/
(function (g) {
    'use strict';

    var ALL = null;
    var openPanel = null;       // currently open <div> panel
    var openInput = null;       // input it is bound to
    var lastQuery = null;       // memo so we don't rebuild on no-op input

    /* ── Helpers ─────────────────────────────────────────────────── */

    function pascalToKebab(name) {
        // Standard PascalCase → kebab: insert dash before each uppercase
        // (except the very first char), then lowercase. Handles cases like
        // "MapPin" → "map-pin", "AArrowDown" → "a-arrow-down",
        // "ALargeSmall" → "a-large-small", "Volume2" → "volume-2",
        // "Heading2" → "heading-2", "Wifi9" → "wifi-9".
        return name
            .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')   // ABc → A-Bc
            .replace(/([a-z])(\d)/g, '$1-$2')           // a2 → a-2
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')     // aB → a-B
            .toLowerCase();
    }
    // (Both replace calls already use /g — verified.)

    function getAll() {
        if (ALL) return ALL;
        if (!g.lucide || !g.lucide.icons) return [];
        var keys = Object.keys(g.lucide.icons);
        ALL = [];
        for (var i = 0; i < keys.length; i++) {
            ALL.push(pascalToKebab(keys[i]));
        }
        ALL.sort();
        return ALL;
    }

    function filterIcons(q) {
        var all = getAll();
        if (!q) return all;
        q = q.toLowerCase().trim();
        if (!q) return all;
        var out = [];
        for (var i = 0; i < all.length; i++) {
            if (all[i].indexOf(q) !== -1) out.push(all[i]);
        }
        return out;
    }

    function escAttr(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
    }

    /* ── Panel rendering ─────────────────────────────────────────── */

    function buildGrid(panel, names) {
        var grid = panel.querySelector('[data-ip-grid]');
        if (!grid) return;
        // Cancel any pending hydration from a previous build.
        if (grid._ipHydrateToken) { grid._ipHydrateToken.cancelled = true; }
        if (!names.length) {
            grid.innerHTML = '<div class="col-span-full text-xs text-foreground-400 text-center py-4">Geen iconen gevonden</div>';
            return;
        }
        // Render lightweight placeholders for ALL matching icons (no SVG inlined yet).
        var html = '';
        for (var i = 0; i < names.length; i++) {
            var n = names[i];
            html += `
                <button type="button" data-ip-pick="${escAttr(n)}"
                        title="${escAttr(n)}"
                        class="flex flex-col items-center justify-center gap-1 p-2 rounded-md hover:bg-content2 focus:outline-none focus:ring-2 focus:ring-primary/40 transition min-h-[52px]">
                    <i data-ip-icon="${escAttr(n)}" class="size-5 text-foreground-700 inline-block"></i>
                    <span class="text-[10px] leading-tight text-foreground-500 truncate w-full text-center">${escAttr(n)}</span>
                </button>`;
        }
        grid.innerHTML = html;
        if (!g.lucide || typeof g.lucide.createIcons !== 'function') return;
        // Progressive hydration: do the first ~120 (≈ what fits in the visible
        // panel + scroll buffer) synchronously so the user sees icons immediately,
        // then chunk the rest across animation frames so the UI stays responsive.
        var token = { cancelled: false };
        grid._ipHydrateToken = token;
        var placeholders = grid.querySelectorAll('[data-ip-icon]');
        var INITIAL = Math.min(120, placeholders.length);
        var CHUNK = 200;
        function hydrate(start, end) {
            for (var k = start; k < end; k++) {
                var el = placeholders[k];
                if (!el || !el.parentNode) continue;
                el.setAttribute('data-lucide', el.getAttribute('data-ip-icon'));
                el.removeAttribute('data-ip-icon');
            }
            g.lucide.createIcons({ root: grid });
        }
        hydrate(0, INITIAL);
        var idx = INITIAL;
        function step() {
            if (token.cancelled) return;
            var end = Math.min(idx + CHUNK, placeholders.length);
            hydrate(idx, end);
            idx = end;
            if (idx < placeholders.length) g.setTimeout(step, 0);
        }
        if (idx < placeholders.length) g.setTimeout(step, 0);
    }

    function positionPanel(panel, input) {
        var r  = input.getBoundingClientRect();
        var vw = g.innerWidth  || document.documentElement.clientWidth;
        var vh = g.innerHeight || document.documentElement.clientHeight;
        var GAP  = 4;
        var EDGE = 8;

        panel.style.position = 'fixed';
        panel.style.zIndex   = '10050';
        panel.style.right    = 'auto';
        panel.style.bottom   = 'auto';
        panel.style.borderRadius = '';
        // Mobile bottom-sheet was confusing on narrow admin panes — always use
        // the anchored panel and rely on the auto-fit grid + clamp logic below.
        panel.classList.remove('ip-mobile');
        var mobileBar = panel.querySelector('[data-ip-mobilebar]');
        if (mobileBar) mobileBar.style.display = 'none';

        // Width: at least the input width, but never wider than viewport
        // (minus edge gutters). Min 240 keeps the grid usable on tiny panes.
        var minW = Math.min(320, Math.max(240, vw - 2 * EDGE));
        var w = Math.max(r.width, minW);
        w = Math.min(w, vw - 2 * EDGE);
        panel.style.width = w + 'px';

        // Horizontal: clamp so the panel stays fully inside the viewport.
        var left = Math.max(EDGE, Math.min(r.left, vw - w - EDGE));
        panel.style.left = left + 'px';

        // Vertical: prefer below the input. If there's not enough room
        // and there's more space above, flip above the input.
        var spaceBelow = vh - r.bottom - GAP;
        var spaceAbove = r.top - GAP;
        var maxH;
        if (spaceBelow >= 240 || spaceBelow >= spaceAbove) {
            panel.style.top = (r.bottom + GAP) + 'px';
            maxH = Math.max(180, spaceBelow - EDGE);
        } else {
            maxH = Math.max(180, spaceAbove - EDGE);
            panel.style.top = Math.max(EDGE, r.top - GAP - maxH) + 'px';
        }
        panel.style.maxHeight = maxH + 'px';
    }

    function ensurePanel(input) {
        if (input._ipPanel && input._ipPanel.isConnected) return input._ipPanel;
        var panel = document.createElement('div');
        panel.setAttribute('data-ip-panel', '');
        // max-height is driven dynamically by positionPanel based on viewport.
        panel.className = 'rounded-lg border border-divider bg-content1 shadow-xl p-2 overflow-y-auto';
        // Auto-fit columns: ~64px min per cell. Adapts smoothly from narrow to wide.
        panel.innerHTML =
            '<div data-ip-grid style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:4px;"></div>';
        document.body.appendChild(panel);
        input._ipPanel = panel;
        return panel;
    }

    function open(input) {
        if (openPanel && openInput === input) return;
        close();
        var panel = ensurePanel(input);
        positionPanel(panel, input);
        lastQuery = null;
        rebuild(input);
        panel.style.display = '';
        openPanel = panel;
        openInput = input;
        // Reposition on scroll/resize while open.
        g.addEventListener('scroll', onScrollResize, true);
        g.addEventListener('resize', onScrollResize, true);
    }

    function close() {
        if (openPanel) {
            openPanel.style.display = 'none';
        }
        openPanel = null;
        openInput = null;
        g.removeEventListener('scroll', onScrollResize, true);
        g.removeEventListener('resize', onScrollResize, true);
    }

    function onScrollResize() {
        if (openPanel && openInput) positionPanel(openPanel, openInput);
    }

    function rebuild(input) {
        var q = (input.value || '').trim();
        if (q === lastQuery) return;
        lastQuery = q;
        var names = filterIcons(q);
        buildGrid(input._ipPanel, names);
    }

    /* ── Event wiring ────────────────────────────────────────────── */

    function onFocus(e) {
        var t = e.target;
        if (!(t && t.matches && t.matches('input[data-icon-picker]'))) return;
        open(t);
    }

    function onInput(e) {
        var t = e.target;
        if (!(t && t.matches && t.matches('input[data-icon-picker]'))) return;
        if (openInput !== t) open(t);
        else rebuild(t);
    }

    function onDocClick(e) {
        // Pick from grid?
        var picker = e.target.closest && e.target.closest('[data-ip-pick]');
        if (picker && openInput) {
            e.preventDefault();
            var name = picker.getAttribute('data-ip-pick');
            openInput.value = name;
            // Fire input/change so any listeners (form validation, dirty state) update.
            try { openInput.dispatchEvent(new Event('input',  { bubbles: true })); } catch (_e) {}
            try { openInput.dispatchEvent(new Event('change', { bubbles: true })); } catch (_e) {}
            close();
            return;
        }
        // Click outside the panel and outside the input → close.
        if (!openPanel) return;
        if (e.target === openInput) return;
        if (openPanel.contains(e.target)) return;
        close();
    }

    function onKeyDown(e) {
        if (!openInput) return;
        if (e.target !== openInput) return;
        if (e.key === 'Escape') { close(); }
    }

    function init() {
        document.addEventListener('focusin',  onFocus,    true);
        document.addEventListener('input',    onInput,    true);
        document.addEventListener('click',    onDocClick, true);
        document.addEventListener('keydown',  onKeyDown,  true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

    g.LucideIconPicker = { open: open, close: close, refresh: function () { ALL = null; lastQuery = null; if (openInput) rebuild(openInput); } };
})(window);
