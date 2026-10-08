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
  "347":{title:"Operaciones con terceros",ready:false},
  "216":{title:"Retenciones de no residentes",ready:false},
  "308":{title:"IVA · solicitud de devolución (régimen especial)",ready:false},
  "309":{title:"IVA · liquidación no periódica",ready:false},
  "369":{title:"IVA · regímenes especiales (OSS/IOSS)",ready:false},
  "184":{title:"Entidades en régimen de atribución de rentas",ready:false},
  "345":{title:"Planes de pensiones y mutualidades",ready:false}
};
const TAX_DRAFT_CLIENT_KEY="app-am-borradores-cliente";
let taxDrafts={client:"",clientData:null,base:null,loading:"",model:"",open:"",documents:new Map()};
const tdEye='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const tdLock='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const tdEur=value=>{const number=Number(value)||0,[int,dec]=Math.abs(number).toFixed(2).split(".");return(number<0?"−":"")+int.replace(/\B(?=(\d{3})+(?!\d))/g,".")+","+dec+" €"};
const tdDate=value=>value?String(value).slice(0,10).split("-").reverse().join("/"):"";
const tdRound=value=>Math.round((Number(value)||0)*100)/100;

function renderTaxDrafts(){
  // Se adelanta la lista de declaraciones para que el ojo esté listo al elegir el cliente.
  try{getDeclarationPdfs(false).catch(()=>{})}catch{}
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">ÁREA FISCAL</p><h1>Borradores</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="declarations-panel td-shell">
      <div class="td-toolbar">
        <label class="td-field"><span>Cliente</span><select id="tdClient"><option value="">Seleccionar cliente…</option></select></label>
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
// Sube la base de AMCOMTA (.MDB) de un cliente. Si la empresa de la base no coincide con el
// cliente se pide confirmación antes de guardarla. Devuelve el resumen guardado o null.
async function uploadClientAccountingBase(client,file){
  const send=force=>fetch(`/api/contabilidad/base?client=${encodeURIComponent(client)}${force?"&force=1":""}`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/octet-stream"},body:file});
  let response=await send(false),result=await response.json().catch(()=>({}));
  if(response.status===409){
    if(!confirm(`${result.error}\n\n¿Seguro que quieres guardarla como la contabilidad de ${client}?`))return null;
    response=await send(true);result=await response.json().catch(()=>({}));
  }
  if(!response.ok)throw new Error(result.error||"No se ha podido leer la base de datos.");
  return result;
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
  renderTaxDraftSource();if(!has)return;
  renderTaxDraftModels();renderTaxDraftMain();
}
// La base guardada es de otra empresa (se subió con otro cliente seleccionado).
function taxDraftBaseMismatch(){
  const empresa=taxDrafts.base?.empresa;
  return Boolean(empresa&&taxDrafts.client&&declarationClientScore(taxDrafts.client,normalizeFiscalText(String(empresa).replace(/\b20\d\d\b/g," ")))<0.5);
}
function renderTaxDraftSource(){
  const box=document.querySelector("#tdSource");if(!box)return;
  const {client,base,loading}=taxDrafts;box.hidden=!client;if(!client)return;
  if(loading){box.className="td-source";box.textContent=loading;return}
  if(!base){box.className="td-source missing";box.innerHTML=`<strong>Falta la contabilidad de AMCOMTA de ${escapeHtml(client)}.</strong> Añádela en Gestión → Clientes → ficha del cliente → «Base de datos de contabilidad».`;return}
  const when=base.actualizado?new Date(base.actualizado).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
  if(taxDraftBaseMismatch()){
    box.className="td-source missing";
    box.innerHTML=`<strong>⚠ La base guardada para ${escapeHtml(client)} es de «${escapeHtml(base.empresa)}».</strong> Se subió con otro cliente seleccionado. <button type="button" class="secondary-button" id="tdRemoveBase">Quitar esta base</button> y añade la correcta en la ficha del cliente.`;
    box.querySelector("#tdRemoveBase").onclick=async()=>{
      if(!confirm(`¿Quitar la base de «${base.empresa}» de ${client}?`))return;
      try{await apiJson(`/api/contabilidad/base?client=${encodeURIComponent(client)}`,{method:"DELETE"});taxDrafts.base=null;renderTaxDraftShell()}catch(error){alert(error.message)}
    };
    return;
  }
  box.className="td-source ready";
  box.innerHTML=`<span>✓</span><div>Datos de <strong>AMCOMTA · ${escapeHtml(base.empresa||client)}${base.ejercicio?` · ejercicio ${escapeHtml(base.ejercicio)}`:""}</strong>${when?` · base actualizada el ${escapeHtml(when)}`:""}${base.actualizadoPor?` por ${escapeHtml(base.actualizadoPor)}`:""}. Se actualiza desde la ficha del cliente.</div>`;
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
  let pdfs=[],root=null;try{root=await getSavedHandle("declarations-folder");pdfs=await getDeclarationPdfs(false)}catch{}
  taxDrafts.docsFolder=pdfs.length>0;
  taxDrafts.docsInfo={source:root?.remote?"servidor":root?"carpeta de este equipo":"sin conectar",total:pdfs.length,model:pdfs.filter(doc=>doc.normalized.includes(String(year))&&fiscalModelMatches(doc.normalized,model)).length};
  for(const period of ["1T","2T","3T","4T"]){
    // Se conservan los enlaces de los cuatro trimestres (antes cada uno anulaba el del anterior).
    try{const docs=await declarationDocumentsForClients([taxDrafts.clientData],model,"trimestral",period,year,{keepUrls:true});const doc=docs.get(client);if(doc)found.set(period,doc)}catch{}
  }
  if(taxDrafts.client!==client||taxDrafts.model!==model)return;
  taxDrafts.documents=found;renderTaxDraftMain();
}
const taxDraftItemId=item=>[item.fecha,item.numero,item.cuenta,item.retencion].join("|");
const taxDraftNominaId=entry=>`nom|${entry.fecha}|${entry.asiento}`;
const tdInQuarter=(date,period)=>Math.ceil(Number(String(date).slice(5,7))/3)===Number(period[0]);
// Percepciones del trimestre con arrastre: lo que se dejó sin incluir en un trimestre anterior aparece en
// los siguientes (marcado con su trimestre de origen) hasta que se incluye en alguno.
function tdCarry(model,period,list,idFn){
  const q=Number(String(period)[0]),excl={};for(let i=1;i<=q;i++)excl[i]=new Set(taxDraftControl(model,`${i}T`).excluidos||[]);
  return (list||[]).map(item=>{
    const q0=Math.ceil(Number(String(item.fecha).slice(5,7))/3);if(!q0||q0>q)return null;
    const id=idFn(item);for(let k=q0;k<q;k++)if(!excl[k].has(id))return null;
    return{...item,id,origen:q0<q?`${q0}T`:"",incluir:!excl[q].has(id)};
  }).filter(Boolean);
}
// Declaración complementaria: activa la casilla «a deducir» (04 en el 115, 29 en el 111, 13 en el 123) y el nº de justificante.
function tdCompl(model,period){const c=taxDraftControl(model,period).complementaria||{};return{activa:!!c.activa,deducir:c.activa?tdRound(Number(c.deducir)||0):0,justificante:c.activa?String(c.justificante||""):""}}
const TD_COMPL_BOX={"115":"04","111":"29","123":"13"};
function tdComplBlock(draft){
  const n=TD_COMPL_BOX[draft.model];if(!n)return"";
  const c=tdCompl(draft.model,draft.period),raw=taxDraftControl(draft.model,draft.period).complementaria||{};
  return `<div class="td-compl${c.activa?" on":""}"><label class="td-switch"><input type="checkbox" data-td-compl="activa"${c.activa?" checked":""}><i></i><span>Declaración complementaria</span></label>
    <label class="td-cf"><small>[${n}] A deducir · resultado de la declaración anterior</small><input data-td-compl="deducir" inputmode="decimal" value="${escapeHtml(raw.deducir===""||raw.deducir===undefined?"":Number(raw.deducir).toFixed(2).replace(".",","))}" placeholder="0,00"${c.activa?"":" disabled"}></label>
    <label class="td-cf"><small>Nº de justificante de la declaración anterior</small><input data-td-compl="justificante" maxlength="13" inputmode="numeric" value="${escapeHtml(raw.justificante??"")}"${c.activa?"":" disabled"}></label></div>`;
}
function saveTaxDraftCompl(model,period,field,value){
  const year=taxDraftYear(),key=declarationKey(model,period,taxDrafts.client,year),data=declarationData(model,period,taxDrafts.client,year);
  const c={...(data.complementaria||{})};
  // Al desactivarla se borran el importe a deducir y el justificante.
  if(field==="activa"){c.activa=value;if(!value){c.deducir="";c.justificante=""}}else if(field==="deducir")c.deducir=String(value).trim()?Number(String(value).replace(/\./g,"").replace(",","."))||0:"";else c.justificante=String(value).replace(/\D/g,"").slice(0,13);
  data.complementaria=c;localStorage.setItem(key,JSON.stringify(data));renderTaxDraftMain();
}
function toggleTaxDraftIncluir(model,period,id,checked){
  const year=taxDraftYear(),key=declarationKey(model,period,taxDrafts.client,year),data=declarationData(model,period,taxDrafts.client,year);
  const list=new Set(data.excluidos||[]);if(checked)list.delete(id);else list.add(id);
  data.excluidos=[...list];localStorage.setItem(key,JSON.stringify(data));
  renderTaxDraftMain();
}
function taxDraftIncluirCell(item,editable){return editable?`<input type="checkbox" data-td-incluir="${escapeHtml(item.id)}"${item.incluir!==false?" checked":""} aria-label="Incluir en la declaración">`:item.incluir===false?"No":"Sí"}
const tdOrigen=item=>item.origen?` <span class="td-origen" title="No se declaró en el ${item.origen}; se incluye en este trimestre">del ${item.origen}</span>`:"";
const tdSum=(list,field)=>tdRound(list.reduce((sum,item)=>sum+(Number(item[field])||0),0));
function taxDraftControl(model,period){return declarationData(model,period,taxDrafts.client,taxDraftYear())}

/* --- Cálculo de cada modelo: casillas, resumen de la fila y listados que se ven con el ojo --- */
// Cada casilla: {n, label, value, kind:"count"|"money", eye, cls}; las cabeceras de apartado: {heading}.
const TAX_DRAFT_BUILDERS={
  "115":period=>{
    const all=tdCarry("115",period,(taxDrafts.base?.retencionesIrpf||[]).filter(item=>item.tipo==="alquiler"),taxDraftItemId),items=all.filter(item=>item.incluir);
    const base=tdSum(items,"base"),ret=tdSum(items,"retencion");
    const people=[...new Map(items.map(item=>[item.nif||item.cuenta,item])).values()],compl=tdCompl("115",period);
    return{
      title:"Retenciones de alquileres",
      boxes:[
        {n:"01",label:"Número de perceptores",value:people.length,kind:"count",eye:"people"},
        {n:"02",label:"Base de las retenciones e ingresos a cuenta",value:base,kind:"money",eye:"alquileres"},
        {n:"03",label:"Retenciones e ingresos a cuenta",value:ret,kind:"money",eye:"alquileres"},
        {n:"04",label:"A deducir (exclusivamente en caso de declaración complementaria)",value:compl.deducir,kind:"money"},
        {n:"05",label:"Resultado a ingresar ([03] − [04])",value:tdRound(ret-compl.deducir),kind:"money",eye:"alquileres",cls:"total"}
      ],
      complementaria:compl,result:tdRound(ret-compl.deducir),summary:{perceptores:people.length,base,retencion:ret},
      lists:{alquileres:all},people,
      checks:()=>{
        const rates=[...new Set(items.map(item=>item.porcentaje))];
        if(!items.length)return['<div class="td-check warn">⚠ <div><b>Sin retenciones de alquiler en el trimestre</b>No hay facturas recibidas con retención de alquiler en la contabilidad.</div></div>'];
        return[rates.length===1&&rates[0]===19?'<div class="td-check ok">✓ <div><b>Tipo de retención correcto</b>Todas las facturas aplican el 19 %.</div></div>':`<div class="td-check warn">⚠ <div><b>Revisa el tipo de retención</b>Hay facturas con ${rates.map(rate=>`${rate} %`).join(", ")}; en alquileres lo habitual es el 19 %.</div></div>`];
      }
    };
  },
  "111":period=>{
    const especie=new Set(taxDraftControl("111",period).especie||[]);
    const nominasAll=tdCarry("111",period,taxDrafts.base?.nominas,taxDraftNominaId).map(entry=>({...entry,especie:especie.has(entry.id)}));
    const profesionalesAll=tdCarry("111",period,(taxDrafts.base?.retencionesIrpf||[]).filter(item=>item.tipo==="profesional"),taxDraftItemId).map(item=>({...item,especie:especie.has(item.id)}));
    const nominas=nominasAll.filter(entry=>entry.incluir),profesionales=profesionalesAll.filter(item=>item.incluir);
    const workers=list=>new Set(list.flatMap(entry=>entry.trabajadores.map(worker=>worker.cuenta))).size;
    const people=list=>new Set(list.map(item=>item.nif||item.cuenta)).size;
    const tD=nominas.filter(entry=>!entry.especie),tE=nominas.filter(entry=>entry.especie),pD=profesionales.filter(item=>!item.especie),pE=profesionales.filter(item=>item.especie);
    const c={"01":workers(tD),"02":tdSum(tD,"percepciones"),"03":tdSum(tD,"retencion"),"04":workers(tE),"05":tdSum(tE,"percepciones"),"06":tdSum(tE,"retencion"),
      "07":people(pD),"08":tdSum(pD,"base"),"09":tdSum(pD,"retencion"),"10":people(pE),"11":tdSum(pE,"base"),"12":tdSum(pE,"retencion")};
    const total=tdRound(c["03"]+c["06"]+c["09"]+c["12"]),compl=tdCompl("111",period);
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
        {n:"29",label:"A deducir (exclusivamente en caso de declaración complementaria)",value:compl.deducir,kind:"money"},
        {n:"30",label:"Resultado a ingresar ([28] − [29])",value:tdRound(total-compl.deducir),kind:"money",eye:"todo",cls:"total"}
      ],
      complementaria:compl,result:tdRound(total-compl.deducir),summary:{perceptores:allWorkers+people(profesionales),base:tdRound(c["02"]+c["05"]+c["08"]+c["11"]),retencion:total},
      lists:{trabajo:nominasAll,profesionales:profesionalesAll},
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

// Línea de control: si dos equipos ven cosas distintas, aquí se ve qué difiere.
function taxDraftDiagnostic(){
  const base=taxDrafts.base||{},info=taxDrafts.docsInfo;
  const when=base.actualizado?new Date(base.actualizado).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"—";
  const version=String((typeof loadedApplicationVersion!=="undefined"&&loadedApplicationVersion)||"").slice(0,7)||"—";
  return `Versión ${escapeHtml(version)} · base del ${escapeHtml(when)} (${Array.isArray(base.nominas)?base.nominas.length:"sin"} nóminas, ${(base.retencionesIrpf||[]).length} facturas con retención) · declaraciones: ${info?`${escapeHtml(info.source)}, ${info.total} PDF, ${info.model} del modelo ${escapeHtml(taxDrafts.model)} en ${taxDraftYear()}`:"buscando…"}`;
}
// Resumen anual que va implícito en el modelo trimestral (190 del 111, 180 del 115, 193 del 123).
const TAX_DRAFT_ANNUAL={"111":["190","Resumen anual de retenciones del trabajo y profesionales"],"115":["180","Resumen anual de retenciones de alquileres"],"123":["193","Resumen anual de retenciones del capital mobiliario"]};
function taxDraftAnnualRow(model,totals){
  const annual=TAX_DRAFT_ANNUAL[model];if(!annual)return"";
  const drafts=["1T","2T","3T","4T"].map(period=>taxDraftBuild(model,period));
  const ids=new Set();
  drafts.forEach(draft=>{
    const lists=Object.fromEntries(Object.entries(draft.lists||{}).map(([k,v])=>[k,(v||[]).filter(item=>item.incluir!==false)]));draft={...draft,lists};
    (draft.lists.alquileres||[]).forEach(item=>ids.add(item.nif||item.cuenta));
    (draft.lists.profesionales||[]).forEach(item=>ids.add(item.nif||item.cuenta));
    (draft.lists.trabajo||[]).forEach(entry=>(entry.trabajadores||[]).forEach(worker=>ids.add(worker.cuenta)));
    (draft.lists.capital||[]).forEach(entry=>ids.add(entry.id));
  });
  const control=declarationData(annual[0],"4T",taxDrafts.client,taxDraftYear());
  const status=control.submitted?["Presentado","pres"]:control.prepared?["Preparado","conf"]:["Pendiente","pend"];
  const open=taxDrafts.open==="anual",detail=open?`<tr class="td-detail td-annual-detail"><td colspan="7"><div class="td-card" data-td-annual-detail="${annual[0]}">${typeof window.taxDraftAnnualDetail==="function"&&window.taxDraftAnnualDetail(annual[0])||'<p class="td-note">El detalle de este resumen anual estará disponible más adelante.</p>'}</div></td></tr>`:"";
  return `<tr class="td-annual${open?" open":""}" data-td-annual="${annual[0]}" tabindex="0" aria-expanded="${open}" title="Desplegar el resumen anual"><td><strong><span class="td-caret">›</span> Declaración anual · Modelo ${annual[0]}</strong><small>${escapeHtml(annual[1])}</small></td><td class="num" title="${model==="123"?"Rentas del año":"Perceptores distintos en el año"}">${ids.size}</td><td class="num">${tdEur(totals.base)}</td><td class="num">${tdEur(totals.ret)}</td><td class="num td-dim">—</td><td><span class="td-pill ${status[1]}">${status[0]}</span></td><td></td></tr>${detail}`;
}
// La fila anual se despliega hacia abajo como los trimestres.
document.addEventListener("click",event=>{const row=event.target.closest("tr[data-td-annual]");if(!row||!document.querySelector("#tdMain")?.contains(row))return;taxDrafts.open=taxDrafts.open==="anual"?"":"anual";renderTaxDraftMain()});
document.addEventListener("keydown",event=>{const row=event.target.closest?.("tr[data-td-annual]");if(row&&(event.key==="Enter"||event.key===" ")){event.preventDefault();taxDrafts.open=taxDrafts.open==="anual"?"":"anual";renderTaxDraftMain()}});
function renderTaxDraftMain(){
  const box=document.querySelector("#tdMain");if(!box)return;
  const model=taxDrafts.model;
  if(taxDrafts.loading){box.innerHTML='<p class="td-note">Cargando…</p>';return}
  if(!model){box.innerHTML="";return}
  if(!TAX_DRAFT_BUILDERS[model]){box.innerHTML=`<p class="td-note">El borrador del modelo ${escapeHtml(model)} estará disponible más adelante.</p>`;return}
  if(!taxDrafts.base){box.innerHTML='<p class="td-note">Carga la base de AMCOMTA del cliente para ver el borrador.</p>';return}
  if(taxDraftBaseMismatch()){box.innerHTML='<p class="td-note">La base cargada no es de este cliente. Quítala con el botón de arriba y sube la suya.</p>';return}
  if(!Array.isArray(taxDrafts.base.retencionesIrpf)){box.innerHTML='<p class="td-note">La base cargada es de una versión anterior. Vuelve a añadirla en la ficha del cliente («Base de datos de contabilidad»).</p>';return}
  const year=taxDraftYear();let totals={base:0,ret:0,control:0},title="";
  const rows=["1T","2T","3T","4T"].map(period=>{
    const draft=taxDraftBuild(model,period),control=taxDraftControl(model,period),amount=control.amount===""||control.amount===undefined?null:Number(control.amount);
    title=draft.title;totals.base+=draft.summary.base;totals.ret+=draft.summary.retencion;totals.control+=amount||0;
    const controlCell=amount===null||Number.isNaN(amount)?'<span class="td-dim">Sin anotar</span>':Math.abs(amount-draft.result)<0.005?`<span class="td-ok">✓</span> ${tdEur(amount)}`:`<span class="td-warn">⚠</span> ${tdEur(amount)}`;
    const status=control.submitted?["Presentado","pres"]:control.draft?["Borrador confirmado","conf"]:["Pendiente","pend"];
    const doc=taxDrafts.documents.get(period),eye=doc?`<button type="button" class="td-decl" data-preview-document="${registerPreviewDocument(doc)}" title="Ver la declaración presentada (${escapeHtml(doc.name)})" aria-label="Ver la declaración presentada del ${period}">${tdEye}</button>`:control.draft?`<button type="button" class="td-decl td-decl-draft" data-tax-draft="${escapeHtml(declarationKey(model,period,taxDrafts.client,year))}" title="Ver el borrador confirmado (hasta que la declaración presentada esté en su carpeta)" aria-label="Ver el borrador confirmado del ${period}">${tdEye}</button>`:`<button type="button" class="td-decl" disabled title="${taxDrafts.docsFolder===false?"Este equipo no tiene conectada la carpeta de declaraciones":"La declaración presentada aún no está en la carpeta de declaraciones"}" aria-label="Sin declaración presentada">${tdLock}</button>`;
    const open=taxDrafts.open===period;
    return `<tr class="td-q${open?" open":""}" data-td-period="${period}" tabindex="0" aria-expanded="${open}"><td><span class="td-caret">›</span> ${period[0]}.º Trimestre</td><td class="num">${draft.summary.perceptores}</td><td class="num">${tdEur(draft.summary.base)}</td><td class="num"><b>${tdEur(draft.summary.retencion)}</b></td><td class="num">${controlCell}</td><td><span class="td-pill ${status[1]}">${status[0]}</span></td><td class="center">${eye}</td></tr>${open?`<tr class="td-detail"><td colspan="7"><div class="td-card">${taxDraftDetail(draft,control)}</div></td></tr>`:""}`;
  }).join("");
  box.innerHTML=`<div class="td-card-head"><span class="td-chip m${escapeHtml(model)}">${escapeHtml(model)}</span><strong>${escapeHtml(title)} · trimestral · ${year}</strong><span class="td-data-pill" title="Calculado con la base de AMCOMTA del cliente">Datos de contabilidad</span></div>
    <div class="td-table-wrap"><table class="td-table"><thead><tr><th>Período</th><th class="num">Perceptores</th><th class="num">${model==="111"?"Percepciones":"Base"}</th><th class="num">Retenciones</th><th class="num" title="Importe anotado en Control de declaraciones">Control decl.</th><th>Estado</th><th class="center" title="Declaración presentada en la carpeta de declaraciones">Presentada</th></tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><td>Total</td><td></td><td class="num">${tdEur(totals.base)}</td><td class="num">${tdEur(totals.ret)}</td><td class="num">${tdEur(totals.control)}</td><td colspan="2"></td></tr>${taxDraftAnnualRow(model,totals)}</tfoot></table></div>
    ${model==="111"&&!Array.isArray(taxDrafts.base.nominas)?'<p class="td-hint">Esta base se cargó antes de que la app leyera las nóminas: de momento solo se incluyen las retenciones de facturas. Vuelve a añadir la base en la ficha del cliente («Base de datos de contabilidad») para incluir los trabajadores.</p>':""}
    <p class="td-hint">Pulsa un trimestre para desplegar su borrador.</p>
    <p class="td-hint td-diag" title="Datos para comprobar que todos los equipos ven lo mismo">${taxDraftDiagnostic()}</p>`;
  box.querySelectorAll("tr.td-q").forEach(row=>{
    const toggle=event=>{if(event.target.closest(".td-decl"))return;const period=row.dataset.tdPeriod;taxDrafts.open=taxDrafts.open===period?"":period;renderTaxDraftMain()};
    row.addEventListener("click",toggle);row.addEventListener("keydown",event=>{if(event.key==="Enter")toggle(event)});
  });
  box.querySelectorAll("[data-td-eye]").forEach(button=>button.addEventListener("click",()=>openTaxDraftSide(button.dataset.tdEye,taxDraftBuild(model,taxDrafts.open))));
  box.querySelectorAll("[data-td-compl]").forEach(input=>input.addEventListener("change",()=>saveTaxDraftCompl(model,taxDrafts.open,input.dataset.tdCompl,input.type==="checkbox"?input.checked:input.value)));
  box.querySelector("[data-td-copy]")?.addEventListener("click",copyTaxDraftBoxes);
  box.querySelector("[data-td-confirm]")?.addEventListener("click",confirmTaxDraft);
}
// Modelo 111: casillas agrupadas como en el formulario de la AEAT (tres columnas por apartado).
function taxDraft111Grid(boxes,withEyes){
  const map=new Map(boxes.filter(box=>box.n).map(box=>[box.n,box]));
  const cell=(n,cap="")=>{const box=map.get(n)||{n,value:0,kind:["01","04","07","10","13","16","19","22","25"].includes(n)?"count":"money"},v=Number(box.value)||0;
    const eye=!withEyes?"":box.eye&&v?`<button type="button" class="td-eye" data-td-eye="${box.eye}" title="Ver lo que compone la casilla ${n}" aria-label="Ver el detalle de la casilla ${n}">${tdEye}</button>`:`<span class="td-eye off" title="Sin datos en la casilla ${n}" aria-label="Sin datos">${tdEyeOff}</span>`;
    return `<div class="tdg-cell${v?"":" zero"}"><span class="tdg-n">${n}</span><span class="tdg-cap">${cap}</span><span class="tdg-v">${box.kind==="count"?(v||"0"):tdEur(v)}</span>${eye}</div>`};
  const row=(label,ns,caps=["Nº de perceptores","Importe de las percepciones","Importe de las retenciones"])=>`<div class="tdg-row"><span class="tdg-label">${label}</span>${ns.map((n,i)=>cell(n,caps[i])).join("")}</div>`;
  const CAPS_ESP=["Nº de perceptores","Valor en especie","Ingresos a cuenta"];
  const head=(third="Importe de las retenciones")=>`<div class="tdg-row tdg-head"><span></span><span>Nº de perceptores</span><span>Importe de las percepciones</span><span>${third}</span></div>`;
  const especieHead=`<div class="tdg-row tdg-head tdg-sub"><span></span><span>Nº de perceptores</span><span>Valor percepciones en especie</span><span>Importe de los ingresos a cuenta</span></div>`;
  const section=(title,a,b,labels=["Dinerarios","En especie"])=>`<section class="tdg-sec"><h6>${title}</h6>${head()}${row(labels[0],a)}${especieHead}${row(labels[1],b,CAPS_ESP)}</section>`;
  const rest=["13","14","15","16","17","18","19","20","21","22","23","24","25","26","27"].some(n=>Number(map.get(n)?.value)||0);
  const others=`${section("III. Premios por la participación en juegos, concursos, rifas o combinaciones aleatorias",["13","14","15"],["16","17","18"],["Premios dinerarios","Premios en especie"])}
    ${section("IV. Ganancias patrimoniales de aprovechamientos forestales en montes públicos",["19","20","21"],["22","23","24"],["Dinerarias","En especie"])}
    <section class="tdg-sec"><h6>V. Contraprestaciones por la cesión de derechos de imagen (art. 92.8)</h6><div class="tdg-row tdg-head"><span></span><span>Nº de perceptores</span><span>Contraprestaciones satisfechas</span><span>Importe de los ingresos a cuenta</span></div>${row("Dinerarias o en especie",["25","26","27"],["Nº de perceptores","Contraprestaciones","Ingresos a cuenta"])}</section>`;
  const total=n=>{const box=map.get(n)||{n,value:0},v=Number(box.value)||0;return `<div class="tdg-total${n==="30"?" result":""}"><span class="tdg-label">${escapeHtml(box.label||"")}</span>${cell(n)}</div>`};
  return `<div class="tdg">${section("I. Rendimientos del trabajo",["01","02","03"],["04","05","06"])}${section("II. Rendimientos de actividades económicas",["07","08","09"],["10","11","12"])}
    <details class="tdg-more"${rest?" open":""}><summary>III a V · Premios, aprovechamientos forestales y derechos de imagen (casillas 13 a 27)${rest?"":" · sin importes"}</summary>${others}</details>
    <section class="tdg-sec tdg-tot"><h6>Total liquidación</h6>${total("28")}${total("29")}${total("30")}</section></div>`;
}
// Modelo 115 con el mismo aspecto: una columna de casillas con su ojo.
function taxDraft115Grid(boxes,withEyes){
  const map=new Map(boxes.filter(box=>box.n).map(box=>[box.n,box]));
  const line=n=>{const box=map.get(n)||{n,value:0},v=Number(box.value)||0;
    const eye=!withEyes?"":box.eye&&v?`<button type="button" class="td-eye" data-td-eye="${box.eye}" title="Ver lo que compone la casilla ${n}">${tdEye}</button>`:`<span class="td-eye off" title="Sin datos en la casilla ${n}">${tdEyeOff}</span>`;
    return `<div class="tdg-total${n==="05"?" result":""}"><span class="tdg-label">${escapeHtml(box.label||"")}</span><div class="tdg-cell${v?"":" zero"}"><span class="tdg-n">${n}</span><span class="tdg-cap"></span><span class="tdg-v">${box.kind==="count"?(v||"0"):tdEur(v)}</span>${eye}</div></div>`};
  return `<div class="tdg"><section class="tdg-sec tdg-tot"><h6>Retenciones e ingresos a cuenta</h6>${line("01")}${line("02")}${line("03")}${line("04")}${line("05")}</section></div>`;
}
function taxDraftBoxes(boxes,withEyes=true,model=""){
  if(model==="111")return taxDraft111Grid(boxes,withEyes);
  if(model==="115")return taxDraft115Grid(boxes,withEyes);
  return boxes.map(box=>box.heading?`<p class="td-heading">${escapeHtml(box.heading)}</p>`:`<div class="td-box ${box.cls||""}"><span class="td-n">${escapeHtml(box.n)}</span><span class="td-label">${escapeHtml(box.label)}</span><span class="td-value">${tdValue(box)}</span>${withEyes&&box.eye?`<button type="button" class="td-eye" data-td-eye="${box.eye}" title="Ver lo que compone esta casilla" aria-label="Ver el detalle de la casilla ${escapeHtml(box.n)}">${tdEye}</button>`:'<span></span>'}</div>`).join("");
}
function taxDraftSignature(draft){return JSON.stringify(draft.boxes.filter(box=>!box.heading).map(box=>[box.n,box.value]))}
function taxDraftDetail(draft,control){
  const result=draft.result,checks=[];
  const allItems=Object.values(draft.lists||{}).flat().filter(item=>item&&typeof item==="object");
  const arrastre=allItems.filter(item=>item.origen&&item.incluir!==false),fuera=allItems.filter(item=>item.incluir===false);
  if(arrastre.length)checks.push(`<div class="td-check warn">⚠ <div><b>${arrastre.length} percepci${arrastre.length===1?"ón":"ones"} de trimestres anteriores sin declarar</b>Se incluyen en este trimestre: ${tdEur(tdSum(arrastre,"retencion"))} de retención (${[...new Set(arrastre.map(item=>item.origen))].join(", ")}).</div></div>`);
  if(fuera.length)checks.push(`<div class="td-check warn">⚠ <div><b>${fuera.length} percepci${fuera.length===1?"ón":"ones"} sin incluir en este trimestre</b>${tdEur(tdSum(fuera,"retencion"))} de retención quedan fuera y aparecerán en el ${draft.period==="4T"?"resumen anual (no se declaran en ningún trimestre)":"siguiente trimestre"}.</div></div>`);
  const amount=control.amount===""||control.amount===undefined?null:Number(control.amount);
  if(amount===null||Number.isNaN(amount))checks.push(`<div class="td-check warn">⚠ <div><b>Aún no hay importe en Control de declaraciones</b>Al confirmar el borrador se anotarán la fecha de confección y ${tdEur(result)}.</div></div>`);
  else if(Math.abs(amount-result)<0.005)checks.push(`<div class="td-check ok">✓ <div><b>Coincide con Control de declaraciones</b>Borrador del trimestre: ${tdEur(result)} · Importe anotado: ${tdEur(amount)}.</div></div>`);
  else checks.push(`<div class="td-check bad">✕ <div><b>No coincide con Control de declaraciones: diferencia de ${tdEur(Math.abs(amount-result))}</b>Borrador del trimestre: ${tdEur(result)} · Importe anotado: ${tdEur(amount)}. Revisa si falta o sobra algún apunte en el trimestre o si el importe anotado es el correcto.</div></div>`);
  checks.push(...draft.checks());
  const confirmed=control.draft;
  const changed=confirmed&&(confirmed.signature?confirmed.signature!==taxDraftSignature(draft):Math.abs((Number(confirmed.result??confirmed.casillas?.["05"])||0)-result)>=0.005);
  const confirmNote=confirmed?`<p class="td-confirmed">${changed?"⚠ El borrador ha cambiado desde que se confirmó: ":"✓ "}Confirmado el ${tdDate(confirmed.confirmedAt)}${confirmed.confirmedBy?` por ${escapeHtml(confirmed.confirmedBy)}`:""} · ${tdEur(confirmed.result??confirmed.casillas?.["05"])}</p>`:"";
  return `<div class="td-detail-head"><b>Borrador modelo ${draft.model} · ${draft.period} ${draft.year}</b><span>${escapeHtml(taxDrafts.clientData?.cif||"")}${taxDrafts.clientData?.cif?" · ":""}${escapeHtml(taxDrafts.client)}</span></div>
    <div class="td-boxes">${taxDraftBoxes(draft.boxes,true,draft.model)}</div>${tdComplBlock(draft)}
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
  data.draft={model,period,year,client:taxDrafts.client,cif:taxDrafts.clientData?.cif||"",title:draft.title,boxes:draft.boxes,result:draft.result,signature:taxDraftSignature(draft),lists:draft.lists,complementaria:draft.complementaria||null,confirmedAt:new Date().toISOString(),confirmedBy:typeof signedInUser!=="undefined"&&signedInUser?.name||""};
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
  body.querySelectorAll("[data-td-incluir]").forEach(input=>input.addEventListener("change",()=>{
    toggleTaxDraftIncluir(draft.model,draft.period,input.dataset.tdIncluir,input.checked);
    openTaxDraftSide(kind,taxDraftBuild(draft.model,draft.period));
  }));
  body.querySelectorAll("[data-td-especie]").forEach(input=>input.addEventListener("change",()=>{
    toggleTaxDraftEspecie(draft.model,draft.period,input.dataset.tdEspecie,input.checked);
    openTaxDraftSide(kind,taxDraftBuild(draft.model,draft.period));
  }));
  document.querySelector("#tdShade").hidden=false;document.querySelector("#tdSide").classList.add("on");
}
function taxDraftLists(kind,draft,editable){
  if(kind==="people")return `<table class="td-list"><thead><tr><th>Arrendador</th><th>NIF</th><th>Cuenta</th><th class="num">Facturas</th><th class="num">Base</th><th class="num">Retención</th></tr></thead><tbody>${draft.people.map(person=>{const list=draft.lists.alquileres.filter(item=>(item.nif||item.cuenta)===(person.nif||person.cuenta));return `<tr><td>${escapeHtml(person.nombre)}</td><td>${escapeHtml(person.nif)}</td><td>${escapeHtml(person.cuenta)}</td><td class="num">${list.length}</td><td class="num">${tdEur(tdSum(list,"base"))}</td><td class="num">${tdEur(tdSum(list,"retencion"))}</td></tr>`}).join("")}</tbody></table>`;
  if(kind==="alquileres")return `<div data-td-list="alquileres">${taxDraftInvoiceTable(draft.lists.alquileres,{person:"Arrendador",editable})}</div>`;
  if(kind==="trabajo")return taxDraftNominaTable(draft.lists.trabajo,editable);
  if(kind==="profesionales")return `<div data-td-list="profesionales">${taxDraftInvoiceTable(draft.lists.profesionales,{person:"Profesional",especie:true,editable})}</div>`;
  return `<h4 class="td-list-title">Rendimientos del trabajo</h4>${taxDraftNominaTable(draft.lists.trabajo,editable)}<h4 class="td-list-title">Actividades económicas (profesionales)</h4><div data-td-list="profesionales">${taxDraftInvoiceTable(draft.lists.profesionales,{person:"Profesional",especie:true,editable})}</div>`;
}
function taxDraftEspecieCell(item,editable){return editable?`<input type="checkbox" data-td-especie="${escapeHtml(item.id)}"${item.especie?" checked":""} aria-label="En especie">`:item.especie?"Sí":"—"}
function taxDraftNominaTable(entries,editable){
  if(!entries.length)return'<p class="td-note td-pad">No hay nóminas con retención en el trimestre.</p>';
  const inc=entries.filter(entry=>entry.incluir!==false);
  return `<table class="td-list"><thead><tr><th class="center">Incluir</th><th>Fecha</th><th>Concepto</th><th class="num">Trabajadores</th><th class="num">Percepciones</th><th class="num">Retención</th><th class="num">%</th><th class="center">En especie</th></tr></thead><tbody>${entries.map(entry=>`<tr class="${entry.especie?"td-especie":""}${entry.incluir===false?" td-off":""}"><td class="center">${taxDraftIncluirCell(entry,editable)}</td><td>${tdDate(entry.fecha)}${tdOrigen(entry)}</td><td>${escapeHtml(entry.concepto||`Asiento ${entry.asiento}`)}<br><small>${escapeHtml(entry.trabajadores.map(worker=>worker.nombre).join(" · "))}</small></td><td class="num">${entry.trabajadores.length}</td><td class="num">${tdEur(entry.percepciones)}</td><td class="num">${tdEur(entry.retencion)}</td><td class="num">${entry.percepciones?`${(entry.retencion/entry.percepciones*100).toFixed(2).replace(".",",")} %`:"—"}</td><td class="center">${taxDraftEspecieCell(entry,editable)}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="4">Total incluido</td><td class="num">${tdEur(tdSum(inc,"percepciones"))}</td><td class="num">${tdEur(tdSum(inc,"retencion"))}</td><td colspan="2"></td></tr></tfoot></table>`;
}
function taxDraftInvoiceTable(items,options={}){
  if(!items.length)return'<p class="td-note td-pad">No hay facturas con retención en el trimestre.</p>';
  const especie=Boolean(options.especie),inc=items.filter(item=>item.incluir!==false);
  return `<table class="td-list td-invoices"><thead><tr><th class="center">Incluir</th><th>Fecha</th><th>Nº factura</th><th>${options.person||"Proveedor"}</th><th class="center" title="Factura guardada en la carpeta del cliente">Factura</th><th class="num">Base</th><th class="num">%</th><th class="num">Retención</th>${especie?'<th class="center">En especie</th>':""}</tr></thead><tbody>${items.map((item,index)=>`<tr class="${item.especie?"td-especie":""}${item.incluir===false?" td-off":""}"><td class="center">${taxDraftIncluirCell(item,options.editable)}</td><td>${tdDate(item.fecha)}${tdOrigen(item)}</td><td>${escapeHtml(item.numero)}</td><td>${escapeHtml(item.nombre)}<br><small>${escapeHtml(item.nif)}</small></td><td class="center" data-td-file="${index}"><span class="td-file-wait" title="Buscando la factura…">…</span></td><td class="num">${tdEur(item.base)}</td><td class="num">${escapeHtml(item.porcentaje)} %</td><td class="num">${tdEur(item.retencion)}</td>${especie?`<td class="center">${taxDraftEspecieCell(item,options.editable)}</td>`:""}</tr>`).join("")}</tbody><tfoot><tr><td colspan="5">Total incluido</td><td class="num">${tdEur(tdSum(inc,"base"))}</td><td></td><td class="num">${tdEur(tdSum(inc,"retencion"))}</td>${especie?"<td></td>":""}</tr></tfoot></table>`;
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
/* --- Documento del borrador con el aspecto del impreso oficial (111 y 115) --- */
const tdFormMoney=value=>{const number=Number(value)||0;if(!number)return"";const [int,dec]=Math.abs(number).toFixed(2).split(".");return(number<0?"−":"")+int.replace(/\B(?=(\d{3})+(?!\d))/g,".")+","+dec};
function taxDraftFormHtml(draft,client={}){
  const boxes=new Map((draft.boxes||[]).filter(box=>box.n).map(box=>[box.n,box]));
  const val=n=>{const box=boxes.get(n);if(!box)return"";return box.kind==="count"?(Number(box.value)?String(box.value):""):tdFormMoney(box.value)};
  const cell=(n,head)=>`<div class="af-cell">${head?`<small>${head}</small>`:""}<div class="af-box"><b>${n}</b><span>${escapeHtml(val(n))}</span></div></div>`;
  const row=(label,ns,heads)=>`<div class="af-row"><span class="af-label">${label}</span>${ns.map((n,i)=>cell(n,heads[i])).join("")}</div>`;
  const din=["N.º de perceptores","Importe de las percepciones","Importe de las retenciones"],esp=["N.º de perceptores","Valor percepciones en especie","Importe de los ingresos a cuenta"];
  const address=client.registeredAddress||{},result=Number(boxes.get(draft.model==="111"?"30":"05")?.value)||0;
  const nif=draft.cif||client.cif||"",name=draft.client||client.name||"";
  const period=String(draft.period||"").replace(/^([1-4])T$/,"$1T");
  const titles={"111":["Retenciones e ingresos a cuenta del IRPF","Rendimientos del trabajo y de actividades económicas, premios y determinadas ganancias patrimoniales e imputaciones de renta","Declaración - Documento de ingreso"],
    "115":["Retenciones e ingresos a cuenta","Rentas o rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos","Declaración - Documento de ingreso"]}[draft.model]||[`Modelo ${draft.model}`,"",""];
  const ident=draft.model==="115"
    ?`<div class="af-grid af-g2"><label><small>N.I.F.</small><span>${escapeHtml(nif)}</span></label><label><small>Apellidos y nombre, denominación o razón social</small><span>${escapeHtml(name)}</span></label></div>
      <div class="af-grid af-g1"><label><small>Domicilio fiscal</small><span>${escapeHtml(address.address||"")}</span></label></div>
      <div class="af-grid af-g3"><label><small>Municipio</small><span>${escapeHtml(address.municipality||"")}</span></label><label><small>Provincia</small><span>${escapeHtml(address.province||"")}</span></label><label><small>Código postal</small><span>${escapeHtml(address.postalCode||"")}</span></label></div>`
    :`<div class="af-grid af-g2"><label><small>NIF</small><span>${escapeHtml(nif)}</span></label><label><small>Apellidos y nombre o razón social</small><span>${escapeHtml(name)}</span></label></div>`;
  const liquid=draft.model==="111"
    ?`<h5>I. Rendimientos del trabajo</h5>${row("Rendimientos dinerarios",["01","02","03"],din)}${row("Rendimientos en especie",["04","05","06"],esp)}
      <h5>II. Rendimientos de actividades económicas</h5>${row("Rendimientos dinerarios",["07","08","09"],din)}${row("Rendimientos en especie",["10","11","12"],esp)}
      <h5>III. Premios por la participación en juegos, concursos, rifas o combinaciones aleatorias</h5>${row("Premios en metálico",["13","14","15"],din)}${row("Premios en especie",["16","17","18"],esp)}
      <h5>IV. Ganancias patrimoniales derivadas de los aprovechamientos forestales de los vecinos en montes públicos</h5>${row("Percepciones dinerarias",["19","20","21"],din)}${row("Percepciones en especie",["22","23","24"],esp)}
      <h5>V. Contraprestaciones por la cesión de derechos de imagen</h5>${row("Contraprestaciones dinerarias o en especie",["25","26","27"],["N.º de perceptores","Contraprestaciones satisfechas","Importe de los ingresos a cuenta"])}
      <div class="af-total"><h5>Total liquidación</h5>${row("Suma de retenciones e ingresos a cuenta ([03]+[06]+[09]+[12]+[15]+[18]+[21]+[24]+[27])",["28"],[""])}${row("A deducir (exclusivamente en caso de declaración complementaria)",["29"],[""])}${row("<strong>Resultado a ingresar ([28] − [29])</strong>",["30"],[""])}</div>`
    :`<h5>Retenciones e ingresos a cuenta</h5>${row("N.º de perceptores",["01"],[""])}${row("Base de las retenciones e ingresos a cuenta",["02"],[""])}${row("Retenciones e ingresos a cuenta",["03"],[""])}${row("A deducir (exclusivamente en caso de declaración complementaria)",["04"],[""])}${row("<strong>Resultado a ingresar ([03] − [04])</strong>",["05"],[""])}`;
  const check=on=>`<i class="af-check">${on?"X":""}</i>`;
  return `<div class="aeat-form m${escapeHtml(draft.model)}"><div class="af-watermark">BORRADOR</div>
    <div class="af-head"><div class="af-agency"><strong>Agencia Tributaria</strong><small>Documento preparado por Asesoría Molinero</small></div><div class="af-title"><strong>${escapeHtml(titles[0])}</strong><span>${escapeHtml(titles[1])}</span><em>${escapeHtml(titles[2])}</em></div><div class="af-model"><small>Modelo</small><b>${escapeHtml(draft.model)}</b></div></div>
    <section class="af-sec"><div class="af-side">Declarante</div><div class="af-body af-ident"><div>${ident}</div><div class="af-devengo"><div class="af-side af-side-sm">Devengo</div><label><small>Ejercicio</small><span>${escapeHtml(draft.year||"")}</span></label><label><small>Período</small><span>${escapeHtml(period)}</span></label></div></div></section>
    <section class="af-sec"><div class="af-side">Liquidación</div><div class="af-body">${liquid}</div></section>
    <div class="af-split">
      <section class="af-sec"><div class="af-side">Ingreso</div><div class="af-body"><div class="af-row"><span class="af-label">Importe del ingreso (casilla ${draft.model==="111"?"30":"05"})</span><div class="af-cell"><div class="af-box af-ingreso"><b>I</b><span>${escapeHtml(tdFormMoney(result))}</span></div></div></div><p class="af-line">Forma de pago: ${check(false)} En efectivo ${check(false)} E.C. adeudo en cuenta</p></div></section>
      <section class="af-sec"><div class="af-side">${result?"Complementaria":"Negativa"}</div><div class="af-body">${result?`<p class="af-line">${check(false)} Declaración complementaria</p><p class="af-line"><small>N.º de justificante</small> ____________________</p>`:`<p class="af-line">${check(true)} Declaración negativa</p>`}</div></section>
    </div>
    <section class="af-sec"><div class="af-side">Firma</div><div class="af-body"><p class="af-line">En ______________________, a ${new Date(draft.confirmedAt||Date.now()).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</p><p class="af-line">Firma:</p></div></section>
    <p class="af-foot">Borrador preparado con los datos de la contabilidad${draft.confirmedBy?` · confirmado por ${escapeHtml(draft.confirmedBy)}`:""}. No válido para su presentación.</p></div>`;
}
const AEAT_FORM_CSS=`.aeat-form{position:relative;width:100%;max-width:820px;margin:0 auto;padding:18px;background:#fff;color:#1d2a44;font:12px/1.35 Arial,Helvetica,sans-serif;border:1px solid #c9d3e6;overflow:hidden}
.aeat-form .af-watermark{position:absolute;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-size:110px;font-weight:900;letter-spacing:.08em;color:rgba(31,74,153,.06);pointer-events:none;white-space:nowrap}
.aeat-form .af-head{display:grid;grid-template-columns:170px 1fr 92px;gap:10px;margin-bottom:10px}
.aeat-form .af-agency{display:flex;flex-direction:column;justify-content:center;padding:8px 10px;border:1px solid #c9d3e6;border-radius:4px}.aeat-form .af-agency strong{font-size:16px;color:#123}.aeat-form .af-agency small{color:#6a7690;font-size:9.5px;margin-top:3px}
.aeat-form .af-title{background:#1f4a99;color:#fff;border-radius:4px;padding:8px 12px;text-align:center;display:flex;flex-direction:column;gap:3px}.aeat-form .af-title strong{font-size:15px}.aeat-form .af-title span{font-size:10.5px}.aeat-form .af-title em{font-style:normal;font-weight:700;font-size:11.5px}
.aeat-form .af-model{background:#b9c6de;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center}.aeat-form .af-model small{font-size:11px;font-weight:700}.aeat-form .af-model b{font-size:34px;line-height:1}
.aeat-form .af-sec{display:grid;grid-template-columns:24px 1fr;border:1.5px solid #a9b8d6;border-radius:5px;margin-bottom:10px;background:rgba(255,255,255,.8)}
.aeat-form .af-side{background:#b9c6de;writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;font-weight:700;font-size:11px;padding:6px 0;color:#1d2a44}
.aeat-form .af-body{padding:8px 10px;min-width:0}
.aeat-form .af-ident{display:grid;grid-template-columns:1fr 210px;gap:10px}
.aeat-form .af-devengo{display:grid;grid-template-columns:20px minmax(0,1fr) minmax(0,1fr);gap:6px;padding-right:6px;border:1px solid #a9b8d6;border-radius:4px;overflow:hidden;align-items:center}.aeat-form .af-side-sm{height:100%;font-size:9px}
.aeat-form .af-grid{display:grid;gap:6px;margin-bottom:6px}.aeat-form .af-g1{grid-template-columns:1fr}.aeat-form .af-g2{grid-template-columns:150px 1fr}.aeat-form .af-g3{grid-template-columns:1fr 1fr 110px}
.aeat-form label{display:flex;flex-direction:column;gap:2px;margin:0}.aeat-form label small{font-size:9px;color:#56627c}.aeat-form label span{display:block;min-height:22px;padding:3px 6px;border:1px solid #a9b8d6;border-radius:3px;font-weight:700;font-size:12.5px;background:#fff}
.aeat-form h5{margin:8px 0 3px;font-size:11.5px;font-weight:700}
.aeat-form .af-row{display:flex;align-items:flex-end;gap:8px;margin:2px 0 4px}.aeat-form .af-label{flex:1;font-size:11px;padding-bottom:5px;border-bottom:1px dotted #a9b8d6;min-width:0}
.aeat-form .af-cell{width:150px;flex:none}.aeat-form .af-cell small{display:block;font-size:8.5px;color:#56627c;text-align:center;margin-bottom:1px}
.aeat-form .af-box{display:flex;border:1px solid #6f81a8;border-radius:3px;height:24px;background:#fff}.aeat-form .af-box b{width:24px;display:grid;place-items:center;border-right:1px solid #6f81a8;font-size:10.5px;background:#eef2fa}.aeat-form .af-box span{flex:1;text-align:right;padding:3px 6px;font-weight:700;font-size:12.5px;font-variant-numeric:tabular-nums}
.aeat-form .af-total{border-top:1.5px solid #a9b8d6;margin-top:8px;padding-top:2px}
.aeat-form .af-split{display:grid;grid-template-columns:1.4fr 1fr;gap:10px}
.aeat-form .af-ingreso b{font-family:Georgia,serif}
.aeat-form .af-line{margin:6px 0;font-size:11.5px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.aeat-form .af-check{display:inline-grid;place-items:center;width:15px;height:15px;border:1px solid #6f81a8;font-style:normal;font-weight:700;font-size:11px}
.aeat-form .af-foot{margin:6px 0 0;font-size:9.5px;color:#6a7690;text-align:center}
@media(max-width:700px){.aeat-form .af-head{grid-template-columns:1fr 70px}.aeat-form .af-agency{display:none}.aeat-form .af-ident,.aeat-form .af-split{grid-template-columns:1fr}.aeat-form .af-cell{width:110px}}`;
function printTaxDraftForm(html,title){
  const win=window.open("","_blank");if(!win){alert("Permite las ventanas emergentes para imprimir el borrador.");return}
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${AEAT_FORM_CSS}@page{size:A4;margin:10mm}body{margin:0;background:#fff}.aeat-form{border:0;max-width:none;padding:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script></body></html>`);
  win.document.close();
}
async function openConfirmedTaxDraft(key){
  let data={};try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
  const draft=data.draft;if(!draft)return;
  // Borradores del 115 confirmados con la primera versión (casillas sueltas).
  const boxes=draft.boxes||[["01","Número de perceptores","count"],["02","Base de las retenciones e ingresos a cuenta","money"],["03","Retenciones e ingresos a cuenta","money"],["04","A deducir (declaración complementaria)","money"],["05","Resultado a ingresar","money"]].map(([n,label,kind],index)=>({n,label,kind,value:draft.casillas?.[n]||0,cls:index===4?"total":""}));
  const full={...draft,boxes};
  let client={};try{client=(await getAllClientMetadata()).find(item=>item.name===draft.client||item.id===draft.client)||{}}catch{}
  const lists=draft.lists||{alquileres:draft.items||[]};
  document.querySelector("#tdDraftView")?.remove();
  const view=document.createElement("div");view.id="tdDraftView";view.className="td-modal";view.setAttribute("role","dialog");view.setAttribute("aria-modal","true");
  const listHtml=[lists.alquileres?`<h4>Facturas (${lists.alquileres.length})</h4><div data-td-list="alquileres">${taxDraftInvoiceTable(lists.alquileres,{person:"Arrendador"})}</div>`:"",lists.trabajo?`<h4>Nóminas (${lists.trabajo.length})</h4>${taxDraftNominaTable(lists.trabajo,false)}`:"",lists.profesionales?`<h4>Facturas de profesionales (${lists.profesionales.length})</h4><div data-td-list="profesionales">${taxDraftInvoiceTable(lists.profesionales,{person:"Profesional",especie:true})}</div>`:""].join("");
  const form=taxDraftFormHtml(full,client),title=`Borrador modelo ${draft.model} ${draft.period} ${draft.year} ${draft.client}`;
  view.innerHTML=`<div class="td-modal-box td-form-modal"><header><div><span class="td-tag">Borrador confirmado</span><h3>Modelo ${escapeHtml(draft.model)} · ${escapeHtml(draft.period)} ${escapeHtml(draft.year)}</h3><p>${escapeHtml(draft.cif?draft.cif+" · ":"")}${escapeHtml(draft.client)} · confirmado el ${tdDate(draft.confirmedAt)}${draft.confirmedBy?` por ${escapeHtml(draft.confirmedBy)}`:""}</p></div><div class="td-form-actions"><button type="button" class="secondary-button" data-td-print>Imprimir / guardar PDF</button><button type="button" class="td-close" aria-label="Cerrar">×</button></div></header>
    <div class="td-modal-body"><style>${AEAT_FORM_CSS}</style>${form}${listHtml?`<details class="td-form-annex"><summary>Detalle de la contabilidad</summary>${listHtml}</details>`:""}</div></div>`;
  document.body.append(view);
  view.querySelector("[data-td-print]").addEventListener("click",()=>printTaxDraftForm(form,title));
  if(lists.alquileres)fillTaxDraftInvoiceFiles(view.querySelector('[data-td-list="alquileres"]'),draft.client,lists.alquileres);
  if(lists.profesionales)fillTaxDraftInvoiceFiles(view.querySelector('[data-td-list="profesionales"]'),draft.client,lists.profesionales);
  const close=()=>{view.remove();document.removeEventListener("keydown",onKey)},onKey=event=>{if(event.key==="Escape")close()};
  view.addEventListener("click",event=>{if(event.target===view||event.target.closest(".td-close"))close()});document.addEventListener("keydown",onKey);
}
document.addEventListener("click",event=>{const button=event.target.closest("[data-tax-draft]");if(!button)return;event.preventDefault();openConfirmedTaxDraft(button.dataset.taxDraft)});

/* ===== Ficha del cliente: base de datos de contabilidad (AMCOMTA) ===== */
// Cada cliente tiene su propia base; Borradores usa siempre la del cliente seleccionado.
(function(){
  if(typeof syncClientPortalAccessBlock!=="function")return;
  const fecha=value=>value?new Date(value).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
  let turno=0;
  function instalar(){
    const form=document.querySelector("#newClientForm"),after=form?.querySelector(".fiscal-obligations");
    if(!form||!after)return null;
    let box=form.querySelector(".client-accounting-base");if(box)return box;
    box=document.createElement("fieldset");box.className="client-accounting-base";
    box.innerHTML=`<legend>Base de datos de contabilidad</legend><p>Base de AMCOMTA (.MDB) de este cliente. Es la que usan los borradores de sus modelos.</p>
      <div class="cab-row"><div class="cab-status" data-cab-status>—</div><div class="cab-actions"><label class="secondary-button cab-upload"><span data-cab-label>Añadir base de datos</span><input type="file" accept=".mdb,.accdb" hidden data-cab-file></label><button type="button" class="secondary-button cab-remove" data-cab-remove hidden>Quitar</button></div></div>`;
    after.after(box);
    box.querySelector("[data-cab-file]").addEventListener("change",async event=>{
      const input=event.currentTarget,file=input.files[0],client=form.dataset.editing;input.value="";
      if(!file||!client)return;
      const status=box.querySelector("[data-cab-status]");status.textContent=`Leyendo ${file.name}…`;
      try{const result=await uploadClientAccountingBase(client,file);if(result&&typeof taxDrafts!=="undefined"&&taxDrafts.client===client)taxDrafts.base=result}
      catch(error){alert(error.message)}
      refrescar();
    });
    box.querySelector("[data-cab-remove]").addEventListener("click",async()=>{
      const client=form.dataset.editing;if(!client||!confirm(`¿Quitar la base de datos de contabilidad de ${client}?`))return;
      try{await apiJson(`/api/contabilidad/base?client=${encodeURIComponent(client)}`,{method:"DELETE"})}catch(error){alert(error.message)}
      refrescar();
    });
    return box;
  }
  async function refrescar(){
    const box=instalar();if(!box)return;
    const form=document.querySelector("#newClientForm"),client=form.dataset.editing||"",yo=++turno;
    const status=box.querySelector("[data-cab-status]"),label=box.querySelector("[data-cab-label]"),upload=box.querySelector(".cab-upload"),remove=box.querySelector("[data-cab-remove]"),input=box.querySelector("[data-cab-file]");
    // Se puede subir aunque la ficha esté en modo consulta: se guarda al momento, no con «Guardar».
    setTimeout(()=>{input.disabled=!client},0);
    upload.classList.toggle("disabled",!client);remove.hidden=true;label.textContent="Añadir base de datos";
    if(!client){status.innerHTML='<span class="cab-dim">Guarda primero el cliente para añadir su base de datos.</span>';return}
    status.innerHTML='<span class="cab-dim">Comprobando…</span>';
    let base=null;try{base=await apiJson(`/api/contabilidad/base?client=${encodeURIComponent(client)}`)}catch{}
    if(yo!==turno)return;
    if(!base?.empresa&&!base?.actualizado){status.innerHTML='<span class="cab-dim">Sin base de datos.</span>';return}
    const otra=base.empresa&&declarationClientScore(client,normalizeFiscalText(String(base.empresa).replace(/\b20\d\d\b/g," ")))<0.5;
    status.innerHTML=`${otra?'<b class="cab-warn">⚠ Es de otra empresa:</b> ':'<b class="cab-ok">✓</b> '}<strong>${escapeHtml(base.empresa||client)}</strong>${base.ejercicio?` · ejercicio ${escapeHtml(base.ejercicio)}`:""}<small>${base.actualizado?`Actualizada el ${escapeHtml(fecha(base.actualizado))}`:""}${base.actualizadoPor?` por ${escapeHtml(base.actualizadoPor)}`:""}</small>`;
    label.textContent="Actualizar base de datos";remove.hidden=false;
  }
  const previo=syncClientPortalAccessBlock;
  syncClientPortalAccessBlock=function(){const r=previo.apply(this,arguments);try{refrescar()}catch{}return r};
  if(typeof setClientViewMode==="function"){const previoModo=setClientViewMode;setClientViewMode=function(){const r=previoModo.apply(this,arguments);const input=document.querySelector("[data-cab-file]");if(input)input.disabled=!document.querySelector("#newClientForm")?.dataset.editing;return r}}
})();
