/* Offline-first service worker: precache the shell, then cache-first for
   same-origin GETs so the whole game works with no network after the
   first visit. Bump VERSION to invalidate. */

/* The build stamp and asset list below are substituted at build time, so
   install caches the whole shell rather than waiting for a second visit
   to catch the bundles the page loaded before this worker existed. */
const BUILD = '__BUILD__';
const VERSION = `tibeb-${BUILD}`;
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-maskable.svg',
  '/fonts/NotoSerifEthiopic-ethiopic.woff2',
  '/fonts/NotoSerifEthiopic-latin.woff2',
  '/fonts/NotoSansEthiopic-ethiopic.woff2',
  '/fonts/NotoSansEthiopic-latin.woff2',
  ...JSON.parse('__ASSETS__'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* ignoreVary matters: hosts commonly answer with `Vary: Origin`, and the
   precached plain requests would then never match the CORS requests the
   page actually makes for modules and fonts. */
const MATCH = { ignoreVary: true, ignoreSearch: false };

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  /* navigations: network first so a deploy is picked up, cached shell offline */
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/', MATCH).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, MATCH).then((hit) => {
      if (hit) return hit;
      return fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => Response.error());
    }),
  );
});
