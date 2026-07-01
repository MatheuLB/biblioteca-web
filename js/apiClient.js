export const API_BASE = 'https://raspberrypi.tail4f88e2.ts.net';

export const FIXED_EMAIL = 'matheuslazzarottobortolini@outlook.com';

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

export async function login(password) {
  const body = await request('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: FIXED_EMAIL, password }),
  });
  setToken(body.access_token);
}

export function logout() {
  clearToken();
}

export async function fetchMe() {
  return request('/me');
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
