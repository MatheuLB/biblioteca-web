import { fetchMe, listFichas, computeStats, livrosLidosNoAno } from './apiClient.js';
import { initThemeToggle } from './theme.js';
import { ICONS, icon } from './icons.js';

const NAV_ITEMS = [
  { href: 'dashboard.html', icon: ICONS.home, label: 'Início' },
  { href: 'dashboard.html', icon: ICONS.book, label: 'Fichas de leitura' },
  { href: 'estatisticas.html', icon: ICONS.chart, label: 'Estatísticas' },
  { href: 'temas.html', icon: ICONS.tag, label: 'Explorar temas' },
  { href: 'jornada.html', icon: ICONS.star, label: 'Minha jornada' },
];

function currentPage() {
  return window.location.pathname.split('/').pop() || 'dashboard.html';
}

export async function renderSidebar(activeLabel) {
  const root = document.getElementById('sidebar-root');
  if (!root) return;

  const page = currentPage();

  root.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="icon-svg brand-icon">${ICONS.book}</span>
        <span class="brand-text">Minha<br>Biblioteca</span>
      </div>
      <nav class="sidebar-nav">
        ${NAV_ITEMS.map(
          (item) => `
          <a class="nav-item" data-label="${item.label}" href="${item.href}">
            <span class="icon-svg nav-icon">${item.icon}</span> ${item.label}
          </a>`
        ).join('')}
      </nav>
      <div class="sidebar-card" id="overview-card">
        <h4>Visão geral</h4>
        <div id="overview-content">Carregando...</div>
      </div>
      <div class="sidebar-card journey-card" id="journey-card">
        <h4>Sua jornada</h4>
        <div id="journey-content">Carregando...</div>
      </div>
      <div class="sidebar-footer">
        <a class="profile-chip" href="perfil.html">
          <span class="avatar icon-svg">${ICONS.user}</span>
          <span class="info">
            <div class="name">Leitor Explorador</div>
            <div class="link">Ver perfil <span class="icon-svg">${ICONS.gear}</span></div>
          </span>
        </a>
      </div>
    </aside>
  `;

  root.querySelectorAll('.nav-item').forEach((el) => {
    if (el.dataset.label === activeLabel) el.classList.add('active');
  });

  initThemeToggle();

  try {
    const [me, fichas] = await Promise.all([fetchMe(), listFichas()]);

    const stats = computeStats(fichas);
    const overviewEl = document.getElementById('overview-content');
    if (overviewEl) {
      overviewEl.innerHTML = `
        <div class="overview-row">
          <span class="icon" style="background:rgba(139,109,240,0.2); color:#8b6df0">${icon('book')}</span>
          <div><div class="val">${stats.totalLivros}</div><div class="lbl">Livros na estante</div></div>
        </div>
        <div class="overview-row">
          <span class="icon" style="background:rgba(52,197,143,0.2); color:#34c58f">${icon('fileText')}</span>
          <div><div class="val">${stats.totalPaginas.toLocaleString('pt-BR')}</div><div class="lbl">Páginas registradas</div></div>
        </div>
        <div class="overview-row">
          <span class="icon" style="background:rgba(224,184,74,0.2); color:#e0b84a">${icon('star')}</span>
          <div><div class="val">${stats.mediaAvaliacao ? stats.mediaAvaliacao.toFixed(1) : '—'}</div><div class="lbl">Avaliação média</div></div>
        </div>
        <div class="overview-row">
          <span class="icon" style="background:rgba(224,90,90,0.2); color:#e0607a">${icon('tag')}</span>
          <div><div class="val">${stats.temaTopo}</div><div class="lbl">Tema mais lido</div></div>
        </div>
      `;
    }

    const metaAnual = me.meta_anual || 12;
    const lidosEsteAno = livrosLidosNoAno(fichas);
    const pct = Math.min(100, Math.round((lidosEsteAno / metaAnual) * 100));
    const journeyEl = document.getElementById('journey-content');
    if (journeyEl) {
      journeyEl.innerHTML = `
        <p>Você já leu ${lidosEsteAno} livro${lidosEsteAno === 1 ? '' : 's'} este ano.</p>
        <div class="journey-bar"><div class="journey-bar-fill" style="width:${pct}%"></div></div>
        <div class="journey-meta"><span>Meta anual: ${metaAnual} livros</span><span>${pct}%</span></div>
      `;
    }
  } catch (e) {
    // offline ou erro — sidebar continua usável sem os widgets de dados
  }
}
