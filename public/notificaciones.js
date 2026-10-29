/* Notificaciones push en el móvil (y en el ordenador): se activan y se ajustan en «Mi cuenta».
   Cada dispositivo se suscribe por separado; qué avisos llegan se guarda por usuario en el servidor.
   Se carga después de app.js. */
(() => {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let registration = null;
  const ready = supported ? navigator.serviceWorker.register("/sw.js").then(reg => (registration = reg)).catch(() => null) : Promise.resolve(null);

  // Al pulsar una notificación se abre el apartado correspondiente.
  function go(target) {
    if (!target || !signedInUser) return;
    const nav = title => document.querySelector(`.sidebar nav button[data-title="${title}"]`)?.click();
    try {
      if (target === "chat") { if (!document.querySelector("#chatPanel.open")) toggleWorkerChat(); }
      else if (target === "tareas") nav("Tareas");
      else if (target === "facturacion") openBillingModal();
      else if (target === "sugerencias" || target === "presupuestos") { nav("Gestión"); setTimeout(() => document.querySelector(`[data-management-tab="${target === "sugerencias" ? "suggestions" : "presupuestos"}"]`)?.click(), 300); }
    } catch (error) { console.error("Abrir aviso", error); }
  }
  const fromUrl = url => { try { return new URL(url, location.origin).hash.match(/ir=([a-z]+)/)?.[1] || ""; } catch { return ""; } };
  const pending = fromUrl(location.href);
  if (pending) {
    history.replaceState(null, "", location.pathname + location.search);
    const run = () => setTimeout(() => go(pending), 600);
    if (window.__authDecidida) run(); else document.addEventListener("auth-decidida", run, { once: true });
  }
  if (supported) navigator.serviceWorker.addEventListener("message", event => { if (event.data?.type === "abrir") go(fromUrl(event.data.url)); });

  const keyBytes = base64 => { const padded = (base64 + "=".repeat((4 - base64.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(padded), c => c.charCodeAt(0)); };
  const current = async () => { const reg = registration || await ready; return reg ? reg.pushManager.getSubscription() : null; };
  async function config() { const sub = await current().catch(() => null); return { sub, ...(await apiJson(`/api/push/config${sub ? `?endpoint=${encodeURIComponent(sub.endpoint)}` : ""}`)) }; }
  async function enable(publicKey) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error(permission === "denied" ? "Las notificaciones están bloqueadas para esta app. Actívalas en los ajustes del móvil o del navegador." : "No se ha dado permiso para las notificaciones.");
    const reg = registration || await ready; if (!reg) throw new Error("Este navegador no admite notificaciones.");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
    await apiJson("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription: sub.toJSON() }) });
  }
  async function disable() {
    const sub = await current().catch(() => null); if (!sub) return;
    await apiJson("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }

  const toggle = (name, on, label, small = "") => `<label class="nt-row"><span><strong>${label}</strong>${small ? `<small>${small}</small>` : ""}</span><input type="checkbox" class="nt-switch" data-nt="${name}"${on ? " checked" : ""}></label>`;
  async function draw(box) {
    if (!supported) { box.innerHTML = '<p class="nt-note">Este navegador no admite notificaciones.</p>'; return; }
    if (ios && !standalone) { box.innerHTML = '<p class="nt-note">En el iPhone las notificaciones solo funcionan con la app instalada: en Safari, pulsa <b>Compartir</b> → <b>Añadir a pantalla de inicio</b> y ábrela desde el icono.</p>'; return; }
    box.innerHTML = '<p class="nt-note">Cargando…</p>';
    let data; try { data = await config(); } catch (error) { box.innerHTML = `<p class="nt-note">${escapeHtml(error.message)}</p>`; return; }
    const on = data.subscribed && Notification.permission === "granted";
    box.innerHTML = `<div class="nt-card">${toggle("activo", on, "Notificaciones en este dispositivo", on ? "Activadas" : Notification.permission === "denied" ? "Bloqueadas en los ajustes del móvil" : "Desactivadas")}
      ${on ? `<div class="nt-types">${Object.entries(data.types).filter(([type]) => signedInUser?.role === "admin" || !["facturacion", "presupuestos", "sugerencias"].includes(type)).map(([type, label]) => toggle(type, data.prefs[type] !== false, label)).join("")}</div><button type="button" class="nt-test">Enviar notificación de prueba</button>` : ""}</div><p class="nt-msg" role="status"></p>`;
    const msg = box.querySelector(".nt-msg");
    box.querySelectorAll("[data-nt]").forEach(input => input.addEventListener("change", async () => {
      input.disabled = true; msg.textContent = "";
      try {
        if (input.dataset.nt === "activo") { if (input.checked) await enable(data.publicKey); else await disable(); return draw(box); }
        await apiJson("/api/push/prefs", { method: "PUT", body: JSON.stringify({ [input.dataset.nt]: input.checked }) });
      } catch (error) { input.checked = !input.checked; msg.textContent = /[áéíóúñ]|^(No |Las |Este |Activa )/.test(error.message) ? error.message : "No se pudo activar en este navegador. Prueba desde la app instalada en el móvil."; }
      input.disabled = false;
    }));
    box.querySelector(".nt-test")?.addEventListener("click", async event => {
      const button = event.currentTarget; button.disabled = true; msg.textContent = "";
      try { const r = await apiJson("/api/push/test", { method: "POST" }); msg.textContent = r.sent ? "Enviada: te llegará en unos segundos." : "No se pudo enviar. Desactiva y vuelve a activar las notificaciones."; }
      catch (error) { msg.textContent = error.message; }
      button.disabled = false;
    });
  }

  // Apartado «Notificaciones» dentro de «Mi cuenta».
  const previous = openAccountPanel;
  window.openAccountPanel = openAccountPanel = function () {
    const result = previous.apply(this, arguments);
    const content = document.querySelector("#accountPanel .account-content"), anchor = content?.querySelector(".account-section, .account-message");
    if (content && anchor && !content.querySelector(".nt-box")) {
      const title = document.createElement("h3"); title.className = "account-section"; title.textContent = "Notificaciones";
      const box = document.createElement("div"); box.className = "nt-box";
      anchor.before(title, box); draw(box);
    }
    return result;
  };
  // Si este dispositivo ya estaba suscrito, se renueva en el servidor por si la suscripción ha cambiado.
  const refresh = async () => { try { const sub = await current(); if (sub && Notification.permission === "granted" && signedInUser) await apiJson("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription: sub.toJSON() }) }); } catch {} };
  if (supported) { if (window.__authDecidida) refresh(); else document.addEventListener("auth-decidida", refresh, { once: true }); }
})();
