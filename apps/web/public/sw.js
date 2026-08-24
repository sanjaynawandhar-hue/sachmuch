/**
 * Service worker.
 *
 * Two jobs, and deliberately not a third. It makes the app installable, and it
 * keeps the shell available offline so opening the app on a dead connection
 * shows the app rather than the browser's dinosaur.
 *
 * It does NOT cache fact data. Facts change when the pipeline runs and a stale
 * cached feed would be worse than a slow one — offline packs (a deliberate,
 * user-chosen download) are the right answer for reading without a connection,
 * not an opportunistic cache the user never asked for.
 */
const SHELL = 'sachmuch-shell-v1';
const SHELL_FILES = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never serve an API response from cache: a boost count or a feed page read
  // from a stale cache is a wrong answer presented as a current one.
  if (url.pathname.startsWith('/api/')) return;

  // Network first, cache as the fallback. The reverse would pin users to a
  // stale build until the cache expired.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          void caches.open(SHELL).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit ?? caches.match('/'))),
  );
});
