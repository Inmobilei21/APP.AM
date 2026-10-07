/* ===== Área fiscal › Borradores: modelos rellenados con la contabilidad de AMCOMTA ===== */
// Modelos 115 (retenciones de alquileres) y 111 (trabajo y profesionales). Los datos salen de la base de AMCOMTA
// del cliente (botón «Actualizar base»), y al confirmar un borrador se anotan la fecha de
// confección y el importe en Control de declaraciones.
const TAX_DRAFT_MODELS={
  "115":{title:"Retenciones de alquileres",ready:true},
  "111":{title:"Retenciones de trabajo y profesionales",ready:true},
  "303":{title:"IVA",ready:false},
  "349":{title:"Operaciones intracomunitarias",ready:false},
  "130-131":{title:"Pago fraccionado",ready:false},
  "123":{title:"Rendimientos del capital mobiliario",ready:false},
  "202":{title:"Pago fraccionado de sociedades",ready:false},
  "182":{title:"Donativos",ready:false},
  "347":{title:"Operaciones con terceros",ready:false}
};
const TAX_DRAFT_CLIENT_KEY="app-am-borradores-cliente";
let taxDrafts={client:"",clientData:null,base:null,loading:"",model:"",open:"",documents:new Map()};
const tdEye='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const tdLock='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const tdEur=value=>{const number=Number(value)||0,[int,dec]=Math.abs(number).toFixed(2).split(".");return(number<0?"−":"")+int.replace(/\B(?=(\d{3})+(?!\d))/g,".")+","+dec+" €"};
const tdDate=value=>value?String(value).slice(0,10).split("-").reverse().join("/"):"";
const tdRound=value=>Math.round((Number(value)||0)*100)/100;

function renderTaxDrafts(){
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">ÁREA FISCAL</p><h1>Borradores</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="declarations-panel td-shell">
      <div class="td-toolbar">
        <label class="td-field"><span>Cliente</span><select id="tdClient"><option value="">Seleccionar cliente…</option></select></label>
        <label class="secondary-button td-upload" id="tdUploadLabel" hidden>Actualizar base (.MDB)<input id="tdUpload" type="file" accept=".mdb,.accdb" hidden></label>
      </div>
      <div class="td-source" id="tdSource" hidden></div>
      <div class="td-layout" id="tdLayout" hidden>
        <aside class="td-models" id="tdModels"></aside>
        <section class="td-main" id="tdMain"></section>
      </div>
      <p class="td-empty" id="tdStart">Elige un cliente para ver los borradores de los modelos que presenta.</p>
    </section>
    <div class="td-shade" id="tdShade" hidden></div>
    <aside class="td-side" id="tdSide" aria-hidden="true"><header><div><span class="td-tag" id="tdSideTag"></span><h3 id="tdSideTitle"></h3><p id="tdSideSub"></p></div><button type="button" class="td-close" id="tdSideClose" aria-label="Cerrar">×</button></header><div class="td-side-body" id="tdSideBody"></div></aside>`;
  bindHeader();
  const select=document.querySelector("#tdClient");
  getAllClientMetadata().then(clients=>{
    const active=clients.filter(clientIsActive).sort((a,b)=>String(a.name).localeCompare(String(b.name),"es"));
    select.insertAdjacentHTML("beforeend",active.map(client=>`<option value="${escapeHtml(client.name)}">${escapeHtml(client.name)}</option>`).join(""));
    let remembered="";try{remembered=localStorage.getItem(TAX_DRAFT_CLIENT_KEY)||""}catch{}
    if(remembered&&active.some(client=>client.name===remembered)){select.value=remembered;selectTaxDraftClient(remembered,active)}
    select.addEventListener("change",()=>{try{localStorage.setItem(TAX_DRAFT_CLIENT_KEY,select.value)}catch{}selectTaxDraftClient(select.value,active)});
  }).catch(()=>{document.querySelector("#tdStart").textContent="No se han podido cargar los clientes."});
  document.querySelector("#tdUpload").addEventListener("change",event=>{const file=event.target.files[0];event.target.value="";if(file)uploadTaxDraftBase(file)});
  document.querySelector("#tdShade").addEventListener("click",closeTaxDraftSide);
  document.querySelector("#tdSideClose").addEventListener("click",closeTaxDraftSide);
}
async function selectTaxDraftClient(name,clients){
  const clientData=clients.find(client=>client.name===name)||null;
  taxDrafts={client:name,clientData,base:null,loading:name?"Buscando la contabilidad de AMCOMTA del cliente…":"",model:"",open:"",documents:new Map()};
  const models=taxDraftClientModels();taxDrafts.model=models.find(model=>TAX_DRAFT_MODELS[model]?.ready)||models[0]||"";
  renderTaxDraftShell();
  if(!name)return;
  try{const data=await apiJson(`/api/contabilidad/base?client=${encodeURIComponent(name)}`);if(taxDrafts.client===name)taxDrafts.base=data}catch{}
  if(taxDrafts.client!==name)return;
  taxDrafts.loading="";renderTaxDraftShell();loadTaxDraftDocuments();
}
async function uploadTaxDraftBase(file){
  const client=taxDrafts.client;if(!client)return;
  taxDrafts.loading=`Leyendo la base de datos ${file.name}…`;renderTaxDraftSource();
  try{
    const response=await fetch(`/api/contabilidad/base?client=${encodeURIComponent(client)}`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/octet-stream"},body:file});
    const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||"No se ha podido leer la base de datos.");
    if(taxDrafts.client===client)taxDrafts.base=result;
  }catch(error){alert(error.message)}
  if(taxDrafts.client!==client)return;
  taxDrafts.loading="";taxDrafts.documents=new Map();renderTaxDraftShell();loadTaxDraftDocuments();
}
// Modelos que presenta el cliente según su ficha (obligaciones fiscales).
function taxDraftClientModels(){
  const obligations=taxDrafts.clientData?.obligations||{};
  return taxModels.filter(model=>obligations[model]);
}
function renderTaxDraftShell(){
  const has=Boolean(taxDrafts.client);
  document.querySelector("#tdStart").hidden=has;
  document.querySelector("#tdLayout").hidden=!has;
  document.querySelector("#tdUploadLabel").hidden=!has;
  renderTaxDraftSource();if(!has)return;
  renderTaxDraftModels();renderTaxDraftMain();
}
function renderTaxDraftSource(){
  const box=document.querySelector("#tdSource");if(!box)return;
  const {client,base,loading}=taxDrafts;box.hidden=!client;if(!client)return;
  if(loading){box.className="td-source";box.textContent=loading;return}
  if(!base){box.className="td-source missing";box.innerHTML=`<strong>Falta la contabilidad de AMCOMTA de ${escapeHtml(client)}.</strong> Pulsa «Actualizar base (.MDB)» y elige su base de datos para rellenar los borradores.`;return}
  const when=base.actualizado?new Date(base.actualizado).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
  box.className="td-source ready";
  box.innerHTML=`<span>✓</span><div>Datos de <strong>AMCOMTA · ${escapeHtml(base.empresa||client)}${base.ejercicio?` · ejercicio ${escapeHtml(base.ejercicio)}`:""}</strong>${when?` · base actualizada el ${escapeHtml(when)}`:""}${base.actualizadoPor?` por ${escapeHtml(base.actualizadoPor)}`:""}. Los borradores se recalculan al actualizarla.</div>`;
}
function renderTaxDraftModels(){
  const models=taxDraftClientModels(),box=document.querySelector("#tdModels");
  if(!models.length){box.innerHTML=`<h2>Modelos</h2><p class="td-note">Este cliente no tiene modelos marcados en su ficha (Obligaciones fiscales).</p>`;return}
  box.innerHTML=`<h2>Modelos que presenta</h2>${models.map(model=>{const info=TAX_DRAFT_MODELS[model]||{title:"",ready:false};return `<button type="button" class="td-model${model===taxDrafts.model?" active":""}" data-td-model="${escapeHtml(model)}"${info.ready?"":" disabled"}><span class="td-badge m${escapeHtml(model.replace(/\D.*/,""))}"><small>Modelo</small><b>${escapeHtml(model)}</b></span><span class="td-model-text"><strong>Modelo ${escapeHtml(model)}</strong><small>${info.ready?escapeHtml(info.title):"Próximamente"}</small></span></button>`}).join("")}`;
  box.querySelectorAll("[data-td-model]").forEach(button=>button.addEventListener("click",()=>{taxDrafts.model=button.dataset.tdModel;taxDrafts.open="";taxDrafts.documents=new Map();renderTaxDraftModels();renderTaxDraftMain();loadTaxDraftDocuments()}));
}
function taxDraftYear(){return Number(taxDrafts.base?.ejercicio)||new Date().getFullYear()}
async function loadTaxDraftDocuments(){
  const model=taxDrafts.model;
  if(!taxDrafts.clientData||!TAX_DRAFT_BUILDERS[model])return;
  const client=taxDrafts.client,year=taxDraftYear(),found=new Map();
  for(const period of ["1T","2T","3T","4T"]){
    try{const docs=await declarationDocumentsForClients([taxDrafts.clientData],model,"trimestral",period,year);const doc=docs.get(client);if(doc)found.set(period,doc)}catch{}
  }
  if(taxDrafts.client!==client||taxDrafts.model!==model)return;
  taxDrafts.documents=found;renderTaxDraftMain();
}
const taxDraftItemId=item=>[item.fecha,item.numero,item.cuenta,item.retencion].join("|");
const taxDraftNominaId=entry=>`nom|${entry.fecha}|${entry.asiento}`;
const tdInQuarter=(date,period)=>Math.ceil(Number(String(date).slice(5,7))/3)===Number(period[0]);
const tdSum=(list,field)=>tdRound(list.reduce((sum,item)=>sum+(Number(item[field])||0),0));
function taxDraftControl(model,period){return declarationData(model,period,taxDrafts.client,taxDraftYear())}

/* --- Cálculo de cada modelo: casillas, resumen de la fila y listados que se ven con el ojo --- */
// Cada casilla: {n, label, value, kind:"count"|"money", eye, cls}; las cabeceras de apartado: {heading}.
const TAX_DRAFT_BUILDERS={
  "115":period=>{
    const items=(taxDrafts.base?.retencionesIrpf||[]).filter(item=>item.tipo==="alquiler"&&tdInQuarter(item.fecha,period));
    const base=tdSum(items,"base"),ret=tdSum(items,"retencion");
    const people=[...new Map(items.map(item=>[item.nif||item.cuenta,item])).values()];
    return{
      title:"Retenciones de alquileres",
      boxes:[
        {n:"01",label:"Número de perceptores",value:people.length,kind:"count",eye:"people"},
        {n:"02",label:"Base de las retenciones e ingresos a cuenta",value:base,kind:"money",eye:"alquileres"},
        {n:"03",label:"Retenciones e ingresos a cuenta",value:ret,kind:"money",eye:"alquileres"},
        {n:"04",label:"A deducir (exclusivamente en caso de declaración complementaria)",value:0,kind:"money"},
        {n:"05",label:"Resultado a ingresar ([03] − [04])",value:ret,kind:"money",eye:"alquileres",cls:"total"}
      ],
      result:ret,summary:{perceptores:people.length,base,retencion:ret},
      lists:{alquileres:items},people,
      checks:()=>{
        const rates=[...new Set(items.map(item=>item.porcentaje))];
        if(!items.length)return['<div class="td-check warn">⚠ <div><b>Sin retenciones de alquiler en el trimestre</b>No hay facturas recibidas con retención de alquiler en la contabilidad.</div></div>'];
        return[rates.length===1&&rates[0]===19?'<div class="td-check ok">✓ <div><b>Tipo de retención correcto</b>Todas las facturas aplican el 19 %.</div></div>':`<div class="td-check warn">⚠ <div><b>Revisa el tipo de retención</b>Hay facturas con ${rates.map(rate=>`${rate} %`).join(", ")}; en alquileres lo habitual es el 19 %.</div></div>`];
      }
    };
  },
  "111":period=>{
    const especie=new Set(taxDraftControl("111",period).especie||[]);
    const nominas=(taxDrafts.base?.nominas||[]).filter(entry=>tdInQuarter(entry.fecha,period)).map(entry=>({...entry,id:taxDraftNominaId(entry),especie:especie.has(taxDraftNominaId(entry))}));
    const profesionales=(taxDrafts.base?.retencionesIrpf||[]).filter(item=>item.tipo==="profesional"&&tdInQuarter(item.fecha,period)).map(item=>({...item,id:taxDraftItemId(item),especie:especie.has(taxDraftItemId(item))}));
    const workers=list=>new Set(list.flatMap(entry=>entry.trabajadores.map(worker=>worker.cuenta))).size;
    const people=list=>new Set(list.map(item=>item.nif||item.cuenta)).size;
    const tD=nominas.filter(entry=>!entry.especie),tE=nominas.filter(entry=>entry.especie),pD=profesionales.filter(item=>!item.especie),pE=profesionales.filter(item=>item.especie);
    const c={"01":workers(tD),"02":tdSum(tD,"percepciones"),"03":tdSum(tD,"retencion"),"04":workers(tE),"05":tdSum(tE,"percepciones"),"06":tdSum(tE,"retencion"),
      "07":people(pD),"08":tdSum(pD,"base"),"09":tdSum(pD,"retencion"),"10":people(pE),"11":tdSum(pE,"base"),"12":tdSum(pE,"retencion")};
    const total=tdRound(c["03"]+c["06"]+c["09"]+c["12"]);
    const box=(n,label,kind,eye)=>({n,label,value:c[n],kind,eye});
    const allWorkers=new Set(nominas.flatMap(entry=>entry.trabajadores.map(worker=>worker.cuenta))).size;
    return{
      title:"Retenciones de trabajo y profesionales",
      boxes:[
        {heading:"I. Rendimientos del trabajo · Dinerarios"},
        box("01","Número de perceptores","count","trabajo"),box("02","Importe de las percepciones","money","trabajo"),box("03","Importe de las retenciones","money","trabajo"),
        {heading:"I. Rendimientos del trabajo · En especie"},
        box("04","Número de perceptores","count","trabajo"),box("05","Valor de las percepciones","money","trabajo"),box("06","Importe de los ingresos a cuenta","money","trabajo"),
        {heading:"II. Rendimientos de actividades económicas · Dinerarios"},
        box("07","Número de perceptores","count","profesionales"),box("08","Importe de las percepciones","money","profesionales"),box("09","Importe de las retenciones","money","profesionales"),
        {heading:"II. Rendimientos de actividades económicas · En especie"},
        box("10","Número de perceptores","count","profesionales"),box("11","Valor de las percepciones","money","profesionales"),box("12","Importe de los ingresos a cuenta","money","profesionales"),
        {heading:"III a V. Premios, aprovechamientos forestales y cesión de derechos de imagen"},
        {n:"13-27",label:"Sin importes en la contabilidad",value:0,kind:"money",cls:"muted"},
        {heading:"Total liquidación"},
        {n:"28",label:"Suma de retenciones e ingresos a cuenta",value:total,kind:"money",eye:"todo"},
        {n:"29",label:"A deducir (exclusivamente en caso de declaración complementaria)",value:0,kind:"money"},
        {n:"30",label:"Resultado a ingresar ([28] − [29])",value:total,kind:"money",eye:"todo",cls:"total"}
      ],
      result:total,summary:{perceptores:allWorkers+people(profesionales),base:tdRound(c["02"]+c["05"]+c["08"]+c["11"]),retencion:total},
      lists:{trabajo:nominas,profesionales},
      checks:()=>{
        const out=[];
        if(!nominas.length&&(taxDrafts.base?.trabajadores||[]).length)out.push(`<div class="td-check warn">⚠ <div><b>No hay nóminas con retención en el trimestre</b>El cliente tiene ${taxDrafts.base.trabajadores.length} trabajadores en AMCOMTA, pero no hay asientos con abono a la cuenta de retenciones del trabajo.</div></div>`);
        else if(nominas.length){const months=new Set(nominas.map(entry=>entry.fecha.slice(5,7))).size;out.push(months>=3?'<div class="td-check ok">✓ <div><b>Nóminas de los tres meses</b>Hay nóminas contabilizadas en cada mes del trimestre.</div></div>':`<div class="td-check warn">⚠ <div><b>Solo hay nóminas de ${months} ${months===1?"mes":"meses"} del trimestre</b>Revisa si falta alguna nómina por contabilizar.</div></div>`)}
        const rates=[...new Set(profesionales.map(item=>item.porcentaje))].filter(rate=>![15,7].includes(rate));
        if(profesionales.length)out.push(rates.length?`<div class="td-check warn">⚠ <div><b>Revisa el tipo de retención de profesionales</b>Hay facturas con ${rates.map(rate=>`${rate} %`).join(", ")}; lo habitual es el 15 % (7 % los primeros años de actividad).</div></div>`:'<div class="td-check ok">✓ <div><b>Tipo de retención de profesionales correcto</b>Las facturas aplican el 15 % o el 7 %.</div></div>');
        if(!nominas.length&&!profesionales.length)out.push('<div class="td-check warn">⚠ <div><b>Sin retenciones en el trimestre</b>No hay nóminas ni facturas de profesionales con retención en la contabilidad.</div></div>');
        return out;
      }
    };
  }
};
function taxDraftBuild(model,period){const draft=TAX_DRAFT_BUILDERS[model](period);return{...draft,model,period,year:taxDraftYear()}}
const tdValue=box=>box.kind==="count"?String(box.value):tdEur(box.value);

function renderTaxDraftMain(){
  const box=document.querySelector("#tdMain");if(!box)return;
  const model=taxDrafts.model;
  if(taxDrafts.loading){box.innerHTML='<p class="td-note">Cargando…</p>';return}
  if(!model){box.innerHTML="";return}
  if(!TAX_DRAFT_BUILDERS[model]){box.innerHTML=`<p class="td-note">El borrador del modelo ${escapeHtml(model)} estará disponible más adelante.</p>`;return}
  if(!taxDrafts.base){box.innerHTML='<p class="td-note">Carga la base de AMCOMTA del cliente para ver el borrador.</p>';return}
  if(!Array.isArray(taxDrafts.base.retencionesIrpf)||(model==="111"&&!Array.isArray(taxDrafts.base.nominas))){box.innerHTML='<p class="td-note">La base cargada es de una versión anterior. Pulsa «Actualizar base (.MDB)» para leer las retenciones y las nóminas.</p>';return}
  const year=taxDraftYear();let totals={base:0,ret:0,control:0},title="";
  const rows=["1T","2T","3T","4T"].map(period=>{
    const draft=taxDraftBuild(model,period),control=taxDraftControl(model,period),amount=control.amount===""||control.amount===undefined?null:Number(control.amount);
    title=draft.title;totals.base+=draft.summary.base;totals.ret+=draft.summary.retencion;totals.control+=amount||0;
    const controlCell=amount===null||Number.isNaN(amount)?'<span class="td-dim">Sin anotar</span>':Math.abs(amount-draft.result)<0.005?`<span class="td-ok">✓</span> ${tdEur(amount)}`:`<span class="td-warn">⚠</span> ${tdEur(amount)}`;
    const status=control.submitted?["Presentado","pres"]:control.draft?["Borrador confirmado","conf"]:["Pendiente","pend"];
    const doc=taxDrafts.documents.get(period),eye=doc?`<button type="button" class="td-decl" data-preview-document="${registerPreviewDocument(doc)}" title="Ver la declaración presentada (${escapeHtml(doc.name)})" aria-label="Ver la declaración presentada del ${period}">${tdEye}</button>`:`<button type="button" class="td-decl" disabled title="La declaración presentada aún no está en la carpeta de declaraciones" aria-label="Sin declaración presentada">${tdLock}</button>`;
    const open=taxDrafts.open===period;
    return `<tr class="td-q${open?" open":""}" data-td-period="${period}" tabindex="0" aria-expanded="${open}"><td><span class="td-caret">›</span> ${period[0]}.º Trimestre</td><td class="num">${draft.summary.perceptores}</td><td class="num">${tdEur(draft.summary.base)}</td><td class="num"><b>${tdEur(draft.summary.retencion)}</b></td><td class="num">${controlCell}</td><td><span class="td-pill ${status[1]}">${status[0]}</span></td><td class="center">${eye}</td></tr>${open?`<tr class="td-detail"><td colspan="7"><div class="td-card">${taxDraftDetail(draft,control)}</div></td></tr>`:""}`;
  }).join("");
  box.innerHTML=`<div class="td-card-head"><span class="td-chip m${escapeHtml(model)}">${escapeHtml(model)}</span><strong>${escapeHtml(title)} · trimestral · ${year}</strong><span class="td-data-pill" title="Calculado con la base de AMCOMTA del cliente">Datos de contabilidad</span></div>
    <div class="td-table-wrap"><table class="td-table"><thead><tr><th>Período</th><th class="num">Perceptores</th><th class="num">${model==="111"?"Percepciones":"Base"}</th><th class="num">Retenciones</th><th class="num" title="Importe anotado en Control de declaraciones">Control decl.</th><th>Estado</th><th class="center" title="Declaración presentada en la carpeta de declaraciones">Presentada</th></tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><td>Total</td><td></td><td class="num">${tdEur(totals.base)}</td><td class="num">${tdEur(totals.ret)}</td><td class="num">${tdEur(totals.control)}</td><td colspan="2"></td></tr></tfoot></table></div>
    <p class="td-hint">Pulsa un trimestre para desplegar su borrador.</p>`;
  box.querySelectorAll("tr.td-q").forEach(row=>{
    const toggle=event=>{if(event.target.closest(".td-decl"))return;const period=row.dataset.tdPeriod;taxDrafts.open=taxDrafts.open===period?"":period;renderTaxDraftMain()};
    row.addEventListener("click",toggle);row.addEventListener("keydown",event=>{if(event.key==="Enter")toggle(event)});
  });
  box.querySelectorAll("[data-td-eye]").forEach(button=>button.addEventListener("click",()=>openTaxDraftSide(button.dataset.tdEye,taxDraftBuild(model,taxDrafts.open))));
  box.querySelector("[data-td-copy]")?.addEventListener("click",copyTaxDraftBoxes);
  box.querySelector("[data-td-confirm]")?.addEventListener("click",confirmTaxDraft);
}
function taxDraftBoxes(boxes,withEyes=true){
  return boxes.map(box=>box.heading?`<p class="td-heading">${escapeHtml(box.heading)}</p>`:`<div class="td-box ${box.cls||""}"><span class="td-n">${escapeHtml(box.n)}</span><span class="td-label">${escapeHtml(box.label)}</span><span class="td-value">${tdValue(box)}</span>${withEyes&&box.eye?`<button type="button" class="td-eye" data-td-eye="${box.eye}" title="Ver lo que compone esta casilla" aria-label="Ver el detalle de la casilla ${escapeHtml(box.n)}">${tdEye}</button>`:'<span></span>'}</div>`).join("");
}
function taxDraftSignature(draft){return JSON.stringify(draft.boxes.filter(box=>!box.heading).map(box=>[box.n,box.value]))}
function taxDraftDetail(draft,control){
  const result=draft.result,checks=[];
  const amount=control.amount===""||control.amount===undefined?null:Number(control.amount);
  if(amount===null||Number.isNaN(amount))checks.push(`<div class="td-check warn">⚠ <div><b>Aún no hay importe en Control de declaraciones</b>Al confirmar el borrador se anotarán la fecha de confección y ${tdEur(result)}.</div></div>`);
  else if(Math.abs(amount-result)<0.005)checks.push(`<div class="td-check ok">✓ <div><b>Coincide con Control de declaraciones</b>Borrador del trimestre: ${tdEur(result)} · Importe anotado: ${tdEur(amount)}.</div></div>`);
  else checks.push(`<div class="td-check bad">✕ <div><b>No coincide con Control de declaraciones: diferencia de ${tdEur(Math.abs(amount-result))}</b>Borrador del trimestre: ${tdEur(result)} · Importe anotado: ${tdEur(amount)}. Revisa si falta o sobra algún apunte en el trimestre o si el importe anotado es el correcto.</div></div>`);
  checks.push(...draft.checks());
  const confirmed=control.draft;
  const changed=confirmed&&(confirmed.signature?confirmed.signature!==taxDraftSignature(draft):Math.abs((Number(confirmed.result??confirmed.casillas?.["05"])||0)-result)>=0.005);
  const confirmNote=confirmed?`<p class="td-confirmed">${changed?"⚠ El borrador ha cambiado desde que se confirmó: ":"✓ "}Confirmado el ${tdDate(confirmed.confirmedAt)}${confirmed.confirmedBy?` por ${escapeHtml(confirmed.confirmedBy)}`:""} · ${tdEur(confirmed.result??confirmed.casillas?.["05"])}</p>`:"";
  return `<div class="td-detail-head"><b>Borrador modelo ${draft.model} · ${draft.period} ${draft.year}</b><span>${escapeHtml(taxDrafts.clientData?.cif||"")}${taxDrafts.clientData?.cif?" · ":""}${escapeHtml(taxDrafts.client)}</span></div>
    <div class="td-boxes">${taxDraftBoxes(draft.boxes)}</div>
    <div class="td-checks">${checks.join("")}</div>
    <div class="td-actions">${confirmNote}<button type="button" class="secondary-button" data-td-copy>Copiar casillas</button><button type="button" class="primary blue-button" data-td-confirm>${confirmed?"Confirmar de nuevo":"Confirmar borrador"}</button></div>`;
}
function copyTaxDraftBoxes(event){
  const draft=taxDraftBuild(taxDrafts.model,taxDrafts.open),text=draft.boxes.filter(box=>!box.heading&&/^\d+$/.test(box.n)).map(box=>`${box.n}\t${tdValue(box)}`).join("\n"),button=event.currentTarget;
  const done=label=>{const previous=button.textContent;button.textContent=label;setTimeout(()=>{button.textContent=previous},1500)};
  (navigator.clipboard?.writeText(text)||Promise.reject()).then(()=>done("Copiadas ✓"),()=>done("No se ha podido copiar"));
}
// Confirmar: se anotan en Control de declaraciones la fecha de confección y el importe, y se guarda el borrador para consultarlo.
function confirmTaxDraft(){
  const period=taxDrafts.open,model=taxDrafts.model;if(!period)return;
  const draft=taxDraftBuild(model,period),year=draft.year,key=declarationKey(model,period,taxDrafts.client,year),data=declarationData(model,period,taxDrafts.client,year);
  const today=new Date(),iso=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  data.prepared=iso;data.amount=draft.result.toFixed(2);
  data.draft={model,period,year,client:taxDrafts.client,cif:taxDrafts.clientData?.cif||"",title:draft.title,boxes:draft.boxes,result:draft.result,signature:taxDraftSignature(draft),lists:draft.lists,confirmedAt:new Date().toISOString(),confirmedBy:typeof signedInUser!=="undefined"&&signedInUser?.name||""};
  localStorage.setItem(key,JSON.stringify(data));
  renderTaxDraftMain();
}

/* --- Panel lateral: lo que compone cada casilla --- */
const TAX_DRAFT_SIDE={
  people:{title:draft=>`Perceptores (${draft.people.length})`,sub:"Arrendadores a los que se ha practicado retención en el trimestre."},
  alquileres:{title:draft=>`Facturas que componen el borrador (${draft.lists.alquileres.length})`,sub:"Facturas recibidas con retención de alquiler en la contabilidad de AMCOMTA."},
  trabajo:{title:draft=>`Nóminas del trimestre (${draft.lists.trabajo.length})`,sub:"Asientos de nómina con retención del trabajo en AMCOMTA. Marca «En especie» si la percepción es en especie."},
  profesionales:{title:draft=>`Facturas de profesionales (${draft.lists.profesionales.length})`,sub:"Facturas recibidas con retención de profesionales en AMCOMTA. Marca «En especie» si la percepción es en especie."},
  todo:{title:()=>"Detalle del modelo 111",sub:"Nóminas y facturas de profesionales que componen el borrador."}
};
function openTaxDraftSide(kind,draft){
  const side=TAX_DRAFT_SIDE[kind];if(!side)return;
  document.querySelector("#tdSideTag").textContent=`Modelo ${draft.model} · ${draft.period} ${draft.year}`;
  document.querySelector("#tdSideTitle").textContent=side.title(draft);
  document.querySelector("#tdSideSub").textContent=side.sub;
  const body=document.querySelector("#tdSideBody");
  body.innerHTML=taxDraftLists(kind,draft,true);
  if(draft.lists.alquileres&&(kind==="alquileres"))fillTaxDraftInvoiceFiles(body.querySelector('[data-td-list="alquileres"]'),taxDrafts.client,draft.lists.alquileres);
  if(draft.lists.profesionales&&(kind==="profesionales"||kind==="todo"))fillTaxDraftInvoiceFiles(body.querySelector('[data-td-list="profesionales"]'),taxDrafts.client,draft.lists.profesionales);
  body.querySelectorAll("[data-td-especie]").forEach(input=>input.addEventListener("change",()=>{
    toggleTaxDraftEspecie(draft.model,draft.period,input.dataset.tdEspecie,input.checked);
    openTaxDraftSide(kind,taxDraftBuild(draft.model,draft.period));
  }));
  document.querySelector("#tdShade").hidden=false;document.querySelector("#tdSide").classList.add("on");
}
function taxDraftLists(kind,draft,editable){
  if(kind==="people")return `<table class="td-list"><thead><tr><th>Arrendador</th><th>NIF</th><th>Cuenta</th><th class="num">Facturas</th><th class="num">Base</th><th class="num">Retención</th></tr></thead><tbody>${draft.people.map(person=>{const list=draft.lists.alquileres.filter(item=>(item.nif||item.cuenta)===(person.nif||person.cuenta));return `<tr><td>${escapeHtml(person.nombre)}</td><td>${escapeHtml(person.nif)}</td><td>${escapeHtml(person.cuenta)}</td><td class="num">${list.length}</td><td class="num">${tdEur(tdSum(list,"base"))}</td><td class="num">${tdEur(tdSum(list,"retencion"))}</td></tr>`}).join("")}</tbody></table>`;
  if(kind==="alquileres")return `<div data-td-list="alquileres">${taxDraftInvoiceTable(draft.lists.alquileres,{person:"Arrendador"})}</div>`;
  if(kind==="trabajo")return taxDraftNominaTable(draft.lists.trabajo,editable);
  if(kind==="profesionales")return `<div data-td-list="profesionales">${taxDraftInvoiceTable(draft.lists.profesionales,{person:"Profesional",especie:true,editable})}</div>`;
  return `<h4 class="td-list-title">Rendimientos del trabajo</h4>${taxDraftNominaTable(draft.lists.trabajo,editable)}<h4 class="td-list-title">Actividades económicas (profesionales)</h4><div data-td-list="profesionales">${taxDraftInvoiceTable(draft.lists.profesionales,{person:"Profesional",especie:true,editable})}</div>`;
}
function taxDraftEspecieCell(item,editable){return editable?`<input type="checkbox" data-td-especie="${escapeHtml(item.id)}"${item.especie?" checked":""} aria-label="En especie">`:item.especie?"Sí":"—"}
function taxDraftNominaTable(entries,editable){
  if(!entries.length)return'<p class="td-note td-pad">No hay nóminas con retención en el trimestre.</p>';
  return `<table class="td-list"><thead><tr><th>Fecha</th><th>Concepto</th><th class="num">Trabajadores</th><th class="num">Percepciones</th><th class="num">Retención</th><th class="num">%</th><th class="center">En especie</th></tr></thead><tbody>${entries.map(entry=>`<tr${entry.especie?' class="td-especie"':""}><td>${tdDate(entry.fecha)}</td><td>${escapeHtml(entry.concepto||`Asiento ${entry.asiento}`)}<br><small>${escapeHtml(entry.trabajadores.map(worker=>worker.nombre).join(" · "))}</small></td><td class="num">${entry.trabajadores.length}</td><td class="num">${tdEur(entry.percepciones)}</td><td class="num">${tdEur(entry.retencion)}</td><td class="num">${entry.percepciones?`${(entry.retencion/entry.percepciones*100).toFixed(2).replace(".",",")} %`:"—"}</td><td class="center">${taxDraftEspecieCell(entry,editable)}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="3">Total</td><td class="num">${tdEur(tdSum(entries,"percepciones"))}</td><td class="num">${tdEur(tdSum(entries,"retencion"))}</td><td colspan="2"></td></tr></tfoot></table>`;
}
function taxDraftInvoiceTable(items,options={}){
  if(!items.length)return'<p class="td-note td-pad">No hay facturas con retención en el trimestre.</p>';
  const especie=Boolean(options.especie);
  return `<table class="td-list td-invoices"><thead><tr><th>Fecha</th><th>Nº factura</th><th>${options.person||"Proveedor"}</th><th class="center" title="Factura guardada en la carpeta del cliente">Factura</th><th class="num">Base</th><th class="num">%</th><th class="num">Retención</th>${especie?'<th class="center">En especie</th>':""}</tr></thead><tbody>${items.map((item,index)=>`<tr${item.especie?' class="td-especie"':""}><td>${tdDate(item.fecha)}</td><td>${escapeHtml(item.numero)}</td><td>${escapeHtml(item.nombre)}<br><small>${escapeHtml(item.nif)}</small></td><td class="center" data-td-file="${index}"><span class="td-file-wait" title="Buscando la factura…">…</span></td><td class="num">${tdEur(item.base)}</td><td class="num">${escapeHtml(item.porcentaje)} %</td><td class="num">${tdEur(item.retencion)}</td>${especie?`<td class="center">${taxDraftEspecieCell(item,options.editable)}</td>`:""}</tr>`).join("")}</tbody><tfoot><tr><td colspan="4">Total</td><td class="num">${tdEur(tdSum(items,"base"))}</td><td></td><td class="num">${tdEur(tdSum(items,"retencion"))}</td>${especie?"<td></td>":""}</tr></tfoot></table>`;
}
// Las percepciones marcadas «en especie» se guardan junto al control del trimestre (compartido en el servidor).
function toggleTaxDraftEspecie(model,period,id,checked){
  const year=taxDraftYear(),key=declarationKey(model,period,taxDrafts.client,year),data=declarationData(model,period,taxDrafts.client,year);
  const list=new Set(data.especie||[]);if(checked)list.add(id);else list.delete(id);
  data.especie=[...list];localStorage.setItem(key,JSON.stringify(data));
  renderTaxDraftMain();
}
/* --- Facturas guardadas por el lector: CLIENTES/<cliente>/CONTABILIDAD/<año>/<trimestre>/RECIBIDAS --- */
const tdEyeOff='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const taxDraftFolderCache=new Map();
async function taxDraftReceivedFiles(client,year,quarter){
  const key=`${client}|${year}|${quarter}`;
  if(!taxDraftFolderCache.has(key))taxDraftFolderCache.set(key,(async()=>{
    try{
      const root=await getSavedHandle("clients-folder");if(!root)return[];
      let folder=await root.getDirectoryHandle(client);
      for(const part of ["CONTABILIDAD",String(year),quarter,"RECIBIDAS"])folder=await folder.getDirectoryHandle(part);
      const files=[];for await(const entry of folder.values())if(entry.kind!=="directory")files.push(entry);
      return files;
    }catch{return[]}
  })());
  return taxDraftFolderCache.get(key);
}
// La factura se reconoce por la fecha del nombre (AAAA.MM.DD), el nombre del proveedor y, si aparece, su número.
function taxDraftMatchFile(item,files,used){
  const prefixes=[item.fechaFactura,item.fecha].filter(Boolean).map(date=>String(date).slice(0,10).replace(/-/g,"."));
  const words=normalizeFiscalText(item.nombre).split(" ").filter(word=>word.length>2),number=normalizeFiscalText(item.numero).replace(/ /g,"");
  let best=null,bestScore=0;
  for(const file of files){
    if(used.has(file))continue;
    const name=normalizeFiscalText(file.name.replace(/\.[a-z0-9]+$/i,"")),compact=name.replace(/ /g,"");
    let score=prefixes.some(prefix=>file.name.startsWith(prefix))?2:0;
    if(words.length)score+=2*words.filter(word=>name.split(" ").includes(word)).length/words.length;
    if(number.length>2&&compact.includes(number))score+=2;
    if(score>bestScore){best=file;bestScore=score}
  }
  return bestScore>=3.5?best:null;
}
async function fillTaxDraftInvoiceFiles(container,client,items){
  if(!container)return;
  taxDraftFolderCache.clear();const used=new Set();
  for(const [index,item] of items.entries()){
    const cell=container.querySelector(`[data-td-file="${index}"]`);if(!cell)continue;
    const year=String(item.fechaFactura||item.fecha).slice(0,4),quarters=[...new Set([item.fechaFactura,item.fecha].filter(Boolean).map(date=>`${Math.ceil(Number(String(date).slice(5,7))/3)}T`))];
    let file=null;
    for(const quarter of quarters){file=taxDraftMatchFile(item,await taxDraftReceivedFiles(client,year,quarter),used);if(file)break}
    if(!cell.isConnected)return;
    if(file){used.add(file);cell.innerHTML=`<button type="button" class="td-eye" data-preview-document="${registerPreviewDocument({name:file.name,handle:file})}" title="Ver la factura (${escapeHtml(file.name)})" aria-label="Ver la factura ${escapeHtml(item.numero)}">${tdEye}</button>`}
    else cell.innerHTML=`<span class="td-eye off" title="No está la factura en CLIENTES/${escapeHtml(client)}/CONTABILIDAD/${escapeHtml(year)}/${escapeHtml(quarters[0]||"")}/RECIBIDAS" aria-label="Factura no encontrada">${tdEyeOff}</span>`;
  }
}
function closeTaxDraftSide(){document.querySelector("#tdShade")?.setAttribute("hidden","");document.querySelector("#tdSide")?.classList.remove("on")}
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&document.querySelector("#tdSide.on"))closeTaxDraftSide()});

/* --- Borrador confirmado, visible desde Control de declaraciones hasta que esté la declaración real --- */
function openConfirmedTaxDraft(key){
  let data={};try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
  const draft=data.draft;if(!draft)return;
  // Borradores del 115 confirmados con la primera versión (casillas sueltas).
  const boxes=draft.boxes||[["01","Número de perceptores","count"],["02","Base de las retenciones e ingresos a cuenta","money"],["03","Retenciones e ingresos a cuenta","money"],["04","A deducir (declaración complementaria)","money"],["05","Resultado a ingresar","money"]].map(([n,label,kind],index)=>({n,label,kind,value:draft.casillas?.[n]||0,cls:index===4?"total":""}));
  const lists=draft.lists||{alquileres:draft.items||[]};
  document.querySelector("#tdDraftView")?.remove();
  const view=document.createElement("div");view.id="tdDraftView";view.className="td-modal";view.setAttribute("role","dialog");view.setAttribute("aria-modal","true");
  const listHtml=[lists.alquileres?`<h4>Facturas (${lists.alquileres.length})</h4><div data-td-list="alquileres">${taxDraftInvoiceTable(lists.alquileres,{person:"Arrendador"})}</div>`:"",lists.trabajo?`<h4>Nóminas (${lists.trabajo.length})</h4>${taxDraftNominaTable(lists.trabajo,false)}`:"",lists.profesionales?`<h4>Facturas de profesionales (${lists.profesionales.length})</h4><div data-td-list="profesionales">${taxDraftInvoiceTable(lists.profesionales,{person:"Profesional",especie:true})}</div>`:""].join("");
  view.innerHTML=`<div class="td-modal-box"><header><div><span class="td-tag">Borrador confirmado</span><h3>Modelo ${escapeHtml(draft.model)} · ${escapeHtml(draft.period)} ${escapeHtml(draft.year)}</h3><p>${escapeHtml(draft.cif?draft.cif+" · ":"")}${escapeHtml(draft.client)} · confirmado el ${tdDate(draft.confirmedAt)}${draft.confirmedBy?` por ${escapeHtml(draft.confirmedBy)}`:""}</p></div><button type="button" class="td-close" aria-label="Cerrar">×</button></header>
    <div class="td-modal-body"><p class="td-note">Es el borrador preparado en la app. Cuando la declaración presentada esté en la carpeta de declaraciones, se verá esa en su lugar.</p>
    <div class="td-boxes">${taxDraftBoxes(boxes,false)}</div>${listHtml}</div></div>`;
  document.body.append(view);
  if(lists.alquileres)fillTaxDraftInvoiceFiles(view.querySelector('[data-td-list="alquileres"]'),draft.client,lists.alquileres);
  if(lists.profesionales)fillTaxDraftInvoiceFiles(view.querySelector('[data-td-list="profesionales"]'),draft.client,lists.profesionales);
  const close=()=>{view.remove();document.removeEventListener("keydown",onKey)},onKey=event=>{if(event.key==="Escape")close()};
  view.addEventListener("click",event=>{if(event.target===view||event.target.closest(".td-close"))close()});document.addEventListener("keydown",onKey);
}
document.addEventListener("click",event=>{const button=event.target.closest("[data-tax-draft]");if(!button)return;event.preventDefault();openConfirmedTaxDraft(button.dataset.taxDraft)});
