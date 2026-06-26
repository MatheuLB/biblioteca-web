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

function formatDateBR(isoDate) {
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

async function exportPdf(f) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const NAVY = '#1c2f4a';
  const GOLD = '#b08d3f';
  const INK = '#2b2620';

  const leftX = 50;
  const rightX = 250;
  const pageW = 595;

  // Cabeçalho "FICHA DE leitura"
  doc.setTextColor('#999999');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('CAPA DO LIVRO', leftX, 45);

  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('FICHA DE', rightX, 50);
  doc.setFontSize(28);
  doc.text('leitura', rightX, 78);

  // Capa
  const coverY = 60;
  const coverW = 150;
  const coverH = 210;
  doc.setDrawColor(NAVY);
  doc.setLineWidth(1.2);
  doc.rect(leftX, coverY, coverW, coverH);

  if (f.capa_path) {
    try {
      const dataUrl = await fetchImageAsDataUrl(f.capa_path);
      const format = dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(dataUrl, format, leftX + 4, coverY + 4, coverW - 8, coverH - 8, undefined, 'FAST');
    } catch (e) {
      doc.setTextColor('#999999');
      doc.setFontSize(9);
      doc.text('Sem capa', leftX + coverW / 2, coverY + coverH / 2, { align: 'center' });
    }
  } else {
    doc.setTextColor('#999999');
    doc.setFontSize(9);
    doc.text('Sem capa', leftX + coverW / 2, coverY + coverH / 2, { align: 'center' });
  }

  // Estrelas abaixo da capa (desenhadas, pois fontes padrão não têm glifo de estrela)
  const rating = Math.max(0, Math.min(5, f.avaliacao || 0));
  let starX = leftX + 6;
  const starY = coverY + coverH + 20;
  for (let i = 0; i < 5; i++) {
    drawStar(doc, starX, starY, 6, i < rating ? GOLD : '#cccccc');
    starX += 20;
  }

  // Título / Autor / Editora (lado direito, estilo "linha para preencher")
  const labelValue = (label, value, y) => {
    doc.setTextColor(INK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(label, rightX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value || '—', rightX + doc.getTextWidth(label) + 4, y);
    doc.setDrawColor('#cccccc');
    doc.setLineWidth(0.5);
    doc.line(rightX, y + 6, pageW - 50, y + 6);
  };
  labelValue('Título:', f.titulo, 110);
  labelValue('Autor:', f.autor, 145);
  labelValue('Editora:', f.editora, 180);

  // N° de páginas e tipo de livro (abaixo da capa, esquerda)
  let leftY = coverY + coverH + 55;
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`N° de páginas: ${f.numero_paginas || '—'}`, leftX, leftY);
  leftY += 22;

  doc.text('Livro:', leftX, leftY);
  leftY += 18;
  drawCircleOption(doc, leftX, leftY, 'Físico', f.tipo === 'fisico', NAVY, INK);
  leftY += 18;
  drawCircleOption(doc, leftX, leftY, 'Digital', f.tipo === 'digital', NAVY, INK);
  leftY += 28;

  // Temas abordados (checklist, como no modelo original)
  doc.setFont('helvetica', 'normal');
  doc.text('Temas abordados:', leftX, leftY);
  leftY += 18;
  const selectedTemas = f.temas || [];
  TEMAS.forEach((t) => {
    drawCircleOption(doc, leftX, leftY, t.label, selectedTemas.includes(t.key), NAVY, INK);
    leftY += 17;
  });

  // Início / término da leitura (lado direito)
  let rightY = 215;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.text('início da leitura', rightX, rightY);
  doc.text('término da leitura', rightX + 150, rightY);
  rightY += 18;
  doc.setFont('helvetica', 'bold');
  doc.text(formatDateBR(f.inicio_leitura) || '—', rightX, rightY);
  drawArrow(doc, rightX + 122, rightY - 4, 18, INK);
  doc.text(formatDateBR(f.termino_leitura) || '—', rightX + 150, rightY);
  rightY += 35;

  // Frase favorita / Personagens / Críticas (lado direito, com linhas)
  const textBlock = (title, value, y, lines = 3) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(INK);
    doc.text(title, rightX, y);
    y += 16;
    doc.setFontSize(10);
    const wrapped = doc.splitTextToSize(value || '—', pageW - 50 - rightX);
    doc.text(wrapped.slice(0, lines), rightX, y);
    for (let i = 0; i < lines; i++) {
      doc.setDrawColor('#cccccc');
      doc.setLineWidth(0.5);
      doc.line(rightX, y + i * 14 + 4, pageW - 50, y + i * 14 + 4);
    }
    return y + lines * 14 + 14;
  };

  rightY = textBlock('Frase favorita:', f.frase_favorita, rightY, 3);
  rightY = textBlock('Personagens:', f.personagens, rightY, 3);
  rightY = textBlock('Críticas:', f.criticas, rightY, 4);

  const filename = `ficha-${(f.nome_ficha || 'leitura').replace(/[^a-z0-9-_]+/gi, '_')}.pdf`;
  doc.save(filename);
}

function drawStar(doc, cx, cy, outerR, color) {
  const innerR = outerR * 0.42;
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    points.push([cx + r * Math.cos(angle), cy - r * Math.sin(angle)]);
  }
  doc.setFillColor(color);
  doc.setDrawColor(color);
  doc.setLineWidth(0.4);
  const lines = [];
  for (let i = 1; i < points.length; i++) {
    lines.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
  }
  lines.push([points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]]);
  doc.lines(lines, points[0][0], points[0][1], [1, 1], 'FD', true);
}

function drawArrow(doc, x, y, length, color) {
  doc.setDrawColor(color);
  doc.setFillColor(color);
  doc.setLineWidth(1);
  doc.line(x, y, x + length - 4, y);
  doc.triangle(x + length - 4, y - 3, x + length - 4, y + 3, x + length, y, 'F');
}

function drawCircleOption(doc, x, y, label, checked, navy, ink) {
  const r = 5;
  doc.setDrawColor(navy);
  doc.setLineWidth(1);
  doc.circle(x + r, y - 4, r, checked ? 'FD' : 'D');
  if (checked) {
    doc.setFillColor(navy);
    doc.circle(x + r, y - 4, r, 'F');
  }
  doc.setTextColor(ink);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(label, x + r * 2 + 6, y);
}
