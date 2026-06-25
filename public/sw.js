var CACHE_NAME = 'traveler-passport-v4';
// Precache ТОЛЬКО стабильные ассеты (без content-hash в имени).
// index.html тоже валиден: Vite не хэширует сам HTML, он переписывает ссылки внутри.
var ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.svg',
  'icon-512.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      // Если precache частично падает — не блокируем активацию:
      // хэшированные бандлы подтянутся runtime-кэшированием в fetch.
      .catch(function () { return self.skipWaiting(); })
  );
});

// Cache-first С ПОПУЛЯЦИЕЙ: первый запрос идёт в сеть и кэшируется.
// Это и закрывает хэшированные ассеты (main-[hash].js, style-[hash].css).
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (res) {
        // Кэшируем только успешные (базовые) ответы, не POST/ошибки.
        if (!res || res.status !== 200 || res.type === 'error' || event.request.method !== 'GET') {
          return res;
        }
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(event.request, copy); });
        return res;
      });
    }).catch(function () {
      // Сеть недоступна и в кэше нет — отдаём index.html как app-shell fallback
      // (или undefined, если и его нет).
      return caches.match('./');
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all([
        // Явное удаление legacy-кэша v3 (бывшее имя "belarus-passport-v3"):
        caches.delete('belarus-passport-v3'),
        // Общая чистка любых кэшей ≠ текущему:
        ...keys.filter(function (key) { return key !== CACHE_NAME; })
              .map(function (key) { return caches.delete(key); })
      ]);
    })
  );
  self.clients.claim();
});
