/* Área de cliente: ajustes de la versión de clientes (se carga después de app.js).
   - Asesoría Fiscal y Contable: la pestaña «Documentación» pasa a «Contabilidad» y hay una pestaña nueva
     «Documentación» (escrituras, actas, contratos…) con subcarpetas, que el despacho puede crear y donde
     puede subir documentos. Filtro de ejercicio (2020…año actual, por defecto el actual) en Contabilidad (y sus
     subapartados), Declaraciones y Reclamaciones; no en Documentación ni en Información general.
   - Inicio (escritorio): la tarjeta «Nuevo mensaje» (iba al mismo sitio que «Mensajes») pasa a ser
     «Análisis financiero», de momento con aviso de «Próximamente».
   - Mensajes: lista de asesores con foto de color, nombre completo y especialidad.
   En la versión ProPymes (pp-theme.css) se mantienen la tarjeta «Avisos» y su chat propio. */
(() => {
  if (typeof openClientFiscalArea !== "function") return;
  const esPP = () => Boolean(document.querySelector('link[href*="pp-theme.css"]'));
  const esDemo = () => signedInUser?.role === "demo";
  const ANIO = new Date().getFullYear(), ULTIMO = Math.max(ANIO, 2026);
  const ANIOS = Array.from({ length: ULTIMO - 2019 }, (_, i) => String(ULTIMO - i));   // 2026 … 2020
  let anio = String(ANIO);
  const ic = name => (typeof clientDesktopIcon === "function" ? clientDesktopIcon(name) : "");
  const SVG = {
    carpeta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    nueva: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/></svg>',
    subir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>',
    grafico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
  };

  // ------------------------------------------------------------------ Contabilidad (antes «Documentación»)
  const CATEGORIAS = [["issued", "Facturas emitidas", "Facturas expedidas a tus clientes", ["EMITID", "EXPEDID"]],
    ["received", "Facturas recibidas", "Facturas de proveedores y acreedores", ["RECIBID", "PROVEEDOR"]],
    ["banks", "Bancos", "Extractos y documentación bancaria", ["BANCO"]]];
  const deCategoria = (doc, palabras) => { const t = (doc.path + " " + doc.name).toUpperCase(); return t.includes(anio) && palabras.some(p => t.includes(p)); };
  const titulo = (h, p, extra = "") => `<div class="client-fiscal-section-title"><div><h2>${h}</h2><p>${p}</p></div>${extra}</div>`;
  const filas = docs => (typeof clientFiscalFileRows === "function" ? clientFiscalFileRows(docs, "No hay documentos en esta carpeta") : "");

  const filtroAnio = () => `<label class="pc-anio"><span>Ejercicio</span><select aria-label="Ejercicio">${ANIOS.map(a => `<option${a === anio ? " selected" : ""}>${a}</option>`).join("")}</select></label>`;
  const cabecera = (...botones) => `<div class="pc-cabecera">${filtroAnio()}${botones.join("")}</div>`;
  function enlazarAnio(content, volver) {
    content.querySelector(".pc-anio select")?.addEventListener("change", e => { anio = e.target.value; content.dataset.declarationYear = anio; volver(); });
  }
  async function contabilidad(content, categoria = "", trimestre = "") {
    const docs = await clientFiscalDocuments();
    if (!categoria) {
      content.innerHTML = titulo("Contabilidad", `Tus facturas y movimientos bancarios del ejercicio ${anio}.`, cabecera()) +
        `<div class="client-fiscal-folders">${CATEGORIAS.map(([key, t, copy, palabras]) => {
          const n = docs.filter(d => deCategoria(d, palabras)).length;
          return `<button type="button" data-pc-cat="${key}"><span>${ic("documents")}</span><div><strong>${t}<em class="pc-cuenta">${n || ""}</em></strong><small>${copy}</small></div><b>›</b></button>`;
        }).join("")}</div>`;
      content.querySelectorAll("[data-pc-cat]").forEach(b => b.addEventListener("click", () => contabilidad(content, b.dataset.pcCat)));
      enlazarAnio(content, () => contabilidad(content));
      return;
    }
    const [, t, , palabras] = CATEGORIAS.find(c => c[0] === categoria);
    const delAnio = docs.filter(d => deCategoria(d, palabras));
    if (categoria !== "banks" && !trimestre) {
      content.innerHTML = titulo(`${t} · ${anio}`, "Selecciona el trimestre.", cabecera('<button type="button" class="pc-btn" data-pc-volver>← Contabilidad</button>')) +
        `<div class="client-fiscal-quarter-folders">${["1T", "2T", "3T", "4T"].map(q => {
          const n = delAnio.filter(d => (d.path + " " + d.name).toUpperCase().includes(q)).length;
          return `<button type="button" data-pc-trim="${q}"><span>${ic("documents")}</span><strong>${q}<em class="pc-cuenta">${n || ""}</em></strong><b>›</b></button>`;
        }).join("")}</div>`;
      content.querySelector("[data-pc-volver]").addEventListener("click", () => contabilidad(content));
      content.querySelectorAll("[data-pc-trim]").forEach(b => b.addEventListener("click", () => contabilidad(content, categoria, b.dataset.pcTrim)));
      enlazarAnio(content, () => contabilidad(content, categoria));
      return;
    }
    const lista = delAnio.filter(d => !trimestre || (d.path + " " + d.name).toUpperCase().includes(trimestre)).sort((a, b) => a.name.localeCompare(b.name, "es"));
    content.innerHTML = titulo(`${t} · ${anio}${trimestre ? " · " + trimestre : ""}`, "Documentos disponibles en esta carpeta.", cabecera('<button type="button" class="pc-btn" data-pc-volver>← Volver</button>')) +
      `<div class="client-fiscal-file-list">${filas(lista)}</div>`;
    content.querySelector("[data-pc-volver]").addEventListener("click", () => contabilidad(content, categoria === "banks" ? "" : categoria));
    bindClientFiscalFiles(content, lista);
    enlazarAnio(content, () => contabilidad(content, categoria, trimestre));
  }

  // ------------------------------------------------------------------ Documentación (escrituras, contratos…)
  const DE_CONTABILIDAD = new Set(["CONTABILIDAD", "DECLARACIONES", "LIBROS OFICIALES", "CIERRES ANUALES"]);
  const norma = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  async function carpetaCliente() {
    try { const root = await getSavedHandle("clients-folder"); return root ? await root.getDirectoryHandle(clientPreviewName) : null; } catch { return null; }
  }
  async function ocultas() {
    try { const ficha = (await getAllClientMetadata()).find(c => clientIdentity(c) === clientPreviewName || c?.name === clientPreviewName); return (ficha?.portalFolders || []).filter(f => f.visible === false).map(f => f.path); } catch { return []; }
  }
  const nombreBonito = n => n.charAt(0) + n.slice(1).toLocaleLowerCase("es");
  async function documentacion(content, ruta = []) {
    content.innerHTML = titulo("Documentación", "Escrituras, actas, contratos y el resto de documentación de tu empresa.") + '<div class="pc-cargando">Cargando…</div>';
    const cliente = await carpetaCliente();
    if (!cliente) { content.querySelector(".pc-cargando").outerHTML = `<div class="client-fiscal-empty">${ic("documents")}<strong>Todavía no hay documentación</strong><small>Cuando el despacho incorpore escrituras, contratos u otros documentos, aparecerán aquí.</small></div>`; return; }
    let dir = cliente;
    try { for (const parte of ruta) dir = await dir.getDirectoryHandle(parte); } catch { return documentacion(content, []); }
    const esconder = await ocultas(), relativa = nombre => [...ruta, nombre].join("/");
    const carpetas = [], archivos = [];
    for await (const e of dir.values()) {
      if (e.kind === "directory") {
        if (!ruta.length && DE_CONTABILIDAD.has(norma(e.name))) continue;
        if (esconder.some(h => relativa(e.name) === h || relativa(e.name).startsWith(h + "/"))) continue;
        carpetas.push(e);
      } else if (ruta.length) archivos.push({ name: e.name, path: ruta.join(" / "), handle: e });
    }
    carpetas.sort((a, b) => a.name.localeCompare(b.name, "es")); archivos.sort((a, b) => a.name.localeCompare(b.name, "es"));
    const migas = !ruta.length ? '<nav class="pc-migas" hidden></nav>' : `<nav class="pc-migas"><button type="button" data-pc-ir="0">Documentación</button>${ruta.map((p, i) => `<span>›</span><button type="button" data-pc-ir="${i + 1}">${escapeHtml(nombreBonito(p))}</button>`).join("")}</nav>`;
    const acciones = esDemo() ? "" : `<div class="pc-acciones"><button type="button" class="pc-btn" data-pc-nueva>${SVG.nueva}Nueva carpeta</button>${ruta.length ? `<button type="button" class="pc-btn pc-btn-oscuro" data-pc-subir>${SVG.subir}Subir documento</button><input type="file" multiple hidden data-pc-archivos>` : ""}</div>`;
    content.innerHTML = titulo(ruta.length ? escapeHtml(nombreBonito(ruta[ruta.length - 1])) : "Documentación", ruta.length ? "Carpetas y documentos de esta sección." : "Escrituras, actas, contratos y el resto de documentación de tu empresa.", acciones) + migas +
      `<p class="pc-msg" role="status" hidden></p>` +
      (carpetas.length ? `<div class="client-fiscal-folders pc-carpetas">${carpetas.map((c, i) => `<button type="button" data-pc-carpeta="${i}"><span>${SVG.carpeta}</span><div><strong>${escapeHtml(nombreBonito(c.name))}</strong><small>Carpeta</small></div><b>›</b></button>`).join("")}</div>` : "") +
      (ruta.length ? `<div class="client-fiscal-file-list">${archivos.length || !carpetas.length ? filas(archivos) : ""}</div>` : (!carpetas.length ? `<div class="client-fiscal-empty">${ic("documents")}<strong>Todavía no hay documentación</strong><small>Crea una carpeta para empezar (por ejemplo «Escrituras» o «Contratos»).</small></div>` : ""));
    content.querySelectorAll("[data-pc-ir]").forEach(b => b.addEventListener("click", () => documentacion(content, ruta.slice(0, Number(b.dataset.pcIr)))));
    content.querySelectorAll("[data-pc-carpeta]").forEach(b => b.addEventListener("click", () => documentacion(content, [...ruta, carpetas[Number(b.dataset.pcCarpeta)].name])));
    bindClientFiscalFiles(content, archivos);
    const msg = content.querySelector(".pc-msg"), aviso = (t, error = false) => { msg.textContent = t; msg.hidden = !t; msg.classList.toggle("error", error); };
    content.querySelector("[data-pc-nueva]")?.addEventListener("click", () => {
      if (content.querySelector(".pc-form")) return;
      const form = document.createElement("form"); form.className = "pc-form";
      form.innerHTML = `<input name="nombre" maxlength="60" placeholder="Nombre de la carpeta (p. ej. Contratos)" required><button type="submit" class="pc-btn pc-btn-oscuro">Crear</button><button type="button" class="pc-btn" data-pc-cancelar>Cancelar</button>`;
      content.querySelector(".pc-migas").after(form); form.elements.nombre.focus();
      form.querySelector("[data-pc-cancelar]").addEventListener("click", () => form.remove());
      form.addEventListener("submit", async e => {
        e.preventDefault();
        const nombre = form.elements.nombre.value.trim().replace(/\s+/g, " ");
        if (!nombre || /[\\/:*?"<>|]/.test(nombre) || nombre.startsWith(".")) return aviso("Escribe un nombre sin los caracteres \\ / : * ? \" < > |", true);
        const final = ruta.length ? nombre : nombre.toLocaleUpperCase("es");   // las carpetas principales del cliente van en mayúsculas
        if (!ruta.length && DE_CONTABILIDAD.has(norma(final))) return aviso("Ese nombre está reservado para la contabilidad.", true);
        form.querySelectorAll("button,input").forEach(x => { x.disabled = true; });
        try { await dir.getDirectoryHandle(final, { create: true }); await documentacion(content, ruta); content.querySelector(".pc-msg").textContent = ""; }
        catch (error) { form.querySelectorAll("button,input").forEach(x => { x.disabled = false; }); aviso(`No se pudo crear la carpeta: ${error.message}`, true); }
      });
    });
    const entrada = content.querySelector("[data-pc-archivos]");
    content.querySelector("[data-pc-subir]")?.addEventListener("click", () => entrada.click());
    entrada?.addEventListener("change", async () => {
      const files = [...entrada.files]; entrada.value = ""; if (!files.length) return;
      aviso(`Subiendo ${files.length} documento${files.length > 1 ? "s" : ""}…`);
      try {
        for (const file of files) { const h = await dir.getFileHandle(file.name, { create: true }), w = await h.createWritable(); await w.write(file); await w.close(); }
        await documentacion(content, ruta);
      } catch (error) { aviso(`No se pudo subir: ${error.message}`, true); }
    });
  }

  // ------------------------------------------------------------------ Reclamaciones (con filtro de ejercicio)
  function reclamaciones(content) {
    content.innerHTML = titulo("Reclamaciones", "Consulta o inicia una comunicación relacionada con una gestión fiscal.", cabecera()) +
      `<div class="client-fiscal-empty">${ic("messages")}<strong>No tienes reclamaciones abiertas en ${anio}</strong><small>Cuando exista una comunicación aparecerá en este apartado.</small></div>`;
    enlazarAnio(content, () => reclamaciones(content));
  }
  // Declaraciones: mismo filtro que Contabilidad en lugar del desplegable propio
  if (typeof renderClientFiscalDeclarations === "function") {
    const declaraciones = renderClientFiscalDeclarations;
    window.renderClientFiscalDeclarations = renderClientFiscalDeclarations = async function (content) {
      content.dataset.declarationYear = anio;
      const r = await declaraciones.apply(this, arguments);
      const propio = content.querySelector(".client-fiscal-year-filter");
      if (propio) { propio.outerHTML = cabecera(); enlazarAnio(content, () => renderClientFiscalDeclarations(content)); }
      return r;
    };
  }

  // ------------------------------------------------------------------ pestañas y filtro de ejercicio
  const original = openClientFiscalArea;
  window.openClientFiscalArea = openClientFiscalArea = function () {
    const result = original.apply(this, arguments);
    const overlay = document.querySelector(".client-fiscal-overlay"), nav = overlay?.querySelector(".client-fiscal-tabs"), content = overlay?.querySelector(".client-fiscal-content");
    if (!nav || !content || nav.dataset.pc) return result;
    nav.dataset.pc = "1";
    const conta = nav.querySelector('[data-fiscal-tab="documents"]');
    conta.textContent = "Contabilidad";
    const docsTab = document.createElement("button"); docsTab.type = "button"; docsTab.dataset.fiscalTab = "pc-documentacion"; docsTab.textContent = "Documentación";
    conta.after(docsTab);
    const activa = () => nav.querySelector("[data-fiscal-tab].active")?.dataset.fiscalTab;
    const marcar = tab => nav.querySelectorAll("[data-fiscal-tab]").forEach(b => b.classList.toggle("active", b.dataset.fiscalTab === tab));
    // Contabilidad y Documentación los pinta este archivo; el resto, app.js (que no conoce la pestaña nueva)
    nav.addEventListener("click", e => {
      const b = e.target.closest("[data-fiscal-tab]"); if (!b) return;
      if (b.dataset.fiscalTab === "documents") { e.stopImmediatePropagation(); marcar("documents"); contabilidad(content); }
      else if (b.dataset.fiscalTab === "pc-documentacion") { e.stopImmediatePropagation(); marcar("pc-documentacion"); documentacion(content); }
      else if (b.dataset.fiscalTab === "claims") { e.stopImmediatePropagation(); marcar("claims"); reclamaciones(content); }
      else { content.dataset.declarationYear = anio; marcar(b.dataset.fiscalTab); }
    }, true);
    content.dataset.declarationYear = anio; marcar("documents"); contabilidad(content);
    return result;
  };
  // El ejercicio elegido en «Declaraciones» (que tiene su propio filtro) se recuerda también en Contabilidad
  document.addEventListener("change", e => {
    const sel = e.target.closest?.(".client-fiscal-overlay .client-fiscal-year-filter select"); if (sel) anio = sel.value;
  });

  // ------------------------------------------------------------------ Inicio: «Análisis financiero»
  function analisis() {
    document.querySelector(".pc-analisis-overlay")?.remove();
    const capa = document.createElement("div"); capa.className = "client-unavailable-overlay pc-analisis-overlay";
    capa.innerHTML = `<section class="client-unavailable-card" role="dialog" aria-modal="true" aria-label="Análisis financiero"><header><small>Próximamente</small><strong>Análisis financiero</strong><button type="button" data-close-client-unavailable aria-label="Cerrar"></button></header>
      <div class="client-unavailable-body pc-analisis"><span class="pc-analisis-ic">${SVG.grafico}</span><h2>Muy pronto, aquí</h2>
      <p>Estamos preparando un panel con la evolución económica de tu empresa, elaborado por tu asesor a partir de tu contabilidad.</p>
      <ul><li>Ventas, gastos y resultado de cada trimestre</li><li>Comparativa con el ejercicio anterior</li><li>Liquidez, endeudamiento y principales ratios</li></ul>
      <button class="client-unavailable-primary" type="button" data-pc-cerrar>Entendido</button></div></section>`;
    document.body.appendChild(capa); requestAnimationFrame(() => capa.classList.add("on"));
    const cerrar = () => capa.remove();
    capa.querySelectorAll("[data-close-client-unavailable],[data-pc-cerrar]").forEach(b => b.addEventListener("click", cerrar));
    capa.addEventListener("click", e => { if (e.target === capa) cerrar(); });
  }
  function tarjetaAnalisis() {
    if (esPP()) return;
    document.querySelectorAll(".cd2-flota").forEach(flota => {
      const vieja = flota.querySelectorAll(".cd2-acc")[2];
      if (!vieja || vieja.dataset.pcAnalisis !== undefined || flota.querySelector("[data-pp-avisos]")) return;
      const nueva = document.createElement("button"); nueva.type = "button"; nueva.className = "cd2-acc pc-analisis-acc"; nueva.dataset.pcAnalisis = "";
      nueva.innerHTML = `<span class="cd2-ic">${SVG.grafico}</span><span><b>Análisis financiero</b><small>Evolución y ratios de tu empresa</small></span><em class="pc-pronto">Próximamente</em>`;
      nueva.addEventListener("click", analisis); vieja.replaceWith(nueva);
    });
  }

  // ------------------------------------------------------------------ Mensajes: lista de asesores
  const FICHAS = { alvaro: ["Álvaro Molinero", "Asesor fiscal", "#2F4BD6"], jesus: ["Jesús Carratalá", "Subvenciones y licitaciones", "#6D4AE0"],
    araceli: ["Araceli Frías", "IRPF", "#12805C"], francisco: ["Francisco Molinero", "IVA y Sociedades", "#B7791F"] };
  function asesores() {
    if (esPP()) return;
    const lista = document.querySelector(".client-chat-overlay .client-chat-advisors");
    if (!lista || lista.dataset.pc) return;
    lista.dataset.pc = "1"; lista.closest(".client-chat-overlay")?.classList.add("pc-chat");
    lista.querySelectorAll("[data-client-advisor]").forEach(b => {
      const f = FICHAS[b.dataset.clientAdvisor]; if (!f) return;
      const av = b.querySelector("span"), nombre = b.querySelector("strong"), sub = b.querySelector("small");
      if (av) { av.style.background = f[2]; av.style.color = "#fff"; }
      if (nombre) nombre.textContent = f[0];
      if (sub) sub.textContent = f[1];
    });
    const intro = document.querySelector(".client-chat-overlay .client-chat-intro");
    if (intro && !intro.querySelector(".pc-nota")) intro.insertAdjacentHTML("beforeend", '<em class="pc-nota">Tu asesor recibirá el mensaje al momento y te contestará por aquí.</em>');
  }

  let pendiente = false;
  const aplicar = () => { pendiente = false; tarjetaAnalisis(); asesores(); };
  new MutationObserver(() => { if (!pendiente) { pendiente = true; requestAnimationFrame(aplicar); } }).observe(document.body, { childList: true, subtree: true });
})();
