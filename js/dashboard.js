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
})();

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
      </div>
    </div>
  `;
}
