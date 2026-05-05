var MultiSelect = (function () {
  'use strict'; var uid = 0; var C = {
    d: 'relative inline-block w-full min-w-20 text-sm font-[inherit]',
    s: 'flex items-center gap-[0.3rem] min-h-10 px-2.5 py-[0.35rem] bg-white border border-default-300 rounded-lg cursor-pointer select-none outline-none transition-[border-color,box-shadow] duration-150 hover:border-default-400 list-none [&::-webkit-details-marker]:hidden',
    sOpen: 'flex items-center gap-[0.3rem] min-h-10 px-2.5 py-[0.35rem] bg-white border border-primary-500 rounded-lg cursor-pointer select-none outline-none shadow-[0_0_0_3px_rgba(59,130,246,0.12)] list-none [&::-webkit-details-marker]:hidden',
    ch: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700',
    tw: 'flex flex-1 flex-wrap gap-1 min-w-0',
    tp: 'flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap leading-[1.75] text-[0.8125rem] text-default-400',
    tv: 'flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap leading-[1.75] text-sm text-default-900',
    a: 'shrink-0 ml-auto flex items-center text-default-400 transition-transform duration-200',
    aOpen: 'shrink-0 ml-auto flex items-center text-default-400 transition-transform duration-200 rotate-180',
    l: 'overflow-y-auto max-h-72 min-w-20 py-1',
    lb: 'relative flex items-center justify-between gap-4 px-3 py-2.5 rounded-md cursor-pointer select-none transition-colors has-checked:bg-primary-50 hover:bg-primary-50 has-checked:hover:bg-primary-100',
    i: 'peer absolute inset-0 w-full h-full opacity-0 m-0 cursor-pointer',
    it: 'text-sm font-normal text-default-800 whitespace-nowrap peer-checked:font-medium peer-checked:text-primary-700',
    ck: 'hidden peer-checked:flex shrink-0 items-center text-primary-600 leading-none',
    em: 'py-3 px-4 text-center text-[0.8125rem] text-default-400',
    sw: 'sticky top-0 z-10 bg-white px-3 pt-3 pb-2',
    swr: 'relative',
    sxi: 'absolute left-3 top-1/2 -translate-y-1/2 text-default-400 pointer-events-none flex items-center',
    sx: 'w-full pl-9 pr-3 py-2 text-sm bg-content2 rounded-xl outline-none border border-transparent focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] placeholder:text-default-400'
  }; function create(ctr, cfg) {
    cfg = cfg || {}; var ph = cfg.placeholder || 'Select\u2026', opts = cfg.options || [], sel = cfg.selected || [], sgl = !!cfg.single, chg = cfg.onChange || null; var sth = (typeof cfg.searchThreshold === 'number') ? cfg.searchThreshold : 8; uid++; var nm = 'ns_' + uid, itp = sgl ? 'radio' : 'checkbox';
    var wrap = document.createElement('div'); wrap.className = C.d;
    var sum = document.createElement('div'); sum.className = C.s; sum.tabIndex = 0;
    var txt = document.createElement('span');
    var arr = document.createElement('span'); arr.className = C.a; arr.innerHTML = '<i data-lucide="chevron-up" class="size-4"></i>';
    sum.appendChild(txt); sum.appendChild(arr);
    var dd = document.createElement('div'); dd.style.cssText = 'display:none;position:fixed;z-index:99999;flex-direction:column;'; dd.className = 'bg-white border border-default-200 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col';
    var sw = document.createElement('div'); sw.className = C.sw;
    var swr = document.createElement('div'); swr.className = C.swr;
    var sxi = document.createElement('span'); sxi.className = C.sxi; sxi.innerHTML = '<i data-lucide="search" class="size-4"></i>';
    var sx = document.createElement('input'); sx.type = 'text'; sx.placeholder = 'Search\u2026'; sx.className = C.sx; sx.autocomplete = 'off';
    swr.appendChild(sxi); swr.appendChild(sx); sw.appendChild(swr); dd.appendChild(sw);
    var ls = document.createElement('div'); ls.className = C.l; dd.appendChild(ls);
    wrap.appendChild(sum); ctr.innerHTML = ''; ctr.appendChild(wrap); document.body.appendChild(dd);
    var isOpen = false, placeAbove = false;
    function gl(v) { for (var i = 0; i < opts.length; i++) { if (opts[i].value === v) return opts[i].label; } return v; }
    function ut() { var ck = ls.querySelectorAll('input:checked'); if (!ck.length) { txt.className = C.tp; txt.textContent = ph; } else if (sgl) { txt.className = C.tv; txt.textContent = gl(ck[0].value); } else { txt.className = C.tw; txt.innerHTML = ''; for (var i = 0; i < ck.length; i++) { var c = document.createElement('span'); c.className = C.ch; c.textContent = gl(ck[i].value); txt.appendChild(c); } } }
    function ro() {
      ls.innerHTML = ''; if (!opts.length) { var e = document.createElement('div'); e.className = C.em; e.textContent = 'No options'; ls.appendChild(e); return; }
      for (var i = 0; i < opts.length; i++) {
        var o = opts[i], is = sel.indexOf(o.value) !== -1;
        var lb = document.createElement('label'); lb.className = C.lb;
        var ip = document.createElement('input'); ip.type = itp; ip.name = nm; ip.value = o.value; ip.className = C.i; if (is) ip.checked = true;
        var sp = document.createElement('span'); sp.className = C.it; sp.textContent = o.label;
        var ckEl = document.createElement('span'); ckEl.className = C.ck; ckEl.innerHTML = '<i data-lucide="check" class="size-4"></i>';
        lb.appendChild(ip); lb.appendChild(sp); lb.appendChild(ckEl); ls.appendChild(lb);
      }
    }
    function us() { sw.style.display = opts.length >= sth ? '' : 'none'; }
    function rn() { ro(); ut(); us(); if (window.lucide) lucide.createIcons(); }
    function pos() { var r = sum.getBoundingClientRect(); var g = 4; dd.style.left = r.left + 'px'; dd.style.minWidth = r.width + 'px'; if (placeAbove) { dd.style.visibility = 'hidden'; dd.style.display = 'flex'; var dh = dd.offsetHeight; dd.style.visibility = ''; if (!isOpen) dd.style.display = 'none'; dd.style.top = (r.top - dh - g) + 'px'; } else { dd.style.top = (r.bottom + g) + 'px'; } }
    function open() { if (isOpen) return; isOpen = true; sum.className = C.sOpen; arr.className = C.aOpen; dd.style.display = 'flex'; sx.value = ''; flt(''); var r0 = sum.getBoundingClientRect(); var g0 = 4; dd.style.visibility = 'hidden'; var dh0 = dd.offsetHeight; dd.style.visibility = ''; var sb0 = window.innerHeight - r0.bottom - g0; var sa0 = r0.top - g0; placeAbove = (sb0 < dh0 && sa0 > sb0); pos(); setTimeout(function () { if (sw.style.display !== 'none') { try { sx.focus(); } catch (e) { } } }, 0); window.addEventListener('resize', onR); window.addEventListener('scroll', onS, true); }
    function close() { if (!isOpen) return; isOpen = false; sum.className = C.s; arr.className = C.a; dd.style.display = 'none'; window.removeEventListener('resize', onR); window.removeEventListener('scroll', onS, true); }
    function onR() { if (isOpen) pos(); }
    function onS(e) { if (isOpen && !dd.contains(e.target)) close(); }
    function flt(q) { q = (q || '').toLowerCase(); var lbs = ls.querySelectorAll('label'); var any = false; for (var i = 0; i < lbs.length; i++) { var t = (lbs[i].textContent || '').toLowerCase(); var m = !q || t.indexOf(q) !== -1; lbs[i].style.display = m ? '' : 'none'; if (m) any = true; } var em = ls.querySelector('.dt-ms-empty'); if (!any && opts.length) { if (!em) { em = document.createElement('div'); em.className = C.em + ' dt-ms-empty'; em.textContent = 'No matches'; ls.appendChild(em); } em.style.display = ''; } else if (em) { em.style.display = 'none'; } }
    sx.addEventListener('input', function () { flt(sx.value); });
    sx.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); sum.focus(); } e.stopPropagation(); });
    sx.addEventListener('click', function (e) { e.stopPropagation(); });
    sum.addEventListener('click', function () { if (isOpen) close(); else open(); });
    sum.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isOpen) close(); else open(); } if (e.key === 'Escape') close(); });
    ls.addEventListener('change', function (e) { if (e.target.tagName === 'INPUT') { sel = []; var ii = ls.querySelectorAll('input:checked'); for (var i = 0; i < ii.length; i++)sel.push(ii[i].value); ut(); if (sgl) close(); if (chg) chg(sel.slice()); } });
    function oh(e) { if (isOpen && !wrap.contains(e.target) && !dd.contains(e.target)) close(); }
    document.addEventListener('mousedown', oh); rn();
    return { getSelected: function () { var r = []; var ii = ls.querySelectorAll('input:checked'); for (var i = 0; i < ii.length; i++)r.push(ii[i].value); return r; }, getValue: function () { var s = this.getSelected(); return s.length ? s[0] : ''; }, setOptions: function (no, ns) { opts = no || []; sel = ns || []; rn(); }, destroy: function () { close(); document.removeEventListener('mousedown', oh); if (dd.parentNode) dd.parentNode.removeChild(dd); ctr.innerHTML = ''; } };
  } return { create: create };
})();
