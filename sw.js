const CACHE = 'spy-pass-v4'
const ASSETS = [
  './', './index.html', './style.css?v=4', './app.js?v=4', './game.js?v=4', './manifest.webmanifest',
  './fonts/display-700.ttf', './fonts/display-900.ttf',
  './fonts/body-400.ttf', './fonts/body-500.ttf', './fonts/body-700.ttf',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
]
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((url) => new Request(new URL(url, self.registration.scope), { cache: 'reload' })))).then(() => self.skipWaiting()))
  // Take over the cache promptly. The page decides when it is safe to reload;
  // an in-progress round is never navigated away by the worker.
})
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('spy-pass-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return
  event.respondWith(caches.open(CACHE).then(async (cache) => {
    if (event.request.mode === 'navigate') {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3000)
      try {
        const fresh = await fetch(event.request, { cache: 'no-cache', signal: controller.signal })
        if (fresh.ok) return fresh
      } catch { /* Offline navigation uses the complete cached release. */ }
      finally { clearTimeout(timer) }
      return await cache.match(new URL('./index.html', self.registration.scope)) || Response.error()
    }
    const cached = await cache.match(event.request)
    if (cached) return cached
    return fetch(event.request)
  }))
})
