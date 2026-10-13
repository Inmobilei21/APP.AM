/* Modelo 303 (IVA) en Borradores. De momento se rellena a mano (sin enlazar con la contabilidad). Al desplegar el
   trimestre, unos botones arriba abren cada página del modelo: identificación, IVA devengado, IVA deducible,
   información adicional, resultado y forma de pago. Los totales se calculan solos; las cuotas se proponen con el
   tipo de cada casilla y se pueden cambiar. Fichero AEAT según el diseño de registro DR303 (ejercicio 2026):
   páginas 01, 03 y DID (cuenta de domiciliación o devolución). Se carga después de borradores.js. */
(function(){
if(typeof TAX_DRAFT_BUILDERS==="undefined"||typeof TAX_DRAFT_MODELS==="undefined")return;
const M="303";
TAX_DRAFT_MODELS[M]={title:"IVA · autoliquidación",ready:true};
const num=v=>{if(typeof v==="number")return Number.isFinite(v)?v:0;const s=String(v??"").trim();if(!s)return 0;const n=Number(s.includes(",")||/^-?\d{1,3}(\.\d{3})+$/.test(s)?s.replace(/\./g,"").replace(",","."):s);return Number.isFinite(n)?n:0};
const has=v=>v!==undefined&&v!==null&&String(v).trim()!=="";
const inputValue=v=>{if(!has(v))return"";const n=num(v),[i,d]=Math.abs(n).toFixed(2).split(".");return(n<0?"-":"")+i.replace(/\B(?=(\d{3})+(?!\d))/g,".")+","+d};
// Marcas de identificación: las de la ficha del cliente (Datos fiscales del IVA); lo cambiado en el borrador manda.
const fichaIva=()=>{const iva=taxDrafts.clientData?.iva||{},out={};["redeme","soloRS","caja","destCaja","sii","exonerado"].forEach(k=>{if(iva[k]!==undefined)out[k]=Boolean(iva[k])});
  if(iva.clave)out.exClave=iva.clave;if(iva.epigrafe)out.exEpigrafe=iva.epigrafe;if(taxDrafts.clientData?.obligations?.["347"])out.exD347=true;return out};
const st=period=>{const m=taxDraftControl(M,period).m303||{};m.v=m.v||{};m.f={...fichaIva(),...(m.f||{})};if(period!=="4T")delete m.f.exonerado;return m};
function save(period,change){
  const year=taxDraftYear(),key=declarationKey(M,period,taxDrafts.client,year),data=declarationData(M,period,taxDrafts.client,year);
  const m={v:{},f:{},...(data.m303||{})};m.v={...m.v};m.f={...m.f};change(m);data.m303=m;localStorage.setItem(key,JSON.stringify(data));
}

/* --- Casillas --- */
// IVA devengado: [etiqueta, base, casilla del tipo, cuota, tipo fijo (o null si se escribe), con signo]
const DEV=[
  ["Régimen general","150","151","152",null],["","165","166","167",null],["","01","02","03",4],["","153","154","155",null],["","04","05","06",10],["","07","08","09",21],
  ["Adquisiciones intracomunitarias de bienes y servicios","10",null,"11",null],
  ["Otras operaciones con inversión del sujeto pasivo (excepto adq. intracom.)","12",null,"13",null],
  ["Modificación bases y cuotas","14",null,"15",null,true],
  ["Recargo de equivalencia","156","157","158",1.75],["","168","169","170",0.5],["","16","17","18",null],["","19","20","21",1.4],["","22","23","24",5.2],
  ["Modificaciones bases y cuotas del recargo de equivalencia","25",null,"26",null,true]];
const DED=[["Por cuotas soportadas en operaciones interiores corrientes","28","29"],["Por cuotas soportadas en operaciones interiores con bienes de inversión","30","31"],
  ["Por cuotas soportadas en las importaciones de bienes corrientes","32","33"],["Por cuotas soportadas en las importaciones de bienes de inversión","34","35"],
  ["En adquisiciones intracomunitarias de bienes y servicios corrientes","36","37"],["En adquisiciones intracomunitarias de bienes de inversión","38","39"],
  ["Rectificación de deducciones","40","41",true],["Compensaciones Régimen Especial A.G. y P.",null,"42",true],["Regularización bienes de inversión",null,"43",true],["Regularización por aplicación del porcentaje definitivo de prorrata",null,"44",true]];
const INFO=[["Entregas intracomunitarias de bienes y servicios","59"],["Exportaciones y operaciones asimiladas","60"],["Operaciones no sujetas por reglas de localización (excepto las incluidas en la casilla 123)","120"],
  ["Operaciones sujetas con inversión del sujeto pasivo","122"],["Operaciones no sujetas por reglas de localización acogidas a los regímenes especiales de ventanilla única","123"],["Operaciones sujetas y acogidas a los regímenes especiales de ventanilla única","124"]];
const FLAGS=[["redeme","Sujeto pasivo inscrito en el Registro de devolución mensual (art. 30 RIVA)"],["simplificado","Sujeto pasivo que tributa también en régimen simplificado"],["conjunta","Autoliquidación conjunta"],
  ["caja","Sujeto pasivo acogido al régimen especial del criterio de caja (art. 163 undecies LIVA)"],["destCaja","Sujeto pasivo destinatario de operaciones acogidas al régimen especial del criterio de caja"],
  ["sii","Sujeto pasivo acogido voluntariamente al SII"],["concurso","Sujeto pasivo declarado en concurso de acreedores en el presente período"]];
const FLAGS_4T=[["prorrata","Opción por la aplicación de la prorrata especial (art. 103.Dos.1º LIVA)"],["revocacion","Revocación de la opción por la aplicación de la prorrata especial"],["exonerado","Sujeto pasivo exonerado de la Declaración-resumen anual del IVA, modelo 390"],["volumen","Sujeto pasivo con volumen anual de operaciones distinto de cero (art. 121 LIVA)"]];
// Tipos de declaración según el signo del resultado [71] (mismas opciones que la sede) y su letra en el fichero.
const TIPOS_INGRESO=[["I","A ingresar","I"],["U","Domiciliación del importe a ingresar","U"],["RD-IMP","Reconocimiento de deuda con imposibilidad de pago","I"],["RD-APL","Reconocimiento de deuda con solicitud de aplazamiento","I"],
  ["RD-COM","Reconocimiento de deuda con solicitud de compensación","I"],["RD-PHE","Reconocimiento de deuda con solicitud de pago mediante entrega de bienes del Patrimonio Histórico Español","I"],["RD-TRF","Reconocimiento de deuda y pago por transferencia","I"],
  ["IP","Ingresos parciales","I"],["IP-IMP","Ingreso parcial y reconocimiento de deuda con imposibilidad de pago","I"],["IP-APL","Ingreso parcial y reconocimiento de deuda con solicitud de aplazamiento","I"],
  ["IP-COM","Ingreso y reconocimiento de deuda con solicitud de compensación","I"],["IP-PHE","Ingreso parcial y reconocimiento de deuda con solicitud de pago mediante entrega de bienes del Patrimonio Histórico Español","I"],["G","Ingreso a anotar en cuenta corriente tributaria","G"]];
const TIPOS_NEG=[["C","A compensar","C"],["D","Devolución por transferencia (cuenta en España)","D"],["X","Devolución por transferencia al extranjero","X"],["V","Devolución a anotar en cuenta corriente tributaria","V"]];
const TIPOS_CERO=[["N","Sin actividad / resultado cero","N"]];
const CONTROL_PAGO={U:"Domicil.",I:"N.R.C.",IP:"N.R.C.","RD-APL":"Aplaz.","IP-APL":"Aplaz.","RD-COM":"Compensación","IP-COM":"Compensación",G:"Compensación","RD-IMP":"Pte. Pago","IP-IMP":"Pte. Pago","RD-TRF":"Pte. Pago","RD-PHE":"Pte. Pago","IP-PHE":"Pte. Pago",C:"Compensación",D:"Devolver",X:"Devolver",V:"Devolver",N:"Negativa"};
function clientIbans(){const bank=taxDrafts.clientData?.bank||{},list=(bank.ibans||[]).map(i=>String(i).replace(/\s+/g,"").toUpperCase()).filter(Boolean),pref=String(bank.ibanPreferido||"").replace(/\s+/g,"").toUpperCase();
  return{list:pref&&list.includes(pref)?[pref,...list.filter(i=>i!==pref)]:list,pref:list.includes(pref)?pref:""}}

/* --- IVA devengado desde la contabilidad (facturas emitidas de AMCOMTA) o, si no hay, desde las facturas guardadas --- */
const libros={key:"",data:null,loading:""};
window.addEventListener("app-am-libros",()=>{libros.key="";libros.data=null});
function libro(){
  if(!taxDrafts.client)return null;const key=`${taxDrafts.client}|${taxDraftYear()}`;if(libros.key===key)return libros.data;
  if(libros.loading!==key){libros.loading=key;apiJson(`/api/libros?client=${encodeURIComponent(taxDrafts.client)}&year=${taxDraftYear()}`).catch(()=>({emitidas:[],recibidas:[]}))
    .then(data=>{if(libros.loading!==key)return;libros.key=key;libros.data=data;libros.loading="";if(taxDrafts.model===M)renderTaxDraftMain()})}
  return null;
}
function ivaLines(q){
  const year=String(taxDraftYear()),inQ=fecha=>String(fecha).slice(0,4)===year&&Math.ceil(Number(String(fecha).slice(5,7))/3)===q;
  const base=taxDrafts.base;
  if(base&&!base.manual&&Array.isArray(base.ivaEmitidas))return{fuente:"contabilidad",lines:base.ivaEmitidas.filter(x=>inQ(x[0])).map(([fecha,numero,nombre,b,tipo,cuota,recTipo,recargo,auto])=>({fecha,numero,nombre,base:b,tipo,cuota,recTipo,recargo,autofactura:auto===1}))};
  const book=libro();
  if(book?.emitidas?.length)return{fuente:"facturas",lines:book.emitidas.filter(x=>inQ(x.fecha)).flatMap(x=>(x.lineas?.length?x.lineas:[{base:x.base,tipo:0,cuota:x.cuota}]).map(l=>({fecha:x.fecha,numero:x.numero,nombre:x.nombre,base:l.base,tipo:l.tipo,cuota:l.cuota,recTipo:0,recargo:0,ruta:x.ruta||"",archivo:x.archivo||""})))};
  return{fuente:"manual",lines:[]};
}
// Reparte las líneas en las casillas: bases positivas por tipo (4, 10 y 21 %, y los demás tipos en 150, 165 y 153);
// todas las bases negativas, sea cual sea el tipo, en 14 y 15 (y las del recargo en 25 y 26). Las del 0 % no van.
const FIXED={4:["01","03"],10:["04","06"],21:["07","09"]},OTHER=[["150","151","152"],["165","166","167"],["153","154","155"]];
const RECARGO={5.2:["22","24"],1.4:["19","21"],0.5:["168","170"],1.75:["156","158"]};
function ivaAuto(lines){
  const auto={},add=(n,v)=>{auto[n]=tdRound((auto[n]||0)+v)},slot={},cero=[];
  const others=[...new Set(lines.filter(l=>l.base>0&&l.tipo&&!FIXED[l.tipo]).map(l=>l.tipo))].sort((a,b)=>a-b);
  others.forEach((tipo,i)=>{const g=OTHER[Math.min(i,OTHER.length-1)];auto[g[1]]=tipo});
  for(const l of lines){
    if(l.base<0){add("14",l.base);add("15",l.cuota);l.casilla="14";if(l.recargo){add("25",l.base);add("26",l.recargo)}continue}
    // Autofacturas de adquisiciones intracomunitarias: IVA devengado en 10 y 11.
    if(l.autofactura){add("10",l.base);add("11",l.cuota);l.casilla="10";continue}
    if(!l.tipo){cero.push(l);l.casilla="0 %";continue}
    const g=FIXED[l.tipo]||OTHER[Math.min(others.indexOf(l.tipo),OTHER.length-1)].filter((_,i)=>i!==1);
    add(g[0],l.base);add(g[1],l.cuota);l.casilla=g[0];
    if(l.recargo){const rg=RECARGO[l.recTipo]||["16","18"];if(!RECARGO[l.recTipo])auto["17"]=l.recTipo;add(rg[0],l.base);add(rg[1],l.recargo);l.casilla+=` · ${rg[0]}`}
  }
  return{auto,cero};
}

/* --- IVA deducible desde las facturas recibidas --- */
const EU_CODES=new Set(["AT","BE","BG","CY","CZ","DE","DK","EE","EL","GR","FI","FR","HR","HU","IE","IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK","XI"]);
const euOf=(pais,nif)=>{const p=String(pais||"").toUpperCase();if(EU_CODES.has(p))return p;const n=String(nif||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,2);return EU_CODES.has(n)?n:""};
function ivaRecLines(q,autofacturas){
  const year=String(taxDraftYear()),inQ=fecha=>String(fecha).slice(0,4)===year&&Math.ceil(Number(String(fecha).slice(5,7))/3)===q;
  const base=taxDrafts.base;
  if(base&&!base.manual&&Array.isArray(base.ivaRecibidas))return{fuente:"contabilidad",lines:base.ivaRecibidas.filter(x=>inQ(x[0])).map(([fecha,numero,nombre,nif,b,tipo,cuota,inv,noDed,pais])=>{
    // Intracomunitaria: proveedor de otro país de la UE sin IVA en la factura (o con autofactura en el trimestre).
    const eu=euOf(pais,nif);return{fecha,numero,nombre,nif,base:b,tipo,cuota,inversion:inv===1,noDed:noDed||0,intra:Boolean(eu)&&(!cuota||autofacturas)}})};
  const book=libro();
  if(book?.recibidas?.length)return{fuente:"facturas",lines:book.recibidas.filter(x=>inQ(x.fecha)).flatMap(x=>(x.lineas?.length?x.lineas:[{base:x.base,tipo:0,cuota:x.cuota}]).map(l=>({fecha:x.fecha,numero:x.numero,nombre:x.nombre,nif:x.nif,base:l.base,tipo:l.tipo,cuota:l.cuota,inversion:false,noDed:0,intra:x.intracom===true,ruta:x.ruta||"",archivo:x.archivo||""})))};
  return{fuente:"manual",lines:[]};
}
// Interiores corrientes 28/29, bienes de inversión 30/31, intracomunitarias 36/37 (38/39 inversión) y abonos 40/41.
// Las intracomunitarias sin cuota se calculan al 21 % y generan también el IVA devengado 10/11 (autorepercusión).
// Tipo de operación elegido a mano para cada línea de factura recibida (desplegable del panel de IVA deducible).
// «–» = lo que dice la contabilidad. Las autorrepercutidas (intracomunitarias e inversión del sujeto pasivo) llevan también
// su IVA devengado (10/11 o 12/13) y las importaciones con IVA diferido, la casilla 77.
const OPS=[["","–"],["int","Interior · bienes y servicios corrientes (28)"],["inv","Interior · bien de inversión (30)"],["imp","Importación · bienes corrientes (32)"],["impi","Importación · bienes de inversión (34)"],
  ["impd","Importación con IVA diferido · corrientes (32 + 77)"],["impdi","Importación con IVA diferido · bienes de inversión (34 + 77)"],["aib","Intracomunitaria · bienes corrientes (36 + 10)"],["ais","Intracomunitaria · servicios (36 + 10)"],
  ["aibi","Intracomunitaria · bienes de inversión (38 + 10)"],["isp","Inversión del sujeto pasivo (28 + 12)"],["nd","IVA no deducible (fuera del 303)"]];
const lineKey=l=>[l.fecha,l.numero,l.nif,tdRound(l.base),l.tipo,tdRound(l.cuota)].join("|");
function dedAuto(lines,withDev,cls={}){
  const auto={},add=(n,v)=>{auto[n]=tdRound((auto[n]||0)+v)},cero=[];
  for(const l of lines){
    l.key=lineKey(l);const t=OPS.some(o=>o[0]&&o[0]===cls[l.key])?cls[l.key]:"";l.cls=t;l.dua=false;l.servicios=false;
    const deducible=tdRound(l.cuota-(l.noDed||0)),self=()=>{const c=l.cuota||tdRound(l.base*(l.tipo||21)/100);l.cuotaCalc=!l.cuota;return c};
    if(t==="nd"){l.casilla="No deducible";continue}
    if(t==="int"||t==="inv"){const g=t==="inv"?["30","31"]:["28","29"];l.intra=false;add(g[0],l.base);add(g[1],deducible);l.casilla=g[0];continue}
    if(["imp","impi","impd","impdi"].includes(t)){const g=t==="imp"||t==="impd"?["32","33"]:["34","35"];l.intra=false;l.dua=true;add(g[0],l.base);add(g[1],deducible);if(t==="impd"||t==="impdi")add("c77",deducible);l.casilla=g[0]+(t==="impd"||t==="impdi"?" · 77":"");continue}
    if(t==="aib"||t==="ais"||t==="aibi"){const c=self(),g=t==="aibi"?["38","39"]:["36","37"];l.intra=true;l.servicios=t==="ais";add(g[0],l.base);add(g[1],c);l.casilla=g[0];if(withDev){add("dev10",l.base);add("dev11",c)}continue}
    if(t==="isp"){const c=self(),g=l.inversion?["30","31"]:["28","29"];l.intra=false;add("dev12",l.base);add("dev13",c);add(g[0],l.base);add(g[1],c);l.casilla=`12 · ${g[0]}`;continue}
    if(l.base<0){add("40",l.base);add("41",deducible);l.casilla="40";continue}
    if(l.intra){const cuota=l.cuota||tdRound(l.base*21/100);l.cuotaCalc=!l.cuota;const g=l.inversion?["38","39"]:["36","37"];add(g[0],l.base);add(g[1],cuota);l.casilla=g[0];if(withDev){add("dev10",l.base);add("dev11",cuota)}continue}
    if(!l.cuota&&!l.tipo){cero.push(l);l.casilla="0 %";continue}
    const g=l.inversion?["30","31"]:["28","29"];add(g[0],l.base);add(g[1],deducible);l.casilla=g[0];
  }
  return{auto,cero};
}

/* --- Cálculo --- */
function calc(period){
  const m=st(period),v=m.v,q=Number(period[0]),c={};
  const val=n=>num(v[n]);
  const src=ivaLines(q),{auto:ia,cero}=ivaAuto(src.lines);
  const hasAutofacturas=src.lines.some(l=>l.autofactura);
  const rec=ivaRecLines(q,hasAutofacturas),{auto:da,cero:ceroRec}=dedAuto(rec.lines,!hasAutofacturas,m.cls||{});
  // Autorepercusión de las adquisiciones intracomunitarias (si no hay autofacturas en las emitidas).
  if(da.dev10){ia["10"]=tdRound((ia["10"]||0)+da.dev10);ia["11"]=tdRound((ia["11"]||0)+da.dev11)}
  if(da.dev12){ia["12"]=tdRound((ia["12"]||0)+da.dev12);ia["13"]=tdRound((ia["13"]||0)+da.dev13)}
  for(const [,b,t,cu,rate] of DEV){
    if(b){c["auto"+b]=ia[b]||0;c[b]=has(v[b])?tdRound(val(b)):c["auto"+b]}
    if(t){c["auto"+t]=ia[t]||0;c[t]=rate!==null&&rate!==undefined?rate:has(v[t])?val(t):c["auto"+t]}
    const r=rate!==null&&rate!==undefined?rate:(t?c[t]:0),computed=b&&r?tdRound(c[b]*r/100):0;
    // Cuota: la escrita; si la base es de la contabilidad, la cuota de la contabilidad; si no, base × tipo.
    const auto=b&&has(v[b])?computed:ia[cu]!==undefined?ia[cu]:computed;
    c[cu]=has(v[cu])?tdRound(val(cu)):auto;c["auto"+cu]=auto;
  }
  c["27"]=tdRound(["152","167","03","155","06","09","11","13","15","158","170","18","21","24","26"].reduce((s,n)=>s+c[n],0));
  for(const [,b,cu] of DED){if(b){c["auto"+b]=da[b]||0;c[b]=has(v[b])?tdRound(val(b)):c["auto"+b]}c["auto"+cu]=da[cu]||0;c[cu]=has(v[cu])?tdRound(val(cu)):c["auto"+cu]}
  c["45"]=tdRound(["29","31","33","35","37","39","41","42","43","44"].reduce((s,n)=>s+c[n],0));
  c["46"]=tdRound(c["27"]-c["45"]);
  for(const [,n] of INFO)c[n]=tdRound(val(n));for(const n of ["62","63","74","75","76","68","108","70","109"])c[n]=tdRound(val(n));c.auto77=da.c77||0;c["77"]=has(v["77"])?tdRound(val("77")):c.auto77;
  c["58"]=0;c["64"]=tdRound(c["46"]+c["58"]+c["76"]);c["65"]=has(v["65"])?num(v["65"]):100;c["66"]=tdRound(c["64"]*c["65"]/100);
  // Cuotas a compensar de periodos anteriores: lo que quedó pendiente en el trimestre anterior (87) más lo que se pidió compensar en él.
  let auto110=0;if(q>1){const p=calc(`${q-1}T`);auto110=tdRound(p.c["87"]+(p.c["71"]<0&&p.tipo==="C"?-p.c["71"]:0))}
  c["110"]=has(v["110"])?tdRound(val("110")):auto110;c.auto110=auto110;
  const auto78=tdRound(Math.max(0,Math.min(c["110"],c["66"]+c["77"])));c["78"]=has(v["78"])?tdRound(val("78")):auto78;c.auto78=auto78;
  c["87"]=tdRound(c["110"]-c["78"]);c["112"]=0;
  c["69"]=tdRound(c["66"]+c["77"]-c["78"]+c["68"]+c["108"]);c["71"]=tdRound(c["69"]-c["70"]+c["109"]-c["112"]);
  c["111"]=tdRound(val("111"));
  const list=c["71"]>0?TIPOS_INGRESO:c["71"]<0?TIPOS_NEG:TIPOS_CERO,{list:ibans,pref}=clientIbans();
  const tipo=list.some(t=>t[0]===m.tipo)?m.tipo:list===TIPOS_INGRESO?(ibans.length?"U":"I"):list[0][0];
  const code=list.find(t=>t[0]===tipo)[2];
  const devFields=DEV.flatMap(([,b,t,cu])=>[b,t,cu]).filter(Boolean),dedFields=DED.flatMap(([,b,cu])=>[b,cu]).filter(Boolean);
  const over=list=>list.filter(n=>has(v[n])&&Math.abs(num(v[n])-(c["auto"+n]||0))>0.004).map(n=>({n,manual:num(v[n]),auto:c["auto"+n]||0}));
  const overrides=src.fuente==="manual"&&rec.fuente==="manual"?[]:[...(src.fuente==="manual"&&!da.dev10?[]:over(devFields)),...(rec.fuente==="manual"?[]:over(dedFields))];
  return{c,m,q,src,rec,cero,ceroRec,overrides,devFields,dedFields,tipo,code,tipos:list,iban:m.iban??(pref||ibans[0]||""),swift:m.swift||"",sinActividad:m.sinActividad===true,rect:m.rect===true};
}
const LABEL={"27":"Total cuota devengada","45":"Total a deducir","46":"Resultado régimen general (27 − 45)","64":"Suma de resultados (46 + 58 + 76)","65":"% atribuible a la Administración del Estado","66":"Atribuible a la Administración del Estado",
  "77":"IVA a la importación liquidado por la Aduana pendiente de ingreso","110":"Cuotas a compensar pendientes de periodos anteriores","78":"Cuotas a compensar de periodos anteriores aplicadas en este periodo","87":"Cuotas a compensar de periodos previos pendientes para periodos posteriores (110 − 78)",
  "68":"Resultado de la regularización anual (solo tributación conjunta con Haciendas Forales)","108":"Otros ajustes (rectificativa por discrepancia de criterio administrativo)","69":"Resultado de la autoliquidación (66 + 77 − 78 + 68 + 108)",
  "70":"Resultados a ingresar de anteriores autoliquidaciones del mismo periodo","109":"Devoluciones acordadas por la AEAT de anteriores autoliquidaciones del mismo periodo","71":"Resultado (69 − 70 + 109)","76":"Regularización cuotas art. 80.Cinco.5ª LIVA"};
TAX_DRAFT_BUILDERS[M]=period=>{
  const r=calc(period),c=r.c;
  const box=(n,label,heading)=>({n,label,value:c[n],kind:"money"});
  const boxes=[{heading:"IVA devengado"},...DEV.flatMap(([l,b,,cu])=>[b?box(b,`${l||"Régimen general"} · base`):null,box(cu,`${l||"Régimen general"} · cuota`)]).filter(Boolean),box("27",LABEL["27"]),
    {heading:"IVA deducible"},...DED.flatMap(([l,b,cu])=>[b?box(b,`${l} · base`):null,box(cu,`${l} · cuota`)]).filter(Boolean),box("45",LABEL["45"]),box("46",LABEL["46"]),
    {heading:"Información adicional"},...INFO.map(([l,n])=>box(n,l)),box("62","Criterio de caja · base"),box("63","Criterio de caja · cuota"),box("74","Adquisiciones criterio de caja · base"),box("75","Adquisiciones criterio de caja · cuota"),
    {heading:"Resultado"},...["76","64","65","66","77","110","78","87","68","108","69","70","109","71"].map(n=>({...box(n,LABEL[n]),cls:n==="71"?"total":"",kind:n==="65"?"count":"money"}))];
  return{title:"IVA · autoliquidación",boxes,result:c["71"],calc:r,summary:{perceptores:tdEur(c["27"]),base:c["45"],retencion:c["71"]},lists:{},
    checks:()=>{
      const out=[];
      if(r.src.fuente!=="manual")out.push(`<div class="td-check ok">✓ <div><b>IVA devengado de ${r.src.fuente==="contabilidad"?"la contabilidad":"las facturas guardadas"}</b>${r.src.lines.length} líneas de facturas emitidas del trimestre${c["14"]?` · bases negativas en la casilla 14: ${tdEur(c["14"])}`:""}.</div></div>`);
      if(r.rec.fuente!=="manual"){const intra=r.rec.lines.filter(l=>l.intra);out.push(`<div class="td-check ok">✓ <div><b>IVA deducible de ${r.rec.fuente==="contabilidad"?"la contabilidad":"las facturas guardadas"}</b>${r.rec.lines.length} líneas de facturas recibidas del trimestre${intra.length?` · ${intra.length} intracomunitaria${intra.length===1?"":"s"} en 36/37 con su autorepercusión en 10/11`:""}${c["40"]?` · abonos en la casilla 40: ${tdEur(c["40"])}`:""}.</div></div>`);
        if(intra.some(l=>l.cuotaCalc))out.push('<div class="td-check warn">⚠ <div><b>Cuota de intracomunitarias calculada al 21 %</b>Las facturas intracomunitarias no llevan IVA: la autorepercusión se calcula al 21 %. Cámbiala en 10/11 y 36/37 si el tipo es otro.</div></div>')}
      {const ch=r.rec.lines.filter(l=>l.cls);if(ch.length){const by={};ch.forEach(l=>{const t=(OPS.find(o=>o[0]===l.cls)||[])[1]||l.cls;by[t]=(by[t]||0)+1});out.push(`<div class="td-check ok">✓ <div><b>${ch.length} ${ch.length===1?"factura recibida con el tipo cambiado":"facturas recibidas con el tipo cambiado"}</b>${Object.entries(by).map(([t,n])=>`${n} · ${escapeHtml(t)}`).join(" · ")}. Se cambia en el ojo del IVA deducible.</div></div>`)}
        if(ch.some(l=>l.dua))out.push('<div class="td-check warn">⚠ <div><b>Importaciones</b>La cuota deducible de las importaciones debe ser la del DUA de la Aduana; se ha tomado la de la factura. Revísala en las casillas 32/33 o 34/35.</div></div>')}
      if(r.overrides.length)out.push(`<div class="td-check bad">✕ <div><b>Importes escritos a mano en lugar de la ${r.src.fuente==="contabilidad"?"contabilidad":"facturas guardadas"}</b>${r.overrides.map(o=>`[${o.n}] ${inputValue(o.manual)||"0,00"} (${r.src.fuente==="contabilidad"?"contabilidad":"facturas"}: ${inputValue(o.auto)||"0,00"})`).join(" · ")}. Bórralos o pulsa «Volver a los datos» en su página.</div></div>`);
      if(r.cero.length)out.push(`<div class="td-check warn">⚠ <div><b>${r.cero.length} línea${r.cero.length===1?"":"s"} al 0 % no van al IVA devengado</b>Base ${tdEur(tdSum(r.cero,"base"))}: si son entregas intracomunitarias o exportaciones, anótalas en «Información adicional» (59 o 60).</div></div>`);
      if(!Object.keys(r.m.v).length&&r.src.fuente==="manual")out.push('<div class="td-check warn">⚠ <div><b>Sin datos</b>De momento el 303 se rellena a mano: abre cada página con los botones de arriba.</div></div>');
      if(c["71"]<0&&r.tipo==="D"&&r.q!==4&&!r.m.f.redeme)out.push('<div class="td-check warn">⚠ <div><b>Devolución fuera del 4T</b>Solo se puede pedir la devolución en el último periodo, salvo inscritos en el REDEME. Lo habitual es «A compensar».</div></div>');
      if((r.code==="U"||r.code==="D")&&!r.iban)out.push('<div class="td-check warn">⚠ <div><b>Falta la cuenta</b>Elige el IBAN en la página «Forma de pago» o añádelo en la ficha del cliente.</div></div>');
      if(r.code==="X"&&!r.swift)out.push('<div class="td-check warn">⚠ <div><b>Falta el código SWIFT-BIC</b>Hace falta para la devolución a una cuenta del extranjero.</div></div>');
      if(r.rect&&!/^\d{13}$/.test(String(r.m.justificante||"")))out.push('<div class="td-check warn">⚠ <div><b>Rectificativa sin justificante</b>Indica el número de justificante (13 cifras) de la autoliquidación anterior.</div></div>');
      if(c["110"]&&c["78"]<c.auto78-0.004)out.push(`<div class="td-check ok">✓ <div><b>Compensación parcial</b>Quedan ${tdEur(c["87"])} por compensar en periodos posteriores.</div></div>`);
      if(Object.keys(r.m.v).length&&!out.some(x=>x.includes("warn")))out.push(`<div class="td-check ok">✓ <div><b>Resultado ${c["71"]>0?"a ingresar":c["71"]<0?"a compensar o devolver":"cero"}</b>${tdEur(c["71"])} · ${escapeHtml(r.tipos.find(t=>t[0]===r.tipo)[1])}.</div></div>`);
      return out;
    }};
};

/* --- Ojo: líneas de facturas emitidas que componen el IVA devengado --- */
if(typeof TAX_DRAFT_SIDE!=="undefined")TAX_DRAFT_SIDE.iva303={title:draft=>`IVA devengado · ${draft.calc.src.lines.length} líneas`,sub:"Facturas emitidas del trimestre y la casilla en la que va cada línea. Las bases negativas (abonos) van en la 14."};
if(typeof TAX_DRAFT_SIDE!=="undefined")TAX_DRAFT_SIDE.ded303={title:draft=>`IVA deducible · ${draft.calc.rec.lines.length} líneas`,sub:"Facturas recibidas del trimestre y la casilla en la que va cada línea: 28 interiores, 30 bienes de inversión, 36 intracomunitarias, 40 abonos."};
if(typeof taxDraftLists==="function"){const previousDed=taxDraftLists;taxDraftLists=function(kind,draft){
  if(kind!=="ded303")return previousDed.apply(this,arguments);
  const filter=sideFilter;lastDedFilter=filter;sideFilter="";const lines=filter?draft.calc.rec.lines.filter(l=>lineIn(l,filter)):draft.calc.rec.lines,groups=new Map();lines.forEach(l=>{const k=l.casilla||"—";if(!groups.has(k))groups.set(k,[]);groups.get(k).push(l)});
  const order=["28","12 · 28","30","12 · 30","32","32 · 77","34","34 · 77","36","38","40","0 %","No deducible"],keys=[...groups.keys()].sort((a,b)=>(order.indexOf(a)+99)%99-(order.indexOf(b)+99)%99);
  const ded=l=>l.cls==="nd"?0:l.intra||l.cls==="isp"?(l.cuota||tdRound(l.base*(l.tipo||21)/100)):tdRound(l.cuota-(l.noDed||0));
  const sel=l=>`<select class="m303-op${l.cls?" on":""}" data-m303-op="${escapeHtml(l.key)}" title="Tipo de operación: la factura va a la casilla que corresponda">${OPS.map(([v,t])=>`<option value="${v}"${v===l.cls?" selected":""}>${escapeHtml(t)}</option>`).join("")}</select>`;
  const dua=l=>l.dua?`<span class="m303-dua" title="Importación: aquí va el IVA del DUA (documento de la Aduana). Si no lo tienes, se toma el IVA de la factura.">!</span>`:"";
  const changed=draft.calc.rec.lines.filter(l=>l.cls).length;
  const devNote=filter==="dev10"?'<p class="td-note td-pad m303-op-note"><b>Casilla 10/11 del IVA devengado:</b> autorrepercusión de estas adquisiciones intracomunitarias (el mismo IVA se deduce en la 36/37 o 38/39).</p>':filter==="dev12"?'<p class="td-note td-pad m303-op-note"><b>Casilla 12/13 del IVA devengado:</b> autorrepercusión por inversión del sujeto pasivo (el mismo IVA se deduce en la 28/29 o 30/31).</p>':"";
  return devNote+`<p class="td-note td-pad m303-op-note">Elige en «Tipo» si la factura es intracomunitaria, importación, inversión del sujeto pasivo… y pasa a su casilla (con su IVA devengado, si lo tiene, para que no descuadre). «–» deja la de la contabilidad.${changed?` <b>${changed} ${changed===1?"factura cambiada":"facturas cambiadas"}.</b>`:""}</p>`+keys.map(k=>{const list=groups.get(k);return `<h4 class="td-list-title">${k==="No deducible"?"Fuera del 303 · IVA no deducible":`Casilla ${escapeHtml(k)}`} · ${list.length} líneas · base ${tdEur(tdSum(list,"base"))} · cuota deducible ${tdEur(tdRound(list.reduce((s,l)=>s+ded(l),0)))}</h4><table class="td-list m303-op-list"><thead><tr><th class="center">PDF</th><th>Fecha</th><th>Factura</th><th>Proveedor</th><th class="num">Base</th><th class="num">%</th><th class="num">Cuota</th><th class="num">Deducible</th><th>Tipo</th></tr></thead><tbody>${list.map(l=>`<tr class="${l.cls?"m303-op-row":""}"><td class="center">${pdfEye(l,"RECIBIDAS")}</td><td>${tdDate(l.fecha)}</td><td>${escapeHtml(l.numero)}</td><td>${escapeHtml(l.nombre)}<small>${escapeHtml(l.nif||"")}${l.intra?(l.servicios?" · intracomunitaria de servicios":" · intracomunitaria"):""}${l.inversion?" · bien de inversión":""}${l.cuotaCalc?" · cuota calculada":""}</small></td><td class="num">${tdEur(l.base)}</td><td class="num">${String(l.tipo).replace(".",",")}</td><td class="num">${tdEur(l.cuota)}</td><td class="num">${dua(l)}${tdEur(ded(l))}</td><td>${sel(l)}</td></tr>`).join("")}</tbody></table>`}).join("");
}}
if(typeof taxDraftLists==="function"){const previous=taxDraftLists;taxDraftLists=function(kind,draft){
  if(kind!=="iva303")return previous.apply(this,arguments);
  const filter=sideFilter;sideFilter="";const lines=filter?draft.calc.src.lines.filter(l=>lineIn(l,filter)):draft.calc.src.lines,groups=new Map();lines.forEach(l=>{const k=l.casilla||"—";if(!groups.has(k))groups.set(k,[]);groups.get(k).push(l)});
  const order=["01","04","07","150","165","153","14","0 %"],keys=[...groups.keys()].sort((a,b)=>(order.indexOf(a.split(" ")[0])+99)%99-(order.indexOf(b.split(" ")[0])+99)%99);
  return keys.map(k=>{const list=groups.get(k);return `<h4 class="td-list-title">Casilla ${escapeHtml(k)} · ${list.length} líneas · base ${tdEur(tdSum(list,"base"))} · cuota ${tdEur(tdSum(list,"cuota"))}</h4><table class="td-list"><thead><tr><th class="center">PDF</th><th>Fecha</th><th>Factura</th><th>Cliente</th><th class="num">Base</th><th class="num">%</th><th class="num">Cuota</th>${list.some(l=>l.recargo)?'<th class="num">Recargo</th>':""}</tr></thead><tbody>${list.map(l=>`<tr><td class="center">${pdfEye(l,"EMITIDAS")}</td><td>${tdDate(l.fecha)}</td><td>${escapeHtml(l.numero)}</td><td>${escapeHtml(l.nombre)}</td><td class="num">${tdEur(l.base)}</td><td class="num">${String(l.tipo).replace(".",",")}</td><td class="num">${tdEur(l.cuota)}</td>${list.some(x=>x.recargo)?`<td class="num">${l.recargo?tdEur(l.recargo):""}</td>`:""}</tr>`).join("")}</tbody></table>`}).join("");
}}

/* --- Ayuda de cada casilla (Instrucciones del modelo 303, AEAT 2026) --- */
const HELP_BASE="Bases imponibles y cuotas resultantes",HELP_RE="En el espacio reservado al recargo de equivalencia se harán constar las bases imponibles gravadas, el tipo aplicable y la cuota resultante.";
const HELP={
  "150":"Base imponible de las operaciones gravadas al tipo del 0 %.","151":"Tipo del 0 %.","152":"Cuota resultante de las operaciones gravadas al tipo del 0 %.",
  "165":"Base imponible de las operaciones gravadas a otro tipo distinto de los anteriores (casillas 165, 166 y 167).","166":"Tipo aplicado a la base de la casilla 165.","167":"Cuota resultante de la base de la casilla 165.",
  "01":"Bases imponibles gravadas al tipo del 4 %.","02":"Tipo del 4 %.","03":"Cuotas resultantes de las bases gravadas al 4 %.",
  "153":"Base imponible gravada a otro tipo distinto de los anteriores (casillas 153, 154 y 155).","154":"Tipo aplicado a la base de la casilla 153.","155":"Cuota resultante de la base de la casilla 153.",
  "04":"Bases imponibles gravadas al tipo del 10 %.","05":"Tipo del 10 %.","06":"Cuotas resultantes de las bases gravadas al 10 %.",
  "07":"Bases imponibles gravadas al tipo del 21 %.","08":"Tipo del 21 %.","09":"Cuotas resultantes de las bases gravadas al 21 %.",
  "10":"Bases imponibles del total de adquisiciones intracomunitarias de bienes y servicios realizadas en el periodo de liquidación (todas, incluidas las de tipo cero).","11":"Cuota resultante de las adquisiciones intracomunitarias de bienes y servicios del periodo.",
  "12":"Bases imponibles devengadas en el periodo por inversión del sujeto pasivo (art. 84.Uno.2.º y 4.º LIVA) cuando tengan su origen en operaciones distintas de las de las casillas 10 y 11.","13":"Cuotas devengadas por inversión del sujeto pasivo distintas de las adquisiciones intracomunitarias.",
  "14":"Modificación de bases imponibles, con el signo que corresponda, por cualquiera de las causas del art. 80 LIVA (art. 24.1 y 2 RIVA) y cualquier otra modificación. No se desglosa por tipos; si minora la base, con signo menos. Incluye la minoración por devoluciones en régimen de viajeros.","15":"Modificación de cuotas, con el signo que corresponda (art. 80 LIVA). No se desglosa por tipos; si minora la cuota, con signo menos.",
  "156":"Recargo de equivalencia del 1,75 %: base imponible.","157":"Tipo del recargo 1,75 %.","158":"Cuota de recargo de equivalencia al 1,75 %.",
  "168":"Recargo de equivalencia del 0,5 %: base imponible.","169":"Tipo del recargo 0,5 %.","170":"Cuota de recargo de equivalencia al 0,5 %.",
  "16":HELP_RE,"17":HELP_RE,"18":HELP_RE,
  "19":"Recargo de equivalencia del 1,4 %: base imponible.","20":"Tipo del recargo 1,4 %.","21":"Cuota de recargo de equivalencia al 1,4 %.",
  "22":"Recargo de equivalencia del 5,2 %: base imponible.","23":"Tipo del recargo 5,2 %.","24":"Cuota de recargo de equivalencia al 5,2 %.",
  "25":"Modificación de bases imponibles del recargo de equivalencia (art. 80 LIVA; art. 24.1 y 2 RIVA). Si supone minoración, con signo menos.","26":"Modificación del recargo de equivalencia (art. 80 LIVA). Si supone minoración, con signo menos.",
  "27":"Total cuota devengada: suma de las cuotas 152 + 167 + 03 + 155 + 06 + 09 + 11 + 13 + 15 + 158 + 170 + 18 + 21 + 24 + 26.",
  "28":"Base de las cuotas soportadas deducibles en operaciones interiores corrientes (art. 108 LIVA). La base va siempre sin prorratear. No se incluyen adquisiciones a tipo cero o exentas.","29":"Cuotas soportadas deducibles en operaciones interiores corrientes, después de aplicar, en su caso, la regla de prorrata.",
  "30":"Base de las cuotas soportadas deducibles en operaciones interiores con bienes de inversión (art. 108 LIVA), sin prorratear.","31":"Cuotas soportadas deducibles en operaciones interiores con bienes de inversión, después de aplicar, en su caso, la prorrata.",
  "32":"Base de las cuotas satisfechas deducibles en importaciones de bienes corrientes, sin prorratear.","33":"Cuotas deducibles en importaciones de bienes corrientes, después de aplicar, en su caso, la prorrata.",
  "34":"Base de las cuotas satisfechas deducibles en importaciones de bienes de inversión, sin prorratear.","35":"Cuotas deducibles en importaciones de bienes de inversión, después de aplicar, en su caso, la prorrata.",
  "36":"Base de las cuotas deducibles en adquisiciones intracomunitarias de bienes y servicios corrientes, sin prorratear.","37":"Cuotas deducibles en adquisiciones intracomunitarias de bienes y servicios corrientes, después de aplicar, en su caso, la prorrata.",
  "38":"Base de las cuotas deducibles en adquisiciones intracomunitarias de bienes de inversión, sin prorratear.","39":"Cuotas deducibles en adquisiciones intracomunitarias de bienes de inversión, después de aplicar, en su caso, la prorrata.",
  "40":"Base imponible de las cuotas deducibles rectificadas, regularizadas en las autoliquidaciones del ejercicio. No se incluyen las ya regularizadas en periodos anteriores (art. 24.2.b RIVA). Si minora las deducciones, con signo negativo.","41":"Cuotas deducibles rectificadas. Si la rectificación minora las deducciones, con signo negativo.",
  "42":"Compensaciones satisfechas a sujetos pasivos acogidos al Régimen especial de la agricultura, ganadería y pesca, después de aplicar, en su caso, la prorrata.",
  "43":"Resultado de la regularización de las deducciones por bienes de inversión, incluida la de deducciones anteriores al inicio de la actividad. Si minora las deducciones, con signo negativo.",
  "44":"Regularización de las deducciones provisionales del ejercicio por aplicar el porcentaje definitivo de prorrata. Solo en el 4T o mes 12, o en caso de cese de actividad.",
  "45":"Total a deducir: 29 + 31 + 33 + 35 + 37 + 39 + 41 + 42 + 43 + 44.","46":"Resultado régimen general: total cuota devengada (27) menos total a deducir (45).",
  "59":"Importe de las entregas intracomunitarias de bienes exentas del periodo (art. 25 LIVA) y de las prestaciones de servicios intracomunitarias del periodo.",
  "60":"Exportaciones y operaciones asimiladas exentas del periodo: exportaciones fuera de la UE (incluidos envíos definitivos a Canarias, Ceuta y Melilla, art. 21 LIVA), bases de devoluciones en régimen de viajeros (en positivo), operaciones de los arts. 22, 23, 24 y 64 LIVA y las exentas del régimen de agencias de viajes (art. 143).",
  "120":"Operaciones no sujetas por reglas de localización (salvo las de la casilla 123): ventas a distancia intracomunitarias no sujetas (art. 68.Cuatro), ventas a distancia de bienes importados no sujetas, servicios no sujetos (salvo los intracomunitarios de la 59), entregas con instalación o montaje en otro Estado miembro y demás no sujetas por localización.",
  "122":"Operaciones sujetas con inversión del sujeto pasivo: entregas de oro del art. 84.Uno.2.º b) y de oro de inversión (art. 140), y entregas y servicios del art. 84.Uno.2.º a), c), d), e), f) y g) LIVA.",
  "123":"Operaciones no sujetas por reglas de localización acogidas a los regímenes especiales de ventanilla única (Régimen de la Unión, de importación o exterior).",
  "124":"Operaciones sujetas y acogidas a los regímenes especiales de ventanilla única (p. ej. ventas a distancia de bienes importados sujetas en el territorio de aplicación del impuesto).",
  "62":"Criterio de caja: base imponible de las entregas y servicios a los que se aplica el régimen que se habrían devengado en el periodo por la regla general del art. 75 LIVA.","63":"Criterio de caja: cuota de esas mismas entregas y servicios devengados por la regla general del art. 75 LIVA.",
  "74":"Criterio de caja: base imponible de las adquisiciones a las que se aplique o afecte el régimen, como si se devengaran por la regla general del art. 75 LIVA.","75":"Criterio de caja: cuota soportada de esas adquisiciones según la regla general del art. 75 LIVA.",
  "76":"Regularización de cuotas del art. 80.Cinco.5.ª LIVA: el destinatario con prorrata de una operación impagada cuya base se ha modificado consigna las cuotas soportadas que no pudo deducirse y de las que resulta deudor.",
  "64":"Suma de resultados: resultado régimen general (46) + resultado régimen simplificado (58) + regularización art. 80.Cinco.5.ª (76).",
  "65":"Porcentaje del volumen de operaciones en territorio común (solo si tributa también al País Vasco o Navarra). Los demás sujetos pasivos consignan 100 %.",
  "66":"Atribuible a la Administración del Estado antes de compensar cuotas de periodos anteriores. Coincide con la 64 salvo tributación conjunta con las Diputaciones Forales: 66 = 64 × 65.",
  "77":"IVA a la importación liquidado por la Aduana pendiente de ingreso: cuotas de los documentos de liquidación recibidos en el periodo. Solo si se cumplen los requisitos del art. 74.1 RIVA.",
  "110":"Cuotas a compensar pendientes de periodos anteriores, con signo positivo (si tributa a varias Administraciones, solo el saldo ante la Administración del Estado).",
  "78":"Cuotas a compensar de periodos anteriores aplicadas en este periodo, con signo positivo. Se aplica la cuantía máxima posible: hasta la suma de 66 + 77.",
  "87":"Cuotas de periodos previos pendientes para periodos posteriores: 110 − 78. No incluye las cuotas a compensar generadas en este periodo.",
  "68":"Regularización anual: solo en la última autoliquidación del año (4T o mes 12), según el Concierto (País Vasco) o el Convenio (Navarra).",
  "108":"Solo en autoliquidación rectificativa por discrepancia de criterio administrativo cuando la rectificación no pueda hacerse en otras casillas. Puede ser positiva o negativa.",
  "69":"Resultado: 66 + 77 − 78 + 68 + 108.",
  "70":"Solo en rectificativa: resultado a ingresar de la autoliquidación anterior. Si su casilla 69 era positiva, se pone ese importe (ingresado o no); si era cero o negativa, se deja en blanco.",
  "109":"Solo en rectificativa: devoluciones acordadas por la AEAT de autoliquidaciones anteriores del mismo periodo. Si la 69 anterior era negativa y se acordó la devolución, se pone ese importe sin signo; si no, en blanco.",
  "71":"Resultado de la liquidación: 71 = 69 − 70 + 109. Positivo: a ingresar. Negativo: a compensar o a devolver. Cero: resultado cero.",
  "111":"Solo en rectificativa: parte del resultado negativo que corresponde al resultado positivo de la autoliquidación rectificada (devolución de ingresos indebidos, modificación de aplazamientos o domiciliaciones…). El PRE 303 la calcula solo."
};
// Explicación ampliada (con ejemplos) de algunas casillas; se muestra debajo del texto de las instrucciones.
const ISP_MORE=`<p><b>Qué significa.</b> Normalmente el proveedor repercute el IVA y lo ingresa él. En la inversión del sujeto pasivo, la factura llega sin IVA, con la mención «inversión del sujeto pasivo», y es nuestro cliente quien se autorrepercute el IVA. Lo declara como devengado en la 12 y la 13 y, si tiene derecho a deducir, lo vuelve a poner como deducible en la 28 y la 29, o en la 30 y la 31 si es un bien de inversión. Normalmente el efecto neto es cero.</p>
<p><b>Ejemplos típicos (art. 84.Uno.2.º LIVA):</b></p><ul>
<li><b>Obras de construcción:</b> una constructora recibe una factura de un subcontratista por una obra de urbanización, construcción o rehabilitación. Es el caso más habitual.</li>
<li><b>Venta de inmuebles con renuncia a la exención:</b> por ejemplo, la segunda venta de una nave en la que el vendedor renuncia a la exención. También las entregas de inmuebles en un concurso o en la ejecución de una garantía.</li>
<li><b>Proveedores de fuera de la UE que no están establecidos en España:</b> por ejemplo, un software o una suscripción facturados desde EE. UU., Reino Unido o Suiza a una empresa española.</li>
<li><b>Chatarra, residuos y desperdicios:</b> su compra a un chatarrero.</li>
<li><b>Oro:</b> oro sin elaborar y oro de inversión.</li>
<li><b>Electrónica:</b> móviles, consolas, portátiles y tablets cuando el comprador es revendedor o la factura supera los 10.000 €.</li>
<li><b>Derechos de emisión:</b> los de gases de efecto invernadero.</li></ul>
<p><b>Lo que no va aquí:</b> los servicios y bienes de proveedores de otro país de la UE, como Google Irlanda, Amazon Luxemburgo o un proveedor alemán, son adquisiciones intracomunitarias y van en la 10 y la 11.</p>`;
const INV_NOTE=`<p><b>Qué es un bien de inversión para el IVA (art. 108 LIVA):</b> bienes que se van a usar más de un año como instrumentos de trabajo o medios de explotación. No lo son, aunque se contabilicen en el grupo 2: los que valen 3.005,06 € o menos, los accesorios y recambios, las reparaciones y el mantenimiento, los envases y embalajes, la ropa de trabajo y lo que se compra para revender.</p>`;
const INV_REG=`<p><b>Ojo:</b> si hay prorrata, la deducción se regulariza durante 5 años (10 en inmuebles) en la casilla 43.</p>`;
const MORE_30=`${INV_NOTE}<p><b>Ejemplos:</b></p><ul>
<li>Compra de un local, una nave o una oficina para la actividad, con IVA.</li>
<li>Una furgoneta o un turismo afecto a la actividad (con la deducción que corresponda, normalmente el 50 % en turismos).</li>
<li>Maquinaria, un torno, una cámara frigorífica o la instalación de placas solares.</li>
<li>Mobiliario o equipos informáticos por más de 3.005,06 € la unidad.</li></ul>
<p><b>Lo que no va aquí:</b> un ordenador de 1.200 € o una silla de oficina, aunque se contabilicen en el inmovilizado, van en la 28 (corrientes).</p>${INV_REG}`;
const IMPORT_NOTE=`<p><b>Qué es una importación:</b> la entrada en España de bienes que vienen de fuera de la UE (o de Canarias, Ceuta y Melilla). El IVA no lo cobra el proveedor, lo liquida la Aduana con el DUA, y el documento que da derecho a deducir es el DUA, no la factura del proveedor. La base es el valor en aduana más aranceles y gastos hasta el destino.</p>`;
const MORE_32=`${IMPORT_NOTE}<p><b>Ejemplos:</b></p><ul>
<li>Mercancía para vender comprada a un proveedor de China, EE. UU., Reino Unido o Suiza.</li>
<li>Materias primas o envases traídos de fuera de la UE.</li>
<li>Un paquete que llega por DHL, UPS o FedEx con «IVA de importación»: el IVA va aquí con el DUA. La comisión de despacho del transportista es un servicio interior y va en la 28.</li></ul>
<p><b>Lo que no va aquí:</b> los servicios de fuera de la UE (son inversión del sujeto pasivo, casilla 12) y las compras a otros países de la UE (36). Si el IVA de importación está diferido, se declara también en la 77.</p>`;
const MORE_34=`${IMPORT_NOTE}<p><b>Ejemplos:</b></p><ul>
<li>Maquinaria industrial comprada a un fabricante de China o de Turquía.</li>
<li>Un vehículo traído de EE. UU. para la actividad.</li>
<li>Equipos o instalaciones de más de 3.005,06 € importados del Reino Unido o de Suiza.</li></ul>${INV_NOTE.replace("<p><b>Qué es","<p><b>Recuerda qué es")}${INV_REG}`;
const INTRA_NOTE=`<p><b>Qué es una adquisición intracomunitaria:</b> una compra a un empresario de otro país de la UE que factura sin IVA porque nuestro cliente tiene NIF-IVA (alta en el ROI y válido en el VIES). Nuestro cliente se autorrepercute el IVA español: lo declara como devengado en la 10 y la 11 y lo deduce aquí, así que normalmente el efecto neto es cero. También se declara en el modelo 349 (clave A bienes, I servicios).</p>`;
const MORE_36=`${INTRA_NOTE}<p><b>Ejemplos:</b></p><ul>
<li>Mercancía comprada a un proveedor de Alemania, Italia, Francia o Portugal, sin IVA.</li>
<li>Publicidad de Google Ads (Google Ireland) o de Meta (Meta Platforms Ireland).</li>
<li>Comisiones de Amazon (Amazon Services Europe, Luxemburgo) o licencias de software facturadas desde Irlanda o los Países Bajos.</li></ul>
<p><b>Lo que no va aquí:</b> si el proveedor europeo cobró el IVA de su país (porque el cliente no tenía NIF-IVA), no es intracomunitaria y ese IVA extranjero no se deduce en el 303: se pide con el modelo 360. Lo que viene de fuera de la UE es importación (32) o inversión del sujeto pasivo (12).</p>`;
const MORE_38=`${INTRA_NOTE}<p><b>Ejemplos:</b></p><ul>
<li>Maquinaria comprada a un fabricante italiano o alemán.</li>
<li>Una furgoneta o un camión comprado a un concesionario de otro país de la UE.</li>
<li>Estanterías industriales o equipos de más de 3.005,06 € la unidad comprados a un proveedor francés.</li></ul>${INV_NOTE.replace("<p><b>Qué es","<p><b>Recuerda qué es")}${INV_REG}`;
const MORE_28=`<p><b>Qué va aquí:</b> el IVA de las compras y gastos normales de la actividad a proveedores españoles, con IVA en la factura. Es la casilla donde va la mayoría de las facturas recibidas.</p>
<p><b>Ejemplos:</b></p><ul>
<li>Mercancía o materias primas compradas a un proveedor español.</li>
<li>Suministros: luz, agua, gas, teléfono e internet del local.</li>
<li>Alquiler del local de negocio (con su retención, en su caso).</li>
<li>Servicios profesionales: asesoría, abogado, notario, publicidad o diseño de un proveedor español.</li>
<li>Reparaciones y mantenimiento, material de oficina, limpieza o combustible.</li>
<li>Equipos de 3.005,06 € o menos, como un ordenador o una silla, aunque se contabilicen en el inmovilizado.</li>
<li>El IVA autorrepercutido por inversión del sujeto pasivo (casilla 12), cuando es deducible y no es un bien de inversión.</li></ul>
<p><b>Lo que no va aquí:</b></p><ul>
<li>Las facturas sin IVA (exentas o al 0 %), como seguros, servicios médicos, formación reglada o comisiones bancarias.</li>
<li>El IVA no deducible: gastos no afectos a la actividad, atenciones a clientes, o la parte no deducible de un turismo.</li>
<li>Los bienes de inversión de más de 3.005,06 € (casilla 30), las importaciones (32) y las compras intracomunitarias (36).</li>
<li>Los abonos de proveedores, que van en la 40 y la 41.</li></ul>
<p><b>Ojo:</b> con prorrata, la cuota se pone ya prorrateada y la base completa.</p>`;
const MORE_59=`<p><b>Qué va aquí:</b> las ventas sin IVA a empresas o profesionales de otro país de la UE que tienen NIF-IVA válido en el VIES. La factura va sin IVA, con la mención «Entrega intracomunitaria exenta, art. 25 LIVA» (bienes) o «Inversión del sujeto pasivo» (servicios).</p>
<p><b>Sí, también va en el modelo 349:</b> las entregas de bienes con la clave E y las prestaciones de servicios con la clave S, con el NIF-IVA de cada cliente. Lo de esta casilla y lo del 349 del mismo periodo deben coincidir.</p>
<p><b>Ejemplos:</b></p><ul>
<li>Venta de mercancía a una empresa francesa o alemana, transportada a su país.</li>
<li>Servicios de consultoría, diseño, publicidad o software prestados a una empresa de otro país de la UE.</li>
<li>Venta de aceite o maquinaria a un distribuidor de Portugal o Italia.</li></ul>
<p><b>Lo que no va aquí:</b> las ventas a particulares de otros países de la UE (llevan IVA español o van por el OSS, casilla 123), las ventas a empresas de la UE sin NIF-IVA válido (llevan IVA español) y las ventas fuera de la UE (casilla 60 o 120).</p>`;
const MORE_60=`<p><b>Qué va aquí:</b> las ventas de bienes que salen de la UE (exportaciones) y las operaciones exentas asimiladas. Se justifican con el DUA de exportación.</p>
<p><b>Ejemplos:</b></p><ul>
<li>Venta de mercancía a un cliente de EE. UU., Reino Unido, Suiza o Marruecos.</li>
<li>Envíos a Canarias, Ceuta o Melilla.</li>
<li>Ventas a viajeros de fuera de la UE con devolución del IVA (tax free, con DIVA).</li>
<li>Transportes y servicios ligados directamente a una exportación (art. 21 LIVA).</li></ul>
<p><b>Lo que no va aquí:</b> los servicios a empresas de fuera de la UE (no sujetos, casilla 120) y las ventas a empresas de la UE (casilla 59). Las exportaciones no van en el modelo 349.</p>`;
const MORE_120=`<p><b>Qué va aquí:</b> operaciones que no tributan en España porque, por las reglas de localización, se entienden hechas en otro país.</p>
<p><b>Ejemplos:</b></p><ul>
<li>Servicios de consultoría, diseño o software prestados a una empresa de EE. UU., Reino Unido o Suiza.</li>
<li>Servicios sobre un inmueble situado en otro país (por ejemplo, la reforma de una vivienda en Francia).</li>
<li>Una máquina vendida e instalada por nuestro cliente en una fábrica de otro país de la UE.</li></ul>
<p><b>Lo que no va aquí:</b> los servicios a empresas de la UE, que van en la 59 (y en el 349), y las ventas a particulares de la UE declaradas por el OSS (casilla 123). Estas operaciones no van en el modelo 349.</p>`;
const MORE_122=`<p><b>Qué va aquí:</b> las ventas de nuestro cliente en las que es el comprador quien declara el IVA (inversión del sujeto pasivo). La factura va sin IVA, con la mención «Inversión del sujeto pasivo, art. 84.Uno.2.º LIVA». Es la otra cara de la casilla 12: lo que aquí vende nuestro cliente, el comprador lo declara en su casilla 12.</p>
<p><b>Ejemplos:</b></p><ul>
<li>Un subcontratista de obra que factura a la constructora principal una obra de construcción o rehabilitación.</li>
<li>La venta de una nave o un local con renuncia a la exención.</li>
<li>Ventas de chatarra, residuos o desperdicios.</li>
<li>Ventas de móviles, portátiles, tablets o consolas a un revendedor, o por más de 10.000 €.</li>
<li>Ventas de oro de inversión.</li></ul>
<p><b>Lo que no va aquí:</b> las ventas intracomunitarias, aunque la factura diga «inversión del sujeto pasivo», que van en la 59. Estas operaciones no van en el modelo 349.</p>`;
const MORE_123=`<p><b>Qué va aquí:</b> las ventas a particulares de otros países de la UE que se declaran en el modelo 369 (ventanilla única, OSS), porque tributan en el país del comprador.</p>
<p><b>Ejemplos:</b></p><ul>
<li>Una tienda online que vende a particulares de Francia, Alemania o Italia, cuando las ventas a particulares de la UE superan los 10.000 € al año (o se ha optado por el OSS).</li>
<li>Servicios digitales (cursos online, suscripciones, apps) vendidos a particulares de otros países de la UE y declarados por el OSS.</li>
<li>Ventas de bienes importados de hasta 150 € a particulares, declaradas por el IOSS.</li></ul>
<p><b>Lo que no va aquí:</b> las ventas a particulares de la UE por debajo de 10.000 € al año sin optar por el OSS (llevan IVA español y van en el IVA devengado) y las ventas a empresas de la UE (casilla 59). No van en el modelo 349.</p>`;
const MORE_124=`<p><b>Qué va aquí:</b> operaciones que sí tributan en España pero se declaran por la ventanilla única (modelo 369) en lugar de en el IVA devengado del 303. Se anotan aquí solo para que cuenten en el volumen de operaciones.</p>
<p><b>Ejemplos:</b></p><ul>
<li>Una tienda online acogida al IOSS que vende a particulares de España productos de hasta 150 € enviados directamente desde China o EE. UU.</li>
<li>Cualquier otra operación sujeta en España y declarada en el 369 que deba formar parte del volumen de operaciones.</li></ul>
<p><b>Lo que no va aquí:</b> las ventas normales a clientes de España (van en el IVA devengado) y las ventas OSS a particulares de otros países de la UE (casilla 123). Es una casilla poco habitual. No va en el modelo 349.</p>`;
const MORE_62=`<p><b>Solo si el cliente está en el régimen especial del criterio de caja (RECC):</b> declara el IVA de sus ventas cuando las cobra, no cuando las factura. Estas casillas son informativas: recogen las facturas emitidas del periodo por su fecha, como si no hubiera criterio de caja, se hayan cobrado o no.</p>
<p><b>Ejemplo:</b> en septiembre emite una factura de 10.000 € + 2.100 € de IVA y la cobra en noviembre. En el 303 del 3T pone 10.000 en la 62 y 2.100 en la 63 (información). El IVA lo declara en el 4T, en las casillas 07 y 09, al cobrarla.</p>
<p><b>A tener en cuenta:</b> pueden acogerse quienes facturan hasta 2 millones al año, optando en el modelo 036. Si no se cobra, el IVA se devenga igualmente el 31 de diciembre del año siguiente. Las facturas llevan la mención «régimen especial del criterio de caja».</p>`;
const MORE_74=`<p><b>Para quien compra con criterio de caja:</b> el cliente está en el RECC, o le factura un proveedor acogido a él. El IVA de esas compras solo se deduce cuando se paga. Estas casillas son informativas: recogen las facturas recibidas del periodo por su fecha, como si no hubiera criterio de caja, se hayan pagado o no.</p>
<p><b>Ejemplo:</b> un proveedor acogido al criterio de caja factura en julio 5.000 € + 1.050 € de IVA y se le paga en octubre. En el 303 del 3T se pone 5.000 en la 74 y 1.050 en la 75 (información). El IVA se deduce en el 4T, en las casillas 28 y 29, al pagarla.</p>
<p><b>Cómo reconocerlo:</b> la factura del proveedor lleva la mención «régimen especial del criterio de caja».</p>`;
const MORE_76=`<p><b>Cuándo se usa:</b> un proveedor no ha cobrado una factura y la rectifica por impago (crédito incobrable o concurso). Nuestro cliente, como destinatario, pasa a deber a Hacienda ese IVA. La parte que se dedujo se quita en la 40 y la 41 (en negativo). La parte que no se pudo deducir (por prorrata o porque no era deducible) se ingresa aquí.</p>
<p><b>Ejemplo:</b> el cliente, con prorrata del 60 %, compró por 10.000 € + 2.100 € de IVA y se dedujo 1.260 €. No paga, y el proveedor le envía la factura rectificativa por impago. En el 303 pone −10.000 en la 40 y −1.260 en la 41, y los 840 € que no se dedujo (el 40 %) en la 76.</p>
<p><b>Lo habitual:</b> sin prorrata y con todo el IVA deducido, esta casilla queda a cero y basta con la 40 y la 41.</p>`;
const MORE_65=`<p><b>Casi siempre es 100 %.</b> Solo cambia para empresas que tributan a la vez al Estado y a la Diputación Foral del País Vasco o a Navarra: con un volumen de operaciones del año anterior de más de 10 millones de euros y operaciones en los dos territorios.</p>
<p><b>Ejemplo:</b> una empresa con domicilio en Madrid que hace el 30 % de sus operaciones en Bizkaia pone 70 % en la 65, y la 66 será el 70 % de la 64.</p>
<p><b>En la app:</b> si se deja en blanco, se toma el 100 %.</p>`;
const HELP_MORE={"76":MORE_76,"65":MORE_65,"124":MORE_124,"62":MORE_62,"63":MORE_62,"74":MORE_74,"75":MORE_74,"59":MORE_59,"60":MORE_60,"120":MORE_120,"122":MORE_122,"123":MORE_123,"12":ISP_MORE,"13":ISP_MORE,"28":MORE_28,"29":MORE_28,"30":MORE_30,"31":MORE_30,"32":MORE_32,"33":MORE_32,"34":MORE_34,"35":MORE_34,"36":MORE_36,"37":MORE_36,"38":MORE_38,"39":MORE_38};
const FLAG_HELP={
  redeme:"Marque si está inscrito en el Registro de devolución mensual (art. 30 RIVA). Podrá solicitar la devolución en cada periodo si el resultado es negativo.",
  soloRS:"Marque si tributa exclusivamente en régimen simplificado.",conjunta:"Marque si se trata de una autoliquidación conjunta (art. 71.6 RIVA).",
  caja:"Marque si ha optado por el régimen especial del criterio de caja (art. 163 undecies LIVA).",destCaja:"Marque si es destinatario de operaciones a las que se aplique el régimen especial del criterio de caja.",
  prorrata:"Opción por la prorrata especial (art. 103.Dos.1.º LIVA). Solo puede ejercitarse en la autoliquidación del último periodo del ejercicio.",revocacion:"Revocación de la prorrata especial (art. 103.Dos.1.º LIVA). Solo en la autoliquidación del último periodo del ejercicio.",
  concurso:"Marque si ha sido declarado en concurso de acreedores en el periodo: indique la fecha del auto y si la autoliquidación es preconcursal (hechos anteriores al auto) o postconcursal (posteriores).",
  sii:"Marque si lleva voluntariamente los Libros registro del IVA a través de la Sede electrónica de la AEAT (art. 68 bis RIVA).",
  exonerado:"Solo en el último periodo: indique si está exonerado del modelo 390 (trimestrales que solo tributan en territorio común con régimen simplificado y/o arrendamiento de inmuebles urbanos, o quienes llevan los libros en la Sede, art. 62.6 RIVA).",
  volumen:"Solo en el último periodo y si está exonerado del 390: indique si su volumen anual de operaciones es distinto de cero."
};
/* --- Pantalla: una página del modelo cada vez --- */
const PAGES=[["ident","Identificación"],["dev","IVA devengado"],["ded","IVA deducible"],["info","Información adicional"],["res","Resultado"],["pago","Forma de pago"]];
function moneyInput(n,r,{auto,signed}={}){const v=r.m.v[n];return `<input class="m303-in${has(v)&&auto!==undefined?" manual":""}${!has(v)&&auto?" has-auto":""}" data-m303="${n}" inputmode="decimal" value="${escapeHtml(inputValue(v))}" placeholder="${auto!==undefined?escapeHtml(inputValue(auto)||"0,00"):"0,00"}" title="${signed?"Admite importes negativos":""}">`}
const cell=(n,content)=>`<div class="m303-cell"${HELP[n]?` data-m303-help="${n}"`:""}><span class="m303-n">${n}</span>${content}</div>`;
const out=v=>`<span class="m303-out">${tdEur(v)}</span>`;
// Ojo a la izquierda de cada fila con datos: abre solo las facturas de esa casilla.
// «dev10»/«dev12»: facturas recibidas que generan IVA devengado (autorrepercusión de intracomunitarias e inversión del sujeto pasivo).
const lineIn=(l,b)=>b==="dev10"?Boolean(l.intra&&l.base>=0&&l.cls!=="nd"):b==="dev12"?l.cls==="isp":String(l.casilla||"").split(" · ").includes(b);
function rowEye(r,kind,b){
  if(kind==="dev"&&(b==="10"||b==="12")){const k="dev"+b,lines=r.rec.lines.filter(l=>lineIn(l,k));
    return lines.length?`<button type="button" class="m303-roweye" data-m303-roweye="ded" data-casilla="${k}" title="Ver las ${lines.length} facturas recibidas que generan la casilla ${b} (${b==="10"?"adquisiciones intracomunitarias":"inversión del sujeto pasivo"})">${tdEye}</button>`:""}
  const lines=b?(kind==="dev"?r.src.lines:r.rec.lines).filter(l=>lineIn(l,b)):[];
  return lines.length?`<button type="button" class="m303-roweye" data-m303-roweye="${kind}" data-casilla="${b}" title="Ver las ${lines.length} líneas de la casilla ${b}">${tdEye}</button>`:"";
}
let sideFilter="";let lastDedFilter="";
// Cambio del tipo de operación de una factura: se guarda en el trimestre y se recalcula todo (panel y borrador).
document.addEventListener("change",event=>{const sel=event.target.closest?.("#tdSideBody [data-m303-op]");if(!sel)return;const period=taxDrafts.open;if(taxDrafts.model!==M||!/^\dT$/.test(period||""))return;
  save(period,m=>{m.cls={...(m.cls||{})};if(sel.value)m.cls[sel.dataset.m303Op]=sel.value;else delete m.cls[sel.dataset.m303Op]});
  const body=document.querySelector("#tdSideBody"),top=body?.scrollTop||0;renderTaxDraftMain();sideFilter=lastDedFilter;openTaxDraftSide("ded303",taxDraftBuild(M,period));const again=document.querySelector("#tdSideBody");if(again)again.scrollTop=top});
// Ojo de cada factura en el panel: abre su PDF de la carpeta CONTABILIDAD del cliente (si es de un Excel, no hay PDF).
const pdfEye=(l,tipo)=>/\.(xlsx?|xlsm|csv|ods)$/i.test(l.archivo||"")&&!l.ruta?`<span class="td-eye off" title="Sin PDF">${tdEyeOff}</span>`:`<button type="button" class="td-eye" data-m303-pdf="${encodeURIComponent(JSON.stringify({ruta:l.ruta||"",fecha:l.fecha,nombre:l.nombre,numero:l.numero,tipo}))}" title="Ver la factura">${tdEye}</button>`;
document.addEventListener("click",async event=>{const b=event.target.closest("#tdSideBody [data-m303-pdf]");if(!b)return;b.disabled=true;
  try{if(typeof window.openBookInvoice!=="function")throw new Error("No se puede abrir la factura.");await window.openBookInvoice(JSON.parse(decodeURIComponent(b.dataset.m303Pdf)))}catch(error){alert(error.message||"No se ha podido abrir la factura.")}finally{b.disabled=false}});
function pageDev(r){
  const c=r.c;
  return `${r.src.lines.length?`<div class="m303-src">${r.overrides.length?`<button type="button" class="m303-eyebtn warn" data-m303-reset="dev" title="Borra los importes escritos a mano en el IVA devengado">↺ <span>Volver a los datos de la ${r.src.fuente==="contabilidad"?"contabilidad":"facturas"} (${r.overrides.map(o=>o.n).join(", ")})</span></button>`:""}<button type="button" class="m303-eyebtn" data-m303-eye="dev">${tdEye}<span>Ver las ${r.src.lines.length} líneas de facturas emitidas</span></button></div>`:""}<table class="m303-t c3"><thead><tr><th></th><th>Base imponible</th><th>Tipo %</th><th>Cuota</th></tr></thead><tbody>${DEV.map(([label,b,t,cu,rate,signed],i)=>`<tr${label&&i?' class="m303-sep"':""}><td class="m303-l">${escapeHtml(label)}</td>
    <td>${b?cell(b,rowEye(r,"dev",b)+moneyInput(b,r,{signed,auto:c["auto"+b]})):""}</td><td>${t?cell(t,rate!==null&&rate!==undefined?`<span class="m303-out">${String(rate).replace(".",",")}</span>`:`<input class="m303-in short${has(r.m.v[t])?" manual":""}" data-m303="${t}" inputmode="decimal" value="${escapeHtml(has(r.m.v[t])?String(r.m.v[t]).replace(".",","):"")}" placeholder="${c["auto"+t]?String(c["auto"+t]).replace(".",","):"%"}">`):""}</td>
    <td>${cell(cu,moneyInput(cu,r,{auto:c["auto"+cu],signed}))}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td class="m303-l" colspan="3"><b>${LABEL["27"]}</b> <small>(152 + 167 + 03 + 155 + 06 + 09 + 11 + 13 + 15 + 158 + 170 + 18 + 21 + 24 + 26)</small></td><td>${cell("27",out(c["27"]))}</td></tr></tfoot></table>
    <p class="m303-hint">${r.src.fuente==="contabilidad"?`Bases y cuotas de las ${r.src.lines.length} líneas de facturas emitidas del trimestre en la contabilidad.`:r.src.fuente==="facturas"?`Bases y cuotas de las facturas emitidas guardadas del trimestre (${r.src.lines.length} líneas).`:"Sin facturas emitidas: escribe los importes a mano."} Las bases negativas van en 14 y 15. Si escribes otro importe, manda el tuyo (en naranja).</p>`;
}
function pageDed(r){
  const c=r.c,dedOver=r.overrides.filter(o=>r.dedFields.includes(o.n));
  return `${r.rec.lines.length?`<div class="m303-src">${dedOver.length?`<button type="button" class="m303-eyebtn warn" data-m303-reset="ded">↺ <span>Volver a los datos de la ${r.rec.fuente==="contabilidad"?"contabilidad":"facturas"} (${dedOver.map(o=>o.n).join(", ")})</span></button>`:""}<button type="button" class="m303-eyebtn" data-m303-eye="ded">${tdEye}<span>Ver las ${r.rec.lines.length} líneas de facturas recibidas</span></button></div>`:""}<table class="m303-t c2"><thead><tr><th></th><th>Base</th><th>Cuota</th></tr></thead><tbody>${DED.map(([label,b,cu,signed])=>`<tr><td class="m303-l">${escapeHtml(label)}</td><td>${b?cell(b,rowEye(r,"ded",b)+moneyInput(b,r,{signed,auto:c["auto"+b]})):""}</td><td>${cell(cu,moneyInput(cu,r,{signed,auto:c["auto"+cu]}))}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td class="m303-l" colspan="2"><b>${LABEL["45"]}</b> <small>(29 + 31 + 33 + 35 + 37 + 39 + 41 + 42 + 43 + 44)</small></td><td>${cell("45",out(c["45"]))}</td></tr>
    <tr class="m303-res"><td class="m303-l" colspan="2"><b>${LABEL["46"]}</b></td><td>${cell("46",out(c["46"]))}</td></tr></tfoot></table>
    <p class="m303-hint">${r.rec.fuente==="contabilidad"?`Bases y cuotas de las ${r.rec.lines.length} líneas de facturas recibidas del trimestre en la contabilidad.`:r.rec.fuente==="facturas"?`Bases y cuotas de las facturas recibidas guardadas del trimestre (${r.rec.lines.length} líneas).`:"Sin facturas recibidas: escribe los importes a mano."} Bienes de inversión en 30/31, intracomunitarias en 36/37 y abonos en 40/41. Las importaciones (32 a 35) de momento van a mano.</p>`;
}
/* --- Exonerados del 390 (último periodo): operaciones realizadas en el ejercicio, casillas 80 a 88 --- */
const EXO=[["80","Operaciones en régimen general"],["81","Operaciones a las que habiéndoles sido aplicado el régimen especial del criterio de caja hubieran resultado devengadas conforme a la regla general de devengo (art. 75 LIVA)"],
  ["93","Entregas intracomunitarias de bienes y servicios"],["94","Exportaciones y otras operaciones exentas con derecho a deducción"],["83","Operaciones exentas sin derecho a deducción"],
  ["84","Operaciones no sujetas por reglas de localización (excepto las incluidas en la casilla 126)"],["125","Operaciones sujetas con inversión del sujeto pasivo"],
  ["126","Operaciones no sujetas por reglas de localización acogidas a los regímenes especiales de ventanilla única"],["127","Operaciones sujetas y acogidas a los regímenes especiales de ventanilla única"],
  ["128","Operaciones intragrupo valoradas conforme a lo dispuesto en los arts. 78 y 79 LIVA"],["86","Operaciones en régimen simplificado"],["95","Operaciones en régimen especial de la agricultura, ganadería y pesca"],
  ["96","Operaciones realizadas por sujetos pasivos acogidos al régimen especial del recargo de equivalencia"],["97","Operaciones en régimen especial de bienes usados, objetos de arte, antigüedades y objetos de colección"],
  ["98","Operaciones en régimen especial de agencias de viajes"],["79","Entregas de bienes inmuebles, operaciones financieras y relativas al oro de inversión no habituales",true],["99","Entregas de bienes de inversión",true]];
const EXO_CLAVES=["A01","A02","A03","A04","A05","B01","B02","B03","B04","B05","B06","C"];
// Valores propuestos con la suma de los 303 del ejercicio; lo escrito a mano (m.exo) manda.
function exoCalc(period){
  const m=st(period),year=taxDraftYear(),auto={};EXO.forEach(([n])=>auto[n]=0);
  for(let i=1;i<=4;i++){const p=`${i}T`;if(declarationData(M,p,taxDrafts.client,year).notRequired)continue;let c;try{c=calc(p).c}catch{continue}
    auto["80"]+=["150","01","04","07","153","165","14"].reduce((s,n)=>s+(Number(c[n])||0),0);
    [["81","62"],["93","59"],["94","60"],["84","120"],["125","122"],["126","123"],["127","124"]].forEach(([to,from])=>{auto[to]+=Number(c[from])||0})}
  const v={},manual=m.exo||{};EXO.forEach(([n])=>{auto[n]=tdRound(auto[n]);v[n]=has(manual[n])?tdRound(num(manual[n])):auto[n]});
  v["88"]=tdRound(EXO.reduce((s,[n,,neg])=>s+(neg?-v[n]:v[n]),0));
  return{v,auto,manual,f:m.f||{}};
}
const exoRows=(x,attr)=>EXO.map(([n,l,neg])=>`<tr><td class="m303-l">${neg?"(−) ":""}${escapeHtml(l)}</td><td>${cell(n,`<input class="m303-in${has(x.manual[n])?" manual":""}" ${attr}="${n}" inputmode="decimal" value="${escapeHtml(has(x.manual[n])?inputValue(x.manual[n]):"")}" placeholder="${escapeHtml(inputValue(x.auto[n])||"0,00")}">`)}</td></tr>`).join("");
function exoSection(r,period){
  const x=exoCalc(period),f=x.f;
  return `<div class="m303-sec m303-exo-sec"><span>Exonerados del 390</span><em>Último periodo · operaciones realizadas en el ejercicio</em></div>
    <div class="m303-exo-ids"><label class="td-cf"><small>B · Clave de actividad principal</small><select data-m303exof="exClave">${EXO_CLAVES.map(k=>`<option${(f.exClave||"A03")===k?" selected":""}>${k}</option>`).join("")}</select></label>
      <label class="td-cf"><small>C · Epígrafe IAE principal</small><input data-m303exof="exEpigrafe" maxlength="4" value="${escapeHtml(f.exEpigrafe||"")}" placeholder="p. ej. 5056"></label>
      <label class="td-cf"><small>D · Obligado a presentar el 347</small><select data-m303exof="exD347"><option value="1"${f.exD347?" selected":""}>Sí</option><option value=""${f.exD347?"":" selected"}>No</option></select></label></div>
    <table class="m303-t c1 m303-exo"><tbody>${exoRows(x,"data-m303exo")}
      <tr class="m303-res"><td class="m303-l"><b>Total volumen de operaciones (art. 121 LIVA)</b> <small>([80]+[81]+[93]+[94]+[83]+[84]+[125]+[126]+[127]+[128]+[86]+[95]+[96]+[97]+[98]−[79]−[99])</small></td><td>${cell("88",`<span class="m303-out">${tdEur(x.v["88"])}</span>`)}</td></tr></tbody></table>
    <p class="m303-hint">Propuesto con la suma de los cuatro 303 del ejercicio; escribe otro importe si hace falta (en naranja). Va en la página 4 del fichero.</p>`;
}
function pageInfo(r){
  return `<table class="m303-t c1"><tbody>${INFO.map(([l,n])=>`<tr><td class="m303-l">${escapeHtml(l)}</td><td colspan="2">${cell(n,moneyInput(n,r,{signed:true}))}</td></tr>`).join("")}</tbody></table>
    <table class="m303-t c2"><thead><tr><th></th><th>Base imponible</th><th>Cuota</th></tr></thead><tbody>
    <tr><td class="m303-l">Entregas y servicios con criterio de caja que habrían resultado devengadas por la regla general (art. 75 LIVA)</td><td>${cell("62",moneyInput("62",r))}</td><td>${cell("63",moneyInput("63",r))}</td></tr>
    <tr><td class="m303-l">Adquisiciones de bienes y servicios a las que sea de aplicación o afecte el régimen especial del criterio de caja</td><td>${cell("74",moneyInput("74",r))}</td><td>${cell("75",moneyInput("75",r))}</td></tr></tbody></table>`+(r.q===4&&r.m.f.exonerado?exoSection(r,`${r.q}T`):"");
}
function pageRes(r){
  const c=r.c,line=(n,content,cls="")=>`<tr class="${cls}"><td class="m303-l">${escapeHtml(LABEL[n])}</td><td>${cell(n,content)}</td></tr>`,m=r.m;
  return `<table class="m303-t c1"><tbody>${line("76",moneyInput("76",r,{signed:true}))}${line("64",out(c["64"]))}
    ${line("65",`<input class="m303-in short" data-m303="65" inputmode="decimal" value="${escapeHtml(has(m.v["65"])?String(m.v["65"]).replace(".",","):"")}" placeholder="100,00">`)}${line("66",out(c["66"]))}${line("77",moneyInput("77",r,{auto:c.auto77}))}
    ${line("110",moneyInput("110",r,{auto:c.auto110}))}${line("78",moneyInput("78",r,{auto:c.auto78}))}${line("87",out(c["87"]))}
    ${line("68",moneyInput("68",r,{signed:true}))}${line("108",moneyInput("108",r,{signed:true}))}${line("69",out(c["69"]),"m303-strong")}${line("70",moneyInput("70",r))}${line("109",moneyInput("109",r))}${line("71",out(c["71"]),"m303-res")}</tbody></table>
    <div class="m303-boxes">
      <label class="m303-check"><input type="checkbox" data-m303f="sinActividad"${r.sinActividad?" checked":""}><span><b>Sin actividad</b> en el periodo</span></label>
      <div class="m303-rect${r.rect?" on":""}"><label class="m303-check"><input type="checkbox" data-m303f="rect"${r.rect?" checked":""}><span><b>Autoliquidación rectificativa</b></span></label>
        <label class="td-cf"><small>Nº de justificante de la autoliquidación anterior</small><input data-m303f="justificante" maxlength="13" inputmode="numeric" value="${escapeHtml(m.justificante||"")}"${r.rect?"":" disabled"}></label>
        <label class="td-cf"><small>Motivo</small><select data-m303f="motivo"${r.rect?"":" disabled"}><option value="1"${m.motivo!=="2"?" selected":""}>Rectificaciones (excepto el motivo siguiente)</option><option value="2"${m.motivo==="2"?" selected":""}>Discrepancia de criterio administrativo</option></select></label>
        <label class="td-cf"><small>[111] Importe de la rectificación</small>${moneyInput("111",r)}</label>
        <label class="m303-check"><input type="checkbox" data-m303f="bajaDomiciliacion"${m.bajaDomiciliacion?" checked":""}${r.rect?"":" disabled"}><span>Solicito dar de baja / modificar la domiciliación efectuada</span></label></div>
    </div>`;
}
// Identificación con los recuadros del modelo: dos columnas, línea de puntos y casilla a la derecha.
const IDENT_L=[["redeme","Sujeto pasivo inscrito en el Registro de devolución mensual (art. 30 RIVA)"],["soloRS","Sujeto pasivo que tributa exclusivamente en régimen simplificado"],["conjunta","Autoliquidación conjunta"],
  ["caja","Sujeto pasivo acogido al régimen especial del criterio de Caja (art. 163 undecies LIVA)"],["destCaja","Sujeto pasivo destinatario de operaciones acogidas al régimen especial del criterio de caja"],
  ["prorrata","Opción por la aplicación de la prorrata especial (art. 103.Dos.1º LIVA)",true],["revocacion","Revocación de la opción por la aplicación de la prorrata especial (art. 103.Dos.1º LIVA)",true],["concurso","Sujeto pasivo declarado en concurso de acreedores en el presente período de liquidación"]];
const IDENT_R=[["sii","Sujeto pasivo acogido voluntariamente al SII"],["exonerado","Sujeto pasivo exonerado de la Declaración-resumen anual del IVA, modelo 390",true],["volumen","Sujeto pasivo con volumen anual de operaciones distinto de cero (art. 121 LIVA)",true]];
function pageIdent(r){
  const f=r.m.f,last=r.q===4;
  const ck=([k,l,only4])=>{const off=only4&&!last||k==="volumen"&&!f.exonerado;return `<label class="m303-ck${off?" off":""}"${FLAG_HELP[k]?` data-m303-help="f:${k}"`:""}><span>${escapeHtml(l)}</span><input type="checkbox" data-m303flag="${k}"${f[k]&&!off?" checked":""}${off?" disabled":""}></label>`};
  const dd=[f.concDia??String(f.fechaConcurso||"").slice(0,2),f.concMes??String(f.fechaConcurso||"").slice(2,4),f.concAnio??String(f.fechaConcurso||"").slice(4,8)];
  return `<div class="m303-idg"><div>${IDENT_L.map(ck).join("")}
      <div class="m303-conc${f.concurso?"":" off"}"><span>Fecha en que se dictó el auto de declaración de concurso</span><div class="m303-date"><label><small>Día</small><input data-m303date="0" maxlength="2" inputmode="numeric" value="${escapeHtml(dd[0])}"${f.concurso?"":" disabled"}></label><label><small>Mes</small><input data-m303date="1" maxlength="2" inputmode="numeric" value="${escapeHtml(dd[1])}"${f.concurso?"":" disabled"}></label><label><small>Año</small><input data-m303date="2" maxlength="4" inputmode="numeric" class="y" value="${escapeHtml(dd[2])}"${f.concurso?"":" disabled"}></label></div></div>
      <div class="m303-conc${f.concurso?"":" off"}"><span>Si se ha dictado auto de declaración de concurso en este período indique el tipo de autoliquidación</span><div class="m303-pp"><label class="m303-ck"><span>Preconcursal</span><input type="radio" name="m303conc" data-m303conc="1"${f.tipoConcurso==="1"?" checked":""}${f.concurso?"":" disabled"}></label><label class="m303-ck"><span>Postconcursal</span><input type="radio" name="m303conc" data-m303conc="2"${f.tipoConcurso==="2"?" checked":""}${f.concurso?"":" disabled"}></label></div></div></div>
    <div>${IDENT_R.map(ck).join("")}${last?"":'<p class="m303-hint">Las casillas en gris solo se marcan en el último periodo (4T).</p>'}</div></div>`;
}
function pagePago(r){
  const c=r.c,{list,pref}=clientIbans(),otra=r.iban&&!list.includes(r.iban),needsIban=["U","D","I","G"].includes(r.code)||r.rect&&c["111"]>0;
  return `<div class="m303-pago"><div class="m303-pago-res"><span>Resultado [71]</span><b>${tdEur(c["71"])}</b></div>
    <label class="td-cf"><small>Tipo de declaración</small><select data-m303f="tipo">${r.tipos.map(([v,l])=>`<option value="${v}"${v===r.tipo?" selected":""}>${escapeHtml(l)}</option>`).join("")}</select></label>
    ${needsIban||r.code==="X"?`<label class="td-cf"><small>${r.code==="U"?"Cuenta de domiciliación":r.code==="D"||r.code==="X"?"Cuenta para la devolución":"Cuenta bancaria"} (IBAN) · ★ preferida en la ficha</small>${r.code==="X"?`<input data-m303f="iban" value="${escapeHtml(r.iban)}" maxlength="34">`:`<select data-m303f="iban">${list.map(i=>`<option value="${i}"${i===r.iban?" selected":""}>${i===pref?"★ ":""}${i.replace(/(.{4})/g,"$1 ").trim()}</option>`).join("")}${otra?`<option value="${escapeHtml(r.iban)}" selected>${escapeHtml(r.iban)}</option>`:""}${list.length||otra?"":'<option value="" selected>Sin IBAN en la ficha del cliente</option>'}</select>`}</label>`:""}
    ${r.code==="X"?`<label class="td-cf short"><small>Código SWIFT-BIC</small><input data-m303f="swift" value="${escapeHtml(r.swift)}" maxlength="11"></label>`:""}
    <p class="m303-hint">${r.code==="C"?`Se compensará en los siguientes periodos (casilla 110 del próximo trimestre: ${tdEur(c["87"]-c["71"])}).`:r.code==="N"?"Se presenta sin actividad o con resultado cero.":r.code==="U"?"La domiciliación solo se puede hacer hasta unos días antes de que termine el plazo.":""}</p></div>`;
}
function grid(r){
  const tab=PAGES.some(p=>p[0]===taxDrafts.m303Tab)?taxDrafts.m303Tab:"dev";
  const SEC={ident:["Identificación (1)","Devengo (2) · ejercicio "+taxDraftYear()+" · período "+(r.q?r.q+"T":"")],dev:["Liquidación (3)","Régimen general · IVA devengado"],ded:["Liquidación (3)","Régimen general · IVA deducible"],info:["Información adicional",""],res:["Resultado","Sin actividad (4) · Rectificativa (5)"],pago:["Compensación (6) · Ingreso (7) · Devolución (8)",""]}[tab];
  const body=`<div class="m303-sec"><span>${escapeHtml(SEC[0])}</span>${SEC[1]?`<em>${escapeHtml(SEC[1])}</em>`:""}</div>`+{ident:pageIdent,dev:pageDev,ded:pageDed,info:pageInfo,res:pageRes,pago:pagePago}[tab](r);
  return `<div class="m303-wrap"><nav class="m303-tabs">${PAGES.map(([k,l])=>`<button type="button" class="${k===tab?"on":""}" data-m303-tab="${k}">${l}${k==="res"?`<small>${tdEur(r.c["71"])}</small>`:k==="dev"?`<small>${tdEur(r.c["27"])}</small>`:k==="ded"?`<small>${tdEur(r.c["45"])}</small>`:""}</button>`).join("")}</nav><div class="m303-page">${body}</div></div>`;
}
if(typeof taxDraftBoxes==="function"){const previous=taxDraftBoxes;taxDraftBoxes=function(boxes,withEyes=true,model=""){
  if(model===M&&taxDrafts.model===M&&/^\dT$/.test(taxDrafts.open||""))return grid(calc(taxDrafts.open));return previous.apply(this,arguments)}}
if(typeof taxDraftDetail==="function"){const previous=taxDraftDetail;taxDraftDetail=function(draft){const html=previous.apply(this,arguments);if(draft.model!==M)return html;
  return html.replace('<button type="button" class="secondary-button" data-td-copy>',`<button type="button" class="secondary-button" data-m303-file="${escapeHtml(draft.period)}">Fichero AEAT</button><button type="button" class="secondary-button" data-td-copy>`)}}
function syncControl(period){
  const year=taxDraftYear(),key=declarationKey(M,period,taxDrafts.client,year),data=declarationData(M,period,taxDrafts.client,year);if(data.notRequired)return;
  const value=CONTROL_PAGO[calc(period).tipo]||"N.R.C.";if(data.payment!==value){data.payment=value;localStorage.setItem(key,JSON.stringify(data))}
}
// Aviso al marcar «exonerado del 390»: supuestos a la izquierda y, a la derecha, el apartado de operaciones del ejercicio para confirmarlo.
function exoDialog(period){
  return new Promise(resolve=>{
    const x=exoCalc(period),f=x.f,shade=document.createElement("div");shade.className="app-confirm";shade.setAttribute("role","dialog");shade.setAttribute("aria-modal","true");
    shade.innerHTML=`<div class="app-confirm-box m303-exo-box"><header><p class="eyebrow">MODELO 390</p><h3>No se presentará el resumen anual</h3><p class="app-confirm-sub">El sujeto pasivo queda exonerado del modelo 390 porque cumple uno de estos supuestos. Confirma a la derecha el volumen de operaciones del ejercicio, que se declara en este 303 del 4T.</p></header>
      <div class="m303-exo-cols"><div class="m303-exo-left"><ul class="app-confirm-steps">
        <li><span>1</span><p>Liquida el IVA por trimestres, tributa solo en territorio común y su actividad es exclusivamente en régimen simplificado y/o arrendamiento de bienes inmuebles urbanos (aunque tenga otras actividades sin obligación de presentar 303).</p></li>
        <li><span>2</span><p>Lleva los Libros registro del IVA a través de la Sede electrónica de la AEAT (SII, art. 62.6 RIVA).</p></li>
        <li><span>!</span><p>Al aceptar, el modelo 390 de este ejercicio queda bloqueado y se marca como «No obligada» en Control de declaraciones.</p></li></ul>
        <div class="m303-exo-ids"><label class="td-cf"><small>B · Clave de actividad principal</small><select data-x="exClave">${EXO_CLAVES.map(k=>`<option${(f.exClave||"A03")===k?" selected":""}>${k}</option>`).join("")}</select></label>
          <label class="td-cf"><small>C · Epígrafe IAE principal</small><input data-x="exEpigrafe" maxlength="4" value="${escapeHtml(f.exEpigrafe||"")}" placeholder="p. ej. 5056"></label>
          <label class="td-cf"><small>D · Obligado a presentar el 347</small><select data-x="exD347"><option value="1"${f.exD347?" selected":""}>Sí</option><option value=""${f.exD347?"":" selected"}>No</option></select></label></div></div>
        <div class="m303-exo-right"><div class="m303-exo-title">Operaciones realizadas en el ejercicio</div><table class="m303-t c1 m303-exo"><tbody>${exoRows(x,"data-xn")}
          <tr class="m303-res"><td class="m303-l"><b>Total volumen de operaciones (art. 121 LIVA)</b></td><td>${cell("88",`<span class="m303-out" data-x88>${tdEur(x.v["88"])}</span>`)}</td></tr></tbody></table>
          <p class="m303-exo-warn" hidden>No se ha rellenado el volumen de operaciones (casilla 88).</p></div></div>
      <footer><button type="button" class="secondary-button" data-x-btn="0">Cancelar</button><button type="button" class="primary blue-button" data-x-btn="1">Aceptar y bloquear el 390</button></footer></div>`;
    const value=n=>{const i=shade.querySelector(`[data-xn="${n}"]`);return i.value.trim()===""?x.auto[n]:tdRound(num(i.value))};
    const total=()=>tdRound(EXO.reduce((s2,[n,,neg])=>s2+(neg?-value(n):value(n)),0));
    const refresh=()=>{const t=total();shade.querySelector("[data-x88]").textContent=tdEur(t);shade.querySelector(".m303-exo-warn").hidden=t!==0};
    shade.addEventListener("input",event=>{if(event.target.matches("[data-xn]")){event.target.classList.toggle("manual",event.target.value.trim()!=="");refresh()}});
    const done=v=>{document.removeEventListener("keydown",keys);shade.classList.add("out");setTimeout(()=>shade.remove(),160);resolve(v)};
    const keys=e=>{if(e.key==="Escape")done(false)};
    shade.addEventListener("click",async event=>{const b=event.target.closest("[data-x-btn]");if(!b){if(event.target===shade)done(false);return}
      if(b.dataset.xBtn!=="1")return done(false);
      if(total()===0){refresh();const go=await appConfirm({eyebrow:"CONTROL",title:"Falta el volumen de operaciones",message:"No se ha rellenado el apartado «Operaciones realizadas en el ejercicio» (casilla 88 a cero). Los exonerados del 390 deben declararlo en el 303 del último periodo.",ok:"Continuar sin rellenar",cancel:"Rellenar ahora"});if(!go)return}
      save(period,m=>{m.exo={...(m.exo||{})};EXO.forEach(([n])=>{const i=shade.querySelector(`[data-xn="${n}"]`),raw=i.value.trim();if(raw===""||Math.abs(num(raw)-x.auto[n])<0.005)delete m.exo[n];else m.exo[n]=num(raw)});
        shade.querySelectorAll("[data-x]").forEach(i=>{const k=i.dataset.x;m.f[k]=k==="exD347"?i.value==="1":i.value.trim().toUpperCase()})});
      done(true)});
    document.addEventListener("keydown",keys);document.body.append(shade);shade.querySelector('[data-x-btn="1"]').focus();refresh();
  });
}
// Control al confirmar el 303 del 4T de un exonerado: el volumen de operaciones (88) tiene que estar relleno.
document.addEventListener("click",async event=>{
  const b=event.target.closest?.("#tdMain [data-td-confirm]");if(!b||b.dataset.exoOk==="1"||taxDrafts.model!==M||taxDrafts.open!=="4T")return;
  const m=st("4T");if(!m.f?.exonerado||exoCalc("4T").v["88"]!==0)return;
  event.preventDefault();event.stopImmediatePropagation();
  const go=await appConfirm({eyebrow:"CONTROL",title:"Falta el volumen de operaciones",message:"El sujeto pasivo está exonerado del 390 y no se ha rellenado el apartado «Operaciones realizadas en el ejercicio» (casilla 88 a cero). Revísalo en la pestaña «Información adicional».",ok:"Confirmar igualmente",cancel:"Revisar"});
  if(go){b.dataset.exoOk="1";b.click();delete b.dataset.exoOk}else{taxDrafts.m303Tab="info";renderTaxDraftMain()}
},true);
function bind(card,period){
  const rerender=()=>renderTaxDraftMain();
  card.querySelector("[data-m303-reset]")?.addEventListener("click",event=>{const which=event.currentTarget.dataset.m303Reset,fields=which==="ded"?DED.flatMap(([,b,cu])=>[b,cu]).filter(Boolean):DEV.flatMap(([,b,t,cu])=>[b,t,cu]).filter(Boolean);save(period,m=>{fields.forEach(n=>delete m.v[n])});rerender()});
  card.querySelectorAll("[data-m303-roweye]").forEach(b=>b.addEventListener("click",()=>{sideFilter=b.dataset.casilla;openTaxDraftSide(b.dataset.m303Roweye==="ded"?"ded303":"iva303",taxDraftBuild(M,period))}));
  card.querySelector("[data-m303-eye]")?.addEventListener("click",event=>openTaxDraftSide(event.currentTarget.dataset.m303Eye==="ded"?"ded303":"iva303",taxDraftBuild(M,period)));
  card.querySelectorAll("[data-m303-tab]").forEach(b=>b.addEventListener("click",()=>{taxDrafts.m303Tab=b.dataset.m303Tab;rerender()}));
  card.querySelectorAll("[data-m303]").forEach(input=>input.addEventListener("change",()=>{const n=input.dataset.m303,raw=input.value.trim(),auto=calc(period).c["auto"+n];
    save(period,m=>{if(raw===""||auto!==undefined&&auto!==0&&Math.abs(num(raw)-auto)<0.005)delete m.v[n];else m.v[n]=num(raw)});rerender()}));
  card.querySelectorAll("[data-m303date]").forEach(input=>input.addEventListener("change",()=>{const i=Number(input.dataset.m303date);save(period,m=>{const parts=[m.f.concDia||"",m.f.concMes||"",m.f.concAnio||""];parts[i]=input.value.replace(/\D/g,"");[m.f.concDia,m.f.concMes,m.f.concAnio]=parts;
    m.f.fechaConcurso=parts[0]&&parts[1]&&/^\d{4}$/.test(parts[2])?parts[0].padStart(2,"0")+parts[1].padStart(2,"0")+parts[2]:""});rerender()}));
  card.querySelectorAll("[data-m303conc]").forEach(input=>input.addEventListener("change",()=>{save(period,m=>{m.f.tipoConcurso=input.dataset.m303conc});rerender()}));
  card.querySelectorAll("[data-m303exo]").forEach(input=>input.addEventListener("change",()=>{const n=input.dataset.m303exo,raw=input.value.trim(),auto=exoCalc(period).auto[n];
    save(period,m=>{m.exo={...(m.exo||{})};if(raw===""||Math.abs(num(raw)-auto)<0.005)delete m.exo[n];else m.exo[n]=num(raw)});rerender()}));
  card.querySelectorAll("[data-m303exof]").forEach(input=>input.addEventListener("change",()=>{const f=input.dataset.m303exof;save(period,m=>{m.f[f]=f==="exD347"?input.value==="1":input.value.trim().toUpperCase()});rerender()}));
  card.querySelectorAll("[data-m303flag]").forEach(input=>input.addEventListener("change",async()=>{
    const flag=input.dataset.m303flag;
    // Exonerado del 390: se avisa de los supuestos y, al aceptar, el resumen anual queda bloqueado (No obligada en Control).
    if(flag==="exonerado"&&input.checked){
      const ok=await exoDialog(period);
      if(!ok){input.checked=false;return}
    }
    save(period,m=>{m.f[flag]=input.checked});
    if(flag==="exonerado"){const year=taxDraftYear(),key=declarationKey("390","4T",taxDrafts.client,year),data=declarationData("390","4T",taxDrafts.client,year);
      if(input.checked){data.notRequired=true;data.exonerado303=true}else if(data.exonerado303){delete data.notRequired;delete data.exonerado303}localStorage.setItem(key,JSON.stringify(data))}
    rerender()}));
  card.querySelectorAll("[data-m303f]").forEach(input=>input.addEventListener("change",()=>{const f=input.dataset.m303f;save(period,m=>{
    if(input.type==="checkbox"){m[f]=input.checked;if(f==="rect"&&!input.checked){m.justificante="";m.bajaDomiciliacion=false;delete m.v["111"]}}
    else m[f]=f==="justificante"?input.value.replace(/\D/g,"").slice(0,13):f==="iban"||f==="swift"?input.value.replace(/\s+/g,"").toUpperCase():input.value});syncControl(period);rerender()}));
  card.querySelector("[data-m303-file]")?.addEventListener("click",()=>download303(currentDraft(period)));
}
const previousMain=renderTaxDraftMain;
renderTaxDraftMain=function(){
  // Sin base de AMCOMTA el 303 se rellena igualmente a mano.
  const original=taxDrafts.base,vacia=taxDrafts.model===M&&taxDrafts.client&&!taxDrafts.loading&&(!original||!Array.isArray(original.retencionesIrpf));
  if(vacia)taxDrafts.base={manual:true,resultados:[],retencionesIrpf:[],retencionesSoportadas:[],pagosACuenta:[]};
  let res;try{res=previousMain.apply(this,arguments)}finally{if(vacia)taxDrafts.base=original}
  const box=document.querySelector("#tdMain");
  if(box&&taxDrafts.model===M&&box.querySelector(".td-table")){
    const th=box.querySelectorAll(".td-table thead th");if(th.length>=4){th[1].textContent="IVA devengado";th[2].textContent="IVA deducible";th[3].textContent="Resultado"}
    const card=box.querySelector(".td-detail .td-card");if(card&&/^\dT$/.test(taxDrafts.open||"")){syncControl(taxDrafts.open);bind(card,taxDrafts.open)}
  }
  return res;
};
// Al confirmar se guardan también las marcas, la forma de pago y la rectificativa.
if(typeof confirmTaxDraft==="function"){const previous=confirmTaxDraft;confirmTaxDraft=function(){
  const period=taxDrafts.open,model=taxDrafts.model,res=previous.apply(this,arguments);
  if(model===M&&period){const year=taxDraftYear(),key=declarationKey(M,period,taxDrafts.client,year),data=declarationData(M,period,taxDrafts.client,year);
    if(data.draft){const r=calc(period);data.draft.m303={c:r.c,m:r.m,tipo:r.tipo,code:r.code,iban:r.iban,swift:r.swift,exo:period==="4T"&&r.m.f.exonerado?exoCalc(period).v:null};localStorage.setItem(key,JSON.stringify(data))}}
  return res}}
function currentDraft(period){const saved=taxDraftControl(M,period).draft;return saved&&saved.model===M&&saved.m303?{...saved,cif:saved.cif||taxDrafts.clientData?.cif||"",client:saved.client||taxDrafts.client}:{...taxDraftBuild(M,period),m303:(()=>{const r=calc(period);return{c:r.c,m:r.m,tipo:r.tipo,code:r.code,iban:r.iban,swift:r.swift,exo:period==="4T"&&r.m.f.exonerado?exoCalc(period).v:null}})(),client:taxDrafts.client,cif:taxDrafts.clientData?.cif||""}}

/* --- Fichero AEAT (DR303 ejercicio 2026) --- */
const clean=v=>[...String(v||"").toUpperCase()].map(ch=>ch==="Ñ"||ch==="Ç"?ch:ch.normalize("NFD").replace(/[̀-ͯ]/g,"")).join("").replace(/[^A-Z0-9ÑÇ ]/g," ").replace(/\s+/g," ").trim();
const AN=(v,n)=>clean(v).slice(0,n).padEnd(n," ");
const RAW=(v,n)=>String(v||"").slice(0,n).padEnd(n," ");
const NUM=(v,n)=>String(Math.round(Math.abs(Number(v)||0)*100)).padStart(n,"0").slice(-n);
const SIG=(v,n)=>{const cents=Math.round((Number(v)||0)*100),d=String(Math.abs(cents)).padStart(n,"0").slice(-n);return cents<0?"N"+d.slice(1):d};
const RATE=v=>String(Math.round((Number(v)||0)*100)).padStart(5,"0").slice(-5);
function aeat303(draft){
  const x=draft.m303;if(!x)throw new Error("Vuelve a confirmar el borrador.");
  const c=x.c,m=x.m||{v:{},f:{}},f=m.f||{},year=String(draft.year),period=String(draft.period),last=period==="4T";
  const nif=String(draft.cif||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(nif.length!==9)throw new Error("Falta el NIF del cliente (ficha del cliente).");
  if(!/^\d{4}$/.test(year)||!/^[1-4]T$/.test(period))throw new Error("Ejercicio o período no válido.");
  const code=c["71"]>0?(x.code==="U"&&!x.iban?"I":x.code):c["71"]<0?x.code:"N";
  if((code==="D"||code==="X")&&!x.iban)throw new Error("Falta la cuenta para la devolución.");
  const yn=k=>f[k]?"1":"2";
  const fecha=f.concurso&&/^\d{8}$/.test(String(f.fechaConcurso||""))?f.fechaConcurso:" ".repeat(8);
  const flags="2"+yn("redeme")+(f.soloRS?"1":f.simplificado?"2":"3")+yn("conjunta")+yn("caja")+yn("destCaja")+(last?yn("prorrata"):" ")+(last?yn("revocacion"):" ")+yn("concurso")+fecha+(f.concurso&&["1","2"].includes(f.tipoConcurso)?f.tipoConcurso:" ")+yn("sii")+(last?yn("exonerado"):"0")+(last&&f.exonerado?yn("volumen"):"0")+"0";
  const m17=n=>NUM(c[n],17),s17=n=>SIG(c[n],17);
  let p1="<T30301000>"+" "+code+RAW(nif,9)+AN(draft.client.replace(/,/g," "),80)+year+period+flags
    +m17("150")+"00000"+m17("152")+m17("165")+"00000"+m17("167")+m17("01")+"00400"+m17("03")+m17("153")+"00000"+m17("155")+m17("04")+"01000"+m17("06")+m17("07")+"02100"+m17("09")
    +m17("10")+m17("11")+m17("12")+m17("13")+s17("14")+s17("15")+m17("156")+"00175"+m17("158")+m17("168")+"00050"+m17("170")+m17("16")+"00000"+m17("18")+m17("19")+"00140"+m17("21")+m17("22")+"00520"+m17("24")
    +s17("25")+s17("26")+s17("27")+["28","29","30","31","32","33","34","35","36","37","38","39"].map(m17).join("")+["40","41","42","43","44","45","46"].map(s17).join("");
  if(p1.length!==1035)throw new Error(`Error interno en la página 1 del 303 (${p1.length}).`);
  p1+=" ".repeat(521+13)+"</T30301000>";
  let p3="<T30303000>"+["59","60","120","122","123","124","62","63","74","75","76","64"].map(s17).join("")+RATE(c["65"])+s17("66")+m17("77")+m17("110")+m17("78")+m17("87")+s17("68")+s17("108")+s17("69")+m17("70")+m17("109")+m17("112")+s17("71")
    +(m.sinActividad?"X":" ")+(m.rect?"X":" ")+(m.rect?RAW(String(m.justificante||"").replace(/\D/g,""),13):" ".repeat(13))+(m.rect&&m.bajaDomiciliacion?"X":" ")+m17("111")+(m.rect&&m.motivo!=="2"?"X":" ")+(m.rect&&m.motivo==="2"?"X":" ");
  if(p3.length!==459)throw new Error(`Error interno en la página 3 del 303 (${p3.length}).`);
  p3+=" ".repeat(546)+"</T30303000>";
  // Página 4: exonerados del 390 en el último periodo (actividad y volumen de operaciones). Sin contenido no se incluye.
  let p4="";
  if(last&&f.exonerado){const e=x.exo||{},ex=k=>Number(e[k])||0;
    p4="<T30304000>"+" "+RAW(String(f.exClave||"A03").toUpperCase(),3)+RAW(String(f.exEpigrafe||"").replace(/[^0-9A-Z]/gi,"").toUpperCase(),4)+" ".repeat(35)+(f.exD347?"X":" ")+"0".repeat(25)
      +[...EXO.map(([n])=>n).slice(0,EXO.length),"88"].map(n=>SIG(ex(n),17)).join("");
    if(p4.length!==386)throw new Error(`Error interno en la página 4 del 303 (${p4.length}).`);
    p4+=" ".repeat(600)+"</T30304000>";}
  // Página DID: cuenta de domiciliación o devolución (también si la rectificativa tiene importe en la casilla 111).
  let did="";const iban=String(x.iban||"").replace(/\s+/g,"").toUpperCase();
  if(iban&&(["U","D","X","I","G"].includes(code)||m.rect&&c["111"]>0)){
    const sepa=code==="D"||code==="X"||(m.rect&&c["111"]>0)?(iban.startsWith("ES")?"1":code==="X"?"2":"1"):"0";
    did="<T303DID00>"+RAW(code==="X"?x.swift:"",11)+RAW(iban,34)+" ".repeat(70+35+30)+(code==="X"?RAW(iban.slice(0,2),2):"  ")+sepa+" ".repeat(617)+"</T303DID00>";
    if(did.length!==823)throw new Error("Error interno en la página DID del 303.");
  }
  const head=`T3030${year}${period}0000`,aux=(" ".repeat(70)+"AM01"+" ".repeat(4)+"B72758998").padEnd(300," ");
  if(p1.length!==1581||p3.length!==1017)throw new Error("Error interno en la longitud de las páginas del 303.");
  return `<${head}><AUX>${aux}</AUX>${p1}${p3}${p4}${did}</${head}>`;
}
window.aeat303=aeat303;
function download303(draft){
  try{const text=aeat303(draft),bytes=new Uint8Array([...text].map(ch=>{const code=ch.charCodeAt(0);return code<256?code:32}));
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([bytes],{type:"application/octet-stream"}));a.download=`${String(draft.cif||"").toUpperCase()}_303_${draft.year}_${draft.period}.303`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
  catch(error){alert(error.message)}
}
// Borrador confirmado: impreso por páginas y botón para descargar el fichero.
if(typeof taxDraftFormHtml==="function"){const previousForm=taxDraftFormHtml;taxDraftFormHtml=function(draft,client={}){
  if(draft.model!==M||!draft.m303)return previousForm.apply(this,arguments);
  const c=draft.m303.c,tipo=[...TIPOS_INGRESO,...TIPOS_NEG,...TIPOS_CERO].find(t=>t[0]===draft.m303.tipo),f=draft.m303.m?.f||{};
  const v=n=>tdFormMoney(c[n]);const row=(label,ns)=>`<div class="af-row"><span class="af-label">${label}</span>${ns.map(n=>`<div class="af-cell"><div class="af-box"><b>${n}</b><span>${escapeHtml(n?v(n):"")}</span></div></div>`).join("")}</div>`;
  return `<div class="aeat-form m303f"><div class="af-watermark">BORRADOR</div>
    <div class="af-head"><div class="af-agency"><strong>Agencia Tributaria</strong><small>Documento preparado por Asesoría Molinero</small></div><div class="af-title"><strong>Impuesto sobre el Valor Añadido</strong><span>Autoliquidación</span><em>Ejercicio ${escapeHtml(draft.year)} · Período ${escapeHtml(draft.period)}</em></div><div class="af-model"><small>Modelo</small><b>303</b></div></div>
    <section class="af-sec"><div class="af-side">Identificación</div><div class="af-body"><div class="af-grid af-g2"><label><small>NIF</small><span>${escapeHtml(draft.cif||client.cif||"")}</span></label><label><small>Apellidos y nombre o razón social</small><span>${escapeHtml(draft.client||"")}</span></label></div>
      ${Object.entries(f).filter(([,on])=>on).map(([k])=>`<p class="af-line">✓ ${escapeHtml([...IDENT_L,...IDENT_R,...FLAGS,...FLAGS_4T].find(x=>x[0]===k)?.[1]||k)}</p>`).join("")}</div></section>
    <section class="af-sec"><div class="af-side">IVA devengado</div><div class="af-body">${DEV.filter(([,b,,cu])=>c[b]||c[cu]).map(([l,b,t,cu])=>row(l||"Régimen general",[b,cu].filter(Boolean))).join("")||'<p class="af-line">Sin importes.</p>'}${row("<strong>Total cuota devengada</strong>",["27"])}</div></section>
    <section class="af-sec"><div class="af-side">IVA deducible</div><div class="af-body">${DED.filter(([,b,cu])=>c[b]||c[cu]).map(([l,b,cu])=>row(l,[b,cu].filter(Boolean))).join("")||'<p class="af-line">Sin importes.</p>'}${row("<strong>Total a deducir</strong>",["45"])}${row("<strong>Resultado régimen general</strong>",["46"])}</div></section>
    ${INFO.some(([,n])=>c[n])?`<section class="af-sec"><div class="af-side">Información adicional</div><div class="af-body">${INFO.filter(([,n])=>c[n]).map(([l,n])=>row(l,[n])).join("")}</div></section>`:""}
    <section class="af-sec"><div class="af-side">Resultado</div><div class="af-body">${["76","64","66","77","110","78","87","68","108","69","70","109"].filter(n=>c[n]||["64","66","69"].includes(n)).map(n=>row(LABEL[n],[n])).join("")}<div class="af-total">${row(`<strong>${LABEL["71"]}</strong>`,["71"])}</div></div></section>
    <section class="af-sec"><div class="af-side">Pago</div><div class="af-body"><p class="af-line">Tipo de declaración: <b>${escapeHtml(tipo?.[1]||"")}</b></p>${draft.m303.iban&&!["C","N","V"].includes(draft.m303.code)?`<p class="af-line"><small>IBAN</small> <b>${escapeHtml(String(draft.m303.iban).replace(/(.{4})/g,"$1 ").trim())}</b></p>`:""}</div></section>
    <p class="af-foot">Borrador preparado por Asesoría Molinero${draft.confirmedBy?` · confirmado por ${escapeHtml(draft.confirmedBy)}`:""}. No válido para su presentación.</p></div>`;
}}
if(typeof openConfirmedTaxDraft==="function"){const previousOpen=openConfirmedTaxDraft;openConfirmedTaxDraft=async function(key){
  await previousOpen.apply(this,arguments);let data={};try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
  const draft=data.draft,actions=document.querySelector("#tdDraftView .td-form-actions");
  if(draft?.model===M&&draft.m303&&actions&&!actions.querySelector("[data-m303-download]")){const b=document.createElement("button");b.type="button";b.className="secondary-button";b.dataset.m303Download="1";b.textContent="Fichero AEAT";b.addEventListener("click",()=>download303({...draft,cif:draft.cif||taxDrafts.clientData?.cif||""}));actions.prepend(b)}
}}
(function(){const style=document.createElement("style");style.textContent=`
.m303-wrap{margin:0 20px 10px}.m303-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0 10px;position:sticky;top:0;z-index:2;background:inherit}.m303-tabs::-webkit-scrollbar{display:none}
.m303-tabs button{flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:1px;border:1px solid #d8deea;border-radius:12px;background:#fff;padding:7px 14px;font:inherit;font-size:13px;font-weight:700;color:#1d2a44;cursor:pointer}
.m303-tabs button small{font-size:11px;font-weight:600;color:#69748a;font-variant-numeric:tabular-nums}.m303-tabs button.on{background:#14279b;border-color:#14279b;color:#fff}.m303-tabs button.on small{color:#cfd8ff}
.m303-page{border:1px solid #e3e7ef;border-radius:14px;background:#fff;padding:8px 12px 12px;overflow-x:auto}
.m303-t{width:100%;border-collapse:collapse;margin:2px 0 8px}.m303-t th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#69748a;text-align:left;padding:6px 6px 4px;font-weight:700}
.m303-t td{padding:4px 6px;vertical-align:middle}.m303-l{font-size:12.5px;color:#1d2a44;line-height:1.3;min-width:200px}.m303-l small{color:#69748a}
.m303-t tr.m303-sep td{border-top:1px solid #eef0f5;padding-top:8px}.m303-t tfoot td{border-top:2px solid #1d2a44;padding-top:8px}.m303-t tr.m303-res td{background:#f4f6ff}.m303-t tr.m303-res .m303-out{font-size:15px;color:#14279b}.m303-t tr.m303-strong .m303-l{font-weight:800}
.m303-cell{display:flex;align-items:center;border:1px solid #dfe4ee;border-radius:9px;overflow:hidden;background:#fff;min-width:150px}.m303-n{flex:none;width:36px;text-align:center;font-size:11px;font-weight:800;color:#56627c;background:#f1f3f7;align-self:stretch;display:flex;align-items:center;justify-content:center}
.m303-in{flex:1;min-width:0;width:100%;height:32px;border:0;padding:0 9px;text-align:right;font:inherit;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;background:transparent}.m303-in::placeholder{color:#8a93a6;font-weight:600}.m303-in.manual{background:#fff4e5}
.m303-in.short{max-width:80px}.m303-out{flex:1;text-align:right;padding:0 10px;font-weight:800;font-variant-numeric:tabular-nums;line-height:32px}
.m303-hint{margin:6px 2px;font-size:12px;color:#69748a}
.m303-src{display:flex;justify-content:flex-end;margin:0 10px 4px}.m303-eyebtn{display:inline-flex;align-items:center;gap:6px;border:1px solid #8ea3cf;background:#fff;color:#163b8c;border-radius:8px;padding:4px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.m303-eyebtn:hover{background:#f4f6ff}.m303-src{gap:8px}
.m303-roweye{display:grid;flex:none;place-items:center;width:24px;height:22px;margin:0 0 0 2px;border:1px solid #8ea3cf;border-radius:6px;background:#fff;color:#163b8c;cursor:pointer;padding:0}.m303-roweye svg{width:15px;height:15px}.m303-roweye:hover{background:#163b8c;color:#fff}.m303-roweye.off{border-color:transparent;background:transparent;cursor:default}.m303-cell .m303-roweye{height:24px;width:28px;margin:0 -4px 0 0;border:0;border-left:1px solid #163b8c;border-bottom:1px solid #163b8c;border-radius:0;background:#fff}.m303-cell .m303-roweye:hover{background:#163b8c;color:#fff}.m303-cell .m303-roweye+.m303-in{border-left:0}@media(max-width:760px){.m303-cell .m303-roweye{height:32px}}.m303-eyebtn.warn{border-color:#e0a23a;color:#9a5b00;background:#fff7e8}
.m303-ident{display:grid;gap:8px;padding:4px}.m303-ident h6{margin:8px 0 0;font-size:12px;color:#14279b;text-transform:uppercase;letter-spacing:.04em}
.m303-check{display:flex;align-items:flex-start;gap:8px;font-size:13px;cursor:pointer;line-height:1.35}.m303-check input{margin-top:2px;accent-color:#14279b}
.m303-boxes{display:grid;gap:10px;margin-top:6px}.m303-rect{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:flex-end;border:1px solid #e3e7ef;border-radius:12px;padding:10px 12px;background:#fafbfd}.m303-rect.on{background:#f3f6ff;border-color:#c9d2ef}.m303-rect .m303-check{width:100%}
.m303-rect .td-cf{flex:1 1 200px}.m303-rect .td-cf input,.m303-rect .td-cf select{width:100%;height:34px;border:1px solid #d8deea;border-radius:9px;padding:0 8px;font:inherit;font-size:13px}.m303-rect .td-cf .m303-in{border:1px solid #d8deea;border-radius:9px}
.m303-pago{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end;padding:6px}.m303-pago-res{display:flex;flex-direction:column;padding:8px 14px;border-radius:12px;background:#f4f6ff;margin-right:8px}.m303-pago-res span{font-size:11px;color:#56627c;font-weight:700;text-transform:uppercase}.m303-pago-res b{font-size:18px;color:#14279b}
.m303-pago .td-cf{flex:1 1 280px}.m303-pago .td-cf.short{flex:0 1 160px}.m303-pago select,.m303-pago input{width:100%;height:36px;border:1px solid #c9d3ea;border-radius:9px;padding:0 8px;font:inherit;font-size:13px;font-weight:600}.m303-pago .m303-hint{width:100%}
.m303-t{table-layout:fixed}.m303-t .m303-l{min-width:0;width:40%;white-space:normal}.m303-cell{min-width:0}.m303-t td:not(.m303-l){width:auto}
.m303-t tfoot tr{display:table-row!important}.m303-t td,.m303-t th{white-space:normal}
@media(max-width:760px){.m303-wrap{margin:0 4px 10px}.m303-page{padding:6px 8px 10px}
  .m303-t,.m303-t tbody,.m303-t tfoot{display:block!important;width:100%}.m303-t thead{display:none!important}
  .m303-t tr,.m303-t tfoot tr{display:grid!important;grid-template-columns:minmax(0,1fr);gap:6px;padding:8px 0;border-top:1px solid #eef0f5}
  .m303-t td{display:block!important;padding:0!important;border:0!important;width:auto!important;background:transparent}
  .m303-t td.m303-l{grid-column:1/-1;font-size:12.5px}.m303-t td.m303-l:empty{display:none!important}
  .m303-t.c2 tr{grid-template-columns:repeat(2,minmax(0,1fr))}.m303-t.c3 tr{grid-template-columns:minmax(0,1.1fr) minmax(0,.8fr) minmax(0,1.1fr)}.m303-t tfoot td:not(.m303-l){grid-column:1/-1}.m303-out{padding:0 6px;font-size:14px}
  .m303-n{width:30px;font-size:10.5px}.m303-in{height:38px;font-size:14px;padding:0 6px}.m303-out{line-height:38px}}`;document.head.append(style)})();
(function(){const style=document.createElement("style");style.textContent=`
/* Aspecto del impreso de la AEAT */
.m303-tabs{gap:4px;padding:0 0 8px}
.m303-tabs button{flex:1 1 auto;flex-direction:row;align-items:center;gap:10px;min-width:0;white-space:nowrap;justify-content:space-between;padding:5px 14px;border-radius:8px 8px 0 0;border-bottom:3px solid #d8deea;font-size:12.5px;line-height:1.2}
.m303-tabs button small{font-size:11.5px}.m303-tabs button.on{border-bottom-color:#0f2a6b;background:#163b8c}
.m303-page{border:1.5px solid #8ea3cf;border-radius:4px;background:#eef2fb;padding:0 0 10px}
.m303-sec{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin:0 0 6px}.m303-sec span{background:#163b8c;color:#fff;font-size:12px;font-weight:800;padding:4px 18px 4px 10px;border-radius:0 0 12px 0}.m303-sec em{font-style:normal;font-size:12px;font-weight:700;color:#163b8c}
.m303-t{margin:0 10px 6px;width:calc(100% - 20px)}.m303-t th{font-size:10.5px;text-transform:none;letter-spacing:0;color:#1d2a44;font-weight:600;padding:2px 6px}
.m303-t td{padding:2px 6px}.m303-t tr.m303-sep td{border-top:0;padding-top:2px}
.m303-l{font-size:12px;background-image:linear-gradient(to right,#8ea3cf 35%,transparent 0);background-size:5px 1px;background-repeat:repeat-x;background-position:0 78%}
.m303-l:empty{background:none}.m303-t.c1 .m303-l{width:68%}.m303-t.c1 .m303-cell{max-width:320px;margin-left:auto}
.m303-cell{border:0;border-radius:0;background:transparent;gap:4px;overflow:visible}
.m303-n{width:auto;min-width:26px;padding:0 3px;background:#fff;border:1px solid #163b8c;color:#163b8c;font-size:10px;height:18px;align-self:center;border-radius:1px}
.m303-in,.m303-out{height:24px;line-height:24px;background:#fff;border:0;border-left:1px solid #163b8c;border-bottom:1px solid #163b8c;border-radius:0;font-size:12.5px}
.m303-in{padding:0 6px}.m303-in::placeholder{color:#7d879b;font-weight:500}.m303-in.manual{background:#fff1d6}.m303-in.has-auto::placeholder{color:#0f2a6b;font-weight:800;opacity:1}.m303-in:focus{outline:2px solid #ffc94d;outline-offset:0}
.m303-out{padding:0 8px;font-weight:800}
.m303-t tfoot td{border-top:1px solid #163b8c}.m303-t tr.m303-res td{background:#dde5f6}.m303-t tr.m303-res .m303-out{color:#0f2a6b}
.m303-ident,.m303-pago,.m303-boxes{margin:0 10px}.m303-hint{margin:4px 12px}
.m303-rect{background:#fff;border-color:#8ea3cf;border-radius:4px}
.m303-idg{display:grid;grid-template-columns:1fr 1fr;gap:0 40px;padding:6px 14px 4px}
.m303-ck{display:flex;align-items:center;gap:8px;font-size:12px;color:#1d2a44;padding:3px 0;cursor:pointer;line-height:1.25}
.m303-ck span{flex:1;background-image:linear-gradient(to right,#8ea3cf 35%,transparent 0);background-size:5px 1px;background-repeat:repeat-x;background-position:0 88%}
.m303-ck input{appearance:none;-webkit-appearance:none;flex:none;width:17px;height:17px;margin:0;border:1px solid #163b8c;background:#fff;box-shadow:2px 2px 0 #8ea3cf;border-radius:1px;cursor:pointer;display:grid;place-items:center}
.m303-ck input:checked::after{content:"X";font-size:12px;font-weight:800;color:#0f2a6b;line-height:1}.m303-ck input[type=radio]{border-radius:1px}
.m303-ck.off{color:#9aa3b5;cursor:not-allowed}.m303-ck.off input{border-color:#b8c2d8;box-shadow:none;background:#f1f3f7;cursor:not-allowed}
.m303-conc{display:flex;align-items:center;gap:14px;margin:10px 0 4px 18px;font-size:11.5px;color:#1d2a44}.m303-conc>span{flex:1;max-width:260px}.m303-conc.off{opacity:.45}
.m303-date{display:flex;gap:3px}.m303-date label{display:flex;flex-direction:column;align-items:center;gap:1px}.m303-date small{font-size:10px;color:#1d2a44}
.m303-date input{width:34px;height:22px;border:1px solid #163b8c;text-align:center;font:inherit;font-size:12px;font-weight:700;background:#fff;box-shadow:2px 2px 0 #8ea3cf}.m303-date input.y{width:52px}
.m303-pp{display:flex;flex-direction:column;gap:2px;border-left:1px solid #163b8c;padding-left:8px}.m303-pp .m303-ck span{background:none}
@media(max-width:760px){.m303-idg{grid-template-columns:1fr;padding:6px 8px}.m303-conc{margin-left:0;flex-wrap:wrap}}.m303-rect.on{background:#f6f8ff}
@media(max-width:760px){.m303-tabs button{min-width:130px}.m303-t{margin:0 6px 6px;width:calc(100% - 12px)}.m303-l{background:none}.m303-in{height:32px}.m303-out{line-height:32px;height:32px}}`;document.head.append(style)})();
/* Recuadro de ayuda al pasar por una casilla: número + texto de las instrucciones de la AEAT */
(function(){
  let tip=null,timer=0,current=null;
  const hide=()=>{clearTimeout(timer);current=null;if(tip){tip.classList.remove("on")}};
  function show(el){
    const key=el.dataset.m303Help,flag=key.startsWith("f:"),text=flag?FLAG_HELP[key.slice(2)]:HELP[key];if(!text)return;
    if(!tip){tip=document.createElement("div");tip.className="m303-tip";tip.setAttribute("role","tooltip");document.body.append(tip)}
    let label=flag?"":(el.closest("tr")?.querySelector(".m303-l")?.textContent||"").replace(/\s*\(.*\)\s*$/,"").trim();if(label&&text.toLowerCase().startsWith(label.slice(0,24).toLowerCase()))label="";
    tip.innerHTML=`<div class="m303-tip-h">${flag?"<span>Identificación</span>":`<b>${escapeHtml(key)}</b><span>Casilla ${escapeHtml(key)}</span>`}</div>${label?`<p class="m303-tip-l">${escapeHtml(label)}</p>`:""}<p>${escapeHtml(text)}</p>${!flag&&HELP_MORE[key]?`<div class="m303-tip-more">${HELP_MORE[key]}</div>`:""}<small>Instrucciones del modelo 303 · AEAT 2026${!flag&&HELP_MORE[key]?" · ejemplos del despacho":""}</small>`;
    tip.classList.toggle("wide",Boolean(!flag&&HELP_MORE[key]));
    tip.classList.add("on");
    const r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
    let left=Math.min(Math.max(8,r.left+r.width/2-w/2),window.innerWidth-w-8),top=r.top-h-10,below=false;
    if(top<8){top=r.bottom+10;below=true}if(top+h>window.innerHeight-8){top=Math.max(8,window.innerHeight-h-8);below=false;tip.classList.add("noarrow")}else tip.classList.remove("noarrow");
    tip.style.left=left+"px";tip.style.top=top+"px";tip.classList.toggle("below",below);
    tip.style.setProperty("--ax",Math.min(w-16,Math.max(16,r.left+r.width/2-left))+"px");
  }
  document.addEventListener("mouseover",event=>{const el=event.target.closest?.("[data-m303-help]");if(el===current)return;hide();if(!el)return;current=el;timer=setTimeout(()=>show(el),350)});
  document.addEventListener("focusin",event=>{const el=event.target.closest?.("[data-m303-help]");if(el){current=el;clearTimeout(timer);timer=setTimeout(()=>show(el),350)}});
  document.addEventListener("focusout",hide);document.addEventListener("scroll",hide,true);document.addEventListener("keydown",event=>{if(event.key==="Escape")hide()});
})();
if(document.querySelector("#tdModels")&&taxDrafts.client){renderTaxDraftModels();renderTaxDraftMain()}
})();
