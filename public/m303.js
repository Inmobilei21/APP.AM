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
const st=period=>{const m=taxDraftControl(M,period).m303||{};m.v=m.v||{};m.f=m.f||{};return m};
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

/* --- Cálculo --- */
function calc(period){
  const m=st(period),v=m.v,q=Number(period[0]),c={};
  const val=n=>num(v[n]);
  for(const [,b,t,cu,rate] of DEV){
    if(b)c[b]=val(b);if(t)c[t]=rate!==null&&rate!==undefined?rate:val(t);
    const r=rate!==null&&rate!==undefined?rate:(t?val(t):0),auto=b&&r?tdRound(c[b]*r/100):0;
    c[cu]=has(v[cu])?tdRound(val(cu)):auto;c["auto"+cu]=auto;
  }
  c["27"]=tdRound(["152","167","03","155","06","09","11","13","15","158","170","18","21","24","26"].reduce((s,n)=>s+c[n],0));
  for(const [,b,cu] of DED){if(b)c[b]=tdRound(val(b));c[cu]=tdRound(val(cu))}
  c["45"]=tdRound(["29","31","33","35","37","39","41","42","43","44"].reduce((s,n)=>s+c[n],0));
  c["46"]=tdRound(c["27"]-c["45"]);
  for(const [,n] of INFO)c[n]=tdRound(val(n));for(const n of ["62","63","74","75","76","77","68","108","70","109"])c[n]=tdRound(val(n));
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
  return{c,m,q,tipo,code,tipos:list,iban:m.iban??(pref||ibans[0]||""),swift:m.swift||"",sinActividad:m.sinActividad===true,rect:m.rect===true};
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
      if(!Object.keys(r.m.v).length)out.push('<div class="td-check warn">⚠ <div><b>Sin datos</b>De momento el 303 se rellena a mano: abre cada página con los botones de arriba.</div></div>');
      if(c["71"]<0&&r.tipo==="D"&&r.q!==4&&!r.m.f.redeme)out.push('<div class="td-check warn">⚠ <div><b>Devolución fuera del 4T</b>Solo se puede pedir la devolución en el último periodo, salvo inscritos en el REDEME. Lo habitual es «A compensar».</div></div>');
      if((r.code==="U"||r.code==="D")&&!r.iban)out.push('<div class="td-check warn">⚠ <div><b>Falta la cuenta</b>Elige el IBAN en la página «Forma de pago» o añádelo en la ficha del cliente.</div></div>');
      if(r.code==="X"&&!r.swift)out.push('<div class="td-check warn">⚠ <div><b>Falta el código SWIFT-BIC</b>Hace falta para la devolución a una cuenta del extranjero.</div></div>');
      if(r.rect&&!/^\d{13}$/.test(String(r.m.justificante||"")))out.push('<div class="td-check warn">⚠ <div><b>Rectificativa sin justificante</b>Indica el número de justificante (13 cifras) de la autoliquidación anterior.</div></div>');
      if(c["110"]&&c["78"]<c.auto78-0.004)out.push(`<div class="td-check ok">✓ <div><b>Compensación parcial</b>Quedan ${tdEur(c["87"])} por compensar en periodos posteriores.</div></div>`);
      if(Object.keys(r.m.v).length&&!out.some(x=>x.includes("warn")))out.push(`<div class="td-check ok">✓ <div><b>Resultado ${c["71"]>0?"a ingresar":c["71"]<0?"a compensar o devolver":"cero"}</b>${tdEur(c["71"])} · ${escapeHtml(r.tipos.find(t=>t[0]===r.tipo)[1])}.</div></div>`);
      return out;
    }};
};

/* --- Pantalla: una página del modelo cada vez --- */
const PAGES=[["ident","Identificación"],["dev","IVA devengado"],["ded","IVA deducible"],["info","Información adicional"],["res","Resultado"],["pago","Forma de pago"]];
function moneyInput(n,r,{auto,signed}={}){const v=r.m.v[n];return `<input class="m303-in${has(v)&&auto!==undefined?" manual":""}" data-m303="${n}" inputmode="decimal" value="${escapeHtml(inputValue(v))}" placeholder="${auto!==undefined?escapeHtml(inputValue(auto)||"0,00"):"0,00"}" title="${signed?"Admite importes negativos":""}">`}
const cell=(n,content)=>`<div class="m303-cell"><span class="m303-n">${n}</span>${content}</div>`;
const out=v=>`<span class="m303-out">${tdEur(v)}</span>`;
function pageDev(r){
  const c=r.c;
  return `<table class="m303-t c3"><thead><tr><th></th><th>Base imponible</th><th>Tipo %</th><th>Cuota</th></tr></thead><tbody>${DEV.map(([label,b,t,cu,rate,signed],i)=>`<tr${label&&i?' class="m303-sep"':""}><td class="m303-l">${escapeHtml(label)}</td>
    <td>${b?cell(b,moneyInput(b,r,{signed})):""}</td><td>${t?cell(t,rate!==null&&rate!==undefined?`<span class="m303-out">${String(rate).replace(".",",")}</span>`:`<input class="m303-in short" data-m303="${t}" inputmode="decimal" value="${escapeHtml(has(r.m.v[t])?String(r.m.v[t]).replace(".",","):"")}" placeholder="%">`):""}</td>
    <td>${cell(cu,moneyInput(cu,r,{auto:c["auto"+cu],signed}))}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td class="m303-l" colspan="3"><b>${LABEL["27"]}</b> <small>(152 + 167 + 03 + 155 + 06 + 09 + 11 + 13 + 15 + 158 + 170 + 18 + 21 + 24 + 26)</small></td><td>${cell("27",out(c["27"]))}</td></tr></tfoot></table>
    <p class="m303-hint">La cuota se calcula con el tipo de la casilla; si escribes otra, manda la tuya (en naranja).</p>`;
}
function pageDed(r){
  const c=r.c;
  return `<table class="m303-t c2"><thead><tr><th></th><th>Base</th><th>Cuota</th></tr></thead><tbody>${DED.map(([label,b,cu,signed])=>`<tr><td class="m303-l">${escapeHtml(label)}</td><td>${b?cell(b,moneyInput(b,r,{signed})):""}</td><td>${cell(cu,moneyInput(cu,r,{signed}))}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td class="m303-l" colspan="2"><b>${LABEL["45"]}</b> <small>(29 + 31 + 33 + 35 + 37 + 39 + 41 + 42 + 43 + 44)</small></td><td>${cell("45",out(c["45"]))}</td></tr>
    <tr class="m303-res"><td class="m303-l" colspan="2"><b>${LABEL["46"]}</b></td><td>${cell("46",out(c["46"]))}</td></tr></tfoot></table>`;
}
function pageInfo(r){
  return `<table class="m303-t c1"><tbody>${INFO.map(([l,n])=>`<tr><td class="m303-l">${escapeHtml(l)}</td><td colspan="2">${cell(n,moneyInput(n,r,{signed:true}))}</td></tr>`).join("")}</tbody></table>
    <table class="m303-t c2"><thead><tr><th></th><th>Base imponible</th><th>Cuota</th></tr></thead><tbody>
    <tr><td class="m303-l">Entregas y servicios con criterio de caja que habrían resultado devengadas por la regla general (art. 75 LIVA)</td><td>${cell("62",moneyInput("62",r))}</td><td>${cell("63",moneyInput("63",r))}</td></tr>
    <tr><td class="m303-l">Adquisiciones de bienes y servicios a las que sea de aplicación o afecte el régimen especial del criterio de caja</td><td>${cell("74",moneyInput("74",r))}</td><td>${cell("75",moneyInput("75",r))}</td></tr></tbody></table>`;
}
function pageRes(r){
  const c=r.c,line=(n,content,cls="")=>`<tr class="${cls}"><td class="m303-l">${escapeHtml(LABEL[n])}</td><td>${cell(n,content)}</td></tr>`,m=r.m;
  return `<table class="m303-t c1"><tbody>${line("76",moneyInput("76",r,{signed:true}))}${line("64",out(c["64"]))}
    ${line("65",`<input class="m303-in short" data-m303="65" inputmode="decimal" value="${escapeHtml(has(m.v["65"])?String(m.v["65"]).replace(".",","):"")}" placeholder="100,00">`)}${line("66",out(c["66"]))}${line("77",moneyInput("77",r))}
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
function pageIdent(r){
  const f=r.m.f,ck=(k,l)=>`<label class="m303-check"><input type="checkbox" data-m303flag="${k}"${f[k]?" checked":""}><span>${escapeHtml(l)}</span></label>`;
  return `<div class="m303-ident"><p class="m303-hint">${escapeHtml(taxDrafts.clientData?.cif||"")} · ${escapeHtml(taxDrafts.client)} · ejercicio ${taxDraftYear()} · ${escapeHtml(r.q?`${r.q}T`:"")}</p>${FLAGS.map(([k,l])=>ck(k,l)).join("")}
    ${r.q===4?`<h6>Solo en el último periodo</h6>${FLAGS_4T.map(([k,l])=>ck(k,l)).join("")}`:'<p class="m303-hint">Las opciones de prorrata especial y de exoneración del 390 solo se marcan en el 4T.</p>'}</div>`;
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
  const body={ident:pageIdent,dev:pageDev,ded:pageDed,info:pageInfo,res:pageRes,pago:pagePago}[tab](r);
  return `<div class="m303"><nav class="m303-tabs">${PAGES.map(([k,l])=>`<button type="button" class="${k===tab?"on":""}" data-m303-tab="${k}">${l}${k==="res"?`<small>${tdEur(r.c["71"])}</small>`:k==="dev"?`<small>${tdEur(r.c["27"])}</small>`:k==="ded"?`<small>${tdEur(r.c["45"])}</small>`:""}</button>`).join("")}</nav><div class="m303-page">${body}</div></div>`;
}
if(typeof taxDraftBoxes==="function"){const previous=taxDraftBoxes;taxDraftBoxes=function(boxes,withEyes=true,model=""){
  if(model===M&&taxDrafts.model===M&&/^\dT$/.test(taxDrafts.open||""))return grid(calc(taxDrafts.open));return previous.apply(this,arguments)}}
if(typeof taxDraftDetail==="function"){const previous=taxDraftDetail;taxDraftDetail=function(draft){const html=previous.apply(this,arguments);if(draft.model!==M)return html;
  return html.replace('<button type="button" class="secondary-button" data-td-copy>',`<button type="button" class="secondary-button" data-m303-file="${escapeHtml(draft.period)}">Fichero AEAT</button><button type="button" class="secondary-button" data-td-copy>`)}}
function syncControl(period){
  const year=taxDraftYear(),key=declarationKey(M,period,taxDrafts.client,year),data=declarationData(M,period,taxDrafts.client,year);if(data.notRequired)return;
  const value=CONTROL_PAGO[calc(period).tipo]||"N.R.C.";if(data.payment!==value){data.payment=value;localStorage.setItem(key,JSON.stringify(data))}
}
function bind(card,period){
  const rerender=()=>renderTaxDraftMain();
  card.querySelectorAll("[data-m303-tab]").forEach(b=>b.addEventListener("click",()=>{taxDrafts.m303Tab=b.dataset.m303Tab;rerender()}));
  card.querySelectorAll("[data-m303]").forEach(input=>input.addEventListener("change",()=>{const n=input.dataset.m303,raw=input.value.trim();save(period,m=>{if(raw==="")delete m.v[n];else m.v[n]=num(raw)});rerender()}));
  card.querySelectorAll("[data-m303flag]").forEach(input=>input.addEventListener("change",()=>{save(period,m=>{m.f[input.dataset.m303flag]=input.checked});rerender()}));
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
    if(data.draft){const r=calc(period);data.draft.m303={c:r.c,m:r.m,tipo:r.tipo,code:r.code,iban:r.iban,swift:r.swift};localStorage.setItem(key,JSON.stringify(data))}}
  return res}}
function currentDraft(period){const saved=taxDraftControl(M,period).draft;return saved&&saved.model===M&&saved.m303?{...saved,cif:saved.cif||taxDrafts.clientData?.cif||"",client:saved.client||taxDrafts.client}:{...taxDraftBuild(M,period),m303:(()=>{const r=calc(period);return{c:r.c,m:r.m,tipo:r.tipo,code:r.code,iban:r.iban,swift:r.swift}})(),client:taxDrafts.client,cif:taxDrafts.clientData?.cif||""}}

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
  const flags="2"+yn("redeme")+(f.simplificado?"2":"3")+yn("conjunta")+yn("caja")+yn("destCaja")+(last?yn("prorrata"):" ")+(last?yn("revocacion"):" ")+yn("concurso")+" ".repeat(8)+" "+yn("sii")+(last?yn("exonerado"):"0")+(last&&f.exonerado?yn("volumen"):"0")+"0";
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
  // Página DID: cuenta de domiciliación o devolución (también si la rectificativa tiene importe en la casilla 111).
  let did="";const iban=String(x.iban||"").replace(/\s+/g,"").toUpperCase();
  if(iban&&(["U","D","X","I","G"].includes(code)||m.rect&&c["111"]>0)){
    const sepa=code==="D"||code==="X"||(m.rect&&c["111"]>0)?(iban.startsWith("ES")?"1":code==="X"?"2":"1"):"0";
    did="<T303DID00>"+RAW(code==="X"?x.swift:"",11)+RAW(iban,34)+" ".repeat(70+35+30)+(code==="X"?RAW(iban.slice(0,2),2):"  ")+sepa+" ".repeat(617)+"</T303DID00>";
    if(did.length!==823)throw new Error("Error interno en la página DID del 303.");
  }
  const head=`T3030${year}${period}0000`,aux=(" ".repeat(70)+"AM01"+" ".repeat(4)+"B72758998").padEnd(300," ");
  if(p1.length!==1581||p3.length!==1017)throw new Error("Error interno en la longitud de las páginas del 303.");
  return `<${head}><AUX>${aux}</AUX>${p1}${p3}${did}</${head}>`;
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
      ${Object.entries(f).filter(([,on])=>on).map(([k])=>`<p class="af-line">✓ ${escapeHtml([...FLAGS,...FLAGS_4T].find(x=>x[0]===k)?.[1]||k)}</p>`).join("")}</div></section>
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
.m303{margin:0 20px 10px}.m303-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0 10px;position:sticky;top:0;z-index:2;background:inherit}.m303-tabs::-webkit-scrollbar{display:none}
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
.m303-ident{display:grid;gap:8px;padding:4px}.m303-ident h6{margin:8px 0 0;font-size:12px;color:#14279b;text-transform:uppercase;letter-spacing:.04em}
.m303-check{display:flex;align-items:flex-start;gap:8px;font-size:13px;cursor:pointer;line-height:1.35}.m303-check input{margin-top:2px;accent-color:#14279b}
.m303-boxes{display:grid;gap:10px;margin-top:6px}.m303-rect{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:flex-end;border:1px solid #e3e7ef;border-radius:12px;padding:10px 12px;background:#fafbfd}.m303-rect.on{background:#f3f6ff;border-color:#c9d2ef}.m303-rect .m303-check{width:100%}
.m303-rect .td-cf{flex:1 1 200px}.m303-rect .td-cf input,.m303-rect .td-cf select{width:100%;height:34px;border:1px solid #d8deea;border-radius:9px;padding:0 8px;font:inherit;font-size:13px}.m303-rect .td-cf .m303-in{border:1px solid #d8deea;border-radius:9px}
.m303-pago{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end;padding:6px}.m303-pago-res{display:flex;flex-direction:column;padding:8px 14px;border-radius:12px;background:#f4f6ff;margin-right:8px}.m303-pago-res span{font-size:11px;color:#56627c;font-weight:700;text-transform:uppercase}.m303-pago-res b{font-size:18px;color:#14279b}
.m303-pago .td-cf{flex:1 1 280px}.m303-pago .td-cf.short{flex:0 1 160px}.m303-pago select,.m303-pago input{width:100%;height:36px;border:1px solid #c9d3ea;border-radius:9px;padding:0 8px;font:inherit;font-size:13px;font-weight:600}.m303-pago .m303-hint{width:100%}
.m303-t{table-layout:fixed}.m303-t .m303-l{min-width:0;width:40%;white-space:normal}.m303-cell{min-width:0}.m303-t td:not(.m303-l){width:auto}
.m303-t tfoot tr{display:table-row!important}.m303-t td,.m303-t th{white-space:normal}
@media(max-width:760px){.m303{margin:0 4px 10px}.m303-page{padding:6px 8px 10px}
  .m303-t,.m303-t tbody,.m303-t tfoot{display:block!important;width:100%}.m303-t thead{display:none!important}
  .m303-t tr,.m303-t tfoot tr{display:grid!important;grid-template-columns:minmax(0,1fr);gap:6px;padding:8px 0;border-top:1px solid #eef0f5}
  .m303-t td{display:block!important;padding:0!important;border:0!important;width:auto!important;background:transparent}
  .m303-t td.m303-l{grid-column:1/-1;font-size:12.5px}.m303-t td.m303-l:empty{display:none!important}
  .m303-t.c2 tr{grid-template-columns:repeat(2,minmax(0,1fr))}.m303-t.c3 tr{grid-template-columns:minmax(0,1.1fr) minmax(0,.8fr) minmax(0,1.1fr)}.m303-t tfoot td:not(.m303-l){grid-column:1/-1}.m303-out{padding:0 6px;font-size:14px}
  .m303-n{width:30px;font-size:10.5px}.m303-in{height:38px;font-size:14px;padding:0 6px}.m303-out{line-height:38px}}`;document.head.append(style)})();
if(document.querySelector("#tdModels")&&taxDrafts.client){renderTaxDraftModels();renderTaxDraftMain()}
})();
