import { proxyCustomElement, HTMLElement, createEvent, h, Host } from '@stencil/core/internal/client';
import { d as defineCustomElement$6 } from './dnn-button2.js';
import { d as defineCustomElement$5 } from './dnn-checkbox2.js';
import { d as defineCustomElement$4 } from './dnn-collapsible2.js';
import { d as defineCustomElement$3 } from './dnn-modal2.js';
import { d as defineCustomElement$2 } from './dnn-searchbox2.js';

const dnnPermissionsGridCss = ":host{display:block}.add-role-row{display:flex;gap:1em;align-items:center;flex-wrap:wrap}.add-role-row label{margin-right:0.5em}.search-user{display:flex;gap:1em;margin-top:1em}.search-user .search-control{position:relative}.search-user .search-control dnn-collapsible{position:absolute;left:0;top:calc(100% - 2px);width:100%;box-shadow:0px 4px 4px}.search-user .search-control dnn-collapsible .dropdown{background-color:white;border:1px solid lightgray;display:flex;flex-direction:column}.search-user .search-control dnn-collapsible .dropdown button{background-color:transparent;border:none;border-bottom:1px solid lightgray;padding:0.25em;margin:0;text-align:left}table{border:1px solid lightgray;border-collapse:collapse;margin-top:1em}table thead{text-align:center}table thead tr{border-bottom:1px solid lightgray}table thead th{background-color:lightgray;padding:0.25em 0.5em}table thead th:first-child{border-right:1px solid lightgray}table tbody tr{border-bottom:1px dotted lightgray}table tbody tr th{text-align:left;border-right:1px solid lightgray;padding:0 0.5em}table tbody tr td{text-align:center}table tbody tr td label .hidden{display:none}table tbody tr td button{background-color:transparent;border:0;padding:0;margin:0;margin-right:1em}";

const DnnPermissionsGrid$1 = /*@__PURE__*/ proxyCustomElement(class DnnPermissionsGrid extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.userSearchQueryChanged = createEvent(this, "userSearchQueryChanged", 7);
        this.permissionsChanged = createEvent(this, "permissionsChanged", 7);
        /** The list of users to show under the search users field when a search is performed. */
        this.foundUsers = [];
        this.selectedRoleGroupId = -1;
        this.userQuery = "";
        this.focused = false;
        this.defaultResx = {
            Add: "Add",
            AllRoles: "All Roles",
            FilterByGroup: "Filter By Group",
            GlobalRoles: "Global Roles",
            Role: "Role",
            RolePermissions: "Role Permissions",
            SelectRole: "Select Role",
            User: "User",
            UserPermissions: "User Permissions",
        };
    }
    handleFoundUsersChanged(newValue) {
        if ((newValue === null || newValue === void 0 ? void 0 : newValue.length) > 0) {
            setTimeout(() => {
                this.userCollapsible.expanded = true;
            }, 100);
        }
    }
    resxChanged() {
        this.mergeResx();
    }
    componentWillLoad() {
        document.addEventListener("click", this.dismissUserResults.bind(this));
        this.mergeResx();
    }
    disconnectedCallback() {
        document.removeEventListener("click", this.disconnectedCallback.bind(this));
    }
    mergeResx() {
        this.localResx = Object.assign(Object.assign({}, this.defaultResx), this.resx);
    }
    dismissUserResults(e) {
        const dropdownRect = this.roleDropDown.getBoundingClientRect();
        if (e.pageX > dropdownRect.right ||
            e.pageX < dropdownRect.left ||
            e.pageY > dropdownRect.bottom ||
            e.pageY < dropdownRect.top) {
            this.userCollapsible.expanded = false;
        }
    }
    handleRoleGroupChanged(dropdown) {
        const index = dropdown.selectedIndex;
        const value = Number.parseInt(dropdown.options[index].value);
        this.selectedRoleGroupId = value;
    }
    addRole() {
        const roleId = Number.parseInt(this.roleDropDown.options[this.roleDropDown.selectedIndex].value);
        const role = this.roles.filter(r => r.RoleId == roleId)[0];
        this.permissions = Object.assign(Object.assign({}, this.permissions), { rolePermissions: [
                ...this.permissions.rolePermissions,
                {
                    default: false,
                    locked: false,
                    permissions: [],
                    roleId: role.RoleId,
                    roleName: role.RoleName,
                }
            ] });
        this.permissionsChanged.emit(this.permissions);
    }
    addUser() {
        if (this.pickedUser != undefined) {
            this.permissions = Object.assign(Object.assign({}, this.permissions), { userPermissions: [
                    ...this.permissions.userPermissions,
                    {
                        displayName: this.pickedUser.displayName,
                        permissions: [],
                        userId: this.pickedUser.userId,
                    },
                ] });
            this.pickedUser = undefined;
            this.userQuery = "";
            this.permissionsChanged.emit(this.permissions);
        }
    }
    getRoles() {
        const filteredRoles = this.roles.filter(role => !this.permissions.rolePermissions.some(rp => rp.roleId == role.RoleId));
        if (this.selectedRoleGroupId == -2) {
            // All Roles
            return filteredRoles;
        }
        if (this.selectedRoleGroupId == -1) {
            // Global Roles
            return filteredRoles.filter(role => role.IsSystemRole);
        }
        return filteredRoles.filter(role => role.RoleGroupId == this.selectedRoleGroupId);
    }
    renderRoleCheckBox(rolePermission, permissionDefinition) {
        const item = rolePermission.permissions.filter(permission => permission.permissionId == permissionDefinition.permissionId)[0];
        if (rolePermission.locked) {
            return (h("svg", { xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("g", { fill: "none" }, h("path", { d: "M0 0h24v24H0V0z" }), h("path", { d: "M0 0h24v24H0V0z", opacity: ".87" })), h("path", { d: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" })));
        }
        const checked = item == undefined ? "intermediate" : item.allowAccess ? "checked" : "unchecked";
        return (h("label", null, h("span", { class: "hidden" }, permissionDefinition.permissionName), h("dnn-checkbox", { useIntermediate: true, nextStateHandler: state => this.handleNextState(state), checked: checked, onCheckedchange: e => this.handleRoleChanged(e.detail, rolePermission, permissionDefinition) }, h("div", { slot: "intermediateicon" }, h("svg", { xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { d: "M0 0h24v24H0V0z", fill: "none" }), h("path", { d: "M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" }))), h("div", { slot: "uncheckedicon" }, h("svg", { xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { d: "M0 0h24v24H0V0z", fill: "none" }), h("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" }))))));
    }
    renderUserCheckBox(userPermission, permissionDefinition) {
        const item = userPermission.permissions.filter(permission => permission.permissionId == permissionDefinition.permissionId)[0];
        const checked = item == undefined ? "intermediate" : item.allowAccess ? "checked" : "unchecked";
        return (h("label", null, h("span", { class: "hidden" }, permissionDefinition.permissionName), h("dnn-checkbox", { useIntermediate: true, nextStateHandler: state => this.handleNextState(state), checked: checked, onCheckedchange: e => this.handleUserChanged(e.detail, userPermission, permissionDefinition) }, h("div", { slot: "intermediateicon" }, h("svg", { xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { d: "M0 0h24v24H0V0z", fill: "none" }), h("path", { d: "M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" }))), h("div", { slot: "uncheckedicon" }, h("svg", { xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { d: "M0 0h24v24H0V0z", fill: "none" }), h("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" }))))));
    }
    handleNextState(state) {
        switch (state) {
            case "checked":
                return "unchecked";
            case "unchecked":
                return "intermediate";
            default:
                return "checked";
        }
    }
    handleRoleChanged(checked, rolePermission, permissionDefinition) {
        switch (checked) {
            case "unchecked":
                this.permissions = Object.assign(Object.assign({}, this.permissions), { rolePermissions: [
                        ...this.permissions.rolePermissions.map(r => {
                            if (r.roleId != rolePermission.roleId) {
                                return r;
                            }
                            const newRolePermission = Object.assign({}, r);
                            newRolePermission.permissions = [
                                ...newRolePermission.permissions.filter(p => p.permissionId != permissionDefinition.permissionId),
                                {
                                    allowAccess: false,
                                    fullControl: false,
                                    permissionCode: permissionDefinition.permissionCode,
                                    permissionId: permissionDefinition.permissionId,
                                    permissionKey: permissionDefinition.permissionKey,
                                    permissionName: permissionDefinition.permissionName,
                                    view: false,
                                },
                            ];
                            return newRolePermission;
                        }),
                    ] });
                break;
            case "checked":
                this.permissions = Object.assign(Object.assign({}, this.permissions), { rolePermissions: [
                        ...this.permissions.rolePermissions.map(r => {
                            if (r.roleId != rolePermission.roleId) {
                                return r;
                            }
                            const newRolePermission = Object.assign({}, r);
                            newRolePermission.permissions = [
                                ...newRolePermission.permissions.filter(p => p.permissionId != permissionDefinition.permissionId),
                                {
                                    allowAccess: true,
                                    fullControl: false,
                                    permissionCode: permissionDefinition.permissionCode,
                                    permissionId: permissionDefinition.permissionId,
                                    permissionKey: permissionDefinition.permissionKey,
                                    permissionName: permissionDefinition.permissionName,
                                    view: false,
                                },
                            ];
                            return newRolePermission;
                        }),
                    ] });
                break;
            case "intermediate":
                this.permissions = Object.assign(Object.assign({}, this.permissions), { rolePermissions: [
                        ...this.permissions.rolePermissions.map(r => {
                            if (r.roleId != rolePermission.roleId) {
                                return r;
                            }
                            const newRolePermission = Object.assign({}, r);
                            newRolePermission.permissions = [
                                ...newRolePermission.permissions.filter(p => p.permissionId != permissionDefinition.permissionId),
                            ];
                            return newRolePermission;
                        }),
                    ] });
                break;
        }
        this.permissionsChanged.emit(this.permissions);
    }
    handleUserChanged(checked, userPermission, permissionDefinition) {
        switch (checked) {
            case "unchecked":
                this.permissions = Object.assign(Object.assign({}, this.permissions), { userPermissions: [
                        ...this.permissions.userPermissions.map(u => {
                            if (u.userId != userPermission.userId) {
                                return u;
                            }
                            const newUserPermission = Object.assign({}, u);
                            newUserPermission.permissions = [
                                ...newUserPermission.permissions.filter(p => p.permissionId != permissionDefinition.permissionId),
                                {
                                    allowAccess: false,
                                    fullControl: false,
                                    permissionCode: permissionDefinition.permissionCode,
                                    permissionId: permissionDefinition.permissionId,
                                    permissionKey: permissionDefinition.permissionKey,
                                    permissionName: permissionDefinition.permissionName,
                                    view: false,
                                },
                            ];
                            return newUserPermission;
                        }),
                    ] });
                break;
            case "checked":
                this.permissions = Object.assign(Object.assign({}, this.permissions), { userPermissions: [
                        ...this.permissions.userPermissions.map(u => {
                            if (u.userId != userPermission.userId) {
                                return u;
                            }
                            const newUserPermission = Object.assign({}, u);
                            newUserPermission.permissions = [
                                ...newUserPermission.permissions.filter(p => p.permissionId != permissionDefinition.permissionId),
                                {
                                    allowAccess: true,
                                    fullControl: false,
                                    permissionCode: permissionDefinition.permissionCode,
                                    permissionId: permissionDefinition.permissionId,
                                    permissionKey: permissionDefinition.permissionKey,
                                    permissionName: permissionDefinition.permissionName,
                                    view: false,
                                },
                            ];
                            return newUserPermission;
                        }),
                    ] });
                break;
            case "intermediate":
                this.permissions = Object.assign(Object.assign({}, this.permissions), { userPermissions: [
                        ...this.permissions.userPermissions.map(u => {
                            if (u.userId != userPermission.userId) {
                                return u;
                            }
                            const newUserPermission = Object.assign({}, u);
                            newUserPermission.permissions = [
                                ...newUserPermission.permissions.filter(p => p.permissionId != permissionDefinition.permissionId),
                            ];
                            return newUserPermission;
                        }),
                    ] });
                break;
        }
        this.permissionsChanged.emit(this.permissions);
    }
    removeRole(rolePermission) {
        this.permissions = Object.assign(Object.assign({}, this.permissions), { rolePermissions: [
                ...this.permissions.rolePermissions.filter(rp => rp.roleId != rolePermission.roleId),
            ] });
        this.permissionsChanged.emit();
    }
    removeUser(userPermission) {
        this.permissions = Object.assign(Object.assign({}, this.permissions), { userPermissions: [
                ...this.permissions.userPermissions.filter(up => up.userId != userPermission.userId),
            ] });
        this.permissionsChanged.emit(this.permissions);
    }
    handleQueryChanged(query) {
        this.userQuery = query;
        if (query == undefined || query.length == 0) {
            this.userCollapsible.expanded = false;
            this.pickedUser = undefined;
            this.foundUsers = [];
            return;
        }
        this.userSearchQueryChanged.emit(query);
    }
    handleSearchUserFieldKeyDown(e) {
        if (e.key != "ArrowDown") {
            return;
        }
        e.preventDefault();
        const firstButton = this.userCollapsible.querySelector("button");
        if (firstButton != undefined) {
            firstButton.focus();
        }
    }
    handleSearchedUserKeyDown(e) {
        const button = e.target;
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                const nextButton = button.nextElementSibling;
                nextButton === null || nextButton === void 0 ? void 0 : nextButton.focus();
                break;
            case "ArrowUp":
                e.preventDefault();
                const previousButton = button.previousElementSibling;
                previousButton === null || previousButton === void 0 ? void 0 : previousButton.focus();
                break;
        }
    }
    handleUserPicked(searchedUser) {
        this.userQuery = searchedUser.displayName;
        this.pickedUser = searchedUser;
    }
    getFilteredUsers() {
        return this.foundUsers.filter(fu => !this.permissions.userPermissions.some(up => up.userId == fu.userId));
    }
    render() {
        const filteredRoles = this.getRoles();
        return (h(Host, { key: 'b67d8bba047109e69533480a2988af61b4fdba47', tabIndex: this.focused ? -1 : 0, onFocus: () => this.rolesDropdown.focus(), onBlur: () => this.rolesDropdown.blur() }, h("div", { key: '8611cb016e0ba559f5991b98406917df8b70971d', class: "add-role-row" }, h("div", { key: '642cd4f3de1819f91cc7482749eed0c52d1c7961', class: "dropdown" }, h("label", { key: '1b8e45a54c6591dd4cc73f7d6cb6c8ebf2f8f879' }, this.localResx.FilterByGroup, " :"), h("select", { key: 'ba34bcda6b6990fe560a9c9797b52d66fe9892b6', ref: el => this.rolesDropdown = el, onChange: e => this.handleRoleGroupChanged(e.target), onFocus: () => this.focused = true, onBlur: () => this.focused = false }, h("option", { key: '3f6e4cefc0558367000bf452083133192c2ea4a3', value: -2, selected: this.selectedRoleGroupId == -2 }, this.localResx.AllRoles), h("option", { key: '2dbdfed8f821d9b8ad098ef8249c18bed3c8522c', value: -1, selected: this.selectedRoleGroupId == -1 }, this.localResx.GlobalRoles), this.roleGroups.map(roleGroup => h("option", { value: roleGroup.id, selected: this.selectedRoleGroupId == roleGroup.id }, roleGroup.name)))), filteredRoles && filteredRoles.length > 0 && [
            h("div", { key: 'db387a65dbf67fba9e9a9f060ffb37344483f018', class: "dropdown" }, h("label", { key: '451923d723e4318612a538ad4f586cfa2de1f783' }, this.localResx.SelectRole, " :"), h("select", { key: '731bb7419a79fbc7ef54b505269b0aee096f62b2', ref: el => this.roleDropDown = el }, this.getRoles().map(role => h("option", { value: role.RoleId }, role.RoleName)))),
            h("dnn-button", { key: 'f3d520f7e616f29023d28a1566be46d2fd0613af', appearance: "primary", onClick: () => this.addRole() }, this.localResx.Add)
        ]), h("table", { key: '029fa6518e0b9eb29072ba81c7745694647470e1', class: "roles-table" }, h("caption", { key: 'fa2d1b72f8d6fa35cc84469c458aa7e58dbf1bca' }, this.localResx.RolePermissions), h("thead", { key: '72e04c943a63ab0773c370fd7f9390d49b856ea1' }, h("tr", { key: '443338c81167bc2d46b2f52ff64c1cb167344c79' }, h("th", { key: 'fe94115f3ebae2b06c327ba4e6b10ce580d58cfd' }, this.localResx.Role), this.permissions.permissionDefinitions.map(permissionDefinition => h("th", null, permissionDefinition.permissionName)), h("th", { key: '67262e822f449a00f93c7d3238e8a374e090f73e' }, "\u00A0"))), h("tbody", { key: 'd14aa250a1ab527551abcb77145b913e080fc6df' }, this.permissions.rolePermissions.map(rolePermission => h("tr", null, h("th", null, rolePermission.roleName), this.permissions.permissionDefinitions.map(permissionDefinition => h("td", null, this.renderRoleCheckBox(rolePermission, permissionDefinition))), h("td", null, !rolePermission.default &&
            h("button", { onClick: () => this.removeRole(rolePermission) }, h("svg", { xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { d: "M0 0h24v24H0V0z", fill: "none" }), h("path", { d: "M14.59 8L12 10.59 9.41 8 8 9.41 10.59 12 8 14.59 9.41 16 12 13.41 14.59 16 16 14.59 13.41 12 16 9.41 14.59 8zM12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" })))))))), h("div", { key: '55f8b94b6958e0d9bb23ab951164702280def8f4', class: "search-user" }, h("div", { key: 'c8b543b26c8d66c00b309efaa7cac61cb1c68c00', class: "search-control" }, h("dnn-searchbox", { key: 'f3f04e5e109c7677fc391f0329aba64d5d8590c6', placeholder: this.localResx.User, onQueryChanged: e => this.handleQueryChanged(e.detail), onKeyDown: e => this.handleSearchUserFieldKeyDown(e), query: this.userQuery }), h("dnn-collapsible", { key: 'f14f975c1148cccea97f31fabb74c6140bb6b539', ref: el => this.userCollapsible = el }, h("div", { key: 'be47199bf5d502677e9592dd7e1ad28e44f0137f', class: "dropdown" }, this.getFilteredUsers().map(searchedUser => h("button", { onKeyDown: e => this.handleSearchedUserKeyDown(e), onClick: () => this.handleUserPicked(searchedUser) }, searchedUser.displayName))))), this.pickedUser &&
            h("dnn-button", { key: 'bab2ecf4f52f38abeea8509428729786722b0e5f', onClick: () => this.addUser() }, this.localResx.Add)), this.permissions.userPermissions && this.permissions.userPermissions.length > 0 &&
            h("table", { key: '0eda5a188ffe96945fc2f9b8576e1a52b29225be', class: "users-table" }, h("caption", { key: '153796d31839da9cf5693f46096738c7dc648a9f' }, this.localResx.UserPermissions), h("thead", { key: 'b054b224e21f06ec7401d6c55b6ebb2f6c968c69' }, h("tr", { key: '6a60f69035c0cdbafa8b714662b8d27858e7eba8' }, h("th", { key: '547738e85501b25e297132153b6f3e61719689e5' }, this.localResx.User), this.permissions.permissionDefinitions.map(permissionDefinition => h("th", null, permissionDefinition.permissionName)), h("th", { key: 'aaa6024a1d66e0ac9310be3803415cfe102bd2a2' }, "\u00A0"))), h("tbody", { key: '722d81242af2217ccdc96833071ccfe004b8cd87' }, this.permissions.userPermissions.map(userPermission => h("tr", null, h("th", null, userPermission.displayName), this.permissions.permissionDefinitions.map(permissionDefinition => h("td", null, this.renderUserCheckBox(userPermission, permissionDefinition))), h("td", null, h("button", { onClick: () => this.removeUser(userPermission) }, h("svg", { xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 0 24 24", width: "24px", fill: "#000000" }, h("path", { d: "M0 0h24v24H0V0z", fill: "none" }), h("path", { d: "M14.59 8L12 10.59 9.41 8 8 9.41 10.59 12 8 14.59 9.41 16 12 13.41 14.59 16 16 14.59 13.41 12 16 9.41 14.59 8zM12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" }))))))))));
    }
    static get watchers() { return {
        "foundUsers": ["handleFoundUsersChanged"],
        "resx": ["resxChanged"]
    }; }
    static get style() { return dnnPermissionsGridCss; }
}, [257, "dnn-permissions-grid", {
        "permissions": [1040],
        "roleGroups": [16],
        "roles": [16],
        "resx": [16],
        "foundUsers": [16],
        "selectedRoleGroupId": [32],
        "userQuery": [32],
        "pickedUser": [32],
        "localResx": [32],
        "focused": [32]
    }, undefined, {
        "foundUsers": ["handleFoundUsersChanged"],
        "resx": ["resxChanged"]
    }]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["dnn-permissions-grid", "dnn-button", "dnn-checkbox", "dnn-collapsible", "dnn-modal", "dnn-searchbox"];
    components.forEach(tagName => { switch (tagName) {
        case "dnn-permissions-grid":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, DnnPermissionsGrid$1);
            }
            break;
        case "dnn-button":
            if (!customElements.get(tagName)) {
                defineCustomElement$6();
            }
            break;
        case "dnn-checkbox":
            if (!customElements.get(tagName)) {
                defineCustomElement$5();
            }
            break;
        case "dnn-collapsible":
            if (!customElements.get(tagName)) {
                defineCustomElement$4();
            }
            break;
        case "dnn-modal":
            if (!customElements.get(tagName)) {
                defineCustomElement$3();
            }
            break;
        case "dnn-searchbox":
            if (!customElements.get(tagName)) {
                defineCustomElement$2();
            }
            break;
    } });
}

const DnnPermissionsGrid = DnnPermissionsGrid$1;
const defineCustomElement = defineCustomElement$1;

export { DnnPermissionsGrid, defineCustomElement };
//# sourceMappingURL=dnn-permissions-grid.js.map

//# sourceMappingURL=dnn-permissions-grid.js.map