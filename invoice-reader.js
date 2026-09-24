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
      description: "Una entrada por cada factura del documento. Normalmente una sola.",
      items: {
        type: "object",
        properties: {
          numero: { type: "string", description: "Número o serie+número de la factura, tal como aparece." },
          paginas: { type: "string", description: "Páginas del documento donde aparece esta factura (p. ej. \"1-2\" o \"3\")." },
          fecha: { type: "string", description: "Fecha de expedición en formato DD/MM/AAAA. Vacío si no aparece." },
          emisor_nombre: { type: "string", description: "Razón social o nombre de quien emite la factura (el proveedor)." },
          emisor_nif: { type: "string", description: "NIF/CIF/VAT del emisor, sin espacios ni guiones." },
          receptor_nombre: { type: "string", description: "Nombre de quien recibe la factura." },
          receptor_nif: { type: "string", description: "NIF/CIF/VAT del receptor, sin espacios ni guiones." },
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
          moneda: { type: "string", description: "Código de moneda, normalmente EUR." },
          rectificativa: { type: "boolean", description: "true si es una factura rectificativa o abono." },
          observaciones: { type: "string", description: "Avisos breves en español solo si hay algo que revisar (datos ilegibles, importes que no cuadran, no es una factura…). Vacío si todo está bien." }
        },
        required: ["numero", "fecha", "emisor_nombre", "emisor_nif", "tipos_iva", "total"]
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

async function readInvoice(buffer, name, contentType, client) {
  if (!process.env.ANTHROPIC_API_KEY) { const e = new Error("Falta la clave ANTHROPIC_API_KEY en el servidor."); e.status = 503; throw e; }
  if (!buffer.length) { const e = new Error("El archivo está vacío."); e.status = 400; throw e; }
  if (buffer.length > MAX_FILE_BYTES) { const e = new Error("El archivo supera los 25 MB."); e.status = 413; throw e; }
  const block = fileBlock(buffer, name, contentType);
  if (!block) { const e = new Error("Formato no admitido por el lector con IA."); e.status = 415; throw e; }

  const instructions = [
    "Eres un asistente de una asesoría fiscal española. Extrae los datos de la factura adjunta y devuélvelos con la herramienta guardar_facturas.",
    client ? `La documentación pertenece al cliente del despacho "${client}". Normalmente es el receptor (factura recibida); si es el emisor, indícalo en observaciones.` : "",
    `Nombre del archivo: ${name}`,
    "Reglas:",
    "- Copia el número de factura, nombres y NIF exactamente como aparecen.",
    "- Importes como números con punto decimal (1234.56), sin símbolo de moneda.",
    "- Desglosa cada tipo de IVA por separado. Los suplidos o conceptos no sujetos van con tipo 0.",
    "- La retención de IRPF resta del total; el recargo de equivalencia suma.",
    "- Comprueba que suma de bases + cuotas + recargo − retención = total. Si no cuadra, dilo en observaciones.",
    "- No inventes datos: si algo no aparece o no se lee, déjalo vacío (o 0) y avísalo en observaciones.",
    "- Revisa TODAS las páginas. Los recibos de suministros (luz, gas, agua, teléfono) suelen incluir varias facturas en el mismo PDF: la del suministro y otras de servicios (mantenimiento, alquiler de equipos…), a veces de meses distintos.",
    "- Cada número de factura distinto es una factura distinta: devuelve una entrada por cada una, con su propio número, fecha, desglose y total, aunque tengan los mismos importes.",
    "- Un bloque de \"resumen total\" o \"total a pagar\" que suma varias facturas NO es una factura: su importe va en total_documento.",
    "- No mezcles importes de una factura con otra. Los totales de la primera página (\"Fijo\", \"Variable\", \"Impuestos\"…) son un resumen; usa el detalle de cada factura.",
    "- Impuestos especiales (hidrocarburos, electricidad), alquileres de equipos y cánones forman parte de la base imponible cuando el IVA se calcula sobre ellos.",
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
  const facturas = Array.isArray(use.input?.facturas) ? use.input.facturas : [];
  return { facturas, total_documento: Number(use.input?.total_documento) || 0, modelo: data.model || base.model };
}

module.exports = { readInvoice, readerStatus, MAX_FILE_BYTES };
