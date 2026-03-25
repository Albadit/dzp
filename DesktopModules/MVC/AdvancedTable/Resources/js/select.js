/**
 * Shared dropdown widget — multi-select or single-select.
 * Built entirely with <div> elements, no <select> or <textarea>.
 *
 * Usage:
 *   var ms = MultiSelect.create(containerEl, {
 *       placeholder: 'Select items…',
 *       options: [{ value: 'a', label: 'Alpha' }, …],
 *       selected: ['a'],
 *       single: false,        // true = single-select mode
 *       onChange: function(sel) { … }
 *   });
 *   ms.getSelected();          // ['a']
 *   ms.getValue();             // 'a'  (first selected, handy for single mode)
 *   ms.setOptions(newOpts, ['b']);
 *   ms.destroy();
 */
var MultiSelect = (function () {
    'use strict';

    function escHtml(s) {
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(s));
        return d.innerHTML;
    }

    function create(container, cfg) {
        cfg = cfg || {};
        var placeholder = cfg.placeholder || 'Select\u2026';
        var options = cfg.options || [];
        var selected = cfg.selected || [];
        var single = !!cfg.single;
        var onChange = cfg.onChange || null;

        // Build DOM
        var wrap = document.createElement('div');
        wrap.className = 'ms-wrap' + (single ? ' ms-single' : '');

        var trigger = document.createElement('div');
        trigger.className = 'ms-trigger';
        trigger.setAttribute('tabindex', '0');

        var textEl = document.createElement('span');
        textEl.className = 'ms-text-single';

        var arrow = document.createElement('span');
        arrow.className = 'ms-arrow';
        arrow.innerHTML = '<i data-lucide="chevron-up"></i>';

        if (single) {
            trigger.appendChild(textEl);
        }
        trigger.appendChild(arrow);

        var dropdown = document.createElement('div');
        dropdown.className = 'ms-dropdown';

        var listEl = document.createElement('div');
        listEl.className = 'ms-list';
        dropdown.appendChild(listEl);

        wrap.appendChild(trigger);
        container.innerHTML = '';
        container.appendChild(wrap);
        document.body.appendChild(dropdown);

        var isOpen = false;

        function getLabel(val) {
            for (var i = 0; i < options.length; i++) {
                if (options[i].value === val) return options[i].label;
            }
            return val;
        }

        function renderText() {
            if (single) {
                // Single mode: just update text
                if (selected.length === 0) {
                    textEl.className = 'ms-text-single ms-placeholder';
                    textEl.textContent = placeholder;
                } else {
                    textEl.className = 'ms-text-single';
                    textEl.textContent = getLabel(selected[0]);
                }
                return;
            }

            // Multi mode: show chips in trigger
            while (trigger.firstChild !== arrow) {
                trigger.removeChild(trigger.firstChild);
            }

            if (selected.length === 0) {
                var ph = document.createElement('span');
                ph.className = 'ms-placeholder';
                ph.textContent = placeholder;
                trigger.insertBefore(ph, arrow);
            } else {
                for (var i = 0; i < selected.length; i++) {
                    var chip = document.createElement('span');
                    chip.className = 'ms-chip';
                    chip.textContent = getLabel(selected[i]);
                    chip.setAttribute('data-val', selected[i]);

                    var x = document.createElement('span');
                    x.className = 'ms-chip-x';
                    x.innerHTML = '&times;';
                    x.setAttribute('data-val', selected[i]);
                    chip.appendChild(x);

                    trigger.insertBefore(chip, arrow);
                }
            }
        }

        function renderList() {
            listEl.innerHTML = '';
            for (var i = 0; i < options.length; i++) {
                var opt = options[i];
                var isSel = selected.indexOf(opt.value) !== -1;
                var item = document.createElement('div');
                item.className = 'ms-item' + (isSel ? ' ms-selected' : '');
                item.setAttribute('data-val', opt.value);
                item.innerHTML = '<span class="ms-item-label">' + escHtml(opt.label) + '</span>' +
                    (isSel ? '<span class="ms-check"><i data-lucide="check"></i></span>' : '');
                listEl.appendChild(item);
            }
            if (!options.length) {
                var empty = document.createElement('div');
                empty.className = 'ms-empty';
                empty.textContent = 'No options';
                listEl.appendChild(empty);
            }
        }

        function render() {
            renderList();
            renderText();
            if (isOpen) positionDropdown();
        }

        function pick(val) {
            if (single) {
                selected = [val];
                render();
                close();
                if (onChange) onChange(selected.slice());
            } else {
                var idx = selected.indexOf(val);
                if (idx === -1) { selected.push(val); } else { selected.splice(idx, 1); }
                render();
                if (onChange) onChange(selected.slice());
            }
        }

        function positionDropdown() {
            var rect = trigger.getBoundingClientRect();
            dropdown.style.left = rect.left + 'px';
            dropdown.style.top = (rect.bottom + 4) + 'px';
            dropdown.style.minWidth = rect.width + 'px';
        }

        function onReposition() { if (isOpen) positionDropdown(); }

        function onScroll(e) { if (isOpen && !dropdown.contains(e.target)) close(); }

        function open() {
            if (isOpen) return;
            isOpen = true;
            wrap.classList.add('ms-open');
            dropdown.style.display = 'flex';
            positionDropdown();
            window.addEventListener('resize', onReposition);
            window.addEventListener('scroll', onScroll, true);
        }

        function close() {
            if (!isOpen) return;
            isOpen = false;
            wrap.classList.remove('ms-open');
            dropdown.style.display = '';
            window.removeEventListener('resize', onReposition);
            window.removeEventListener('scroll', onScroll, true);
        }

        // Events
        trigger.addEventListener('click', function (e) {
            // Handle chip X button click
            if (e.target.classList.contains('ms-chip-x')) {
                e.stopPropagation();
                pick(e.target.getAttribute('data-val'));
                return;
            }
            if (isOpen) close(); else open();
        });

        trigger.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isOpen) close(); else open(); }
            if (e.key === 'Escape') close();
        });

        listEl.addEventListener('click', function (e) {
            var item = e.target.closest('.ms-item');
            if (item) pick(item.getAttribute('data-val'));
        });

        function docHandler(e) {
            if (!wrap.contains(e.target) && !dropdown.contains(e.target)) close();
        }
        document.addEventListener('mousedown', docHandler);

        render();

        return {
            getSelected: function () { return selected.slice(); },
            getValue: function () { return selected.length ? selected[0] : ''; },
            setOptions: function (newOpts, newSelected) {
                options = newOpts || [];
                selected = newSelected || [];
                render();
            },
            destroy: function () {
                close();
                document.removeEventListener('mousedown', docHandler);
                if (dropdown.parentNode) dropdown.parentNode.removeChild(dropdown);
                container.innerHTML = '';
            }
        };
    }

    return { create: create };
})();
