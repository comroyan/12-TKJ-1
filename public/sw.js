const CACHE_NAME = "classhub-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap"
];

// Install Event
self.addEventListener("install", (e) => {
  self.skipWaiting(); // Force active service worker to be replaced immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Claim control of all clients immediately
    })
  );
});

// Fetch Event (Network-first for HTML pages to prevent stale Vite hashes, Cache-first for other listed static assets)
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Network-First for main routing pages (/, /index.html) to prevent stale hash mismatch in production
  if (url.pathname === "/" || url.pathname === "/index.html") {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(e.request);
        })
    );
  } else if (ASSETS_TO_CACHE.includes(url.pathname)) {
    // Cache-First for secondary static assets (like web fonts / manifest)
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request);
      })
    );
  } else {
    // Default network-first for pages and dynamic requests
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match(e.request);
      })
    );
  }
});
