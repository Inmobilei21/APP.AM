/* Resumen de la semana: si se activa en «Mi cuenta» → Notificaciones, cada mañana (de lunes a viernes) a las 9:00 sale
   en grande la hoja de la semana con una columna por día: tareas que vencen, avisos, recordatorios del calendario,
   firmas digitales que caducan y plazos de inspecciones. Solo se cierra con el botón «Cerrar» (no con clic fuera ni Esc).
   De momento solo para Álvaro. Se carga después de app.js y notificaciones.js. */
(() => {
  const PILOTO = ["alvaro"];
  const allowed = () => Boolean(signedInUser && PILOTO.includes(signedInUser.id));
  const key = suffix => `am-resumen-${suffix}:${signedInUser?.id || ""}`;
  const get = (suffix, fallback = "") => { try { return localStorage.getItem(key(suffix)) ?? fallback; } catch { return fallback; } };
  const set = (suffix, value) => { try { localStorage.setItem(key(suffix), value); } catch {} };
  const enabled = () => allowed() && get("activo", "0") === "1";
  const hour = () => /^\d{2}:\d{2}$/.test(get("hora")) ? get("hora") : "09:00";
  const dayKey = date => localDateKey(date);
  const monday = date => { const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
  const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  async function weekItems(now = new Date()) {
    const start = monday(now), days = [...Array(7)].map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return dayKey(d); });
    const inWeek = date => days.includes(date), today = dayKey(now), items = [];
    const add = (date, kind, title, detail = "", time = "") => items.push({ date: date < days[0] ? "atrasado" : date, kind, title, detail, time });
    try {
      for (const task of personalTasks()) {
        if (task.status === "done") continue;
        const label = task.client || "Tarea", detail = task.description || task.workTitle || task.customConcept || "";
        if (task.finalDate && (inWeek(task.finalDate) || task.finalDate < today)) add(task.finalDate, task.finalDate < today ? "Tarea atrasada" : "Tarea vence", label, detail);
        const [rDate, rTime] = String(task.remindAt || "").split("T");
        if (rDate && inWeek(rDate) && rDate !== task.finalDate) add(rDate, "Aviso", label, detail, rTime);
      }
    } catch {}
    try {
      for (const item of getCalendarItems()) if (inWeek(item.date) && (!item.assigned || item.assigned === signedInUser.name)) add(item.date, "Recordatorio", item.title || "Recordatorio", item.notes || "", item.time || "");
    } catch {}
    try {
      for (const sig of await getAllSignatureMetadata()) if (sig.expiry && inWeek(sig.expiry)) add(sig.expiry, "Firma caduca", sig.client || sig.document || sig.id, sig.document || "");
    } catch {}
    try {
      const records = await apiJson("/api/inspections");
      for (const r of Array.isArray(records) ? records : []) if (r.deadline && inWeek(r.deadline) && (signedInUser.role === "admin" || r.assignedId === signedInUser.id)) add(r.deadline, "Plazo inspección", r.client || "Inspección", r.reference || "");
    } catch {}
    items.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    return { days, today, items };
  }

  const tone = kind => /atrasada/i.test(kind) ? "rojo" : /Firma/.test(kind) ? "ambar" : /inspecci/i.test(kind) ? "violeta" : /Recordatorio|Aviso/.test(kind) ? "verde" : "azul";
  const card = item => `<li class="rs-item rs-${tone(item.kind)}"><small>${escapeHtml(item.kind)}${item.time ? ` · ${escapeHtml(item.time)}` : ""}</small><strong>${escapeHtml(item.title)}</strong>${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ""}</li>`;

  async function show({ manual = false } = {}) {
    if (!allowed() || document.querySelector("#resumenSemana")) return;
    const { days, today, items } = await weekItems();
    const late = items.filter(i => i.date === "atrasado"), name = String(signedInUser.name || "").split(" ")[0];
    const cols = [...(late.length ? [{ id: "atrasado", label: "Atrasado", sub: "Sin terminar", list: late }] : []),
      ...days.map((d, i) => ({ id: d, label: DAYS[i], sub: new Date(`${d}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" }), list: items.filter(x => x.date === d), weekend: i > 4 }))]
      .filter(c => !c.weekend || c.list.length);
    const total = items.length, first = new Date(`${days[0]}T12:00:00`), last = new Date(`${days[6]}T12:00:00`);
    const shell = document.createElement("div"); shell.id = "resumenSemana"; shell.className = "rs-shell";
    shell.innerHTML = `<section class="rs-card" role="alertdialog" aria-modal="true" aria-labelledby="rsTitle">
      <header class="rs-head"><div><p class="eyebrow">TU SEMANA · ${escapeHtml(first.toLocaleDateString("es-ES", { day: "numeric", month: "long" }))} – ${escapeHtml(last.toLocaleDateString("es-ES", { day: "numeric", month: "long" }))}</p>
        <h2 id="rsTitle">Buenos días, ${escapeHtml(name)}</h2><p>${total ? `Tienes <b>${total}</b> ${total === 1 ? "cosa pendiente" : "cosas pendientes"} esta semana${late.length ? `, <b>${late.length}</b> atrasada${late.length === 1 ? "" : "s"}` : ""}.` : "No tienes nada pendiente esta semana."}</p></div></header>
      <div class="rs-grid" style="--rs-cols:${cols.length}">${cols.map(c => `<section class="rs-col${c.id === today ? " rs-hoy" : ""}${c.id === "atrasado" ? " rs-late" : ""}"><h3>${escapeHtml(c.label)}<small>${escapeHtml(c.id === today ? "Hoy" : c.sub)}</small></h3>${c.list.length ? `<ul>${c.list.map(card).join("")}</ul>` : '<p class="rs-vacio">Nada</p>'}</section>`).join("")}</div>
      <footer class="rs-foot"><small>Tareas, avisos, recordatorios, firmas que caducan y plazos de inspecciones.</small><button type="button" class="rs-close">Cerrar</button></footer></section>`;
    document.body.append(shell); document.documentElement.classList.add("rs-abierto");
    const close = shell.querySelector(".rs-close"); close.focus({ preventScroll: true });
    close.addEventListener("click", () => { shell.classList.add("rs-out"); document.documentElement.classList.remove("rs-abierto"); setTimeout(() => shell.remove(), 220); });
    // Solo se cierra con el botón: ni Esc ni clic fuera.
    shell.addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); } }, true);
    if (!manual) set("visto", dayKey(new Date()));
    if (!manual && document.hidden && "Notification" in window && Notification.permission === "granted") {
      try { const n = new Notification("Tu semana", { body: total ? `${total} ${total === 1 ? "cosa pendiente" : "cosas pendientes"} esta semana. Ábrela para verlas.` : "Nada pendiente esta semana.", tag: "resumen-semana", icon: "/app-icon-192.png?v=5", requireInteraction: true }); n.onclick = () => { window.focus(); n.close(); }; } catch {}
    }
  }

  function check() {
    if (!enabled()) return;
    const now = new Date(), weekday = now.getDay();
    const [hh, mm] = hour().split(":").map(Number);
    if (weekday === 0 || weekday === 6 || now.getHours() * 60 + now.getMinutes() < hh * 60 + mm || get("visto") === dayKey(now)) return;
    if (document.querySelector(".login2, .login-gate, #splash")) return;
    show();
  }

  // Ajuste en «Mi cuenta» → Notificaciones
  const previous = openAccountPanel;
  window.openAccountPanel = openAccountPanel = function () {
    const result = previous.apply(this, arguments);
    const slot = document.querySelector("#accountPanel .acc-slot-resumen");
    if (slot && allowed()) {
      slot.innerHTML = `<h3 class="account-section">Resumen de la semana</h3><div class="nt-card"><label class="nt-row"><span><strong>Aviso cada mañana</strong><small>De lunes a viernes, a la hora que elijas, sale en grande la hoja de la semana. Si abres la app más tarde, es lo primero que ves. Se cierra con «Cerrar».</small></span><input type="checkbox" class="nt-switch" data-rs-activo${enabled() ? " checked" : ""}></label><label class="nt-row rs-hora-row"><span><strong>Hora del aviso</strong></span><input type="text" class="rs-hora" data-rs-hora value="${hour()}" inputmode="numeric" maxlength="5" placeholder="09:00" autocomplete="off" aria-label="Hora del aviso, formato 24 horas"></label><button type="button" class="nt-test" data-rs-ver>Ver mi semana ahora</button></div>`;
      slot.querySelector("[data-rs-activo]").addEventListener("change", event => { set("activo", event.target.checked ? "1" : "0"); if (event.target.checked) set("visto", dayKey(new Date())); });
      // Hora escrita a mano, solo números y en formato 24 h: «830» → 08:30, «1415» → 14:15.
      const field = slot.querySelector("[data-rs-hora]");
      field.addEventListener("input", () => { const digits = field.value.replace(/\D/g, "").slice(0, 4); field.value = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits; field.classList.remove("rs-mal"); });
      const commit = () => {
        let digits = field.value.replace(/\D/g, ""); if (digits.length === 3) digits = "0" + digits; if (digits.length <= 2 && digits) digits = digits.padStart(2, "0") + "00";
        const hh = Number(digits.slice(0, 2)), mm = Number(digits.slice(2, 4));
        if (digits.length !== 4 || hh > 23 || mm > 59) { field.classList.add("rs-mal"); field.title = "Escribe una hora entre 00:00 y 23:59"; return; }
        const value = `${digits.slice(0, 2)}:${digits.slice(2)}`; field.value = value; field.classList.remove("rs-mal"); set("hora", value);
        const now = new Date(); if (now.getHours() * 60 + now.getMinutes() < hh * 60 + mm && get("visto") === dayKey(now)) set("visto", "");
      };
      field.addEventListener("change", commit); field.addEventListener("blur", commit);
      field.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); commit(); field.blur(); } else if (event.key.length === 1 && !/\d/.test(event.key) && !event.ctrlKey && !event.metaKey) event.preventDefault(); });
      slot.querySelector("[data-rs-ver]").addEventListener("click", () => { document.querySelector("#accountPanel")?.remove(); show({ manual: true }); });
    }
    return result;
  };

  // Al abrir la app pasada la hora, el resumen es lo primero que sale (las novedades esperan a que se cierre).
  window.resumenPendiente = () => { if (!enabled()) return false; const now = new Date(), [hh, mm] = hour().split(":").map(Number); return now.getDay() % 6 !== 0 && now.getHours() * 60 + now.getMinutes() >= hh * 60 + mm && get("visto") !== dayKey(now); };
  const start = () => { if (!signedInUser) { setTimeout(start, 1000); return; } [800, 2500, 5000].forEach(ms => setTimeout(check, ms)); };
  if (window.__authDecidida) start(); else document.addEventListener("auth-decidida", start, { once: true });
  setInterval(check, 30 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  window.resumenSemana = show;
})();
