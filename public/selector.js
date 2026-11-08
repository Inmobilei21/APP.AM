/* Desplegables en el móvil con el estilo de la app: en lugar de la lista del sistema (iPhone/Android), al tocar un
   <select> sube una hoja corporativa con sus opciones (con buscador si hay muchas). El <select> sigue siendo el de
   siempre: se cambia su valor y se lanzan «input» y «change», así que todo lo demás funciona igual.
   Solo en pantallas táctiles estrechas; en el ordenador se usa el desplegable normal. Para dejar uno nativo: data-nativo. */
(() => {
  const movil = () => matchMedia("(max-width:760px)").matches && matchMedia("(pointer:coarse)").matches;
  const valido = el => el instanceof HTMLSelectElement && !el.multiple && !el.disabled && !el.hasAttribute("data-nativo") && el.options.length > 0;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  function etiqueta(select) {
    const aria = select.getAttribute("aria-label"); if (aria) return aria;
    if (select.id) { const l = document.querySelector(`label[for="${CSS.escape(select.id)}"]`); if (l) return l.textContent.trim(); }
    const padre = select.closest("label"); if (padre) { const t = [...padre.childNodes].filter(n => n !== select && !(n instanceof HTMLSelectElement)).map(n => n.textContent).join(" ").replace(/\s+/g, " ").trim(); if (t) return t; }
    const antes = select.previousElementSibling; if (antes && /^(LABEL|SPAN|SMALL|B|STRONG)$/.test(antes.tagName) && antes.textContent.trim().length < 40) return antes.textContent.trim();
    return "Elige una opción";
  }

  function abrir(select) {
    document.querySelector(".sel-capa")?.remove();
    const opciones = [...select.options], muchas = opciones.length > 8, titulo = etiqueta(select).replace(/[:*]\s*$/, "");
    const capa = document.createElement("div"); capa.className = "sel-capa";
    const filas = () => {
      let html = "", grupo = null;
      opciones.forEach((o, i) => {
        const g = o.parentElement instanceof HTMLOptGroupElement ? o.parentElement.label : null;
        if (g !== grupo) { grupo = g; if (g) html += `<li class="sel-grupo" data-grupo>${esc(g)}</li>`; }
        const vacia = o.value === "" && i === 0;
        html += `<li><button type="button" class="sel-op${o.selected && !vacia ? " on" : ""}${vacia ? " sel-vacia" : ""}" data-i="${i}"${o.disabled ? " disabled" : ""}><span>${esc(o.textContent.trim() || "—")}</span><i aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></i></button></li>`;
      });
      return html;
    };
    capa.innerHTML = `<div class="sel-hoja${muchas ? " sel-alta" : ""}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <div class="sel-asa" aria-hidden="true"></div>
      <header><div><small>Selecciona</small><strong>${esc(titulo)}</strong></div><button type="button" class="sel-x" aria-label="Cerrar"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
      ${muchas ? `<label class="sel-buscar"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" placeholder="Buscar…" autocomplete="off" enterkeyhint="search"></label>` : ""}
      <ul class="sel-lista">${filas()}</ul><p class="sel-nada" hidden>No hay resultados</p></div>`;
    document.body.append(capa);
    requestAnimationFrame(() => capa.classList.add("on"));
    const lista = capa.querySelector(".sel-lista");
    lista.querySelector(".sel-op.on")?.scrollIntoView({ block: "center" });
    const cerrar = () => { capa.classList.remove("on"); capa.classList.add("fuera"); setTimeout(() => capa.remove(), 230); document.removeEventListener("keydown", teclas, true); };
    const teclas = e => { if (e.key === "Escape") { e.stopPropagation(); cerrar(); } };
    document.addEventListener("keydown", teclas, true);
    capa.addEventListener("click", e => {
      if (e.target === capa || e.target.closest(".sel-x")) return cerrar();
      const b = e.target.closest(".sel-op"); if (!b || b.disabled) return;
      const i = Number(b.dataset.i);
      if (select.selectedIndex !== i) { select.selectedIndex = i; select.dispatchEvent(new Event("input", { bubbles: true })); select.dispatchEvent(new Event("change", { bubbles: true })); }
      lista.querySelectorAll(".sel-op.on").forEach(x => x.classList.remove("on")); b.classList.add("on");
      setTimeout(cerrar, 120);
    });
    const buscar = capa.querySelector(".sel-buscar input");
    buscar?.addEventListener("input", () => {
      const q = norm(buscar.value).trim(); let visibles = 0;
      lista.querySelectorAll("li").forEach(li => { if (li.dataset.grupo !== undefined) { li.hidden = Boolean(q); return; } const ok = !q || norm(li.textContent).includes(q); li.hidden = !ok; if (ok) visibles++; });
      capa.querySelector(".sel-nada").hidden = visibles > 0;
    });
  }

  // Un toque (sin arrastrar) sobre el desplegable abre la hoja en lugar de la lista del sistema
  let inicio = null;
  document.addEventListener("touchstart", e => { const s = e.target.closest?.("select"); inicio = s && valido(s) && movil() ? { s, x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true, capture: true });
  document.addEventListener("touchend", e => {
    if (!inicio) return; const { s, x, y } = inicio; inicio = null;
    const t = e.changedTouches[0]; if (Math.abs(t.clientX - x) > 10 || Math.abs(t.clientY - y) > 10) return;
    e.preventDefault(); document.activeElement?.blur?.(); abrir(s);
  }, { passive: false, capture: true });
  // Por si el sistema intenta abrir el suyo con el ratón o el foco (Android)
  document.addEventListener("mousedown", e => { const s = e.target.closest?.("select"); if (s && valido(s) && movil()) e.preventDefault(); }, true);
  window.abrirSelectorApp = abrir;
})();
