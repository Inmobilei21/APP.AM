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
    const supplierByEntry = new Map(), invoiceNif = new Map();
    for (const row of rows("Facturas", ["Fecha", "Asiento", "Emitida", "Cuenta", "Cif"])) {
      if (isTrue(row.Emitida)) continue;
      const account = text(row.Cuenta);
      supplierByEntry.set(dateKey(row.Fecha, row.Asiento), account);
      if (row.Cif && !invoiceNif.has(account)) invoiceNif.set(account, nif(row.Cif));
    }
    const usage = new Map(), expenseUsed = new Set();
    for (const row of rows("Bases Factura", ["Fecha", "Asiento", "Emitida", "Cuenta"])) {
      if (isTrue(row.Emitida)) continue;
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
      return { cuenta, nombre: record.nombre || accountNames.get(cuenta) || "", nif: record.nif || invoiceNif.get(cuenta) || "", gasto: record.gasto && accountNames.has(record.gasto) ? record.gasto : habitual, facturas: counter ? [...counter.values()].reduce((a, b) => a + b, 0) : 0 };
    });
    const expenseCodes = new Set([...accountNames.keys()].filter(code => code.startsWith("6")));
    expenseUsed.forEach(code => { if (accountNames.has(code)) expenseCodes.add(code); });
    const gastos = [...expenseCodes].sort().map(cuenta => ({ cuenta, nombre: accountNames.get(cuenta) || "" }));
    const inicio = general["Fecha Inicio"] instanceof Date ? general["Fecha Inicio"] : null;
    return { empresa: text(general.Nombre), ejercicio: inicio ? inicio.getUTCFullYear() : "", digitos: digits, proveedores, gastos };
  }

  async function save(client, buffer, user) {
    const summary = await summarize(buffer);
    const record = { client, ...summary, actualizado: new Date().toISOString(), actualizadoPor: user?.name || "" };
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(fileFor(client), JSON.stringify(record));
    return record;
  }
  function load(client) {
    try { return JSON.parse(fs.readFileSync(fileFor(client), "utf8")); } catch { return null; }
  }
  return { save, load, summarize };
};
