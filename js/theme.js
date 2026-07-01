import { ICONS } from './icons.js';

const STORAGE_KEY = 'biblioteca-theme';

function iconHtml(theme) {
  return `<span class="icon-svg">${theme === 'dark' ? ICONS.sun : ICONS.moon}</span>`;
}

export function initThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  btn.innerHTML = iconHtml(theme);

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY, next);
    btn.innerHTML = iconHtml(next);
  });
}
