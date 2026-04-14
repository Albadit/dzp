(function () {
    var container = document.getElementById('columnsContainer');
    var modeSelectEl = document.getElementById('modeSelect');
    var modeHidden = document.getElementById('modeValue');
    var sqlFields = document.getElementById('sqlFields');
    var apiFields = document.getElementById('apiFields');
    var permContainer = document.getElementById('permissionsContainer');
    var form = document.getElementById('editForm');

    // ── Helpers ──

    function escHtml(s) {
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(s));
        return d.innerHTML;
    }

    function autoResize(ta) {
        if (!ta.offsetParent) return;
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
    }

    function bindAutoResize(ta) {
        autoResize(ta);
        ta.addEventListener('input', function () { autoResize(this); });
    }

    function initAllAutoResize() {
        var tas = document.querySelectorAll('.edit-code-area');
        for (var i = 0; i < tas.length; i++) bindAutoResize(tas[i]);
    }

    function val(name) { return (form.querySelector('[name="' + name + '"]') || {}).value || ''; }
    function chk(name) { return !!(form.querySelector('[name="' + name + '"]') || {}).checked; }

    // ── Column type options ──

    var colTypeOpts = (window.__dnnColTypes || []).map(function (t) {
        return { value: t.toLowerCase(), label: t };
    });
    if (!colTypeOpts.length) {
        colTypeOpts = [
            { value: 'text', label: 'Text' }, { value: 'readonly', label: 'Read Only' },
            { value: 'hidden', label: 'Hidden' }, { value: 'number', label: 'Number' },
            { value: 'email', label: 'Email' }, { value: 'url', label: 'URL' },
            { value: 'select', label: 'Select' }, { value: 'multiselect', label: 'Multi Select' }
        ];
    }

    var modeOpts = [{ value: 'sql', label: 'SQL' }, { value: 'api', label: 'API' }];
    var methodOpts = [{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }];

    // ── Mode select ──

    var modeMs = MultiSelect.create(modeSelectEl, {
        placeholder: '-- Source --',
        options: modeOpts,
        selected: [modeSelectEl.getAttribute('data-selected') || 'sql'],
        single: true,
        onChange: function (sel) {
            var isApi = (sel.length ? sel[0] : 'sql') === 'api';
            modeHidden.value = isApi ? 'api' : 'sql';
            sqlFields.style.display = isApi ? 'none' : '';
            apiFields.style.display = isApi ? '' : 'none';
            var tas = (isApi ? apiFields : sqlFields).querySelectorAll('.edit-code-area');
            for (var i = 0; i < tas.length; i++) autoResize(tas[i]);
        }
    });

    // Init API method selects
    var methodSelects = document.querySelectorAll('.api-method-ms');
    for (var mi = 0; mi < methodSelects.length; mi++) {
        (function (el) {
            var hidden = el.nextElementSibling;
            MultiSelect.create(el, {
                placeholder: '-- Method --',
                options: JSON.parse(el.getAttribute('data-options') || '[]'),
                selected: el.getAttribute('data-selected') ? [el.getAttribute('data-selected')] : [],
                single: true,
                onChange: function (sel) { hidden.value = sel.length ? sel[0] : ''; }
            });
        })(methodSelects[mi]);
    }

    // ── Column rows ──

    function initColTypeSelect(el, selectedType) {
        return MultiSelect.create(el, {
            placeholder: '-- Type --',
            options: colTypeOpts,
            selected: selectedType ? [selectedType] : [],
            single: true,
            onChange: function () {
                var row = el.closest('.column-row');
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
            options: modeOpts,
            selected: [modeEl.getAttribute('data-selected') || 'sql'],
            single: true,
            onChange: function (sel) {
                var isApi = (sel.length ? sel[0] : 'sql') === 'api';
                sqlDiv.style.display = isApi ? 'none' : '';
                apiDiv.style.display = isApi ? '' : 'none';
                if (!isApi) { var ta = sqlDiv.querySelector('textarea'); if (ta) autoResize(ta); }
            }
        });
        if (methodEl && !methodEl._ms) {
            methodEl._ms = MultiSelect.create(methodEl, {
                placeholder: '-- Method --',
                options: methodOpts,
                selected: [methodEl.getAttribute('data-selected') || 'GET'],
                single: true,
                onChange: function (sel) { methodHidden.value = sel.length ? sel[0] : ''; }
            });
        }
    }

    function buildQueryWrapHtml(sourceMode, sqlQuery, apiMethod, apiPath) {
        return '<div class="col-query-wrap">' +
            '<div class="col-source-mode-ms" data-selected="' + sourceMode + '"></div>' +
            '<div class="col-source-sql"' + (sourceMode === 'api' ? ' style="display:none;"' : '') + '>' +
                '<textarea class="col-query edit-code-area" rows="1" placeholder="SELECT value, label FROM ...">' + escHtml(sqlQuery) + '</textarea>' +
            '</div>' +
            '<div class="col-source-api"' + (sourceMode !== 'api' ? ' style="display:none;"' : '') + '>' +
                '<div class="col-api-method-ms" data-selected="' + escHtml(apiMethod) + '" data-options=\'' + JSON.stringify(methodOpts) + '\'></div>' +
                '<input type="hidden" class="col-api-method-val" value="' + escHtml(apiMethod) + '" />' +
                '<input type="text" class="col-api-path" value="' + escHtml(apiPath) + '" placeholder="/api/items" />' +
            '</div>' +
        '</div>';
    }

    function initQueryWrap(wrap) {
        initColSourceMode(wrap);
        var ta = wrap.querySelector('.col-query');
        if (ta) bindAutoResize(ta);
    }

    function toggleQueryField(row) {
        var typeMs = row.querySelector('.col-type-ms');
        var type = typeMs._ms ? typeMs._ms.getValue() : '';
        var qField = row.querySelector('.col-query-wrap');
        if (type === 'select' || type === 'multiselect') {
            if (!qField) {
                var tmp = document.createElement('div');
                tmp.innerHTML = buildQueryWrapHtml('sql', '', 'GET', '');
                qField = tmp.firstChild;
                row.querySelector('.remove-col').before(qField);
                initQueryWrap(qField);
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
                    sourceMode = 'api'; apiMethod = parsed.method || 'GET';
                    apiPath = parsed.path || ''; sqlQuery = '';
                }
            } catch (e) { }
        }
        var row = document.createElement('div');
        row.className = 'column-row';
        row.setAttribute('draggable', 'true');
        row.innerHTML =
            '<span class="drag-handle" title="Drag to reorder"><i data-lucide="grip-vertical"></i></span>' +
            '<input type="text" class="col-key" value="' + escHtml(key || '') + '" placeholder="Column Key" />' +
            '<input type="text" class="col-label" value="' + escHtml(label || '') + '" placeholder="Display Label" />' +
            '<div class="col-type-ms"></div>' +
            (isSelect ? buildQueryWrapHtml(sourceMode, sqlQuery, apiMethod, apiPath) : '') +
            '<button type="button" class="remove-col"><i data-lucide="circle-x"></i></button>';
        var typeMs = row.querySelector('.col-type-ms');
        typeMs._ms = initColTypeSelect(typeMs, type || '');
        var wrap = row.querySelector('.col-query-wrap');
        if (wrap) initQueryWrap(wrap);
        return row;
    }

    // Init existing column rows
    var existingColRows = container.querySelectorAll('.column-row');
    for (var ci = 0; ci < existingColRows.length; ci++) {
        var colRow = existingColRows[ci];
        var colTypeMs = colRow.querySelector('.col-type-ms');
        colTypeMs._ms = initColTypeSelect(colTypeMs, colTypeMs.getAttribute('data-selected') || '');
        var existingWrap = colRow.querySelector('.col-query-wrap');
        if (existingWrap) initColSourceMode(existingWrap);
        toggleQueryField(colRow);
    }

    document.getElementById('addColumn').addEventListener('click', function () {
        container.appendChild(createColumnRow('', '', 'text', ''));
        if (window.lucide) lucide.createIcons();
    });

    container.addEventListener('click', function (e) {
        var btn = e.target.closest('.remove-col');
        if (btn) btn.closest('.column-row').remove();
    });

    // ── Drag-and-drop column reorder ──

    var dragRow = null;

    container.addEventListener('dragstart', function (e) {
        var row = e.target.closest('.column-row');
        if (!row) return;
        dragRow = row;
        row.classList.add('column-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    });

    container.addEventListener('dragend', function (e) {
        if (dragRow) {
            dragRow.classList.remove('column-dragging');
            dragRow = null;
        }
        var rows = container.querySelectorAll('.column-row');
        for (var i = 0; i < rows.length; i++) {
            rows[i].classList.remove('column-drag-over');
        }
    });

    container.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var target = e.target.closest('.column-row');
        if (!target || target === dragRow) return;
        var rows = container.querySelectorAll('.column-row');
        for (var i = 0; i < rows.length; i++) {
            rows[i].classList.remove('column-drag-over');
        }
        target.classList.add('column-drag-over');
    });

    container.addEventListener('drop', function (e) {
        e.preventDefault();
        var target = e.target.closest('.column-row');
        if (!target || !dragRow || target === dragRow) return;
        var rows = Array.prototype.slice.call(container.querySelectorAll('.column-row'));
        var dragIdx = rows.indexOf(dragRow);
        var targetIdx = rows.indexOf(target);
        if (dragIdx < targetIdx) {
            target.parentNode.insertBefore(dragRow, target.nextSibling);
        } else {
            target.parentNode.insertBefore(dragRow, target);
        }
        target.classList.remove('column-drag-over');
    });

    // ── Detect columns ──

    var detectBtn = document.getElementById('detectColumns');
    var detectStatus = document.getElementById('detectStatus');
    if (detectBtn) {
        detectBtn.addEventListener('click', function () {
            var mode = modeHidden.value || 'sql';
            var fd = new FormData();
            fd.append('mode', mode);
            if (mode === 'sql') {
                var q = val('QuerySelect').trim();
                if (!q) { detectStatus.textContent = 'Enter a SELECT query first.'; return; }
                fd.append('query', q);
            } else {
                var base = val('ApiBaseUrl').trim();
                if (!base) { detectStatus.textContent = 'Enter an API Base URL first.'; return; }
                fd.append('apiBaseUrl', base);
                fd.append('apiSelectPath', val('ApiSelectPath').trim());
                fd.append('apiSelectMethod', val('ApiSelectMethod') || 'GET');
                fd.append('apiHeaders', val('ApiHeaders'));
            }
            detectBtn.disabled = true;
            detectStatus.textContent = 'Detecting...';
            fetch('/DesktopModules/MVC/Dnn.Modules.TableDZP/DetectColumns.ashx', { method: 'POST', body: fd })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    detectBtn.disabled = false;
                    if (!data.success) { detectStatus.textContent = 'Error: ' + (data.error || 'Unknown error'); return; }
                    if (!data.columns || !data.columns.length) { detectStatus.textContent = 'No columns found.'; return; }
                    var existing = {};
                    var rows = container.querySelectorAll('.column-row');
                    for (var i = 0; i < rows.length; i++) {
                        var k = rows[i].querySelector('.col-key').value.trim().toLowerCase();
                        if (k) existing[k] = true;
                    }
                    var added = 0;
                    for (var j = 0; j < data.columns.length; j++) {
                        if (!existing[data.columns[j].Key.toLowerCase()]) {
                            var c = data.columns[j];
                            container.appendChild(createColumnRow(c.Key, c.Label, c.Type, ''));
                            added++;
                        }
                    }
                    if (window.lucide) lucide.createIcons();
                    detectStatus.textContent = added ? 'Added ' + added + ' column(s).' : 'All columns already exist.';
                })
                .catch(function (err) {
                    detectBtn.disabled = false;
                    detectStatus.textContent = 'Error: ' + err.message;
                });
        });
    }

    // ── Permissions ──

    var dnnData = window.__dnnPermData || { roles: [], users: [] };
    var roleOpts = dnnData.roles.map(function (r) { return { value: r, label: r }; });
    var userOpts = dnnData.users.map(function (u) { return { value: u, label: u }; });
    var typeOpts = [{ value: 'role', label: 'Role' }, { value: 'user', label: 'User' }];

    function getOptsForType(type) {
        return type === 'role' ? roleOpts : type === 'user' ? userOpts : [];
    }

    function initNameSelect(el, type, selected) {
        return MultiSelect.create(el, {
            placeholder: type ? 'Select ' + type + 's\u2026' : 'Select\u2026',
            options: getOptsForType(type),
            selected: selected || []
        });
    }

    function initTypeSelect(el, selected, nameEl) {
        return MultiSelect.create(el, {
            placeholder: '-- Type --',
            options: typeOpts,
            selected: selected ? [selected] : [],
            single: true,
            onChange: function (sel) {
                if (nameEl._ms) nameEl._ms.destroy();
                nameEl._ms = initNameSelect(nameEl, sel.length ? sel[0] : '', []);
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
        var nameEl = row.querySelector('.perm-name-ms');
        var typeEl = row.querySelector('.perm-type-ms');
        nameEl._ms = initNameSelect(nameEl, type, names || []);
        typeEl._ms = initTypeSelect(typeEl, type, nameEl);
        return row;
    }

    // Init existing permission rows
    var existingPermRows = permContainer.querySelectorAll('.perm-row');
    for (var k = 0; k < existingPermRows.length; k++) {
        var pRow = existingPermRows[k];
        var nameEl = pRow.querySelector('.perm-name-ms');
        var typeEl = pRow.querySelector('.perm-type-ms');
        var pType = typeEl.getAttribute('data-selected') || '';
        var selNames = [];
        try { selNames = JSON.parse(nameEl.getAttribute('data-selected') || '[]'); } catch (e) { }
        nameEl._ms = initNameSelect(nameEl, pType, selNames);
        typeEl._ms = initTypeSelect(typeEl, pType, nameEl);
    }

    document.getElementById('addPermission').addEventListener('click', function () {
        permContainer.appendChild(createPermRow('', [], false, false, false, false));
        if (window.lucide) lucide.createIcons();
    });

    permContainer.addEventListener('click', function (e) {
        var btn = e.target.closest('.remove-perm');
        if (btn) btn.closest('.perm-row').remove();
    });

    // ── Gather config (shared by Save, Export) ──

    function getColumnQuery(row, type) {
        var wrap = row.querySelector('.col-query-wrap');
        if (!(type === 'select' || type === 'multiselect') || !wrap) return '';
        var srcMs = wrap.querySelector('.col-source-mode-ms');
        if (srcMs && srcMs._ms && srcMs._ms.getValue() === 'api') {
            return JSON.stringify({
                mode: 'api',
                method: (wrap.querySelector('.col-api-method-val') || {}).value || 'GET',
                path: ((wrap.querySelector('.col-api-path') || {}).value || '').trim()
            });
        }
        var qEl = wrap.querySelector('.col-query');
        return qEl ? qEl.value.trim() : '';
    }

    function gatherConfig() {
        var cfg = {
            Title: val('Title'), Mode: modeHidden.value || 'sql',
            QuerySelect: val('QuerySelect'), QueryInsert: val('QueryInsert'),
            QueryUpdate: val('QueryUpdate'), QueryDelete: val('QueryDelete'),
            QueryBulkDelete: val('QueryBulkDelete'),
            ApiBaseUrl: val('ApiBaseUrl'), ApiHeaders: val('ApiHeaders'),
            ApiSelectMethod: val('ApiSelectMethod'), ApiSelectPath: val('ApiSelectPath'),
            ApiInsertMethod: val('ApiInsertMethod'), ApiInsertPath: val('ApiInsertPath'),
            ApiUpdateMethod: val('ApiUpdateMethod'), ApiUpdatePath: val('ApiUpdatePath'),
            ApiDeleteMethod: val('ApiDeleteMethod'), ApiDeletePath: val('ApiDeletePath'),
            AllowCreate: chk('AllowCreate'), AllowEdit: chk('AllowEdit'),
            AllowDelete: chk('AllowDelete'), AllowBulkDelete: chk('AllowBulkDelete'),
            Columns: [], Permissions: []
        };
        var colRows = container.querySelectorAll('.column-row');
        for (var i = 0; i < colRows.length; i++) {
            var r = colRows[i], key = r.querySelector('.col-key').value.trim();
            if (!key) continue;
            var tMs = r.querySelector('.col-type-ms');
            var type = tMs._ms ? tMs._ms.getValue() : '';
            cfg.Columns.push({
                Key: key, Label: r.querySelector('.col-label').value.trim() || key,
                Type: type, Pattern: getColumnQuery(r, type) || null,
                Required: false, Sortable: true, Filterable: true,
                SortOrder: i
            });
        }
        var pRows = permContainer.querySelectorAll('.perm-row');
        for (var j = 0; j < pRows.length; j++) {
            var pr = pRows[j];
            var ptMs = pr.querySelector('.perm-type-ms');
            var pType = ptMs._ms ? ptMs._ms.getValue() : '';
            var pnMs = pr.querySelector('.perm-name-ms');
            var names = pnMs._ms ? pnMs._ms.getSelected() : [];
            if (!pType || !names.length) continue;
            for (var n = 0; n < names.length; n++) {
                cfg.Permissions.push({
                    Type: pType, Name: names[n],
                    AllowCreate: pr.querySelector('.perm-create').checked,
                    AllowEdit: pr.querySelector('.perm-edit').checked,
                    AllowDelete: pr.querySelector('.perm-delete').checked,
                    AllowBulkDelete: pr.querySelector('.perm-bulk').checked
                });
            }
        }
        return cfg;
    }

    // ── Save ──

    document.getElementById('btnSave').addEventListener('click', function () {
        var cfg = gatherConfig();
        document.getElementById('columnsJson').value = cfg.Columns.length ? JSON.stringify(cfg.Columns) : '';
        document.getElementById('permissionsJson').value = cfg.Permissions.length ? JSON.stringify(cfg.Permissions) : '';
    });

    // ── Export ──

    document.getElementById('btnExport').addEventListener('click', function () {
        var cfg = gatherConfig();
        var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
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
            try { var cfg = JSON.parse(ev.target.result); }
            catch (err) { alert('Invalid JSON file.'); return; }

            form.querySelector('[name="Title"]').value = cfg.Title || '';
            var mode = cfg.Mode === 'api' ? 'api' : 'sql';
            modeHidden.value = mode;
            if (modeMs.setOptions) modeMs.setOptions(modeOpts, [mode]);
            sqlFields.style.display = mode === 'api' ? 'none' : '';
            apiFields.style.display = mode === 'api' ? '' : 'none';

            var fields = ['QuerySelect', 'QueryInsert', 'QueryUpdate', 'QueryDelete', 'QueryBulkDelete',
                          'ApiBaseUrl', 'ApiHeaders', 'ApiSelectPath', 'ApiInsertPath', 'ApiUpdatePath', 'ApiDeletePath'];
            for (var fi = 0; fi < fields.length; fi++) {
                var el = form.querySelector('[name="' + fields[fi] + '"]');
                if (el) el.value = cfg[fields[fi]] || '';
            }
            var mf = ['ApiSelectMethod', 'ApiInsertMethod', 'ApiUpdateMethod', 'ApiDeleteMethod'];
            for (var mi = 0; mi < mf.length; mi++) {
                var hid = form.querySelector('input[name="' + mf[mi] + '"]');
                if (hid) hid.value = cfg[mf[mi]] || '';
                var msEl = hid ? hid.previousElementSibling : null;
                if (msEl && msEl._ms) {
                    msEl._ms.setOptions(JSON.parse(msEl.getAttribute('data-options') || '[]'), cfg[mf[mi]] ? [cfg[mf[mi]]] : []);
                }
            }
            form.querySelector('[name="AllowCreate"]').checked = !!cfg.AllowCreate;
            form.querySelector('[name="AllowEdit"]').checked = !!cfg.AllowEdit;
            form.querySelector('[name="AllowDelete"]').checked = !!cfg.AllowDelete;
            form.querySelector('[name="AllowBulkDelete"]').checked = !!cfg.AllowBulkDelete;

            container.innerHTML = '';
            if (cfg.Columns) {
                for (var ci = 0; ci < cfg.Columns.length; ci++) {
                    var c = cfg.Columns[ci];
                    container.appendChild(createColumnRow(c.Key || '', c.Label || '', c.Type || 'text', c.Pattern || ''));
                }
            }
            permContainer.innerHTML = '';
            if (cfg.Permissions) {
                for (var pi = 0; pi < cfg.Permissions.length; pi++) {
                    var p = cfg.Permissions[pi];
                    permContainer.appendChild(createPermRow(p.Type || '', p.Name ? [p.Name] : [], !!p.AllowCreate, !!p.AllowEdit, !!p.AllowDelete, !!p.AllowBulkDelete));
                }
            }
            if (window.lucide) lucide.createIcons();
            initAllAutoResize();
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // ── Accordion ──

    var heads = form.querySelectorAll('h2.at-section-head a');
    var toggleLink = form.querySelector('.at-collapse-toggle a');

    function updateCollapseToggle() {
        toggleLink.textContent = form.querySelectorAll('h2.at-section-head a.at-expanded').length === heads.length ? 'Collapse All' : 'Expand All';
    }

    for (var hi = 0; hi < heads.length; hi++) {
        heads[hi].addEventListener('click', function (e) {
            e.preventDefault();
            this.classList.toggle('at-expanded');
            this.parentElement.nextElementSibling.style.display = this.classList.contains('at-expanded') ? '' : 'none';
            updateCollapseToggle();
        });
    }

    toggleLink.addEventListener('click', function (e) {
        e.preventDefault();
        var expand = form.querySelectorAll('h2.at-section-head a.at-expanded').length < heads.length;
        for (var i = 0; i < heads.length; i++) {
            heads[i].classList.toggle('at-expanded', expand);
            heads[i].parentElement.nextElementSibling.style.display = expand ? '' : 'none';
        }
        updateCollapseToggle();
    });

    updateCollapseToggle();
    initAllAutoResize();
})();
