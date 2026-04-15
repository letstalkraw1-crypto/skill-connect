const CACHE_NAME = 'collabro-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/logo.png'];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(() => {}) // Don't fail install if caching fails
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', e => {
  const { request } = e;

  // Skip non-GET, API calls, socket.io, and chrome-extension
  if (
    request.method !== 'GET' ||
    request.url.includes('/api/') ||
    request.url.includes('/socket.io') ||
    request.url.startsWith('chrome-extension')
  ) return;

  // For navigation requests — serve index.html from cache if offline
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For static assets — cache first, then network
  if (
    request.url.includes('/assets/') ||
    request.url.includes('.js') ||
    request.url.includes('.css') ||
    request.url.includes('.png') ||
    request.url.includes('.jpg') ||
    request.url.includes('.svg')
  ) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Default — network first
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});

// Background sync for offline actions (future use)
self.addEventListener('sync', e => {
  if (e.tag === 'sync-messages') {
    // Handle offline message queue
  }
});
