const CACHE_NAME = 'disaster-guide-v3'; // Bump version!

const PRECACHE_ASSETS = [
  './',
  './index.html',
  'index.html',
  './css/guides.css', // Verify this exact CSS file name
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
 * Fetch Event Handler
 * Strategy 1: Stale-While-Revalidate for JSON files (JSON guides, shelters, UI translations)
 * Strategy 2: Cache-First, fallback to Network for CSS, JS, HTML, CDNs
 */
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // --- Strategy 1: Stale-While-Revalidate for JSON content ---
  // Loads instantly from cache offline, but updates cache in background if online
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
          .catch(() => cachedResponse); // Default to cached JSON if network fails

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // --- Strategy 2: Cache-First for standard static assets (HTML, CSS, JS, CDNs) ---
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Allow basic (same-origin) and cors (external CDNs like unpkg.com)
          const validTypes = ['basic', 'cors'];
          if (
            !networkResponse || 
            networkResponse.status !== 200 || 
            !validTypes.includes(networkResponse.type)
          ) {
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
        // Navigation fallback for SPA routing / page reloads while offline
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
