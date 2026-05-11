/*
    Client-side wiring for the discovery edit page (_DiscoverEdit.cshtml).
      - renders Lucide icons after load
      - initializes all dropzones via DtDropzone.initAll
      - re-initializes when a <details> opens (so dropzones inside
        collapsed sections wire up the first time they become visible)
      - drag-to-reorder via SortableJS: posts new order to the same page

    Assumes dropzone.js (window.DtDropzone), lucide.js and Sortable
    (window.Sortable) are already loaded. The cshtml loads SortableJS
    from a CDN right before this file.

    Markup contract for sortables:
      <div data-sortable="cat|btn"
           data-reorder-url="<current page url>"
           data-cat-id="<parent cat id, only for btn>">
          <div class="dt-sort-item" data-id="123"> ... drag handle: .dt-sort-handle ... </div>
      </div>
*/
(function () {
    'use strict';

    function initIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function initDropzones(root) {
        if (window.DtDropzone && typeof window.DtDropzone.initAll === 'function') {
            window.DtDropzone.initAll(root || document);
        }
    }

    function postReorder(container) {
        var url   = container.getAttribute('data-reorder-url') || (window.location.pathname + window.location.search);
        var kind  = container.getAttribute('data-sortable'); // "cat" or "btn"
        var catId = container.getAttribute('data-cat-id') || '';
        var ids   = Array.prototype.map.call(
            container.querySelectorAll('.dt-sort-item'),
            function (el) { return el.getAttribute('data-id'); }
        ).filter(function (x) { return x; }).join(',');

        var fd = new FormData();
        fd.append('formAction', kind === 'cat' ? 'cat-reorder' : 'btn-reorder');
        fd.append('orderedIds', ids);
        if (catId) { fd.append('catId', catId); }

        container.classList.add('dt-sort-saving');

        fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function () {
                container.classList.remove('dt-sort-saving');
                container.classList.add('dt-sort-saved');
                setTimeout(function () { container.classList.remove('dt-sort-saved'); }, 800);
            })
            .catch(function () {
                container.classList.remove('dt-sort-saving');
                container.classList.add('dt-sort-error');
                setTimeout(function () { container.classList.remove('dt-sort-error'); }, 1500);
            });
    }

    function initSortables(root) {
        if (!window.Sortable) return;
        var nodes = (root || document).querySelectorAll('[data-sortable]:not([data-sort-init])');
        Array.prototype.forEach.call(nodes, function (container) {
            container.setAttribute('data-sort-init', '1');
            window.Sortable.create(container, {
                handle: '.dt-sort-handle',
                animation: 150,
                ghostClass: 'dt-sort-ghost',
                chosenClass: 'dt-sort-chosen',
                onEnd: function () { postReorder(container); }
            });
        });
    }

    function onReady() {
        initIcons();
        initDropzones(document);
        initSortables(document);

        // <details> 'toggle' events do not bubble; capture phase.
        document.addEventListener('toggle', function (e) {
            var t = e.target;
            if (t && t.tagName === 'DETAILS' && t.open) {
                initDropzones(t);
                initSortables(t);
                initIcons();
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})();
