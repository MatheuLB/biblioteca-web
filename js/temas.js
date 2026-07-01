import { TEMAS, listFichas, computeStats } from './apiClient.js';
import { requireSession, escapeHtml } from './common.js?v=2';
import { renderSidebar } from './appShell.js';

const ACCENT_COLORS = ['#8b6df0', '#34c58f', '#e0b84a', '#e0607a', '#4fa3d9', '#c0622e', '#7ac0a8', '#b083d9'];

(async () => {
  const session = await requireSession();
  if (!session) return;

  renderSidebar('Explorar temas');

  let fichas = [];
  try {
    fichas = await listFichas();
  } catch (e) {
    fichas = [];
  }

  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('temas-section').classList.remove('hidden');

  const stats = computeStats(fichas);
  const items = TEMAS.map((t) => ({ key: t.key, label: t.label, count: stats.temaCounts[t.key] || 0 })).sort(
    (a, b) => b.count - a.count
  );

  document.getElementById('temas-grid').innerHTML = items
    .map(
      (t, i) => `
      <a class="tema-explore-card" href="dashboard.html?tema=${encodeURIComponent(t.key)}" style="--accent:${ACCENT_COLORS[i % ACCENT_COLORS.length]}">
        <div class="count" style="color:${ACCENT_COLORS[i % ACCENT_COLORS.length]}">${t.count}</div>
        <div class="label">${escapeHtml(t.label)}</div>
        <div class="sub">${t.count === 1 ? '1 ficha' : t.count + ' fichas'}</div>
      </a>`
    )
    .join('');
})();
