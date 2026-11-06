/* Clientes con sistema propio de compras de vehículos (p. ej. «Gestiones Vehículos Siniestrados»).
   - Al elegirlo en «Procesar facturas» se avisa de que tiene un sistema propio.
   - El lector con IA separa las compras de vehículos (facturas y contratos con particulares) del resto: el borrador
     tiene dos pestañas, «Gestión» (facturas normales) y «Compras de vehículos» (Fecha, Nº contrato, Matrícula,
     Modelo, Bastidor, Nombre, CIF, Precio y Régimen General/REBU).
   - Al confirmar, los PDF se guardan como «AAAA.MM.DD Proveedor» (las compras en RECIBIDAS/COMPRAS DE VEHÍCULOS)
     y las compras quedan anotadas en el servidor.
   Se carga después de app.js. */
(() => {
  const NOMBRES = [/VEHICULOS SINIESTRADOS/];
  const flagged = new Set();
  const norm = value => (typeof normalizeFiscalText === "function" ? normalizeFiscalText(String(value || "")) : String(value || "").toUpperCase());
  const isVehicleClient = client => Boolean(client) && (flagged.has(client) || NOMBRES.some(re => re.test(norm(client))));
  window.vehiculosCliente = isVehicleClient;
  const loadFlags = () => getAllClientMetadata().then(list => list.forEach(c => { if (c.sistemaPropio === "vehiculos") flagged.add(clientIdentity(c)); })).catch(() => {});
  if (window.__authDecidida) loadFlags(); else document.addEventListener("auth-decidida", loadFlags, { once: true });

  const currentClient = () => document.querySelector("#invoiceClient")?.value || invoiceAccounting?.client || "";
  const money = value => (Number(value) || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parseMoney = value => { const n = Number(String(value || "").replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : 0; };

  // ---- Aviso de sistema propio al elegir el cliente
  const warned = new Set();
  function banner() {
    const panel = document.querySelector("#invoiceProcessor"); if (!panel) return;
    let box = panel.querySelector(".veh-banner"); const client = currentClient(), on = isVehicleClient(client) && (typeof invoiceProcessorType !== "function" || invoiceProcessorType() !== "emitidas");
    if (!on) { box?.remove(); return; }
    if (!box) { box = document.createElement("div"); box.className = "veh-banner"; panel.querySelector(".invoice-processor-fields")?.before(box); }
    box.innerHTML = `<span class="veh-banner-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M6 17l1.5-5h9L18 17M7.5 12 9 7h6l1.5 5"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/></svg></span><div><strong>Este cliente tiene un sistema propio</strong><span>Las compras de vehículos (facturas y contratos con particulares) se separan en la pestaña «Compras de vehículos» y se guardan en RECIBIDAS / COMPRAS DE VEHÍCULOS. El resto va a «Gestión».</span></div>`;
    if (!warned.has(client)) { warned.add(client); appConfirm({ eyebrow: "SISTEMA PROPIO", title: "Este cliente tiene un sistema propio", subtitle: client, message: "Al procesar sus facturas recibidas, la app separa las compras de vehículos (con fecha, nº de contrato, matrícula, modelo, bastidor, vendedor, CIF, precio y régimen General o REBU) del resto de facturas de la gestión.", ok: "Entendido", alertOnly: true }); }
  }
  document.addEventListener("change", event => { if (event.target.matches?.("#invoiceClient, #invoiceType")) setTimeout(banner, 50); });

  // ---- Pestañas del borrador
  let tab = "gestion";
  const groupKey = (record, index) => record.group || `fila-${index}`;
  function vehicleGroups() {
    const seen = new Map();
    (invoiceDraftRecords || []).forEach((record, index) => { if (!record.vehicle) return; const key = groupKey(record, index); if (!seen.has(key)) seen.set(key, { key, index, record }); });
    return [...seen.values()];
  }
  function draftInput(index, field) { return document.querySelector(`#invoiceDraftRows [data-invoice-row="${index}"][data-invoice-field="${field}"]`); }
  function decorate() {
    const draft = document.querySelector("#invoiceDraft"); if (!draft) return;
    draft.querySelector(".veh-tabs")?.remove(); draft.querySelector(".veh-section")?.remove(); draft.classList.remove("veh-mode", "veh-show-vehicles");
    if (!isVehicleClient(currentClient()) || invoiceProcessorType?.() === "emitidas" || !(invoiceDraftRecords || []).length) return;
    draft.classList.add("veh-mode");
    document.querySelectorAll("#invoiceDraftRows tr").forEach(tr => { const input = tr.querySelector("[data-invoice-row]"), record = input ? invoiceDraftRecords[Number(input.dataset.invoiceRow)] : null; tr.classList.toggle("veh-row", Boolean(record?.vehicle)); });
    const groups = vehicleGroups(), gestion = new Set((invoiceDraftRecords || []).map((r, i) => r.vehicle ? null : groupKey(r, i)).filter(Boolean)).size;
    const nav = document.createElement("nav"); nav.className = "veh-tabs"; nav.setAttribute("role", "tablist");
    nav.innerHTML = `<button type="button" role="tab" data-veh-tab="gestion" aria-selected="${tab === "gestion"}">Gestión <b>${gestion}</b></button><button type="button" role="tab" data-veh-tab="vehiculos" aria-selected="${tab === "vehiculos"}">Compras de vehículos <b>${groups.length}</b></button>`;
    draft.querySelector(".invoice-draft-table-wrap")?.before(nav);
    const section = document.createElement("section"); section.className = "veh-section";
    const cell = (g, field, value, attrs = "") => `<td><input data-veh-field="${field}" data-veh-group="${escapeHtml(g.key)}" value="${escapeHtml(value ?? "")}" ${attrs}></td>`;
    section.innerHTML = groups.length ? `<div class="veh-head"><span>${groups.length} ${groups.length === 1 ? "compra" : "compras"} de vehículos · total ${money(groups.reduce((s, g) => s + (Number(g.record.vehicle.precio) || 0), 0))} €</span><button type="button" class="veh-excel">Descargar Excel</button></div>
      <div class="veh-table-wrap"><table class="veh-table"><thead><tr><th></th><th>Fecha</th><th>Nº contrato</th><th>Matrícula</th><th>Modelo</th><th>Bastidor</th><th>Nombre</th><th>CIF</th><th>Precio</th><th>Régimen</th><th></th></tr></thead><tbody>${groups.map(g => { const v = g.record.vehicle, date = draftInput(g.index, "date")?.value || g.record.date || ""; return `<tr>
        <td><button type="button" class="veh-eye" data-veh-preview="${g.index}" title="Ver el documento">${typeof INVOICE_EYE_ICON !== "undefined" ? INVOICE_EYE_ICON : "👁"}</button><small class="veh-doc veh-doc-${v.tipoDocumento}">${v.tipoDocumento === "contrato" ? "Contrato" : "Factura"}</small></td>
        <td><input data-veh-date="${g.index}" value="${escapeHtml(date)}" placeholder="DD/MM/AAAA" class="veh-w-date"></td>
        ${cell(g, "contrato", v.contrato)}${cell(g, "matricula", v.matricula, 'class="veh-w-mat"')}${cell(g, "modelo", v.modelo, 'class="veh-w-model"')}${cell(g, "bastidor", v.bastidor, `class="veh-w-vin${v.bastidor && v.bastidor.length !== 17 ? " veh-warn" : ""}" title="${v.bastidor && v.bastidor.length !== 17 ? "Un bastidor suele tener 17 caracteres" : ""}"`)}${cell(g, "nombre", v.nombre, 'class="veh-w-name"')}${cell(g, "cif", v.cif, 'class="veh-w-cif"')}
        <td><input data-veh-field="precio" data-veh-group="${escapeHtml(g.key)}" value="${escapeHtml(money(v.precio))}" class="veh-w-price"></td>
        <td><select data-veh-field="regimen" data-veh-group="${escapeHtml(g.key)}" class="veh-regimen veh-${v.regimen}"><option value="general"${v.regimen === "general" ? " selected" : ""}>Régimen general</option><option value="rebu"${v.regimen === "rebu" ? " selected" : ""}>REBU</option></select></td>
        <td><button type="button" class="veh-move" data-veh-move="${escapeHtml(g.key)}" title="No es una compra de vehículo: pasarla a Gestión">→ Gestión</button></td></tr>`; }).join("")}</tbody></table></div>`
      : '<p class="veh-empty">No se ha detectado ninguna compra de vehículo en estos documentos. Si falta alguna, revisa que el PDF trae los datos del vehículo (matrícula, bastidor…).</p>';
    draft.querySelector(".invoice-draft-table-wrap")?.after(section);
    const show = id => { tab = id; draft.classList.toggle("veh-show-vehicles", id === "vehiculos"); nav.querySelectorAll("[data-veh-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.vehTab === id))); };
    nav.addEventListener("click", event => { const b = event.target.closest("[data-veh-tab]"); if (b) show(b.dataset.vehTab); });
    show(groups.length || tab === "gestion" ? tab : "gestion");
    const forGroup = key => (invoiceDraftRecords || []).filter((r, i) => groupKey(r, i) === key);
    section.addEventListener("input", event => {
      const el = event.target;
      if (el.dataset.vehDate) { const target = draftInput(Number(el.dataset.vehDate), "date"); if (target) { target.value = el.value; target.dispatchEvent(new Event("input", { bubbles: true })); } return; }
      if (!el.dataset.vehField) return;
      const value = el.dataset.vehField === "precio" ? parseMoney(el.value) : ["matricula", "bastidor", "cif"].includes(el.dataset.vehField) ? el.value.toUpperCase().replace(/\s/g, "") : el.value;
      forGroup(el.dataset.vehGroup).forEach(r => { if (r.vehicle) r.vehicle[el.dataset.vehField] = value; });
      if (el.dataset.vehField === "regimen") el.className = `veh-regimen veh-${value}`;
    });
    section.addEventListener("change", event => { if (event.target.dataset.vehField === "regimen") event.target.dispatchEvent(new Event("input", { bubbles: true })); });
    section.addEventListener("click", event => {
      const eye = event.target.closest("[data-veh-preview]"); if (eye) { openInvoicePreview(Number(eye.dataset.vehPreview)); return; }
      const move = event.target.closest("[data-veh-move]"); if (move) { invoiceDraftRecords = readInvoiceDraft(); invoiceDraftRecords.forEach((r, i) => { if (groupKey(r, i) === move.dataset.vehMove) delete r.vehicle; }); renderInvoiceDraft(invoiceDraftRecords); return; }
      if (event.target.closest(".veh-excel")) downloadExcel();
    });
  }

  function vehicleRows(records = readInvoiceDraft()) {
    const seen = new Set(), rows = [];
    records.forEach((r, i) => { const key = groupKey(r, i); if (!r.vehicle || seen.has(key)) return; seen.add(key); rows.push({ fecha: r.date || "", contrato: r.vehicle.contrato || "", matricula: r.vehicle.matricula || "", modelo: r.vehicle.modelo || "", bastidor: r.vehicle.bastidor || "", nombre: r.vehicle.nombre || "", cif: r.vehicle.cif || "", precio: Number(r.vehicle.precio) || 0, regimen: r.vehicle.regimen, tipoDocumento: r.vehicle.tipoDocumento, archivo: r.file || "" }); });
    return rows;
  }
  async function downloadExcel() {
    const rows = vehicleRows(); if (!rows.length) return;
    if (!window.XLSX) await new Promise((ok, ko) => { const s = document.createElement("script"); s.src = "/vendor/xlsx.full.min.js?v=0.18.5"; s.onload = ok; s.onerror = () => ko(new Error("No se pudo cargar el generador de Excel.")); document.head.append(s); }).catch(error => alert(error.message));
    if (!window.XLSX) return;
    const data = [["Fecha", "Nº contrato", "Matrícula", "Modelo", "Bastidor", "Nombre", "CIF", "Precio", "Régimen", "Documento"], ...rows.map(r => [r.fecha, r.contrato, r.matricula, r.modelo, r.bastidor, r.nombre, r.cif, r.precio, r.regimen === "rebu" ? "REBU" : "Régimen general", r.tipoDocumento === "contrato" ? "Contrato" : "Factura"])];
    const sheet = XLSX.utils.aoa_to_sheet(data); sheet["!cols"] = [10, 14, 11, 28, 20, 30, 12, 12, 16, 10].map(wch => ({ wch }));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Compras de vehículos");
    XLSX.writeFile(book, `${safeFileName(currentClient())} - Compras de vehículos - ${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const previousRender = renderInvoiceDraft;
  renderInvoiceDraft = function () { const result = previousRender.apply(this, arguments); try { decorate(); } catch (error) { console.error("Compras de vehículos", error); } return result; };
  // Al confirmar, las compras de vehículos quedan anotadas en el servidor del despacho.
  const previousConfirm = confirmInvoiceDraft;
  confirmInvoiceDraft = async function (client) {
    const rows = isVehicleClient(client) ? vehicleRows() : [];
    const result = await previousConfirm.apply(this, arguments);
    if (result && rows.length) {
      try { const r = await apiJson("/api/vehiculos", { method: "POST", body: JSON.stringify({ client, items: rows }) }); return `${result} ${rows.length} ${rows.length === 1 ? "compra de vehículo anotada" : "compras de vehículos anotadas"}${r.updated ? ` (${r.updated} ya estaban y se han actualizado)` : ""}.`; }
      catch (error) { return `${result} No se pudieron anotar las compras de vehículos: ${error.message}.`; }
    }
    return result;
  };
  window.vehiculosBanner = banner;
})();
