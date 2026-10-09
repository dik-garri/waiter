'use strict';
// Service worker «Официанта»: игра работает без интернета.
// Свои файлы — сначала из сети (чтобы обновления приходили сразу), без сети — из кэша.
// Шрифты Google — из кэша, раз скачав.
const CACHE = 'waiter-v1';
const SHELL = [
  './', 'index.html', 'style.css', 'game.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function put(req, res) {
  const copy = res.clone();
  return caches.open(CACHE).then(c => c.put(req, copy));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => { if (res.ok) e.waitUntil(put(req, res)); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./')))
    );
  } else if (FONT_HOSTS.includes(url.host)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => { e.waitUntil(put(req, res)); return res; }))
    );
  }
});
