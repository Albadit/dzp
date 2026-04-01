(function ($, Sys) {
    var container = document.getElementById('columnsContainer');
    var modeSelectEl = document.getElementById('modeSelect');
    var modeHidden = document.getElementById('modeValue');
    var sqlFields = document.getElementById('sqlFields');
    var apiFields = document.getElementById('apiFields');

    var modeMs = MultiSelect.create(modeSelectEl, {
        placeholder: '-- Source --',
        options: [{ value: 'sql', label: 'SQL' }, { value: 'api', label: 'API' }],
        selected: [modeSelectEl.getAttribute('data-selected') || 'sql'],
        single: true,
        onChange: function (sel) {
            var val = sel.length ? sel[0] : 'sql';
            modeHidden.value = val;
            if (val === 'api') {
                sqlFields.style.display = 'none';
                apiFields.style.display = '';
            } else {
                sqlFields.style.display = '';
                apiFields.style.display = 'none';
            }
            var tas = (val === 'api' ? apiFields : sqlFields).querySelectorAll('.edit-code-area');
            for (var i = 0; i < tas.length; i++) autoResize(tas[i]);
        }
    });

    // Init API method selects
    var methodSelects = document.querySelectorAll('.api-method-ms');
    for (var mi = 0; mi < methodSelects.length; mi++) {
        (function (el) {
            var opts = JSON.parse(el.getAttribute('data-options') || '[]');
            var selected = el.getAttribute('data-selected') || '';
            var hidden = el.nextElementSibling;
            MultiSelect.create(el, {
                placeholder: '-- Method --',
                options: opts,
                selected: selected ? [selected] : [],
                single: true,
                onChange: function (sel) {
                    hidden.value = sel.length ? sel[0] : '';
                }
            });
        })(methodSelects[mi]);
    }

    var colTypeOpts = (window.__dnnColTypes || []).map(function (t) {
        return { value: t.toLowerCase(), label: t };
    });
    if (!colTypeOpts.length) {
        colTypeOpts = [
            { value: 'text', label: 'Text' },
            { value: 'readonly', label: 'Read Only' },
            { value: 'hidden', label: 'Hidden' },
            { value: 'number', label: 'Number' },
            { value: 'email', label: 'Email' },
            { value: 'url', label: 'URL' },
            { value: 'select', label: 'Select' },
            { value: 'multiselect', label: 'Multi Select' }
        ];
    }

    function initColTypeSelect(container, selectedType) {
        return MultiSelect.create(container, {
            placeholder: '-- Type --',
            options: colTypeOpts,
            selected: selectedType ? [selectedType] : [],
            single: true,
            onChange: function () {
                var row = container.closest('.column-row');
                if (row) toggleQueryField(row);
            }
        });
    }

    function initColSourceMode(wrap) {
        var modeEl = wrap.querySelector('.col-source-mode-ms');
        var sqlDiv = wrap.querySelector('.col-source-sql');
        var apiDiv = wrap.querySelector('.col-source-api');
        var methodEl = wrap.querySelector('.col-api-method-ms');
        var methodHidden = wrap.querySelector('.col-api-method-val');
        if (modeEl._ms) return;
        modeEl._ms = MultiSelect.create(modeEl, {
            placeholder: '-- Source --',
            options: [{ value: 'sql', label: 'SQL' }, { value: 'api', label: 'API' }],
            selected: [modeEl.getAttribute('data-selected') || 'sql'],
            single: true,
            onChange: function (sel) {
                var val = sel.length ? sel[0] : 'sql';
                if (val === 'api') { sqlDiv.style.display = 'none'; apiDiv.style.display = ''; }
                else { sqlDiv.style.display = ''; apiDiv.style.display = 'none'; }
                var ta = sqlDiv.querySelector('textarea');
                if (ta && val !== 'api') autoResize(ta);
            }
        });
        if (methodEl && !methodEl._ms) {
            var opts = JSON.parse(methodEl.getAttribute('data-options') || '[]');
            var selected = methodEl.getAttribute('data-selected') || 'GET';
            methodEl._ms = MultiSelect.create(methodEl, {
                placeholder: '-- Method --',
                options: opts,
                selected: [selected],
                single: true,
                onChange: function (sel) { methodHidden.value = sel.length ? sel[0] : ''; }
            });
        }
    }

    function toggleQueryField(row) {
        var typeMs = row.querySelector('.col-type-ms');
        var type = typeMs._ms ? typeMs._ms.getValue() : '';
        var qField = row.querySelector('.col-query-wrap');
        if (type === 'select' || type === 'multiselect') {
            if (!qField) {
                qField = document.createElement('div');
                qField.className = 'col-query-wrap';
                qField.innerHTML =
                    '<div class="col-source-mode-ms" data-selected="sql"></div>' +
                    '<div class="col-source-sql"><textarea class="col-query edit-code-area" rows="1" placeholder="SELECT value, label FROM ..."></textarea></div>' +
                    '<div class="col-source-api" style="display:none;">' +
                        '<div class="col-api-method-ms" data-selected="GET" data-options=\'[{"value":"GET","label":"GET"},{"value":"POST","label":"POST"}]\'></div>' +
                        '<input type="hidden" class="col-api-method-val" value="GET" />' +
                        '<input type="text" class="col-api-path" placeholder="/api/items" />' +
                    '</div>';
                row.querySelector('.remove-col').before(qField);
                initColSourceMode(qField);
                var ta = qField.querySelector('textarea');
                autoResize(ta);
                ta.addEventListener('input', function () { autoResize(this); });
            }
            qField.style.display = '';
        } else if (qField) {
            qField.style.display = 'none';
        }
    }

    function createColumnRow(key, label, type, query) {
        var isSelect = type === 'select' || type === 'multiselect';
        var sourceMode = 'sql', apiMethod = 'GET', apiPath = '', sqlQuery = query || '';
        if (isSelect && query && query.charAt(0) === '{') {
            try {
                var parsed = JSON.parse(query);
                if (parsed.mode === 'api') {
                    sourceMode = 'api';
                    apiMethod = parsed.method || 'GET';
                    apiPath = parsed.path || '';
                    sqlQuery = '';
                }
            } catch (e) { }
        }
        var row = document.createElement('div');
        row.className = 'column-row';
        var qHtml = '';
        if (isSelect) {
            qHtml =
                '<div class="col-query-wrap">' +
                    '<div class="col-source-mode-ms" data-selected="' + sourceMode + '"></div>' +
                    '<div class="col-source-sql"' + (sourceMode === 'api' ? ' style="display:none;"' : '') + '>' +
                        '<textarea class="col-query edit-code-area" rows="1" placeholder="SELECT value, label FROM ...">' + escHtml(sqlQuery) + '</textarea>' +
                    '</div>' +
                    '<div class="col-source-api"' + (sourceMode !== 'api' ? ' style="display:none;"' : '') + '>' +
                        '<div class="col-api-method-ms" data-selected="' + escHtml(apiMethod) + '" data-options=\'[{"value":"GET","label":"GET"},{"value":"POST","label":"POST"}]\'></div>' +
                        '<input type="hidden" class="col-api-method-val" value="' + escHtml(apiMethod) + '" />' +
                        '<input type="text" class="col-api-path" value="' + escHtml(apiPath) + '" placeholder="/api/items" />' +
                    '</div>' +
                '</div>';
        }
        row.innerHTML =
            '<input type="text" class="col-key" value="' + escHtml(key || '') + '" placeholder="Column Key" />' +
            '<input type="text" class="col-label" value="' + escHtml(label || '') + '" placeholder="Display Label" />' +
            '<div class="col-type-ms"></div>' +
            qHtml +
            '<button type="button" class="remove-col"><i data-lucide="circle-x"></i></button>';
        var typeMs = row.querySelector('.col-type-ms');
        typeMs._ms = initColTypeSelect(typeMs, type || '');
        var wrap = row.querySelector('.col-query-wrap');
        if (wrap) {
            initColSourceMode(wrap);
            var ta = wrap.querySelector('.col-query');
            if (ta) { autoResize(ta); ta.addEventListener('input', function () { autoResize(this); }); }
        }
        return row;
    }

    function escHtml(s) {
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(s));
        return d.innerHTML;
    }

    // Init widgets on server-rendered column rows
    var existingColRows = container.querySelectorAll('.column-row');
    for (var ci = 0; ci < existingColRows.length; ci++) {
        var colRow = existingColRows[ci];
        var colTypeMs = colRow.querySelector('.col-type-ms');
        var colType = colTypeMs.getAttribute('data-selected') || '';
        colTypeMs._ms = initColTypeSelect(colTypeMs, colType);
        var existingWrap = colRow.querySelector('.col-query-wrap');
        if (existingWrap) initColSourceMode(existingWrap);
        toggleQueryField(colRow);
    }

    document.getElementById('addColumn').addEventListener('click', function () {
        container.appendChild(createColumnRow('', '', 'text', ''));
        if (window.lucide) lucide.createIcons();
    });

    // Detect Columns button
    var detectBtn = document.getElementById('detectColumns');
    var detectStatus = document.getElementById('detectStatus');
    if (detectBtn) {
        detectBtn.addEventListener('click', function () {
            var mode = modeHidden.value || 'sql';
            var formData = new FormData();
            formData.append('mode', mode);

            if (mode === 'sql') {
                var querySelect = document.querySelector('[name="QuerySelect"]');
                var q = querySelect ? querySelect.value.trim() : '';
                if (!q) { detectStatus.textContent = 'Enter a SELECT query first.'; return; }
                formData.append('query', q);
            } else {
                var baseUrl = document.querySelector('[name="ApiBaseUrl"]');
                var selPath = document.querySelector('[name="ApiSelectPath"]');
                var selMethod = document.querySelector('[name="ApiSelectMethod"]');
                var hdrs = document.querySelector('[name="ApiHeaders"]');
                if (!baseUrl || !baseUrl.value.trim()) { detectStatus.textContent = 'Enter an API Base URL first.'; return; }
                formData.append('apiBaseUrl', baseUrl.value.trim());
                formData.append('apiSelectPath', selPath ? selPath.value.trim() : '');
                formData.append('apiSelectMethod', selMethod ? selMethod.value : 'GET');
                formData.append('apiHeaders', hdrs ? hdrs.value : '');
            }

            detectBtn.disabled = true;
            detectStatus.textContent = 'Detecting...';

            fetch('/DesktopModules/MVC/AdvancedTable/DetectColumns.ashx', {
                method: 'POST',
                body: formData
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                detectBtn.disabled = false;
                if (!data.success) {
                    detectStatus.textContent = 'Error: ' + (data.error || 'Unknown error');
                    return;
                }
                if (!data.columns || !data.columns.length) {
                    detectStatus.textContent = 'No columns found.';
                    return;
                }
                // Build a set of existing column keys
                var existing = {};
                var existingRows = container.querySelectorAll('.column-row');
                for (var i = 0; i < existingRows.length; i++) {
                    var k = existingRows[i].querySelector('.col-key').value.trim().toLowerCase();
                    if (k) existing[k] = true;
                }
                var added = 0;
                for (var j = 0; j < data.columns.length; j++) {
                    var col = data.columns[j];
                    if (!existing[col.Key.toLowerCase()]) {
                        container.appendChild(createColumnRow(col.Key, col.Label, col.Type, ''));
                        added++;
                    }
                }
                if (window.lucide) lucide.createIcons();
                detectStatus.textContent = added > 0
                    ? 'Added ' + added + ' column(s).'
                    : 'All columns already exist.';
            })
            .catch(function (err) {
                detectBtn.disabled = false;
                detectStatus.textContent = 'Error: ' + err.message;
            });
        });
    }

    container.addEventListener('click', function (e) {
        var btn = e.target.closest('.remove-col');
        if (btn) btn.closest('.column-row').remove();
    });

    // Permissions
    var permContainer = document.getElementById('permissionsContainer');

    // Build option lists from server-provided data
    var dnnData = window.__dnnPermData || { roles: [], users: [] };
    var roleOpts = dnnData.roles.map(function (r) { return { value: r, label: r }; });
    var userOpts = dnnData.users.map(function (u) { return { value: u, label: u }; });
    var typeOpts = [{ value: 'role', label: 'Role' }, { value: 'user', label: 'User' }];

    function getOptsForType(type) {
        if (type === 'role') return roleOpts;
        if (type === 'user') return userOpts;
        return [];
    }

    function initMultiSelect(container, type, selectedNames) {
        return MultiSelect.create(container, {
            placeholder: type ? 'Select ' + type + 's…' : 'Select…',
            options: getOptsForType(type),
            selected: selectedNames || []
        });
    }

    function initTypeSelect(container, selectedType, onTypeChange) {
        return MultiSelect.create(container, {
            placeholder: '-- Type --',
            options: typeOpts,
            selected: selectedType ? [selectedType] : [],
            single: true,
            onChange: function (sel) {
                if (onTypeChange) onTypeChange(sel.length ? sel[0] : '');
            }
        });
    }

    function createPermRow(type, names, create, edit, del, bulk) {
        var row = document.createElement('div');
        row.className = 'perm-row';
        row.innerHTML =
            '<div class="perm-type-ms"></div>' +
            '<div class="perm-name-ms"></div>' +
            '<div class="perm-checks">' +
                '<label><input type="checkbox" class="perm-create"' + (create ? ' checked' : '') + ' /> Create</label>' +
                '<label><input type="checkbox" class="perm-edit"' + (edit ? ' checked' : '') + ' /> Edit</label>' +
                '<label><input type="checkbox" class="perm-delete"' + (del ? ' checked' : '') + ' /> Delete</label>' +
                '<label><input type="checkbox" class="perm-bulk"' + (bulk ? ' checked' : '') + ' /> Bulk Delete</label>' +
            '</div>' +
            '<button type="button" class="remove-perm"><i data-lucide="circle-x"></i></button>';
        var nameMs = row.querySelector('.perm-name-ms');
        nameMs._ms = initMultiSelect(nameMs, type, names || []);
        var typeMs = row.querySelector('.perm-type-ms');
        typeMs._ms = initTypeSelect(typeMs, type, function (newType) {
            if (nameMs._ms) nameMs._ms.destroy();
            nameMs._ms = initMultiSelect(nameMs, newType, []);
        });
        return row;
    }

    // Init widgets on server-rendered rows
    var existingRows = permContainer.querySelectorAll('.perm-row');
    for (var k = 0; k < existingRows.length; k++) {
        var row = existingRows[k];
        var nameMs = row.querySelector('.perm-name-ms');
        var typeMs = row.querySelector('.perm-type-ms');
        var type = typeMs.getAttribute('data-selected') || '';
        var selectedNames = [];
        try { selectedNames = JSON.parse(nameMs.getAttribute('data-selected') || '[]'); } catch (e) { }
        nameMs._ms = initMultiSelect(nameMs, type, selectedNames);
        (function (nameMs) {
            typeMs._ms = initTypeSelect(typeMs, type, function (newType) {
                if (nameMs._ms) nameMs._ms.destroy();
                nameMs._ms = initMultiSelect(nameMs, newType, []);
            });
        })(nameMs);
    }

    document.getElementById('addPermission').addEventListener('click', function () {
        permContainer.appendChild(createPermRow('', [], false, false, false, false));
        if (window.lucide) lucide.createIcons();
    });

    permContainer.addEventListener('click', function (e) {
        var btn = e.target.closest('.remove-perm');
        if (btn) btn.closest('.perm-row').remove();
    });

    document.getElementById('btnSave').addEventListener('click', function () {
        // Columns
        var rows = container.querySelectorAll('.column-row');
        var columns = [];
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var key = row.querySelector('.col-key').value.trim();
            var label = row.querySelector('.col-label').value.trim();
            var colTypeMs = row.querySelector('.col-type-ms');
            var type = colTypeMs._ms ? colTypeMs._ms.getValue() : '';
            var queryEl = row.querySelector('.col-query');
            var colWrap = row.querySelector('.col-query-wrap');
            var query = '';
            if ((type === 'select' || type === 'multiselect') && colWrap) {
                var srcModeMs = colWrap.querySelector('.col-source-mode-ms');
                var srcMode = (srcModeMs && srcModeMs._ms) ? srcModeMs._ms.getValue() : 'sql';
                if (srcMode === 'api') {
                    var mEl = colWrap.querySelector('.col-api-method-val');
                    var pEl = colWrap.querySelector('.col-api-path');
                    query = JSON.stringify({ mode: 'api', method: mEl ? mEl.value : 'GET', path: pEl ? pEl.value.trim() : '' });
                } else {
                    query = queryEl ? queryEl.value.trim() : '';
                }
            }
            if (key) {
                columns.push({ Key: key, Label: label || key, Type: type, Pattern: query || null, Required: false, Sortable: true, Filterable: true });
            }
        }
        document.getElementById('columnsJson').value = columns.length > 0 ? JSON.stringify(columns) : '';

        // Permissions
        var permRows = permContainer.querySelectorAll('.perm-row');
        var permissions = [];
        for (var j = 0; j < permRows.length; j++) {
            var pr = permRows[j];
            var typeMs = pr.querySelector('.perm-type-ms');
            var pType = typeMs._ms ? typeMs._ms.getValue() : '';
            var msContainer = pr.querySelector('.perm-name-ms');
            var selectedNames = msContainer._ms ? msContainer._ms.getSelected() : [];
            if (pType && selectedNames.length > 0) {
                var allowCreate = pr.querySelector('.perm-create').checked;
                var allowEdit = pr.querySelector('.perm-edit').checked;
                var allowDelete = pr.querySelector('.perm-delete').checked;
                var allowBulk = pr.querySelector('.perm-bulk').checked;
                for (var n = 0; n < selectedNames.length; n++) {
                    permissions.push({
                        Type: pType,
                        Name: selectedNames[n],
                        AllowCreate: allowCreate,
                        AllowEdit: allowEdit,
                        AllowDelete: allowDelete,
                        AllowBulkDelete: allowBulk
                    });
                }
            }
        }
        document.getElementById('permissionsJson').value = permissions.length > 0 ? JSON.stringify(permissions) : '';
    });

    function autoResize(ta) {
        if (!ta.offsetParent) return;
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
    }

    function initAutoResize() {
        var textareas = document.querySelectorAll('.edit-code-area');
        for (var i = 0; i < textareas.length; i++) {
            autoResize(textareas[i]);
            textareas[i].addEventListener('input', function () { autoResize(this); });
        }
    }
    initAutoResize();

    // Accordion
    var form = document.getElementById('editForm');
    var heads = form.querySelectorAll('h2.at-section-head a');
    for (var hi = 0; hi < heads.length; hi++) {
        heads[hi].addEventListener('click', function (e) {
            e.preventDefault();
            var link = this;
            var fs = link.parentElement.nextElementSibling;
            if (link.classList.contains('at-expanded')) {
                link.classList.remove('at-expanded');
                fs.style.display = 'none';
            } else {
                link.classList.add('at-expanded');
                fs.style.display = '';
            }
            updateCollapseToggle();
        });
    }

    var toggleLink = form.querySelector('.at-collapse-toggle a');
    function updateCollapseToggle() {
        var allExpanded = form.querySelectorAll('h2.at-section-head a.at-expanded');
        toggleLink.textContent = allExpanded.length === heads.length ? 'Collapse All' : 'Expand All';
    }
    toggleLink.addEventListener('click', function (e) {
        e.preventDefault();
        var allExpanded = form.querySelectorAll('h2.at-section-head a.at-expanded');
        var expand = allExpanded.length < heads.length;
        for (var i = 0; i < heads.length; i++) {
            var fs = heads[i].parentElement.nextElementSibling;
            if (expand) {
                heads[i].classList.add('at-expanded');
                fs.style.display = '';
            } else {
                heads[i].classList.remove('at-expanded');
                fs.style.display = 'none';
            }
        }
        updateCollapseToggle();
    });
    updateCollapseToggle();

    // ── Gather current config as object ──
    function gatherConfig() {
        var mode = modeHidden.value || 'sql';
        var cfg = {
            Title: form.querySelector('[name="Title"]').value,
            Mode: mode,
            QuerySelect: form.querySelector('[name="QuerySelect"]') ? form.querySelector('[name="QuerySelect"]').value : null,
            QueryInsert: form.querySelector('[name="QueryInsert"]') ? form.querySelector('[name="QueryInsert"]').value : null,
            QueryUpdate: form.querySelector('[name="QueryUpdate"]') ? form.querySelector('[name="QueryUpdate"]').value : null,
            QueryDelete: form.querySelector('[name="QueryDelete"]') ? form.querySelector('[name="QueryDelete"]').value : null,
            QueryBulkDelete: form.querySelector('[name="QueryBulkDelete"]') ? form.querySelector('[name="QueryBulkDelete"]').value : null,
            ApiBaseUrl: form.querySelector('[name="ApiBaseUrl"]') ? form.querySelector('[name="ApiBaseUrl"]').value : null,
            ApiHeaders: form.querySelector('[name="ApiHeaders"]') ? form.querySelector('[name="ApiHeaders"]').value : null,
            ApiSelectMethod: form.querySelector('[name="ApiSelectMethod"]') ? form.querySelector('[name="ApiSelectMethod"]').value : null,
            ApiSelectPath: form.querySelector('[name="ApiSelectPath"]') ? form.querySelector('[name="ApiSelectPath"]').value : null,
            ApiInsertMethod: form.querySelector('[name="ApiInsertMethod"]') ? form.querySelector('[name="ApiInsertMethod"]').value : null,
            ApiInsertPath: form.querySelector('[name="ApiInsertPath"]') ? form.querySelector('[name="ApiInsertPath"]').value : null,
            ApiUpdateMethod: form.querySelector('[name="ApiUpdateMethod"]') ? form.querySelector('[name="ApiUpdateMethod"]').value : null,
            ApiUpdatePath: form.querySelector('[name="ApiUpdatePath"]') ? form.querySelector('[name="ApiUpdatePath"]').value : null,
            ApiDeleteMethod: form.querySelector('[name="ApiDeleteMethod"]') ? form.querySelector('[name="ApiDeleteMethod"]').value : null,
            ApiDeletePath: form.querySelector('[name="ApiDeletePath"]') ? form.querySelector('[name="ApiDeletePath"]').value : null,
            AllowCreate: form.querySelector('[name="AllowCreate"]').checked,
            AllowEdit: form.querySelector('[name="AllowEdit"]').checked,
            AllowDelete: form.querySelector('[name="AllowDelete"]').checked,
            AllowBulkDelete: form.querySelector('[name="AllowBulkDelete"]').checked,
            Columns: [],
            Permissions: []
        };
        // Columns
        var colRows = container.querySelectorAll('.column-row');
        for (var i = 0; i < colRows.length; i++) {
            var r = colRows[i];
            var key = r.querySelector('.col-key').value.trim();
            var label = r.querySelector('.col-label').value.trim();
            var tMs = r.querySelector('.col-type-ms');
            var type = tMs._ms ? tMs._ms.getValue() : '';
            var qEl = r.querySelector('.col-query');
            var cWrap = r.querySelector('.col-query-wrap');
            var query = '';
            if ((type === 'select' || type === 'multiselect') && cWrap) {
                var sMs = cWrap.querySelector('.col-source-mode-ms');
                var sMode = (sMs && sMs._ms) ? sMs._ms.getValue() : 'sql';
                if (sMode === 'api') {
                    var mE = cWrap.querySelector('.col-api-method-val');
                    var pE = cWrap.querySelector('.col-api-path');
                    query = JSON.stringify({ mode: 'api', method: mE ? mE.value : 'GET', path: pE ? pE.value.trim() : '' });
                } else {
                    query = qEl ? qEl.value.trim() : '';
                }
            }
            if (key) {
                cfg.Columns.push({ Key: key, Label: label || key, Type: type, Pattern: query || null, Required: false, Sortable: true, Filterable: true });
            }
        }
        // Permissions
        var pRows = permContainer.querySelectorAll('.perm-row');
        for (var j = 0; j < pRows.length; j++) {
            var pr = pRows[j];
            var ptMs = pr.querySelector('.perm-type-ms');
            var pType = ptMs._ms ? ptMs._ms.getValue() : '';
            var pnMs = pr.querySelector('.perm-name-ms');
            var selNames = pnMs._ms ? pnMs._ms.getSelected() : [];
            if (pType && selNames.length > 0) {
                for (var n = 0; n < selNames.length; n++) {
                    cfg.Permissions.push({
                        Type: pType,
                        Name: selNames[n],
                        AllowCreate: pr.querySelector('.perm-create').checked,
                        AllowEdit: pr.querySelector('.perm-edit').checked,
                        AllowDelete: pr.querySelector('.perm-delete').checked,
                        AllowBulkDelete: pr.querySelector('.perm-bulk').checked
                    });
                }
            }
        }
        return cfg;
    }

    // ── Export ──
    document.getElementById('btnExport').addEventListener('click', function () {
        var cfg = gatherConfig();
        var json = JSON.stringify(cfg, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (cfg.Title || 'table-config').replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // ── Import ──
    document.getElementById('btnImport').addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var cfg = JSON.parse(ev.target.result);
            } catch (err) {
                alert('Invalid JSON file.');
                return;
            }
            // Title
            var titleEl = form.querySelector('[name="Title"]');
            if (titleEl) titleEl.value = cfg.Title || '';
            // Mode
            var mode = cfg.Mode === 'api' ? 'api' : 'sql';
            modeHidden.value = mode;
            if (modeMs && modeMs.setOptions) {
                modeMs.setOptions([{ value: 'sql', label: 'SQL' }, { value: 'api', label: 'API' }], [mode]);
            }
            sqlFields.style.display = mode === 'api' ? 'none' : '';
            apiFields.style.display = mode === 'api' ? '' : 'none';
            // SQL fields
            var fields = ['QuerySelect', 'QueryInsert', 'QueryUpdate', 'QueryDelete', 'QueryBulkDelete',
                          'ApiBaseUrl', 'ApiHeaders', 'ApiSelectPath', 'ApiInsertPath', 'ApiUpdatePath', 'ApiDeletePath'];
            for (var fi = 0; fi < fields.length; fi++) {
                var el = form.querySelector('[name="' + fields[fi] + '"]');
                if (el) { el.value = cfg[fields[fi]] || ''; }
            }
            // API method hiddens
            var methodFields = ['ApiSelectMethod', 'ApiInsertMethod', 'ApiUpdateMethod', 'ApiDeleteMethod'];
            for (var mi = 0; mi < methodFields.length; mi++) {
                var hid = form.querySelector('input[name="' + methodFields[mi] + '"]');
                if (hid) hid.value = cfg[methodFields[mi]] || '';
                var msEl = hid ? hid.previousElementSibling : null;
                if (msEl && msEl._ms) {
                    var opts = JSON.parse(msEl.getAttribute('data-options') || '[]');
                    msEl._ms.setOptions(opts, cfg[methodFields[mi]] ? [cfg[methodFields[mi]]] : []);
                }
            }
            // Allow flags
            form.querySelector('[name="AllowCreate"]').checked = !!cfg.AllowCreate;
            form.querySelector('[name="AllowEdit"]').checked = !!cfg.AllowEdit;
            form.querySelector('[name="AllowDelete"]').checked = !!cfg.AllowDelete;
            form.querySelector('[name="AllowBulkDelete"]').checked = !!cfg.AllowBulkDelete;
            // Columns — clear and rebuild
            container.innerHTML = '';
            if (cfg.Columns && cfg.Columns.length) {
                for (var ci = 0; ci < cfg.Columns.length; ci++) {
                    var c = cfg.Columns[ci];
                    container.appendChild(createColumnRow(c.Key || '', c.Label || '', c.Type || 'text', c.Pattern || ''));
                }
            }
            // Permissions — clear and rebuild
            permContainer.innerHTML = '';
            if (cfg.Permissions && cfg.Permissions.length) {
                for (var pi = 0; pi < cfg.Permissions.length; pi++) {
                    var p = cfg.Permissions[pi];
                    permContainer.appendChild(createPermRow(p.Type || '', p.Name ? [p.Name] : [], !!p.AllowCreate, !!p.AllowEdit, !!p.AllowDelete, !!p.AllowBulkDelete));
                }
            }
            // Re-init icons and auto-resize
            if (window.lucide) lucide.createIcons();
            initAutoResize();
        };
        reader.readAsText(file);
        e.target.value = '';
    });

}(jQuery, window.Sys));
