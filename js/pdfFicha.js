import { TEMAS } from './supabaseClient.js';

export async function fetchImageAsDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function formatDateBR(isoDate) {
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export async function drawFichaPage(doc, f) {
  const NAVY = '#1c2f4a';
  const GOLD = '#b08d3f';
  const INK = '#2b2620';
  const pageW = 595;
  const pageH = 842;

  // Moldura decorativa (borda dupla)
  doc.setDrawColor(NAVY);
  doc.setLineWidth(1.5);
  doc.rect(24, 24, pageW - 48, pageH - 48);
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.75);
  doc.rect(32, 32, pageW - 64, pageH - 64);

  const leftX = 60;
  const rightX = 262;
  const rightMargin = pageW - 60;

  // Cabeçalho "FICHA DE leitura"
  doc.setTextColor('#999999');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('CAPA DO LIVRO', leftX, 58);

  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('FICHA DE', rightX, 62);
  doc.setFontSize(30);
  doc.text('leitura', rightX, 92);
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1);
  doc.line(rightX, 100, rightMargin, 100);

  // Divisória vertical entre as colunas
  doc.setDrawColor('#e3dac8');
  doc.setLineWidth(0.75);
  doc.line(225, 58, 225, pageH - 60);

  // Capa
  const coverY = 72;
  const coverW = 150;
  const coverH = 215;
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

  // Nome da ficha (etiqueta)
  doc.setTextColor(GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text((f.nome_ficha || '').toUpperCase(), rightX, 112);

  // Título / Autor / Editora (lado direito)
  const labelValue = (label, value, y) => {
    doc.setTextColor(INK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(label, rightX, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(value || '—', rightX, y + 17);
  };
  labelValue('Título', f.titulo, 138);
  labelValue('Autor', f.autor, 182);
  labelValue('Editora', f.editora, 226);

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
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.text('Temas abordados:', leftX, leftY);
  leftY += 20;
  const selectedTemas = f.temas || [];
  TEMAS.forEach((t) => {
    drawCircleOption(doc, leftX, leftY, t.label, selectedTemas.includes(t.key), NAVY, INK);
    leftY += 19;
  });

  // Ornamento decorativo de fechamento da coluna esquerda
  leftY += 24;
  const ornamentCx = leftX + 60;
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.75);
  doc.line(leftX, leftY, ornamentCx - 10, leftY);
  doc.line(ornamentCx + 10, leftY, leftX + 130, leftY);
  drawStar(doc, ornamentCx, leftY, 5, GOLD);

  // Início / término da leitura (lado direito)
  let rightY = 264;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.text('início da leitura', rightX, rightY);
  doc.text('término da leitura', rightX + 150, rightY);
  rightY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(formatDateBR(f.inicio_leitura) || '—', rightX, rightY);
  drawArrow(doc, rightX + 122, rightY - 4, 18, INK);
  doc.text(formatDateBR(f.termino_leitura) || '—', rightX + 150, rightY);
  rightY += 34;

  // Frase favorita / Personagens / Críticas (lado direito, em caixas com borda)
  const textBox = (title, value, y, boxHeight, lines) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(NAVY);
    doc.text(title, rightX, y);
    y += 12;

    doc.setDrawColor('#d8cdb0');
    doc.setLineWidth(0.75);
    doc.roundedRect(rightX, y, rightMargin - rightX, boxHeight, 4, 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(INK);
    const wrapped = doc.splitTextToSize(value || '—', rightMargin - rightX - 20);
    doc.text(wrapped.slice(0, lines), rightX + 10, y + 18);

    return y + boxHeight + 22;
  };

  rightY = textBox('Frase favorita', f.frase_favorita, rightY, 70, 4);
  rightY = textBox('Personagens', f.personagens, rightY, 80, 5);
  rightY = textBox('Críticas', f.criticas, rightY, 150, 9);

  // Rodapé
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#a89a78');
  const geradoEm = new Date().toLocaleDateString('pt-BR');
  doc.text(`Ficha gerada em ${geradoEm} · Biblioteca Pessoal`, pageW / 2, pageH - 42, { align: 'center' });
}

export function drawStar(doc, cx, cy, outerR, color) {
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

export function drawArrow(doc, x, y, length, color) {
  doc.setDrawColor(color);
  doc.setFillColor(color);
  doc.setLineWidth(1);
  doc.line(x, y, x + length - 4, y);
  doc.triangle(x + length - 4, y - 3, x + length - 4, y + 3, x + length, y, 'F');
}

export function drawCircleOption(doc, x, y, label, checked, navy, ink) {
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
