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

    function toggleQueryField(row) {
        var typeMs = row.querySelector('.col-type-ms');
        var type = typeMs._ms ? typeMs._ms.getValue() : '';
        var qField = row.querySelector('.col-query-wrap');
        if (type === 'select' || type === 'multiselect') {
            if (!qField) {
                qField = document.createElement('div');
                qField.className = 'col-query-wrap';
                qField.innerHTML = '<textarea class="col-query edit-code-area" rows="1" placeholder="SELECT value, label FROM ..."></textarea>';
                row.querySelector('.remove-col').before(qField);
                autoResize(qField.querySelector('textarea'));
                qField.querySelector('textarea').addEventListener('input', function () { autoResize(this); });
            }
            qField.style.display = '';
        } else if (qField) {
            qField.style.display = 'none';
        }
    }

    function createColumnRow(key, label, type, query) {
        var row = document.createElement('div');
        row.className = 'column-row';
        row.innerHTML =
            '<input type="text" class="col-key" value="' + escHtml(key || '') + '" placeholder="Column Key" />' +
            '<input type="text" class="col-label" value="' + escHtml(label || '') + '" placeholder="Display Label" />' +
            '<div class="col-type-ms"></div>' +
            (type === 'select' || type === 'multiselect' ? '<div class="col-query-wrap"><textarea class="col-query edit-code-area" rows="1" placeholder="SELECT value, label FROM ...">' + escHtml(query || '') + '</textarea></div>' : '') +
            '<button type="button" class="remove-col"><i data-lucide="circle-x"></i></button>';
        var typeMs = row.querySelector('.col-type-ms');
        typeMs._ms = initColTypeSelect(typeMs, type || '');
        var ta = row.querySelector('.col-query');
        if (ta) { autoResize(ta); ta.addEventListener('input', function () { autoResize(this); }); }
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
            var query = ((type === 'select' || type === 'multiselect') && queryEl) ? queryEl.value.trim() : '';
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

    $(function () {
        $('#cancelEdit').click(function (e) {
            e.preventDefault();
            if (typeof dnnModal !== 'undefined' && dnnModal.closePopUp) {
                dnnModal.closePopUp(false);
            } else {
                window.history.back();
            }
            return false;
        });
    });

}(jQuery, window.Sys));
