/* Modelo 347 en Borradores. Se carga después de borradores.js (desde despacho-cliente.js) y se
   engancha a su vista: cuando el modelo elegido es el 347 dibuja la declaración anual. */
(function(){
if(typeof TAX_DRAFT_MODELS==="undefined"||typeof renderTaxDraftMain!=="function")return;
TAX_DRAFT_MODELS["347"]={title:"Operaciones con terceros",ready:true};
/* ===== Modelo 347: declaración anual de operaciones con terceras personas ===== */
// Terceros que superan 3.005,06 € en el año (IVA incluido) con su importe por trimestres. La clave de
// operación, la provincia y el país se pueden ajustar; quedan guardados con el Control de declaraciones.
const M347_PERIOD="4T";
const M347_CLAVES=[["A","A · Adquisiciones de bienes y servicios"],["B","B · Entregas de bienes y prestaciones de servicios"],["C","C · Cobros por cuenta de terceros"],["D","D · Adquisiciones de entidades públicas"],["E","E · Subvenciones y ayudas de las Administraciones públicas"],["F","F · Ventas de agencias de viajes"],["G","G · Compras de agencias de viajes"]];
const M347_PROVINCIAS={"01":"Álava","02":"Albacete","03":"Alicante","04":"Almería","05":"Ávila","06":"Badajoz","07":"Illes Balears","08":"Barcelona","09":"Burgos","10":"Cáceres","11":"Cádiz","12":"Castellón","13":"Ciudad Real","14":"Córdoba","15":"A Coruña","16":"Cuenca","17":"Girona","18":"Granada","19":"Guadalajara","20":"Gipuzkoa","21":"Huelva","22":"Huesca","23":"Jaén","24":"León","25":"Lleida","26":"La Rioja","27":"Lugo","28":"Madrid","29":"Málaga","30":"Murcia","31":"Navarra","32":"Ourense","33":"Asturias","34":"Palencia","35":"Las Palmas","36":"Pontevedra","37":"Salamanca","38":"S.C. Tenerife","39":"Cantabria","40":"Segovia","41":"Sevilla","42":"Soria","43":"Tarragona","44":"Teruel","45":"Toledo","46":"Valencia","47":"Valladolid","48":"Bizkaia","49":"Zamora","50":"Zaragoza","51":"Ceuta","52":"Melilla","99":"Extranjero"};
const m347Key=item=>`${item.clave}|${item.id}`;
function m347State(){const data=declarationData("347",M347_PERIOD,taxDrafts.client,taxDraftYear());const m=data.m347||{};for(const k of ["claves","incluir","provincias","paises","detalle"])m[k]=m[k]||{};return{data,m}}
function m347Save(change){
  const year=taxDraftYear(),key=declarationKey("347",M347_PERIOD,taxDrafts.client,year),{data,m}=m347State();
  change(m);data.m347=m;localStorage.setItem(key,JSON.stringify(data));
}
function m347Rows(){
  const year=taxDraftYear(),{m}=m347State();
  return (taxDrafts.base?.terceros347||[]).filter(item=>Number(item.ejercicio)===year).map(item=>{
    const key=m347Key(item),cpProv=/^\d{5}$/.test(item.cp)?item.cp.slice(0,2):"";
    const provincia=m.provincias[key]??(item.pais?"99":cpProv),pais=m.paises[key]??item.pais??"";
    const incluir=m.incluir[key]??Boolean(item.nif);
    const det=m.detalle[key]||{},nif=(det.nif??item.nif??"").toUpperCase(),nombre=det.nombre??item.nombre;
    return{...item,nif,nombre,det,key,claveFinal:m.claves[key]||item.clave,provincia,pais,incluir,aviso:!nif?"Sin NIF en la contabilidad":(!provincia&&!pais?"Falta la provincia":"")};
  });
}
function m347Totals(rows){const inc=rows.filter(row=>row.incluir);return{count:inc.length,total:tdRound(inc.reduce((sum,row)=>sum+row.total,0)),rows:inc}}
// Teléfono y persona de contacto del declarante (propios del 347). Se recuerda el último usado.
const M347_CONTACT_KEY="app-am-347-contacto";
function m347Contact(){const {m}=state347();let last={};try{last=JSON.parse(localStorage.getItem(M347_CONTACT_KEY)||"{}")}catch{}return{telefono:m.contacto?.telefono??last.telefono??"",nombre:m.contacto?.nombre??last.nombre??""}}
const state347=()=>m347State();
const M347_CHECKS=[["seguro","Operación seguro"],["arrendamiento","Arrendamiento local negocio"],["ivaCaja","Operación IVA de caja"],["inversion","Operación con inversión del sujeto pasivo"],["deposito","Op. con bienes vinculados o destinados a vincularse al régimen de depósito distinto del aduanero"]];
const m347Num=value=>{const n=Number(String(value??"").replace(/\./g,"").replace(",","."));return Number.isFinite(n)?tdRound(n):0};
const m347Fmt=value=>value===undefined||value===null||value===""?"":String(value);
function m347DetailForm(row){
  const det=row.det||{},key=escapeHtml(row.key),inm=det.inmuebles||["","","",""];
  const input=(field,label,value,extra="")=>`<label class="m347-f"><small>${label}</small><input data-m347-det="${field}" data-key="${key}" value="${escapeHtml(m347Fmt(value))}" ${extra}></label>`;
  const provincias=`<select data-m347-prov="${key}"><option value="">—</option>${Object.entries(M347_PROVINCIAS).map(([c,n])=>`<option value="${c}"${c===row.provincia?" selected":""}>${c} · ${escapeHtml(n)}</option>`).join("")}</select>`;
  const anualInm=tdRound(inm.reduce((s,v)=>s+m347Num(v),0));
  return `<div class="m347-detform"><h5>Datos del declarado</h5>
    <div class="m347-fgrid c3">${input("nif","NIF declarado",row.nif,'maxlength="9"')}${input("nifComunitario","NIF operador comunitario",det.nifComunitario,'maxlength="17"')}${input("nifRepresentante","NIF del representante legal",det.nifRepresentante,'maxlength="9"')}</div>
    <div class="m347-fgrid c1">${input("nombre","Apellidos y nombre, razón social o denominación del declarado",row.nombre)}</div>
    <div class="m347-fgrid c3"><label class="m347-f"><small>Código provincia</small>${provincias}</label><label class="m347-f"><small>Código país</small><input data-m347-pais="${key}" value="${escapeHtml(row.pais)}" maxlength="2" placeholder="Solo no residentes"></label><label class="m347-f"><small>Clave operación</small><select data-m347-clave="${key}">${M347_CLAVES.map(([c,label])=>`<option value="${c}"${c===row.claveFinal?" selected":""}>${escapeHtml(label)}</option>`).join("")}</select></label></div>
    <div class="m347-checks">${M347_CHECKS.map(([field,label])=>`<label><input type="checkbox" data-m347-det="${field}" data-key="${key}"${det[field]?" checked":""}><span>${escapeHtml(label)}</span></label>`).join("")}</div>
    <div class="m347-fgrid c2"><div><small class="m347-cap">Importe trimestral de las operaciones</small>${row.trimestres.map((v,q)=>`<div class="m347-qrow"><b>${q+1}T</b><span class="m347-ro">${tdEur(v)}</span></div>`).join("")}</div>
      <div><small class="m347-cap">Importe trimestral percibido por transmisiones de inmuebles sujetas a IVA</small>${[0,1,2,3].map(q=>`<div class="m347-qrow"><b>${q+1}T</b><input data-m347-inm="${q}" data-key="${key}" value="${escapeHtml(m347Fmt(inm[q]))}" inputmode="decimal"></div>`).join("")}</div></div>
    <div class="m347-fgrid c4"><label class="m347-f"><small>Importe anual de las operaciones</small><span class="m347-ro">${tdEur(row.total)}</span></label><label class="m347-f"><small>Importe anual percibido por transmisiones de inmuebles sujetas a IVA</small><span class="m347-ro">${anualInm?tdEur(anualInm):"—"}</span></label>${input("ivaCajaAnual","Importe anual de las operaciones devengadas conforme al criterio de caja del IVA",det.ivaCajaAnual,'inputmode="decimal"')}${input("bdns","Número de convocatoria BDNS",det.bdns)}</div>
    <div class="m347-fgrid c4">${input("metalico","Importe percibido en metálico",det.metalico,'inputmode="decimal"')}${input("ejercicioMetalico","Ejercicio",det.ejercicioMetalico,'maxlength="4" inputmode="numeric"')}</div>
  </div>`;
}
function renderTaxDraft347(box){
  const base=taxDrafts.base,year=taxDraftYear();
  if(!Array.isArray(base?.terceros347)){box.innerHTML='<p class="td-note">La base de este cliente aún no tiene los datos del 347. Se recalculan solos si la base se añadió desde la ficha del cliente; si no, vuelve a añadirla allí.</p>';return}
  const rows=m347Rows(),t=m347Totals(rows),control=declarationData("347",M347_PERIOD,taxDrafts.client,year),doc=taxDrafts.doc347;
  const status=control.submitted?["Presentado","pres"]:control.draft?["Borrador confirmado","conf"]:["Pendiente","pend"];
  const eye=doc?`<button type="button" class="td-decl" data-preview-document="${registerPreviewDocument(doc)}" title="Ver la declaración presentada (${escapeHtml(doc.name)})">${tdEye}</button>`:control.draft?`<button type="button" class="td-decl td-decl-draft" data-tax-draft="${escapeHtml(declarationKey("347",M347_PERIOD,taxDrafts.client,year))}" title="Ver el borrador confirmado (hasta que la declaración presentada esté en su carpeta)">${tdEye}</button>`:`<button type="button" class="td-decl" disabled title="La declaración presentada aún no está en la carpeta de declaraciones">${tdLock}</button>`;
  const clave=row=>`<select class="m347-clave" data-m347-clave="${escapeHtml(row.key)}" title="${escapeHtml(M347_CLAVES.find(c=>c[0]===row.claveFinal)?.[1]||"")}">${M347_CLAVES.map(([c,label])=>`<option value="${c}"${c===row.claveFinal?" selected":""} title="${escapeHtml(label)}">${escapeHtml(label)}</option>`).join("")}</select>`;
  const open=taxDrafts.open347||"";
  const body=rows.map((row,index)=>`<tr class="m347-row${row.incluir?"":" off"}${open===row.key?" open":""}" data-m347-row="${escapeHtml(row.key)}">
      <td class="center"><input type="checkbox" data-m347-incluir="${escapeHtml(row.key)}"${row.incluir?" checked":""} title="Incluir en la declaración"></td>
      <td><button type="button" class="m347-name" data-m347-open="${escapeHtml(row.key)}"><span class="td-caret">›</span><span><strong>${escapeHtml(row.nombre||"Sin nombre")}</strong><small>${escapeHtml(row.nif||"Sin NIF")}${row.aviso?` · <b class="m347-warn">${escapeHtml(row.aviso)}</b>`:""}</small></span></button></td>
      <td><input class="m347-small" maxlength="2" inputmode="numeric" data-m347-prov="${escapeHtml(row.key)}" value="${escapeHtml(row.provincia)}" title="${escapeHtml(M347_PROVINCIAS[row.provincia]||"Código de provincia")}"></td>
      <td><input class="m347-small" maxlength="2" data-m347-pais="${escapeHtml(row.key)}" value="${escapeHtml(row.pais)}" placeholder="—" title="Código de país (solo no residentes)"></td>
      <td>${clave(row)}</td>
      ${row.trimestres.map(value=>`<td class="num">${value?tdEur(value):'<span class="td-dim">—</span>'}</td>`).join("")}
      <td class="num"><b>${tdEur(row.total)}</b></td></tr>
      ${open===row.key?`<tr class="td-detail"><td colspan="10"><div class="td-card">${m347DetailForm(row)}<p class="td-hint">Facturas ${row.clave==="B"?"emitidas":"recibidas"} de ${escapeHtml(row.nombre)} en ${year} (fecha del asiento).${row.excluido?` ${tdEur(row.excluido)} no computan (con retención o de no residentes).`:""}</p>
        <table class="td-list"><thead><tr><th>Fecha</th><th>Nº factura</th><th>Trimestre</th><th class="num">Total</th></tr></thead><tbody>${row.facturas.map(inv=>`<tr${inv.excluida?' class="td-dim"':""}><td>${tdDate(inv.fecha)}</td><td>${escapeHtml(inv.numero||"—")}</td><td>${Math.ceil(Number(inv.fecha.slice(5,7))/3)}T${inv.excluida?` · no computa (${inv.excluida==="retencion"?"con retención":"no residente"})`:""}</td><td class="num">${tdEur(inv.total)}</td></tr>`).join("")}</tbody></table></div></td></tr>`:""}`).join("");
  box.innerHTML=`<div class="td-card-head"><span class="td-chip m347">347</span><strong>Operaciones con terceras personas · anual · ${year}</strong><span class="td-data-pill" title="Calculado con la base de AMCOMTA del cliente">Datos de contabilidad</span></div>
    <div class="m347-summary"><div><small>Declarados</small><b>${t.count}</b></div><div><small>Importe anual total</small><b>${tdEur(t.total)}</b></div><div><small>Control decl.</small><b>${control.prepared?`Preparado ${tdDate(control.prepared)}`:'<span class="td-dim">Sin anotar</span>'}</b></div><div><small>Estado</small><span class="td-pill ${status[1]}">${status[0]}</span></div><div><small>Presentada</small>${eye}</div></div>
    <div class="m347-contact"><strong>Declarante</strong><label class="m347-f"><small>Teléfono de contacto</small><input data-m347-contacto="telefono" value="${escapeHtml(m347Contact().telefono)}" maxlength="9" inputmode="tel"></label><label class="m347-f wide"><small>Apellidos y nombre de la persona con quien relacionarse</small><input data-m347-contacto="nombre" value="${escapeHtml(m347Contact().nombre)}"></label></div>
    ${rows.length?`<div class="td-table-wrap"><table class="td-table m347-table"><thead><tr><th class="center" title="Incluir">Incl.</th><th>Declarado</th><th title="Código de provincia">Prov.</th><th title="Código de país">País</th><th>Clave operación</th><th class="num">1T</th><th class="num">2T</th><th class="num">3T</th><th class="num">4T</th><th class="num">Total anual</th></tr></thead><tbody>${body}</tbody>
      <tfoot><tr><td></td><td>Total incluidos (${t.count})</td><td colspan="3"></td>${[0,1,2,3].map(q=>`<td class="num">${tdEur(t.rows.reduce((sum,row)=>sum+row.trimestres[q],0))}</td>`).join("")}<td class="num">${tdEur(t.total)}</td></tr></tfoot></table></div>`:`<p class="td-note">Ningún cliente ni proveedor supera 3.005,06 € en ${year}.</p>`}
    <p class="td-hint">Se incluyen los clientes y proveedores que superan 3.005,06 € en el año (IVA incluido) por la misma clave. No computan las facturas con retención de IRPF (alquileres y profesionales, que van en el 180 y el 190) ni las de no residentes. Los terceros sin NIF quedan sin marcar.</p>
    <div class="td-confirm m347-actions"><button type="button" class="secondary-button" data-m347-download>Descargar para el cliente</button><button type="button" class="secondary-button" data-m347-csv>Excel (CSV)</button><button type="button" class="secondary-button" data-m347-view>Ver borrador</button><button type="button" class="primary blue-button" data-m347-confirm${t.count?"":" disabled"}>${control.draft?"Volver a confirmar borrador":"Confirmar borrador"}</button></div>
`;
  const find=selector=>box.querySelectorAll(selector);
  find("[data-m347-incluir]").forEach(input=>input.addEventListener("change",()=>{m347Save(m=>{m.incluir[input.dataset.m347Incluir]=input.checked});renderTaxDraftMain()}));
  find("[data-m347-clave]").forEach(select=>select.addEventListener("change",()=>{m347Save(m=>{m.claves[select.dataset.m347Clave]=select.value});renderTaxDraftMain()}));
  find("[data-m347-prov]").forEach(input=>input.addEventListener("change",()=>{const v=input.value.replace(/\D/g,"").padStart(input.value.trim()?2:0,"0");m347Save(m=>{m.provincias[input.dataset.m347Prov]=v});renderTaxDraftMain()}));
  find("[data-m347-pais]").forEach(input=>input.addEventListener("change",()=>{m347Save(m=>{m.paises[input.dataset.m347Pais]=input.value.trim().toUpperCase()});renderTaxDraftMain()}));
  find("[data-m347-det]").forEach(input=>input.addEventListener("change",()=>{const key=input.dataset.key,field=input.dataset.m347Det;m347Save(m=>{const d=m.detalle[key]=m.detalle[key]||{};d[field]=input.type==="checkbox"?input.checked:(field==="nif"||field.startsWith("nif")?input.value.trim().toUpperCase():input.value.trim())});renderTaxDraftMain()}));
  find("[data-m347-inm]").forEach(input=>input.addEventListener("change",()=>{const key=input.dataset.key,q=Number(input.dataset.m347Inm);m347Save(m=>{const d=m.detalle[key]=m.detalle[key]||{};d.inmuebles=d.inmuebles||["","","",""];d.inmuebles[q]=input.value.trim()});renderTaxDraftMain()}));
  find("[data-m347-contacto]").forEach(input=>input.addEventListener("change",()=>{const contact={...m347Contact(),[input.dataset.m347Contacto]:input.value.trim()};m347Save(m=>{m.contacto=contact});try{localStorage.setItem(M347_CONTACT_KEY,JSON.stringify(contact))}catch{}}));
  find("[data-m347-open]").forEach(button=>button.addEventListener("click",()=>{const key=button.dataset.m347Open;taxDrafts.open347=taxDrafts.open347===key?"":key;renderTaxDraftMain()}));
  box.querySelector("[data-m347-confirm]")?.addEventListener("click",confirm347);
  box.querySelector("[data-m347-view]")?.addEventListener("click",()=>openConfirmed347(m347Draft(),false));
  box.querySelector("[data-m347-download]")?.addEventListener("click",()=>download347Client(m347Draft()));
  box.querySelector("[data-m347-csv]")?.addEventListener("click",()=>download347Csv(m347Draft()));
  if(taxDrafts.doc347===undefined){taxDrafts.doc347=null;find347Document()}
}
function m347Draft(){
  const t=m347Totals(m347Rows());
  return{model:"347",period:M347_PERIOD,year:taxDraftYear(),client:taxDrafts.client,cif:taxDrafts.clientData?.cif||"",title:"Declaración anual de operaciones con terceras personas",
    declarados:t.rows.map(row=>{const det=row.det||{},inm=(det.inmuebles||["","","",""]).map(m347Num);return{nif:row.nif,nombre:row.nombre,provincia:row.provincia,pais:row.pais,clave:row.claveFinal,trimestres:row.trimestres,total:row.total,domicilio:row.domicilio,poblacion:row.poblacion,cp:row.cp,
      nifComunitario:det.nifComunitario||"",nifRepresentante:det.nifRepresentante||"",seguro:!!det.seguro,arrendamiento:!!det.arrendamiento,ivaCaja:!!det.ivaCaja,inversion:!!det.inversion,deposito:!!det.deposito,
      inmuebles:inm,inmueblesAnual:tdRound(inm.reduce((a,b)=>a+b,0)),ivaCajaAnual:m347Num(det.ivaCajaAnual),bdns:det.bdns||"",metalico:m347Num(det.metalico),ejercicioMetalico:det.ejercicioMetalico||""}}),total:t.total,
    contacto:m347Contact(),
    confirmedAt:new Date().toISOString(),confirmedBy:typeof signedInUser!=="undefined"&&signedInUser?signedInUser.name:""};
}
function confirm347(){
  const draft=m347Draft(),key=declarationKey("347",M347_PERIOD,taxDrafts.client,draft.year),data=declarationData("347",M347_PERIOD,taxDrafts.client,draft.year);
  const today=new Date();data.prepared=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  data.draft=draft;localStorage.setItem(key,JSON.stringify(data));renderTaxDraftMain();
}
async function find347Document(){
  const client=taxDrafts.client,year=taxDraftYear();
  try{
    const all=await getDeclarationPdfs(false),name=taxDrafts.clientData?.name||client;
    let best=null,score=0;
    all.filter(doc=>doc.normalized.includes(String(year))&&fiscalModelMatches(doc.normalized,"347")).forEach(doc=>{const s=declarationClientScore(name,doc.normalized);if(s>score){best=doc;score=s}});
    if(!(best&&score>=0.6))best=null;
    if(taxDrafts.client===client&&taxDrafts.model==="347"){taxDrafts.doc347=best;if(best)renderTaxDraftMain()}
  }catch{}
}
/* Documento del borrador del 347 con el aspecto del impreso: declarante y declarados 1, 2, 3… */
function taxDraft347FormHtml(draft,client={}){
  const money=tdFormMoney,nif=draft.cif||client.cif||"",name=draft.client||client.name||"";
  const f=(label,value,cls="")=>`<label class="${cls}"><small>${label}</small><span>${escapeHtml(value??"")}</span></label>`;
  const chk=on=>`<i class="af-check">${on?"X":""}</i>`;
  const declarados=draft.declarados.map((d,i)=>`<section class="m347-dec"><div class="m347-dec-n">Declarado ${i+1}</div><div class="m347-dec-body">
      <div class="m347-grid g3">${f("NIF declarado",d.nif)}${f("NIF representante",d.nifRepresentante||"")}${f("Apellidos y nombre, razón social o denominación del declarado",d.nombre,"wide")}</div>
      <div class="m347-grid g3">${f("NIF operador comunitario",d.nifComunitario||"")}${f("Provincia (Código)",d.provincia)}${f("País (Código)",d.pais)}</div>
      <div class="m347-grid g6">${f("Clave operación",d.clave)}<label><small>Operación seguro</small>${chk(d.seguro)}</label><label><small>Arrendamiento local negocio</small>${chk(d.arrendamiento)}</label><label><small>Operación IVA de caja</small>${chk(d.ivaCaja)}</label><label><small>Inversión del sujeto pasivo</small>${chk(d.inversion)}</label><label><small>Depósito distinto del aduanero</small>${chk(d.deposito)}</label></div>
      <div class="m347-grid g2">${f("Importe percibido en metálico",money(d.metalico||0),"amount")}${f("Importe anual de las operaciones",money(d.total),"amount")}</div>
      <div class="m347-grid g2"><div class="m347-q"><small>Importe de las operaciones</small>${d.trimestres.map((v,q)=>`<div><b>${q+1} T</b><span>${money(v)}</span></div>`).join("")}</div><div class="m347-q"><small>Importe percibido por transmisiones de inmuebles sujetas a IVA</small>${[0,1,2,3].map(q=>`<div><b>${q+1} T</b><span>${money((d.inmuebles||[])[q]||0)}</span></div>`).join("")}</div></div>
      <div class="m347-grid g3">${f("Importe anual percibido por transmisiones de inmuebles sujetas a IVA",money(d.inmueblesAnual||0),"amount")}${f("Importe anual de las operaciones devengadas conforme al criterio de caja del IVA",money(d.ivaCajaAnual||0),"amount")}${f("Número de convocatoria BDNS",d.bdns||"")}</div>
    </div></section>`).join("");
  const contacto=draft.contacto||{},arr=draft.declarados.filter(d=>d.arrendamiento);
  return `<div class="aeat-form m347-form"><div class="af-watermark">BORRADOR</div>
    <div class="af-head"><div class="af-agency"><strong>Agencia Tributaria</strong><small>Documento preparado por Asesoría Molinero</small></div><div class="af-title"><strong>Declaración anual de operaciones con terceras personas</strong><span>Hoja resumen y relación de declarados</span><em>Declaración · Ejercicio ${escapeHtml(draft.year)}</em></div><div class="af-model"><small>Modelo</small><b>347</b></div></div>
    <section class="af-sec"><div class="af-side">Declarante</div><div class="af-body af-ident"><div><div class="af-grid af-g2">${f("NIF",nif)}${f("Apellidos y nombre, razón social o denominación",name)}</div>
      <div class="af-grid af-g2">${f("Teléfono de contacto",contacto.telefono||"")}${f("Apellidos y nombre de la persona con quien relacionarse",contacto.nombre||"")}</div></div>
      <div class="af-devengo m347-ej"><div class="af-side af-side-sm">Ejercicio</div><label><small>Ejercicio</small><span>${escapeHtml(draft.year)}</span></label></div></div></section>
    <section class="af-sec"><div class="af-side">Complementaria</div><div class="af-body"><p class="af-line">${chk(false)} Declaración complementaria &nbsp; ${chk(false)} Declaración sustitutiva &nbsp; <small>Número identificativo de la declaración anterior</small> ____________________</p></div></section>
    <section class="af-sec"><div class="af-side">Resumen</div><div class="af-body">
      <div class="af-row"><span class="af-label">Número total de personas y entidades</span><div class="af-cell"><div class="af-box"><b>01</b><span>${draft.declarados.length||""}</span></div></div></div>
      <div class="af-row"><span class="af-label">Importe total anual de las operaciones</span><div class="af-cell"><div class="af-box"><b>02</b><span>${money(draft.total)}</span></div></div></div>
      <div class="af-row"><span class="af-label">Número total de inmuebles</span><div class="af-cell"><div class="af-box"><b>03</b><span>${arr.length||""}</span></div></div></div>
      <div class="af-row"><span class="af-label">Importe total de las operaciones de arrendamiento de locales de negocio</span><div class="af-cell"><div class="af-box"><b>04</b><span>${money(arr.reduce((s2,d)=>s2+d.total,0))}</span></div></div></div></div></section>
    <div class="m347-pagebreak"></div>
    <section class="af-sec"><div class="af-side">Declarados</div><div class="af-body">${declarados||'<p class="af-line">Sin declarados.</p>'}</div></section>
    <p class="af-foot">Borrador preparado con los datos de la contabilidad${draft.confirmedBy?` · ${escapeHtml(draft.confirmedBy)}`:""}. No válido para su presentación.</p></div>`;
}
const M347_FORM_CSS=`.m347-form .m347-ej{grid-template-columns:20px 1fr}.m347-pagebreak{break-after:page;height:0}
.m347-form .af-title{background:#8a6418}.m347-form .af-model,.m347-form .af-side{background:#e8d9a8}.m347-form .af-sec{border-color:#c8a24a}
.m347-dec{display:grid;grid-template-columns:24px 1fr;border:1.5px solid #c8a24a;border-radius:4px;margin:0 0 10px;background:#fffdf6;break-inside:avoid}
.m347-dec-n{writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;background:#f1e6c4;font-weight:700;font-size:10px;padding:4px 0}
.m347-dec-body{padding:6px 8px}.m347-grid{display:grid;gap:6px;margin-bottom:5px}.m347-grid.g3{grid-template-columns:120px 120px 1fr}.m347-grid.g6{grid-template-columns:repeat(6,1fr)}.m347-grid.g2{grid-template-columns:1fr 1fr}
.m347-form label span{border-color:#c8a24a}.m347-form label.amount span{text-align:right}.m347-form .af-check{border-color:#c8a24a}
.m347-q{border:1px solid #c8a24a;border-radius:3px;background:#fff}.m347-q small{display:block;font-size:9px;color:#56627c;padding:2px 5px;border-bottom:1px solid #c8a24a}.m347-q div{display:flex;border-top:1px solid #ecdcae}.m347-q div:first-of-type{border-top:0}.m347-q b{width:30px;border-right:1px solid #c8a24a;font-size:10px;padding:2px 4px}.m347-q span{flex:1;text-align:right;padding:2px 6px;font-weight:700;font-variant-numeric:tabular-nums;min-height:18px}
@media(max-width:700px){.m347-grid.g6{grid-template-columns:repeat(3,1fr)}.m347-grid.g3,.m347-grid.g2{grid-template-columns:1fr}}`;
async function openConfirmed347(draft,confirmed=true){
  let client={};try{client=(await getAllClientMetadata()).find(item=>item.name===draft.client||item.id===draft.client)||{}}catch{}
  const form=taxDraft347FormHtml(draft,client),title=`Borrador modelo 347 ${draft.year} ${draft.client}`;
  document.querySelector("#tdDraftView")?.remove();
  const view=document.createElement("div");view.id="tdDraftView";view.className="td-modal";view.setAttribute("role","dialog");view.setAttribute("aria-modal","true");
  view.innerHTML=`<div class="td-modal-box td-form-modal"><header><div><span class="td-tag">${confirmed?"Borrador confirmado":"Vista previa del borrador"}</span><h3>Modelo 347 · ${escapeHtml(draft.year)}</h3><p>${escapeHtml(draft.cif?draft.cif+" · ":"")}${escapeHtml(draft.client)} · ${draft.declarados.length} declarados · ${tdEur(draft.total)}</p></div><div class="td-form-actions"><button type="button" class="secondary-button" data-td-print>Imprimir / guardar PDF</button><button type="button" class="td-close" aria-label="Cerrar">×</button></div></header>
    <div class="td-modal-body"><style>${AEAT_FORM_CSS}${M347_FORM_CSS}</style>${form}</div></div>`;
  document.body.append(view);
  view.querySelector("[data-td-print]").addEventListener("click",()=>print347Form(form,title));
  const close=()=>{view.remove();document.removeEventListener("keydown",onKey)},onKey=event=>{if(event.key==="Escape")close()};
  view.addEventListener("click",event=>{if(event.target===view||event.target.closest(".td-close"))close()});document.addEventListener("keydown",onKey);
}
/* Para el cliente: resumen y una hoja por cada cliente/proveedor para que le confirme los importes */
async function download347Client(draft){
  if(!draft.declarados.length){alert("No hay declarados incluidos.");return}
  let client={};try{client=(await getAllClientMetadata()).find(item=>item.name===draft.client||item.id===draft.client)||{}}catch{}
  const name=draft.client,nif=draft.cif||client.cif||"",money=v=>tdEur(v);
  const quarters=d=>`<table class="c347-t"><thead><tr><th>1.er trimestre</th><th>2.º trimestre</th><th>3.er trimestre</th><th>4.º trimestre</th><th>Total anual</th></tr></thead><tbody><tr>${d.trimestres.map(v=>`<td>${money(v)}</td>`).join("")}<td><b>${money(d.total)}</b></td></tr></tbody></table>`;
  const tipo=d=>d.clave==="A"?"compras (adquisiciones de bienes y servicios que nos han facturado)":d.clave==="B"?"ventas (entregas de bienes y prestaciones de servicios que les hemos facturado)":M347_CLAVES.find(c=>c[0]===d.clave)?.[1]||d.clave;
  const summary=`<section class="c347-page"><h1>Modelo 347 · Ejercicio ${escapeHtml(draft.year)}</h1><p class="c347-sub">${escapeHtml(name)}${nif?` · NIF ${escapeHtml(nif)}`:""}</p>
    <p>Estos son los clientes y proveedores con los que, según la contabilidad, las operaciones del ejercicio ${escapeHtml(draft.year)} superan 3.005,06 € (IVA incluido). Revísalos y envía a cada uno su hoja (páginas siguientes) para que confirme el importe antes de presentar la declaración.</p>
    <table class="c347-t c347-list"><thead><tr><th>#</th><th>NIF</th><th>Nombre</th><th>Clave</th><th>1T</th><th>2T</th><th>3T</th><th>4T</th><th>Total</th></tr></thead><tbody>${draft.declarados.map((d,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(d.nif)}</td><td>${escapeHtml(d.nombre)}</td><td>${escapeHtml(d.clave)}</td>${d.trimestres.map(v=>`<td>${money(v)}</td>`).join("")}<td><b>${money(d.total)}</b></td></tr>`).join("")}</tbody><tfoot><tr><td colspan="8">Total (${draft.declarados.length} declarados)</td><td><b>${money(draft.total)}</b></td></tr></tfoot></table>
    <p class="c347-note">Clave A: compras · Clave B: ventas. Importes por la fecha de contabilización de las facturas.</p></section>`;
  const letters=draft.declarados.map(d=>`<section class="c347-page"><p class="c347-from"><b>${escapeHtml(name)}</b>${nif?`<br>NIF ${escapeHtml(nif)}`:""}</p><p class="c347-to">A la atención de:<br><b>${escapeHtml(d.nombre)}</b>${d.nif?`<br>NIF ${escapeHtml(d.nif)}`:""}</p>
    <h2>Confirmación de operaciones · Modelo 347 · Ejercicio ${escapeHtml(draft.year)}</h2>
    <p>Estimados señores:</p><p>Para preparar la declaración anual de operaciones con terceras personas (modelo 347), les comunicamos que, según nuestra contabilidad, el importe de nuestras ${escapeHtml(tipo(d))} durante el ejercicio ${escapeHtml(draft.year)} es el siguiente (IVA incluido):</p>
    ${quarters(d)}
    <p>Les rogamos que comprueben estos importes con sus registros y nos devuelvan este escrito firmado indicando su conformidad o, en su caso, las diferencias.</p>
    <div class="c347-reply"><p>${`<i></i>`} Conformes con los importes indicados.</p><p><i></i> No conformes. Importe según nuestros registros: ______________________ €</p><p>Observaciones: ____________________________________________________________</p><p class="c347-sign">Fecha y firma: ____________________________</p></div>
    <p>Atentamente,</p><p><b>${escapeHtml(name)}</b></p></section>`).join("");
  const css=`@page{size:A4;margin:16mm}body{margin:0;font:12.5px/1.5 Arial,Helvetica,sans-serif;color:#1d2a44}.c347-page{page-break-after:always}.c347-page:last-child{page-break-after:auto}
    h1{font-size:20px;margin:0}h2{font-size:15px;margin:20px 0 12px}.c347-sub{color:#56627c;margin:2px 0 14px}.c347-t{width:100%;border-collapse:collapse;margin:10px 0}.c347-t th,.c347-t td{border:1px solid #c8a24a;padding:5px 7px;text-align:right}.c347-t th{background:#f1e6c4;font-size:11px}.c347-list td:nth-child(-n+4),.c347-list th:nth-child(-n+4){text-align:left}.c347-t tfoot td{background:#fbf6e6}
    .c347-note{font-size:11px;color:#56627c}.c347-from{margin:0 0 18px}.c347-to{margin:0 0 22px 50%}.c347-reply{margin:18px 0;padding:12px 14px;border:1px solid #c8a24a;border-radius:6px}.c347-reply p{margin:8px 0;display:flex;gap:8px;align-items:center}.c347-reply i{display:inline-block;width:14px;height:14px;border:1px solid #1d2a44}.c347-sign{margin-top:22px!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}`;
  const win=window.open("","_blank");if(!win){alert("Permite las ventanas emergentes para descargar el documento.");return}
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Modelo 347 ${escapeHtml(draft.year)} ${escapeHtml(name)} - confirmación de operaciones</title><style>${css}</style></head><body>${summary}${letters}<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  win.document.close();
}
function download347Csv(draft){
  const cell=v=>`"${String(v??"").replace(/"/g,'""')}"`,num=v=>(Number(v)||0).toFixed(2).replace(".",",");
  const lines=[["NIF","Nombre","Provincia","País","Clave","1T","2T","3T","4T","Total anual"].map(cell).join(";"),...draft.declarados.map(d=>[cell(d.nif),cell(d.nombre),cell(d.provincia),cell(d.pais),cell(d.clave),...d.trimestres.map(num),num(d.total)].join(";"))];
  const blob=new Blob(["﻿"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=`Modelo 347 ${draft.year} ${draft.client}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

// Estilos de la vista del 347 (van aquí para publicarse junto con este archivo).
(function(){const style=document.createElement("style");style.id="m347-styles";style.textContent=".td-decl.td-decl-draft{border-style:dashed!important;color:#8a6418!important}"+"/* Borradores · modelo 347 */\n.td-chip.m347{background:#f1e6c4;color:#7a5512}\n.m347-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:#e8ebf1;border-bottom:1px solid #e8ebf1}\n.m347-summary>div{background:#fff;padding:12px 16px;display:flex;flex-direction:column;gap:4px;align-items:flex-start}.m347-summary small{color:#69748a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em}.m347-summary b{font-size:16px}\n.m347-table td{vertical-align:middle}.m347-row.off td{opacity:.55}.m347-row.off td:first-child{opacity:1}\n.m347-name{display:flex;align-items:flex-start;gap:6px;border:0;background:none;padding:0;text-align:left;font:inherit;color:inherit;cursor:pointer}.m347-name strong{display:block;font-size:13.5px}.m347-name small{display:block;color:#69748a;font-size:11.5px}.m347-row.open .td-caret{transform:rotate(90deg)}\n.m347-warn{color:#b42318;font-weight:700}\n.m347-small{width:46px;height:30px;padding:3px 6px;border:1px solid #dfe4ee;border-radius:7px;font:inherit;text-align:center}\n.m347-clave{max-width:190px;height:30px;padding:3px 6px;border:1px solid #dfe4ee;border-radius:7px;font:inherit;font-size:12.5px;background:#fff}\n.m347-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;padding:14px 16px}\n@media(max-width:900px){.m347-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}\n.td-main .m347-table{font-size:13px;min-width:1080px}\n.m347-table th,.m347-table td{padding-left:8px!important;padding-right:8px!important}\n.m347-table td:nth-child(2){min-width:220px}.m347-name strong{white-space:normal}\n.m347-clave{max-width:165px}\n.m347-table td.num{white-space:nowrap}\n.td-main .m347-table{table-layout:auto;min-width:980px}\n.m347-table>thead>tr>th:nth-child(n){width:auto}\n.m347-table>thead>tr>th:nth-child(1){width:44px}.m347-table>thead>tr>th:nth-child(3),.m347-table>thead>tr>th:nth-child(4){width:62px}.m347-table>thead>tr>th:nth-child(5){width:175px}.m347-table>thead>tr>th:nth-child(n+6){width:96px}\n.m347-table .td-list td{white-space:nowrap}\n.m347-table td{white-space:normal}.m347-table td.num{white-space:nowrap}\n.m347-table .td-detail td{white-space:normal}";document.head.append(style)})();

function print347Form(html,title){
  const win=window.open("","_blank");if(!win){alert("Permite las ventanas emergentes para imprimir el borrador.");return}
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${AEAT_FORM_CSS}${M347_FORM_CSS}@page{size:A4;margin:10mm}body{margin:0;background:#fff}.aeat-form{border:0;max-width:none;padding:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script></body></html>`);
  win.document.close();
}
const previousMain=renderTaxDraftMain;
renderTaxDraftMain=function(){
  if(taxDrafts.model!=="347")return previousMain.apply(this,arguments);
  const box=document.querySelector("#tdMain");if(!box)return;
  if(taxDrafts.loading){box.innerHTML='<p class="td-note">Cargando…</p>';return}
  // Al cambiar de cliente o de ejercicio se vuelve a buscar la declaración presentada.
  const context=`${taxDrafts.client}|${taxDraftYear()}`;if(taxDrafts.ctx347!==context){taxDrafts.ctx347=context;taxDrafts.doc347=undefined;taxDrafts.open347=""}
  if(!taxDrafts.base){box.innerHTML='<p class="td-note">Este cliente no tiene base de datos de contabilidad. Añádela en su ficha (Gestión → Clientes).</p>';return}
  if(typeof taxDraftBaseMismatch==="function"&&taxDraftBaseMismatch()){box.innerHTML='<p class="td-note">La base cargada no es de este cliente.</p>';return}
  renderTaxDraft347(box);
};
const previousOpen=openConfirmedTaxDraft;
openConfirmedTaxDraft=function(key){
  let data={};try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
  if(data.draft?.model==="347")return openConfirmed347(data.draft,true);
  return previousOpen.apply(this,arguments);
};
if(document.querySelector("#tdModels")&&taxDrafts.client){renderTaxDraftModels();renderTaxDraftMain()}
})();
(function(){const style=document.createElement("style");style.textContent=`
.m347-contact{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px 16px;padding:12px 16px;border-bottom:1px solid #e8ebf1;background:#fffcf3}
.m347-contact>strong{width:100%;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#7a5512}
.m347-f{display:flex;flex-direction:column;gap:4px;min-width:0}.m347-f small{font-size:11.5px;color:#56627c;font-weight:600}
.m347-f input,.m347-f select,.m347-qrow input{height:34px;padding:4px 9px;border:1px solid #d9cfae;border-radius:8px;font:inherit;font-size:13px;background:#fff;min-width:0}
.m347-contact .m347-f{width:160px}.m347-contact .m347-f.wide{flex:1 1 320px;width:auto}
.m347-detform{padding:14px 16px;margin-bottom:12px;border:1px solid #e3d7b3;border-radius:12px;background:#fffdf7}
.m347-detform h5{margin:0 0 10px;font-size:14px;color:#1f4a99}
.m347-fgrid{display:grid;gap:10px 14px;margin-bottom:12px}.m347-fgrid.c1{grid-template-columns:1fr}.m347-fgrid.c2{grid-template-columns:1fr 1fr}.m347-fgrid.c3{grid-template-columns:repeat(3,minmax(0,1fr))}.m347-fgrid.c4{grid-template-columns:repeat(4,minmax(0,1fr))}
.m347-checks{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:4px 0 14px;text-align:center}
.m347-checks label{display:flex;flex-direction:column-reverse;align-items:center;gap:6px;font-size:12px;color:#3e4a66}.m347-checks input{width:18px;height:18px;accent-color:#1f4a99}
.m347-cap{display:block;font-size:11.5px;font-weight:600;color:#56627c;margin-bottom:6px}
.m347-qrow{display:grid;grid-template-columns:28px 1fr;align-items:center;gap:8px;margin-bottom:6px}.m347-qrow b{font-size:12px;color:#56627c}
.m347-ro{display:block;height:34px;line-height:34px;padding:0 9px;border:1px solid #ece4c8;border-radius:8px;background:#f8f5ea;text-align:right;font-variant-numeric:tabular-nums;font-size:13px}
@media(max-width:760px){.m347-fgrid.c3,.m347-fgrid.c4,.m347-fgrid.c2{grid-template-columns:1fr}.m347-checks{grid-template-columns:1fr 1fr}.m347-contact .m347-f{width:100%}}`;document.head.append(style)})();
