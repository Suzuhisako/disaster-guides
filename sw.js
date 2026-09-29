const CACHE_NAME = 'disaster-guide-v1';

// All paths use relative addresses suitable for '/disaster-guides/' subfolder scope
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/i18n.js',
  './js/map.js',
  './js/guides.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // External CDN dependencies
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
  // Core prefecture shelter data files
  './locators/content/prefectures/kanagawa.json',
  './locators/content/prefectures/tokyo.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching essential offline assets...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // Quietly fail offline fetch requests
        });

      return cachedResponse || fetchPromise;
    })
  );
});
