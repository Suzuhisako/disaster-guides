const CACHE_NAME = 'disaster-guide-v10';

// Ensure these paths match your actual repository file structure exactly
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

  // UI Translations
  './locators/ui/en.json',
  './locators/ui/zh.json',
  './locators/ui/ja.json', 
  './locators/ui/vi.json',
  './locators/ui/ko.json',
  './locators/ui/tl.json',
  './locators/ui/pt.json',

  // Disaster Guide Content
  './locators/content/guides_en.json',
  './locators/content/guides_zh.json',
  './locators/content/guides_ja.json', 
  './locators/content/guides_vi.json',
  './locators/content/guides_ko.json',
  './locators/content/guides_tl.json',
  './locators/content/guides_pt.json',

  // CDN dependencies
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',

  // Prefecture shelter data
  './locators/content/prefectures/kanagawa.json',
  './locators/content/prefectures/tokyo.json'
];

// Install Event: Safely cache assets individually so one missing file won't break the worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching offline assets...');
      return Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            await cache.add(url);
            console.log('[SW] Successfully cached:', url);
          } catch (err) {
            console.warn('[SW] Failed to cache asset (check path or 404):', url, err);
          }
        })
      );
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
          // Fail silently offline
        });

      return cachedResponse || fetchPromise;
    })
  );
});
