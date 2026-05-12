var CompanyEdit = (function () {
  'use strict';

  var pageUrl = location.pathname + location.search;
  var addUserSelected = [];
  var memberIdSet = {};

  /* Toast + AJAX POST delegate to the shared window.DZ helpers (dz-shared.js). */
  function showToast(msg, ok) { window.DZ.toast(msg, ok); }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function post(body) {
    return window.DZ.fetch.post(pageUrl, body).then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      if (!res.data) { throw new Error('Invalid JSON'); }
      return res.data;
    });
  }

  /* ── Render members list ── */
  function renderMembers(members, ownerId) {
    memberIdSet = {};
    for (var i = 0; i < members.length; i++) { memberIdSet[String(members[i].userId)] = true; }
    var list = document.getElementById('ce-members');
    if (!list) return;
    if (!members.length) {
      list.innerHTML = '<p class="text-sm text-foreground-400 py-2">Er zijn nog geen teamleden gekoppeld.</p>';
      return;
    }
    var html = '<div class="flex flex-col divide-y divide-divider">';
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      var isOwner = m.userId === ownerId;
      var btnClass = m.showInTeam
        ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
        : 'border-divider bg-content2 text-foreground-400 hover:text-foreground-700 hover:bg-content3';
      var iconName = m.showInTeam ? 'eye' : 'eye-off';
      var toggleTitle = m.showInTeam ? 'Verbergen in team' : 'Tonen in team';
      var emailHtml = m.email
        ? `<span class="text-xs text-foreground-400 truncate">${escHtml(m.email)}</span>`
        : '';
      var actionHtml = isOwner
        ? `<span class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-xs font-medium text-primary">
             <i data-lucide="crown" class="size-3.5"></i> Eigenaar
           </span>`
        : `<button type="button" data-remove-id="${m.id}" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-divider text-xs font-medium text-danger hover:bg-danger-50 hover:border-danger/30 transition">
             <i data-lucide="user-minus" class="size-3.5"></i> Verwijderen
           </button>`;
      html += `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <button type="button" data-toggle-user="${m.userId}" title="${toggleTitle}" aria-pressed="${m.showInTeam ? 'true' : 'false'}" class="inline-flex items-center justify-center size-9 rounded-lg border transition-colors shrink-0 ${btnClass}">
              <i data-lucide="${iconName}" class="size-4"></i>
            </button>
            <div class="size-10 rounded-full overflow-hidden border-2 border-divider shrink-0">
              <img src="/DnnImageHandler.ashx?mode=profilepic&userId=${m.userId}&w=80&h=80" alt="${escHtml(m.displayName)}" class="w-full h-full object-cover rounded-full" />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-medium text-foreground-900 truncate">${escHtml(m.displayName)}</span>
              ${emailHtml}
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            ${actionHtml}
          </div>
        </div>`;
    }
    html += '</div>';
    list.innerHTML = html;
    window.DZ.icons();
    bindMemberActions();
    initAddUserSelect();
  }

  /* Eye-toggle button styling shared with DiscoverEdit. */
  function setEyeButtonState(btn, on) {
    window.DZ.eyeToggle(btn, on, { onTitle: 'Verbergen in team', offTitle: 'Tonen in team' });
  }

  function toggleTeam(userId, btn) {
    /* Optimistic UI: flip toggle immediately */
    var wasOn = btn.getAttribute('aria-pressed') === 'true';
    setEyeButtonState(btn, !wasOn);
    /* Find member name from the row */
    var row = btn.closest('.py-3');
    var name = row ? row.querySelector('.text-foreground-900') : null;
    var displayName = name ? name.textContent.trim() : '';

    post('formAction=toggle-team&toggleUserId=' + userId)
      .then(function (r) {
        if (r.members) {
          var member = null;
          for (var i = 0; i < r.members.length; i++) {
            if (r.members[i].userId === userId) { member = r.members[i]; break; }
          }
          var msg = displayName
            ? (displayName + (member && member.showInTeam ? ' is nu zichtbaar in het team' : ' is verborgen in het team'))
            : r.message;
          showToast(msg, r.ok);
          renderMembers(r.members, r.ownerId);
        } else {
          showToast(r.message, r.ok);
        }
      })
      .catch(function () {
        /* Revert on error */
        setEyeButtonState(btn, wasOn);
        showToast('Er ging iets mis.', false);
      });
  }

  /* ── Remove member ── */
  function removeMember(memberId) {
    if (!confirm('Weet je zeker dat je dit lid wilt verwijderen?')) return;
    post('formAction=remove-member&removeMemberId=' + memberId)
      .then(function (r) {
        showToast(r.message, r.ok);
        if (r.members) renderMembers(r.members, r.ownerId);
      })
      .catch(function () { showToast('Er ging iets mis.', false); });
  }

  /* ── Add member ── */
  function addMember() {
    var userId = addUserSelected.length ? addUserSelected[0] : '';
    if (!userId) return;
    post('formAction=add-member&addUserId=' + encodeURIComponent(userId))
      .then(function (r) {
        showToast(r.message, r.ok);
        if (r.members) renderMembers(r.members, r.ownerId);
        addUserSelected = [];
        initAddUserSelect();
      })
      .catch(function () { showToast('Er ging iets mis.', false); });
  }

  /* ── Save company info ── */
  function saveInfo(form) {
    var fd = new FormData(form);
    var parts = [];
    fd.forEach(function (v, k) { parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v)); });
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
    post(parts.join('&'))
      .then(function (r) {
        showToast(r.message || (r.ok ? 'Opgeslagen!' : 'Er ging iets mis.'), r.ok);
        if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      })
      .catch(function () {
        showToast('Er ging iets mis.', false);
        if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      });
  }

  /* ── Bind click handlers to dynamically rendered member actions ── */
  function bindMemberActions() {
    var list = document.getElementById('ce-members');
    if (!list) return;
    list.querySelectorAll('[data-toggle-user]').forEach(function (btn) {
      btn.addEventListener('click', function () { toggleTeam(parseInt(btn.dataset.toggleUser), btn); });
    });
    list.querySelectorAll('[data-remove-id]').forEach(function (btn) {
      btn.addEventListener('click', function () { removeMember(parseInt(btn.dataset.removeId)); });
    });
  }

  /* ── Create the add-user MultiSelect widget ── */
  function initAddUserSelect() {
    var ctr = document.getElementById('ce-add-user-select');
    if (!ctr || typeof MultiSelect === 'undefined') return;
    var all = (typeof CE_USERS !== 'undefined') ? CE_USERS : [];
    var opts = all.filter(function (o) { return !memberIdSet[String(o.value)]; });
    MultiSelect.create(ctr, {
      placeholder: '-- Kies een gebruiker --',
      options: opts,
      selected: [],
      single: true,
      onChange: function (sel) { addUserSelected = sel; }
    });
  }

  /* ── Init: hijack all forms ── */
  function init() {
    /* Save-info form */
    var saveForm = document.getElementById('ce-save-form');
    if (saveForm) {
      saveForm.addEventListener('submit', function (e) {
        e.preventDefault();
        saveInfo(saveForm);
      });
    }

    /* Add-member button */
    var addBtn = document.getElementById('ce-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function () { addMember(); });
    }

    /* Seed memberIdSet from server data */
    var ids = (typeof CE_MEMBER_IDS !== 'undefined') ? CE_MEMBER_IDS : [];
    for (var i = 0; i < ids.length; i++) { memberIdSet[String(ids[i])] = true; }

    /* Create the user-select widget */
    initAddUserSelect();

    /* Bind initial toggle/remove buttons */
    bindMemberActions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init: init };
})();
