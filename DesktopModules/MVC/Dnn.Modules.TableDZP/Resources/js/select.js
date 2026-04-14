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
    lb: 'flex items-center justify-between gap-4 px-4 py-2.5 cursor-pointer select-none transition-colors has-checked:bg-primary-50 hover:bg-primary-50 has-checked:hover:bg-primary-100',
    i: 'peer sr-only',
    it: 'text-sm font-normal text-default-800 whitespace-nowrap peer-checked:font-medium peer-checked:text-primary-700',
    ck: 'hidden peer-checked:flex shrink-0 items-center text-primary-600 leading-none',
    em: 'py-3 px-4 text-center text-[0.8125rem] text-default-400'
  }; function create(ctr, cfg) {
    cfg = cfg || {}; var ph = cfg.placeholder || 'Select\u2026', opts = cfg.options || [], sel = cfg.selected || [], sgl = !!cfg.single, chg = cfg.onChange || null; uid++; var nm = 'ns_' + uid, itp = sgl ? 'radio' : 'checkbox';
    var wrap = document.createElement('div'); wrap.className = C.d;
    var sum = document.createElement('div'); sum.className = C.s; sum.tabIndex = 0;
    var txt = document.createElement('span');
    var arr = document.createElement('span'); arr.className = C.a; arr.innerHTML = '<i data-lucide="chevron-up" class="size-4"></i>';
    sum.appendChild(txt); sum.appendChild(arr);
    var dd = document.createElement('div'); dd.style.cssText = 'display:none;position:fixed;z-index:99999;flex-direction:column;'; dd.className = 'bg-white border border-default-200 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col';
    var ls = document.createElement('div'); ls.className = C.l; dd.appendChild(ls);
    wrap.appendChild(sum); ctr.innerHTML = ''; ctr.appendChild(wrap); document.body.appendChild(dd);
    var isOpen = false;
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
    function rn() { ro(); ut(); if (window.lucide) lucide.createIcons(); }
    function pos() { var r = sum.getBoundingClientRect(); var g = 4; dd.style.left = r.left + 'px'; dd.style.minWidth = r.width + 'px'; dd.style.visibility = 'hidden'; dd.style.display = 'flex'; var dh = dd.offsetHeight; dd.style.visibility = ''; if (!isOpen) dd.style.display = 'none'; var sb = window.innerHeight - r.bottom - g; var sa = r.top - g; if (sb < dh && sa > sb) { dd.style.top = (r.top - dh - g) + 'px'; } else { dd.style.top = (r.bottom + g) + 'px'; } }
    function open() { if (isOpen) return; isOpen = true; sum.className = C.sOpen; arr.className = C.aOpen; dd.style.display = 'flex'; pos(); window.addEventListener('resize', onR); window.addEventListener('scroll', onS, true); }
    function close() { if (!isOpen) return; isOpen = false; sum.className = C.s; arr.className = C.a; dd.style.display = 'none'; window.removeEventListener('resize', onR); window.removeEventListener('scroll', onS, true); }
    function onR() { if (isOpen) pos(); }
    function onS(e) { if (isOpen && !dd.contains(e.target)) close(); }
    sum.addEventListener('click', function () { if (isOpen) close(); else open(); });
    sum.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isOpen) close(); else open(); } if (e.key === 'Escape') close(); });
    ls.addEventListener('change', function (e) { if (e.target.tagName === 'INPUT') { sel = []; var ii = ls.querySelectorAll('input:checked'); for (var i = 0; i < ii.length; i++)sel.push(ii[i].value); ut(); if (isOpen) pos(); if (sgl) close(); if (chg) chg(sel.slice()); } });
    function oh(e) { if (isOpen && !wrap.contains(e.target) && !dd.contains(e.target)) close(); }
    document.addEventListener('mousedown', oh); rn();
    return { getSelected: function () { var r = []; var ii = ls.querySelectorAll('input:checked'); for (var i = 0; i < ii.length; i++)r.push(ii[i].value); return r; }, getValue: function () { var s = this.getSelected(); return s.length ? s[0] : ''; }, setOptions: function (no, ns) { opts = no || []; sel = ns || []; rn(); }, destroy: function () { close(); document.removeEventListener('mousedown', oh); if (dd.parentNode) dd.parentNode.removeChild(dd); ctr.innerHTML = ''; } };
  } return { create: create };
})();
