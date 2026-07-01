const CACHE_VERSION = 'biblioteca-v3';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_FILES = [
  './',
  'index.html',
  'dashboard.html',
  'ficha-form.html',
  'ficha-view.html',
  'css/style.css',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'js/apiClient.js',
  'js/common.js?v=2',
  'js/theme.js',
  'js/pdfFicha.js',
  'js/coverCrop.js',
  'js/offlineQueue.js',
  'js/pwa.js',
  'js/login.js',
  'js/dashboard.js',
  'js/ficha-form.js',
  'js/ficha-view.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(
        SHELL_FILES.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('Falha ao cachear', url, err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('biblioteca-') && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

const API_HOSTNAME = 'raspberrypi.tail4f88e2.ts.net';

function isApiRequest(url) {
  return url.hostname === API_HOSTNAME;
}

function isSameOriginAsset(url) {
  return url.origin === self.location.origin;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navegação entre páginas: tenta rede, cai pro cache se offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('dashboard.html')))
    );
    return;
  }

  // Assets do próprio site: cache-first
  if (isSameOriginAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            caches.open(SHELL_CACHE).then((cache) => cache.put(req, res.clone()));
            return res;
          })
      )
    );
    return;
  }

  // Dados da API: network-first, com fallback para o cache quando offline
  if (isApiRequest(url) && url.pathname.startsWith('/fichas')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => caches.open(RUNTIME_CACHE).then((cache) => cache.match(req)))
    );
    return;
  }

  // Capas de livro: stale-while-revalidate
  // Importante: nunca cachear nem servir respostas "opacas" (status 0, tipo
  // 'opaque') — elas acontecem quando a requisição é feita em modo no-cors
  // (ex.: <img> sem o atributo crossorigin) e têm o corpo ilegível. Servir
  // uma resposta opaca para um fetch() que precisa ler os bytes (como na
  // geração de PDF) resulta numa imagem vazia que falha silenciosamente.
  if (isApiRequest(url) && url.pathname.startsWith('/capas/')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const usableCached = cached && cached.type !== 'opaque' ? cached : null;
          const fetchPromise = fetch(req)
            .then((res) => {
              if (res.type !== 'opaque') {
                cache.put(req, res.clone());
              }
              return res;
            })
            .catch(() => usableCached);
          return usableCached || fetchPromise;
        })
      )
    );
    return;
  }

  if (url.hostname.includes('fonts.g') || url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(req).then(
          (cached) =>
            cached ||
            fetch(req).then((res) => {
              cache.put(req, res.clone());
              return res;
            })
        )
      )
    );
  }
});
