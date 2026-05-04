function openTeamModal(el) {
    var m = document.getElementById('teamModal');
    document.getElementById('tmImg').src = el.dataset.image;
    document.getElementById('tmName').textContent = el.dataset.name;
    document.getElementById('tmRole').textContent = el.dataset.role;
    var email = el.dataset.email;
    var emailRow = document.getElementById('tmEmailRow');
    if (email) {
        document.getElementById('tmEmail').textContent = email;
        emailRow.classList.remove('hidden');
    } else {
        emailRow.classList.add('hidden');
    }
    m.classList.remove('hidden');
    m.classList.add('flex');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
function closeTeamModal() {
    var m = document.getElementById('teamModal');
    m.classList.add('hidden');
    m.classList.remove('flex');
    var btn = document.querySelector('#tmEmailRow button');
    btn.innerHTML = '<i data-lucide="copy" class="size-4"></i>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
function copyTeamEmail() {
    var email = document.getElementById('tmEmail').textContent;
    var btn = document.querySelector('#tmEmailRow button');
    var doCopy;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        doCopy = navigator.clipboard.writeText(email);
    } else {
        var ta = document.createElement('textarea');
        ta.value = email;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        doCopy = Promise.resolve();
    }
    doCopy.then(function() {
        btn.innerHTML = '<i data-lucide="check" class="size-4"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(function() {
            btn.innerHTML = '<i data-lucide="copy" class="size-4"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }, 2000);
    });
}
