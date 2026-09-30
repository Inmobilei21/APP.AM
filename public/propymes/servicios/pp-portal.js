// ProPymes · ajustes del área de cliente:
//  - Mensajes: solo se puede escribir a Álvaro; el resto de asesores aparecen en sombra y con candado.
//  - Contacto: teléfono y correo de ProPymes (la dirección es la misma).
//  - Inicio: la tarjeta "Nuevo mensaje" pasa a ser "Avisos"; si hay avisos sale un triángulo.
//    Los avisos se leen de la ficha del cliente (campo `avisos`: [{titulo, texto, fecha}]).
// Igual que pp-servicios.js: en APP_PP con data-siempre, en APP.AM solo para clientes de ProPymes.
(() => {
  const always = document.currentScript?.hasAttribute("data-siempre");
  const active = () => always ? !document.body.classList.contains("pp-molinero") : document.body.classList.contains("pp-propymes");
  const ADVISOR = "alvaro";
  const CONTACT = [["953 24 40 01", "677 53 39 27"], ["tel:953244001", "tel:677533927"], ["alvaro@molinero.es", "info@propymesasesores.es"]];
  const AREAS = ".cd2, .client-portal-shell, .client-fiscal-overlay, .client-chat-overlay, .client-documents-overlay, .client-account-panel, .account-shell";
  const TRI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>';
  const BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>';
  const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  // ------------------------------------------------------------ avisos
  let avisos = [], avisosDe = null, cargando = null;
  async function cargarAvisos() {
    const cliente = typeof clientPreviewName === "string" ? clientPreviewName : "";
    if (avisosDe === cliente) return avisos;
    if (cargando) return cargando;
    cargando = (async () => {
      let lista = [];
      try {
        if (signedInUser?.role === "demo") lista = window.PP_AVISOS_DEMO || [];
        else {
          const ficha = (await getAllClientMetadata()).find(c => clientIdentity(c) === cliente || c?.name === cliente);
          lista = Array.isArray(ficha?.avisos) ? ficha.avisos : [];
        }
      } catch {}
      avisos = lista.filter(a => a && (a.titulo || a.texto)); avisosDe = cliente; cargando = null;
      return avisos;
    })();
    return cargando;
  }
  const resumen = n => n ? `${n} aviso${n > 1 ? "s" : ""} pendiente${n > 1 ? "s" : ""}` : "No tienes avisos pendientes";
  const fechaCorta = v => { const d = new Date(v); return Number.isNaN(d.getTime()) ? (v || "") : new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(d); };

  function abrirAvisos() {
    document.querySelector(".client-unavailable-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "client-unavailable-overlay pp-srv pp-avisos-overlay";
    overlay.innerHTML = `<section class="client-unavailable-card" role="dialog" aria-modal="true" aria-label="Avisos"><header><img class="pp-srv-logo" src="/propymes/servicios/logo.png" alt="ProPymes Asesores"><small>Área de cliente</small><strong>Avisos</strong><button type="button" data-close-client-unavailable aria-label="Cerrar"></button></header>
      <div class="client-unavailable-body pp-srv-body">${avisos.length
        ? `<ul class="pp-avisos-lista">${avisos.map(a => `<li><span class="pp-aviso-ic">${TRI}</span><div><b>${escapeHtml(a.titulo || "Aviso")}</b>${a.texto ? `<p>${escapeHtml(a.texto)}</p>` : ""}${a.fecha ? `<time>${escapeHtml(fechaCorta(a.fecha))}</time>` : ""}</div></li>`).join("")}</ul>`
        : `<div class="pp-srv-done"><span class="pp-avisos-vacio">${BELL}</span><h2>Todo en orden</h2><p>No tienes avisos pendientes. Cuando tengamos algo importante para ti, te aparecerá aquí.</p></div>`}
        <button class="client-unavailable-primary" type="button" data-pp-avisos-cerrar>Entendido</button></div></section>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("on"));
    const close = () => overlay.remove();
    overlay.querySelectorAll("[data-close-client-unavailable],[data-pp-avisos-cerrar]").forEach(b => b.addEventListener("click", close));
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    setTimeout(() => overlay.querySelector("[data-pp-avisos-cerrar]")?.focus(), 60);
  }

  function pintarAvisos(boton, movil) {
    const n = avisos.length;
    boton.classList.toggle("pp-avisos-hay", n > 0);
    boton.querySelector(".pp-avisos-ic").innerHTML = n ? TRI : BELL;
    boton.querySelector("small").textContent = resumen(n);
    const marca = boton.querySelector(".pp-avisos-marca");
    marca.innerHTML = n ? `${TRI}<span>${n}</span>` : "";
    marca.hidden = !n;
    const flecha = boton.querySelector(movil ? ".pp-avisos-flecha" : ".cd2-fl");
    if (flecha) flecha.hidden = n > 0;
  }

  function tarjetasAvisos() {
    const nuevas = [];
    // Escritorio: la tercera tarjeta ("Nuevo mensaje") pasa a ser Avisos
    document.querySelectorAll(".cd2-flota").forEach(flota => {
      if (flota.querySelector("[data-pp-avisos]")) return;
      const vieja = flota.querySelectorAll(".cd2-acc")[2];
      if (!vieja) return;
      const flecha = vieja.querySelector(".cd2-fl")?.outerHTML || "";
      const boton = document.createElement("button");
      boton.type = "button"; boton.className = "cd2-acc pp-avisos-acc"; boton.dataset.ppAvisos = "";
      boton.innerHTML = `<span class="cd2-ic pp-avisos-ic"></span><span><b>Avisos</b><small></small></span><em class="pp-avisos-marca" hidden></em>${flecha}`;
      boton.addEventListener("click", abrirAvisos);
      vieja.replaceWith(boton); nuevas.push([boton, false]);
    });
    // Móvil: fila más en la tarjeta de Documentos / Mensajes
    document.querySelectorAll(".c2-flota").forEach(flota => {
      if (flota.querySelector("[data-pp-avisos]")) return;
      const modelo = flota.querySelector("button.c2-fila:last-of-type");
      if (!modelo) return;
      const flecha = modelo.lastElementChild?.matches(".c2-txt, .c2-ic") ? "" : modelo.lastElementChild.outerHTML;
      const boton = document.createElement("button");
      boton.type = "button"; boton.className = "c2-fila pp-avisos-acc"; boton.dataset.ppAvisos = "";
      boton.innerHTML = `<span class="c2-ic pp-avisos-ic"></span><span class="c2-txt"><b>Avisos</b><small></small></span><em class="pp-avisos-marca" hidden></em><span class="pp-avisos-flecha">${flecha}</span>`;
      boton.addEventListener("click", abrirAvisos);
      flota.append(document.createElement("hr"), boton); nuevas.push([boton, true]);
    });
    if (!nuevas.length) return;
    nuevas.forEach(([b, m]) => pintarAvisos(b, m));
    cargarAvisos().then(() => nuevas.forEach(([b, m]) => b.isConnected && pintarAvisos(b, m)));
  }

  // ------------------------------------------------------------ chat: solo Álvaro
  function bloquearAsesores() {
    document.querySelectorAll(`.client-chat-advisors button[data-client-advisor]:not([data-client-advisor="${ADVISOR}"]):not(.pp-bloqueado)`).forEach(boton => {
      const copia = boton.cloneNode(true);
      copia.classList.add("pp-bloqueado"); copia.disabled = true; copia.setAttribute("aria-disabled", "true");
      copia.title = "No disponible por ahora";
      const aviso = copia.querySelector("small"); if (aviso) aviso.textContent = "No disponible";
      const flecha = copia.querySelector("b"); if (flecha) flecha.outerHTML = `<i class="pp-candado">${LOCK}</i>`;
      boton.replaceWith(copia);
    });
  }

  // ------------------------------------------------------------ contacto
  function contacto() {
    document.querySelectorAll(AREAS).forEach(root => {
      if (!/953 24 40 01|953244001|alvaro@molinero\.es/.test(root.innerHTML)) return;
      root.querySelectorAll('a[href^="tel:953244001"], a[href^="mailto:alvaro@molinero.es"]').forEach(a => {
        a.href = a.href.startsWith("tel:") ? "tel:677533927" : "mailto:info@propymesasesores.es";
      });
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        let text = node.nodeValue;
        for (const [from, to] of CONTACT) text = text.split(from).join(to);
        if (text !== node.nodeValue) node.nodeValue = text;
      }
    });
  }

  // ------------------------------------------------------------
  let pendiente = false;
  function aplicar() {
    pendiente = false;
    if (!active()) return;
    if (avisosDe !== null && avisosDe !== clientPreviewName) { avisosDe = null; }
    tarjetasAvisos(); bloquearAsesores(); contacto();
  }
  const programar = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(aplicar); } };
  new MutationObserver(programar).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(programar).observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();
