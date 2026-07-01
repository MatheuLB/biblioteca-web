export const API_BASE = 'https://raspberrypi.tail4f88e2.ts.net';

export const TEMAS = [
  { key: 'romance', label: 'Romance' },
  { key: 'aventura', label: 'Aventura' },
  { key: 'religiao', label: 'Religião' },
  { key: 'fantasia', label: 'Fantasia' },
  { key: 'ficcao_cientifica', label: 'Ficção científica' },
  { key: 'misterio_suspense', label: 'Mistério e suspense' },
  { key: 'ficcao_historica', label: 'Ficção histórica' },
  { key: 'terror', label: 'Terror' },
];

const TOKEN_KEY = 'biblioteca-token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

function errorMessage(body, status) {
  if (body && typeof body.detail === 'string') return body.detail;
  if (body && Array.isArray(body.detail)) return body.detail.map((d) => d.msg).join('; ');
  return `Erro na requisição (${status})`;
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }

  if (!res.ok) {
    throw new Error(errorMessage(body, res.status));
  }
  return body;
}

export async function login(email, password) {
  const body = await request('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  setToken(body.access_token);
}

export async function register(email, password) {
  return request('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  clearToken();
}

export async function fetchMe() {
  return request('/me');
}

export async function updateMetaAnual(metaAnual) {
  return request('/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meta_anual: metaAnual }),
  });
}

export async function listFichas() {
  return request('/fichas');
}

export async function getFicha(id) {
  return request(`/fichas/${id}`);
}

export async function createFicha(payload) {
  return request('/fichas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateFicha(id, payload) {
  return request(`/fichas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteFicha(id) {
  return request(`/fichas/${id}`, { method: 'DELETE' });
}

export async function uploadCapa(blob) {
  const formData = new FormData();
  formData.append('file', blob, 'capa.jpg');
  const body = await request('/upload-capa', { method: 'POST', body: formData });
  return `${API_BASE}${body.url}`;
}

export function computeStats(fichas) {
  const totalLivros = fichas.length;
  const totalPaginas = fichas.reduce((sum, f) => sum + (f.numero_paginas || 0), 0);
  const avaliadas = fichas.filter((f) => f.avaliacao > 0);
  const mediaAvaliacao = avaliadas.length
    ? avaliadas.reduce((sum, f) => sum + f.avaliacao, 0) / avaliadas.length
    : 0;

  const temaCounts = {};
  fichas.forEach((f) => (f.temas || []).forEach((k) => (temaCounts[k] = (temaCounts[k] || 0) + 1)));

  let temaTopoKey = null;
  let maxCount = 0;
  Object.entries(temaCounts).forEach(([key, count]) => {
    if (count > maxCount) {
      maxCount = count;
      temaTopoKey = key;
    }
  });
  const temaTopo = temaTopoKey ? (TEMAS.find((t) => t.key === temaTopoKey)?.label || temaTopoKey) : '—';

  return { totalLivros, totalPaginas, mediaAvaliacao, temaTopo, temaCounts };
}

export function livrosLidosNoAno(fichas, year = new Date().getFullYear()) {
  return fichas.filter((f) => f.termino_leitura && f.termino_leitura.startsWith(String(year))).length;
}

export function sortFichas(list) {
  return [...list].sort((a, b) => {
    const ai = a.inicio_leitura;
    const bi = b.inicio_leitura;
    if (ai !== bi) {
      if (!ai) return 1;
      if (!bi) return -1;
      if (ai !== bi) return ai < bi ? 1 : -1;
    }
    return (b.updated_at || '').localeCompare(a.updated_at || '');
  });
}
