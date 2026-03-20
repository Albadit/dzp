(function ($, Sys) {
    var container = document.getElementById('columnsContainer');
    var modeSelect = document.getElementById('modeSelect');
    var sqlFields = document.getElementById('sqlFields');
    var apiFields = document.getElementById('apiFields');

    modeSelect.addEventListener('change', function () {
        if (this.value === 'api') {
            sqlFields.style.display = 'none';
            apiFields.style.display = '';
        } else {
            sqlFields.style.display = '';
            apiFields.style.display = 'none';
        }
    });

    function createColumnRow(key, label, type) {
        var row = document.createElement('div');
        row.className = 'column-row';
        row.innerHTML =
            '<input type="text" class="col-key" value="' + escHtml(key || '') + '" placeholder="Column Key" />' +
            '<input type="text" class="col-label" value="' + escHtml(label || '') + '" placeholder="Display Label" />' +
            '<select class="col-type">' +
            '<option value="text"' + (type === 'text' ? ' selected' : '') + '>Text</option>' +
            '<option value="readonly"' + (type === 'readonly' ? ' selected' : '') + '>Read Only</option>' +
            '<option value="hidden"' + (type === 'hidden' ? ' selected' : '') + '>Hidden</option>' +
            '<option value="number"' + (type === 'number' ? ' selected' : '') + '>Number</option>' +
            '<option value="email"' + (type === 'email' ? ' selected' : '') + '>Email</option>' +
            '<option value="url"' + (type === 'url' ? ' selected' : '') + '>URL</option>' +
            '</select>' +
            '<button type="button" class="remove-col dnnSecondaryAction">&#10005;</button>';
        return row;
    }

    function escHtml(s) {
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(s));
        return d.innerHTML;
    }

    document.getElementById('addColumn').addEventListener('click', function () {
        container.appendChild(createColumnRow('', '', 'text'));
    });

    container.addEventListener('click', function (e) {
        if (e.target.classList.contains('remove-col')) {
            e.target.closest('.column-row').remove();
        }
    });

    // Permissions
    var permContainer = document.getElementById('permissionsContainer');

    // Build option lists from server-provided data
    var dnnData = window.__dnnPermData || { roles: [], users: [] };
    var roleOptions = '<option value="">-- Select --</option>' +
        dnnData.roles.map(function (r) { return '<option value="' + escHtml(r) + '">' + escHtml(r) + '</option>'; }).join('');
    var userOptions = '<option value="">-- Select --</option>' +
        dnnData.users.map(function (u) { return '<option value="' + escHtml(u) + '">' + escHtml(u) + '</option>'; }).join('');

    function populateNameSelect(nameSelect, type, selectedName) {
        if (type === 'role') {
            nameSelect.innerHTML = roleOptions;
        } else if (type === 'user') {
            nameSelect.innerHTML = userOptions;
        } else {
            nameSelect.innerHTML = '<option value="">-- Select --</option>';
        }
        if (selectedName) {
            nameSelect.value = selectedName;
        }
    }

    function createPermRow(type, name, create, edit, del, bulk) {
        var row = document.createElement('div');
        row.className = 'perm-row';
        row.innerHTML =
            '<select class="perm-type">' +
            '<option value="">-- Type --</option>' +
            '<option value="role"' + (type === 'role' ? ' selected' : '') + '>Role</option>' +
            '<option value="user"' + (type === 'user' ? ' selected' : '') + '>User</option>' +
            '</select>' +
            '<select class="perm-name"><option value="">-- Select --</option></select>' +
            '<label><input type="checkbox" class="perm-create"' + (create ? ' checked' : '') + ' /> Create</label>' +
            '<label><input type="checkbox" class="perm-edit"' + (edit ? ' checked' : '') + ' /> Edit</label>' +
            '<label><input type="checkbox" class="perm-delete"' + (del ? ' checked' : '') + ' /> Delete</label>' +
            '<label><input type="checkbox" class="perm-bulk"' + (bulk ? ' checked' : '') + ' /> Bulk Delete</label>' +
            '<button type="button" class="remove-perm dnnSecondaryAction">&#10005;</button>';
        if (type) {
            populateNameSelect(row.querySelector('.perm-name'), type, name);
        }
        return row;
    }

    // When type changes, repopulate the name dropdown
    permContainer.addEventListener('change', function (e) {
        if (e.target.classList.contains('perm-type')) {
            var row = e.target.closest('.perm-row');
            populateNameSelect(row.querySelector('.perm-name'), e.target.value, '');
        }
    });

    // Wire up existing server-rendered rows
    var existingTypeSelects = permContainer.querySelectorAll('.perm-type');
    for (var k = 0; k < existingTypeSelects.length; k++) {
        var row = existingTypeSelects[k].closest('.perm-row');
        var nameSelect = row.querySelector('.perm-name');
        var currentName = nameSelect.value;
        populateNameSelect(nameSelect, existingTypeSelects[k].value, currentName);
    }

    document.getElementById('addPermission').addEventListener('click', function () {
        permContainer.appendChild(createPermRow('', '', false, false, false, false));
    });

    permContainer.addEventListener('click', function (e) {
        if (e.target.classList.contains('remove-perm')) {
            e.target.closest('.perm-row').remove();
        }
    });

    document.getElementById('btnSave').addEventListener('click', function () {
        // Columns
        var rows = container.querySelectorAll('.column-row');
        var columns = [];
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var key = row.querySelector('.col-key').value.trim();
            var label = row.querySelector('.col-label').value.trim();
            var type = row.querySelector('.col-type').value;
            if (key) {
                columns.push({ Key: key, Label: label || key, Type: type, Required: false, Sortable: true, Filterable: true });
            }
        }
        document.getElementById('columnsJson').value = columns.length > 0 ? JSON.stringify(columns) : '';

        // Permissions
        var permRows = permContainer.querySelectorAll('.perm-row');
        var permissions = [];
        for (var j = 0; j < permRows.length; j++) {
            var pr = permRows[j];
            var pType = pr.querySelector('.perm-type').value;
            var pName = pr.querySelector('.perm-name').value;
            if (pType && pName) {
                permissions.push({
                    Type: pType,
                    Name: pName,
                    AllowCreate: pr.querySelector('.perm-create').checked,
                    AllowEdit: pr.querySelector('.perm-edit').checked,
                    AllowDelete: pr.querySelector('.perm-delete').checked,
                    AllowBulkDelete: pr.querySelector('.perm-bulk').checked
                });
            }
        }
        document.getElementById('permissionsJson').value = permissions.length > 0 ? JSON.stringify(permissions) : '';
    });

    function initEditSettings() {
        $('#dnnEditBasicSettings').dnnPanels();
        $('#dnnEditBasicSettings .dnnFormExpandContent a').dnnExpandAll({
            expandText: 'Expand All',
            collapseText: 'Collapse All',
            targetArea: '#dnnEditBasicSettings'
        });
    }

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
        initEditSettings();
        Sys.WebForms.PageRequestManager.getInstance().add_endRequest(function () {
            initEditSettings();
        });
    });

}(jQuery, window.Sys));
