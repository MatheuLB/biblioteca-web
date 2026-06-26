import { supabase } from './supabaseClient.js';
import { requireSession, bindLogout, starsDisplay, escapeHtml } from './common.js';

bindLogout();

(async () => {
  const session = await requireSession();
  if (!session) return;

  const { data: fichas, error } = await supabase
    .from('fichas')
    .select('*')
    .order('inicio_leitura', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });

  document.getElementById('loading-state').classList.add('hidden');

  if (error) {
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('loading-state').textContent = 'Erro ao carregar fichas: ' + error.message;
    return;
  }

  if (!fichas || fichas.length === 0) {
    document.getElementById('empty-state').classList.remove('hidden');
    return;
  }

  const grid = document.getElementById('fichas-grid');
  grid.classList.remove('hidden');
  grid.innerHTML = fichas.map(renderCard).join('');
  bindDeleteButtons();
})();

function bindDeleteButtons() {
  document.querySelectorAll('.btn-delete-ficha').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const card = btn.closest('.ficha-card');
      const id = btn.dataset.id;
      if (!confirm('Excluir esta ficha permanentemente?')) return;

      btn.disabled = true;
      const { error } = await supabase.from('fichas').delete().eq('id', id);
      if (error) {
        alert('Erro ao excluir: ' + error.message);
        btn.disabled = false;
        return;
      }
      card.remove();
      if (!document.querySelector('.ficha-card')) {
        document.getElementById('fichas-grid').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
      }
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
    ? `<img src="${escapeHtml(f.capa_path)}" alt="Capa de ${escapeHtml(f.titulo)}">`
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
