const CACHE_NAME = 'prestasi-smknesbu-v4';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './styles.css',
  './app.js',
  './admin.js',
  './logo.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Check if it's an external API request (Google Sheets / Drive)
  const isExternalApi = url.hostname.includes('google.com') || url.hostname.includes('googleapis.com');
  
  // Check if it is a local asset
  const isLocalAsset = ASSETS.some(asset => {
    const assetUrl = new URL(asset, self.location.href);
    return assetUrl.pathname === url.pathname;
  }) || url.origin === self.location.origin;

  if (isExternalApi || !isLocalAsset) {
    // Network Only for external APIs or non-local assets
    return;
  }

  // Network-first: selalu coba ambil versi terbaru dari server dulu.
  // Cache hanya dipakai sebagai fallback saat offline / network gagal,
  // sehingga deploy baru langsung terlihat tanpa perlu refresh berkali-kali
  // atau menaikkan CACHE_NAME secara manual.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('./index.html'))
      )
  );
});