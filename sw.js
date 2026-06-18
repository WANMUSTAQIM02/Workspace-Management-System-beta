const CACHE_NAME = 'ot-calculator-cloud-v1';
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js'
];

// Pasang aset statik aplikasi ke dalam storan offline cache peranti
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Padam cache versi lama yang tersisa jika wujud penambahbaikan versi
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Memintas fetch request untuk menyokong mod offline aset statik web
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cacheRes => {
      return cacheRes || fetch(e.request);
    })
  );
});