const CACHE_NAME = 'my-app-cache-v1';
const urlsToCache = [
    '/',
    '/manifest.json',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(names.map((name) => {
                if (name !== CACHE_NAME) return caches.delete(name);
            }))
        )
    );
    self.clients.claim();
});

// Fetch: serve cached content when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});