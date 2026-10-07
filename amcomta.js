// Enlace con AMCOMTA: lee la base de datos de un cliente (.MDB de Access) y
// guarda un resumen con sus cuentas de proveedores y de gastos.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

module.exports = function ({ dataDirectory }) {
  const directory = path.join(dataDirectory, "contabilidad");
  const fileFor = client => path.join(directory, crypto.createHash("sha1").update(String(client).toLocaleLowerCase("es")).digest("hex") + ".json");
  const text = value => String(value ?? "").trim();
  const nif = value => {
    const clean = text(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
    return clean.length > 9 && clean.startsWith("ES") ? clean.slice(2) : clean;
  };
  const isTrue = value => value === true || value === 1 || value === "1" || value === -1;
  const dateKey = (date, entry) => `${date instanceof Date ? date.toISOString().slice(0, 10) : text(date)}|${text(entry)}`;

  async function summarize(buffer) {
    const { default: MDBReader } = await import("mdb-reader");
    let db;
    try { db = new MDBReader(buffer); } catch { throw Object.assign(new Error("El archivo no es una base de datos de AMCOMTA válida (.MDB)."), { status: 400 }); }
    const names = new Set(db.getTableNames());
    if (!names.has("Cuentas") || !names.has("Fichas")) throw Object.assign(new Error("La base de datos no tiene las tablas de cuentas de AMCOMTA."), { status: 400 });
    const rows = (table, columns) => names.has(table) ? db.getTable(table).getData(columns ? { columns } : undefined) : [];
    const general = rows("General")[0] || {};
    const digits = Number(general["Dígitos Contabilidad"]) || 10;

    const accountNames = new Map();
    for (const row of rows("Cuentas", ["Código", "Nombre"])) {
      const code = text(row["Código"]);
      if (code.length === digits) accountNames.set(code, text(row.Nombre));
    }
    const records = new Map();
    for (const row of rows("Fichas", ["Código", "Nif", "Razón Social", "Contrapartida"])) {
      const code = text(row["Código"]);
      if (code.length === digits) records.set(code, { nif: nif(row.Nif), nombre: text(row["Razón Social"]), gasto: text(row.Contrapartida) });
    }

    // Histórico de facturas recibidas: NIF usado y cuenta de gasto habitual de cada proveedor.
    const supplierByEntry = new Map(), invoiceNif = new Map(), withholding = new Map();
    for (const row of rows("Facturas", ["Fecha", "Asiento", "Emitida", "Cuenta", "Cif", "Cuenta IRPF", "% IRPF", "ClavePercepcion"])) {
      if (isTrue(row.Emitida)) continue;
      const account = text(row.Cuenta), irpf = text(row["Cuenta IRPF"]);
      if (irpf && Number(row["% IRPF"])) {
        const key = `${irpf}|${Number(row["% IRPF"])}|${text(row.ClavePercepcion)}`, counter = withholding.get(account) || new Map();
        counter.set(key, (counter.get(key) || 0) + 1);withholding.set(account, counter);
      }
      supplierByEntry.set(dateKey(row.Fecha, row.Asiento), account);
      if (row.Cif && !invoiceNif.has(account)) invoiceNif.set(account, nif(row.Cif));
    }
    const usage = new Map(), expenseUsed = new Set(), incomeUsage = new Map();
    for (const row of rows("Bases Factura", ["Fecha", "Asiento", "Emitida", "Cuenta"])) {
      if (isTrue(row.Emitida)) { const income = text(row.Cuenta); if (income) incomeUsage.set(income, (incomeUsage.get(income) || 0) + 1); continue; }
      const supplier = supplierByEntry.get(dateKey(row.Fecha, row.Asiento)), expense = text(row.Cuenta);
      if (!supplier || !expense) continue;
      expenseUsed.add(expense);
      const counter = usage.get(supplier) || new Map();
      counter.set(expense, (counter.get(expense) || 0) + 1);
      usage.set(supplier, counter);
    }

    const supplierCodes = new Set([...accountNames.keys(), ...records.keys()].filter(code => /^4[01]0/.test(code)));
    const proveedores = [...supplierCodes].sort().map(cuenta => {
      const record = records.get(cuenta) || {}, counter = usage.get(cuenta);
      const habitual = counter ? [...counter.entries()].sort((a, b) => b[1] - a[1])[0][0] : "";
      const irpf = withholding.get(cuenta), [retencion = "", tipoRetencion = "", clave = ""] = irpf ? [...irpf.entries()].sort((a, b) => b[1] - a[1])[0][0].split("|") : [];
      return { cuenta, nombre: record.nombre || accountNames.get(cuenta) || "", nif: record.nif || invoiceNif.get(cuenta) || "", gasto: record.gasto && accountNames.has(record.gasto) ? record.gasto : habitual, facturas: counter ? [...counter.values()].reduce((a, b) => a + b, 0) : 0, retencion, tipoRetencion: Number(tipoRetencion) || 0, clave };
    });
    const expenseCodes = new Set([...accountNames.keys()].filter(code => code.startsWith("6")));
    expenseUsed.forEach(code => { if (accountNames.has(code)) expenseCodes.add(code); });
    const gastos = [...expenseCodes].sort().map(cuenta => ({ cuenta, nombre: accountNames.get(cuenta) || "" }));
    // Cuentas de ingresos (grupo 7 y las usadas en facturas emitidas); la habitual, para proponerla en emitidas.
    const incomeCodes = new Set([...accountNames.keys()].filter(code => code.startsWith("7")));
    incomeUsage.forEach((count, code) => { if (accountNames.has(code)) incomeCodes.add(code); });
    const ingresos = [...incomeCodes].sort().map(cuenta => ({ cuenta, nombre: accountNames.get(cuenta) || "", facturas: incomeUsage.get(cuenta) || 0 }));
    const ingresoHabitual = [...incomeUsage.entries()].filter(([code]) => accountNames.has(code)).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const retenciones = [...accountNames.keys()].filter(code => code.startsWith("4751")).sort().map(cuenta => ({ cuenta, nombre: accountNames.get(cuenta) || "" }));
    // Facturas recibidas con retención de IRPF: base de los borradores de los modelos 115 (alquileres) y 111.
    const money = (row, euro, plain) => { const value = row[euro] ?? row[plain]; return Math.round((Number(value) || 0) * 100) / 100; };
    const isoDay = value => value instanceof Date ? value.toISOString().slice(0, 10) : "";
    const retencionesIrpf = [];
    for (const row of rows("Facturas")) {
      if (isTrue(row.Emitida)) continue;
      const retencion = money(row, "IRPF Euro", "IRPF");
      if (!retencion) continue;
      const cuentaIrpf = text(row["Cuenta IRPF"]), clave = text(row.ClavePercepcion).toUpperCase(), cuentaNombre = accountNames.get(cuentaIrpf) || "";
      const tipo = clave === "X" || /ALQUILER|ARRENDAM/i.test(cuentaNombre) ? "alquiler" : clave === "G" || clave === "H" || /PROFESIONAL/i.test(cuentaNombre) ? "profesional" : "otro";
      const cuenta = text(row.Cuenta), record = records.get(cuenta) || {};
      retencionesIrpf.push({
        fecha: isoDay(row.Fecha), fechaFactura: isoDay(row["Fecha Factura"]) || isoDay(row.Fecha),
        numero: text(row["Número Factura"]), cuenta, nombre: text(row.Nombre) || record.nombre || accountNames.get(cuenta) || "", nif: nif(row.Cif) || record.nif || "",
        base: money(row, "Base IRPF Euro", "Base IRPF"), porcentaje: Number(row["% IRPF"]) || 0, retencion, cuentaIrpf, cuentaIrpfNombre: cuentaNombre, clave, tipo
      });
    }
    retencionesIrpf.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre, "es"));
    // Nóminas (modelo 111): asientos del diario con abono a la cuenta de retenciones del trabajo.
    // Percepciones = cargos a 640/641 del asiento; trabajadores = cuentas 465 abonadas en él.
    const retentionAccounts = [...accountNames.keys()].filter(code => code.startsWith("4751"));
    let workAccounts = retentionAccounts.filter(code => /TRABAJ|PERSONAL|NOMINA/i.test(accountNames.get(code) || ""));
    if (!workAccounts.length && accountNames.has("4751000000")) workAccounts = ["4751000000"];
    const workSet = new Set(workAccounts), entries = new Map();
    if (workSet.size) {
      for (const row of rows("Movimientos")) {
        const code = text(row.Cuenta);
        if (!workSet.has(code) && !/^64[01]/.test(code) && !code.startsWith("465")) continue;
        const key = `${isoDay(row.Fecha)}|${text(row.Asiento)}|${text(row.Contabilidad)}`, amount = money(row, "Importe Euro", "Importe"), debit = isTrue(row.Debe) || row.Debe === true;
        const entry = entries.get(key) || { fecha: isoDay(row.Fecha), asiento: text(row.Asiento), concepto: "", percepciones: 0, retencion: 0, trabajadores: new Map() };
        if (!entry.concepto) entry.concepto = text(row["Ampliación"]);
        if (workSet.has(code)) entry.retencion += debit ? -amount : amount;
        else if (/^64[01]/.test(code)) entry.percepciones += debit ? amount : -amount;
        else if (!debit && amount) entry.trabajadores.set(code, accountNames.get(code) || code);
        entries.set(key, entry);
      }
    }
    const nominas = [...entries.values()].filter(entry => entry.retencion > 0.004 && entry.asiento !== "0" && !/APERTURA|CIERRE|REGULARIZ/i.test(entry.concepto)).map(entry => ({ ...entry, percepciones: Math.round(entry.percepciones * 100) / 100, retencion: Math.round(entry.retencion * 100) / 100, trabajadores: [...entry.trabajadores].map(([cuenta, nombre]) => ({ cuenta, nombre })) })).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const trabajadores = rows("Trabajadores").map(row => ({ codigo: text(row.Codigo), nombre: text(row.Nombre), cuenta: text(row.Cuenta), nif: nif(row.Nif), clave: text(row.ClavePercepcion) })).filter(worker => worker.nombre);
    const inicio = general["Fecha Inicio"] instanceof Date ? general["Fecha Inicio"] : null;
    return { empresa: text(general.Nombre), ejercicio: inicio ? inicio.getUTCFullYear() : "", digitos: digits, proveedores, gastos, ingresos, ingresoHabitual, retenciones, retencionesIrpf, nominas, trabajadores };
  }

  // Versión del resumen: al leer más datos de la base se sube y los resúmenes antiguos se
  // recalculan solos a partir del .MDB guardado, sin tener que volver a subirlo.
  const VERSION = 2;
  const mdbFor = client => fileFor(client).replace(/\.json$/, ".mdb");
  // ¿La empresa de la base es la del cliente elegido? (evita guardar la base de otro cliente)
  const words = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ")
    .replace(/\b(SOCIEDAD LIMITADA|SOCIEDAD ANONIMA|S L P|S L|S A|SLP|SLL|SL|SA|CB|SC|20\d\d)\b/g, " ").split(" ").filter(word => word.length > 1);
  function sameCompany(client, empresa) {
    const target = words(client), found = new Set(words(empresa));
    if (!target.length || !found.size) return true;
    return target.filter(word => found.has(word)).length / target.length >= 0.5;
  }
  async function save(client, buffer, user, force = false) {
    const summary = await summarize(buffer);
    if (!force && !sameCompany(client, summary.empresa)) throw Object.assign(new Error(`Esta base de datos es de «${summary.empresa}», no de «${client}».`), { status: 409, empresa: summary.empresa });
    const record = { client, ...summary, version: VERSION, actualizado: new Date().toISOString(), actualizadoPor: user?.name || "" };
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(mdbFor(client), buffer);
    fs.writeFileSync(fileFor(client), JSON.stringify(record));
    return record;
  }
  async function load(client) {
    let record = null;
    try { record = JSON.parse(fs.readFileSync(fileFor(client), "utf8")); } catch { return null; }
    if (record.version !== VERSION && fs.existsSync(mdbFor(client))) {
      try {
        const summary = await summarize(fs.readFileSync(mdbFor(client)));
        record = { ...record, ...summary, version: VERSION };
        fs.writeFileSync(fileFor(client), JSON.stringify(record));
      } catch (error) { console.error("Recalcular base de AMCOMTA:", error.message); }
    }
    return record;
  }
  function remove(client) {
    for (const file of [fileFor(client), mdbFor(client)]) { try { fs.unlinkSync(file); } catch {} }
  }
  return { save, load, remove, summarize, sameCompany };
};
