(function () {
    "use strict";

    // Find all instances of this module on the page
    var containers = document.querySelectorAll("[id^='spaModule-']");

    containers.forEach(function (container) {
        var moduleId = container.getAttribute("data-module-id");
        var portalId = container.getAttribute("data-portal-id");
        var tabId = container.getAttribute("data-tab-id");
        var servicePath = container.getAttribute("data-sf");
        var antiForgeryToken = container.getAttribute("data-anti-forgery");

        // Base URL for DNN Services Framework API calls
        var baseApiUrl = servicePath + "SPAModule/API/";

        // Helper: make authenticated API calls via DNN Services Framework
        function apiCall(method, endpoint, data) {
            return new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open(method, baseApiUrl + endpoint, true);
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.setRequestHeader("ModuleId", moduleId);
                xhr.setRequestHeader("TabId", tabId);
                if (antiForgeryToken) {
                    xhr.setRequestHeader("RequestVerificationToken", antiForgeryToken);
                }

                xhr.onload = function () {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            resolve(xhr.responseText);
                        }
                    } else {
                        reject({ status: xhr.status, text: xhr.statusText });
                    }
                };

                xhr.onerror = function () {
                    reject({ status: xhr.status, text: xhr.statusText });
                };

                xhr.send(data ? JSON.stringify(data) : null);
            });
        }

        // Initialize module
        function init() {
            var content = container.querySelector(".spa-module-content");
            if (content) {
                content.innerHTML = "<p>SPA Module loaded successfully. Module ID: " + moduleId + "</p>";
            }
        }

        init();
    });
})();
