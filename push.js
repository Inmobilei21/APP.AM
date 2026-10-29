// Notificaciones push (móvil y escritorio): cada usuario las activa en «Mi cuenta» y elige qué avisos recibe.
// Las claves VAPID salen de VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY o, si no están, se crean una vez y se guardan
// en DATA_DIR/push-vapid.json. Las suscripciones y preferencias van en DATA_DIR/push.json.
const fs = require("fs");
const path = require("path");
const webpush = require("web-push");

const TYPES = {
  chat: "Mensajes del chat",
  clientes: "Mensajes de clientes",
  tareas: "Tareas asignadas",
  facturacion: "Trabajos para facturar",
  presupuestos: "Presupuestos aceptados",
  sugerencias: "Sugerencias del equipo"
};

module.exports = function ({ dataDirectory, json, readJson, requireUser, subject = "mailto:info@asesoriamolinero.es" }) {
  const file = path.join(dataDirectory, "push.json"), keyFile = path.join(dataDirectory, "push-vapid.json");
  let keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  if (!keys.publicKey || !keys.privateKey) {
    try { keys = JSON.parse(fs.readFileSync(keyFile, "utf8")); } catch {
      keys = webpush.generateVAPIDKeys();
      try { fs.mkdirSync(dataDirectory, { recursive: true }); fs.writeFileSync(keyFile, JSON.stringify(keys)); } catch (error) { console.error("Claves de notificaciones:", error.message); }
    }
  }
  webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);

  const load = () => { try { const data = JSON.parse(fs.readFileSync(file, "utf8")); return { subs: Array.isArray(data.subs) ? data.subs : [], prefs: data.prefs || {} }; } catch { return { subs: [], prefs: {} }; } };
  const save = data => { fs.mkdirSync(dataDirectory, { recursive: true }); fs.writeFileSync(file, JSON.stringify(data)); };
  const prefsOf = (data, userId) => ({ ...Object.fromEntries(Object.keys(TYPES).map(type => [type, true])), ...(data.prefs[userId] || {}) });

  // Envía el aviso a todos los dispositivos de esos usuarios que lo tengan activado. Nunca lanza errores.
  function notify(userIds, type, { title, body, url = "/", tag } = {}) {
    try {
      const ids = new Set([].concat(userIds).filter(Boolean)), data = load();
      const targets = data.subs.filter(sub => ids.has(sub.userId) && prefsOf(data, sub.userId)[type] !== false);
      if (!targets.length) return;
      const payload = JSON.stringify({ title: String(title || "Aviso").slice(0, 120), body: String(body || "").slice(0, 300), url, tag: tag || type, type });
      Promise.all(targets.map(sub => webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 24 * 3600, urgency: "high" })
        .then(() => null).catch(error => (error.statusCode === 404 || error.statusCode === 410) ? sub.endpoint : (console.error("Notificación:", error.statusCode || error.message), null))))
        .then(gone => { const dead = new Set(gone.filter(Boolean)); if (dead.size) { const fresh = load(); fresh.subs = fresh.subs.filter(sub => !dead.has(sub.endpoint)); save(fresh); } });
    } catch (error) { console.error("Notificación:", error.message); }
  }

  function handle(req, res, requestPath) {
    if (!requestPath.startsWith("/api/push/")) return false;
    const user = requireUser(req, res); if (!user) return true;
    const data = load();
    if (requestPath === "/api/push/config" && req.method === "GET") {
      const endpoint = new URL(req.url, "http://x").searchParams.get("endpoint") || "";
      json(res, 200, { publicKey: keys.publicKey, types: TYPES, prefs: prefsOf(data, user.id), subscribed: Boolean(endpoint && data.subs.some(sub => sub.endpoint === endpoint && sub.userId === user.id)), devices: data.subs.filter(sub => sub.userId === user.id).length });
      return true;
    }
    if (requestPath === "/api/push/subscribe" && req.method === "POST") {
      readJson(req, 16 * 1024).then(({ subscription }) => {
        if (!subscription?.endpoint || !/^https:\/\//.test(subscription.endpoint) || !subscription.keys?.p256dh || !subscription.keys?.auth) return json(res, 400, { error: "Suscripción no válida." });
        const fresh = load(); fresh.subs = fresh.subs.filter(sub => sub.endpoint !== subscription.endpoint);
        fresh.subs.push({ userId: user.id, endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }, ua: String(req.headers["user-agent"] || "").slice(0, 200), createdAt: new Date().toISOString() });
        save(fresh); json(res, 200, { subscribed: true });
      }).catch(() => json(res, 400, { error: "No se pudo activar las notificaciones." }));
      return true;
    }
    if (requestPath === "/api/push/unsubscribe" && req.method === "POST") {
      readJson(req, 16 * 1024).then(({ endpoint }) => {
        const fresh = load(); fresh.subs = fresh.subs.filter(sub => !(sub.endpoint === endpoint && sub.userId === user.id)); save(fresh); json(res, 200, { subscribed: false });
      }).catch(() => json(res, 400, { error: "No se pudo desactivar las notificaciones." }));
      return true;
    }
    if (requestPath === "/api/push/prefs" && req.method === "PUT") {
      readJson(req, 8 * 1024).then(input => {
        const fresh = load(), prefs = prefsOf(fresh, user.id);
        for (const type of Object.keys(TYPES)) if (typeof input?.[type] === "boolean") prefs[type] = input[type];
        fresh.prefs[user.id] = prefs; save(fresh); json(res, 200, { prefs });
      }).catch(() => json(res, 400, { error: "No se pudieron guardar las preferencias." }));
      return true;
    }
    if (requestPath === "/api/push/test" && req.method === "POST") {
      const mine = data.subs.filter(sub => sub.userId === user.id);
      if (!mine.length) { json(res, 409, { error: "Activa primero las notificaciones en este dispositivo." }); return true; }
      const payload = JSON.stringify({ title: "Notificaciones activadas", body: `Hola, ${String(user.name || "").split(" ")[0]}: así te llegarán los avisos.`, url: "/", tag: "prueba" });
      Promise.allSettled(mine.map(sub => webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 600 })))
        .then(results => json(res, 200, { sent: results.filter(r => r.status === "fulfilled").length, failed: results.filter(r => r.status === "rejected").length }));
      return true;
    }
    json(res, 404, { error: "No encontrado." }); return true;
  }
  return { notify, handle, TYPES };
};
