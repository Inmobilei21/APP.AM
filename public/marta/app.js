(function () {
  "use strict";
  const D = window.MW_DATA;
  const MACHINES = D.MAQUINAS;
  const byId = Object.fromEntries(MACHINES.map(m => [m.id, m]));
  const DAY_KEYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const DAY_LONG = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const ICONS = {
    pierna: '<path d="M4 19h16M7 19l3-9 6-3M10 10l5 5"/><circle cx="17" cy="6" r="1.5"/>',
    gluteo: '<path d="M3 17h18M6 17c1-4 4-6 6-6s5 2 6 6"/><circle cx="12" cy="7" r="1.6"/>',
    abductor: '<path d="M8 4v16M16 4v16M8 12H4M16 12h4"/><circle cx="12" cy="12" r="1.4"/>',
    espalda: '<path d="M4 4h16M8 4l2 6M16 4l-2 6"/><circle cx="12" cy="13" r="2"/><path d="M12 15v5"/>',
    remo: '<path d="M3 18h18M6 18v-6h5M11 12l7-3"/><circle cx="8" cy="8" r="1.6"/>',
    pecho: '<path d="M5 6v12M19 6v12M5 12h14"/><circle cx="12" cy="7" r="1.6"/>',
    hombro: '<path d="M6 20V9M18 20V9M4 9h4M16 9h4"/><circle cx="12" cy="6" r="1.6"/><path d="M12 8v6"/>',
    brazo: '<path d="M6 18c0-5 2-9 6-10M12 8c3 0 5 2 6 5"/><circle cx="18" cy="14" r="1.6"/>',
    core: '<rect x="8" y="5" width="8" height="14" rx="3"/><path d="M8 10h8M8 14h8M12 5v14"/>',
    cardio: '<path d="M3 13h4l2-5 3 10 2-5h7"/>'
  };

  // ---------- Almacenamiento en el dispositivo ----------
  const KEY = "marta-wellness.v1";
  function load() {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  const saved = load() || {};
  const db = {
    profile: Object.assign({ name: "Marta", goal: "Tonificar y ganar fuerza", photo: null }, saved.profile),
    routines: saved.routines || JSON.parse(JSON.stringify(D.RUTINAS)),
    log: saved.log || {},           // { "2026-10-23": { prensa: [[reps, kg], ...] } }
    bought: saved.bought || {},     // { "2026-W43": { "Huevos": true } }
    extras: saved.extras || {}      // { "2026-W43": [{ name, done }] }
  };
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) { toast("No queda espacio en el móvil para guardar"); return false; }
  }

  // ---------- Fechas ----------
  const pad = n => String(n).padStart(2, "0");
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const weekday = d => (d.getDay() + 6) % 7; // 0 = lunes
  function isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
    const y = t.getUTCFullYear(), first = new Date(Date.UTC(y, 0, 4));
    const w = 1 + Math.round(((t - first) / 864e5 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
    return { year: y, week: w, key: `${y}-W${pad(w)}` };
  }
  const now = () => new Date();
  const todayKey = () => dateKey(now());
  const thisWeek = () => isoWeek(now());
  const niceDate = k => { const d = parseKey(k); return `${DAY_LONG[weekday(d)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };

  // ---------- Utilidades ----------
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, dec = 1) => (Math.round(n * 10 ** dec) / 10 ** dec).toLocaleString("es-ES");
  const decimal = v => v === "" || v == null ? "" : String(v).replace(".", ",");
  const num = v => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : 0; };
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  // ---------- Cálculos de entrenamiento ----------
  const validSets = sets => (sets || []).filter(s => num(s[0]) > 0);
  const topWeight = sets => validSets(sets).reduce((m, s) => Math.max(m, num(s[1])), 0);
  const volume = sets => validSets(sets).reduce((v, s) => v + num(s[0]) * num(s[1]), 0);

  // Sesiones de una máquina, de la más antigua a la más reciente.
  function sessionsOf(id) {
    return Object.keys(db.log).sort().filter(k => validSets(db.log[k][id]).length).map(k => ({ date: k, sets: validSets(db.log[k][id]) }));
  }
  // Peso máximo y volumen por semana (solo semanas con datos).
  function weeklyOf(id) {
    const weeks = new Map();
    sessionsOf(id).forEach(s => {
      const w = isoWeek(parseKey(s.date));
      const cur = weeks.get(w.key) || { key: w.key, week: w.week, top: 0, vol: 0 };
      cur.top = Math.max(cur.top, topWeight(s.sets)); cur.vol += volume(s.sets);
      weeks.set(w.key, cur);
    });
    return [...weeks.values()].sort((a, b) => a.key.localeCompare(b.key));
  }
  // Compara la semana con datos más reciente con la anterior con datos.
  function trend(id) {
    const w = weeklyOf(id);
    if (w.length < 2) return null;
    const a = w[w.length - 2], b = w[w.length - 1];
    return a.top ? ((b.top - a.top) / a.top) * 100 : null;
  }
  function weekStats(weekKey) {
    let sessions = new Set(), vol = 0;
    Object.keys(db.log).forEach(k => {
      if (isoWeek(parseKey(k)).key !== weekKey) return;
      Object.values(db.log[k]).forEach(sets => { if (validSets(sets).length) { sessions.add(k); vol += volume(sets); } });
    });
    return { sessions: sessions.size, vol };
  }

  // ---------- Cálculos de dieta ----------
  function shoppingList() {
    const map = new Map();
    DAY_KEYS.forEach(day => Object.values(D.DIETA[day] || {}).forEach(meal => meal.forEach(([food, q, unit, aisle]) => {
      const k = food + "|" + unit;
      const cur = map.get(k) || { food, unit, aisle, q: 0 };
      cur.q += q; map.set(k, cur);
    })));
    return [...map.values()];
  }
  function prettyQty(it) {
    if (it.unit === "ud") { const n = Math.ceil(it.q); return n + (n === 1 ? " unidad" : " unidades"); }
    if (it.unit === "ml") return it.q >= 1000 ? fmt(it.q / 1000, 2) + " l" : it.q + " ml";
    return it.q >= 1000 ? fmt(it.q / 1000, 2) + " kg" : it.q + " g";
  }
  function nextMeal() {
    const d = now(), mins = d.getHours() * 60 + d.getMinutes();
    const idx = D.COMIDAS.findIndex(c => { const [h, m] = c.hora.split(":").map(Number); return h * 60 + m + 60 > mins; });
    return idx === -1 ? { meal: D.COMIDAS[0], day: (weekday(d) + 1) % 7, tomorrow: true } : { meal: D.COMIDAS[idx], day: weekday(d), tomorrow: false };
  }

  // ---------- Estado de pantalla ----------
  const ui = {
    tab: ["inicio", "entreno", "dieta", "compra", "perfil"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "inicio",
    routine: db.routines[0] && db.routines[0].id,
    open: null,
    day: weekday(now()),
    date: todayKey()
  };
  const screen = $("#screen");

  // ---------- Piezas ----------
  const avatarAttrs = () => db.profile.photo ? ` style="background-image:url('${db.profile.photo}')"` : "";
  const avatarText = () => db.profile.photo ? "" : esc((db.profile.name || "M").trim().charAt(0).toUpperCase());
  function topbar(hideAvatar) {
    return `<header class="topbar">
      <div class="brand"><svg aria-hidden="true"><use href="#mw-logo"/></svg><span class="brand-name">Marta Wellness<small>Rendimiento</small></span></div>
      ${hideAvatar ? "" : `<button class="avatar" data-go="perfil" aria-label="Perfil"${avatarAttrs()}>${avatarText()}</button>`}
    </header>`;
  }
  function deltaBadge(d) {
    if (d == null) return `<span class="delta">nuevo</span>`;
    const cls = d > 0.05 ? " up" : d < -0.05 ? " down" : "";
    return `<span class="delta${cls}">${d > 0 ? "+" : ""}${fmt(d)}%</span>`;
  }

  function chart(id) {
    const weeks = weeklyOf(id).slice(-8);
    if (!weeks.length) return `<p class="small muted">Cuando guardes series aquí verás tu peso máximo de cada semana.</p>`;
    const data = weeks.map(w => w.top);
    const W = 300, H = 124, padL = 32, padR = 14, padT = 12, padB = 22;
    let min = Math.floor(Math.min(...data) / 5) * 5, max = Math.ceil(Math.max(...data) / 5) * 5;
    if (max - min < 10) { min = Math.max(0, min - 5); max = min + 10 + (max - min > 5 ? 5 : 0); }
    const x = i => data.length === 1 ? (padL + W - padR) / 2 : padL + (i * (W - padL - padR)) / (data.length - 1);
    const y = v => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
    const pts = data.map((v, i) => [x(i), y(v)]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${H - padB} L${pts[0][0].toFixed(1)} ${H - padB} Z`;
    const ticks = [min, (min + max) / 2, max];
    const current = thisWeek().key;
    const last = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Peso máximo por semana">
      ${ticks.map(t => `<line x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke="#e2d6c6" stroke-width="1"/>
        <text x="${padL - 6}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#6d655c" font-family="Jost, Arial, sans-serif">${fmt(t)}</text>`).join("")}
      ${data.length > 1 ? `<path d="${area}" fill="#e3d7c6" opacity=".7"/><path d="${line}" fill="none" stroke="#141210" stroke-width="1.5" stroke-linejoin="round"/>` : ""}
      ${pts.slice(0, -1).map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.3" fill="#ffffff" stroke="#141210" stroke-width="1"/>`).join("")}
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" fill="#141210"/>
      ${weeks.map((w, i) => `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9.5" fill="${w.key === current ? "#141210" : "#6d655c"}" font-family="Jost, Arial, sans-serif">${w.key === current ? "Esta" : "S" + w.week}</text>`).join("")}
    </svg>`;
  }

  function setsSummary(sets) {
    const v = validSets(sets);
    if (!v.length) return "";
    const reps = v.map(s => num(s[0]));
    const same = reps.every(r => r === reps[0]);
    return `${v.length} × ${same ? reps[0] : reps.join("/")} · ${fmt(topWeight(v))} kg`;
  }

  function machineHead(id) {
    const m = byId[id];
    const today = (db.log[ui.date] || {})[id];
    const done = validSets(today).length;
    const prev = sessionsOf(id).filter(s => s.date !== ui.date).pop();
    const sub = done ? `<span class="done-dot"></span>${setsSummary(today)}` : prev ? `Última: ${setsSummary(prev.sets)}` : esc(m.grupo);
    return `<span class="mach-ico"><svg viewBox="0 0 24 24">${ICONS[m.icono] || ICONS.pierna}</svg></span>
      <span class="item-text"><strong>${esc(m.nombre)}</strong><span>${sub}</span></span>
      ${deltaBadge(trend(id))}
      <span class="chev" aria-hidden="true">›</span>`;
  }

  function machineItem(id) {
    if (!byId[id]) return "";
    const open = ui.open === id;
    const sets = (db.log[ui.date] || {})[id] || [];
    const past = sessionsOf(id).filter(s => s.date !== ui.date);
    const prev = past[past.length - 1];
    return `<div class="item${open ? " open" : ""}">
      <button class="item-head" data-toggle="${id}" aria-expanded="${open}" id="head-${id}">${machineHead(id)}</button>
      ${open ? `<div class="item-body">
        ${prev && !sets.length ? `<div class="last-time">La última vez (${niceDate(prev.date)}): ${prev.sets.map(s => `${num(s[0])}×${fmt(num(s[1]))} kg`).join(" · ")}</div>` : ""}
        ${sets.length ? `<div class="sets">
          <div class="set-row head"><span>Serie</span><span>Repeticiones</span><span>Peso</span><span></span></div>
          ${sets.map((s, i) => `<div class="set-row">
            <span class="set-n">${i + 1}</span>
            <label class="field"><input id="r-${id}-${i}" inputmode="numeric" enterkeyhint="next" value="${esc(decimal(s[0]))}" placeholder="${prev && prev.sets[i] ? num(prev.sets[i][0]) : 10}" data-set="${id}" data-i="${i}" data-k="0" aria-label="Repeticiones de la serie ${i + 1}"><small>reps</small></label>
            <label class="field"><input id="w-${id}-${i}" inputmode="decimal" enterkeyhint="next" value="${esc(decimal(s[1]))}" placeholder="${prev && prev.sets[i] ? fmt(num(prev.sets[i][1])) : 0}" data-set="${id}" data-i="${i}" data-k="1" aria-label="Peso de la serie ${i + 1} en kilos"><small>kg</small></label>
            <button class="icon-btn" data-del="${id}" data-i="${i}" aria-label="Quitar la serie ${i + 1}">×</button>
          </div>`).join("")}
        </div>` : ""}
        <div class="btn-row">
          ${prev && !sets.length ? `<button class="btn" data-repeat="${id}">Repetir última sesión</button>` : ""}
          <button class="btn ${prev && !sets.length ? "ghost" : sets.length ? "ghost" : ""}" data-add="${id}">+ Añadir serie</button>
        </div>
        <div class="chart-box">
          <div class="legend"><span>Peso máximo por semana (kg)</span><span id="vol-${id}">${sets.length ? `Volumen hoy: ${fmt(volume(sets), 0)} kg` : ""}</span></div>
          <div id="chart-${id}">${chart(id)}</div>
        </div>
        ${past.length ? `<div class="history"><span class="eyebrow" style="padding-bottom:4px">Historial</span>${past.slice(-5).reverse().map(s => `<div><span>${niceDate(s.date)}</span><span>${s.sets.map(x => `${num(x[0])}×${fmt(num(x[1]))}`).join(" · ")}</span></div>`).join("")}</div>` : ""}
      </div>` : ""}
    </div>`;
  }

  // ---------- Pantallas ----------
  const views = {
    inicio() {
      const wk = thisWeek(), stats = weekStats(wk.key);
      const prevWeek = isoWeek(new Date(now().getTime() - 7 * 864e5)).key;
      const prevStats = weekStats(prevWeek);
      const trained = [...new Set(Object.values(db.log).flatMap(day => Object.keys(day).filter(id => validSets(day[id]).length)))].filter(id => byId[id]);
      const trends = trained.map(id => ({ id, d: trend(id) })).filter(t => t.d != null);
      const ups = trends.filter(t => t.d > 0.05);
      const best = trends.slice().sort((a, b) => b.d - a.d)[0];
      const list = shoppingList(), bought = db.bought[wk.key] || {};
      const done = list.filter(i => bought[i.food]).length;
      const nm = nextMeal();
      const foods = (D.DIETA[DAY_KEYS[nm.day]] || {})[nm.meal.id] || [];
      const hour = now().getHours();
      const hello = hour < 14 ? "Buenos días" : hour < 21 ? "Buenas tardes" : "Buenas noches";
      const volLabel = stats.vol >= 1000 ? fmt(stats.vol / 1000) : fmt(stats.vol, 0);
      return `${topbar()}
        <div class="stack">
          <span class="eyebrow">Semana ${wk.week} · ${niceDate(todayKey())}</span>
          <h1>${hello}, ${esc(db.profile.name || "Marta")}.<br><em>${stats.sessions ? "Sigue así." : "Hoy es buen día para entrenar."}</em></h1>
        </div>
        <div class="section">
          <div class="hero-card">
            <span class="eyebrow">Tu semana</span>
            <div class="kpis">
              <div class="kpi"><b>${stats.sessions}</b><span>${stats.sessions === 1 ? "sesión" : "sesiones"}</span></div>
              <div class="kpi"><b>${trends.length ? `${ups.length}/${trends.length}` : "–"}</b><span>máquinas suben</span></div>
              <div class="kpi"><b>${volLabel}</b><span>${stats.vol >= 1000 ? "toneladas" : "kg movidos"}</span></div>
            </div>
            <p class="small muted">${best && best.d > 0.05
              ? `Mayor progreso: <span style="color:var(--ink)">${esc(byId[best.id].nombre)}</span>, ${fmt(best.d)}% más peso que la semana anterior.`
              : prevStats.sessions ? `La semana pasada hiciste ${prevStats.sessions} ${prevStats.sessions === 1 ? "sesión" : "sesiones"}.` : "Apunta tus series en Entreno y aquí verás cómo progresas cada semana."}</p>
          </div>
          <button class="btn wide" data-go="entreno">Ir a entrenar</button>
        </div>
        <div class="section">
          <div class="row"><h2>${nm.tomorrow ? "Mañana" : "Próxima comida"}</h2><button class="btn ghost" data-go="dieta" data-day="${nm.day}">Ver dieta</button></div>
          <div class="meal" style="border-top:1px solid var(--line)">
            <span class="meal-time">${esc(nm.meal.nombre)} · ${esc(nm.meal.hora)}</span>
            ${foods.map(f => `<div class="food"><span>${esc(f[0])}</span><span>${fmt(f[1])} ${esc(f[2])}</span></div>`).join("") || `<span class="small muted">Sin alimentos en el plan.</span>`}
          </div>
        </div>
        <div class="section">
          <div class="row"><h2>Lista de la compra</h2><button class="btn ghost" data-go="compra">Abrir</button></div>
          <div class="progress-line"><i style="width:${list.length ? (done / list.length) * 100 : 0}%"></i></div>
          <span class="small muted">${done} de ${list.length} productos comprados esta semana</span>
        </div>`;
    },

    entreno() {
      const r = db.routines.find(x => x.id === ui.routine) || db.routines[0];
      if (r) ui.routine = r.id;
      const isToday = ui.date === todayKey();
      return `${topbar()}
        <div class="stack">
          <div class="row"><span class="eyebrow">${isToday ? "Hoy" : "Sesión del"} · ${niceDate(ui.date)}</span>${D.ejemplo.maquinas ? `<span class="tag">Máquinas de ejemplo</span>` : ""}</div>
          <h1>Entreno</h1>
          <div class="chips" role="group" aria-label="Rutinas">
            ${db.routines.map(x => `<button class="chip" data-routine="${esc(x.id)}" aria-pressed="${r && x.id === r.id}">${esc(x.nombre)}</button>`).join("")}
            <button class="chip" data-newroutine>+ Nueva</button>
          </div>
        </div>
        ${r ? `<div class="section">
          <div class="row"><h2><em>${esc(r.nombre)}</em></h2><button class="link-btn" data-edit="${esc(r.id)}">Editar rutina</button></div>
          ${r.maquinas.length ? `<div class="list">${r.maquinas.map(machineItem).join("")}</div>`
            : `<div class="empty"><h3>Rutina vacía</h3><p class="small muted">Elige las máquinas del gimnasio que quieres hacer en esta rutina.</p><button class="btn" data-edit="${esc(r.id)}">Elegir máquinas</button></div>`}
          <div class="row small muted">
            <span>${isToday ? "Los cambios se guardan solos." : "Estás editando una sesión pasada."}</span>
            <button class="link-btn" data-pickdate>${isToday ? "Otro día" : "Volver a hoy"}</button>
          </div>
          <label class="field" id="date-field" hidden><input type="date" id="date-input" value="${ui.date}" max="${todayKey()}" aria-label="Fecha de la sesión"></label>
        </div>` : `<div class="section"><div class="empty"><h3>Crea tu primera rutina</h3><p class="small muted">Ponle nombre y elige las máquinas del gimnasio.</p><button class="btn" data-newroutine>Nueva rutina</button></div></div>`}`;
    },

    dieta() {
      const day = D.DIETA[DAY_KEYS[ui.day]] || {};
      const nm = nextMeal();
      return `${topbar()}
        <div class="stack">
          <div class="row"><span class="eyebrow">Plan del nutricionista</span>${D.ejemplo.dieta ? `<span class="tag">Plan de ejemplo</span>` : ""}</div>
          <h1>Dieta</h1>
          <div class="chips" role="group" aria-label="Día de la semana">${DAY_SHORT.map((d, i) => `<button class="chip" data-day="${i}" aria-pressed="${i === ui.day}">${d}${i === weekday(now()) ? " ·" : ""}</button>`).join("")}</div>
        </div>
        <div class="section" style="gap:0">
          ${D.COMIDAS.map(c => {
            const foods = day[c.id] || [];
            if (!foods.length) return "";
            const isNext = !nm.tomorrow && nm.day === ui.day && nm.meal.id === c.id;
            return `<div class="meal${isNext ? " next" : ""}">
              <span class="meal-time">${esc(c.nombre)} · ${esc(c.hora)}${isNext ? " · Siguiente" : ""}</span>
              ${foods.map(f => `<div class="food"><span>${esc(f[0])}</span><span>${fmt(f[1])} ${esc(f[2])}</span></div>`).join("")}
            </div>`;
          }).join("")}
        </div>`;
    },

    compra() {
      const wk = thisWeek(), bought = db.bought[wk.key] || {}, extras = db.extras[wk.key] || [];
      const list = shoppingList();
      const total = list.length + extras.length;
      const done = list.filter(i => bought[i.food]).length + extras.filter(e => e.done).length;
      return `${topbar()}
        <div class="stack">
          <span class="eyebrow">Semana ${wk.week} · 7 días de dieta</span>
          <h1>La compra</h1>
          <p class="small muted">Suma todo lo que pide la dieta de lunes a domingo, ordenado por pasillo. Cada lunes empieza una lista nueva.</p>
          <div class="progress-line"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div>
          <div class="row"><span class="small muted">${done} de ${total} productos</span>${done ? `<button class="link-btn" data-uncheck>Desmarcar todo</button>` : ""}</div>
        </div>
        <div class="section" style="gap:4px">
          ${D.PASILLOS.concat([...new Set(list.map(i => i.aisle))].filter(a => !D.PASILLOS.includes(a))).map(a => {
            const items = list.filter(i => i.aisle === a).sort((x, y) => x.food.localeCompare(y.food, "es"));
            if (!items.length) return "";
            return `<div class="shop-group"><h3>${esc(a)}</h3>${items.map(it => {
              const id = "buy-" + it.food.normalize("NFD").replace(/[^\w]/g, "");
              return `<label class="shop-item${bought[it.food] ? " done" : ""}" for="${id}">
                <input type="checkbox" class="check" id="${id}" data-buy="${esc(it.food)}"${bought[it.food] ? " checked" : ""}>
                <span class="name">${esc(it.food)}</span><span class="qty">${prettyQty(it)}</span>
              </label>`;
            }).join("")}</div>`;
          }).join("")}
          <div class="shop-group">
            <h3>Otros</h3>
            ${extras.map((e, i) => `<label class="shop-item${e.done ? " done" : ""}" for="extra-${i}">
              <input type="checkbox" class="check" id="extra-${i}" data-extra="${i}"${e.done ? " checked" : ""}>
              <span class="name">${esc(e.name)}</span><button class="icon-btn" data-delextra="${i}" aria-label="Quitar ${esc(e.name)}">×</button>
            </label>`).join("")}
            <form class="add-row" id="extra-form" style="padding-top:10px">
              <label class="field"><input id="extra-input" placeholder="Añadir otro producto" aria-label="Producto que no está en la dieta" autocomplete="off"></label>
              <button class="btn ghost" type="submit">Añadir</button>
            </form>
          </div>
        </div>`;
    },

    perfil() {
      const days = Object.keys(db.log).filter(k => Object.values(db.log[k]).some(s => validSets(s).length));
      return `${topbar(true)}
        <div class="profile">
          <button class="avatar big" data-photo aria-label="Cambiar la foto de perfil"${avatarAttrs()}>${avatarText()}</button>
          <div class="btn-row" style="justify-content:center">
            <button class="btn ghost" data-photo>${db.profile.photo ? "Cambiar foto" : "Añadir foto de perfil"}</button>
            ${db.profile.photo ? `<button class="btn ghost" data-nophoto>Quitar</button>` : ""}
          </div>
          <div class="form" style="margin-top:8px">
            <label>Nombre<span class="field"><input id="p-name" value="${esc(db.profile.name)}" data-profile="name" autocomplete="given-name"></span></label>
            <label>Objetivo<span class="field"><input id="p-goal" value="${esc(db.profile.goal)}" data-profile="goal"></span></label>
          </div>
          <div class="section" style="width:100%;margin-top:18px">
            <span class="eyebrow" style="text-align:left">Tus datos</span>
            <div class="settings">
              <div><span>Días entrenados</span><span class="muted">${days.length}</span></div>
              <div><span>Rutinas</span><span class="muted">${db.routines.length}</span></div>
              <div><span>Copia de seguridad<br><span class="muted">Los datos se guardan en este móvil. Descarga una copia de vez en cuando.</span></span><button class="btn ghost" data-export>Descargar</button></div>
              <div><span>Recuperar una copia</span><button class="btn ghost" data-import>Abrir</button></div>
              <div><span>Ver la app con datos de prueba<br><span class="muted">Añade 6 semanas de entrenos de ejemplo.</span></span><button class="btn ghost" data-demo>Cargar</button></div>
              <div><span>Borrar todos los datos</span><button class="btn danger" data-wipe>Borrar</button></div>
            </div>
          </div>
          <p class="small muted" style="margin-top:14px">Para tenerla como app: en iPhone, Safari › Compartir › Añadir a pantalla de inicio. En Android, Chrome › menú › Instalar aplicación.</p>
        </div>`;
    }
  };

  const TABS = [
    ["inicio", "Inicio", '<path d="M4 11l8-6 8 6v8h-5v-5H9v5H4z"/>'],
    ["entreno", "Entreno", '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>'],
    ["dieta", "Dieta", '<path d="M12 21c-5 0-8-4-8-9 0-3 2-5 4.5-5 1.4 0 2.6.7 3.5 1.6.9-.9 2.1-1.6 3.5-1.6C18 7 20 9 20 12c0 5-3 9-8 9z"/><path d="M12 8c0-2 1-4 3-5"/>'],
    ["compra", "Compra", '<path d="M5 8h14l-1.5 11h-11z"/><path d="M9 8a3 3 0 016 0"/>'],
    ["perfil", "Perfil", '<circle cx="12" cy="9" r="3.5"/><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5"/>']
  ];

  function render(keepScroll) {
    const y = screen.scrollTop;
    screen.innerHTML = views[ui.tab]();
    $("#tabbar").innerHTML = TABS.map(([id, label, ico]) => `<button class="tab" data-go="${id}"${ui.tab === id ? ' aria-current="page"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${ico}</svg>${label}</button>`).join("");
    screen.scrollTop = keepScroll ? y : 0;
  }
  function go(tab) {
    ui.tab = tab;
    try { history.replaceState(null, "", "#" + tab); } catch (e) {}
    render();
  }

  // ---------- Hoja inferior ----------
  const sheet = $("#sheet");
  function openSheet(html) { sheet.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grabber"></div>${html}</div>`; sheet.hidden = false; }
  function closeSheet() { sheet.hidden = true; sheet.innerHTML = ""; }
  sheet.addEventListener("click", e => { if (e.target === sheet) closeSheet(); });

  function editRoutine(id) {
    const r = db.routines.find(x => x.id === id);
    const chosen = new Set(r ? r.maquinas : []);
    const groups = [...new Set(MACHINES.map(m => m.grupo))];
    openSheet(`
      <div class="row"><h2>${r ? "Editar rutina" : "Nueva rutina"}</h2><button class="icon-btn" data-close aria-label="Cerrar">×</button></div>
      <form class="form" id="routine-form" data-id="${r ? esc(r.id) : ""}">
        <label>Nombre<span class="field"><input id="routine-name" value="${r ? esc(r.nombre) : ""}" placeholder="Por ejemplo: Pierna y glúteo" required></span></label>
        <span class="eyebrow" style="margin-top:8px">Máquinas · en el orden en que las marques</span>
        ${groups.map(g => `<div><h3 style="padding:10px 0 2px">${esc(g)}</h3>${MACHINES.filter(m => m.grupo === g).map(m => `
          <label class="pick" for="pick-${m.id}">
            <input type="checkbox" class="check" id="pick-${m.id}" value="${m.id}"${chosen.has(m.id) ? " checked" : ""}>
            <span class="mach-ico"><svg viewBox="0 0 24 24">${ICONS[m.icono] || ICONS.pierna}</svg></span>
            <span class="item-text"><strong>${esc(m.nombre)}</strong></span>
          </label>`).join("")}</div>`).join("")}
        <div class="btn-row" style="margin-top:8px">
          <button class="btn" type="submit">Guardar rutina</button>
          ${r && db.routines.length > 1 ? `<button class="btn danger" type="button" data-delroutine="${esc(r.id)}">Eliminar rutina</button>` : ""}
        </div>
      </form>`);
    const order = r ? r.maquinas.slice() : [];
    sheet.querySelectorAll(".pick input").forEach(i => i.addEventListener("change", () => {
      const k = order.indexOf(i.value);
      if (i.checked && k === -1) order.push(i.value);
      if (!i.checked && k !== -1) order.splice(k, 1);
    }));
    $("#routine-form").addEventListener("submit", e => {
      e.preventDefault();
      const name = $("#routine-name").value.trim();
      if (!name) return;
      if (r) { r.nombre = name; r.maquinas = order; }
      else { const nr = { id: "r-" + Date.now().toString(36), nombre: name, maquinas: order }; db.routines.push(nr); ui.routine = nr.id; }
      persist(); closeSheet(); render(true); toast("Rutina guardada");
    });
  }

  function confirmSheet(title, text, action, label) {
    openSheet(`<h2>${title}</h2><p class="muted">${text}</p>
      <div class="btn-row"><button class="btn danger" data-confirm>${label}</button><button class="btn ghost" data-close>Cancelar</button></div>`);
    sheet.querySelector("[data-confirm]").addEventListener("click", () => { closeSheet(); action(); });
  }

  // ---------- Datos de prueba ----------
  function loadDemo() {
    const base = { prensa: 70, "hip-thrust": 40, abductores: 35, femoral: 20, patada: 15, jalon: 25, "remo-sentado": 22.5, "pecho-press": 15, "press-hombro": 10, elevaciones: 4 };
    const t = now();
    for (let w = 6; w >= 1; w--) {
      [0, 3].forEach((offset, idx) => {
        const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - weekday(t) - w * 7 + offset);
        const r = db.routines[idx] || db.routines[0];
        if (!r) return;
        const day = db.log[dateKey(d)] = db.log[dateKey(d)] || {};
        r.maquinas.forEach(id => {
          const start = base[id] || 20, step = start >= 40 ? 2.5 : 1.25;
          const kg = start + Math.floor((6 - w) * 0.8) * step;
          day[id] = [[12, kg - step], [10, kg], [10, kg]];
        });
      });
    }
    persist(); render(true); toast("Datos de prueba cargados");
  }

  // ---------- Copia de seguridad ----------
  function exportBackup() {
    const blob = new Blob([JSON.stringify(db, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `marta-wellness-${todayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  $("#backup-input").addEventListener("change", e => {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    file.text().then(txt => {
      const data = JSON.parse(txt);
      if (!data || typeof data.log !== "object" || !Array.isArray(data.routines)) throw new Error("formato");
      Object.assign(db, { profile: Object.assign(db.profile, data.profile), routines: data.routines, log: data.log, bought: data.bought || {}, extras: data.extras || {} });
      persist(); render(); toast("Copia recuperada");
    }).catch(() => toast("Ese archivo no es una copia de Marta Wellness"));
  });

  // ---------- Foto de perfil ----------
  $("#photo-input").addEventListener("change", e => {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"), size = 360, s = Math.min(img.width, img.height);
      c.width = c.height = size;
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      db.profile.photo = c.toDataURL("image/jpeg", .85);
      if (persist()) toast("Foto actualizada");
      render(true);
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("No se ha podido abrir esa imagen"); };
    img.src = url;
  });

  // ---------- Eventos ----------
  function refreshMachine(id) {
    const head = document.getElementById("head-" + id);
    if (head) head.innerHTML = machineHead(id);
    const chartEl = document.getElementById("chart-" + id);
    if (chartEl) chartEl.innerHTML = chart(id);
    const vol = document.getElementById("vol-" + id);
    const sets = (db.log[ui.date] || {})[id] || [];
    if (vol) vol.textContent = sets.length ? `Volumen hoy: ${fmt(volume(sets), 0)} kg` : "";
  }
  function daySets(id) {
    const day = db.log[ui.date] = db.log[ui.date] || {};
    return day[id] = day[id] || [];
  }
  function cleanDay() {
    const day = db.log[ui.date];
    if (!day) return;
    Object.keys(day).forEach(id => { if (!day[id].length) delete day[id]; });
    if (!Object.keys(day).length) delete db.log[ui.date];
  }

  document.addEventListener("click", e => {
    const t = e.target.closest("button");
    if (!t) return;
    const ds = t.dataset;
    if (ds.close !== undefined) closeSheet();
    else if (ds.go) { if (ds.day) ui.day = +ds.day; go(ds.go); }
    else if (ds.toggle) { ui.open = ui.open === ds.toggle ? null : ds.toggle; render(true); }
    else if (ds.routine) { ui.routine = ds.routine; ui.open = null; render(true); }
    else if (ds.newroutine !== undefined) editRoutine(null);
    else if (ds.edit) editRoutine(ds.edit);
    else if (ds.delroutine) {
      const id = ds.delroutine;
      confirmSheet("Eliminar rutina", "Se elimina la rutina, pero no las series que ya has guardado.", () => {
        db.routines = db.routines.filter(r => r.id !== id); ui.routine = db.routines[0] && db.routines[0].id; persist(); render(); toast("Rutina eliminada");
      }, "Eliminar");
    }
    else if (ds.add) {
      const sets = daySets(ds.add), last = sets[sets.length - 1];
      sets.push(last ? [last[0], last[1]] : ["", ""]);
      persist(); render(true);
      const inputs = document.querySelectorAll(`[data-set="${ds.add}"]`);
      if (inputs.length && !last) inputs[inputs.length - 2].focus();
    }
    else if (ds.repeat) {
      const prev = sessionsOf(ds.repeat).filter(s => s.date !== ui.date).pop();
      if (prev) { daySets(ds.repeat).push(...prev.sets.map(s => [num(s[0]), num(s[1])])); persist(); render(true); toast("Copiada. Ajusta lo que cambie hoy"); }
    }
    else if (ds.del) { daySets(ds.del).splice(+ds.i, 1); cleanDay(); persist(); render(true); }
    else if (ds.day) { ui.day = +ds.day; render(true); }
    else if (ds.pickdate !== undefined) {
      if (ui.date !== todayKey()) { ui.date = todayKey(); ui.open = null; render(true); return; }
      const f = $("#date-field"); f.hidden = !f.hidden; if (!f.hidden) $("#date-input").focus();
    }
    else if (ds.uncheck !== undefined) {
      const wk = thisWeek().key; db.bought[wk] = {}; (db.extras[wk] || []).forEach(x => { x.done = false; }); persist(); render(true);
    }
    else if (ds.delextra) { const wk = thisWeek().key; db.extras[wk].splice(+ds.delextra, 1); persist(); render(true); }
    else if (ds.photo !== undefined) $("#photo-input").click();
    else if (ds.nophoto !== undefined) { db.profile.photo = null; persist(); render(true); }
    else if (ds.export !== undefined) exportBackup();
    else if (ds.import !== undefined) $("#backup-input").click();
    else if (ds.demo !== undefined) confirmSheet("Cargar datos de prueba", "Se añaden 6 semanas de entrenos inventados a tus rutinas para ver cómo se ven los gráficos. Puedes borrarlos luego con Borrar todos los datos.", loadDemo, "Cargar");
    else if (ds.wipe !== undefined) confirmSheet("Borrar todos los datos", "Se borran tus series, rutinas, lista de la compra y foto de este móvil. No se puede deshacer.", () => {
      try { localStorage.removeItem(KEY); } catch (err) {}
      location.reload();
    }, "Borrar todo");
  });

  document.addEventListener("change", e => {
    const t = e.target, wk = thisWeek().key;
    if (t.dataset.buy) {
      db.bought[wk] = db.bought[wk] || {};
      if (t.checked) db.bought[wk][t.dataset.buy] = true; else delete db.bought[wk][t.dataset.buy];
      persist(); render(true);
    } else if (t.dataset.extra) {
      db.extras[wk][+t.dataset.extra].done = t.checked; persist(); render(true);
    } else if (t.id === "date-input" && t.value) {
      ui.date = t.value > todayKey() ? todayKey() : t.value; ui.open = null; render(true);
    }
  });

  document.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.set) {
      const sets = daySets(t.dataset.set), row = sets[+t.dataset.i];
      if (!row) return;
      const v = t.value.trim();
      row[+t.dataset.k] = v === "" ? "" : num(v);
      persist(); refreshMachine(t.dataset.set);
    } else if (t.dataset.profile) {
      db.profile[t.dataset.profile] = t.value; persist();
    }
  });

  document.addEventListener("submit", e => {
    if (e.target.id !== "extra-form") return;
    e.preventDefault();
    const input = $("#extra-input"), name = input.value.trim();
    if (!name) return;
    const wk = thisWeek().key;
    (db.extras[wk] = db.extras[wk] || []).push({ name, done: false });
    persist(); render(true);
    const again = $("#extra-input"); if (again) again.focus();
  });

  window.addEventListener("hashchange", () => {
    const tab = location.hash.slice(1);
    if (views[tab] && tab !== ui.tab) { ui.tab = tab; render(); }
  });

  // Al volver a la app otro día, la fecha de la sesión pasa a hoy.
  let lastDay = todayKey();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && todayKey() !== lastDay) {
      if (ui.date === lastDay) ui.date = todayKey();
      lastDay = todayKey(); ui.day = weekday(now()); render(true);
    }
  });

  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/marta/sw.js", { scope: "/marta/" }).catch(() => {}));
  }
})();
