// Fail: sw.js
const CACHE_NAME = "workspace-pro-cache-v3"; // Tukar nombor v3 ke v4 dan seterusnya kalau ada update SANGAT besar

self.addEventListener("install", (event) => {
    // Paksa service worker baru untuk terus ambil alih (tak payah tunggu user tutup tab)
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    // Buang cache lama bila versi baru masuk
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// LOGIK NETWORK FIRST (Tarik dari internet dulu, kalau tiada internet baru guna cache)
self.addEventListener("fetch", (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});