/* Lectura de listados de facturas (CSV, Excel, ODS) que mandan algunos clientes: libros de IVA soportado o
   repercutido exportados de su programa. Las columnas cambian de un programa a otro, así que se buscan por su
   encabezado (fecha, nº de factura, proveedor o cliente, NIF, base, % IVA, cuota, total, retención…).
   Cada fila con fecha es una línea de factura; las filas de una misma factura (mismo número, NIF y fecha) se
   agrupan, una línea por tipo de IVA, como en el lector de PDF. Si no se reconocen las columnas, se lee con la IA. */
(function(){
  if(typeof processInvoiceFiles!=="function")return;
  const LISTADO=/\.(csv|xlsx?|ods)$/i;
  const norm=v=>String(v??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9%]+/g," ").trim();
  // [campo, expresión sobre el encabezado normalizado, puntuación]. Gana la columna con más puntos para cada campo.
  const CAMPOS=[
    ["fecha",/^f fact|^fecha (de )?(la )?(factura|fra|expedicion|emision|documento)$|^fecha fra$/,10],["fecha",/^fecha$/,6],["fecha",/^fecha(?!.*(registro|contab|asiento|venc|pago|cobro|operacion|valor))/,3],
    ["numero",/(^| )(num|n|no|numero|n o) (de )?(factura|fra|documento)$|^n?factura n?$|^(n|num|numero) fra$|^factura (num|n|numero|no)$/,10],["numero",/^factura$/,8],["numero",/^(numero|num|documento|referencia|n documento|serie numero)$/,4],
    ["nombre",/proveedor|acreedor/,10],["nombre",/^cliente$|^(nombre|razon social)( cliente| proveedor)?$/,9],["nombre",/razon social|^cuenta nombre$|nombre/,7],["nombre",/emisor|tercero|destinatario/,6],
    ["nif",/^(nif|cif|dni|n i f|c i f|nif cif|cif nif|nif dni|nif cif dni)( proveedor| cliente| emisor)?$/,10],["nif",/(^| )(nif|cif)( |$)(?!.*represent)/,6],
    ["base",/^(base|base imponible|base iva|importe base|b imponible|base imp)$/,10],["base",/base(?!.*(irpf|retenc|ret ))/,6],["base",/^(neto|importe neto)$/,5],
    ["tipo",/^(% iva|iva %|tipo iva|tipo de iva|% i v a|tipo|% tipo|porcentaje iva|tipo impositivo|%)$/,10],
    ["cuota",/^(iva|cuota|cuota iva|importe iva|cuota de iva|iva soportado|iva repercutido|i v a|cuota soportada|cuota repercutida)$/,10],["cuota",/(cuota|importe) (de )?iva/,8],
    ["total",/^total( factura| operacion| documento| fra)?$/,10],["total",/importe total|total a pagar|total importe|liquido/,9],["total",/total(?!.*(irpf|iva|base|recargo|retenc))/,4],
    ["pctRet",/^% ?(irpf|retencion|ret)$|^(tipo|porcentaje) (irpf|retencion)$/,10],
    ["ret",/^(irpf|retencion|importe retencion|cuota irpf|importe irpf|retenciones)$/,10],
    ["recargo",/^(recargo|cuota recargo|importe recargo|recargo equivalencia|re)$/,10],
    // Listados en inglés.
    ["fecha",/^(invoice date|issue date|date of issue)$/,10],["fecha",/^date$/,6],
    ["numero",/^(invoice (number|no|n|num|#|id)|invoice)$/,10],
    ["nombre",/^(supplier|vendor|seller|customer|client)( name)?$|^(company|name)$/,9],
    ["nif",/^(vat (id|number|no|reg no)|tax id|tin|vat registration number)$/,10],
    ["base",/^(net|net amount|taxable (amount|base)|subtotal|amount excl(uding)? vat)$/,10],
    ["tipo",/^(vat %|vat rate|tax rate|tax %|rate)$/,10],
    ["cuota",/^(vat|vat amount|tax|tax amount)$/,10],
    ["total",/^(total|total amount|gross|gross amount|amount incl(uding)? vat|invoice total)$/,10],
    ["pais",/^(pais|country)/,5],
    ["registro",/^(registro|n registro|num registro|numero registro|asiento|n asiento|orden|n orden|apunte|id)$/,10]
  ];
  const IMPRESCINDIBLES=["fecha","nombre","base","cuota","total"];
  function columnas(cabecera){
    const opciones=[];
    cabecera.forEach((celda,col)=>{const h=norm(celda);if(!h)return;for(const [campo,re,puntos] of CAMPOS)if(re.test(h))opciones.push({campo,col,puntos})});
    opciones.sort((a,b)=>b.puntos-a.puntos||a.col-b.col);
    const mapa={},usadas=new Set();
    for(const o of opciones){if(o.campo in mapa||usadas.has(o.col))continue;mapa[o.campo]=o.col;usadas.add(o.col)}
    return mapa;
  }
  // Fila de encabezados: la primera (de las 40 primeras) que tiene fecha y base o total, con más campos reconocidos.
  function encabezado(filas){
    let mejor=null;
    filas.slice(0,40).forEach((fila,i)=>{const mapa=columnas(fila),n=Object.keys(mapa).length;
      if(!("fecha" in mapa)||!("base" in mapa||"total" in mapa)||!("nombre" in mapa||"nif" in mapa))return;
      if(!mejor||n>mejor.n)mejor={i,mapa,n}});
    return mejor;
  }

  // Importes: «1.200,78», «1,200.78», «1200.78», «-35,44» o un número de Excel.
  function importe(v){
    if(typeof v==="number")return Number.isFinite(v)?v:0;
    let t=String(v??"").trim().replace(/[€\s]/g,"");if(!t)return 0;
    let negativo=false;if(/^\(.*\)$/.test(t)){negativo=true;t=t.slice(1,-1)}
    const coma=t.lastIndexOf(","),punto=t.lastIndexOf(".");
    if(coma>=0&&punto>=0)t=coma>punto?t.replace(/\./g,"").replace(",","."):t.replace(/,/g,"");
    else if(coma>=0)t=t.replace(/\./g,"").replace(",",".");
    else if(/^-?\d{1,3}(\.\d{3})+$/.test(t))t=t.replace(/\./g,"");
    const n=Number(t.replace(/[^\d.\-]/g,""));return Number.isFinite(n)?(negativo?-n:n):0;
  }
  const dos=n=>(Math.round(n*100)/100).toFixed(2);
  function fecha(v){
    if(v instanceof Date&&!isNaN(v))return `${String(v.getDate()).padStart(2,"0")}/${String(v.getMonth()+1).padStart(2,"0")}/${v.getFullYear()}`;
    if(typeof v==="number"&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}/${d.getUTCFullYear()}`}
    const t=String(v??"").trim();let m=t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);if(m)return `${m[3].padStart(2,"0")}/${m[2].padStart(2,"0")}/${m[1]}`;
    m=t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})\b/);if(m&&Number(m[2])<=12)return `${m[1].padStart(2,"0")}/${m[2].padStart(2,"0")}/${m[3].length===2?"20"+m[3]:m[3]}`;
    return "";
  }
  const nif=v=>{const n=String(v??"").toUpperCase().replace(/[\s.\-\/]/g,"").replace(/^ES(?=[A-Z0-9]{9}$)/,"");return /^\d+$/.test(n)?"":n};
  const TIPOS=[0,4,5,7.5,10,21];
  const tipoDe=(base,cuota)=>{if(!base||!cuota)return 0;const r=cuota/base*100;const t=TIPOS.reduce((a,b)=>Math.abs(b-r)<Math.abs(a-r)?b:a);return Math.abs(t-r)<0.6?t:Math.round(r*100)/100};

  // Texto del CSV: UTF-8 si es válido; si no, Windows-1252 (lo habitual al exportar desde programas de Windows).
  async function textoCsv(file){
    const bytes=await file.arrayBuffer();
    try{return new TextDecoder("utf-8",{fatal:true}).decode(bytes).replace(/^﻿/,"")}catch{return new TextDecoder("windows-1252").decode(bytes)}
  }
  function parseCsv(texto){
    const muestra=texto.split(/\r?\n/).slice(0,20).join("\n"),cuenta=c=>muestra.split(c).length;
    const sep=[";","\t",",","|"].reduce((a,b)=>cuenta(b)>cuenta(a)?b:a);
    const filas=[];let fila=[],celda="",comillas=false;
    for(let i=0;i<texto.length;i++){const c=texto[i];
      if(comillas){if(c==='"'){if(texto[i+1]==='"'){celda+='"';i++}else comillas=false}else celda+=c;continue}
      if(c==='"'&&!celda)comillas=true;else if(c===sep){fila.push(celda);celda=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&texto[i+1]==="\n")i++;fila.push(celda);filas.push(fila);fila=[];celda=""}else celda+=c}
    if(celda||fila.length){fila.push(celda);filas.push(fila)}
    return filas;
  }
  async function cargarXlsx(){
    if(window.XLSX)return window.XLSX;
    await new Promise((ok,ko)=>{const s=document.createElement("script");s.src="/vendor/xlsx.full.min.js?v=0.18.5";s.onload=ok;s.onerror=()=>ko(new Error("no se ha podido cargar el lector de Excel"));document.head.append(s)});
    return window.XLSX;
  }
  // Todas las hojas con datos; se usa la primera en la que se encuentran los encabezados.
  async function hojas(file){
    if(/\.csv$/i.test(file.name))return[parseCsv(await textoCsv(file))];
    const XLSX=await cargarXlsx(),libro=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
    return libro.SheetNames.map(n=>XLSX.utils.sheet_to_json(libro.Sheets[n],{header:1,raw:true,defval:""}));
  }

  function registros(filas,cab,file,client){
    const m=cab.mapa,celda=(fila,campo)=>campo in m?fila[m[campo]]:"",emitida=invoiceProcessorType()==="emitidas";
    const facturas=new Map();let ultima=null;
    for(const fila of filas.slice(cab.i+1)){
      const f=fecha(celda(fila,"fecha"));if(!f)continue;
      const numero=String(celda(fila,"numero")??"").trim(),nombre=String(celda(fila,"nombre")??"").trim().replace(/^\d{6,12}\s*[-–]?\s+/,""),id=nif(celda(fila,"nif"));
      const base=importe(celda(fila,"base")),cuota=importe(celda(fila,"cuota")),recargo=importe(celda(fila,"recargo")),ret=Math.abs(importe(celda(fila,"ret")));
      let tipo="tipo" in m&&String(celda(fila,"tipo")).trim()!==""?importe(celda(fila,"tipo")):tipoDe(base,cuota);
      const total=importe(celda(fila,"total"));
      // Una factura son filas seguidas con el mismo registro (si lo hay), fecha, número y NIF; si se repite un tipo
      // de IVA ya visto, es otra factura (números iguales por culpa de Excel, p. ej. «2,03E+12»).
      const registro=String(celda(fila,"registro")??"").trim();
      let clave=[registro,f,numero.toUpperCase(),id||nombre.toUpperCase()].join("|");
      const previa=ultima&&ultima.clave===clave&&!(base||cuota?ultima.fac.lineas.some(l=>l.tipo===tipo&&(l.base||l.cuota)):false)?ultima:null;
      if(!previa)clave+=`#${facturas.size}`;else clave=previa.key;
      if(!facturas.has(clave))facturas.set(clave,{fecha:f,numero,nombre,nif:id,pais:String(celda(fila,"pais")??"").trim().toUpperCase().slice(0,2),lineas:[],ret:0,pctRet:0,recargo:0});
      const fac=facturas.get(clave);ultima={clave:[registro,f,numero.toUpperCase(),id||nombre.toUpperCase()].join("|"),key:clave,fac};if(!fac.nombre&&nombre)fac.nombre=nombre;if(!fac.nif&&id)fac.nif=id;
      if(ret){fac.ret+=ret;fac.pctRet=fac.pctRet||Math.abs(importe(celda(fila,"pctRet")))}
      fac.recargo+=recargo;
      if(base||cuota)fac.lineas.push({base,tipo,cuota,total:total||base+cuota+recargo});
      else if(total&&!ret)fac.lineas.push({base:total,tipo:0,cuota:0,total});
    }
    const salida=[];let orden=0;
    for(const fac of facturas.values()){
      if(!fac.lineas.length)continue;
      const comun=[];
      if(/^\d+([.,]\d+)?e\+?\d+$/i.test(fac.numero))comun.push(`El nº de factura viene en notación científica (${fac.numero}) porque el listado pasó por Excel: corrígelo con la factura`);
      if(!fac.numero)comun.push("El listado no trae el nº de factura");
      if(!fac.nif)comun.push(`El listado no trae el NIF del ${emitida?"cliente":"proveedor"}`);
      if(fac.recargo)comun.push(`Recargo de equivalencia ${dos(fac.recargo)}`);
      if(fac.ret)comun.push(`Retención IRPF ${fac.pctRet?fac.pctRet+"% ":""}${dos(fac.ret)}`);
      const cab={client,number:fac.numero,date:fac.fecha,supplier:fac.nombre,supplierNif:fac.nif,supplierCountry:fac.pais&&fac.pais!=="ES"&&/^[A-Z]{2}$/.test(fac.pais)?fac.pais:"",file:file.name,pages:"",group:`${file.name}#${orden++}`,listing:true,concept:""};
      const retencion=fac.ret?{retentionRate:fac.pctRet?String(fac.pctRet):"",retention:dos(fac.ret)}:{};
      fac.lineas.forEach((l,k)=>{
        const notas=[`Del listado ${file.name}`];
        if(fac.lineas.length>1)notas.push(`Línea ${k+1} de ${fac.lineas.length} (IVA ${l.tipo}%)`);
        salida.push({...cab,...(k===0?retencion:{}),base:dos(l.base),vatRate:String(l.tipo),vat:dos(l.cuota),total:dos(l.total),observation:[...notas,...comun].join(". ")});
      });
    }
    return salida;
  }

  async function leerListado(file,client){
    const todas=await hojas(file);
    for(const filas of todas){const cab=encabezado(filas);if(cab){const r=registros(filas,cab,file,client);if(r.length)return{filas:r,faltan:IMPRESCINDIBLES.filter(c=>!(c in cab.mapa))}}}
    return null;
  }
  const ETIQUETA={fecha:"fecha",nombre:"proveedor o cliente",base:"base",cuota:"IVA",total:"total"};

  const anterior=processInvoiceFiles;
  processInvoiceFiles=async function(client){
    const listados=invoiceProcessorFiles.filter(f=>LISTADO.test(f.name));
    if(!client||!listados.length)return anterior.apply(this,arguments);
    const status=document.querySelector("#invoiceProcessStatus"),button=document.querySelector("#processInvoices");
    const todos=[...invoiceProcessorFiles],resto=todos.filter(f=>!LISTADO.test(f.name)),filas=[],avisos=[],sinLeer=[];
    button.disabled=true;status.textContent=`Leyendo ${listados.length===1?"el listado":`${listados.length} listados`} de facturas…`;
    for(const file of listados){
      try{const r=await leerListado(file,client);
        if(r){filas.push(...r.filas);if(r.faltan.length)avisos.push(`${file.name}: no tiene columna de ${r.faltan.map(c=>ETIQUETA[c]).join(", ")}`)}
        else sinLeer.push(file)}
      catch(error){console.error("Listado de facturas",file.name,error);avisos.push(`${file.name}: ${error.message}`)}
    }
    // Sin encabezados reconocibles: el CSV se pasa como texto a la IA (o al lector anterior).
    for(const file of sinLeer){
      if(/\.csv$/i.test(file.name))resto.push(new File([await textoCsv(file)],file.name.replace(/\.csv$/i,".txt"),{type:"text/plain"}));
      else avisos.push(`${file.name}: no se han encontrado las columnas de fecha, proveedor e importes`);
    }
    let otros=[];
    if(resto.length){invoiceProcessorFiles=resto;try{await anterior.call(this,client)}finally{otros=invoiceDraftRecords||[];invoiceProcessorFiles=todos}}
    const records=[...otros,...filas];
    sortInvoiceRecords(records);invoiceDraftRecords=records;renderInvoiceDraft(records);
    const n=new Set(filas.map(r=>r.group)).size;
    status.textContent=[`${n} ${n===1?"factura leída":"facturas leídas"} del listado${filas.length>n?` (${filas.length} líneas, una por tipo de IVA)`:""}${otros.length?` y ${new Set(otros.map(r=>r.group||r.file)).size} de los demás archivos`:""}. Revisa las observaciones antes de confirmar.`,...avisos].join(" ");
    button.disabled=false;button.textContent="Volver a leer facturas";
  };

  // Al confirmar, el listado se guarda una sola vez en cada trimestre (no una copia por factura) y el libro de
  // facturas apunta a él.
  if(typeof saveInvoiceDocuments==="function"){const guardar=saveInvoiceDocuments;saveInvoiceDocuments=async function(groups,client,kind){
    const del=groups.filter(g=>g.record?.listing);if(!del.length)return guardar.apply(this,arguments);
    const normales=groups.filter(g=>!g.record?.listing),res=normales.length?await guardar.call(this,normales,client,kind):{saved:[],errors:[]};
    const copias=new Map();
    for(const g of del){const d=invoiceDateParts(g.record.date),k=`${g.record.file}|${d?.year}/${d?.quarter}`;
      if(!copias.has(k))copias.set(k,{key:`listado:${k}`,record:g.record,records:[g.record],receipt:null,fileName:g.record.file.replace(/\.[^.]+$/,""),datePrefix:false,miembros:[]});copias.get(k).miembros.push(g)}
    const r2=await guardar.call(this,[...copias.values()],client,kind);
    for(const c of copias.values()){const ruta=invoiceConfirmProgress.saved.get(c.key);if(ruta)c.miembros.forEach(g=>invoiceConfirmProgress.saved.set(g.key,ruta))}
    return{saved:[...res.saved,...del.map(g=>invoiceConfirmProgress.saved.get(g.key)).filter(Boolean)],errors:[...res.errors,...r2.errors]};
  }}
  window.amListadoFacturas={leerListado,encabezado,importe,fecha};
})();
