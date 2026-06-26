const CACHE_VERSION = 'biblioteca-v1';
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
  'js/supabaseClient.js',
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

function isSupabaseRequest(url) {
  return url.hostname.endsWith('.supabase.co');
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

  // Dados da API (PostgREST): network-first, com fallback para o cache quando offline
  if (isSupabaseRequest(url) && url.pathname.includes('/rest/v1/')) {
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

  // Capas de livro e fontes externas: stale-while-revalidate
  if (isSupabaseRequest(url) && url.pathname.includes('/storage/')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const fetchPromise = fetch(req)
            .then((res) => {
              cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || fetchPromise;
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
