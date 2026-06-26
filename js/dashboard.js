import { supabase, TEMAS } from './supabaseClient.js';
import { requireSession, bindLogout, starsDisplay, escapeHtml, initOfflineBanner } from './common.js?v=2';
import { drawFichaPage } from './pdfFicha.js';
import { initThemeToggle } from './theme.js';
import { registerServiceWorker } from './pwa.js';
import { cacheFichas, getCachedFichas, enqueueDelete, flushQueue } from './offlineQueue.js';

bindLogout();
initThemeToggle();
registerServiceWorker();
initOfflineBanner(async () => {
  const result = await flushQueue(supabase);
  if (result.synced > 0) {
    const { data: refreshed } = await supabase
      .from('fichas')
      .select('*')
      .order('inicio_leitura', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });
    if (refreshed) {
      allFichas = refreshed;
      cacheFichas(allFichas);
      populateTemaFilter();
      renderStats(allFichas);
      applyFilters();
    }
  }
  return result;
});

let allFichas = [];

(async () => {
  const session = await requireSession();
  if (!session) return;

  const { data: fichas, error } = await supabase
    .from('fichas')
    .select('*')
    .order('inicio_leitura', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });

  document.getElementById('loading-state').classList.add('hidden');

  if (error || !navigator.onLine) {
    allFichas = getCachedFichas();
    if (allFichas.length === 0) {
      document.getElementById('empty-state').classList.remove('hidden');
      return;
    }
  } else {
    if (!fichas || fichas.length === 0) {
      document.getElementById('empty-state').classList.remove('hidden');
      return;
    }
    allFichas = fichas;
    cacheFichas(allFichas);
  }

  document.getElementById('search-bar').classList.remove('hidden');
  document.getElementById('export-all-btn').classList.remove('hidden');
  populateTemaFilter();
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

function renderStats(fichas) {
  const totalLivros = fichas.length;
  const totalPaginas = fichas.reduce((sum, f) => sum + (f.numero_paginas || 0), 0);
  const avaliadas = fichas.filter((f) => f.avaliacao > 0);
  const mediaAvaliacao = avaliadas.length
    ? (avaliadas.reduce((sum, f) => sum + f.avaliacao, 0) / avaliadas.length).toFixed(1)
    : '—';

  const temaCounts = {};
  fichas.forEach((f) => (f.temas || []).forEach((k) => (temaCounts[k] = (temaCounts[k] || 0) + 1)));
  let temaTopo = '—';
  let maxCount = 0;
  Object.entries(temaCounts).forEach(([key, count]) => {
    if (count > maxCount) {
      maxCount = count;
      const temaInfo = TEMAS.find((t) => t.key === key);
      temaTopo = temaInfo ? temaInfo.label : key;
    }
  });

  const stats = [
    { label: 'Livros na estante', value: totalLivros },
    { label: 'Páginas registradas', value: totalPaginas.toLocaleString('pt-BR') },
    { label: 'Avaliação média', value: mediaAvaliacao === '—' ? '—' : `${mediaAvaliacao} ★` },
    { label: 'Tema mais lido', value: temaTopo },
  ];

  const grid = document.getElementById('stats-grid');
  grid.innerHTML = stats
    .map((s) => `<div class="stat-card"><span class="stat-value">${s.value}</span><span class="stat-label">${s.label}</span></div>`)
    .join('');
  grid.classList.remove('hidden');
}

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
  grid.innerHTML = list.map(renderCard).join('');
  bindDeleteButtons();
}

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

      const { error } = await supabase.from('fichas').delete().eq('id', id);
      if (error) {
        alert('Erro ao excluir: ' + error.message);
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

const TRASH_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>`;

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
      <a href="ficha-view.html?id=${f.id}" class="ficha-cover">${cover}</a>
      <div class="ficha-info">
        <span class="tab-label">${escapeHtml(f.nome_ficha)}</span>
        <h3>${escapeHtml(f.titulo) || '(sem título)'}</h3>
        <span class="meta">${escapeHtml(f.autor) || ''}</span>
        <span class="ficha-stars">${starsDisplay(f.avaliacao)}</span>
        ${f.inicio_leitura ? `<span class="meta">Início: ${formatDate(f.inicio_leitura)}</span>` : ''}
      </div>
      <div class="ficha-actions">
        <a href="ficha-view.html?id=${f.id}" class="btn-secondary">Abrir</a>
        <a href="ficha-form.html?id=${f.id}" class="btn-secondary">Editar</a>
        <button class="btn-icon-delete btn-delete-ficha" data-id="${f.id}" title="Excluir ficha" aria-label="Excluir ficha">
          ${TRASH_ICON}
        </button>
      </div>
    </div>
  `;
}
