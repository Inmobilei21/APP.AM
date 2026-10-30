/* AM · Service worker: solo muestra las notificaciones y abre la app al pulsarlas.
   No guarda nada en caché: todas las peticiones van directas a la red. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil((async () => {
    // Aviso a su hora con la app a la vista: lo muestra la propia app (tarjeta abajo a la derecha).
    if (data.type === "recordatorios") {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const visible = windows.filter(client => client.visibilityState === "visible" && client.focused);
      if (visible.length) { visible.forEach(client => client.postMessage({ type: "aviso", payload: data })); return; }
    }
    await self.registration.showNotification(data.title || "Aviso", {
      body: data.body || "", icon: "/app-icon-192.png?v=5", badge: "/app-icon-192.png?v=5",
      tag: data.tag || undefined, renotify: Boolean(data.tag), requireInteraction: data.type === "recordatorios", data: { url: data.url || "/" }
    });
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (open) { await open.focus(); open.postMessage({ type: "abrir", url }); return; }
    await self.clients.openWindow(url);
  })());
});
