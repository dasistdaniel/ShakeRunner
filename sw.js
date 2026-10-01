// Network-first, Cache als Offline-Fallback (kein veralteter Stand beim Entwickeln).
const CACHE = 'shakerunner-v2';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icon.svg',
  'src/main.js', 'src/input.js', 'src/player.js', 'src/world.js', 'src/audio.js', 'src/render.js', 'src/storage.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request)),
  );
});
