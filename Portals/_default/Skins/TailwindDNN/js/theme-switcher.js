/**
 * ThemeSwitcher — dynamic multi-theme manager
 *
 * Register themes:
 *   ThemeSwitcher.register('midnight', 'dark');
 *
 * Usage:
 *   ThemeSwitcher.set('dark');       // switch to a specific theme
 *   ThemeSwitcher.toggle();          // cycle through all registered themes
 *   ThemeSwitcher.current();         // get the active theme name
 *   ThemeSwitcher.list();            // ['light','dark', ...]
 *   ThemeSwitcher.type();            // 'light' or 'dark' (current theme type)
 *   ThemeSwitcher.isDark();          // true if current theme type is 'dark'
 *   ThemeSwitcher.register(name, type); // add a new theme at runtime
 *   ThemeSwitcher.onChange(fn);      // subscribe to theme changes
 */
(function () {
  var html = document.documentElement;
  var STORAGE_KEY = 'theme';
  var listeners = [];
  var defaultTheme = "light";

  // Registry: array of { name, type } — order matters for toggle cycling
  var themes = [
    { name: 'light', type: 'light' },
    { name: 'dark',  type: 'dark'  }
  ];

  function findTheme(name) {
    for (var i = 0; i < themes.length; i++) {
      if (themes[i].name === name) return themes[i];
    }
    return null;
  }

  function themeNames() {
    var names = [];
    for (var i = 0; i < themes.length; i++) names.push(themes[i].name);
    return names;
  }

  function getPreferred() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored && findTheme(stored)) return stored;
    if (defaultTheme && findTheme(defaultTheme)) return defaultTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  var applying = false;

  function apply(name, skipStorage) {
    var theme = findTheme(name);
    if (!theme) return;

    applying = true;

    // Remove all theme name classes, then add the active one
    var names = themeNames();
    for (var i = 0; i < names.length; i++) html.classList.remove(names[i]);
    html.classList.add(theme.name);

    // data-theme drives CSS variable selectors
    html.setAttribute('data-theme', theme.name);

    if (!skipStorage) localStorage.setItem(STORAGE_KEY, theme.name);

    applying = false;

    // Notify subscribers
    for (var j = 0; j < listeners.length; j++) {
      try { listeners[j](theme.name, theme.type); } catch (e) { /* ignore */ }
    }
  }

  // Apply immediately
  apply(getPreferred());

  // Listen for system preference changes (only when no stored choice)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem(STORAGE_KEY)) {
      apply(e.matches ? 'dark' : 'light');
    }
  });

  // Watch for external data-theme attribute changes (e.g. DevTools edit)
  // Does NOT write to localStorage — only syncs the class
  new MutationObserver(function (mutations) {
    if (applying) return;
    mutations.forEach(function (m) {
      if (m.attributeName === 'data-theme') {
        var val = html.getAttribute('data-theme');
        if (val && findTheme(val)) apply(val, true);
      }
    });
  }).observe(html, { attributes: true, attributeFilter: ['data-theme'] });

  // ── Public API ──
  window.ThemeSwitcher = {
    /** Set a theme by name */
    set: function (name) { if (findTheme(name)) apply(name); },

    /** Cycle to the next theme in the registry */
    toggle: function () {
      var cur = html.getAttribute('data-theme') || 'light';
      var names = themeNames();
      var idx = -1;
      for (var i = 0; i < names.length; i++) { if (names[i] === cur) { idx = i; break; } }
      apply(names[(idx + 1) % names.length]);
    },

    /** Get the current theme name */
    current: function () { return html.getAttribute('data-theme') || 'light'; },

    /** Get the current theme type ('light' or 'dark') */
    type: function () {
      var t = findTheme(this.current());
      return t ? t.type : 'light';
    },

    /** Is the current theme a dark type? */
    isDark: function () { return this.type() === 'dark'; },

    /** List all registered theme names */
    list: function () { return themeNames(); },

    /** Register a new theme (and its CSS must exist as [data-theme="name"]) */
    register: function (name, type) {
      if (!findTheme(name)) themes.push({ name: name, type: type || 'light' });
    },

    /** Set the default theme used when no stored preference exists.
     *  If null, falls back to system prefers-color-scheme. */
    setDefault: function (name) {
      defaultTheme = (name && findTheme(name)) ? name : null;
    },

    /** Get the current default theme name (or null) */
    getDefault: function () { return defaultTheme; },

    /** Subscribe to theme changes — fn(name, type) */
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };

  // Backwards-compat shorthands
  window.setTheme = window.ThemeSwitcher.set;
  window.toggleTheme = window.ThemeSwitcher.toggle;
})();
