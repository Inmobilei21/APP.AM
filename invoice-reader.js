// Lector de facturas con IA.
// Sigue la idea de facturas2json (un modelo de IA que rellena una plantilla JSON
// con los campos de la factura), pero usando la API de Claude, que lee
// directamente PDFs, escaneados y fotos.
"use strict";

const API_URL = process.env.INVOICE_API_URL || "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const IMAGE_TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

const SCHEMA = {
  type: "object",
  properties: {
    facturas: {
      type: "array",
      description: "Una entrada por cada factura (o factura rectificativa/abono) del documento. Normalmente una sola. Los recibos, justificantes de pago, albaranes y demás documentos que no son facturas NO van aquí, sino en otros_documentos.",
      items: {
        type: "object",
        properties: {
          numero: { type: "string", description: "Número o serie+número que identifica la factura, tal como aparece (normalmente lleva dígitos). Nunca el tipo de documento (ALB-FACT, FACTURA, FRA, TICKET…) ni el número de pedido, de cliente, de albarán de reparto o de ruta." },
          paginas: { type: "string", description: "Páginas del documento donde aparece esta factura (p. ej. \"1-2\" o \"3\")." },
          fecha: { type: "string", description: "Fecha de expedición en formato DD/MM/AAAA. Vacío si no aparece." },
          emisor_nombre: { type: "string", description: "Razón social o nombre de quien emite la factura (el proveedor)." },
          emisor_nif: { type: "string", description: "NIF/CIF/VAT del emisor, sin espacios ni guiones. Un NIF español empieza por letra (sociedades: B12345678; NIE: X1234567L) o acaba en letra (personas físicas: 25992147P). Nunca un teléfono, fax, código postal ni nº de cliente (sólo dígitos)." },
          emisor_pais: { type: "string", description: "País de la dirección del emisor, en código ISO de 2 letras (ES, FR, IT, US, AU…). Vacío si no aparece." },
          receptor_pais: { type: "string", description: "País de la dirección del receptor, en código ISO de 2 letras. Vacío si no aparece." },
          concepto: { type: "string", description: "Qué se factura, en una frase breve en español (máx. 120 caracteres): los productos o servicios principales, p. ej. \"Transporte de aceituna campaña 2026\" o \"Honorarios asesoría fiscal septiembre\"." },
          receptor_nombre: { type: "string", description: "Nombre de quien recibe la factura." },
          receptor_nif: { type: "string", description: "NIF/CIF/VAT del receptor, sin espacios ni guiones. Un NIF español empieza por letra (sociedades: B12345678; NIE: X1234567L) o acaba en letra (personas físicas: 25992147P). Nunca un teléfono, fax, código postal ni nº de cliente (sólo dígitos)." },
          tipos_iva: {
            type: "array",
            description: "Desglose por tipo impositivo. Si la factura está exenta o no lleva IVA, un único elemento con tipo 0.",
            items: {
              type: "object",
              properties: {
                tipo: { type: "number", description: "Porcentaje de IVA/IGIC (21, 10, 4, 0…)." },
                concepto: { type: "string", description: "Qué cubre esta línea en pocas palabras (p. ej. \"Suministro de gas\", \"Suplidos\", \"Exento art. 20\", \"No sujeto\")." },
                base: { type: "number", description: "Base imponible de ese tipo, en euros." },
                cuota: { type: "number", description: "Cuota de IVA de ese tipo, en euros." }
              },
              required: ["tipo", "base", "cuota"]
            }
          },
          recargo_equivalencia: { type: "number", description: "Importe total del recargo de equivalencia. 0 si no hay." },
          retencion_tipo: { type: "number", description: "Porcentaje de retención de IRPF. 0 si no hay." },
          retencion_importe: { type: "number", description: "Importe retenido de IRPF (positivo). 0 si no hay." },
          total: { type: "number", description: "Importe total de la factura a pagar, en euros." },
          moneda: { type: "string", description: "Código ISO de la moneda de los importes (EUR, USD, GBP…)." },
          equivalente_eur: {
            type: "object",
            description: "Solo si la factura NO está en euros y muestra algún importe también en euros (p. ej. el IVA o el total en €): ese importe en la moneda original y en euros. Omítelo si no aparece.",
            properties: { importe_original: { type: "number" }, importe_eur: { type: "number" } }
          },
          rectificativa: { type: "boolean", description: "true si es una factura rectificativa o abono." },
          observaciones: { type: "string", description: "Avisos breves en español solo si hay algo que revisar (datos ilegibles, importes que no cuadran, no es una factura…). Vacío si todo está bien." }
        },
        required: ["numero", "fecha", "emisor_nombre", "emisor_nif", "concepto", "tipos_iva", "total"]
      }
    },
    otros_documentos: {
      type: "array",
      description: "Documentos del archivo que NO son facturas: recibos bancarios o de domiciliación, justificantes de transferencia o de pago con tarjeta, albaranes, presupuestos, pedidos, extractos… Vacío si todo son facturas.",
      items: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["recibo_bancario", "justificante_pago", "albaran", "presupuesto", "pedido", "extracto", "otro"] },
          paginas: { type: "string", description: "Páginas del documento donde aparece (p. ej. \"4\" o \"4-5\")." },
          fecha: { type: "string", description: "Fecha del documento en formato DD/MM/AAAA. Vacío si no aparece." },
          descripcion: { type: "string", description: "Qué es, en pocas palabras (p. ej. \"Recibo domiciliado Iberdrola septiembre\")." },
          factura_relacionada: { type: "string", description: "Si es el pago o el recibo de una factura, el número de esa factura tal como aparece. Vacío si no se sabe." },
          importe: { type: "number", description: "Importe del documento, en euros. 0 si no aparece." }
        },
        required: ["tipo", "paginas"]
      }
    },
    total_documento: { type: "number", description: "Si el documento muestra un resumen con el importe total a pagar de todas las facturas juntas, ese importe. 0 si no hay resumen." }
  },
  required: ["facturas"]
};

function readerStatus() {
  return { activo: Boolean(process.env.ANTHROPIC_API_KEY), modelo: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL };
}

function fileBlock(buffer, name, contentType) {
  const ext = (String(name).toLowerCase().match(/\.[a-z0-9]+$/) || [""])[0];
  if (ext === ".pdf" || contentType === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") } };
  }
  const image = IMAGE_TYPES[ext] || (Object.values(IMAGE_TYPES).includes(contentType) ? contentType : "");
  if (image) return { type: "image", source: { type: "base64", media_type: image, data: buffer.toString("base64") } };
  if (ext === ".xml" || ext === ".txt" || /^text\/|xml/.test(contentType || "")) {
    return { type: "text", text: `Contenido del archivo ${name}:\n\n${buffer.toString("utf8").slice(0, 200000)}` };
  }
  return null;
}

async function callClaude(body) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(170000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Error ${response.status} del lector`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function readInvoice(buffer, name, contentType, client, extra = {}) {
  if (!process.env.ANTHROPIC_API_KEY) { const e = new Error("Falta la clave ANTHROPIC_API_KEY en el servidor."); e.status = 503; throw e; }
  if (!buffer.length) { const e = new Error("El archivo está vacío."); e.status = 400; throw e; }
  if (buffer.length > MAX_FILE_BYTES) { const e = new Error("El archivo supera los 25 MB."); e.status = 413; throw e; }
  const block = fileBlock(buffer, name, contentType);
  if (!block) { const e = new Error("Formato no admitido por el lector con IA."); e.status = 415; throw e; }

  const instructions = [
    "Eres un asistente de una asesoría fiscal española. Extrae los datos de la factura adjunta y devuélvelos con la herramienta guardar_facturas.",
    client && extra.tipo === "recibidas" ? `Son facturas RECIBIDAS por el cliente del despacho "${client}"${extra.nif ? ` (NIF ${extra.nif})` : ""}: el cliente es SIEMPRE el receptor. El emisor es el proveedor que vende o presta el servicio (búscalo en el logotipo, la cabecera, el pie, el registro mercantil o «el firmante»), aunque los datos del cliente aparezcan en un recuadro como «Datos fiscales». Nunca pongas al cliente como emisor.` :
    client && extra.tipo === "emitidas" ? `Son facturas EMITIDAS por el cliente del despacho "${client}"${extra.nif ? ` (NIF ${extra.nif})` : ""}: el cliente es SIEMPRE el emisor y el receptor es su cliente. Nunca pongas al cliente del despacho como receptor.` :
    client ? `La documentación pertenece al cliente del despacho "${client}". Normalmente es el receptor (factura recibida); si es el emisor, indícalo en observaciones.` : "",
    `Nombre del archivo: ${name}`,
    "Reglas:",
    "- Copia el número de factura, nombres y NIF exactamente como aparecen.",
    "- El NIF tiene formato fijo: empieza por letra si es persona jurídica o NIE (B23749880, X1234567L) o acaba en letra si es persona física (25992147P, también tras «DNI»). Un número sólo de dígitos (teléfono, fax, código de cliente, código postal) NUNCA es un NIF. El NIF de cada parte debe ser el que va junto a SU nombre: no mezcles datos del recuadro del cliente (Datos fiscales, Facturar a, Cliente) con los del emisor. Si no encuentras el NIF del emisor, búscalo en el pie, en el registro mercantil o junto a «el firmante» / «DNI»; si no aparece, déjalo vacío.",
    "- El número de factura es el identificador del documento, no su tipo: si en la casilla «Documento» pone un código como ALB-FACT, FACT o FRA, eso es el tipo y el número está en «Nº», «Número», «Doc. Origen» o similar (en los albaranes-factura suele ser «Doc. Origen»). No uses el número de pedido, de cliente, de reparto ni de ruta. Si dudas entre varios, elige el que se repite en el documento y dilo en observaciones.",
    "- Si el NIF/VAT del emisor es extranjero, conserva su prefijo de país (IT, FR, DE, GB…). Copia el tipo de IVA tal como aparece aunque no sea español (p. ej. 22 %).",
    "- En concepto resume en una frase lo que se factura (productos o servicios), sin importes.",
    "- Importes como números con punto decimal (1234.56), sin símbolo de moneda, en la moneda de la factura (no los conviertas tú).",
    "- Desglosa cada tipo de IVA por separado. Los suplidos o conceptos no sujetos van con tipo 0.",
    "- La retención de IRPF resta del total; el recargo de equivalencia suma.",
    "- Comprueba que suma de bases + cuotas + recargo − retención = total. Si no cuadra, dilo en observaciones.",
    "- No inventes datos: si algo no aparece o no se lee, déjalo vacío (o 0) y avísalo en observaciones.",
    "- Revisa TODAS las páginas. Los recibos de suministros (luz, gas, agua, teléfono) suelen incluir varias facturas en el mismo PDF: la del suministro y otras de servicios (mantenimiento, alquiler de equipos…), a veces de meses distintos.",
    "- Cada número de factura distinto es una factura distinta: devuelve una entrada por cada una, con su propio número, fecha, desglose y total, aunque tengan los mismos importes.",
    "- Un bloque de \"resumen total\" o \"total a pagar\" que suma varias facturas NO es una factura: su importe va en total_documento.",
    "- No mezcles importes de una factura con otra. Los totales de la primera página (\"Fijo\", \"Variable\", \"Impuestos\"…) son un resumen; usa el detalle de cada factura.",
    "- Impuestos especiales (hidrocarburos, electricidad), alquileres de equipos y cánones forman parte de la base imponible cuando el IVA se calcula sobre ellos.",
    "- Solo son facturas los documentos que el emisor titula como factura (o factura simplificada, rectificativa o abono), con su número de factura. Los recibos bancarios o de domiciliación, justificantes de transferencia o de pago con tarjeta, albaranes, presupuestos, pedidos y extractos NO son facturas: no los pongas en facturas, sino en otros_documentos con sus páginas. Si son el pago de una factura, indica su número en factura_relacionada.",
    "- No dupliques una factura porque aparezca también su recibo o justificante de pago.",
    "- Si una factura tiene conceptos con distintos tipos de IVA (o partes exentas, no sujetas o suplidos), da una línea en tipos_iva por cada tipo, sin juntarlas."
  ].filter(Boolean).join("\n");

  const tool = { name: "guardar_facturas", description: "Guarda los datos extraídos de las facturas.", input_schema: SCHEMA };
  const base = {
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 8192,
    tools: [tool],
    messages: [{ role: "user", content: [block, { type: "text", text: instructions }] }]
  };
  let data;
  try {
    data = await callClaude({ ...base, tool_choice: { type: "tool", name: "guardar_facturas" } });
  } catch (error) {
    // Algunos modelos no admiten forzar la herramienta: se repite dejándolo elegir.
    if (error.status !== 400 || !/tool_choice|thinking/i.test(error.message)) throw error;
    data = await callClaude({ ...base, tool_choice: { type: "auto" } });
  }
  const use = (data.content || []).find(item => item.type === "tool_use" && item.name === "guardar_facturas");
  if (!use) { const e = new Error("El lector no ha devuelto datos de factura."); e.status = 502; throw e; }
  const facturas = await Promise.all((Array.isArray(use.input?.facturas) ? use.input.facturas : []).map(convertToEuros));
  const otros_documentos = (Array.isArray(use.input?.otros_documentos) ? use.input.otros_documentos : []).map(item => ({ tipo: String(item?.tipo || "otro"), paginas: String(item?.paginas || ""), fecha: String(item?.fecha || ""), descripcion: String(item?.descripcion || ""), factura_relacionada: String(item?.factura_relacionada || ""), importe: Number(item?.importe) || 0 }));
  return { facturas, otros_documentos, total_documento: Number(use.input?.total_documento) || 0, modelo: data.model || base.model };
}

// Facturas en otra moneda: se pasan a euros con el cambio que muestre la propia
// factura o, si no, con el tipo de referencia del BCE de la fecha de la factura.
const rateCache = new Map();
async function ecbRate(currency, date) {
  const key = `${currency}|${date}`;
  if (rateCache.has(key)) return rateCache.get(key);
  const urls = [
    `https://api.frankfurter.app/${date}?from=${currency}&to=EUR`,
    `https://api.frankfurter.dev/v1/${date}?base=${currency}&symbols=EUR`
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) continue;
      const data = await response.json();
      const rate = Number(data?.rates?.EUR);
      if (rate > 0) { const result = { rate, date: data.date || date }; rateCache.set(key, result); return result; }
    } catch {}
  }
  return null;
}
const round2 = value => Math.round(value * 100) / 100;
const isoDate = value => { const m = String(value || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };
const spanishDate = value => String(value).split("-").reverse().join("/");
const spanishNumber = (value, decimals = 2) => Number(value).toLocaleString("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

async function convertToEuros(factura) {
  const currency = String(factura.moneda || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency) || currency === "EUR") return factura;
  let rate = 0, source = "";
  const pair = factura.equivalente_eur || {};
  if (Number(pair.importe_original) > 0 && Number(pair.importe_eur) > 0) {
    rate = Number(pair.importe_eur) / Number(pair.importe_original);
    source = "según el importe en euros que indica la propia factura";
  } else {
    const date = isoDate(factura.fecha) || new Date().toISOString().slice(0, 10);
    const ecb = await ecbRate(currency, date);
    if (ecb) { rate = ecb.rate; source = `cambio de referencia del BCE del ${spanishDate(ecb.date)}`; }
  }
  if (!rate) return { ...factura, observaciones: [factura.observaciones, `Importes en ${currency}: no se ha podido obtener el cambio a euros, conviértelos a mano`].filter(Boolean).join(". ") };
  const total = Number(factura.total) || 0;
  const tipos = (factura.tipos_iva || []).map(t => ({ ...t, base: round2((Number(t.base) || 0) * rate), cuota: round2((Number(t.cuota) || 0) * rate) }));
  const recargo = round2((Number(factura.recargo_equivalencia) || 0) * rate), retencion = round2((Number(factura.retencion_importe) || 0) * rate);
  // El total en euros se ajusta para que cuadre con las bases y cuotas ya redondeadas.
  const sum = tipos.reduce((acc, t) => acc + t.base + t.cuota, 0) + recargo - retencion;
  const converted = round2(total * rate), totalEur = Math.abs(sum - converted) <= 0.02 * Math.max(1, tipos.length) ? round2(sum) : converted;
  const note = `Importes estimados en euros: ${spanishNumber(total)} ${currency} × ${spanishNumber(rate, 4)} (${source})`;
  return { ...factura, tipos_iva: tipos, recargo_equivalencia: recargo, retencion_importe: retencion, total: totalEur, moneda: "EUR", moneda_original: currency, observaciones: [note, factura.observaciones].filter(Boolean).join(". ") };
}

module.exports = { readInvoice, readerStatus, MAX_FILE_BYTES };
