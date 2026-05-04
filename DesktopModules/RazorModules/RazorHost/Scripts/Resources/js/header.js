function dzpToggleMenu() {
    var menu = document.getElementById('dzp-mobile-menu');
    var btn = document.getElementById('dzp-hamburger-btn');
    menu.classList.toggle('open');
    btn.classList.toggle('active');
}
function dzpCloseMenu() {
    var menu = document.getElementById('dzp-mobile-menu');
    var btn = document.getElementById('dzp-hamburger-btn');
    menu.classList.remove('open');
    btn.classList.remove('active');
}
