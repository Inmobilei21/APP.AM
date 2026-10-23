// Guarda la app para que funcione sin cobertura en el gimnasio.
// Sirve lo guardado al instante y lo actualiza en segundo plano.
const CACHE = "marta-wellness-v1";
const SHELL = ["/marta/", "/marta/styles.css?v=1", "/marta/data.js?v=1", "/marta/app.js?v=1", "/marta/manifest.webmanifest?v=1", "/marta/icon-192.png?v=1", "/marta/apple-touch-icon.png?v=1", "/marta/favicon.png?v=1"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const own = url.origin === location.origin && url.pathname.startsWith("/marta/");
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!own && !fonts) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request, { ignoreSearch: own && request.mode === "navigate" }).then(cached => {
    const fresh = fetch(request).then(response => {
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    }).catch(() => cached);
    return cached || fresh;
  })));
});
