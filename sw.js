const CACHE = 'spy-pass-v3'
const ASSETS = [
  './', './index.html', './style.css', './app.js', './game.js', './manifest.webmanifest',
  './fonts/display-700.ttf', './fonts/display-900.ttf',
  './fonts/body-400.ttf', './fonts/body-500.ttf', './fonts/body-700.ttf',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
]
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)))
  // New versions wait for the next launch so an active round is never reloaded.
})
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('spy-pass-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return
  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(event.request, { ignoreSearch: true })
    if (cached) return cached
    if (event.request.mode === 'navigate') return await cache.match('./index.html') || fetch(event.request)
    return fetch(event.request)
  }))
})
