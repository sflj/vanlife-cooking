const CACHE_NAME = 'tiny-chef-v0.1.5';
const ASSETS_TO_CACHE = [
  'index.html',
  'style.css',
  'script.js',
  'recipes.json',
  'lang_pl.json',
  'lang_en.json',
  'lang_de.json',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

// Instalacja - zapisujemy pliki w pamięci
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Aktywacja - czyszczenie starego cache'u po aktualizacji wersji
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Strategia: Najpierw sieć, jeśli brak - bierz z cache'u
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
