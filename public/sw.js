const CACHE_NAME = "classhub-v3";

// We do not cache index.html or application JS/CSS files to avoid stale asset hash errors (blank screen bug)
const ASSETS_TO_CACHE = [
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
});

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
      return self.clients.claim();
    })
  );
});

// Pass-through fetch handler ensuring PWA installability without risking blank screen bugs
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET requests, API requests, and local assets to prevent chunk load errors and CORS issues
  if (
    e.request.method !== "GET" || 
    url.pathname.includes("/api/") || 
    url.hostname.includes("run.app") || 
    url.hostname.includes("firestore.googleapis.com")
  ) {
    return;
  }

  // Only handle cache for fonts
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request).then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
          return networkResponse;
        }).catch(() => fetch(e.request));
      })
    );
  } else {
    // Always fetch directly from network to avoid caching old Vite bundle hashes
    e.respondWith(fetch(e.request));
  }
});

// Handle notification click to open or focus the app window
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      // Otherwise open a new window
      return self.clients.openWindow("/");
    })
  );
});

