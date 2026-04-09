document.addEventListener('DOMContentLoaded', function () {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  var toggle  = document.getElementById('sidebar-toggle');
  var popup   = document.getElementById('user-popup');
  var trigger = document.getElementById('user-menu-trigger');

  // Toggle sidebar from header hamburger
  if (toggle) {
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('-translate-x-full');
      overlay.classList.toggle('hidden');
    });
  }

  // Toggle user popup menu
  if (trigger && popup) {
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      popup.classList.toggle('hidden');
    });
  }

  // Close user popup on outside click
  document.addEventListener('click', function (e) {
    if (popup && trigger && !trigger.contains(e.target)) {
      popup.classList.add('hidden');
    }
  });
});
