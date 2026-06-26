import { supabase, TEMAS } from './supabaseClient.js';
import { requireSession, bindLogout } from './common.js';

bindLogout();

const params = new URLSearchParams(window.location.search);
const fichaId = params.get('id');

const temasGrid = document.getElementById('temas-grid');
temasGrid.innerHTML = TEMAS.map(
  (t) => `<label><input type="checkbox" data-tema="${t.key}"> ${t.label}</label>`
).join('');

let session = null;
let existingCapaPath = null;
let removeOldCoverFile = null;

(async () => {
  session = await requireSession();
  if (!session) return;

  if (fichaId) {
    document.getElementById('form-title').textContent = 'Editar ficha';
    document.getElementById('submit-btn').textContent = 'Salvar alterações';
    await loadFicha(fichaId);
  }
})();

async function loadFicha(id) {
  const { data: ficha, error } = await supabase.from('fichas').select('*').eq('id', id).single();
  if (error || !ficha) {
    showError('Ficha não encontrada.');
    return;
  }

  document.getElementById('ficha-id').value = ficha.id;
  document.getElementById('nome_ficha').value = ficha.nome_ficha || '';
  document.getElementById('titulo').value = ficha.titulo || '';
  document.getElementById('autor').value = ficha.autor || '';
  document.getElementById('editora').value = ficha.editora || '';
  document.getElementById('numero_paginas').value = ficha.numero_paginas || '';
  document.getElementById('inicio_leitura').value = ficha.inicio_leitura || '';
  document.getElementById('termino_leitura').value = ficha.termino_leitura || '';
  document.getElementById('frase_favorita').value = ficha.frase_favorita || '';
  document.getElementById('personagens').value = ficha.personagens || '';
  document.getElementById('criticas').value = ficha.criticas || '';

  if (ficha.avaliacao) {
    const star = document.getElementById('star' + ficha.avaliacao);
    if (star) star.checked = true;
  }
  if (ficha.tipo) {
    const tipoInput = document.querySelector(`input[name="tipo"][value="${ficha.tipo}"]`);
    if (tipoInput) tipoInput.checked = true;
  }

  const temas = ficha.temas || [];
  temas.forEach((key) => {
    const cb = document.querySelector(`input[data-tema="${key}"]`);
    if (cb) cb.checked = true;
  });

  if (ficha.capa_path) {
    existingCapaPath = ficha.capa_path;
    const preview = document.getElementById('cover-preview');
    preview.src = ficha.capa_path;
    preview.classList.remove('hidden');
  }
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}

document.getElementById('capa').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('cover-preview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
});

document.getElementById('ficha-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    const nomeFicha = document.getElementById('nome_ficha').value.trim();
    if (!nomeFicha) {
      showError('Dê um nome para a ficha.');
      submitBtn.disabled = false;
      submitBtn.textContent = fichaId ? 'Salvar alterações' : 'Criar ficha';
      return;
    }

    const temasSelecionados = TEMAS.filter(
      (t) => document.querySelector(`input[data-tema="${t.key}"]`).checked
    ).map((t) => t.key);

    const avaliacaoInput = document.querySelector('input[name="avaliacao"]:checked');
    const tipoInput = document.querySelector('input[name="tipo"]:checked');

    let capaPath = existingCapaPath;
    const fileInput = document.getElementById('capa');
    if (fileInput.files[0]) {
      capaPath = await uploadCover(fileInput.files[0]);
    }

    const payload = {
      nome_ficha: nomeFicha,
      titulo: document.getElementById('titulo').value || null,
      autor: document.getElementById('autor').value || null,
      editora: document.getElementById('editora').value || null,
      numero_paginas: parseInt(document.getElementById('numero_paginas').value, 10) || null,
      avaliacao: avaliacaoInput ? parseInt(avaliacaoInput.value, 10) : 0,
      tipo: tipoInput ? tipoInput.value : null,
      temas: temasSelecionados,
      inicio_leitura: document.getElementById('inicio_leitura').value || null,
      termino_leitura: document.getElementById('termino_leitura').value || null,
      frase_favorita: document.getElementById('frase_favorita').value || null,
      personagens: document.getElementById('personagens').value || null,
      criticas: document.getElementById('criticas').value || null,
      capa_path: capaPath,
    };

    let savedId = fichaId;
    if (fichaId) {
      const { error } = await supabase.from('fichas').update(payload).eq('id', fichaId);
      if (error) throw error;
    } else {
      payload.user_id = session.user.id;
      const { data, error } = await supabase.from('fichas').insert(payload).select('id').single();
      if (error) throw error;
      savedId = data.id;
    }

    window.location.href = `ficha-view.html?id=${savedId}`;
  } catch (err) {
    showError('Erro ao salvar: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = fichaId ? 'Salvar alterações' : 'Criar ficha';
  }
});

async function uploadCover(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const filename = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from('covers').upload(filename, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('covers').getPublicUrl(filename);
  return data.publicUrl;
}
