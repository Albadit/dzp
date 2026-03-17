function initDataTable(tid) {
  var root = document.getElementById(tid);
  if (!root) return;

  var pageSize = parseInt(root.dataset.pageSize) || 10;
  var currentPage = 1;
  var sortCol = null, sortDir = 'asc';

  var table  = root.querySelector('.dt-table');
  var allRows  = Array.from(table.querySelectorAll('tbody .dt-row'));
  var filtered = allRows.slice();

  var searchInput  = root.querySelector('.dt-search');
  var pageSizeSelect = root.querySelector('.dt-page-size');
  var prevBtn    = root.querySelector('.dt-page-prev');
  var nextBtn    = root.querySelector('.dt-page-next');
  var pageInput  = root.querySelector('.dt-page-input');
  var pageTotal  = root.querySelector('.dt-page-total');
  var checkAll   = root.querySelector('.dt-check-all');
  var bulkBtn    = root.querySelector('.dt-btn-bulk-del');
  var createForm   = root.querySelector('.dt-create-form');
  var addBtn     = root.querySelector('.dt-btn-add');
  var cancelBtn  = root.querySelector('.dt-btn-cancel');
  var pageInfo   = root.querySelector('.dt-page-info');
  var pagination   = root.querySelector('.dt-pagination');

  var modal     = document.getElementById(tid + '-modal');
  var delModal  = document.getElementById(tid + '-del-modal');
  var createModal = document.getElementById(tid + '-create-modal');

  // Move modals to body so they aren't clipped by DNN/2sxc module wrappers
  if (modal) document.body.appendChild(modal);
  if (delModal) document.body.appendChild(delModal);
  if (createModal) document.body.appendChild(createModal);

  // Create and submit a dynamic form to avoid DNN's nested <form runat="server"> issues
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
    searchInput.addEventListener('input', function() {
      var q = this.value.toLowerCase();
      filtered = allRows.filter(function(r) {
        return r.textContent.toLowerCase().indexOf(q) >= 0;
      });
      currentPage = 1; applySortAndRender();
    });
  }

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', function() {
      pageSize = parseInt(this.value) || 10;
      currentPage = 1;
      render();
    });
  }

  root.querySelectorAll('.dt-sort').forEach(function(th) {
    th.addEventListener('click', function() {
      var col = this.dataset.col;
      if (sortCol === col) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
      else { sortCol = col; sortDir = 'asc'; }
      root.querySelectorAll('.dt-sort').forEach(function(s) { s.dataset.dir = ''; });
      this.dataset.dir = sortDir;
      currentPage = 1; applySortAndRender();
    });
  });

  // Sort filtered rows by the active column and re-render the table
  function applySortAndRender() {
    if (sortCol) {
      filtered.sort(function(a, b) {
        var aVal = getCellText(a, sortCol).toLowerCase();
        var bVal = getCellText(b, sortCol).toLowerCase();
        var cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }
    render();
  }

  // Get the text content of a cell by column name
  function getCellText(row, col) {
    var cell = row.querySelector('[data-col="' + col + '"]');
    return cell ? (cell.textContent || '').trim() : '';
  }

  // Show/hide rows for the current page and update pagination controls
  function render() {
    var total = filtered.length;
    var pages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > pages) currentPage = pages;
    var start = (currentPage - 1) * pageSize;
    var end   = start + pageSize;

    allRows.forEach(function(r) { r.style.display = 'none'; });
    for (var i = start; i < Math.min(end, total); i++) {
      filtered[i].style.display = '';
    }

    var emptyRow = table.querySelector('.dt-row-empty');
    if (emptyRow) emptyRow.style.display = total > 0 ? 'none' : '';

    if (pageInfo) {
      pageInfo.textContent = total === 0 ? '' : (start + 1) + '\u2013' + Math.min(end, total) + ' of ' + total;
    }

    if (pagination) {
      var pages = Math.max(1, Math.ceil(total / pageSize));
      pagination.style.display = '';
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === pages;
      pageInput.max = pages;
      pageInput.value = currentPage;
      pageTotal.textContent = '/ ' + pages;
    }

    updateBulkState();
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      if (currentPage > 1) { currentPage--; render(); }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      var pages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (currentPage < pages) { currentPage++; render(); }
    });
  }
  if (pageInput) {
    pageInput.addEventListener('change', function() {
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
    checkAll.addEventListener('change', function() {
      var checked = this.checked;
      getVisibleCheckboxes().forEach(function(cb) { cb.checked = checked; });
      updateBulkState();
    });
  }
  root.addEventListener('change', function(e) {
    if (e.target.classList.contains('dt-check-row')) updateBulkState();
  });

  // Return checkboxes only from currently visible (non-hidden) rows
  function getVisibleCheckboxes() {
    return Array.from(root.querySelectorAll('.dt-check-row')).filter(function(cb) {
      return cb.closest('.dt-row').style.display !== 'none';
    });
  }
  // Return primary key values of all checked visible rows
  function getSelectedIds() {
    return getVisibleCheckboxes().filter(function(cb) { return cb.checked; }).map(function(cb) { return cb.value; });
  }
  // Show/hide the bulk-delete button and update its count badge
  function updateBulkState() {
    if (!bulkBtn) return;
    var ids = getSelectedIds();
    if (ids.length > 0) {
      bulkBtn.classList.remove('hidden');
      bulkBtn.classList.add('inline-flex');
      bulkBtn.querySelector('.dt-bulk-count').textContent = ids.length;
    } else {
      bulkBtn.classList.add('hidden');
      bulkBtn.classList.remove('inline-flex');
    }
  }

  function resetCreateForm() {
    createModal.querySelectorAll('.dt-create-input').forEach(function(inp) { inp.value = ''; });
  }

  if (addBtn && createModal) addBtn.addEventListener('click', function() {
    createModal.classList.remove('hidden');
    var firstInput = createModal.querySelector('.dt-create-input');
    if (firstInput) firstInput.focus();
  });

  if (createModal) {
    var createSaveBtn = createModal.querySelector('.dt-create-save');
    if (createSaveBtn) {
      createSaveBtn.addEventListener('click', function() {
        var valid = true;
        createModal.querySelectorAll('.dt-create-input').forEach(function(inp) {
          if (!inp.checkValidity()) { inp.reportValidity(); valid = false; }
        });
        if (!valid) return;
        var fields = { '_dt_action': 'create' };
        createModal.querySelectorAll('.dt-create-input').forEach(function(inp) {
          fields['_dt_new_' + inp.dataset.col] = inp.value;
        });
        postForm(fields);
      });
    }

    createModal.querySelectorAll('.dt-create-modal-close').forEach(function(btn) {
      btn.addEventListener('click', function() {
        createModal.classList.add('hidden');
        resetCreateForm();
      });
    });
    createModal.addEventListener('click', function(e) {
      if (e.target === createModal) {
        createModal.classList.add('hidden');
        resetCreateForm();
      }
    });
  }

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.dt-btn-edit[data-target="' + tid + '"]');
    if (!btn) return;
    editPk = btn.dataset.pk;
    var row = btn.closest('.dt-row');
    modal.querySelectorAll('.dt-modal-input').forEach(function(inp) {
      inp.value = getCellText(row, inp.dataset.col);
    });
    modal.classList.remove('hidden');
    var firstInput = modal.querySelector('.dt-modal-input');
    if (firstInput) firstInput.focus();
  });

  if (modal) {
    modal.querySelector('.dt-modal-save').addEventListener('click', function() {
      var valid = true;
      modal.querySelectorAll('.dt-modal-input').forEach(function(inp) {
        if (!inp.checkValidity()) { inp.reportValidity(); valid = false; }
      });
      if (!valid) return;
      var fields = { '_dt_action': 'update', '_dt_edit_pk': editPk };
      modal.querySelectorAll('.dt-modal-input').forEach(function(inp) {
        fields['_dt_edit_' + inp.dataset.col] = inp.value;
      });
      postForm(fields);
    });
    modal.querySelectorAll('.dt-modal-close').forEach(function(btn) {
      btn.addEventListener('click', function() { modal.classList.add('hidden'); });
    });
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.dt-btn-del[data-target="' + tid + '"]');
    if (!btn) return;
    delMode = 'single'; delPkVal = btn.dataset.pk;
    delModal.querySelector('.dt-del-msg').textContent = 'This item will be permanently deleted.';
    delModal.classList.remove('hidden');
  });

  if (bulkBtn) bulkBtn.addEventListener('click', function() {
    var ids = getSelectedIds();
    if (ids.length === 0) return;
    delMode = 'bulk'; delPkVal = ids.join(',');
    delModal.querySelector('.dt-del-msg').textContent = ids.length + ' item(s) will be permanently deleted.';
    delModal.classList.remove('hidden');
  });

  if (delModal) {
    delModal.querySelector('.dt-del-confirm').addEventListener('click', function() {
      if (delMode === 'single') {
        postForm({ '_dt_action': 'delete', '_dt_del_pk': delPkVal });
      } else {
        postForm({ '_dt_action': 'bulkdelete', '_dt_bulk_ids': delPkVal });
      }
    });
    delModal.querySelector('.dt-del-cancel').addEventListener('click', function() {
      delModal.classList.add('hidden');
    });
    delModal.addEventListener('click', function(e) {
      if (e.target === delModal) delModal.classList.add('hidden');
    });
  }

  // Init Lucide icons inside this component (alert toast, pagination, etc.)
  if (window.lucide) lucide.createIcons({ attrs: { class: 'size-4 shrink-0' } });

  // Auto-dismiss toast notifications
  root.querySelectorAll('.dt-alert[data-auto-dismiss]').forEach(function(el) {
    setTimeout(function() {
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      setTimeout(function() { el.remove(); }, 500);
    }, parseInt(el.dataset.autoDismiss));
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (modal && !modal.classList.contains('hidden')) modal.classList.add('hidden');
      if (delModal && !delModal.classList.contains('hidden')) delModal.classList.add('hidden');
      if (createModal && !createModal.classList.contains('hidden')) {
        createModal.classList.add('hidden');
        resetCreateForm();
      }
    }
  });

  render();
}
