/* Novedades: al entrar, una ventana cuenta las mejoras que la persona aún no ha visto (como en Marta Wellness).
   Las mejoras se escriben en /novedades.json con un número creciente «n». Lo visto se guarda por usuario
   en este navegador; la primera vez solo se cuenta lo de las dos últimas semanas. Se carga después de app.js. */
(() => {
  const key = () => `am-novedades:${signedInUser?.id || ""}`;
  const niceDate = iso => new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  async function show() {
    if (!signedInUser || document.querySelector("#novedades")) return;
    if (document.getElementById("splash") || document.querySelector(".login2, .login-gate")) { setTimeout(show, 800); return; }
    let data; try { data = await (await fetch("/novedades.json", { cache: "no-store" })).json(); } catch { return; }
    const all = (data?.novedades || []).filter(x => Number.isFinite(x.n) && Array.isArray(x.puntos));
    if (!all.length) return;
    const last = Math.max(...all.map(x => x.n));
    let seen = null; try { seen = localStorage.getItem(key()); } catch {}
    const markSeen = () => { try { localStorage.setItem(key(), String(last)); } catch {} };
    const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const pending = all.filter(x => seen == null ? x.fecha >= since : x.n > Number(seen));
    if (!pending.length) { markSeen(); return; }
    const byDate = {};
    pending.forEach(x => { (byDate[x.fecha] = byDate[x.fecha] || []).push(...x.puntos); });
    const dates = Object.keys(byDate).sort().reverse(), name = String(signedInUser.name || "").split(" ")[0];
    const shell = document.createElement("div"); shell.id = "novedades"; shell.className = "nv-shell";
    shell.innerHTML = `<div class="nv-card" role="dialog" aria-modal="true" aria-labelledby="nvTitle">
      <div class="nv-head"><span class="nv-mark" aria-hidden="true">✦</span><div><p class="eyebrow">NOVEDADES</p><h2 id="nvTitle">${escapeHtml(name)}, <em>hemos hecho mejoras</em></h2></div></div>
      <p class="nv-intro">Esto es lo nuevo desde la última vez que entraste:</p>
      <div class="nv-list">${dates.map(f => `<section>${dates.length > 1 ? `<h3>${escapeHtml(niceDate(f))}</h3>` : ""}<ul>${byDate[f].map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul></section>`).join("")}</div>
      <button type="button" class="nv-ok">Entendido</button></div>`;
    document.body.append(shell);
    const ok = shell.querySelector(".nv-ok"); ok.focus({ preventScroll: true });
    ok.addEventListener("click", () => { markSeen(); shell.classList.add("nv-out"); setTimeout(() => shell.remove(), 220); });
  }
  // Tras iniciar sesión (o con la sesión ya abierta), con un pequeño margen para que la app termine de pintarse.
  const later = () => setTimeout(show, 1200);
  if (window.__authDecidida) later(); else document.addEventListener("auth-decidida", later, { once: true });
  const login = () => { if (signedInUser) later(); else setTimeout(login, 1000); };
  document.addEventListener("auth-decidida", () => { if (!signedInUser) login(); }, { once: true });
})();
