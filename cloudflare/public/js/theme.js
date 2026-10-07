const STORAGE_KEY = "prbeats-theme";

export function getPreferredTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  syncThemeControls();
  return next;
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme || getPreferredTheme();
  return applyTheme(current === "dark" ? "light" : "dark");
}

function syncThemeControls() {
  const theme = document.documentElement.dataset.theme || getPreferredTheme();
  const isDark = theme === "dark";
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-pressed", isDark ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
    btn.title = isDark ? "Light mode" : "Dark mode";
    const label = btn.querySelector("[data-theme-label]");
    if (label) label.textContent = isDark ? "Light" : "Dark";
  });
}

export function initThemeToggle(root = document) {
  applyTheme(getPreferredTheme());
  root.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    if (btn.dataset.themeBound === "1") return;
    btn.dataset.themeBound = "1";
    btn.addEventListener("click", () => toggleTheme());
  });
  syncThemeControls();
}
