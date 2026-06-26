import { supabase, TEMAS } from './supabaseClient.js';
import { requireSession, bindLogout, starsDisplay, escapeHtml } from './common.js';

bindLogout();

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

async function fetchImageAsDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function exportPdf(f) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const NAVY = '#1c2f4a';
  const GOLD = '#b08d3f';
  const CREAM = '#f7f1e3';

  doc.setFillColor(NAVY);
  doc.rect(0, 0, 595, 90, 'F');
  doc.setTextColor(CREAM);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('FICHA DE LEITURA', 50, 45);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(f.nome_ficha || '', 50, 65);

  const leftX = 50;
  const rightX = 230;
  const topY = 120;
  const coverW = 150;
  const coverH = 210;

  doc.setDrawColor(NAVY);
  doc.setLineWidth(1.5);
  doc.rect(leftX, topY, coverW, coverH);

  if (f.capa_path) {
    try {
      const dataUrl = await fetchImageAsDataUrl(f.capa_path);
      const format = dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(dataUrl, format, leftX + 5, topY + 5, coverW - 10, coverH - 10, undefined, 'FAST');
    } catch (e) {
      doc.setTextColor('#999999');
      doc.setFontSize(9);
      doc.text('Sem capa', leftX + coverW / 2, topY + coverH / 2, { align: 'center' });
    }
  } else {
    doc.setTextColor('#999999');
    doc.setFontSize(9);
    doc.text('Sem capa', leftX + coverW / 2, topY + coverH / 2, { align: 'center' });
  }

  const rating = Math.max(0, Math.min(5, f.avaliacao || 0));
  doc.setFontSize(16);
  doc.setTextColor(GOLD);
  let starX = leftX;
  for (let i = 0; i < 5; i++) {
    doc.setTextColor(i < rating ? GOLD : '#cccccc');
    doc.text('★', starX, topY + coverH + 24);
    starX += 18;
  }

  doc.setTextColor('#000000');
  doc.setFontSize(10);
  let infoY = topY + coverH + 52;
  const infoLine = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, leftX, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(' ' + (value || '-'), leftX + doc.getTextWidth(label), infoY);
    infoY += 16;
  };
  infoLine('Páginas:', String(f.numero_paginas || '-'));
  infoLine('Tipo:', f.tipo === 'fisico' ? 'Físico' : f.tipo === 'digital' ? 'Digital' : '-');
  infoLine('Início:', f.inicio_leitura);
  infoLine('Término:', f.termino_leitura);

  let ry = topY;
  const rightBlock = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(NAVY);
    doc.text(label, rightX, ry);
    ry += 16;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#000000');
    const lines = doc.splitTextToSize(value || '-', 320);
    doc.text(lines, rightX, ry);
    ry += 16 * lines.length + 16;
  };

  rightBlock('Título', f.titulo);
  rightBlock('Autor', f.autor);
  rightBlock('Editora', f.editora);

  const temasLabels =
    TEMAS.filter((t) => (f.temas || []).includes(t.key))
      .map((t) => t.label)
      .join(', ') || '-';
  rightBlock('Temas abordados', temasLabels);

  let y = Math.max(infoY + 20, ry + 20);
  if (y > 700) {
    doc.addPage();
    y = 60;
  }

  const section = (title, value) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(NAVY);
    doc.text(title, leftX, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#000000');
    const lines = doc.splitTextToSize(value || '-', 495);
    doc.text(lines, leftX, y);
    y += 14 * lines.length + 20;
    if (y > 750) {
      doc.addPage();
      y = 60;
    }
  };

  section('Frase favorita', f.frase_favorita);
  section('Personagens', f.personagens);
  section('Críticas', f.criticas);

  const filename = `ficha-${(f.nome_ficha || 'leitura').replace(/[^a-z0-9-_]+/gi, '_')}.pdf`;
  doc.save(filename);
}
