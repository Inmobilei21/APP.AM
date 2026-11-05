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
      else if (target === "calendario") nav("Calendario");
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
    const slot = document.querySelector("#accountPanel .acc-slot-notif");
    if (slot && !slot.querySelector(".nt-box")) {
      const title = document.createElement("h3"); title.className = "account-section"; title.textContent = "Avisos en este dispositivo";
      const box = document.createElement("div"); box.className = "nt-box";
      slot.append(title, box); draw(box);
    }
    return result;
  };
  // En el móvil, si este dispositivo aún no tiene las notificaciones activadas, se ofrece activarlas al entrar
  // (el permiso solo se puede pedir con un toque de la persona). «Ahora no» lo vuelve a ofrecer a la semana.
  async function invite() {
    if (!supported || !signedInUser || !window.matchMedia("(max-width:760px)").matches || (ios && !standalone)) return;
    if (Notification.permission === "denied" || document.querySelector("#ntInvite")) return;
    const key = `am-notif-invitacion:${signedInUser.id}`; let later = 0; try { later = Number(localStorage.getItem(key)) || 0; } catch {}
    if (Date.now() < later) return;
    if (document.querySelector(".login2, #splash, #resumenSemana, #novedades")) { setTimeout(invite, 1500); return; }
    let data; try { data = await config(); } catch { return; }
    if (data.subscribed && Notification.permission === "granted") return;
    const sheet = document.createElement("div"); sheet.id = "ntInvite"; sheet.className = "ntv-shell";
    sheet.innerHTML = `<div class="ntv-card" role="dialog" aria-modal="true" aria-labelledby="ntvTitle"><span class="ntv-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 8H3c0-1 3-1 3-8"/><path d="M10 21h4"/></svg></span>
      <h3 id="ntvTitle">Activa las notificaciones</h3><p>Te avisaremos en el móvil, aunque tengas la app cerrada, de:</p>
      <ul><li><span class="ntv-li-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.8 7L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z"/></svg></span><span>Mensajes del chat</span></li><li><span class="ntv-li-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="m8.5 12 2 2 4-4"/></svg></span><span>Tareas por cumplir, cada mañana a las 9:00</span></li><li><span class="ntv-li-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M5 3 2 6M19 3l3 3"/></svg></span><span>Avisos y recordatorios a su hora</span></li></ul>
      <p class="ntv-msg" role="status"></p><button type="button" class="ntv-ok">Activar notificaciones</button><button type="button" class="ntv-no">Ahora no</button><small>Puedes cambiarlo cuando quieras en «Mi cuenta» → Notificaciones.</small></div>`;
    document.body.append(sheet);
    const close = () => { sheet.classList.add("ntv-out"); setTimeout(() => sheet.remove(), 220); };
    sheet.querySelector(".ntv-no").onclick = () => { try { localStorage.setItem(key, String(Date.now() + 7 * 864e5)); } catch {} close(); };
    sheet.querySelector(".ntv-ok").onclick = async event => {
      const button = event.currentTarget; button.disabled = true; button.textContent = "Activando…";
      try { await enable(data.publicKey); button.textContent = "✓ Activadas"; setTimeout(close, 900); }
      catch (error) { sheet.querySelector(".ntv-msg").textContent = /[áéíóúñ]/.test(error.message) ? error.message : "No se pudieron activar en este móvil. Prueba desde «Mi cuenta» → Notificaciones."; button.disabled = false; button.textContent = "Activar notificaciones"; }
    };
  }
  const startInvite = () => setTimeout(invite, 3500);
  if (window.__authDecidida) startInvite(); else document.addEventListener("auth-decidida", startInvite, { once: true });
  // Si este dispositivo ya estaba suscrito, se renueva en el servidor por si la suscripción ha cambiado.
  const refresh = async () => { try { const sub = await current(); if (sub && Notification.permission === "granted" && signedInUser) await apiJson("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription: sub.toJSON() }) }); } catch {} };
  if (supported) { if (window.__authDecidida) refresh(); else document.addEventListener("auth-decidida", refresh, { once: true }); }
})();
