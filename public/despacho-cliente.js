/* Despacho del cliente: Asesoría Molinero o ProPymes Asesores.
   - En la ficha (crear/editar cliente) se elige el despacho, arriba a la derecha de la fila de datos.
   - La gestión del despacho es siempre la de Asesoría Molinero: todos los clientes, declaraciones, etc.
     siguen en esta aplicación.
   - Solo cambia lo que ve el cliente en su área: los de ProPymes ven la imagen de ProPymes Asesores.
   Se guarda en los metadatos del cliente como `office`. Se carga después de app.js. */
(() => {
  const MOLINERO = "Asesoría Molinero", PROPYMES = "ProPymes Asesores", OFFICES = [MOLINERO, PROPYMES];

  // ------------------------------------------------------------ ficha de cliente
  function install() {
    const start = document.querySelector("#newClientForm .client-start-field");
    if (!start || document.querySelector("#clientOffice")) return;
    const label = document.createElement("label"); label.className = "client-office-field";
    label.innerHTML = `<span>Despacho</span><select id="clientOffice">${OFFICES.map(o => `<option>${o}</option>`).join("")}</select>`;
    start.after(label);
  }
  new MutationObserver(install).observe(document.body, { childList: true, subtree: true });
  install();
  const field = () => document.querySelector("#clientOffice");

  const realOpenRecord = openClientRecord;
  window.openClientRecord = async function (name) {
    const result = await realOpenRecord.apply(this, arguments);
    install();
    const data = (await getAllClientMetadata().catch(() => [])).find(client => client.id === name) || {};
    if (field()) field().value = OFFICES.includes(data.office) ? data.office : MOLINERO;
    return result;
  };
  const realOpenModal = openClientModal;
  window.openClientModal = function () { const r = realOpenModal.apply(this, arguments); install(); if (field()) field().value = MOLINERO; return r; };

  let pending = null;
  document.addEventListener("submit", event => { if (event.target.id === "newClientForm" && field()) pending = field().value; }, true);
  document.addEventListener("click", event => { if (event.target.closest("#saveClientButton") && field()) pending = field().value; }, true);
  const realSave = saveClientMetadata;
  window.saveClientMetadata = function (data) {
    const form = document.querySelector("#newClientForm");
    const name = form?.dataset.editing || document.querySelector("#clientName")?.value.trim();
    if (pending && data && data.id === name) { data = { ...data, office: pending }; pending = null; }
    return realSave.call(this, data);
  };

  // ------------------------------------------------------------ área de cliente según el despacho
  const AREAS = ".cd2, .client-portal-shell, .client-fiscal-overlay, .client-chat-overlay, .client-documents-overlay, .client-unavailable-overlay";
  const body = () => document.body;
  const setClass = on => { if (on !== body().classList.contains("pp-propymes")) body().classList.toggle("pp-propymes", on); };
  let token = 0;
  async function applyBrand() {
    const mine = ++token;
    let office = MOLINERO;
    try { office = (await getAllClientMetadata()).find(c => clientIdentity(c) === clientPreviewName || c.name === clientPreviewName)?.office || MOLINERO; } catch {}
    if (mine !== token) return;
    setClass(office === PROPYMES && body().classList.contains("client-preview-mode"));
    texts();
  }
  // Solo textos de marca: los nombres de las personas (p. ej. "Álvaro Molinero") no se tocan.
  const SWAPS = [[/Asesoría Molinero/g, PROPYMES], [/ASESORÍA MOLINERO/g, "PROPYMES ASESORES"], [/Despacho Molinero/g, PROPYMES], [/DESPACHO MOLINERO/g, "PROPYMES ASESORES"]];
  function texts() {
    if (!body().classList.contains("pp-propymes")) return;
    document.querySelectorAll(AREAS).forEach(area => {
      const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT);
      for (let node; (node = walker.nextNode());) {
        if (!/olinero|OLINERO/.test(node.nodeValue)) continue;
        let value = node.nodeValue; SWAPS.forEach(([from, to]) => { value = value.replace(from, to); });
        if (value !== node.nodeValue) node.nodeValue = value;
      }
      area.querySelectorAll(".cd2-av, .client-desktop-message>span").forEach(av => { if (av.textContent.trim() === "AM") av.textContent = "PP"; });
      area.querySelectorAll('img[alt*="Molinero"]').forEach(img => { img.alt = PROPYMES; });
    });
  }
  const realRender = renderClientPreview;
  window.renderClientPreview = function () { const r = realRender.apply(this, arguments); applyBrand(); return r; };
  const realClose = closeClientPreview;
  window.closeClientPreview = function () { setClass(false); return realClose.apply(this, arguments); };
  let queued = false;
  new MutationObserver(() => {
    if (!body().classList.contains("client-preview-mode")) { setClass(false); return; }
    if (queued || !body().classList.contains("pp-propymes")) return;
    queued = true; requestAnimationFrame(() => { queued = false; texts(); });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
})();

// Modelo 347 en Borradores (archivo aparte).
(()=>{for(const src of ["/m347.js?v=1","/m123.js?v=1"]){const s=document.createElement("script");s.src=src;document.body.append(s)}})();
