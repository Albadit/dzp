function initDataTable(tid) {
  var root = document.getElementById(tid);
  if (!root) return;

  var pageSize = parseInt(root.dataset.pageSize) || 10;
  var currentPage = 1;
  var sortCol = null, sortDir = null;

  var table    = root.querySelector('.dt-table');
  var tbody    = table.querySelector('.dt-tbody');
  var allRows  = Array.from(tbody.querySelectorAll('.dt-row'));
  var filtered = allRows.slice();

  var el = function (sel) { return root.querySelector(sel); };
  var searchInput = el('.dt-search'), pageSizeSelect = el('.dt-page-size');
  var prevBtn = el('.dt-page-prev'), nextBtn = el('.dt-page-next');
  var pageInput = el('.dt-page-input'), pageTotal = el('.dt-page-total');
  var checkAll = el('.dt-check-all'), bulkBtn = el('.dt-btn-bulk-del');
  var addBtn = el('.dt-btn-add'), pagination = el('.dt-pagination'), rowCount = el('.dt-row-count');

  var modal       = document.getElementById(tid + '-modal');
  var delModal    = document.getElementById(tid + '-del-modal');
  var createModal = document.getElementById(tid + '-create-modal');

  var modals = [modal, delModal, createModal];
  modals.forEach(function (m) { if (m) document.body.appendChild(m); });

  function lockScroll()   { document.body.style.overflow = 'hidden'; }
  function unlockScroll() { document.body.style.overflow = ''; }

  function showModal(m) { m.classList.remove('hidden'); lockScroll(); }
  function hideModal(m) { m.classList.add('hidden'); unlockScroll(); }

  function bindModalClose(m, closeClass, onClose) {
    if (!m) return;
    m.querySelectorAll('.' + closeClass).forEach(function (btn) {
      btn.addEventListener('click', function () { hideModal(m); if (onClose) onClose(); });
    });
    m.addEventListener('click', function (e) {
      if (e.target === m) { hideModal(m); if (onClose) onClose(); }
    });
  }

  var lookupData = window['__dtLookups_' + tid] || {};

  function lookupOpts(col) {
    return (lookupData[col] || []).map(function (o) { return { value: String(o.value), label: o.label }; });
  }

  function initLookupWidgets(container, cssClass) {
    if (!container) return;
    container.querySelectorAll('.' + cssClass).forEach(function (el) {
      el._ms = MultiSelect.create(el, {
        placeholder: '-- Select --',
        options: lookupOpts(el.dataset.col),
        selected: [],
        single: el.dataset.multi !== 'true'
      });
    });
  }

  initLookupWidgets(modal, 'dt-modal-lookup');
  initLookupWidgets(createModal, 'dt-create-lookup');

  function getModalFields(container, inputClass, lookupClass, prefix) {
    var fields = {};
    container.querySelectorAll('.' + inputClass).forEach(function (inp) {
      fields[prefix + inp.dataset.col] = inp.value;
    });
    container.querySelectorAll('.' + lookupClass).forEach(function (el) {
      if (!el._ms) return;
      fields[prefix + el.dataset.col] = el.dataset.multi === 'true'
        ? el._ms.getSelected().join(',') : el._ms.getValue();
    });
    return fields;
  }

  function setLookup(container, lookupClass, col, val) {
    container.querySelectorAll('.' + lookupClass).forEach(function (el) {
      if (el.dataset.col !== col || !el._ms) return;
      var isMulti = el.dataset.multi === 'true';
      var selArr = (isMulti && val)
        ? String(val).split(',').map(function (v) { return v.trim(); }).filter(Boolean)
        : (val ? [String(val)] : []);
      el._ms.setOptions(lookupOpts(col), selArr);
    });
  }

  function resetLookups(container, lookupClass) {
    container.querySelectorAll('.' + lookupClass).forEach(function (el) {
      if (el._ms) el._ms.setOptions(lookupOpts(el.dataset.col), []);
    });
  }

  function postForm(fields) {
    var form = document.createElement('form');
    form.method = 'post';
    form.style.display = 'none';
    fields['_dt_id'] = tid;
    for (var name in fields) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = fields[name];
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  function clearValidation(container, cls) {
    container.querySelectorAll('.' + cls).forEach(function (inp) {
      inp.classList.remove('dt-invalid');
      var err = inp.parentElement.querySelector('.dt-field-error');
      if (err) err.remove();
    });
  }

  function validateInputs(container, cls) {
    clearValidation(container, cls);
    var valid = true;
    var firstInvalid = null;
    container.querySelectorAll('.' + cls).forEach(function (inp) {
      if (!inp.checkValidity()) {
        valid = false;
        inp.classList.add('dt-invalid');
        var msg = inp.validationMessage || 'This field is required';
        var span = document.createElement('span');
        span.className = 'dt-field-error';
        span.textContent = msg;
        inp.parentElement.appendChild(span);
        if (!firstInvalid) firstInvalid = inp;
      }
    });
    if (firstInvalid) firstInvalid.focus();
    return valid;
  }

  function bindLiveValidation(container, cls) {
    container.addEventListener('input', function (e) {
      if (!e.target.classList.contains(cls)) return;
      if (e.target.checkValidity()) {
        e.target.classList.remove('dt-invalid');
        var err = e.target.parentElement.querySelector('.dt-field-error');
        if (err) err.remove();
      }
    });
  }

  function clearLookupValidation(container, cls) {
    container.querySelectorAll('.' + cls + '[data-required]').forEach(function (el) {
      el.classList.remove('dt-invalid');
      var err = el.parentElement.querySelector('.dt-field-error');
      if (err) err.remove();
    });
  }

  function validateLookups(container, cls) {
    clearLookupValidation(container, cls);
    var valid = true;
    var firstInvalid = null;
    container.querySelectorAll('.' + cls + '[data-required]').forEach(function (el) {
      if (!el._ms) return;
      var val = el.dataset.multi === 'true' ? el._ms.getSelected() : [el._ms.getValue()];
      var empty = !val.length || (val.length === 1 && !val[0]);
      if (empty) {
        valid = false;
        el.classList.add('dt-invalid');
        var span = document.createElement('span');
        span.className = 'dt-field-error';
        span.textContent = 'This field is required';
        el.parentElement.appendChild(span);
        if (!firstInvalid) firstInvalid = el;
      }
    });
    if (firstInvalid) firstInvalid.scrollIntoView({ block: 'center' });
    return valid;
  }
  if (modal) bindLiveValidation(modal, 'dt-modal-input');
  if (createModal) bindLiveValidation(createModal, 'dt-create-input');

  var editPk = null, delMode = null, delPkVal = null;

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = this.value.toLowerCase();
      filtered = allRows.filter(function (r) { return r.textContent.toLowerCase().indexOf(q) >= 0; });
      currentPage = 1;
      applySortAndRender();
    });
  }

  if (pageSizeSelect) {
    MultiSelect.create(pageSizeSelect, {
      placeholder: '10',
      options: ['10','25','50','100'].map(function (v) { return { value: v, label: v }; }),
      selected: [String(pageSize)],
      single: true,
      onChange: function (sel) {
        pageSize = parseInt(sel[0] || '10') || 10;
        currentPage = 1;
        render();
      }
    });
  }

  root.querySelectorAll('.dt-sort').forEach(function (th) {
    th.addEventListener('click', function () {
      var col = this.dataset.col;
      if (sortCol === col) {
        if (sortDir === 'asc') { sortDir = 'desc'; }
        else { sortCol = null; sortDir = null; }
      } else {
        sortCol = col; sortDir = 'asc';
      }
      updateSortIndicators();
      currentPage = 1;
      applySortAndRender();
    });
  });

  function updateSortIndicators() {
    root.querySelectorAll('.dt-sort').forEach(function (th) {
      var col = th.dataset.col;
      var wrapEl = th.querySelector('.dt-sort-icon-wrap');
      var numEl = th.querySelector('.dt-sort-num');
      if (numEl) { numEl.textContent = ''; numEl.classList.add('hidden'); }
      if (sortCol === col) {
        th.dataset.dir = sortDir;
        if (wrapEl) {
          var rot = sortDir === 'asc' ? ' style="transform:rotate(180deg)"' : '';
          wrapEl.innerHTML = '<i data-lucide="chevron-down" class="size-4 shrink-0 text-foreground-500"' + rot + '></i>';
          wrapEl.style.visibility = 'visible';
        }
      } else {
        th.dataset.dir = '';
        if (wrapEl) {
          wrapEl.innerHTML = '<i data-lucide="chevron-down" class="size-4 shrink-0"></i>';
          wrapEl.style.visibility = 'hidden';
        }
      }
    });
    if (window.lucide) lucide.createIcons();
  }

  function applySortAndRender() {
    if (sortCol) {
      var sc = sortCol, sd = sortDir;
      filtered.sort(function (a, b) {
        var cmp = getCellText(a, sc).toLowerCase().localeCompare(
          getCellText(b, sc).toLowerCase(), undefined, { numeric: true });
        return sd === 'desc' ? -cmp : cmp;
      });
    }
    if (tbody) filtered.forEach(function (row) { tbody.appendChild(row); });
    render();
  }

  function getCellText(row, col) {
    var cell = row.querySelector('[data-col="' + col + '"]');
    if (!cell) return '';
    return cell.hasAttribute('data-raw') ? cell.getAttribute('data-raw') : (cell.textContent || '').trim();
  }

  function totalPages() { return Math.max(1, Math.ceil(filtered.length / pageSize)); }

  function render() {
    var total = filtered.length;
    var pages = totalPages();
    if (currentPage > pages) currentPage = pages;
    var start = (currentPage - 1) * pageSize;

    allRows.forEach(function (r) { r.style.display = 'none'; });
    for (var i = start; i < Math.min(start + pageSize, total); i++) {
      filtered[i].style.display = 'contents';
    }

    var emptyRow = table.querySelector('.dt-row-empty');
    if (emptyRow) emptyRow.style.display = total > 0 ? 'none' : '';

    if (pagination) {
      pagination.style.display = '';
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === pages;
      pageInput.max = pages;
      pageInput.value = currentPage;
      pageTotal.textContent = '/ ' + pages;
    }

    if (rowCount) {
      var numEl = rowCount.querySelector('.dt-row-count-num');
      if (numEl) numEl.textContent = total;
    }
    updateBulkState();
  }

  if (prevBtn) prevBtn.addEventListener('click', function () {
    if (currentPage > 1) { currentPage--; render(); }
  });
  if (nextBtn) nextBtn.addEventListener('click', function () {
    if (currentPage < totalPages()) { currentPage++; render(); }
  });
  if (pageInput) pageInput.addEventListener('change', function () {
    var pages = totalPages();
    var v = Math.min(Math.max(parseInt(this.value) || 1, 1), pages);
    this.value = v;
    currentPage = v;
    render();
  });

  if (checkAll) {
    checkAll.addEventListener('change', function () {
      var checked = this.checked;
      getVisibleCheckboxes().forEach(function (cb) { cb.checked = checked; });
      updateBulkState();
    });
  }
  root.addEventListener('change', function (e) {
    if (e.target.classList.contains('dt-check-row')) updateBulkState();
  });

  function getVisibleCheckboxes() {
    return Array.from(root.querySelectorAll('.dt-check-row')).filter(function (cb) {
      return cb.closest('.dt-row').style.display !== 'none';
    });
  }
  function getSelectedIds() {
    return getVisibleCheckboxes().filter(function (cb) { return cb.checked; }).map(function (cb) { return cb.value; });
  }

  function updateBulkState() {
    if (!bulkBtn) return;
    var ids = getSelectedIds(), visible = getVisibleCheckboxes();
    bulkBtn.classList.toggle('hidden', ids.length === 0);
    if (ids.length > 0) bulkBtn.querySelector('.dt-bulk-count').textContent = ids.length;
    if (checkAll) {
      checkAll.checked = visible.length > 0 && ids.length === visible.length;
      checkAll.indeterminate = ids.length > 0 && !checkAll.checked;
    }
  }

  function resetCreateForm() {
    if (!createModal) return;
    createModal.querySelectorAll('.dt-create-input').forEach(function (inp) { inp.value = ''; });
    resetLookups(createModal, 'dt-create-lookup');
    clearValidation(createModal, 'dt-create-input');
    clearLookupValidation(createModal, 'dt-create-lookup');
  }

  // --- Create modal ---
  if (addBtn && createModal) {
    addBtn.addEventListener('click', function () {
      showModal(createModal);
      var first = createModal.querySelector('.dt-create-input');
      if (first) first.focus();
    });
  }
  if (createModal) {
    var createSaveBtn = createModal.querySelector('.dt-create-save');
    if (createSaveBtn) createSaveBtn.addEventListener('click', function () {
      var inputsOk = validateInputs(createModal, 'dt-create-input');
      var lookupsOk = validateLookups(createModal, 'dt-create-lookup');
      if (!inputsOk || !lookupsOk) return;
      var fields = { '_dt_action': 'create' };
      var mf = getModalFields(createModal, 'dt-create-input', 'dt-create-lookup', '_dt_new_');
      for (var k in mf) fields[k] = mf[k];
      postForm(fields);
    });
    bindModalClose(createModal, 'dt-create-modal-close', resetCreateForm);
  }

  // --- Edit modal ---
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.dt-btn-edit[data-target="' + tid + '"]');
    if (!btn) return;
    editPk = btn.dataset.pk;
    var row = btn.closest('.dt-row');
    modal.querySelectorAll('.dt-modal-input').forEach(function (inp) {
      inp.value = getCellText(row, inp.dataset.col);
    });
    modal.querySelectorAll('.dt-modal-lookup').forEach(function (lk) {
      setLookup(modal, 'dt-modal-lookup', lk.dataset.col, getCellText(row, lk.dataset.col));
    });
    showModal(modal);
    var first = modal.querySelector('.dt-modal-input');
    if (first) first.focus();
  });
  if (modal) {
    modal.querySelector('.dt-modal-save').addEventListener('click', function () {
      var inputsOk = validateInputs(modal, 'dt-modal-input');
      var lookupsOk = validateLookups(modal, 'dt-modal-lookup');
      if (!inputsOk || !lookupsOk) return;
      var fields = { '_dt_action': 'update', '_dt_edit_pk': editPk };
      var mf = getModalFields(modal, 'dt-modal-input', 'dt-modal-lookup', '_dt_edit_');
      for (var k in mf) fields[k] = mf[k];
      postForm(fields);
    });
    bindModalClose(modal, 'dt-modal-close', function () { clearValidation(modal, 'dt-modal-input'); clearLookupValidation(modal, 'dt-modal-lookup'); });
  }

  // --- Delete modal ---
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.dt-btn-del[data-target="' + tid + '"]');
    if (!btn) return;
    delMode = 'single'; delPkVal = btn.dataset.pk;
    delModal.querySelector('.dt-del-msg').textContent = 'This item will be permanently deleted.';
    showModal(delModal);
  });
  if (bulkBtn) bulkBtn.addEventListener('click', function () {
    var ids = getSelectedIds();
    if (!ids.length) return;
    delMode = 'bulk'; delPkVal = ids.join(',');
    delModal.querySelector('.dt-del-msg').textContent = ids.length + ' item(s) will be permanently deleted.';
    showModal(delModal);
  });
  if (delModal) {
    delModal.querySelector('.dt-del-confirm').addEventListener('click', function () {
      postForm(delMode === 'single'
        ? { '_dt_action': 'delete', '_dt_del_pk': delPkVal }
        : { '_dt_action': 'bulkdelete', '_dt_bulk_ids': delPkVal });
    });
    bindModalClose(delModal, 'dt-del-cancel');
  }

  if (window.lucide) lucide.createIcons({ attrs: { class: 'shrink-0' } });

  root.querySelectorAll('.dt-alert[data-auto-dismiss]').forEach(function (al) {
    setTimeout(function () {
      al.style.transition = 'opacity 0.5s'; al.style.opacity = '0';
      setTimeout(function () { al.remove(); }, 500);
    }, parseInt(al.dataset.autoDismiss));
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    modals.forEach(function (m) {
      if (m && !m.classList.contains('hidden')) {
        hideModal(m);
        if (m === createModal) resetCreateForm();
      }
    });
  });

  render();
}
