const CACHE_NAME = 'disaster-guide-v8'; // Bumped version

const PRECACHE_ASSETS = [
  './',
  './index.html',
  'index.html',
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
  './icon-192.png',
  './icon-512.png',

  // External Leaflet CDNs
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
];

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Resilient pre-caching started...');
      const cachePromises = PRECACHE_ASSETS.map(async (url) => {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn(`[SW] Could not precache: ${url}`, err);
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
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', key);
            return caches.delete(key);
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

  // 1. Navigation Requests (Page reloads / initial site visits)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Try exact request match first
        const matched = await cache.match(event.request);
        if (matched) return matched;

        // Fallback search through keys for index.html regardless of full URL prefix
        const keys = await cache.keys();
        const htmlKey = keys.find(k => k.url.endsWith('index.html') || k.url.endsWith('/disaster-guides/'));
        if (htmlKey) {
          return await cache.match(htmlKey);
        }

        // Try direct relative fallbacks
        return (await cache.match('./index.html')) || 
               (await cache.match('index.html')) || 
               (await cache.match('./'));
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 2. Stale-While-Revalidate for JSON files
  const requestUrl = new URL(event.request.url);
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

  // 3. Cache-First for static assets (CSS, JS, CDNs, Images)
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
