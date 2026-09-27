/* ==========================================================================
   Disaster Emergency Guide Service Worker
   - Static Asset Caching (App Shell)
   - Dynamic Tile Caching (Leaflet Map Tiles)
   ========================================================================== */

const CACHE_NAME = 'disaster-guide-v9';
const TILE_CACHE_NAME = 'leaflet-tiles-v1';

// Maximum map tiles to store (~50MB) to protect device storage
const MAX_TILE_CACHE_ITEMS = 1500;

// Core static assets to pre-cache on installation
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/i18n.js',
  './js/guides.js',
  './js/map.js',
  './locators/ui/en.json',
  './locators/ui/zh.json', 
  './locators/content/guides_en.json',
  './locators/content/guides_zh.json',  
  './locators/content/shelters.json'
];

/* --------------------------------------------------------------------------
   1. INSTALL EVENT - Pre-cache App Shell
   -------------------------------------------------------------------------- */
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force active status immediately

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static app shell...');
      // Use addAll with error handling so missing individual assets don't fail installation
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(err => console.warn(`[SW] Failed to cache asset: ${url}`, err)))
      );
    })
  );
});

/* --------------------------------------------------------------------------
   2. ACTIVATE EVENT - Clean up Old Static Caches
   -------------------------------------------------------------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Keep BOTH current app cache and tile cache; delete older versions
          if (cache !== CACHE_NAME && cache !== TILE_CACHE_NAME) {
            console.log(`[SW] Deleting legacy cache: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* --------------------------------------------------------------------------
   3. FETCH EVENT - Route and Handle Network/Cache Requests
   -------------------------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Identify Leaflet tile requests (OpenStreetMap or GSI Japan Maps)
  const isTileRequest = url.host.includes('tile.openstreetmap.org') || 
                        url.host.includes('cyberjapandata.gsi.go.jp') ||
                        url.pathname.match(/\/\d+\/\d+\/\d+\.png$/);

  if (isTileRequest) {
    event.respondWith(handleTileFetch(event.request));
  } else {
    event.respondWith(handleStaticFetch(event.request));
  }
});

/* --------------------------------------------------------------------------
   4. TILE FETCH STRATEGY - Cache First with Auto-Pruning
   -------------------------------------------------------------------------- */
async function handleTileFetch(request) {
  const tileCache = await caches.open(TILE_CACHE_NAME);

  // 1. Try returning cached tile immediately
  const cachedResponse = await tileCache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // 2. Fetch from network if not cached
  try {
    const networkResponse = await fetch(request);

    // Opaque responses (cross-origin) have status 0
    if (networkResponse.status === 200 || networkResponse.status === 0) {
      tileCache.put(request, networkResponse.clone());
      pruneTileCache(tileCache); // Non-blocking cache pruning
    }

    return networkResponse;
  } catch (error) {
    console.warn('[SW] Offline map tile unavailable:', request.url);

    // SVG placeholder fallback when tile is missing offline
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        <rect width="256" height="256" fill="#f8f9fa"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#adb5bd" font-size="12" font-family="sans-serif">Offline</text>
       </svg>`,
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

/* --------------------------------------------------------------------------
   5. STATIC ASSETS STRATEGY - Stale-While-Revalidate
   -------------------------------------------------------------------------- */
async function handleStaticFetch(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Return offline fallback if network fails and item is not in cache
    if (request.mode === 'navigate') {
      return cache.match('./index.html');
    }
  });

  return cachedResponse || fetchPromise;
}

/* --------------------------------------------------------------------------
   6. CACHE MANAGEMENT - Prune Oldest Map Tiles
   -------------------------------------------------------------------------- */
async function pruneTileCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_TILE_CACHE_ITEMS) {
    // Remove oldest 50 tile entries to free up space
    for (let i = 0; i < 50; i++) {
      await cache.delete(keys[i]);
    }
  }
}
