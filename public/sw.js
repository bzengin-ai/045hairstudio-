const CACHE = '045-v1';
const ASSETS = ['/', '/css/style.css', '/js/main.js', '/logo.png', '/manifest.json'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    if (e.request.url.includes('/api/')) return; // API isteklerini cache'leme
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
