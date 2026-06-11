// Orangesi POS — Service Worker
// Caches all assets for full offline support

const CACHE_NAME = 'orangesi-pos-v7';
const OFFLINE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  // External CDN — cached on first load
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.11.0/dist/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.11.0/dist/fonts/tabler-icons.woff2',
];

// ── Install: cache everything ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        OFFLINE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('Cache miss:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first, fallback to network ──
self.addEventListener('fetch', event => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache dynamically
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
