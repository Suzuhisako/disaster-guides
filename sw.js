const CACHE_NAME = 'disaster-guide-v6'; // Bumped version!

const PRECACHE_ASSETS = [
  './',
  './index.html',
  'index.html',
  './css/style.css', // Confirm exact filename
  './js/i18n.js',
  './js/guides.js',
  './js/map.js',
  './manifest.json',
  './locators/ui/en.json',
  './locators/ui/zh.json',
  './locators/content/guides_en.json',
  './locators/content/guides_zh.json',
  './locators/content/shelters.json',
  './icon-192.png',
  './icon-512.png',

  // External Leaflet & MarkerCluster CDNs
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
];

/**
 * Service Worker Installation
 * Individual cache.add() promises so a single 404 does NOT break the entire cache.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Resilient pre-caching started...');
      
      const cachePromises = PRECACHE_ASSETS.map(async (url) => {
        try {
          await cache.add(url);
          console.log(`[SW] Successfully cached: ${url}`);
        } catch (err) {
          console.error(`[SW] MISSING FILE ALERT: Failed to cache "${url}". Check if this file exists or if path is correct!`, err);
        }
      });

      await Promise.all(cachePromises);
    }).then(() => self.skipWaiting())
  );
});

/**
 * Service Worker Activation
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
 * Fetch Event Handler
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // 1. Navigation Requests (Page reloads / offline entry)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || 
               caches.match('./index.html') || 
               caches.match('index.html') || 
               caches.match('./') || 
               fetch(event.request);
      })
    );
    return;
  }

  // 2. Stale-While-Revalidate for JSON files
  if (requestUrl.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Cache-First for standard assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        const validTypes = ['basic', 'cors'];
        if (!networkResponse || networkResponse.status !== 200 || !validTypes.includes(networkResponse.type)) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});
