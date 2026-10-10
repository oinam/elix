// Light/dark theme. Loaded as a plain script in <head> so the page never
// flashes the wrong colors. With no saved choice it follows the OS setting,
// live. Picking the OS's own theme clears the saved choice, so the page goes
// back to following the OS.
(function () {
  const KEY = 'elix-theme';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const listeners = [];

  const osTheme = () => (media.matches ? 'dark' : 'light');

  function saved() {
    try {
      const value = localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  function save(value) {
    try {
      if (value) localStorage.setItem(KEY, value);
      else localStorage.removeItem(KEY);
    } catch {
      // Private browsing can block storage; the toggle still works for this visit.
    }
  }

  function updateButtons() {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.textContent = next === 'light' ? '☀️ Light' : '🌙 Dark';
      button.setAttribute('aria-label', `Switch to ${next} mode`);
    });
  }

  function apply() {
    root.dataset.theme = saved() ?? osTheme();
    updateButtons();
    listeners.forEach((fn) => fn(root.dataset.theme));
  }

  function toggle() {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    save(next === osTheme() ? null : next);
    apply();
  }

  media.addEventListener('change', apply);
  root.dataset.theme = saved() ?? osTheme();

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', toggle);
    });
    updateButtons();
  });

  window.elixTheme = {
    current: () => root.dataset.theme,
    // Calls fn now and again whenever the theme changes.
    watch(fn) {
      listeners.push(fn);
      fn(root.dataset.theme);
    },
  };
})();
