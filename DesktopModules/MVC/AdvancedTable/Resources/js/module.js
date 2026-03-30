function initDataTable(tid) {
  var root = document.getElementById(tid);
  if (!root) return;

  var pageSize = parseInt(root.dataset.pageSize) || 10;
  var currentPage = 1;
  var sortColumns = [];

  var table  = root.querySelector('.dt-table');
  var allRows  = Array.from(table.querySelectorAll('.dt-tbody .dt-row'));
  var filtered = allRows.slice();

  var searchInput    = root.querySelector('.dt-search');
  var pageSizeSelect = root.querySelector('.dt-page-size');
  var prevBtn        = root.querySelector('.dt-page-prev');
  var nextBtn        = root.querySelector('.dt-page-next');
  var pageInput      = root.querySelector('.dt-page-input');
  var pageTotal      = root.querySelector('.dt-page-total');
  var checkAll       = root.querySelector('.dt-check-all');
  var bulkBtn        = root.querySelector('.dt-btn-bulk-del');
  var addBtn         = root.querySelector('.dt-btn-add');
  var pagination     = root.querySelector('.dt-pagination');
  var rowCount       = root.querySelector('.dt-row-count');

  var modal       = document.getElementById(tid + '-modal');
  var delModal    = document.getElementById(tid + '-del-modal');
  var createModal = document.getElementById(tid + '-create-modal');

  if (modal) document.body.appendChild(modal);
  if (delModal) document.body.appendChild(delModal);
  if (createModal) document.body.appendChild(createModal);

  function lockScroll() { document.body.style.overflow = 'hidden'; }
  function unlockScroll() { document.body.style.overflow = ''; }

  // Initialize MultiSelect widgets for lookup columns
  var lookupData = window['__dtLookups_' + tid] || {};

  function initLookupWidgets(container, cssClass) {
    if (!container) return;
    container.querySelectorAll('.' + cssClass).forEach(function (el) {
      var col = el.dataset.col;
      var isMulti = el.dataset.multi === 'true';
      var opts = (lookupData[col] || []).map(function (o) {
        return { value: String(o.value), label: o.label };
      });
      el._ms = MultiSelect.create(el, {
        placeholder: '-- Select --',
        options: opts,
        selected: [],
        single: !isMulti
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
      if (el._ms) {
        var isMulti = el.dataset.multi === 'true';
        fields[prefix + el.dataset.col] = isMulti ? el._ms.getSelected().join(',') : el._ms.getValue();
      }
    });
    return fields;
  }

  function setModalLookupValue(container, lookupClass, col, val) {
    container.querySelectorAll('.' + lookupClass).forEach(function (el) {
      if (el.dataset.col === col && el._ms) {
        var isMulti = el.dataset.multi === 'true';
        var selArr;
        if (isMulti && val) {
          selArr = String(val).split(',').map(function (v) { return v.trim(); }).filter(function (v) { return v !== ''; });
        } else {
          selArr = val ? [String(val)] : [];
        }
        el._ms.setOptions(
          (lookupData[col] || []).map(function (o) { return { value: String(o.value), label: o.label }; }),
          selArr
        );
      }
    });
  }

  function resetLookups(container, lookupClass) {
    container.querySelectorAll('.' + lookupClass).forEach(function (el) {
      if (el._ms) {
        var col = el.dataset.col;
        el._ms.setOptions(
          (lookupData[col] || []).map(function (o) { return { value: String(o.value), label: o.label }; }),
          []
        );
      }
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

  var editPk = null;
  var delMode = null;
  var delPkVal = null;

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = this.value.toLowerCase();
      filtered = allRows.filter(function (r) {
        return r.textContent.toLowerCase().indexOf(q) >= 0;
      });
      currentPage = 1;
      applySortAndRender();
    });
  }

  if (pageSizeSelect) {
    var pageSizeMs = MultiSelect.create(pageSizeSelect, {
      placeholder: '10',
      options: [
        { value: '10', label: '10' },
        { value: '25', label: '25' },
        { value: '50', label: '50' },
        { value: '100', label: '100' }
      ],
      selected: [String(pageSize)],
      single: true,
      onChange: function (sel) {
        pageSize = parseInt(sel.length ? sel[0] : '10') || 10;
        currentPage = 1;
        render();
      }
    });
  }

  root.querySelectorAll('.dt-sort').forEach(function (th) {
    th.addEventListener('click', function () {
      var col = this.dataset.col;
      var idx = -1;
      for (var i = 0; i < sortColumns.length; i++) {
        if (sortColumns[i].col === col) { idx = i; break; }
      }
      if (idx >= 0) {
        if (sortColumns[idx].dir === 'asc') {
          sortColumns[idx].dir = 'desc';
        } else {
          sortColumns.splice(idx, 1);
        }
      } else {
        sortColumns.push({ col: col, dir: 'asc' });
      }
      updateSortIndicators();
      currentPage = 1;
      applySortAndRender();
    });
  });

  function updateSortIndicators() {
    root.querySelectorAll('.dt-sort').forEach(function (th) {
      var col = th.dataset.col;
      var numEl = th.querySelector('.dt-sort-num');
      var wrapEl = th.querySelector('.dt-sort-icon-wrap');
      var idx = -1;
      for (var i = 0; i < sortColumns.length; i++) {
        if (sortColumns[i].col === col) { idx = i; break; }
      }
      if (idx >= 0) {
        var dir = sortColumns[idx].dir;
        th.dataset.dir = dir;
        if (numEl) {
          numEl.textContent = sortColumns.length > 1 ? (idx + 1) : '';
          numEl.classList.toggle('hidden', sortColumns.length <= 1);
        }
        if (wrapEl) {
          var icon = dir === 'asc' ? 'move-up' : 'move-down';
          wrapEl.innerHTML = '<i data-lucide="' + icon + '" class="size-3.5 shrink-0 text-primary"></i>';
        }
      } else {
        th.dataset.dir = '';
        if (numEl) { numEl.textContent = ''; numEl.classList.add('hidden'); }
        if (wrapEl) {
          wrapEl.innerHTML = '<i data-lucide="arrow-down-up" class="size-3.5 shrink-0 opacity-40"></i>';
        }
      }
    });
    if (window.lucide) lucide.createIcons();
  }

  function applySortAndRender() {
    if (sortColumns.length > 0) {
      filtered.sort(function (a, b) {
        for (var i = 0; i < sortColumns.length; i++) {
          var s = sortColumns[i];
          var aVal = getCellText(a, s.col).toLowerCase();
          var bVal = getCellText(b, s.col).toLowerCase();
          var cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
          if (cmp !== 0) return s.dir === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
    }
    var tbody = table.querySelector('.dt-tbody');
    if (tbody) {
      filtered.forEach(function (row) { tbody.appendChild(row); });
    }
    render();
  }

  function getCellText(row, col) {
    var cell = row.querySelector('[data-col="' + col + '"]');
    if (!cell) return '';
    if (cell.hasAttribute('data-raw')) return cell.getAttribute('data-raw');
    return (cell.textContent || '').trim();
  }

  function render() {
    var total = filtered.length;
    var pages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > pages) currentPage = pages;
    var start = (currentPage - 1) * pageSize;
    var end = start + pageSize;

    allRows.forEach(function (r) { r.style.display = 'none'; });
    for (var i = start; i < Math.min(end, total); i++) {
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

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (currentPage > 1) { currentPage--; render(); }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      var pages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (currentPage < pages) { currentPage++; render(); }
    });
  }
  if (pageInput) {
    pageInput.addEventListener('change', function () {
      var pages = Math.max(1, Math.ceil(filtered.length / pageSize));
      var v = parseInt(this.value) || 1;
      if (v < 1) v = 1;
      if (v > pages) v = pages;
      this.value = v;
      currentPage = v;
      render();
    });
  }

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
    var ids = getSelectedIds();
    var visible = getVisibleCheckboxes();
    if (ids.length > 0) {
      bulkBtn.classList.remove('hidden');
      bulkBtn.querySelector('.dt-bulk-count').textContent = ids.length;
    } else {
      bulkBtn.classList.add('hidden');
    }
    if (checkAll) {
      var allChecked = visible.length > 0 && ids.length === visible.length;
      var someChecked = ids.length > 0 && !allChecked;
      checkAll.checked = allChecked;
      checkAll.indeterminate = someChecked;
    }
  }

  function resetCreateForm() {
    if (!createModal) return;
    createModal.querySelectorAll('.dt-create-input').forEach(function (inp) { inp.value = ''; });
    resetLookups(createModal, 'dt-create-lookup');
  }

  if (addBtn && createModal) {
    addBtn.addEventListener('click', function () {
      createModal.classList.remove('hidden');
      lockScroll();
      var firstInput = createModal.querySelector('.dt-create-input');
      if (firstInput) firstInput.focus();
    });
  }

  if (createModal) {
    var createSaveBtn = createModal.querySelector('.dt-create-save');
    if (createSaveBtn) {
      createSaveBtn.addEventListener('click', function () {
        var valid = true;
        createModal.querySelectorAll('.dt-create-input').forEach(function (inp) {
          if (!inp.checkValidity()) { inp.reportValidity(); valid = false; }
        });
        if (!valid) return;
        var fields = { '_dt_action': 'create' };
        var inputFields = getModalFields(createModal, 'dt-create-input', 'dt-create-lookup', '_dt_new_');
        for (var k in inputFields) { fields[k] = inputFields[k]; }
        postForm(fields);
      });
    }

    createModal.querySelectorAll('.dt-create-modal-close').forEach(function (btn) {
      btn.addEventListener('click', function () {
        createModal.classList.add('hidden');
        unlockScroll();
        resetCreateForm();
      });
    });
    createModal.addEventListener('click', function (e) {
      if (e.target === createModal) {
        createModal.classList.add('hidden');
        unlockScroll();
        resetCreateForm();
      }
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.dt-btn-edit[data-target="' + tid + '"]');
    if (!btn) return;
    editPk = btn.dataset.pk;
    var row = btn.closest('.dt-row');
    modal.querySelectorAll('.dt-modal-input').forEach(function (inp) {
      inp.value = getCellText(row, inp.dataset.col);
    });
    modal.querySelectorAll('.dt-modal-lookup').forEach(function (el) {
      setModalLookupValue(modal, 'dt-modal-lookup', el.dataset.col, getCellText(row, el.dataset.col));
    });
    modal.classList.remove('hidden');
    lockScroll();
    var firstInput = modal.querySelector('.dt-modal-input');
    if (firstInput) firstInput.focus();
  });

  if (modal) {
    modal.querySelector('.dt-modal-save').addEventListener('click', function () {
      var valid = true;
      modal.querySelectorAll('.dt-modal-input').forEach(function (inp) {
        if (!inp.checkValidity()) { inp.reportValidity(); valid = false; }
      });
      if (!valid) return;
      var fields = { '_dt_action': 'update', '_dt_edit_pk': editPk };
      var inputFields = getModalFields(modal, 'dt-modal-input', 'dt-modal-lookup', '_dt_edit_');
      for (var k in inputFields) { fields[k] = inputFields[k]; }
      postForm(fields);
    });
    modal.querySelectorAll('.dt-modal-close').forEach(function (btn) {
      btn.addEventListener('click', function () { modal.classList.add('hidden'); unlockScroll(); });
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) { modal.classList.add('hidden'); unlockScroll(); }
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.dt-btn-del[data-target="' + tid + '"]');
    if (!btn) return;
    delMode = 'single';
    delPkVal = btn.dataset.pk;
    delModal.querySelector('.dt-del-msg').textContent = 'This item will be permanently deleted.';
    delModal.classList.remove('hidden');
    lockScroll();
  });

  if (bulkBtn) {
    bulkBtn.addEventListener('click', function () {
      var ids = getSelectedIds();
      if (ids.length === 0) return;
      delMode = 'bulk';
      delPkVal = ids.join(',');
      delModal.querySelector('.dt-del-msg').textContent = ids.length + ' item(s) will be permanently deleted.';
      delModal.classList.remove('hidden');
      lockScroll();
    });
  }

  if (delModal) {
    delModal.querySelector('.dt-del-confirm').addEventListener('click', function () {
      if (delMode === 'single') {
        postForm({ '_dt_action': 'delete', '_dt_del_pk': delPkVal });
      } else {
        postForm({ '_dt_action': 'bulkdelete', '_dt_bulk_ids': delPkVal });
      }
    });
    delModal.querySelector('.dt-del-cancel').addEventListener('click', function () {
      delModal.classList.add('hidden');
      unlockScroll();
    });
    delModal.addEventListener('click', function (e) {
      if (e.target === delModal) { delModal.classList.add('hidden'); unlockScroll(); }
    });
  }

  if (window.lucide) lucide.createIcons({ attrs: { class: 'shrink-0' } });

  root.querySelectorAll('.dt-alert[data-auto-dismiss]').forEach(function (el) {
    setTimeout(function () {
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 500);
    }, parseInt(el.dataset.autoDismiss));
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (modal && !modal.classList.contains('hidden')) { modal.classList.add('hidden'); unlockScroll(); }
      if (delModal && !delModal.classList.contains('hidden')) { delModal.classList.add('hidden'); unlockScroll(); }
      if (createModal && !createModal.classList.contains('hidden')) {
        createModal.classList.add('hidden');
        unlockScroll();
        resetCreateForm();
      }
    }
  });

  render();
}
