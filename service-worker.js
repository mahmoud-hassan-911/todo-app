/**
 * Service Worker - PWA Offline Support
 * Caches static assets for offline shell, no task data caching
 */

const CACHE_NAME = 'todo-app-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './firebase-config.js',
  './manifest.json',
  './styles/tokens.css',
  './styles/base.css',
  './styles/header.css',
  './styles/auth.css',
  './styles/board.css',
  './styles/card.css',
  './styles/modal.css',
  './styles/toast.css',
  './styles/palette.css',
  './styles/list.css',
  './styles/calendar.css',
  './icons/icon-128.png',
  './icons/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
          .catch(error => {
            console.error('[Service Worker] Failed to cache some assets:', error);
            // Continue even if some assets fail
          });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip Firebase and CDN requests (always fetch from network)
  if (
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('cloudflare.com') ||
    url.hostname.includes('jsdelivr.net')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', request.url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Only cache successful responses
            if (networkResponse && networkResponse.status === 200) {
              // Clone the response
              const responseToCache = networkResponse.clone();
              
              // Check if it's a static asset we should cache
              if (STATIC_ASSETS.some(asset => request.url.endsWith(asset))) {
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseToCache);
                  });
              }
            }
            
            return networkResponse;
          })
          .catch((error) => {
            console.log('[Service Worker] Fetch failed:', error);
            
            // If offline and requesting HTML, return cached index
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // For other requests, throw error
            throw error;
          });
      })
  );
});

// Message event - for manual cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[Service Worker] Loaded');
