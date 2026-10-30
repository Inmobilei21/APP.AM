/* Avisos a su hora, como los de Outlook: cuando llega la hora de una tarea con «Avisarme» o de un recordatorio del
   calendario con hora, sale una tarjeta abajo a la derecha que se queda hasta que se cierra (o se pospone).
   - Con la app abierta (aunque esté detrás de otras ventanas) la tarjeta sale siempre y, si la app no está a la vista,
     también la notificación de Windows/Android.
   - Con la app cerrada, el aviso llega por las notificaciones push del servidor (si están activadas en «Mi cuenta»).
   Se carga después de app.js y notificaciones.js. */
(() => {
  const WINDOW = 15 * 60 * 1000, shownKey = () => `am-avisos:${signedInUser?.id || ""}`;
  const loadShown = () => { try { return JSON.parse(localStorage.getItem(shownKey()) || "{}"); } catch { return {}; } };
  const saveShown = shown => { const now = Date.now(); try { localStorage.setItem(shownKey(), JSON.stringify(Object.fromEntries(Object.entries(shown).filter(([, at]) => now - at < 7 * 864e5)))); } catch {} };
  const atLocal = (date, time) => { const [y, m, d] = String(date).split("-").map(Number), [hh, mm] = String(time).split(":").map(Number); return new Date(y, m - 1, d, hh, mm).getTime(); };
  const snoozed = new Map();

  function dueItems() {
    if (!signedInUser) return [];
    const items = [];
    try {
      for (const task of personalTasks()) {
        if (!task.remindAt || task.status === "done") continue;
        const [date, time] = String(task.remindAt).split("T");
        items.push({ key: `tarea:${task.id}:${task.remindAt}`, tag: `aviso-${task.id}`, at: atLocal(date, time), title: task.client || "Tarea", body: task.description || task.workTitle || task.customConcept || "", when: time, kind: "Tarea", open: () => { document.querySelector('.sidebar nav button[data-title="Tareas"]')?.click(); setTimeout(() => typeof taskEditHandler === "function" && taskEditHandler(task.id), 200); } });
      }
    } catch {}
    try {
      for (const item of getCalendarItems()) {
        if (!item.time || !item.date || (item.assigned && item.assigned !== signedInUser.name)) continue;
        items.push({ key: `agenda:${item.id}:${item.date}T${item.time}`, tag: `agenda-${item.id}`, at: atLocal(item.date, item.time), title: item.title || "Recordatorio", body: item.notes || "", when: item.time, kind: "Recordatorio", open: () => document.querySelector('.sidebar nav button[data-title="Calendario"]')?.click() });
      }
    } catch {}
    for (const [key, item] of snoozed) items.push({ ...item, key, at: item.at });
    return items;
  }

  function chime() {
    try { const ctx = new (window.AudioContext || window.webkitAudioContext)(), play = (f, t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.type = "sine"; g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.5); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.55); }; play(880, 0); play(1320, 0.18); setTimeout(() => ctx.close(), 1200); } catch {}
  }

  function stack() { let box = document.querySelector("#avisosStack"); if (!box) { box = document.createElement("div"); box.id = "avisosStack"; box.className = "av-stack"; box.setAttribute("aria-live", "polite"); document.body.append(box); } return box; }
  function show(item, { system = true } = {}) {
    if (document.querySelector(`.av-card[data-tag="${CSS.escape(item.tag)}"]`)) return;
    const card = document.createElement("article"); card.className = "av-card"; card.dataset.tag = item.tag; card.setAttribute("role", "alert");
    card.innerHTML = `<span class="av-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 8H3c0-1 3-1 3-8"/><path d="M10 21h4"/></svg></span>
      <div class="av-txt"><small>${escapeHtml(item.kind || "Aviso")}${item.when ? ` · ${escapeHtml(item.when)}` : ""}</small><strong>${escapeHtml(item.title)}</strong>${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}
      <div class="av-acts">${item.open ? '<button type="button" data-av="abrir">Abrir</button>' : ""}<button type="button" data-av="posponer">Posponer 10 min</button></div></div>
      <button type="button" class="av-x" data-av="cerrar" aria-label="Cerrar aviso">×</button>`;
    const close = () => { card.classList.add("av-out"); setTimeout(() => card.remove(), 220); };
    card.addEventListener("click", event => {
      const action = event.target.closest("[data-av]")?.dataset.av; if (!action) return;
      if (action === "abrir") { item.open?.(); close(); }
      if (action === "posponer") { snoozed.set(`pospuesto:${item.tag}:${Date.now()}`, { ...item, at: Date.now() + 10 * 60 * 1000, kind: item.kind }); close(); }
      if (action === "cerrar") close();
    });
    stack().append(card); requestAnimationFrame(() => card.classList.add("av-on")); chime();
    // App detrás de otras ventanas o minimizada: también la notificación del sistema (abajo a la derecha en Windows).
    if (system && document.hidden && "Notification" in window && Notification.permission === "granted") {
      try { const n = new Notification(`⏰ ${item.title}`, { body: [item.when, item.body].filter(Boolean).join(" · "), tag: item.tag, icon: "/app-icon-192.png?v=5", requireInteraction: true }); n.onclick = () => { window.focus(); item.open?.(); n.close(); close(); }; } catch {}
    }
  }

  function check() {
    if (!signedInUser) return;
    const now = Date.now(), shown = loadShown(); let changed = false;
    for (const item of dueItems()) {
      if (!Number.isFinite(item.at) || item.at > now || now - item.at > WINDOW || shown[item.key]) continue;
      shown[item.key] = now; shown[`tag:${item.tag}`] = now; changed = true;
      if (item.key.startsWith("pospuesto:")) snoozed.delete(item.key);
      show(item);
    }
    if (changed) saveShown(shown);
  }

  // El aviso que llega por push con la app a la vista se muestra aquí (el service worker no saca la del sistema).
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", event => {
    const data = event.data; if (data?.type !== "aviso" || !data.payload) return;
    const p = data.payload, shown = loadShown(); if (shown[`tag:${p.tag}`] && Date.now() - shown[`tag:${p.tag}`] < WINDOW) return;
    shown[`tag:${p.tag}`] = Date.now(); saveShown(shown);
    show({ tag: p.tag || `push-${Date.now()}`, title: String(p.title || "Aviso").replace(/^⏰\s*/, ""), body: p.body || "", kind: "Aviso", open: () => { const target = (p.url || "").match(/ir=([a-z]+)/)?.[1]; if (target === "tareas") document.querySelector('.sidebar nav button[data-title="Tareas"]')?.click(); else if (target === "calendario") document.querySelector('.sidebar nav button[data-title="Calendario"]')?.click(); } }, { system: false });
  });

  const start = () => { if (!signedInUser) { setTimeout(start, 2000); return; } syncCalendarFromServer?.(); check(); [3000, 8000].forEach(ms => setTimeout(check, ms)); };
  if (window.__authDecidida) start(); else document.addEventListener("auth-decidida", start, { once: true });
  setInterval(check, 20 * 1000);
  setInterval(() => { if (signedInUser) syncCalendarFromServer?.(); }, 2 * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  window.avisosCheck = check;
})();
