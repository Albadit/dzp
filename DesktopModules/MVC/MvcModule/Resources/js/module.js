// MVC Module JavaScript

(function () {
    "use strict";

    function initModule(moduleId) {
        var container = document.getElementById("mvcContainer-" + moduleId);
        if (!container) return;

        // Example: confirm delete links
        var deleteLinks = container.querySelectorAll("a[data-confirm]");
        for (var i = 0; i < deleteLinks.length; i++) {
            deleteLinks[i].addEventListener("click", function (e) {
                if (!confirm(this.getAttribute("data-confirm") || "Are you sure?")) {
                    e.preventDefault();
                }
            });
        }
    }

    // Auto-initialize for each module instance on the page
    document.addEventListener("DOMContentLoaded", function () {
        var containers = document.querySelectorAll("[id^='mvcContainer-']");
        for (var i = 0; i < containers.length; i++) {
            var id = containers[i].id.replace("mvcContainer-", "");
            initModule(parseInt(id, 10));
        }
    });
})();
