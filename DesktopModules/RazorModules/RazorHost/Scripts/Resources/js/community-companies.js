/*
    Client-side controller for the Bedrijven page:
      - Parses the JSON island
      - Renders grid in batches via IntersectionObserver
      - Renders list as a windowed virtual scroller
      - Handles search + view toggle (persisted in localStorage)

    Reads window.COMPANIES_SLUG (set by the server-rendered partial).
*/
(function() {
    var dataEl  = document.getElementById('companiesData');
    var skel    = document.getElementById('companiesSkeleton');
    var gridEl  = document.getElementById('companiesGrid');
    var listEl  = document.getElementById('companiesList');
    var listSp  = document.getElementById('companiesListSpacer');
    var listWin = document.getElementById('companiesListWindow');
    var sentinel= document.getElementById('companiesSentinel');
    var input   = document.getElementById('companySearch');
    var clearBtn= document.getElementById('companySearchClear');
    var countEl = document.getElementById('companyCount');
    var btnGrid = document.getElementById('btnGrid');
    var btnList = document.getElementById('btnList');
    var noRes   = document.getElementById('noResults');
    var slug    = window.COMPANIES_SLUG || '';

    if (!dataEl) return;

    var ALL = [];
    try { ALL = JSON.parse(dataEl.textContent || dataEl.innerText || '[]'); } catch(e) { ALL = []; }

    var FILTERED = ALL.slice();
    var MODE = 'grid';
    var GRID_BATCH = 24;
    var gridRendered = 0;
    var ROW_H = 64;
    var BUFFER = 5;

    var activeClass   = 'bg-primary text-white';
    var inactiveClass = 'text-foreground-400 hover:text-foreground-700';

    function escHtml(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, function(c){
            return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
        });
    }

    function avatarHtml(c, sizeClass, iconSize) {
        if (c.img) {
            return '<div class="' + sizeClass + ' rounded-xl overflow-hidden shrink-0 bg-content2">' +
                   '<img src="' + escHtml(c.img) + '" alt="' + escHtml(c.name) + '" loading="lazy" decoding="async" class="w-full h-full object-cover" />' +
                   '</div>';
        }
        return '<div class="flex items-center justify-center ' + sizeClass + ' rounded-xl bg-primary/10 shrink-0"><i data-lucide="building-2" class="' + iconSize + ' text-primary"></i></div>';
    }

    function gridCardHtml(c) {
        var addrBlock = c.addr ? ('<div class="flex items-center gap-1.5 text-xs text-foreground-400"><i data-lucide="map-pin" class="size-3 shrink-0"></i><span class="truncate">' + escHtml(c.addr) + '</span></div>') : '';
        var descBlock = c.desc ? ('<p class="text-sm text-foreground-500 leading-relaxed line-clamp-2">' + escHtml(c.desc) + '</p>') : '';
        var mcLabel   = (c.mc === 1 ? 'medewerker' : 'medewerkers');
        return '<a href="/' + escHtml(slug) + '/companies/' + escHtml(c.slug) + '"' +
            ' class="company-card group flex flex-col gap-3 p-5 rounded-xl border border-divider bg-background hover:border-primary/40 transition">' +
            '<div class="flex items-start gap-4">' +
              avatarHtml(c, 'size-12', 'size-5') +
              '<div class="flex flex-col gap-1 min-w-0 flex-1">' +
                '<h3 class="text-base font-semibold text-foreground-900 group-hover:text-primary transition truncate">' + escHtml(c.name) + '</h3>' +
                addrBlock +
              '</div>' +
              '<i data-lucide="chevron-right" class="size-5 text-foreground-300 group-hover:text-primary shrink-0 mt-1 transition"></i>' +
            '</div>' +
            descBlock +
            '<div class="flex items-center gap-3 pt-1 border-t border-divider">' +
              '<div class="flex items-center gap-1.5 text-xs text-foreground-400"><i data-lucide="users" class="size-3.5"></i><span>' + c.mc + ' ' + mcLabel + '</span></div>' +
            '</div>' +
        '</a>';
    }

    function listRowHtml(c) {
        var addrBlock = c.addr ? ('<span class="text-xs text-foreground-400 truncate">' + escHtml(c.addr) + '</span>') : '';
        return '<a href="/' + escHtml(slug) + '/companies/' + escHtml(c.slug) + '"' +
            ' class="company-card group flex items-center gap-4 px-4 py-3 rounded-xl border border-divider bg-background hover:border-primary/40 transition" style="height:' + (ROW_H - 8) + 'px;">' +
            avatarHtml(c, 'size-10', 'size-4') +
            '<div class="flex flex-col gap-0.5 min-w-0 flex-1"><h3 class="text-sm font-semibold text-foreground-900 group-hover:text-primary transition truncate">' + escHtml(c.name) + '</h3>' + addrBlock + '</div>' +
            '<div class="hidden sm:flex items-center gap-1.5 text-xs text-foreground-400 shrink-0"><i data-lucide="users" class="size-3.5"></i><span>' + c.mc + '</span></div>' +
            '<i data-lucide="chevron-right" class="size-4 text-foreground-300 group-hover:text-primary shrink-0 transition"></i>' +
        '</a>';
    }

    var gridIo = null;
    function renderGridBatch() {
        if (gridRendered >= FILTERED.length) return;
        var end = Math.min(gridRendered + GRID_BATCH, FILTERED.length);
        var html = '';
        for (var i = gridRendered; i < end; i++) html += gridCardHtml(FILTERED[i]);
        gridEl.insertAdjacentHTML('beforeend', html);
        gridRendered = end;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    function resetGrid() {
        gridEl.innerHTML = '';
        gridRendered = 0;
        if (MODE === 'grid') renderGridBatch();
    }
    function ensureGridObserver() {
        if (gridIo || typeof IntersectionObserver === 'undefined') return;
        gridIo = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting && MODE === 'grid') renderGridBatch();
            }
        }, { rootMargin: '400px 0px' });
        gridIo.observe(sentinel);
    }

    var listScrollHandler = null;
    function renderListWindow() {
        var total = FILTERED.length;
        listSp.style.height = (total * ROW_H) + 'px';
        var rect = listEl.getBoundingClientRect();
        var scrollTop = Math.max(0, -rect.top);
        var viewport  = window.innerHeight || document.documentElement.clientHeight;
        var first = Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER);
        var last  = Math.min(total, Math.ceil((scrollTop + viewport) / ROW_H) + BUFFER);
        var html = '';
        for (var i = first; i < last; i++) html += listRowHtml(FILTERED[i]);
        listWin.style.transform = 'translateY(' + (first * ROW_H) + 'px)';
        listWin.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    function attachListScroll() {
        if (listScrollHandler) return;
        listScrollHandler = function () { if (MODE === 'list') renderListWindow(); };
        window.addEventListener('scroll', listScrollHandler, { passive: true });
        window.addEventListener('resize', listScrollHandler);
    }

    function setView(mode) {
        MODE = (mode === 'list') ? 'list' : 'grid';
        var isGrid = MODE === 'grid';
        gridEl.classList.toggle('hidden', !isGrid);
        listEl.classList.toggle('hidden', isGrid);
        btnGrid.className = 'flex items-center justify-center size-8 rounded-md transition ' + (isGrid ? activeClass : inactiveClass);
        btnList.className = 'flex items-center justify-center size-8 rounded-md transition ' + (isGrid ? inactiveClass : activeClass);
        try { localStorage.setItem('companiesView', MODE); } catch(e) {}
        if (isGrid) { resetGrid(); ensureGridObserver(); }
        else        { renderListWindow(); attachListScroll(); }
    }
    window.setView = setView;

    var searchTimer = null;
    function applyFilter() {
        var q = (input && input.value || '').toLowerCase().trim();
        if (clearBtn) clearBtn.classList.toggle('hidden', q.length === 0);
        FILTERED = !q ? ALL.slice() : ALL.filter(function (c) {
            return (c.name || '').toLowerCase().indexOf(q) !== -1 ||
                   (c.addr || '').toLowerCase().indexOf(q) !== -1;
        });
        if (countEl) {
            countEl.textContent = (q ? (FILTERED.length + ' / ' + ALL.length) : ALL.length) + ' bedrijven';
        }
        if (noRes) {
            noRes.classList.toggle('hidden', FILTERED.length > 0);
            noRes.classList.toggle('flex',   FILTERED.length === 0);
        }
        if (MODE === 'grid') resetGrid();
        else                 renderListWindow();
    }
    if (input) {
        input.addEventListener('input', function () {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(applyFilter, 120);
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            if (input) { input.value = ''; input.focus(); }
            applyFilter();
        });
    }

    function boot() {
        if (skel) skel.parentNode && skel.parentNode.removeChild(skel);
        var saved = 'grid';
        try { saved = localStorage.getItem('companiesView') || 'grid'; } catch(e) {}
        setView(saved);
    }
    if ('requestIdleCallback' in window) {
        requestIdleCallback(boot, { timeout: 200 });
    } else {
        setTimeout(boot, 0);
    }
})();
