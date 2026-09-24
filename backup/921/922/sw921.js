const CACHE_NAME = 'disaster-guide-v2';

// Core assets to pre-cache for 100% offline functionality
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/i18n.js',
  './js/guides.js',
  './js/map.js',
  './manifest.json',
  './locators/ui/en.json',
  './locators/ui/zh.json',
  './locators/content/guides_en.json',
  './locators/content/guides_zh.json',
  './locators/content/shelters.json', 

  // External Leaflet & MarkerCluster CDNs for offline caching
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
];

/**
 * Service Worker Installation
 * Pre-caches all essential static files and localized JSON resources.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching emergency guide assets...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Service Worker Activation
 * Cleans up old cache versions to keep storage efficient.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Fetch Strategy: Cache-First, falling back to Network
 * Serves cached assets immediately for instant offline loading.
 */
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests or external extensions
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // If resource is not in cache, fetch from network and dynamically cache it
        return fetch(event.request).then((networkResponse) => {
          // Check for valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
      .catch(() => {
        // Fallback for navigation requests when completely offline and uncached
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});