/*
    Client-side controller for the dashboard:
      - parses the inline JSON payload
      - renders cards in chunks (24 per batch) via IntersectionObserver
      - debounced live search across name + slug
      - clear-button shows when the input has content
*/
(function () {
    var raw = document.getElementById('dashCommunityData');
    if (!raw) return;
    var ALL = [];
    try { ALL = JSON.parse(raw.textContent || '[]'); } catch (e) { ALL = []; }

    var grid     = document.getElementById('dashCommunityGrid');
    var empty    = document.getElementById('dashCommunityEmpty');
    var count    = document.getElementById('dashCommunityCount');
    var sentinel = document.getElementById('dashCommunitySentinel');
    var input    = document.getElementById('dashCommunitySearch');
    var clearBtn = document.getElementById('dashCommunitySearchClear');

    var BATCH = 24;
    var filtered = ALL.slice();
    var rendered = 0;

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
            return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[ch];
        });
    }

    function buildCard(c) {
        var slug = escapeHtml(c.slug);
        var name = escapeHtml(c.name);
        var letter = escapeHtml((c.name || '?').substring(0, 1).toUpperCase());
        var avatar = c.image
            ? `<img src="${escapeHtml(c.image)}" alt="${name}" loading="lazy" decoding="async" class="w-full h-full object-cover" />`
            : `<div class="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-lg">${letter}</div>`;

        return `
            <a href="/${slug}/home" class="group block w-full min-w-0 rounded-lg bg-background border border-divider p-3 hover:border-primary transition overflow-hidden">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="size-12 sm:size-16 rounded-md overflow-hidden shrink-0">${avatar}</div>
                    <div class="min-w-0 flex-1">
                        <h2 class="text-base sm:text-lg font-semibold text-foreground-700 group-hover:text-primary transition truncate">${name}</h2>
                        <p class="text-xs sm:text-sm text-foreground-400 font-mono truncate">/${slug}</p>
                    </div>
                    <i data-lucide="chevron-right" class="size-5 text-foreground-300 group-hover:text-primary group-hover:translate-x-0.5 ml-auto shrink-0 transition"></i>
                </div>
            </a>`;
    }

    function renderChunk() {
        if (rendered >= filtered.length) return;
        var end = Math.min(rendered + BATCH, filtered.length);
        var html = '';
        for (var i = rendered; i < end; i++) { html += buildCard(filtered[i]); }
        grid.insertAdjacentHTML('beforeend', html);
        rendered = end;
        if (window.lucide && typeof lucide.createIcons === 'function') { lucide.createIcons(); }
    }

    function applyFilter() {
        var q = (input.value || '').trim().toLowerCase();
        clearBtn.classList.toggle('hidden', q.length === 0);
        filtered = q
            ? ALL.filter(function (c) {
                return (c.name || '').toLowerCase().indexOf(q) !== -1
                    || (c.slug || '').toLowerCase().indexOf(q) !== -1;
            })
            : ALL.slice();

        grid.innerHTML = '';
        rendered = 0;
        empty.classList.toggle('hidden', filtered.length !== 0);
        count.textContent = (filtered.length === ALL.length)
            ? ALL.length + ' communities'
            : filtered.length + ' / ' + ALL.length + ' communities';
        renderChunk();
    }

    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { renderChunk(); }
            });
        }, { rootMargin: '300px 0px' });
        io.observe(sentinel);
    } else {
        BATCH = ALL.length;
    }

    var debounceTimer = null;
    input.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilter, 120);
    });
    clearBtn.addEventListener('click', function () {
        input.value = '';
        applyFilter();
        input.focus();
    });

    applyFilter();
})();
