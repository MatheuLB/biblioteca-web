import { TEMAS, listFichas, computeStats } from './apiClient.js';
import { requireSession, escapeHtml } from './common.js?v=2';
import { renderSidebar } from './appShell.js';
import { icon } from './icons.js';

const STAT_CARDS_DEF = [
  { accent: '#8b6df0', icon: 'book', key: 'totalLivros', label: 'Livros na estante' },
  { accent: '#34c58f', icon: 'fileText', key: 'totalPaginas', label: 'Páginas registradas' },
  { accent: '#e0b84a', icon: 'star', key: 'mediaAvaliacao', label: 'Avaliação média' },
  { accent: '#e0607a', icon: 'tag', key: 'temaTopo', label: 'Tema mais lido' },
];

function renderBars(containerId, items) {
  const container = document.getElementById(containerId);
  if (items.length === 0) {
    container.innerHTML = '<p style="color:#7c87a3; font-size:13px;">Sem dados suficientes ainda.</p>';
    return;
  }
  const maxCount = Math.max(...items.map((i) => i.count));
  container.innerHTML = items
    .map(
      (item) => `
      <div class="stat-bar-row">
        <span class="bar-label">${escapeHtml(item.label)}</span>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${maxCount ? Math.round((item.count / maxCount) * 100) : 0}%"></div></div>
        <span class="bar-count">${item.count}</span>
      </div>`
    )
    .join('');
}

(async () => {
  const session = await requireSession();
  if (!session) return;

  renderSidebar('Estatísticas');

  let fichas = [];
  try {
    fichas = await listFichas();
  } catch (e) {
    fichas = [];
  }

  document.getElementById('loading-state').classList.add('hidden');

  if (fichas.length === 0) {
    document.getElementById('empty-state').classList.remove('hidden');
    return;
  }

  document.getElementById('stats-content').classList.remove('hidden');

  const stats = computeStats(fichas);
  const values = {
    totalLivros: stats.totalLivros,
    totalPaginas: stats.totalPaginas.toLocaleString('pt-BR'),
    mediaAvaliacao: stats.mediaAvaliacao ? stats.mediaAvaliacao.toFixed(1) : '—',
    temaTopo: stats.temaTopo,
  };
  document.getElementById('stat-cards-row').innerHTML = STAT_CARDS_DEF.map(
    (c) => `
      <div class="stat-card-dark" style="--accent:${c.accent}">
        <div class="icon">${icon(c.icon)}</div>
        <div class="value">${values[c.key]}</div>
        <div class="label">${c.label}</div>
      </div>`
  ).join('');

  const temaItems = TEMAS.map((t) => ({ label: t.label, count: stats.temaCounts[t.key] || 0 }))
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count);
  renderBars('temas-bars', temaItems);

  const avaliacaoCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  fichas.forEach((f) => {
    if (f.avaliacao >= 1 && f.avaliacao <= 5) avaliacaoCounts[f.avaliacao]++;
  });
  const avaliacaoItems = [5, 4, 3, 2, 1].map((n) => ({ label: '★'.repeat(n) + '☆'.repeat(5 - n), count: avaliacaoCounts[n] }));
  renderBars('avaliacoes-bars', avaliacaoItems);

  const anoCounts = {};
  fichas.forEach((f) => {
    if (!f.termino_leitura) return;
    const ano = f.termino_leitura.slice(0, 4);
    anoCounts[ano] = (anoCounts[ano] || 0) + 1;
  });
  const anoItems = Object.entries(anoCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ano, count]) => ({ label: ano, count }));
  renderBars('anos-bars', anoItems);
})();
