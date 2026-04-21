var CompanyEdit = (function () {
  'use strict';

  var pageUrl = location.pathname + location.search;
  var toast = null;
  var toastTimer = null;
  var toastFadeTimer = null;
  var addUserSelected = [];
  var memberIdSet = {};

  /* ── Toast notification ── */
  function showToast(msg, ok) {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    if (toastFadeTimer) { clearTimeout(toastFadeTimer); toastFadeTimer = null; }
    if (toast) { toast.remove(); toast = null; }
    toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-opacity duration-300 max-w-[350px] '
      + (ok ? 'bg-success-50 border border-success-200 text-success-800' : 'bg-danger-50 border border-danger-200 text-danger-800');
    toast.innerHTML = '<i data-lucide="' + (ok ? 'check-circle-2' : 'alert-circle') + '" class="size-4 shrink-0"></i><span>' + escHtml(msg) + '</span>';
    document.body.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    toastTimer = setTimeout(function () { if (toast) { toast.style.opacity = '0'; toastFadeTimer = setTimeout(function () { if (toast) { toast.remove(); toast = null; } }, 300); } }, 3000);
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /* ── Generic POST via fetch ── */
  function post(body) {
    return fetch(pageUrl, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
      credentials: 'same-origin'
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (txt) {
      try { return JSON.parse(txt); }
      catch (e) { throw new Error('Invalid JSON'); }
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
      var onClass = m.showInTeam ? 'bg-primary' : 'bg-foreground-200';
      var dotClass = m.showInTeam ? 'translate-x-6' : 'translate-x-1';
      var toggleTitle = m.showInTeam ? 'Verbergen in team' : 'Tonen in team';
      html += '<div class="flex items-center justify-between gap-4 py-3">'
        + '<div class="flex items-center gap-3 min-w-0">'
        + '<button type="button" data-toggle-user="' + m.userId + '" title="' + toggleTitle + '" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ' + onClass + '">'
        + '<span class="inline-block size-4 rounded-full bg-white shadow-sm transition-transform ' + dotClass + '"></span>'
        + '</button>'
        + '<div class="size-10 rounded-full overflow-hidden border-2 border-divider shrink-0">'
        + '<img src="/DnnImageHandler.ashx?mode=profilepic&userId=' + m.userId + '&w=80&h=80" alt="' + escHtml(m.displayName) + '" class="w-full h-full object-cover rounded-full" />'
        + '</div>'
        + '<div class="flex flex-col min-w-0">'
        + '<span class="text-sm font-medium text-foreground-900 truncate">' + escHtml(m.displayName) + '</span>';
      if (m.email) {
        html += '<span class="text-xs text-foreground-400 truncate">' + escHtml(m.email) + '</span>';
      }
      html += '</div></div>'
        + '<div class="flex items-center gap-2 shrink-0">';
      if (isOwner) {
        html += '<span class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-xs font-medium text-primary">'
          + '<i data-lucide="crown" class="size-3.5"></i> Eigenaar</span>';
      } else {
        html += '<button type="button" data-remove-id="' + m.id + '" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-divider text-xs font-medium text-danger hover:bg-danger-50 hover:border-danger/30 transition">'
          + '<i data-lucide="user-minus" class="size-3.5"></i> Verwijderen</button>';
      }
      html += '</div></div>';
    }
    html += '</div>';
    list.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    bindMemberActions();
    initAddUserSelect();
  }

  /* ── Toggle team visibility ── */
  function toggleTeam(userId, btn) {
    /* Optimistic UI: flip toggle immediately */
    var isOn = btn.classList.contains('bg-primary');
    var dot = btn.querySelector('span');
    if (isOn) {
      btn.classList.remove('bg-primary'); btn.classList.add('bg-foreground-200');
      if (dot) { dot.classList.remove('translate-x-6'); dot.classList.add('translate-x-1'); }
    } else {
      btn.classList.remove('bg-foreground-200'); btn.classList.add('bg-primary');
      if (dot) { dot.classList.remove('translate-x-1'); dot.classList.add('translate-x-6'); }
    }
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
        if (isOn) {
          btn.classList.add('bg-primary'); btn.classList.remove('bg-foreground-200');
          if (dot) { dot.classList.add('translate-x-6'); dot.classList.remove('translate-x-1'); }
        } else {
          btn.classList.add('bg-foreground-200'); btn.classList.remove('bg-primary');
          if (dot) { dot.classList.add('translate-x-1'); dot.classList.remove('translate-x-6'); }
        }
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
