import { listFichas, fetchMe, updateMetaAnual, livrosLidosNoAno } from './apiClient.js';
import { requireSession, escapeHtml } from './common.js?v=2';
import { renderSidebar } from './appShell.js';

const year = new Date().getFullYear();
let currentMeta = 12;

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function render(fichas, meta) {
  const lidos = livrosLidosNoAno(fichas, year);
  const pct = Math.min(100, Math.round((lidos / meta) * 100));

  document.getElementById('jornada-ano').textContent = year;
  document.getElementById('jornada-resumo').textContent = `Você já leu ${lidos} de ${meta} livro${meta === 1 ? '' : 's'} planejados para este ano.`;
  document.getElementById('jornada-bar-fill').style.width = `${pct}%`;
  document.getElementById('jornada-meta-label').textContent = `Meta anual: ${meta} livros`;
  document.getElementById('jornada-pct').textContent = `${pct}%`;
  document.getElementById('meta-input').value = meta;

  const concluidos = fichas
    .filter((f) => f.termino_leitura && f.termino_leitura.startsWith(String(year)))
    .sort((a, b) => b.termino_leitura.localeCompare(a.termino_leitura));

  const listEl = document.getElementById('concluidos-list');
  if (concluidos.length === 0) {
    listEl.innerHTML = '<p style="color:#7c87a3; font-size:13px;">Nenhum livro concluído registrado em ' + year + ' ainda.</p>';
    return;
  }
  listEl.innerHTML = concluidos
    .map(
      (f) => `
      <div class="stat-bar-row" style="align-items:center;">
        <a href="ficha-view.html?id=${f.id}" style="flex:1; color:#e7ebf5; font-weight:600; font-size:14px; text-decoration:none;">${escapeHtml(f.titulo || f.nome_ficha)}</a>
        <span style="color:#9aa4bd; font-size:13px; margin-right:14px;">${escapeHtml(f.autor) || ''}</span>
        <span style="color:#7c87a3; font-size:12px; width:90px; text-align:right;">${formatDate(f.termino_leitura)}</span>
      </div>`
    )
    .join('');
}

(async () => {
  const session = await requireSession();
  if (!session) return;

  renderSidebar('Minha jornada');

  let me = null;
  let fichas = [];
  try {
    [me, fichas] = await Promise.all([fetchMe(), listFichas()]);
  } catch (e) {
    fichas = [];
  }

  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('jornada-content').classList.remove('hidden');

  currentMeta = (me && me.meta_anual) || 12;
  render(fichas, currentMeta);

  document.getElementById('meta-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('meta-error');
    const successEl = document.getElementById('meta-success');
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    const novaMeta = parseInt(document.getElementById('meta-input').value, 10);
    if (!novaMeta || novaMeta < 1) {
      errorEl.textContent = 'Informe um número válido de livros.';
      errorEl.classList.remove('hidden');
      return;
    }

    const btn = document.getElementById('meta-save-btn');
    btn.disabled = true;
    btn.textContent = 'Salvando...';
    try {
      await updateMetaAnual(novaMeta);
      currentMeta = novaMeta;
      render(fichas, currentMeta);
      successEl.textContent = 'Meta atualizada com sucesso!';
      successEl.classList.remove('hidden');
    } catch (err) {
      errorEl.textContent = 'Não foi possível salvar a meta: ' + err.message;
      errorEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salvar meta';
    }
  });
})();
