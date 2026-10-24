// v0.90 離線版：先上網拿最新的，拿不到（沒網路）就用上次存下來的；第一次上網玩過，之後沒網路也能開
const CACHE = 'frost-town';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    try { const r = await fetch(e.request, { cache: 'no-cache' }); if (r.ok) c.put(e.request, r.clone()); return r; }
    catch (err) { const m = await c.match(e.request, { ignoreSearch: true }); if (m) return m; throw err; }
  }));
});
