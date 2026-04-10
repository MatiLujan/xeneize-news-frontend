const CACHE = 'xeneize-v1';
const ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;1,700;1,800&family=Barlow:wght@400;500;600&display=swap'
];

// Instalar: cachear assets principales
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches viejas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first para API, cache-first para assets estáticos
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Siempre ir a la red para APIs externas
  if (
    url.hostname === 'xeneize-backend.vercel.app' ||
    url.hostname === 'v3.football.api-sports.io' ||
    url.hostname === 'api.anthropic.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first para el resto (HTML, CSS, JS locales)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => {
        // Offline fallback: devolver index.html para navegación
        if (e.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});
