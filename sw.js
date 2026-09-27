// Keep your existing static cache name
const CACHE_NAME = 'disaster-guide-v9';

// Add the dedicated tile cache name below it
const TILE_CACHE_NAME = 'leaflet-tiles-v1';

// Limit max cached tiles to prevent filling device storage (approx. 50MB)
const MAX_TILE_CACHE_ITEMS = 1500;

// Explicit paths including GitHub Pages subfolder repo name
const PRECACHE_ASSETS = [
  '/disaster-guides/',
  '/disaster-guides/index.html',
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
  './icon-192.png',
  './icon-512.png',

  // Leaflet CDNs
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Pre-caching starting...');
      for (const url of PRECACHE_ASSETS) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('[SW] Precache failed for:', url);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Catch ALL navigation requests (HTML page loads)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) return response;
        
        // Return cached index.html or fallback root
        return caches.match('/disaster-guides/index.html') || 
               caches.match('./index.html') || 
               caches.match('/disaster-guides/') ||
               caches.match('./');
      })
    );
    return;
  }

  // Handle all other static assets & JSON files
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== TILE_CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Identify Leaflet tile requests (e.g., *.tile.openstreetmap.org or cyberjapandata.gsi.go.jp)
  const isTileRequest = url.host.includes('tile.openstreetmap.org') || 
                        url.host.includes('cyberjapandata.gsi.go.jp') ||
                        url.pathname.match(/\/\d+\/\d+\/\d+\.png$/);

  if (isTileRequest) {
    event.respondWith(handleTileFetch(event.request));
  }
});

/**
 * Cache-First Strategy for Map Tiles with Automatic Pruning
 */
async function handleTileFetch(request) {
  const tileCache = await caches.open(TILE_CACHE_NAME);
  
  // 1. Return cached tile immediately if available
  const cachedResponse = await tileCache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // 2. Fetch from network, cache copy, and return
  try {
    const networkResponse = await fetch(request);
    
    // Opaque responses (cross-origin) have status 0, check if ok or status 0
    if (networkResponse.status === 200 || networkResponse.status === 0) {
      // Clone response before consuming it
      tileCache.put(request, networkResponse.clone());
      
      // Asynchronously prune cache if it exceeds max size limit
      pruneTileCache(tileCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('SW: Fetching map tile failed (offline mode):', request.url);
    
    // Optional: Return a local fallback SVG/PNG placeholder tile
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        <rect width="256" height="256" fill="#f8f9fa"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#adb5bd" font-size="12" font-family="sans-serif">Tile Offline</text>
       </svg>`,
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

/**
 * Prune oldest tiles if cache exceeds MAX_TILE_CACHE_ITEMS
 */
async function pruneTileCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_TILE_CACHE_ITEMS) {
    // Delete the oldest 50 items
    for (let i = 0; i < 50; i++) {
      await cache.delete(keys[i]);
    }
  }
}
