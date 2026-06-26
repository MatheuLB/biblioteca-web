import { supabase, TEMAS } from './supabaseClient.js';
import { requireSession, bindLogout, starsDisplay, escapeHtml } from './common.js';
import { drawFichaPage } from './pdfFicha.js';
import { initThemeToggle } from './theme.js';

bindLogout();
initThemeToggle();

const params = new URLSearchParams(window.location.search);
const fichaId = params.get('id');

let currentFicha = null;

(async () => {
  const session = await requireSession();
  if (!session) return;

  if (!fichaId) {
    window.location.href = 'dashboard.html';
    return;
  }

  const { data: ficha, error } = await supabase.from('fichas').select('*').eq('id', fichaId).single();

  document.getElementById('loading-state').classList.add('hidden');

  if (error || !ficha) {
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('loading-state').textContent = 'Ficha não encontrada.';
    return;
  }

  currentFicha = ficha;
  renderFicha(ficha);
  document.getElementById('ficha-detail').classList.remove('hidden');
})();

function renderFicha(f) {
  document.getElementById('ficha-cover').innerHTML = f.capa_path
    ? `<img src="${escapeHtml(f.capa_path)}" alt="Capa">`
    : `<span class="placeholder">Sem capa</span>`;

  document.getElementById('ficha-nome').textContent = f.nome_ficha || '';
  document.getElementById('ficha-titulo').textContent = f.titulo || '(sem título)';
  document.getElementById('ficha-autor').textContent = f.autor || '';
  document.getElementById('ficha-stars').textContent = starsDisplay(f.avaliacao);
  document.getElementById('ficha-editora').textContent = f.editora || '-';
  document.getElementById('ficha-paginas').textContent = f.numero_paginas || '-';
  document.getElementById('ficha-tipo').textContent =
    f.tipo === 'fisico' ? 'Físico' : f.tipo === 'digital' ? 'Digital' : '-';
  document.getElementById('ficha-inicio').textContent = f.inicio_leitura || '-';
  document.getElementById('ficha-termino').textContent = f.termino_leitura || '-';
  document.getElementById('ficha-frase').textContent = f.frase_favorita || '-';
  document.getElementById('ficha-personagens').textContent = f.personagens || '-';
  document.getElementById('ficha-criticas').textContent = f.criticas || '-';

  const temas = f.temas || [];
  document.getElementById('ficha-temas').innerHTML = TEMAS.filter((t) => temas.includes(t.key))
    .map((t) => `<span class="tema-tag">${t.label}</span>`)
    .join('');

  document.getElementById('edit-link').href = `ficha-form.html?id=${f.id}`;
}

document.getElementById('delete-btn').addEventListener('click', async () => {
  if (!confirm('Excluir esta ficha permanentemente?')) return;
  await supabase.from('fichas').delete().eq('id', fichaId);
  window.location.href = 'dashboard.html';
});

document.getElementById('export-pdf-btn').addEventListener('click', async () => {
  const btn = document.getElementById('export-pdf-btn');
  btn.disabled = true;
  btn.textContent = 'Gerando PDF...';
  try {
    await exportPdf(currentFicha);
  } catch (err) {
    alert('Erro ao gerar PDF: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '⬇ Exportar PDF';
  }
});

async function exportPdf(f) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  await drawFichaPage(doc, f);
  const filename = `ficha-${(f.nome_ficha || 'leitura').replace(/[^a-z0-9-_]+/gi, '_')}.pdf`;
  doc.save(filename);
}
