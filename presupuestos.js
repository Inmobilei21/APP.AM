// Presupuestos del despacho: se crean en Gestión, se envían al cliente con un enlace para aceptarlos y pagar el
// anticipo, y al aceptarse se guardan el acuerdo y los justificantes de pago en la carpeta del cliente (o, si aún no
// es cliente, en PRESUPUESTOS/<nombre> como cliente provisional). Cada cobro avisa en Facturación.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

module.exports = function ({ dataDirectory, davRequest, json, readJson, readBuffer, requireUser, cleanText, loadCollection, saveCollection, billingFile }) {
  const file = path.join(dataDirectory, "presupuestos.json");
  const settingsFile = path.join(dataDirectory, "presupuestos-ajustes.json");
  const docsDirectory = path.join(dataDirectory, "presupuestos");
  const publicDirectory = path.join(__dirname, "public");
  let PDF = null;
  const pdfLib = () => PDF || (PDF = require("./public/vendor/pdf-lib.min.js"));

  const DEFAULT_SETTINGS = {
    nombre: "Asesoría Molinero, S.L.", nif: "B72758998", direccion: "", telefono: "", email: "", web: "asesoriamolinero.es",
    pago: "Transferencia bancaria a la cuenta ES00 0000 0000 0000 0000 0000, indicando en el concepto el número de presupuesto.",
    condiciones: [
      "Los honorarios no incluyen tasas, aranceles notariales o registrales, impuestos ni otros suplidos que se paguen por cuenta del cliente; se cobrarán aparte, con su justificante.",
      "El encargo comienza con la aceptación de este presupuesto y el pago del anticipo. El resto se abonará al finalizar el trabajo.",
      "Los plazos dependen de que el cliente entregue a tiempo la documentación e información necesarias y de los organismos públicos que intervienen.",
      "Cualquier trabajo no incluido en este presupuesto se presupuestará aparte.",
      "Protección de datos: los datos facilitados se tratarán por el despacho para gestionar el encargo y cumplir las obligaciones legales (RGPD). Puede ejercer sus derechos dirigiéndose al despacho."
    ].join("\n")
  };
  const settings = () => { try { return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(settingsFile, "utf8")) }; } catch { return { ...DEFAULT_SETTINGS }; } };
  const load = () => loadCollection(file);
  const save = list => saveCollection(file, list);
  const money = value => Math.round((Number(String(value ?? "").replace(",", ".")) || 0) * 100) / 100;
  const eur = value => `${money(value).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" })} €`;
  const now = () => new Date().toISOString();
  const day = iso => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" });
  const dayLong = iso => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" });
  const dateTime = iso => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const safeName = value => String(value || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "SIN NOMBRE";
  const ESTADOS = ["borrador", "enviado", "aceptado", "en_curso", "pago_final", "pagado", "rechazado", "anulado"];

  // Importes: base de cada concepto, IVA y total; los pagos se reparten por porcentaje y el último cuadra el céntimo.
  function totals(p) {
    const base = money((p.conceptos || []).reduce((sum, c) => sum + money(c.importe), 0));
    const iva = money(base * money(p.ivaPct) / 100), total = money(base + iva);
    let resto = total;
    const pagos = (p.pagos || []).map((pago, index, list) => {
      const importe = index === list.length - 1 ? money(resto) : money(total * money(pago.pct) / 100);resto = money(resto - importe);
      return { ...pago, importe };
    });
    return { base, iva, total, pagos };
  }
  function clean(body, previous = {}) {
    const cliente = body.cliente || {};
    const conceptos = (Array.isArray(body.conceptos) ? body.conceptos : []).slice(0, 40).map(c => ({ descripcion: cleanText(c.descripcion, 600), importe: money(c.importe) })).filter(c => c.descripcion || c.importe);
    const plan = Array.isArray(body.pagos) && body.pagos.length ? body.pagos.slice(0, 6) : [{ etiqueta: "Anticipo a la aceptación", pct: 50 }, { etiqueta: "Al finalizar el trabajo", pct: 50 }];
    const oldPagos = previous.pagos || [];
    const p = {
      ...previous,
      cliente: { nombre: cleanText(cliente.nombre, 160), nif: cleanText(cliente.nif, 20).toUpperCase(), email: cleanText(cliente.email, 160), telefono: cleanText(cliente.telefono, 30), carpeta: cleanText(cliente.carpeta, 160), provisional: !cliente.carpeta },
      marca: body.marca === "propymes" ? "propymes" : "molinero",
      servicio: cleanText(body.servicio, 160), conceptos, ivaPct: [0, 4, 10, 21].includes(Number(body.ivaPct)) ? Number(body.ivaPct) : 21,
      validez: Math.max(1, Math.min(365, Number(body.validez) || 30)), pagoInstrucciones: cleanText(body.pagoInstrucciones ?? previous.pagoInstrucciones ?? settings().pago, 1200), condiciones: cleanText(body.condiciones ?? previous.condiciones ?? settings().condiciones, 6000), notas: cleanText(body.notas, 2000),
      pagos: plan.map((pago, index) => ({ id: oldPagos[index]?.id || crypto.randomUUID(), etiqueta: cleanText(pago.etiqueta, 80) || `Pago ${index + 1}`, pct: money(pago.pct), estado: oldPagos[index]?.estado || "pendiente", ...(oldPagos[index]?.estado === "pagado" ? { pagadoEn: oldPagos[index].pagadoEn, metodo: oldPagos[index].metodo, justificante: oldPagos[index].justificante } : {}) }))
    };
    const t = totals(p);
    return { ...p, base: t.base, iva: t.iva, total: t.total, pagos: t.pagos };
  }
  // Huella del contenido aceptado: si alguien cambia el presupuesto después, deja de coincidir.
  const hashOf = p => crypto.createHash("sha256").update(JSON.stringify({ numero: p.numero, fecha: p.fecha, cliente: p.cliente, marca: p.marca, servicio: p.servicio, conceptos: p.conceptos, ivaPct: p.ivaPct, base: p.base, iva: p.iva, total: p.total, pagos: (p.pagos || []).map(x => ({ etiqueta: x.etiqueta, pct: x.pct, importe: x.importe })), validez: p.validez, condiciones: p.condiciones, pagoInstrucciones: p.pagoInstrucciones, version: p.version })).digest("hex");
  const venceEl = p => new Date(new Date(p.fecha).getTime() + p.validez * 86400000).toISOString();

  /* ---------- Carpetas: CLIENTES/<cliente>/PRESUPUESTOS o PRESUPUESTOS/<cliente provisional> ---------- */
  const folderOf = p => p.cliente.carpeta ? ["CLIENTES", p.cliente.carpeta, "PRESUPUESTOS"] : ["PRESUPUESTOS", safeName(p.cliente.nombre)];
  async function davSave(parts, name, buffer, type) {
    for (let i = 1; i <= parts.length; i++) {
      try { await davRequest(parts.slice(0, i).map(encodeURIComponent).join("/"), { method: "MKCOL" }); } catch (error) { if (![405, 409].includes(error.status) && error.status !== 301) throw error; }
    }
    await davRequest([...parts, name].map(encodeURIComponent).join("/"), { method: "PUT", headers: { "Content-Type": type, "Content-Length": String(buffer.length) }, body: buffer });
    return [...parts, name].join("/");
  }
  // Cada documento se guarda en la app (para descargarlo siempre) y en el servidor de archivos del despacho.
  async function storeDoc(p, kind, name, buffer, type = "application/pdf") {
    const dir = path.join(docsDirectory, p.id);fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), buffer);
    let ruta = "", error = "";
    try { ruta = await davSave(folderOf(p), name, buffer, type); } catch (e) { error = e.message || "No se pudo guardar en el servidor"; }
    const doc = { kind, name, type, fecha: now(), ruta, error };
    p.documentos = [...(p.documentos || []).filter(d => !(d.kind === kind && d.name === name)), doc];
    return doc;
  }

  /* ---------- PDF ---------- */
  const WIN = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  const pdfText = value => String(value ?? "").replace(/[  ]/g, " ").replace(/[≤]/g, "<=").replace(/[≥]/g, ">=").split("").map(ch => { const c = ch.charCodeAt(0);return c === 10 || (c >= 32 && c < 127) || (c >= 160 && c < 256) || WIN.includes(ch) ? ch : "?"; }).join("");
  const NAVY = [0.055, 0.094, 0.208], BLUE = [0.094, 0.161, 0.608], INK = [0.09, 0.125, 0.2], MUTED = [0.43, 0.47, 0.53], LINE = [0.88, 0.9, 0.94], SOFT = [0.957, 0.965, 0.984];
  async function basePdf() {
    const { PDFDocument, StandardFonts, rgb } = pdfLib();
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const color = c => rgb(...c);
    let molinero = null, propymes = null;
    try { molinero = await doc.embedPng(fs.readFileSync(path.join(publicDirectory, "brand", "molinero.png"))); } catch {}
    try { propymes = await doc.embedPng(fs.readFileSync(path.join(publicDirectory, "propymes", "logo-arena-horizontal.png"))); } catch {}
    return { doc, font, bold, color, molinero, propymes, rgb };
  }
  function writer(ctx, p) {
    const { doc, font, bold, color } = ctx, W = 595.28, H = 841.89, M = 56;
    const state = { page: null, y: 0, n: doc.getPageCount() };
    const wrap = (text, f, size, width) => {
      const lines = [];
      for (const para of pdfText(text).split("\n")) {
        let line = "";
        for (const word of para.split(/\s+/)) {
          const next = line ? `${line} ${word}` : word;
          if (f.widthOfTextAtSize(next, size) > width && line) { lines.push(line);line = word; } else line = next;
        }
        lines.push(line);
      }
      return lines;
    };
    const text = (t, x, y, { f = font, size = 10, c = INK, align = "left", width = 0 } = {}) => {
      const s = pdfText(t), w = f.widthOfTextAtSize(s, size);
      const xx = align === "right" ? x - w : align === "center" ? x + (width - w) / 2 : x;
      state.page.drawText(s, { x: xx, y, size, font: f, color: color(c) });
    };
    const line = (x1, y, x2, c = LINE, t = 0.6) => state.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: t, color: color(c) });
    const header = () => {
      // Cabecera: logos a la izquierda y, a la derecha, el tipo de documento con su número y fecha.
      let x = M;
      if (ctx.molinero) { const h = 40, w = ctx.molinero.width * h / ctx.molinero.height;state.page.drawImage(ctx.molinero, { x, y: H - 50 - h, width: w, height: h });x += w; }
      if (p.marca === "propymes" && ctx.propymes) { x += 16;state.page.drawLine({ start: { x, y: H - 88 }, end: { x, y: H - 52 }, thickness: 0.6, color: color(LINE) });x += 16;const h = 22, w = ctx.propymes.width * h / ctx.propymes.height;state.page.drawImage(ctx.propymes, { x, y: H - 81, width: w, height: h }); }
      text(state.label, W - M, H - 62, { f: bold, size: 8.5, c: BLUE, align: "right" });
      text(p.numero, W - M, H - 79, { f: bold, size: 15, c: NAVY, align: "right" });
      text(dayLong(p.fecha), W - M, H - 93, { size: 9, c: MUTED, align: "right" });
      line(M, H - 112, W - M, LINE, 0.8);
      state.y = H - 140;
    };
    const footer = () => {
      const s = settings(), parts = [s.nombre, s.nif && `NIF ${s.nif}`, s.direccion, s.telefono, s.email, s.web].filter(Boolean).join("  ·  ");
      line(M, 46, W - M, LINE, 0.6);
      text(parts, M, 32, { size: 7.5, c: MUTED });
      text(`${state.n}`, W - M, 32, { size: 7.5, c: MUTED, align: "right" });
    };
    const newPage = () => { if (state.page) footer();state.page = doc.addPage([W, H]);state.n++;header(); };
    const need = h => { if (state.y - h < 70) newPage(); };
    return { W, H, M, state, wrap, text, line, newPage, need, finish: () => footer(), font, bold };
  }
  function drawPresupuesto(ctx, p, label = "PRESUPUESTO") {
    const w = writer(ctx, p), { W, M, state, wrap, text, line, need, font, bold } = w;
    state.label = label;w.newPage();
    // Cliente y validez
    text("PARA", M, state.y, { f: bold, size: 7.5, c: MUTED });
    text("VÁLIDO HASTA", W - M, state.y, { f: bold, size: 7.5, c: MUTED, align: "right" });
    state.y -= 15;
    text(p.cliente.nombre || "—", M, state.y, { f: bold, size: 12, c: NAVY });
    text(day(venceEl(p)), W - M, state.y, { f: bold, size: 11, c: NAVY, align: "right" });
    state.y -= 14;
    for (const d of [p.cliente.nif && `NIF ${p.cliente.nif}`, p.cliente.email, p.cliente.telefono].filter(Boolean)) { text(d, M, state.y, { size: 9, c: MUTED });state.y -= 12; }
    state.y -= 22;
    // Servicio
    for (const l of wrap(p.servicio || "Presupuesto", bold, 20, W - 2 * M)) { need(26);text(l, M, state.y, { f: bold, size: 20, c: NAVY });state.y -= 25; }
    state.y -= 10;
    // Conceptos
    text("CONCEPTO", M, state.y, { f: bold, size: 7.5, c: MUTED });text("IMPORTE", W - M, state.y, { f: bold, size: 7.5, c: MUTED, align: "right" });
    state.y -= 8;line(M, state.y, W - M, NAVY, 0.8);state.y -= 18;
    for (const c of p.conceptos) {
      const lines = wrap(c.descripcion, font, 10, W - 2 * M - 110);need(lines.length * 13 + 14);
      lines.forEach((l, i) => text(l, M, state.y - i * 13, { size: 10 }));
      text(eur(c.importe), W - M, state.y, { size: 10, align: "right" });
      state.y -= lines.length * 13 + 6;line(M, state.y, W - M);state.y -= 16;
    }
    // Totales
    need(70);
    const tx = W - M - 200;
    text("Base imponible", tx, state.y, { size: 9.5, c: MUTED });text(eur(p.base), W - M, state.y, { size: 9.5, align: "right" });state.y -= 16;
    text(p.ivaPct ? `IVA ${p.ivaPct} %` : "IVA (exento)", tx, state.y, { size: 9.5, c: MUTED });text(eur(p.iva), W - M, state.y, { size: 9.5, align: "right" });state.y -= 10;
    line(tx, state.y, W - M, NAVY, 0.8);state.y -= 18;
    text("Total", tx, state.y, { f: bold, size: 12, c: NAVY });text(eur(p.total), W - M, state.y, { f: bold, size: 14, c: BLUE, align: "right" });state.y -= 36;
    // Forma de pago
    need(40 + p.pagos.length * 18);
    text("FORMA DE PAGO", M, state.y, { f: bold, size: 7.5, c: MUTED });state.y -= 8;line(M, state.y, W - M, NAVY, 0.8);state.y -= 18;
    for (const pago of p.pagos) {
      text(pago.etiqueta, M, state.y, { size: 10 });text(`${String(pago.pct).replace(".", ",")} %`, W - M - 110, state.y, { size: 10, c: MUTED, align: "right" });text(eur(pago.importe), W - M, state.y, { f: bold, size: 10, align: "right" });
      state.y -= 8;line(M, state.y, W - M);state.y -= 16;
    }
    if (p.pagoInstrucciones) { const lines = wrap(p.pagoInstrucciones, font, 9, W - 2 * M);need(lines.length * 12 + 6);lines.forEach(l => { text(l, M, state.y, { size: 9, c: MUTED });state.y -= 12; });state.y -= 6; }
    state.y -= 14;
    // Condiciones
    if (p.condiciones) {
      need(40);text("CONDICIONES", M, state.y, { f: bold, size: 7.5, c: MUTED });state.y -= 8;line(M, state.y, W - M, NAVY, 0.8);state.y -= 16;
      p.condiciones.split("\n").filter(s => s.trim()).forEach((cond, i) => {
        const lines = wrap(cond.trim(), font, 8.5, W - 2 * M - 16);need(lines.length * 11.5 + 4);
        text(`${i + 1}.`, M, state.y, { f: bold, size: 8.5, c: BLUE });
        lines.forEach((l, k) => text(l, M + 16, state.y - k * 11.5, { size: 8.5, c: [0.3, 0.34, 0.42] }));
        state.y -= lines.length * 11.5 + 5;
      });
    }
    w.finish();
  }
  async function presupuestoPdf(p) {
    const ctx = await basePdf();drawPresupuesto(ctx, p);
    ctx.doc.setTitle(`Presupuesto ${p.numero}`);ctx.doc.setAuthor(settings().nombre);
    return Buffer.from(await ctx.doc.save());
  }
  // Acuerdo de aceptación: una hoja con quién, cuándo y desde dónde aceptó, la huella del documento y, detrás, el
  // presupuesto tal como lo aceptó.
  async function acuerdoPdf(p) {
    const ctx = await basePdf(), w = writer(ctx, p), { W, M, state, wrap, text, line, font, bold } = w, a = p.aceptacion;
    state.label = "ACEPTACIÓN DEL PRESUPUESTO";w.newPage();
    for (const l of wrap(`Aceptación del presupuesto ${p.numero}`, bold, 20, W - 2 * M)) { text(l, M, state.y, { f: bold, size: 20, c: NAVY });state.y -= 25; }
    state.y -= 4;
    for (const l of wrap(`${a.nombre}${a.dni ? `, con documento ${a.dni},` : ""} declara que ha leído el presupuesto ${p.numero} de ${settings().nombre} («${p.servicio}», ${eur(p.total)} IVA incluido), que acepta su contenido, su forma de pago y sus condiciones, y que encarga el inicio de los trabajos.`, font, 10.5, W - 2 * M)) { text(l, M, state.y, { size: 10.5 });state.y -= 15; }
    state.y -= 16;
    const rows = [["Aceptado por", a.nombre], ["Documento", a.dni || "—"], ["Correo", a.email || "—"], ["Teléfono", a.telefono || "—"], ["En nombre de", p.cliente.nombre], ["Fecha y hora", `${dateTime(a.fecha)} (hora de Madrid)`], ["Dirección IP", a.ip || "—"], ["Navegador", a.navegador || "—"], ["Presupuesto", `${p.numero} · versión ${p.version} · ${eur(p.total)}`], ["Huella SHA-256", a.hash]];
    for (const [k, v] of rows) {
      const lines = wrap(v, k === "Huella SHA-256" ? font : bold, k === "Huella SHA-256" ? 8 : 10, W - 2 * M - 130);
      text(k, M, state.y, { size: 9, c: MUTED });lines.forEach((l, i) => text(l, M + 130, state.y - i * 12, { f: k === "Huella SHA-256" ? font : bold, size: k === "Huella SHA-256" ? 8 : 10, c: NAVY }));
      state.y -= lines.length * 12 + 6;line(M, state.y, W - M);state.y -= 14;
    }
    state.y -= 6;
    for (const l of wrap("La huella SHA-256 identifica el contenido exacto del presupuesto aceptado: cualquier cambio posterior en el presupuesto daría una huella distinta. A continuación se incluye el presupuesto aceptado.", font, 8.5, W - 2 * M)) { text(l, M, state.y, { size: 8.5, c: MUTED });state.y -= 11.5; }
    w.finish();
    drawPresupuesto(ctx, p);
    ctx.doc.setTitle(`Aceptación ${p.numero}`);ctx.doc.setAuthor(settings().nombre);
    return Buffer.from(await ctx.doc.save());
  }

  /* ---------- Facturación: cada cobro deja un aviso para facturarlo ---------- */
  function billingFor(p, pago, user) {
    const entries = loadCollection(billingFile);
    if (entries.some(e => e.presupuestoId === p.id && e.pagoId === pago.id)) return;
    const base = money(pago.importe / (1 + p.ivaPct / 100));
    entries.push({ id: crypto.randomUUID(), date: (pago.pagadoEn || now()).slice(0, 10), client: p.cliente.nombre, description: `Facturar ${pago.etiqueta.toLowerCase()} (${String(pago.pct).replace(".", ",")} %) del presupuesto ${p.numero} · ${p.servicio}: ${eur(pago.importe)} (${eur(base)} + IVA), cobrado el ${day(pago.pagadoEn || now())}${pago.metodo ? ` por ${pago.metodo}` : ""}.`, hours: "", employeeId: user?.id || "presupuestos", employee: user?.name || "Presupuestos", createdAt: now(), presupuestoId: p.id, presupuestoNumero: p.numero, pagoId: pago.id, importe: pago.importe });
    saveCollection(billingFile, entries.slice(-10000));
  }
  const log = (p, texto, user) => { p.historial = [...(p.historial || []), { fecha: now(), texto, por: user?.name || "" }]; };
  const nextNumber = list => { const year = new Date().getFullYear(), n = list.filter(p => String(p.numero).startsWith(`P-${year}-`)).map(p => Number(String(p.numero).split("-")[2]) || 0);return `P-${year}-${String((n.length ? Math.max(...n) : 0) + 1).padStart(3, "0")}`; };
  const publicView = p => ({ numero: p.numero, fecha: p.fecha, vence: venceEl(p), estado: p.estado, caducado: !p.aceptacion && Date.now() > new Date(venceEl(p)).getTime(), marca: p.marca, cliente: { nombre: p.cliente.nombre, nif: p.cliente.nif }, servicio: p.servicio, conceptos: p.conceptos, ivaPct: p.ivaPct, base: p.base, iva: p.iva, total: p.total, pagos: p.pagos.map(x => ({ etiqueta: x.etiqueta, pct: x.pct, importe: x.importe, estado: x.estado, pagadoEn: x.pagadoEn || "" })), pagoInstrucciones: p.pagoInstrucciones, condiciones: p.condiciones, aceptacion: p.aceptacion ? { nombre: p.aceptacion.nombre, fecha: p.aceptacion.fecha } : null, pagoFinalPedido: Boolean(p.pagoFinalPedido), despacho: (({ nombre, nif, direccion, telefono, email, web }) => ({ nombre, nif, direccion, telefono, email, web }))(settings()) });
  const docFile = (p, name) => path.join(docsDirectory, p.id, path.basename(name));
  const sendPdf = (res, buffer, name) => { res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`, "Cache-Control": "no-store" });res.end(buffer); };
  const presupuestoName = p => `${p.numero} Presupuesto - ${safeName(p.servicio)}.pdf`;

  async function regenerate(p) {
    p.hash = hashOf(p);
    const buffer = await presupuestoPdf(p);
    p.documentos = (p.documentos || []).filter(d => d.kind !== "presupuesto");
    await storeDoc(p, "presupuesto", presupuestoName(p), buffer);
  }

  /* ---------- Rutas ---------- */
  return function handle(req, res, requestPath) {
    const method = req.method;
    // Página pública del cliente (sin sesión): solo con el enlace secreto del presupuesto.
    let m = requestPath.match(/^\/api\/p\/([A-Za-z0-9_-]{20,80})(\/(aceptar|pdf))?$/);
    if (m) {
      const list = load(), p = list.find(x => x.token === m[1]);
      if (!p || p.estado === "anulado") return json(res, 404, { error: "Este presupuesto no existe o ya no está disponible." }), true;
      if (!m[2] && method === "GET") return json(res, 200, publicView(p)), true;
      if (m[3] === "pdf" && method === "GET") {
        const wanted = new URL(req.url, "http://x").searchParams.get("doc") === "acuerdo" ? p.documentos?.find(d => d.kind === "acuerdo") : p.documentos?.find(d => d.kind === "presupuesto");
        if (wanted && fs.existsSync(docFile(p, wanted.name))) return sendPdf(res, fs.readFileSync(docFile(p, wanted.name)), wanted.name), true;
        presupuestoPdf(p).then(buffer => sendPdf(res, buffer, presupuestoName(p))).catch(() => json(res, 500, { error: "No se pudo generar el PDF." }));return true;
      }
      if (m[3] === "aceptar" && method === "POST") {
        readJson(req, 8192).then(async body => {
          if (p.aceptacion) return json(res, 200, publicView(p));
          if (p.estado === "rechazado") return json(res, 409, { error: "Este presupuesto ya no se puede aceptar. Ponte en contacto con el despacho." });
          if (Date.now() > new Date(venceEl(p)).getTime()) return json(res, 409, { error: "El plazo de validez de este presupuesto ha terminado. Ponte en contacto con el despacho para renovarlo." });
          const nombre = cleanText(body.nombre, 160), dni = cleanText(body.dni, 20).toUpperCase(), email = cleanText(body.email, 160), telefono = cleanText(body.telefono, 30);
          if (!nombre || !dni || body.acepto !== true) return json(res, 400, { error: "Indica tu nombre y tu DNI/NIF y marca la casilla de aceptación." });
          const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
          p.aceptacion = { nombre, dni, email, telefono, fecha: now(), ip, navegador: cleanText(req.headers["user-agent"], 300), hash: hashOf(p) };
          p.estado = "aceptado";log(p, `Aceptado por ${nombre} (${dni}) desde el enlace`);
          try { await storeDoc(p, "acuerdo", `${p.numero} Aceptación del presupuesto.pdf`, await acuerdoPdf(p)); } catch (error) { console.error("Acuerdo de presupuesto:", error.message);log(p, `No se pudo generar el acuerdo en PDF: ${error.message}`); }
          const all = load(), i = all.findIndex(x => x.id === p.id);if (i >= 0) all[i] = p;save(all);
          json(res, 200, publicView(p));
        }).catch(() => json(res, 400, { error: "No se pudo registrar la aceptación." }));
        return true;
      }
      return false;
    }
    if (!requestPath.startsWith("/api/presupuestos")) return false;
    const user = requireUser(req, res);if (!user) return true;
    if (requestPath === "/api/presupuestos" && method === "GET") {
      const billing = loadCollection(billingFile).filter(e => e.presupuestoId);
      return json(res, 200, { presupuestos: load().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).map(p => ({ ...p, vence: venceEl(p), facturacion: billing.filter(e => e.presupuestoId === p.id) })), ajustes: settings() }), true;
    }
    if (requestPath === "/api/presupuestos/ajustes" && method === "POST") {
      readJson(req, 32 * 1024).then(body => {
        const s = {};for (const k of Object.keys(DEFAULT_SETTINGS)) s[k] = cleanText(body[k], k === "condiciones" ? 6000 : k === "pago" ? 1200 : 200);
        fs.mkdirSync(dataDirectory, { recursive: true });fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2));json(res, 200, settings());
      }).catch(() => json(res, 400, { error: "No se pudieron guardar los ajustes." }));
      return true;
    }
    // Vista previa del PDF con los datos del formulario, sin guardar nada.
    if (requestPath === "/api/presupuestos/preview" && method === "POST") {
      readJson(req, 128 * 1024).then(async body => {
        const list = load(), existing = body.id ? list.find(x => x.id === body.id) : null;
        const p = clean(body, existing ? { ...existing } : { id: "preview", numero: nextNumber(list), fecha: now(), version: 1 });
        if (!p.cliente.nombre) p.cliente.nombre = "Cliente";
        sendPdf(res, await presupuestoPdf(p), `Vista previa ${p.numero}.pdf`);
      }).catch(() => json(res, 400, { error: "No se pudo generar la vista previa." }));
      return true;
    }
    if (requestPath === "/api/presupuestos" && method === "POST") {
      readJson(req, 128 * 1024).then(async body => {
        const list = load(), p = clean(body, { id: crypto.randomUUID(), token: crypto.randomBytes(24).toString("base64url"), numero: nextNumber(list), fecha: now(), estado: "borrador", version: 1, creadoPor: user.name, documentos: [], historial: [] });
        if (!p.cliente.nombre) return json(res, 400, { error: "Indica el nombre del cliente." });
        if (!p.conceptos.length) return json(res, 400, { error: "Añade al menos un concepto con su importe." });
        log(p, `Creado (${eur(p.total)})`, user);
        await regenerate(p);
        list.push(p);save(list);json(res, 201, p);
      }).catch(error => { console.error("Presupuesto:", error);json(res, 400, { error: "No se pudo crear el presupuesto." }); });
      return true;
    }
    m = requestPath.match(/^\/api\/presupuestos\/([0-9a-f-]{36})(?:\/(accion|pago|doc)(?:\/([^/]+))?)?$/);
    if (!m) return json(res, 404, { error: "No encontrado." }), true;
    const list = load(), index = list.findIndex(x => x.id === m[1]), p = list[index];
    if (!p) return json(res, 404, { error: "Este presupuesto no existe." }), true;
    const store = () => { list[index] = p;save(list); };
    if (!m[2] && method === "POST") {
      readJson(req, 128 * 1024).then(async body => {
        if (p.aceptacion) return json(res, 409, { error: "El presupuesto ya está aceptado: no se puede cambiar. Crea uno nuevo si hace falta." });
        const updated = clean(body, p);
        if (!updated.cliente.nombre || !updated.conceptos.length) return json(res, 400, { error: "Faltan el cliente o los conceptos." });
        Object.assign(p, updated, { version: (p.version || 1) + 1 });log(p, `Modificado (versión ${p.version}, ${eur(p.total)})`, user);
        await regenerate(p);store();json(res, 200, p);
      }).catch(() => json(res, 400, { error: "No se pudo guardar el presupuesto." }));
      return true;
    }
    if (m[2] === "doc" && method === "GET") {
      const name = decodeURIComponent(m[3] || ""), doc = (p.documentos || []).find(d => d.name === name);
      if (!doc || !fs.existsSync(docFile(p, doc.name))) return json(res, 404, { error: "No se encuentra el documento." }), true;
      res.writeHead(200, { "Content-Type": doc.type || "application/octet-stream", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`, "Cache-Control": "no-store" });
      res.end(fs.readFileSync(docFile(p, doc.name)));return true;
    }
    if (m[2] === "accion" && method === "POST") {
      readJson(req, 4096).then(async ({ accion }) => {
        if (accion === "enviado") { if (p.estado === "borrador") { p.estado = "enviado";log(p, "Enviado al cliente", user); } }
        else if (accion === "rechazado") { p.estado = "rechazado";log(p, "Marcado como rechazado", user); }
        else if (accion === "anulado") { p.estado = "anulado";log(p, "Anulado", user); }
        else if (accion === "reabrir") { if (!p.aceptacion) { p.estado = "enviado";log(p, "Reabierto", user); } }
        else if (accion === "terminado") {
          if (!p.aceptacion) return json(res, 409, { error: "El presupuesto aún no está aceptado." });
          p.pagoFinalPedido = true;p.estado = p.pagos.every(x => x.estado === "pagado") ? "pagado" : "pago_final";log(p, "Trabajo terminado: se pide el pago final", user);
        } else return json(res, 400, { error: "Acción no válida." });
        store();json(res, 200, p);
      }).catch(() => json(res, 400, { error: "No se pudo actualizar." }));
      return true;
    }
    // Pago recibido (transferencia, efectivo, tarjeta…) con su justificante, que se guarda junto al presupuesto.
    if (m[2] === "pago" && method === "POST") {
      const pago = p.pagos.find(x => x.id === m[3]);if (!pago) return json(res, 404, { error: "Pago no encontrado." }), true;
      let name = "", metodo = "", fecha = "";
      try { name = decodeURIComponent(String(req.headers["x-file-name"] || ""));metodo = cleanText(decodeURIComponent(String(req.headers["x-metodo"] || "")), 40);fecha = cleanText(String(req.headers["x-fecha"] || ""), 10); } catch {}
      readBuffer(req, 25 * 1024 * 1024).then(async buffer => {
        pago.estado = "pagado";pago.pagadoEn = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T12:00:00.000Z` : now();pago.metodo = metodo || "transferencia";pago.registradoPor = user.name;
        if (buffer.length) {
          const ext = (path.extname(name).toLowerCase().match(/^\.[a-z0-9]{1,5}$/) || [".pdf"])[0];
          const doc = await storeDoc(p, `justificante:${pago.id}`, `${p.numero} Justificante ${safeName(pago.etiqueta).toLowerCase()}${ext}`, buffer, String(req.headers["content-type"] || "application/octet-stream"));
          pago.justificante = doc.name;
        }
        log(p, `Pago recibido: ${pago.etiqueta} ${eur(pago.importe)} por ${pago.metodo}`, user);
        if (p.pagos.every(x => x.estado === "pagado")) p.estado = "pagado";else if (p.aceptacion && !["pago_final"].includes(p.estado)) p.estado = "en_curso";
        billingFor(p, pago, user);store();json(res, 200, p);
      }).catch(error => json(res, 400, { error: error.message || "No se pudo registrar el pago." }));
      return true;
    }
    return json(res, 404, { error: "No encontrado." }), true;
  };
};
