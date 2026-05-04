/*
    Drag-to-scroll behaviour for `.js-groups-strip` and `.js-team-strip`.
    Mouse only — touch keeps the native scroll. Suppresses the synthetic
    click that follows a drag so child links don't fire spuriously.
*/
(function () {
    var strips = document.querySelectorAll('.js-groups-strip, .js-team-strip');
    if (!strips.length) return;
    strips.forEach(function (strip) { initDragScroll(strip); });

    function initDragScroll(strip) {
        var isDown = false, didDrag = false, startX = 0, startScroll = 0;
        var THRESHOLD = 5;

        strip.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'touch') return;
            if (e.button !== 0) return;
            isDown = true;
            didDrag = false;
            startX = e.clientX;
            startScroll = strip.scrollLeft;
        });

        strip.addEventListener('pointermove', function (e) {
            if (!isDown) return;
            var dx = e.clientX - startX;
            if (!didDrag && Math.abs(dx) > THRESHOLD) {
                didDrag = true;
                strip.classList.add('is-dragging');
                try { strip.setPointerCapture(e.pointerId); } catch (_) {}
            }
            if (didDrag) {
                strip.scrollLeft = startScroll - dx;
                e.preventDefault();
            }
        });

        function endDrag(e) {
            if (!isDown) return;
            isDown = false;
            if (didDrag) {
                strip.classList.remove('is-dragging');
                var swallow = function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    window.removeEventListener('click', swallow, true);
                };
                window.addEventListener('click', swallow, true);
            }
            try { strip.releasePointerCapture(e.pointerId); } catch (_) {}
        }
        strip.addEventListener('pointerup', endDrag);
        strip.addEventListener('pointercancel', endDrag);
        strip.addEventListener('dragstart', function (e) { e.preventDefault(); });
    }
})();
