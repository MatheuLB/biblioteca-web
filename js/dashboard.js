import { TEMAS, listFichas, deleteFicha, sortFichas, computeStats } from './apiClient.js';
import { requireSession, starsDisplay, escapeHtml, initOfflineBanner } from './common.js?v=2';
import { drawFichaPage } from './pdfFicha.js';
import { renderSidebar } from './appShell.js';
import { registerServiceWorker } from './pwa.js';
import { cacheFichas, getCachedFichas, enqueueDelete, flushQueue } from './offlineQueue.js';
import { icon } from './icons.js';

registerServiceWorker();
initOfflineBanner(async () => {
  const result = await flushQueue();
  if (result.synced > 0) {
    try {
      const refreshed = sortFichas(await listFichas());
      allFichas = refreshed;
      cacheFichas(allFichas);
      populateTemaFilter();
      renderStats(allFichas);
      applyFilters();
    } catch (e) {
      // sem conexão ou erro na API — mantém os dados atuais
    }
  }
  return result;
});

let allFichas = [];

(async () => {
  const session = await requireSession();
  if (!session) return;

  renderSidebar('Início');

  let fichas = null;
  try {
    fichas = sortFichas(await listFichas());
  } catch (e) {
    fichas = null;
  }

  document.getElementById('loading-state').classList.add('hidden');

  if (!fichas || !navigator.onLine) {
    allFichas = getCachedFichas();
    if (allFichas.length === 0) {
      document.getElementById('empty-state').classList.remove('hidden');
      return;
    }
  } else {
    if (fichas.length === 0) {
      document.getElementById('empty-state').classList.remove('hidden');
      return;
    }
    allFichas = fichas;
    cacheFichas(allFichas);
  }

  document.getElementById('search-bar').classList.remove('hidden');
  document.getElementById('export-all-btn').classList.remove('hidden');
  populateTemaFilter();

  const temaParam = new URLSearchParams(window.location.search).get('tema');
  if (temaParam) document.getElementById('filter-tema').value = temaParam;

  renderStats(allFichas);
  applyFilters();

  document.getElementById('search-input').addEventListener('input', applyFilters);
  document.getElementById('filter-tema').addEventListener('change', applyFilters);
  document.getElementById('filter-avaliacao').addEventListener('change', applyFilters);
})();

document.addEventListener('keydown', (e) => {
  if (e.key !== '/') return;
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const input = document.getElementById('search-input');
  if (!input) return;
  e.preventDefault();
  input.focus();
});

document.getElementById('export-all-btn').addEventListener('click', async () => {
  const btn = document.getElementById('export-all-btn');
  btn.disabled = true;
  btn.textContent = 'Gerando PDF...';
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    for (let i = 0; i < allFichas.length; i++) {
      if (i > 0) doc.addPage();
      await drawFichaPage(doc, allFichas[i]);
    }
    doc.save('minha-biblioteca.pdf');
  } catch (err) {
    alert('Erro ao gerar PDF: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '⬇ Exportar estante (PDF)';
  }
});

function populateTemaFilter() {
  const select = document.getElementById('filter-tema');
  const usedKeys = new Set();
  allFichas.forEach((f) => (f.temas || []).forEach((k) => usedKeys.add(k)));
  TEMAS.filter((t) => usedKeys.has(t.key)).forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.key;
    opt.textContent = t.label;
    select.appendChild(opt);
  });
}

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function applyFilters() {
  const term = normalize(document.getElementById('search-input').value.trim());
  const tema = document.getElementById('filter-tema').value;
  const minRating = parseInt(document.getElementById('filter-avaliacao').value, 10) || 0;

  let filtered = allFichas;

  if (term) {
    filtered = filtered.filter(
      (f) =>
        normalize(f.nome_ficha).includes(term) ||
        normalize(f.titulo).includes(term) ||
        normalize(f.autor).includes(term)
    );
  }
  if (tema) {
    filtered = filtered.filter((f) => (f.temas || []).includes(tema));
  }
  if (minRating) {
    filtered = filtered.filter((f) => (f.avaliacao || 0) >= minRating);
  }

  renderGrid(filtered);
}

const STAT_CARDS_DEF = [
  { accent: '#8b6df0', icon: 'book', key: 'totalLivros', label: 'Livros na estante', link: 'Ver todos →', href: '#fichas-grid' },
  { accent: '#34c58f', icon: 'fileText', key: 'totalPaginas', label: 'Páginas registradas', link: 'Ver progresso →', href: 'estatisticas.html' },
  { accent: '#e0b84a', icon: 'star', key: 'mediaAvaliacao', label: 'Avaliação média', link: 'Ver avaliações →', href: 'estatisticas.html' },
  { accent: '#e0607a', icon: 'tag', key: 'temaTopo', label: 'Tema mais lido', link: 'Explorar temas →', href: 'temas.html' },
];

function renderStats(fichas) {
  const stats = computeStats(fichas);
  const values = {
    totalLivros: stats.totalLivros,
    totalPaginas: stats.totalPaginas.toLocaleString('pt-BR'),
    mediaAvaliacao: stats.mediaAvaliacao ? stats.mediaAvaliacao.toFixed(1) : '—',
    temaTopo: stats.temaTopo,
  };

  const row = document.getElementById('stat-cards-row');
  row.innerHTML = STAT_CARDS_DEF.map(
    (c) => `
      <div class="stat-card-dark" style="--accent:${c.accent}">
        <div class="icon">${icon(c.icon)}</div>
        <div class="value">${values[c.key]}</div>
        <div class="label">${c.label}</div>
        <a class="link" href="${c.href}">${c.link}</a>
      </div>`
  ).join('');
}

const DICA_CARD_HTML = `
  <div class="dica-card">
    <svg class="dica-illustration" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="46" width="50" height="8" rx="2" fill="#2d4a7a"/>
      <rect x="18" y="38" width="42" height="8" rx="2" fill="#3f7a5c"/>
      <rect x="22" y="30" width="34" height="8" rx="2" fill="#c0622e"/>
      <path d="M40 10 q6 0 6 8 v6 h-12 v-6 q0 -8 6 -8Z" fill="#8b6df0" opacity="0.85"/>
      <rect x="34" y="24" width="12" height="6" rx="1" fill="#6d54d8"/>
      <circle cx="40" cy="14" r="2" fill="#f0d98c"/>
    </svg>
    <h4>${icon('sparkle')} Dica de explorador</h4>
    <p>Mantenha suas fichas sempre atualizadas! Assim você acompanha sua jornada e descobre novas aventuras.</p>
  </div>
`;

function renderGrid(list) {
  const grid = document.getElementById('fichas-grid');
  const emptyState = document.getElementById('empty-state');
  const noResultsState = document.getElementById('no-results-state');

  if (list.length === 0) {
    grid.classList.add('hidden');
    emptyState.classList.add('hidden');
    noResultsState.classList.remove('hidden');
    return;
  }

  noResultsState.classList.add('hidden');
  emptyState.classList.add('hidden');
  grid.classList.remove('hidden');
  grid.innerHTML = list.map(renderCard).join('') + DICA_CARD_HTML;
  bindDeleteButtons();
  bindMenuToggles();
}

function bindMenuToggles() {
  document.querySelectorAll('.ficha-menu-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dropdown = document.getElementById(`menu-${btn.dataset.menuToggle}`);
      const isHidden = dropdown.classList.contains('hidden');
      document.querySelectorAll('.ficha-menu-dropdown').forEach((d) => d.classList.add('hidden'));
      if (isHidden) dropdown.classList.remove('hidden');
    });
  });
}

document.addEventListener('click', () => {
  document.querySelectorAll('.ficha-menu-dropdown').forEach((d) => d.classList.add('hidden'));
});

function bindDeleteButtons() {
  document.querySelectorAll('.btn-delete-ficha').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      if (!confirm('Excluir esta ficha permanentemente?')) return;

      btn.disabled = true;

      if (!navigator.onLine) {
        enqueueDelete(id);
        allFichas = allFichas.filter((f) => f.id !== id);
        cacheFichas(allFichas);
        renderStats(allFichas);
        applyFilters();
        return;
      }

      try {
        await deleteFicha(id);
      } catch (err) {
        alert('Erro ao excluir: ' + err.message);
        btn.disabled = false;
        return;
      }
      allFichas = allFichas.filter((f) => f.id !== id);
      cacheFichas(allFichas);
      renderStats(allFichas);
      applyFilters();
    });
  });
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function renderCard(f) {
  const cover = f.capa_path
    ? `<img src="${escapeHtml(f.capa_path)}" alt="Capa de ${escapeHtml(f.titulo)}" crossorigin="anonymous">`
    : `<span class="placeholder">Sem capa</span>`;

  return `
    <div class="ficha-card">
      <div class="ficha-cover-wrap">
        <a href="ficha-view.html?id=${f.id}" class="ficha-cover">${cover}</a>
        <div class="ficha-menu">
          <button class="ficha-menu-btn" data-menu-toggle="${f.id}" aria-label="Mais opções">${icon('dots')}</button>
          <div class="ficha-menu-dropdown hidden" id="menu-${f.id}">
            <a href="ficha-view.html?id=${f.id}">${icon('fileText')} Abrir</a>
            <a href="ficha-form.html?id=${f.id}">${icon('gear')} Editar</a>
            <button class="btn-delete-ficha" data-id="${f.id}">${icon('trash')} Excluir</button>
          </div>
        </div>
      </div>
      <div class="ficha-info">
        <span class="tab-label">${escapeHtml(f.nome_ficha)}</span>
        <h3>${escapeHtml(f.titulo) || '(sem título)'}</h3>
        <span class="meta">${escapeHtml(f.autor) || ''}</span>
        <div class="ficha-rating-row">
          <span class="ficha-stars">${starsDisplay(f.avaliacao)}</span>
          ${f.avaliacao ? `<span class="rating-badge">${f.avaliacao}.0</span>` : ''}
        </div>
        ${f.inicio_leitura ? `<span class="meta">${icon('calendar')} Início: ${formatDate(f.inicio_leitura)}</span>` : ''}
      </div>
    </div>
  `;
}
