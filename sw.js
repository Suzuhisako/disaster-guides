const CACHE_NAME = 'disaster-guide-v2'; // Incremented to force SW update!

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
  
  // CDN dependencies
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
  
  // Prefecture shelter data
  './locators/content/prefectures/kanagawa.json',
  './locators/content/prefectures/tokyo.json',
  
  // === ADD YOUR CHINESE & TRANSLATION ASSETS HERE ===
  './locators/content/guides/zh.json',       // Adjust path if your Chinese JSON lives elsewhere
  './locators/content/guides/en.json',
  './locators/content/guides/jp.json'
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
