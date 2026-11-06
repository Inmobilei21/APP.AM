/* Clientes con sistema propio de compras de vehículos (p. ej. «Gestiones Vehículos Siniestrados»).
   - Al elegirlo en «Procesar facturas» se avisa de que tiene un sistema propio.
   - El lector con IA separa las compras de vehículos (facturas y contratos con particulares) del resto: el borrador
     tiene dos pestañas, «Gestión» (facturas normales) y «Compras de vehículos» (Fecha, Nº contrato, Matrícula,
     Modelo, Bastidor, Nombre, CIF, Precio y Régimen General/REBU).
   - Al confirmar, los PDF se guardan como «AAAA.MM.DD Proveedor» (las compras en RECIBIDAS/COMPRAS DE VEHÍCULOS)
     y las compras quedan anotadas en el servidor.
   - En las facturas EMITIDAS, las ventas de vehículos van a la pestaña «Ventas de vehículos» y se unen a su compra
     (por bastidor o matrícula). En REBU el IVA sale del margen (venta − compra), venta a venta.
   - Todo se copia también en CONTABILIDAD/<año>/VEHÍCULOS/REBU o REG. GENERAL (COMPRAS y VENTAS), con el libro
     registro de bienes usados del ejercicio en el formato para Hacienda.
   Se carga después de app.js. */
(() => {
  const NOMBRES = [/VEHICULOS SINIESTRADOS/];
  const flagged = new Set();
  const norm = value => (typeof normalizeFiscalText === "function" ? normalizeFiscalText(String(value || "")) : String(value || "").toUpperCase());
  const isVehicleClient = client => Boolean(client) && (flagged.has(client) || NOMBRES.some(re => re.test(norm(client))));
  window.vehiculosCliente = isVehicleClient;
  // Referencia de un vehículo: la matrícula y, si no se ha leído, el bastidor. Los contratos sin número toman esa referencia.
  window.vehiculoReferencia = v => { if (!v) return ""; const ref = v.matricula || v.bastidor || ""; if (v.tipoDocumento === "contrato" && !v.contrato) v.contrato = ref; return ref; };

  // Lectura sin IA (texto del PDF o de la foto): contratos y facturas de compra de vehículos.
  const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  window.vehiculoDesdeTexto = function (text) {
    const t = String(text || "").replace(/\r/g, ""), flat = t.replace(/\s+/g, " ");
    const plain = flat.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const contrato = /CONTRATO\s+DE\s+COMPRA\s*-?\s*VENTA/i.test(plain) || /compraventa de vehiculo/i.test(plain);
    const field = re => (flat.match(re)?.[1] || "").trim();
    const vin = (plain.match(/(?:bastidor|chasis|vin)\s*(?:n\.?[ºo°]?|numero)?\s*[:.]?\s*([A-HJ-NPR-Z0-9]{17})\b/i) || plain.match(/\b([A-HJ-NPR-Z0-9]{3}Z{2,3}[A-HJ-NPR-Z0-9]{11,12})\b/))?.[1] || "";
    const matricula = (plain.match(/matr[ií]cula\s*[:.]?\s*(\d{4}\s?-?[B-DF-HJ-NP-TV-Z]{3})\b/i) || plain.match(/\b(\d{4}\s?[B-DF-HJ-NP-TV-Z]{3})\b/))?.[1]?.replace(/[\s-]/g, "").toUpperCase() || "";
    if (!contrato && !vin && !/(bastidor|chasis)/i.test(plain)) return null;
    const marca = field(/Marca\s*:\s*([^•\n]+?)(?=\s+(?:Modelo|A[ñn]o|N[uú]mero|Kilometraje|•)|$)/i), modelo = field(/Modelo\s*:\s*([^•\n]+?)(?=\s+(?:A[ñn]o|N[uú]mero|Kilometraje|Matr|•)|$)/i);
    // Vendedor: en los contratos, la segunda parte («… Y D. NOMBRE DNI/NIF: …»); si no, el primer DNI que no sea del comprador.
    let nombre = "", cif = "";
    const second = plain.match(/\bY\s+(?:D\.?|Dna\.?|Dª\.?|Don|Dona)?\s*([A-Z][A-Za-z.' -]{3,60}?)\s+DNI\s*\/?\s*(?:NIF|NIE)?\s*[:.]?\s*([0-9XYZ]\d{7}[A-Z])/i) || plain.match(/(?:D\.|Dª\.?|Dna\.?|Don|Dona)\s+([A-Z][A-Za-z.' -]{3,60}?)\s+DNI\s*\/\s*NIF\s*[:.]?\s*([0-9XYZ]\d{7}[A-Z])/i);
    if (second) { nombre = second[1].trim().toLocaleUpperCase("es"); cif = second[2].toUpperCase(); }
    else { const dnis = [...plain.matchAll(/\b([0-9XYZ]\d{7}[A-Z])\b/g)].map(m => m[1]); const admin = plain.match(/con\s+DNI\s*([0-9XYZ]\d{7}[A-Z])\s+como\s+administrador/i)?.[1]; cif = dnis.find(d => d !== admin) || ""; }
    const price = plain.match(/precio[^.]{0,120}?(?:es de|de|:)\s*([\d.]+(?:,\d{1,2})?)\s*(?:€|euros?)/i)?.[1] || plain.match(/([\d.]+(?:,\d{1,2})?)\s*(?:€|euros?)/i)?.[1] || "";
    const precio = price ? Number(price.replace(/\./g, "").replace(",", ".")) : 0;
    const d = plain.match(/\ba\s+(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/i) || plain.match(/\b(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/i);
    const mes = d ? MESES[d[2].toLowerCase()] : 0, fecha = d && mes ? `${String(d[1]).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${d[3]}` : "";
    const numero = field(/(?:contrato|factura)\s*(?:n\.?[ºo°]|numero|n[uú]m\.?)\s*[:.]?\s*([A-Z0-9][A-Z0-9\/.-]{2,})/i);
    const vehicle = { tipoDocumento: contrato ? "contrato" : "factura", contrato: numero, matricula, modelo: [marca, modelo].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(), tipoVehiculo: "", bastidor: vin.toUpperCase(), nombre, cif, precio, regimen: contrato || !/IVA\s*\(?\s*21/i.test(plain) ? "rebu" : "general" };
    // Los contratos sin número llevan como referencia la matrícula y, si no la hay, el bastidor.
    if (contrato && !vehicle.contrato) vehicle.contrato = matricula || vin.toUpperCase();
    const label = vehicle.contrato || numero;
    return { vehicle, record: { number: label, date: fecha, supplier: nombre ? nombre.toLocaleUpperCase("es") : "", supplierNif: cif, total: precio ? precio.toFixed(2) : "", base: contrato && precio ? precio.toFixed(2) : "", vatRate: contrato ? "0" : "", vat: contrato ? "0.00" : "", concept: [contrato ? "Compra de vehículo (contrato)" : "Compra de vehículo", marca, modelo, matricula].filter(Boolean).join(" · ") } };
  };
  const loadFlags = () => getAllClientMetadata().then(list => list.forEach(c => { if (c.sistemaPropio === "vehiculos") flagged.add(clientIdentity(c)); })).catch(() => {});
  if (window.__authDecidida) loadFlags(); else document.addEventListener("auth-decidida", loadFlags, { once: true });

  const currentClient = () => document.querySelector("#invoiceClient")?.value || invoiceAccounting?.client || "";
  const money = value => (Number(value) || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parseMoney = value => { const n = Number(String(value || "").replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : 0; };

  // ---- Aviso de sistema propio al elegir el cliente
  const warned = new Set();
  function banner() {
    const panel = document.querySelector("#invoiceProcessor"); if (!panel) return;
    let box = panel.querySelector(".veh-banner"); const client = currentClient(), on = isVehicleClient(client), sales = typeof invoiceProcessorType === "function" && invoiceProcessorType() === "emitidas";
    if (!on) { box?.remove(); return; }
    if (!box) { box = document.createElement("div"); box.className = "veh-banner"; panel.querySelector(".invoice-processor-fields")?.before(box); }
    box.innerHTML = `<span class="veh-banner-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2a1 1 0 0 0 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.4 10.6 16 6.7A2 2 0 0 0 14.3 6H9.7a2 2 0 0 0-1.7.9L5.6 10.6l-2.1.5C2.7 11.3 2 12.1 2 13v3a1 1 0 0 0 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/><path d="M5.6 10.6h12.8"/></svg></span><div><strong>Este cliente tiene un sistema propio</strong><span>${sales ? "Las ventas de vehículos se separan en la pestaña «Ventas de vehículos» y se unen a su compra (por bastidor o matrícula) para calcular el margen y el IVA del REBU." : "Las compras de vehículos (facturas y contratos con particulares) se separan en la pestaña «Compras de vehículos». El resto va a «Gestión»."} Todo se guarda también en CONTABILIDAD / año / VEHÍCULOS / REBU o REG. GENERAL.</span></div><button type="button" class="veh-ver">Ver vehículos</button>`;
    box.querySelector(".veh-ver").onclick = () => openView(client);
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
    if (!isVehicleClient(currentClient()) || !(invoiceDraftRecords || []).length) return;
    if (invoiceProcessorType?.() === "emitidas") return decorateSales(draft);
    draft.classList.add("veh-mode");
    document.querySelectorAll("#invoiceDraftRows tr").forEach(tr => { const input = tr.querySelector("[data-invoice-row]"), record = input ? invoiceDraftRecords[Number(input.dataset.invoiceRow)] : null; tr.classList.toggle("veh-row", Boolean(record?.vehicle)); });
    const groups = vehicleGroups(), gestion = new Set((invoiceDraftRecords || []).map((r, i) => r.vehicle ? null : groupKey(r, i)).filter(Boolean)).size;
    const nav = document.createElement("nav"); nav.className = "veh-tabs"; nav.setAttribute("role", "tablist");
    nav.innerHTML = `<button type="button" role="tab" data-veh-tab="gestion" aria-selected="${tab === "gestion"}">Gestión <b>${gestion}</b></button><button type="button" role="tab" data-veh-tab="vehiculos" aria-selected="${tab === "vehiculos"}">Compras de vehículos <b>${groups.length}</b></button>`;
    draft.querySelector(".invoice-draft-table-wrap")?.before(nav);
    const section = document.createElement("section"); section.className = "veh-section";
    const cell = (g, field, value, attrs = "") => `<td><input data-veh-field="${field}" data-veh-group="${escapeHtml(g.key)}" value="${escapeHtml(value ?? "")}" ${attrs}></td>`;
    section.innerHTML = groups.length ? `<div class="veh-head"><span>${groups.length} ${groups.length === 1 ? "compra" : "compras"} de vehículos · total ${money(groups.reduce((s, g) => s + (Number(g.record.vehicle.precio) || 0), 0))} €</span><button type="button" class="veh-excel">Descargar Excel</button></div>
      <div class="veh-table-wrap"><table class="veh-table"><colgroup><col style="width:118px"><col style="width:112px"><col style="width:160px"><col style="width:110px"><col style="width:230px"><col style="width:200px"><col style="width:230px"><col style="width:116px"><col style="width:112px"><col style="width:160px"><col style="width:108px"></colgroup><thead><tr><th></th><th>Fecha</th><th>Nº contrato</th><th>Matrícula</th><th>Modelo</th><th>Bastidor</th><th>Nombre</th><th>CIF</th><th>Precio</th><th>Régimen</th><th></th></tr></thead><tbody>${groups.map(g => { const v = g.record.vehicle, date = draftInput(g.index, "date")?.value || g.record.date || ""; return `<tr>
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
    records.forEach((r, i) => { const key = groupKey(r, i); if (!r.vehicle || seen.has(key)) return; seen.add(key); rows.push({ key, fecha: r.date || "", contrato: r.vehicle.contrato || "", matricula: r.vehicle.matricula || "", modelo: r.vehicle.modelo || "", bastidor: r.vehicle.bastidor || "", nombre: r.vehicle.nombre || "", cif: r.vehicle.cif || "", precio: Number(r.vehicle.precio) || 0, regimen: r.vehicle.regimen, tipoDocumento: r.vehicle.tipoDocumento, archivo: r.file || "" }); });
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
  // Al confirmar, las compras (o las ventas) de vehículos quedan anotadas en el servidor del despacho, con la ruta de
  // su documento, y se rehace el libro registro de bienes usados del año en CONTABILIDAD/<año>/VEHÍCULOS/REBU.
  const previousConfirm = confirmInvoiceDraft;
  confirmInvoiceDraft = async function (client) {
    const vehicleClient = isVehicleClient(client), sales = invoiceProcessorType?.() === "emitidas";
    const rows = vehicleClient && !sales ? vehicleRows() : [], saleRows = vehicleClient && sales ? salesRows() : [];
    const result = await previousConfirm.apply(this, arguments);
    if (!result || (!rows.length && !saleRows.length)) return result;
    const paths = key => ({ ruta: invoiceConfirmProgress.saved?.get(key) || "", carpeta: invoiceConfirmProgress.vehiculos?.get(key) || "" });
    const parts = [result]; const years = new Set();
    try {
      if (rows.length) {
        const r = await apiJson("/api/vehiculos", { method: "POST", body: JSON.stringify({ client, items: rows.map(({ key, ...row }) => ({ ...row, ...paths(key) })) }) });
        rows.forEach(row => years.add(yearOf(row.fecha)));
        parts.push(`${rows.length} ${rows.length === 1 ? "compra de vehículo anotada" : "compras de vehículos anotadas"}${r.updated ? ` (${r.updated} ya estaban y se han actualizado)` : ""}.`);
      }
      if (saleRows.length) {
        const r = await apiJson("/api/vehiculos/ventas", { method: "POST", body: JSON.stringify({ client, ventas: saleRows.map(({ key, ...row }) => ({ ...row, ...paths(key) })) }) });
        saleRows.forEach(row => years.add(yearOf(row.fecha)));
        parts.push(`${r.linked} ${r.linked === 1 ? "venta de vehículo unida a su compra" : "ventas de vehículos unidas a su compra"}.${r.missing?.length ? ` Sin compra encontrada: ${r.missing.join(", ")} (anótala en «Ver vehículos»).` : ""}`);
      }
    } catch (error) { parts.push(`No se pudieron anotar los vehículos: ${error.message}.`); }
    stock.client = ""; // se vuelve a cargar
    try { const saved = await saveBooks(client, [...years].filter(Boolean)); if (saved) parts.push(saved); } catch (error) { console.error("Libro registro", error); }
    return parts.join(" ");
  };
  // ---- Vehículos del cliente guardados en el servidor (compras con su venta, si la hay)
  const stock = { client: "", items: [], promise: null };
  function loadStock(client, force = false) {
    if (!force && stock.client === client && stock.promise) return stock.promise;
    stock.client = client; stock.items = []; stock.loaded = false;
    stock.promise = apiJson(`/api/vehiculos?client=${encodeURIComponent(client)}`).then(r => { if (stock.client === client) { stock.items = r.items || []; stock.loaded = true; } return stock.items; }).catch(() => { stock.loaded = true; return []; });
    return stock.promise;
  }
  const yearOf = fecha => String(fecha || "").match(/(\d{4})$/)?.[1] || String(fecha || "").match(/^(\d{4})-/)?.[1] || "";
  const sortKey = fecha => { const m = String(fecha || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}${m[2]}${m[1]}` : "99999999"; };
  const quarterOf = fecha => { const m = String(fecha || "").match(/^\d{2}\/(\d{2})\//); return m ? Math.ceil(Number(m[1]) / 3) : 0; };
  const round2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const FOLDER = regimen => regimen === "rebu" ? "REBU" : "REG. GENERAL";
  // REBU: el IVA va incluido en el margen (venta − compra) y se calcula operación por operación; si el margen es
  // negativo no hay IVA ni se compensa con otras ventas.
  const rebu = (venta, compra) => { const margen = round2((Number(venta) || 0) - (Number(compra) || 0)); const iva = margen > 0 ? round2(margen * 21 / 121) : 0; return { margen, iva, base: margen > 0 ? round2(margen - iva) : 0 }; };
  const label = v => [v.modelo, v.matricula || v.bastidor].filter(Boolean).join(" · ");

  // Carpeta del ejercicio donde va la copia del documento (la usa saveInvoiceDocuments de app.js).
  window.vehiculoCarpeta = (group, kind) => {
    if (!isVehicleClient(currentClient())) return "";
    if (kind === "RECIBIDAS" && group.record?.vehicle) return `VEHÍCULOS/${FOLDER(group.record.vehicle.regimen)}/COMPRAS`;
    if (kind === "EMITIDAS" && group.record?.vehicleSale) { const s = group.record.vehicleSale, link = stock.items.find(x => x.id === s.linkId); return `VEHÍCULOS/${FOLDER(link?.regimen || s.regimen)}/VENTAS`; }
    return "";
  };

  // ---- Ventas de vehículos (facturas emitidas): se unen a su compra y, en REBU, el IVA sale del margen
  function saleGroups() {
    const seen = new Map();
    (invoiceDraftRecords || []).forEach((record, index) => { if (!record.vehicleSale) return; const key = groupKey(record, index); if (!seen.has(key)) seen.set(key, { key, index, record }); });
    return [...seen.values()];
  }
  function findPurchase(sale, number) {
    const free = stock.items.filter(x => !x.venta || (number && x.venta.numero === number));
    return free.find(x => sale.bastidor && x.bastidor === sale.bastidor) || free.find(x => sale.matricula && x.matricula === sale.matricula) || null;
  }
  // Reparte las líneas de la factura de venta en REBU: margen neto al 21 % y el resto (precio de compra) sin IVA.
  function rebuLines(head, sale, link) {
    if (!sale.original) sale.original = { base: head.base, vatRate: head.vatRate, vat: head.vat, total: head.total, precio: Number(sale.precio) || invoiceParseNumber(head.total) || 0 };
    const venta = sale.original.precio, regime = link?.regimen || sale.regimen;
    if (!link || regime !== "rebu") return [{ ...head, ...sale.original, precio: undefined }];
    const { base, iva } = rebu(venta, link.precio), note = "REBU: IVA incluido en el margen";
    if (base <= 0) return [{ ...head, base: venta.toFixed(2), vatRate: "0", vat: "0.00", total: venta.toFixed(2), observation: [head.observation, `${note} (margen negativo o nulo: sin IVA)`].filter(Boolean).join(". ") }];
    const rest = round2(venta - base - iva);
    return [{ ...head, base: base.toFixed(2), vatRate: "21", vat: iva.toFixed(2), total: round2(base + iva).toFixed(2), observation: [head.observation, `${note}: margen ${money(base + iva)} €`].filter(Boolean).join(". ") },
      { ...head, receipt: null, base: rest.toFixed(2), vatRate: "0", vat: "0.00", total: rest.toFixed(2), observation: "REBU: parte de la venta sin IVA (precio de compra)" }];
  }
  function applySales() {
    let records = readInvoiceDraft(), changed = false;
    for (const sale of [...new Set(records.map(r => r.vehicleSale).filter(Boolean))]) {
      const link = stock.items.find(x => x.id === sale.linkId) || null;
      const want = link && link.regimen === "rebu" ? `${link.id}|${link.precio}|${sale.original?.precio ?? sale.precio}` : "";
      if ((sale.applied || "") === want) continue;
      const indices = records.map((r, i) => r.vehicleSale === sale ? i : -1).filter(i => i >= 0), first = indices[0], key = groupKey(records[first], first);
      const lines = rebuLines(records[first], sale, link).map(line => { const copy = { ...line, group: key, vehicleSale: sale }; delete copy.precio; return copy; });
      records = [...records.slice(0, first), ...lines, ...records.slice(first).filter(r => r.vehicleSale !== sale)];
      sale.applied = want; changed = true;
    }
    if (changed) { invoiceDraftRecords = records; renderInvoiceDraft(invoiceDraftRecords); }
    return changed;
  }
  function decorateSales(draft) {
    const client = currentClient(), groups = saleGroups();
    draft.classList.add("veh-mode");
    document.querySelectorAll("#invoiceDraftRows tr").forEach(tr => { const input = tr.querySelector("[data-invoice-row]"), record = input ? invoiceDraftRecords[Number(input.dataset.invoiceRow)] : null; tr.classList.toggle("veh-row", Boolean(record?.vehicleSale)); });
    if (stock.client !== client || !stock.loaded) { loadStock(client).then(() => { if (currentClient() === client) { try { decorate(); } catch (error) { console.error(error); } } }); }
    else {
      for (const g of groups) { const sale = invoiceDraftRecords[g.index].vehicleSale; if (sale.linkId === undefined) sale.linkId = findPurchase(sale, g.record.number)?.id || ""; }
      if (applySales()) return; // se vuelve a pintar el borrador y se decora otra vez
    }
    const gestion = new Set((invoiceDraftRecords || []).map((r, i) => r.vehicleSale ? null : groupKey(r, i)).filter(Boolean)).size;
    const nav = document.createElement("nav"); nav.className = "veh-tabs"; nav.setAttribute("role", "tablist");
    nav.innerHTML = `<button type="button" role="tab" data-veh-tab="gestion" aria-selected="${tab === "gestion"}">Gestión <b>${gestion}</b></button><button type="button" role="tab" data-veh-tab="vehiculos" aria-selected="${tab === "vehiculos"}">Ventas de vehículos <b>${groups.length}</b></button>`;
    draft.querySelector(".invoice-draft-table-wrap")?.before(nav);
    const section = document.createElement("section"); section.className = "veh-section";
    const loaded = stock.client === client && stock.loaded;
    let totals = { venta: 0, iva: 0 };
    const rowsHtml = groups.map(g => {
      const sale = invoiceDraftRecords[g.index].vehicleSale, link = stock.items.find(x => x.id === sale.linkId) || null, venta = sale.original?.precio ?? (Number(sale.precio) || invoiceParseNumber(g.record.total) || 0);
      const regime = link?.regimen || sale.regimen, r = link ? rebu(venta, link.precio) : null; totals.venta += venta; if (link && regime === "rebu") totals.iva += r.iva;
      const options = stock.items.filter(x => !x.venta || x.id === sale.linkId || x.venta.numero === g.record.number).sort((a, b) => sortKey(b.fecha).localeCompare(sortKey(a.fecha)))
        .map(x => `<option value="${escapeHtml(x.id)}"${x.id === sale.linkId ? " selected" : ""}>${escapeHtml(`${x.fecha || "sin fecha"} · ${label(x) || x.contrato} · ${money(x.precio)} €`)}</option>`).join("");
      const date = draftInput(g.index, "date")?.value || g.record.date || "";
      return `<tr class="${link ? "" : "veh-unlinked"}">
        <td><button type="button" class="veh-eye" data-veh-preview="${g.index}" title="Ver la factura de venta">${typeof INVOICE_EYE_ICON !== "undefined" ? INVOICE_EYE_ICON : "👁"}</button></td>
        <td>${escapeHtml(date)}</td><td>${escapeHtml(g.record.number || "")}</td><td class="veh-ell" title="${escapeHtml(g.record.supplier || "")}">${escapeHtml(g.record.supplier || "")}</td>
        <td class="veh-ell" title="${escapeHtml(label(sale))}">${escapeHtml(label(sale) || "—")}${sale.bastidor ? `<small class="veh-vin">${escapeHtml(sale.bastidor)}</small>` : ""}</td>
        <td class="veh-num"><b>${money(venta)}</b></td>
        <td><div class="veh-link"><select data-veh-link="${g.index}"${loaded ? "" : " disabled"}><option value="">${loaded ? (stock.items.length ? "— Elige la compra —" : "— No hay compras anotadas —") : "Cargando compras…"}</option>${options}</select>${link && (link.carpeta || link.ruta) ? `<button type="button" class="veh-eye" data-veh-doc="${escapeHtml(link.carpeta || link.ruta)}" title="Ver la ${link.tipoDocumento === "contrato" ? "compra (contrato)" : "factura de compra"}">${typeof INVOICE_EYE_ICON !== "undefined" ? INVOICE_EYE_ICON : "👁"}</button>` : ""}</div>${link ? `<small class="veh-sub"><span class="veh-chip veh-${regime}">${regime === "rebu" ? "REBU" : "Reg. general"}</span> ${escapeHtml(link.tipoDocumento === "contrato" ? "Contrato" : "Factura")} ${escapeHtml(link.contrato || "")} · ${escapeHtml(link.nombre || "")}</small>` : loaded ? '<small class="veh-sub veh-bad">No se ha encontrado la compra por bastidor ni matrícula</small>' : ""}</td>
        <td class="veh-num">${link ? money(link.precio) : "—"}</td>
        <td class="veh-num${r && r.margen < 0 ? " veh-neg" : ""}">${r ? money(r.margen) : "—"}</td>
        <td class="veh-num">${r && regime === "rebu" ? money(r.base) : "—"}</td>
        <td class="veh-num">${r && regime === "rebu" ? `<b>${money(r.iva)}</b>` : "—"}</td></tr>`;
    }).join("");
    section.innerHTML = groups.length ? `<div class="veh-head"><span>${groups.length} ${groups.length === 1 ? "venta" : "ventas"} de vehículos · ${money(totals.venta)} € · IVA REBU ${money(totals.iva)} €</span><button type="button" class="veh-excel veh-open-view">Ver vehículos</button></div>
      <p class="veh-hint">En REBU el IVA va <b>dentro del margen</b> (venta − compra): base = margen ÷ 1,21 e IVA = margen × 21/121, venta a venta. Si el margen es negativo no hay IVA. Al unir la venta con su compra, las líneas de la factura se reparten solas para la contabilidad (margen al 21 % y el resto sin IVA).</p>
      <div class="veh-table-wrap"><table class="veh-table veh-sales"><colgroup><col style="width:48px"><col style="width:92px"><col style="width:116px"><col style="width:150px"><col style="width:170px"><col style="width:92px"><col style="width:300px"><col style="width:88px"><col style="width:86px"><col style="width:86px"><col style="width:86px"></colgroup><thead><tr><th></th><th>Fecha</th><th>Nº factura</th><th>Comprador</th><th>Vehículo</th><th class="veh-num">Venta</th><th>Compra del vehículo</th><th class="veh-num">Compra</th><th class="veh-num">Margen</th><th class="veh-num">Base</th><th class="veh-num">IVA</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`
      : '<p class="veh-empty">No se ha detectado ninguna venta de vehículo en estas facturas. Las ventas se reconocen por la matrícula o el bastidor del vehículo.</p>';
    draft.querySelector(".invoice-draft-table-wrap")?.after(section);
    const show = id => { tab = id; draft.classList.toggle("veh-show-vehicles", id === "vehiculos"); nav.querySelectorAll("[data-veh-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.vehTab === id))); };
    nav.addEventListener("click", event => { const b = event.target.closest("[data-veh-tab]"); if (b) show(b.dataset.vehTab); });
    show(groups.length || tab === "gestion" ? tab : "gestion");
    section.addEventListener("change", event => { const sel = event.target.closest("[data-veh-link]"); if (!sel) return; invoiceDraftRecords[Number(sel.dataset.vehLink)].vehicleSale.linkId = sel.value; if (!applySales()) decorate(); });
    section.addEventListener("click", event => {
      const eye = event.target.closest("[data-veh-preview]"); if (eye) { openInvoicePreview(Number(eye.dataset.vehPreview)); return; }
      const doc = event.target.closest("[data-veh-doc]"); if (doc) { openStoredDoc(client, doc.dataset.vehDoc); return; }
      if (event.target.closest(".veh-open-view")) openView(client);
    });
  }
  function salesRows(records = readInvoiceDraft()) {
    const seen = new Set(), rows = [];
    records.forEach((r, i) => { const key = groupKey(r, i); if (!r.vehicleSale || seen.has(key)) return; seen.add(key); const s = r.vehicleSale; rows.push({ key, id: s.linkId || "", bastidor: s.bastidor || "", matricula: s.matricula || "", fecha: r.date || "", numero: r.number || "", importe: s.original?.precio ?? (Number(s.precio) || invoiceParseNumber(r.total) || 0), comprador: r.supplier || "", nif: r.supplierNif || "", archivo: r.file || "" }); });
    return rows;
  }

  // ---- Documento guardado en la carpeta del cliente (compra o venta), en una ventana dentro de la app
  async function openStoredDoc(client, relative) {
    let url = "";
    try {
      const root = await getSavedHandle("clients-folder"); if (!root) throw new Error("No hay acceso a la carpeta CLIENTES.");
      let folder = await root.getDirectoryHandle(client); const parts = String(relative).split("/").filter(Boolean), name = parts.pop();
      for (const part of parts) folder = await folder.getDirectoryHandle(part);
      const file = await (await folder.getFileHandle(name)).getFile(); url = URL.createObjectURL(file);
      const shell = document.createElement("div"); shell.className = "veh-doc-view"; shell.setAttribute("role", "dialog"); shell.setAttribute("aria-modal", "true");
      const image = /\.(jpe?g|png|webp)$/i.test(name);
      shell.innerHTML = `<div class="veh-doc-box"><header><div><p class="eyebrow">DOCUMENTO DE COMPRA</p><h4>${escapeHtml(name)}</h4><small>${escapeHtml(relative)}</small></div><a class="veh-excel" href="${url}" download="${escapeHtml(name)}">Descargar</a><button type="button" class="invoice-preview-close" aria-label="Cerrar">×</button></header>${image ? `<div class="veh-doc-img"><img src="${url}" alt=""></div>` : `<iframe src="${url}" title="${escapeHtml(name)}"></iframe>`}</div>`;
      const close = () => { shell.remove(); URL.revokeObjectURL(url); document.removeEventListener("keydown", keys, true); };
      const keys = event => { if (event.key === "Escape") { event.stopPropagation(); close(); } };
      shell.addEventListener("click", event => { if (event.target === shell || event.target.closest(".invoice-preview-close")) close(); });
      document.addEventListener("keydown", keys, true); document.body.append(shell);
    } catch (error) { if (url) URL.revokeObjectURL(url); alert(`No se pudo abrir el documento «${relative}»: ${error.message || "no se encuentra"}.`); }
  }

  // ---- Libro registro de bienes usados (formato para Hacienda) y registro de régimen general, por ejercicio
  async function loadXlsx() {
    if (!window.XLSX) await new Promise((ok, ko) => { const s = document.createElement("script"); s.src = "/vendor/xlsx.full.min.js?v=0.18.5"; s.onload = ok; s.onerror = () => ko(new Error("No se pudo cargar el generador de Excel.")); document.head.append(s); });
    return window.XLSX;
  }
  const inYear = (item, year) => yearOf(item.fecha) === year || (item.venta && yearOf(item.venta.fecha) === year);
  function bookRows(items, year, regimen) {
    return items.filter(x => (x.regimen === "rebu") === (regimen === "rebu") && inYear(x, year)).sort((a, b) => sortKey(a.fecha).localeCompare(sortKey(b.fecha)) || String(a.contrato).localeCompare(String(b.contrato)));
  }
  function rebuBook(XLSX, client, year, items) {
    const rows = bookRows(items, year, "rebu"), num = n => ({ t: "n", v: round2(n), z: "#,##0.00" });
    const data = [[String(client).toLocaleUpperCase("es")], ["LIBRO REGISTRO DE BIENES USADOS"], [`Período: del 01/01/${year} al 31/12/${year}`], [],
      ["Orden", "Descripción del bien", "ADQUISICIÓN", "", "", "VENTAS", "", "", "", ""], ["", "", "Fecha", "Nº Factura", "Importe", "Fecha", "Nº Factura", "Importe", "% IVA", "Cuota IVA"]];
    let compras = 0, ventas = 0, cuotas = 0;
    rows.forEach((x, i) => {
      const v = x.venta, r = v ? rebu(v.importe, x.precio) : null; compras += Number(x.precio) || 0; if (v) { ventas += Number(v.importe) || 0; cuotas += r.iva; }
      data.push([i + 1, [x.modelo, x.matricula].filter(Boolean).join(" ") || x.bastidor || "", x.fecha || "", x.contrato || "", num(x.precio), v?.fecha || "", v?.numero || "", v ? num(v.importe) : "", v ? { t: "n", v: 0.21, z: "0%" } : "", v && r.iva > 0 ? num(r.iva) : ""]);
    });
    data.push([], ["", "TOTALES", "", "", num(compras), "", "", num(ventas), "", num(cuotas)]);
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }, { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } }, { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } }, { s: { r: 4, c: 2 }, e: { r: 4, c: 4 } }, { s: { r: 4, c: 5 }, e: { r: 4, c: 9 } }];
    sheet["!cols"] = [7, 38, 11, 16, 12, 11, 16, 12, 8, 12].map(wch => ({ wch }));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, `Bienes usados ${year}`);
    // Hoja de apoyo con el cálculo de cada operación (margen, base e IVA) y el resumen por trimestres.
    const calc = [["Orden", "Vehículo", "Bastidor", "Vendedor", "NIF vendedor", "Fecha compra", "Compra", "Fecha venta", "Nº factura venta", "Comprador", "Venta", "Margen", "Base imponible", "Cuota IVA"]];
    rows.forEach((x, i) => { const v = x.venta, r = v ? rebu(v.importe, x.precio) : null; calc.push([i + 1, label(x), x.bastidor || "", x.nombre || "", x.cif || "", x.fecha || "", num(x.precio), v?.fecha || "", v?.numero || "", v?.comprador || "", v ? num(v.importe) : "", r ? num(r.margen) : "", r ? num(r.base) : "", r ? num(r.iva) : ""]); });
    calc.push([], ["Trimestre", "Ventas", "Importe ventas", "Margen positivo", "Base imponible", "Cuota IVA"]);
    for (const q of [1, 2, 3, 4]) { const sold = rows.filter(x => x.venta && yearOf(x.venta.fecha) === year && quarterOf(x.venta.fecha) === q), rs = sold.map(x => rebu(x.venta.importe, x.precio)); calc.push([`${q}T`, sold.length, num(sold.reduce((s, x) => s + (Number(x.venta.importe) || 0), 0)), num(rs.reduce((s, r) => s + Math.max(0, r.margen), 0)), num(rs.reduce((s, r) => s + r.base, 0)), num(rs.reduce((s, r) => s + r.iva, 0))]); }
    const sheet2 = XLSX.utils.aoa_to_sheet(calc); sheet2["!cols"] = [7, 30, 20, 28, 12, 11, 12, 11, 16, 28, 12, 12, 13, 12].map(wch => ({ wch }));
    XLSX.utils.book_append_sheet(book, sheet2, "Cálculo REBU");
    return { book, count: rows.length };
  }
  function generalBook(XLSX, client, year, items) {
    const rows = bookRows(items, year, "general"), num = n => ({ t: "n", v: round2(n), z: "#,##0.00" });
    const data = [[String(client).toLocaleUpperCase("es")], ["REGISTRO DE VEHÍCULOS · RÉGIMEN GENERAL"], [`Período: del 01/01/${year} al 31/12/${year}`], [],
      ["Orden", "Vehículo", "Bastidor", "COMPRA", "", "", "", "VENTA", "", "", ""], ["", "", "", "Fecha", "Nº Factura", "Proveedor", "Importe", "Fecha", "Nº Factura", "Comprador", "Importe"]];
    rows.forEach((x, i) => { const v = x.venta; data.push([i + 1, label(x), x.bastidor || "", x.fecha || "", x.contrato || "", x.nombre || "", num(x.precio), v?.fecha || "", v?.numero || "", v?.comprador || "", v ? num(v.importe) : ""]); });
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } }, { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } }, { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } }, { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } }, { s: { r: 4, c: 3 }, e: { r: 4, c: 6 } }, { s: { r: 4, c: 7 }, e: { r: 4, c: 10 } }];
    sheet["!cols"] = [7, 34, 20, 11, 16, 28, 12, 11, 16, 28, 12].map(wch => ({ wch }));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, `Régimen general ${year}`);
    return { book, count: rows.length };
  }
  const bookName = (regimen, year) => regimen === "rebu" ? `LIBRO REGISTRO DE BIENES USADOS ${year}.xlsx` : `REGISTRO DE VEHÍCULOS RÉGIMEN GENERAL ${year}.xlsx`;
  async function saveBooks(client, years) {
    if (!years.length) return "";
    const XLSX = await loadXlsx(), items = await loadStock(client, true), saved = [];
    const root = await getSavedHandle("clients-folder"); if (!root) return "";
    const accounting = await (await root.getDirectoryHandle(client)).getDirectoryHandle("CONTABILIDAD", { create: true });
    for (const year of years) for (const regimen of ["rebu", "general"]) {
      const { book, count } = (regimen === "rebu" ? rebuBook : generalBook)(XLSX, client, year, items); if (!count) continue;
      const folder = await (await (await accounting.getDirectoryHandle(year, { create: true })).getDirectoryHandle("VEHÍCULOS", { create: true })).getDirectoryHandle(FOLDER(regimen), { create: true });
      const handle = await folder.getFileHandle(bookName(regimen, year), { create: true }), w = await handle.createWritable();
      await w.write(new Blob([XLSX.write(book, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); await w.close();
      saved.push(`${year}/VEHÍCULOS/${FOLDER(regimen)}`);
    }
    return saved.length ? `Libro registro actualizado en CONTABILIDAD/${saved.join(" y ")}.` : "";
  }

  // ---- Vista «Vehículos»: en stock, vendidos, resumen REBU por trimestres y libros del ejercicio
  async function openView(client) {
    if (!client) return;
    document.querySelector("#vehView")?.remove();
    const shell = document.createElement("div"); shell.id = "vehView"; shell.className = "veh-view"; shell.setAttribute("role", "dialog"); shell.setAttribute("aria-modal", "true");
    shell.innerHTML = '<div class="veh-view-box"><p class="veh-empty">Cargando vehículos…</p></div>';
    document.body.append(shell);
    const items = await loadStock(client, true), years = [...new Set([String(new Date().getFullYear()), ...items.flatMap(x => [yearOf(x.fecha), yearOf(x.venta?.fecha)])].filter(Boolean))].sort().reverse();
    let year = years[0], view = "stock";
    const close = () => { shell.remove(); document.removeEventListener("keydown", keys, true); };
    const keys = event => { if (event.key === "Escape" && !document.querySelector(".veh-doc-view")) { event.stopPropagation(); close(); } };
    document.addEventListener("keydown", keys, true);
    const eye = (path, title) => path ? `<button type="button" class="veh-eye" data-veh-doc="${escapeHtml(path)}" title="${escapeHtml(title)}">${typeof INVOICE_EYE_ICON !== "undefined" ? INVOICE_EYE_ICON : "👁"}</button>` : "";
    const draw = () => {
      const list = items.filter(x => view === "stock" ? !x.venta : view === "vendidos" ? x.venta && inYear(x, year) : inYear(x, year)).sort((a, b) => sortKey(b.fecha).localeCompare(sortKey(a.fecha)));
      const soldRebu = items.filter(x => x.regimen === "rebu" && x.venta && yearOf(x.venta.fecha) === year);
      const quarters = [1, 2, 3, 4].map(q => { const rs = soldRebu.filter(x => quarterOf(x.venta.fecha) === q).map(x => rebu(x.venta.importe, x.precio)); return { q, n: rs.length, base: rs.reduce((s, r) => s + r.base, 0), iva: rs.reduce((s, r) => s + r.iva, 0) }; });
      const counts = { stock: items.filter(x => !x.venta).length, vendidos: items.filter(x => x.venta && inYear(x, year)).length, todos: items.filter(x => inYear(x, year)).length };
      shell.querySelector(".veh-view-box").innerHTML = `<header class="veh-view-head"><div><p class="eyebrow">SISTEMA PROPIO · VEHÍCULOS</p><h3>${escapeHtml(client)}</h3></div><label>Ejercicio <select data-veh-year>${years.map(y => `<option${y === year ? " selected" : ""}>${y}</option>`).join("")}</select></label><button type="button" class="invoice-preview-close" aria-label="Cerrar">×</button></header>
        <div class="veh-quarters">${quarters.map(q => `<div><span>${q.q}T · REBU</span><strong>${money(q.iva)} €</strong><small>${q.n} ${q.n === 1 ? "venta" : "ventas"} · base ${money(q.base)} €</small></div>`).join("")}</div>
        <div class="veh-view-bar"><nav class="veh-tabs">${[["stock", "En stock"], ["vendidos", "Vendidos"], ["todos", `Todo ${year}`]].map(([id, text]) => `<button type="button" data-veh-view="${id}" aria-selected="${view === id}">${text} <b>${counts[id]}</b></button>`).join("")}</nav>
          <div class="veh-view-actions"><button type="button" class="veh-excel" data-veh-book="rebu">Libro registro REBU</button><button type="button" class="veh-excel veh-alt" data-veh-book="general">Registro régimen general</button><button type="button" class="veh-excel veh-save" data-veh-save>Guardar en VEHÍCULOS ${year}</button></div></div>
        <p class="veh-msg" role="status"></p>
        ${list.length ? `<div class="veh-table-wrap"><table class="veh-table veh-list"><colgroup><col style="width:80px"><col style="width:92px"><col style="width:196px"><col style="width:150px"><col style="width:88px"><col style="width:108px"><col style="width:90px"><col style="width:108px"><col style="width:88px"><col style="width:84px"><col style="width:80px"></colgroup><thead><tr><th>Docs</th><th>Compra</th><th>Vehículo</th><th>Vendedor</th><th class="veh-num">Precio</th><th>Régimen</th><th>Venta</th><th>Nº factura</th><th class="veh-num">Importe</th><th class="veh-num">Margen</th><th class="veh-num">IVA</th></tr></thead><tbody>${list.map(x => { const v = x.venta, r = v ? rebu(v.importe, x.precio) : null; return `<tr>
          <td>${eye(x.carpeta || x.ruta, "Ver la compra")}${v ? eye(v.carpeta || v.ruta, "Ver la factura de venta") : ""}</td><td>${escapeHtml(x.fecha || "")}</td><td class="veh-ell" title="${escapeHtml(label(x))}">${escapeHtml(label(x) || x.contrato || "")}${x.bastidor ? `<small class="veh-vin">${escapeHtml(x.bastidor)}</small>` : ""}</td><td class="veh-ell" title="${escapeHtml(x.nombre || "")}">${escapeHtml(x.nombre || "")}</td>
          <td class="veh-num">${money(x.precio)}</td><td><span class="veh-chip veh-${x.regimen}">${x.regimen === "rebu" ? "REBU" : "Reg. general"}</span></td><td>${escapeHtml(v?.fecha || "—")}</td><td>${escapeHtml(v?.numero || "")}</td><td class="veh-num">${v ? money(v.importe) : "—"}</td>
          <td class="veh-num${r && r.margen < 0 ? " veh-neg" : ""}">${r ? money(r.margen) : "—"}</td><td class="veh-num">${r && x.regimen === "rebu" ? money(r.iva) : "—"}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="veh-empty">${view === "stock" ? "No hay vehículos en stock." : "No hay vehículos en este ejercicio."}</p>`}`;
    };
    draw();
    shell.addEventListener("change", event => { if (event.target.matches("[data-veh-year]")) { year = event.target.value; draw(); } });
    shell.addEventListener("click", async event => {
      if (event.target === shell || event.target.closest(".invoice-preview-close")) return close();
      const tabButton = event.target.closest("[data-veh-view]"); if (tabButton) { view = tabButton.dataset.vehView; return draw(); }
      const doc = event.target.closest("[data-veh-doc]"); if (doc) return openStoredDoc(client, doc.dataset.vehDoc);
      const msg = shell.querySelector(".veh-msg");
      const bookButton = event.target.closest("[data-veh-book]");
      if (bookButton) { try { const XLSX = await loadXlsx(), regimen = bookButton.dataset.vehBook, { book, count } = (regimen === "rebu" ? rebuBook : generalBook)(XLSX, client, year, items); if (!count) { msg.textContent = `No hay vehículos de ${regimen === "rebu" ? "REBU" : "régimen general"} en ${year}.`; return; } XLSX.writeFile(book, `${safeFileName(client)} - ${bookName(regimen, year)}`); } catch (error) { msg.textContent = error.message; } return; }
      const save = event.target.closest("[data-veh-save]");
      if (save) { save.disabled = true; msg.textContent = "Guardando…"; try { msg.textContent = await saveBooks(client, [year]) || `No hay vehículos en ${year}.`; } catch (error) { msg.textContent = `No se pudo guardar: ${error.message}`; } save.disabled = false; }
    });
  }
  window.vehiculosVista = openView;
  window.vehiculosBanner = banner;
})();
