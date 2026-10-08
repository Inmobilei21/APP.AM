/* Modelo 349 en Borradores: declaración recapitulativa de operaciones intracomunitarias. Sale de las facturas
   marcadas como «Intracom. (349)» al procesarlas (libros de emitidas y recibidas del cliente): un registro por
   operador y clave de operación. En el trimestre se ven las casillas 01 a 04; al pulsarlas se despliegan los
   operadores con sus facturas (ojo para ver el PDF y casilla para no incluirlas). Rectificaciones a mano,
   contacto como en el 347 y opciones de la hoja resumen. Fichero AEAT según el diseño de registro (DR349). */
(function(){
if(typeof TAX_DRAFT_BUILDERS==="undefined"||typeof TAX_DRAFT_MODELS==="undefined")return;
const M="349",CONTACT_KEY="app-am-347-contacto";
TAX_DRAFT_MODELS[M]={title:"Operaciones intracomunitarias",ready:true};
const KEYS={E:"Entregas intracomunitarias exentas",S:"Prestaciones intracomunitarias de servicios",A:"Adquisiciones intracomunitarias de bienes",I:"Adquisiciones intracomunitarias de servicios",T:"Operaciones triangulares",M:"Entregas tras importación exenta",H:"Entregas tras importación exenta (representante fiscal)",R:"Transferencias en consigna",D:"Devoluciones en consigna",C:"Sustituciones en consigna"};
const EU={DE:"Alemania",AT:"Austria",BE:"Bélgica",BG:"Bulgaria",CY:"Chipre",HR:"Croacia",DK:"Dinamarca",SI:"Eslovenia",EE:"Estonia",FI:"Finlandia",FR:"Francia",EL:"Grecia",HU:"Hungría",IE:"Irlanda",IT:"Italia",LV:"Letonia",LT:"Lituania",LU:"Luxemburgo",MT:"Malta",NL:"Países Bajos",PL:"Polonia",PT:"Portugal",CZ:"República Checa",SK:"República Eslovaca",RO:"Rumanía",SE:"Suecia",XI:"Irlanda del Norte"};
const NIF_LEN={DE:[9],AT:[9],BE:[10],BG:[9,10],CY:[9],HR:[11],DK:[8],SI:[8],EE:[9],FI:[8],FR:[11],EL:[9],HU:[8],IE:[8,9],IT:[11],LV:[11],LT:[9,12],LU:[8],MT:[8],NL:[12],PL:[10],PT:[9],CZ:[8,9,10],SK:[10],RO:[2,3,4,5,6,7,8,9,10],SE:[12],XI:[5,9,12]};
const num=v=>{if(typeof v==="number")return Number.isFinite(v)?v:0;const s=String(v??"").trim();if(!s)return 0;const n=Number(s.includes(",")||/^-?\d{1,3}(\.\d{3})+$/.test(s)?s.replace(/\./g,"").replace(",","."):s);return Number.isFinite(n)?n:0};
const inputValue=v=>{if(v===undefined||v===null||v==="")return"";const n=Number(v)||0,[i,d]=Math.abs(n).toFixed(2).split(".");return(n<0?"-":"")+i.replace(/\B(?=(\d{3})+(?!\d))/g,".")+","+d};

/* --- Facturas guardadas (libros de emitidas y recibidas) --- */
const libros={key:"",data:null,loading:""};
window.addEventListener("app-am-libros",()=>{libros.key="";libros.data=null});
function libro(){
  if(!taxDrafts.client)return null;
  const key=`${taxDrafts.client}|${taxDraftYear()}`;
  if(libros.key===key)return libros.data;
  if(libros.loading!==key){libros.loading=key;
    apiJson(`/api/libros?client=${encodeURIComponent(taxDrafts.client)}&year=${taxDraftYear()}`).catch(()=>({emitidas:[],recibidas:[]}))
      .then(data=>{if(libros.loading!==key)return;libros.key=key;libros.data=data;libros.loading="";if(taxDrafts.model===M&&`${taxDrafts.client}|${taxDraftYear()}`===key)renderTaxDraftMain()})}
  return null;
}
const st=period=>{const data=taxDraftControl(M,period),m=data.m349||{};m.excluir=m.excluir||[];m.rect=m.rect||[];m.ops=m.ops||{};return m};
function save(period,change){
  const year=taxDraftYear(),key=declarationKey(M,period,taxDrafts.client,year),data=declarationData(M,period,taxDrafts.client,year);
  const m={excluir:[],rect:[],ops:{},...(data.m349||{})};change(m);data.m349=m;localStorage.setItem(key,JSON.stringify(data));
}
function contact(period){const m=st(period);let last={};try{last=JSON.parse(localStorage.getItem(CONTACT_KEY)||"{}")}catch{}return{telefono:m.contacto?.telefono??last.telefono??"",nombre:m.contacto?.nombre??last.nombre??""}}
// NIF-IVA comunitario: código de país (Grecia es EL) y número.
function splitNif(value){
  let clean=String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(/^GR/.test(clean))clean="EL"+clean.slice(2);
  const pais=/^[A-Z]{2}/.test(clean)&&EU[clean.slice(0,2)]?clean.slice(0,2):"";
  return{pais,numero:pais?clean.slice(2):clean};
}
const nifOk=(pais,numero)=>Boolean(pais&&NIF_LEN[pais]?.includes(numero.length));
const quarterOf=fecha=>`${Math.ceil(Number(String(fecha).slice(5,7))/3)}T`;
function invoices(period){
  const book=libro(),m=st(period),out=[];
  for(const [tipo,list] of [["EMITIDAS",book?.emitidas||[]],["RECIBIDAS",book?.recibidas||[]]])
    for(const item of list)if(item.intracom&&quarterOf(item.fecha)===period)
      out.push({...item,tipo,clave:item.clave349||(tipo==="EMITIDAS"?"E":"A"),incluir:!m.excluir.includes(item.id)});
  return out.sort((a,b)=>a.fecha.localeCompare(b.fecha));
}
// Un registro por operador (NIF-IVA) y clave de operación, con la suma de las bases.
function operators(period){
  const m=st(period),map=new Map();
  for(const inv of invoices(period)){
    const {pais,numero}=splitNif(inv.nif),key=`${pais}${numero||inv.nombre.toUpperCase()}|${inv.clave}`;
    const op=map.get(key)||{key,pais,numero,nombre:inv.nombre,clave:inv.clave,base:0,facturas:[]};
    op.facturas.push(inv);if(inv.incluir)op.base=tdRound(op.base+inv.base);map.set(key,op);
  }
  return [...map.values()].map(op=>{const o=m.ops[op.key]||{};return{...op,pais:o.pais??op.pais,numero:o.numero??op.numero,nombre:o.nombre??op.nombre,incluido:op.facturas.some(inv=>inv.incluir)}})
    .sort((a,b)=>a.nombre.localeCompare(b.nombre,"es",{sensitivity:"base"})||a.clave.localeCompare(b.clave));
}
function calc(period){
  const all=operators(period),ops=all.filter(op=>op.incluido),m=st(period);
  const rect=m.rect.map(r=>({...r,base:tdRound(num(r.base)),anterior:tdRound(num(r.anterior))}));
  const c={"01":ops.length,"02":tdRound(ops.reduce((s,op)=>s+op.base,0)),"03":rect.length,"04":tdRound(rect.reduce((s,r)=>s+r.base,0))};
  return{c,all,ops,rect,m,loaded:Boolean(libro()),contacto:contact(period),
    opciones:{complementaria:m.complementaria===true,sustitutiva:m.sustitutiva===true,anterior:m.anterior||"",mensual:m.mensual===true,nifRepresentante:m.nifRepresentante||""}};
}
const LABELS={"01":"Número total de operadores intracomunitarios","02":"Importe de las operaciones intracomunitarias","03":"Número total de operadores intracomunitarios con rectificaciones","04":"Importe de las rectificaciones"};
TAX_DRAFT_BUILDERS[M]=period=>{
  const r=calc(period),c=r.c;
  return{
    title:"Operaciones intracomunitarias",
    boxes:[{heading:"Resumen de los datos incluidos en la declaración"},...["01","02","03","04"].map(n=>({n,label:LABELS[n],value:c[n],kind:["01","03"].includes(n)?"count":"money"}))],
    result:c["02"],calc:r,summary:{perceptores:c["01"],base:c["02"],retencion:c["04"]},lists:{},
    checks:()=>{
      const out=[];
      if(!r.loaded)return['<div class="td-check warn">⚠ <div><b>Cargando las facturas guardadas…</b></div></div>'];
      if(!r.all.length)out.push('<div class="td-check warn">⚠ <div><b>Sin operaciones intracomunitarias en el trimestre</b>Salen de las facturas marcadas como «Intracom. (349)» al procesarlas. Si no hay operaciones, no se presenta el 349.</div></div>');
      const bad=r.ops.filter(op=>!nifOk(op.pais,op.numero));
      if(bad.length)out.push(`<div class="td-check warn">⚠ <div><b>Revisa el NIF-IVA de ${bad.length} operador${bad.length===1?"":"es"}</b>${bad.map(op=>escapeHtml(op.nombre)).slice(0,5).join(", ")}: debe empezar por el código del país de la UE y tener la longitud de ese país.</div></div>`);
      const neg=r.ops.filter(op=>op.base<0);
      if(neg.length)out.push(`<div class="td-check warn">⚠ <div><b>Importe negativo</b>${neg.map(op=>escapeHtml(op.nombre)).join(", ")}: en el 349 los importes son positivos; las devoluciones o abonos de otros trimestres van como rectificaciones.</div></div>`);
      const fuera=r.all.flatMap(op=>op.facturas).filter(inv=>!inv.incluir).length;
      if(fuera)out.push(`<div class="td-check warn">⚠ <div><b>${fuera} factura${fuera===1?"":"s"} sin incluir</b>No se declaran en este trimestre.</div></div>`);
      if(r.ops.length&&!bad.length&&!neg.length)out.push(`<div class="td-check ok">✓ <div><b>${r.ops.length} operador${r.ops.length===1?"":"es"} con NIF-IVA correcto</b>${[...new Set(r.ops.map(op=>op.clave))].map(k=>`${k} · ${KEYS[k]}`).join(" · ")}.</div></div>`);
      if(!/^\d{9}$/.test(String(r.contacto.telefono).replace(/\D/g,"")))out.push('<div class="td-check warn">⚠ <div><b>Falta el teléfono de contacto</b>Debe tener 9 cifras.</div></div>');
      return out;
    }
  };
};

/* --- Pantalla: casillas 01 a 04; al pulsarlas se despliegan operadores o rectificaciones --- */
const keyOptions=value=>Object.entries(KEYS).map(([k,l])=>`<option value="${k}"${k===value?" selected":""}>${k} · ${escapeHtml(l)}</option>`).join("");
function opsTable(r,editable){
  if(!r.all.length)return'<p class="td-note">No hay facturas marcadas como intracomunitarias en el trimestre.</p>';
  const open=taxDrafts.m349Op||"";
  return `<table class="td-list m349-ops"><thead><tr><th>País</th><th>NIF-IVA</th><th>Operador</th><th>Clave</th><th class="num">Facturas</th><th class="num">Base imponible</th><th class="center">Facturas</th></tr></thead><tbody>${r.all.map(op=>{
    const isOpen=open===op.key,ok=nifOk(op.pais,op.numero),inc=op.facturas.filter(inv=>inv.incluir).length;
    return `<tr class="m349-op${op.incluido?"":" td-off"}${isOpen?" open":""}" data-m349-op="${escapeHtml(op.key)}"><td>${editable?`<select data-m349-opf="pais" data-key="${escapeHtml(op.key)}" class="${op.pais?"":"bad"}"><option value="">—</option>${Object.entries(EU).map(([k,n])=>`<option value="${k}"${k===op.pais?" selected":""}>${k} · ${escapeHtml(n)}</option>`).join("")}</select>`:escapeHtml(op.pais)}</td>
      <td>${editable?`<input data-m349-opf="numero" data-key="${escapeHtml(op.key)}" value="${escapeHtml(op.numero)}" class="${ok?"":"bad"}" maxlength="15">`:escapeHtml(op.numero)}</td>
      <td>${editable?`<input data-m349-opf="nombre" data-key="${escapeHtml(op.key)}" value="${escapeHtml(op.nombre)}" maxlength="40">`:escapeHtml(op.nombre)}</td>
      <td><span class="m349-key" title="${escapeHtml(KEYS[op.clave]||"")}">${escapeHtml(op.clave)}</span></td><td class="num">${inc}${inc<op.facturas.length?` de ${op.facturas.length}`:""}</td><td class="num"><b>${tdEur(op.base)}</b></td>
      <td class="center"><button type="button" class="td-eye" data-m349-toggle="${escapeHtml(op.key)}" title="Ver las facturas que lo componen">${tdEye}</button></td></tr>
      ${isOpen?`<tr class="m349-inv-row"><td colspan="7"><table class="td-list m349-inv"><thead><tr><th class="center">Incluir</th><th class="center">PDF</th><th>Fecha</th><th>Factura</th><th>Libro</th><th class="num">Base</th></tr></thead><tbody>${op.facturas.map(inv=>`<tr class="${inv.incluir?"":"td-off"}"><td class="center">${editable?`<input type="checkbox" data-m349-inc="${escapeHtml(inv.id)}"${inv.incluir?" checked":""} aria-label="Incluir en la declaración">`:inv.incluir?"Sí":"No"}</td><td class="center">${/\.(xlsx?|xlsm|csv|ods)$/i.test(inv.archivo||"")&&!inv.ruta?`<span class="td-eye off" title="Sin PDF">${tdEyeOff}</span>`:`<button type="button" class="td-eye" data-m349-doc="${encodeURIComponent(JSON.stringify({ruta:inv.ruta||"",fecha:inv.fecha,nombre:inv.nombre,numero:inv.numero,tipo:inv.tipo}))}" title="Ver la factura">${tdEye}</button>`}</td><td>${tdDate(inv.fecha)}</td><td>${escapeHtml(inv.numero)}</td><td>${inv.tipo==="EMITIDAS"?"Emitida":"Recibida"}</td><td class="num">${tdEur(inv.base)}</td></tr>`).join("")}</tbody></table></td></tr>`:""}`}).join("")}</tbody>
    <tfoot><tr><td colspan="5">Total incluido</td><td class="num">${tdEur(r.c["02"])}</td><td></td></tr></tfoot></table>`;
}
function rectTable(r,editable){
  const field=(i,f,value,extra="")=>editable?`<input data-m349-rect="${f}" data-i="${i}" value="${escapeHtml(value??"")}" ${extra}>`:escapeHtml(value??"");
  return `${r.rect.length?`<table class="td-list m349-rect"><thead><tr><th>NIF-IVA</th><th>Operador</th><th>Clave</th><th>Ejercicio</th><th>Período</th><th class="num">Base rectificada</th><th class="num">Base declarada antes</th><th></th></tr></thead><tbody>${r.rect.map((x,i)=>`<tr>
      <td>${field(i,"nif",x.nif,'maxlength="17" placeholder="DE123456789"')}</td><td>${field(i,"nombre",x.nombre,'maxlength="40"')}</td>
      <td>${editable?`<select data-m349-rect="clave" data-i="${i}">${keyOptions(x.clave||"E")}</select>`:escapeHtml(x.clave)}</td>
      <td>${field(i,"ejercicio",x.ejercicio,'maxlength="4" inputmode="numeric" class="short"')}</td><td>${editable?`<select data-m349-rect="periodo" data-i="${i}">${["1T","2T","3T","4T","01","02","03","04","05","06","07","08","09","10","11","12","0A"].map(p=>`<option${p===x.periodo?" selected":""}>${p}</option>`).join("")}</select>`:escapeHtml(x.periodo)}</td>
      <td class="num">${field(i,"base",inputValue(x.base),'inputmode="decimal" class="num"')}</td><td class="num">${field(i,"anterior",inputValue(x.anterior),'inputmode="decimal" class="num"')}</td>
      <td>${editable?`<button type="button" class="m349-del" data-m349-rect-del="${i}" title="Quitar">×</button>`:""}</td></tr>`).join("")}</tbody></table>`:'<p class="td-note">Sin rectificaciones. Añade una si hay que corregir la base declarada de un trimestre anterior.</p>'}
    ${editable?'<button type="button" class="secondary-button m349-add" data-m349-rect-add>+ Añadir rectificación</button>':""}`;
}
function grid(r,editable){
  const open=taxDrafts.m349Open||"";
  const box=(n,section)=>`<button type="button" class="m349-box${open===section?" on":""}" data-m349-section="${section}"><span class="m349-n">${n}</span><span class="m349-l">${LABELS[n]}</span><b>${["01","03"].includes(n)?r.c[n]:tdEur(r.c[n])}</b></button>`;
  return `<div class="m349">
    <div class="m349-boxes">${box("01","ops")}${box("02","ops")}${box("03","rect")}${box("04","rect")}</div>
    ${open==="ops"?`<section class="m349-panel"><h6>Operadores intracomunitarios <small>· pulsa el ojo para ver sus facturas</small></h6>${opsTable(r,editable)}</section>`:""}
    ${open==="rect"?`<section class="m349-panel"><h6>Rectificaciones de trimestres anteriores</h6>${rectTable(r,editable)}</section>`:""}
  </div>`;
}
function optionsBlock(r){
  const o=r.opciones,c=r.contacto;
  return `<div class="m349-opts">
    <div class="m349-o"><h6>Persona y teléfono de contacto</h6><div class="m349-row"><label class="td-cf"><small>Apellidos y nombre de la persona con quien relacionarse</small><input data-m349-c="nombre" value="${escapeHtml(c.nombre)}" maxlength="40"></label><label class="td-cf short"><small>Teléfono</small><input data-m349-c="telefono" value="${escapeHtml(c.telefono)}" maxlength="9" inputmode="tel"></label></div></div>
    <div class="m349-o"><h6>Declarante y período</h6><div class="m349-row"><label class="td-cf short"><small>NIF del representante legal</small><input data-m349-o="nifRepresentante" value="${escapeHtml(o.nifRepresentante)}" maxlength="9"></label>
      <label class="m349-check"><input type="checkbox" data-m349-o="mensual"${o.mensual?" checked":""}><span>Declaración mensual con operaciones de los dos primeros meses del trimestre</span></label></div></div>
    <div class="m349-o"><h6>Declaración complementaria o sustitutiva</h6><div class="m349-row"><label class="m349-check"><input type="checkbox" data-m349-o="complementaria"${o.complementaria?" checked":""}><span>Declaración complementaria</span></label><label class="m349-check"><input type="checkbox" data-m349-o="sustitutiva"${o.sustitutiva?" checked":""}><span>Declaración sustitutiva</span></label>
      <label class="td-cf"><small>Número identificativo de la declaración anterior</small><input data-m349-o="anterior" value="${escapeHtml(o.anterior)}" maxlength="13" inputmode="numeric"${o.complementaria||o.sustitutiva?"":" disabled"}></label></div></div>
  </div>`;
}
if(typeof taxDraftBoxes==="function"){const previous=taxDraftBoxes;taxDraftBoxes=function(boxes,withEyes=true,model=""){
  if(model===M&&taxDrafts.model===M&&taxDrafts.open)return grid(calc(taxDrafts.open),withEyes);return previous.apply(this,arguments)}}
if(typeof taxDraftDetail==="function"){const previous=taxDraftDetail;taxDraftDetail=function(draft){const html=previous.apply(this,arguments);if(draft.model!==M)return html;
  return html.replace('<div class="td-checks">',`${optionsBlock(draft.calc||calc(draft.period))}<div class="td-checks">`)
    .replace('<button type="button" class="secondary-button" data-td-copy>',`<button type="button" class="secondary-button" data-m349-file="${escapeHtml(draft.period)}">Fichero AEAT</button><button type="button" class="secondary-button" data-m349-view="${escapeHtml(draft.period)}">Ver borrador</button><button type="button" class="secondary-button" data-td-copy>`)}}
function bind(box,period){
  const rerender=()=>renderTaxDraftMain();
  box.querySelectorAll("[data-m349-section]").forEach(b=>b.addEventListener("click",()=>{taxDrafts.m349Open=taxDrafts.m349Open===b.dataset.m349Section?"":b.dataset.m349Section;rerender()}));
  box.querySelectorAll("[data-m349-toggle]").forEach(b=>b.addEventListener("click",event=>{event.stopPropagation();taxDrafts.m349Op=taxDrafts.m349Op===b.dataset.m349Toggle?"":b.dataset.m349Toggle;rerender()}));
  box.querySelectorAll("[data-m349-inc]").forEach(input=>input.addEventListener("change",()=>{save(period,m=>{const set=new Set(m.excluir);if(input.checked)set.delete(input.dataset.m349Inc);else set.add(input.dataset.m349Inc);m.excluir=[...set]});rerender()}));
  box.querySelectorAll("[data-m349-opf]").forEach(input=>input.addEventListener("change",()=>{const f=input.dataset.m349Opf,key=input.dataset.key;let value=input.value.trim();if(f==="numero")value=value.toUpperCase().replace(/[^A-Z0-9]/g,"");save(period,m=>{m.ops[key]={...(m.ops[key]||{}),[f]:value}});rerender()}));
  box.querySelectorAll("[data-m349-rect]").forEach(input=>input.addEventListener("change",()=>{const f=input.dataset.m349Rect,i=Number(input.dataset.i);let value=input.value.trim();if(["base","anterior"].includes(f))value=value===""?"":num(value);if(f==="nif")value=value.toUpperCase().replace(/[^A-Z0-9]/g,"");save(period,m=>{m.rect[i]={...(m.rect[i]||{}),[f]:value}});rerender()}));
  box.querySelector("[data-m349-rect-add]")?.addEventListener("click",()=>{save(period,m=>{m.rect.push({nif:"",nombre:"",clave:"E",ejercicio:String(taxDraftYear()),periodo:Number(period[0])>1?`${Number(period[0])-1}T`:"4T",base:"",anterior:""})});rerender()});
  box.querySelectorAll("[data-m349-rect-del]").forEach(b=>b.addEventListener("click",()=>{save(period,m=>{m.rect.splice(Number(b.dataset.m349RectDel),1)});rerender()}));
  box.querySelectorAll("[data-m349-c]").forEach(input=>input.addEventListener("change",()=>{const c={...contact(period),[input.dataset.m349C]:input.value.trim()};save(period,m=>{m.contacto=c});try{localStorage.setItem(CONTACT_KEY,JSON.stringify(c))}catch{}rerender()}));
  box.querySelectorAll("[data-m349-o]").forEach(input=>input.addEventListener("change",()=>{const f=input.dataset.m349O;save(period,m=>{if(input.type==="checkbox"){m[f]=input.checked;if(f==="complementaria"&&input.checked)m.sustitutiva=false;if(f==="sustitutiva"&&input.checked)m.complementaria=false;if((f==="complementaria"||f==="sustitutiva")&&!input.checked&&!m.complementaria&&!m.sustitutiva)m.anterior=""}else m[f]=f==="anterior"?input.value.replace(/\D/g,"").slice(0,13):input.value.trim().toUpperCase()});rerender()}));
  box.querySelectorAll("[data-m349-doc]").forEach(b=>b.addEventListener("click",async event=>{event.stopPropagation();b.disabled=true;try{if(typeof window.openBookInvoice!=="function")throw new Error("No se puede abrir la factura.");await window.openBookInvoice(JSON.parse(decodeURIComponent(b.dataset.m349Doc)))}catch(error){alert(error.message||"No se ha podido abrir la factura.")}finally{b.disabled=false}}));
  box.querySelector("[data-m349-file]")?.addEventListener("click",()=>download349(currentDraft(period)));
  box.querySelector("[data-m349-view]")?.addEventListener("click",()=>openForm(draftNow(period),false));
}
const previousMain=renderTaxDraftMain;
renderTaxDraftMain=function(){
  // Sin base de AMCOMTA el 349 se hace igualmente con las facturas guardadas.
  const original=taxDrafts.base,vacia=taxDrafts.model===M&&taxDrafts.client&&!taxDrafts.loading&&(!original||!Array.isArray(original.retencionesIrpf));
  if(vacia)taxDrafts.base={manual:true,resultados:[],retencionesIrpf:[],retencionesSoportadas:[],pagosACuenta:[]};
  let r;try{r=previousMain.apply(this,arguments)}finally{if(vacia)taxDrafts.base=original}
  const box=document.querySelector("#tdMain");
  if(box&&taxDrafts.model===M&&box.querySelector(".td-table")){
    const th=box.querySelectorAll(".td-table thead th");if(th.length>=4){th[1].textContent="Operadores";th[2].textContent="Importe";th[3].textContent="Rectificaciones"}
    const detail=box.querySelector(".td-detail .td-card");if(detail&&/^\dT$/.test(taxDrafts.open||""))bind(detail,taxDrafts.open);
  }
  return r;
};

/* --- Borrador confirmado, impreso y fichero --- */
function draftNow(period){
  const r=calc(period);
  return{model:M,period,year:taxDraftYear(),client:taxDrafts.client,cif:taxDrafts.clientData?.cif||"",contacto:r.contacto,opciones:r.opciones,
    operadores:r.ops.map(op=>({pais:op.pais,numero:op.numero,nombre:op.nombre,clave:op.clave,base:op.base,facturas:op.facturas.filter(inv=>inv.incluir).map(inv=>({fecha:inv.fecha,numero:inv.numero,base:inv.base,tipo:inv.tipo}))})),
    rectificaciones:r.rect,summary:{...r.c}};
}
if(typeof confirmTaxDraft==="function"){const previous=confirmTaxDraft;confirmTaxDraft=function(){
  const period=taxDrafts.open,model=taxDrafts.model,res=previous.apply(this,arguments);
  if(model===M&&period){const year=taxDraftYear(),key=declarationKey(M,period,taxDrafts.client,year),data=declarationData(M,period,taxDrafts.client,year);
    if(data.draft){data.draft={...data.draft,...draftNow(period),confirmedAt:data.draft.confirmedAt,confirmedBy:data.draft.confirmedBy};localStorage.setItem(key,JSON.stringify(data))}}
  return res}}
function currentDraft(period){const saved=taxDraftControl(M,period).draft;return saved&&saved.model===M&&Array.isArray(saved.operadores)?{...saved,cif:saved.cif||taxDrafts.clientData?.cif||""}:draftNow(period)}
const up=v=>[...String(v||"").toUpperCase()].map(c=>c==="Ñ"||c==="Ç"?c:c.normalize("NFD").replace(/[̀-ͯ]/g,"")).join("").replace(/,/g," ").replace(/[^A-Z0-9ÑÇ ]/g," ").replace(/\s+/g," ").trim();
const A=(v,n)=>up(v).slice(0,n).padEnd(n," ");
const N=(v,n)=>String(Math.round(Math.abs(Number(v)||0))).padStart(n,"0").slice(-n);
const NIF=v=>{const c=String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"");return c?c.padStart(9,"0").slice(-9):" ".repeat(9)};
function aeat349(draft){
  const year=String(draft.year),decl=NIF(draft.cif),o=draft.opciones||{},c=draft.contacto||{},ops=draft.operadores||[],rect=draft.rectificaciones||[];
  if(decl.trim().length!==9)throw new Error("Falta el NIF del cliente (ficha del cliente).");
  if(!/^[1-4]T$/.test(draft.period))throw new Error("Período no válido.");
  const bad=ops.find(op=>!nifOk(op.pais,op.numero));if(bad)throw new Error(`Revisa el NIF-IVA de ${bad.nombre}: debe llevar el código de país de la UE y la longitud de ese país.`);
  const neg=ops.find(op=>op.base<0);if(neg)throw new Error(`El importe de ${neg.nombre} es negativo; en el 349 los importes son positivos.`);
  if(!ops.length&&!rect.length)throw new Error("No hay operadores ni rectificaciones que declarar.");
  const total=ops.reduce((s,op)=>s+op.base,0),totalRect=rect.reduce((s,x)=>s+(Number(x.base)||0),0),id="349"+String(Date.now()).slice(-10);
  // Registro de tipo 1 (declarante): posiciones 1-500.
  let r1="1349"+year+decl+A(draft.client,40)+" "+N(String(c.telefono||"").replace(/\D/g,""),9)+A(c.nombre,40)+id
    +(o.complementaria?"C":" ")+(o.sustitutiva?"S":" ")+N(o.complementaria||o.sustitutiva?o.anterior:0,13)+draft.period
    +N(ops.length,9)+N(total*100,15)+N(rect.length,9)+N(totalRect*100,15)+(o.mensual?"X":" ");
  r1=r1.padEnd(390," ")+(o.nifRepresentante?NIF(o.nifRepresentante):" ".repeat(9));r1=r1.padEnd(500," ");
  const head="2349"+year+decl+" ".repeat(58);
  // Registros de tipo 2: operadores (base en 134-146) y rectificaciones (ejercicio, período y bases en 147-178).
  const rowsOps=ops.map(op=>(head+op.pais+A(op.numero,15)+A(op.nombre,40)+op.clave+N(op.base*100,13)).padEnd(500," "));
  const rowsRect=rect.map(x=>{const {pais,numero}=splitNif(x.nif);if(!nifOk(pais,numero))throw new Error(`Revisa el NIF-IVA de la rectificación de ${x.nombre||"(sin nombre)"}.`);
    return(head+pais+A(numero,15)+A(x.nombre,40)+(x.clave||"E")+" ".repeat(13)+N(x.ejercicio,4)+String(x.periodo||"").padEnd(2," ").slice(0,2)+N((Number(x.base)||0)*100,13)+N((Number(x.anterior)||0)*100,13)).padEnd(500," ")});
  const lines=[r1,...rowsOps,...rowsRect];
  if(lines.some(line=>line.length!==500))throw new Error("Registro con longitud incorrecta.");
  return lines.join("\r\n")+"\r\n";
}
window.aeat349=aeat349;
async function download349(draft){
  try{
    if(!/^\d{9}$/.test(String(draft.contacto?.telefono||"").replace(/\D/g,""))&&!await appConfirm({eyebrow:"MODELO 349",title:"Falta el teléfono de contacto",message:"Debe tener 9 cifras. ¿Generar el fichero igualmente?",ok:"Generar igualmente"}))return;
    const text=aeat349(draft),bytes=new Uint8Array([...text].map(ch=>{const code=ch.charCodeAt(0);return code<256?code:32}));
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([bytes],{type:"application/octet-stream"}));
    a.download=`${String(draft.cif||"").toUpperCase()}_349_${draft.year}_${draft.period}.349`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  }catch(error){alert(error.message)}
}
const es2=v=>{const n=Number(v)||0;if(!n)return"";const [i,d]=Math.abs(n).toFixed(2).split(".");return(n<0?"-":"")+i.replace(/\B(?=(\d{3})+(?!\d))/g,".")+","+d};
function formHtml(dr){
  const e=v=>escapeHtml(v??""),s=dr.summary||{},o=dr.opciones||{},c=dr.contacto||{};
  const f=(label,value,cls="")=>`<div class="f49-f ${cls}"><small>${label}</small><span>${e(value)}</span></div>`;
  const chk=on=>`<b class="f49-chk">${on?"X":""}</b>`;
  const head=big=>`<div class="f49-head"><div class="f49-agency"><b>AT</b><span>Agencia Tributaria</span></div><div class="f49-title"><strong>Declaración recapitulativa de operaciones intracomunitarias</strong><span>Art. 78 al 81 del Reglamento del IVA aprobado por el R.D. 1624/1992</span></div><div class="f49-model"><small>${big}</small><small>Modelo</small><b>349</b></div></div>`;
  const ops=dr.operadores||[],rect=dr.rectificaciones||[];
  return `<div class="f49"><div class="f49-page"><div class="f49-wm">BORRADOR</div>${head("Hoja resumen")}
    <div class="f49-two"><section class="f49-box"><div class="f49-tab">Declarante</div><div class="f49-grid">${f("N.º de identificación fiscal (NIF)",dr.cif)}${f("Apellidos y nombre, denominación o razón social del declarante",dr.client,"wide")}${f("NIF del representante legal",o.nifRepresentante)}</div></section>
      <section class="f49-box"><div class="f49-tab">Ejercicio</div><div class="f49-lines"><p><span>Ejercicio</span><em>${e(dr.year)}</em></p><p><span>Período</span><em>${e(dr.period)}</em></p><p><span>Declaración mensual con operaciones de los dos primeros meses del trimestre</span>${chk(o.mensual)}</p></div></section></div>
    <section class="f49-box"><div class="f49-tab">Persona y teléfono de contacto</div><div class="f49-grid">${f("Apellidos y nombre de la persona con quien relacionarse",c.nombre,"wide")}${f("Teléfono de contacto",c.telefono)}</div></section>
    <section class="f49-box"><div class="f49-tab">Resumen de los datos incluidos en la declaración</div><div class="f49-res">
      ${[["01",LABELS["01"],s["01"]||""],["02",LABELS["02"],es2(s["02"])],["03",LABELS["03"],s["03"]||""],["04",LABELS["04"],es2(s["04"])]].map(([n,l,v])=>`<p><span>${l}</span><b>${n}</b><em>${e(v)}</em></p>`).join("")}</div></section>
    <section class="f49-box"><div class="f49-tab">Declaración complementaria o sustitutiva</div><div class="f49-lines"><p><span>Declaración complementaria</span>${chk(o.complementaria)}</p><p><span>Declaración sustitutiva</span>${chk(o.sustitutiva)}</p><p><span>Número identificativo de la declaración anterior</span><em>${e(o.anterior)}</em></p></div></section>
    <p class="f49-foot">Borrador preparado por Asesoría Molinero con las facturas marcadas como intracomunitarias${dr.confirmedBy?` · ${e(dr.confirmedBy)}`:""}. No válido para su presentación.</p></div>
    <div class="f49-page"><div class="f49-wm">BORRADOR</div>${head("Relación de operadores")}
      <table class="f49-t"><thead><tr><th>Código país</th><th>NIF-IVA</th><th>Apellidos y nombre o razón social</th><th>Clave</th><th class="num">Base imponible</th></tr></thead><tbody>${ops.length?ops.map(op=>`<tr><td>${e(op.pais)}</td><td>${e(op.numero)}</td><td>${e(op.nombre)}</td><td>${e(op.clave)}</td><td class="num">${es2(op.base)}</td></tr>`).join(""):'<tr><td colspan="5">Sin operadores.</td></tr>'}</tbody></table>
      ${rect.length?`<h5>Rectificaciones</h5><table class="f49-t"><thead><tr><th>NIF-IVA</th><th>Operador</th><th>Clave</th><th>Ejercicio</th><th>Período</th><th class="num">Base rectificada</th><th class="num">Base anterior</th></tr></thead><tbody>${rect.map(x=>`<tr><td>${e(x.nif)}</td><td>${e(x.nombre)}</td><td>${e(x.clave)}</td><td>${e(x.ejercicio)}</td><td>${e(x.periodo)}</td><td class="num">${es2(x.base)}</td><td class="num">${es2(x.anterior)}</td></tr>`).join("")}</tbody></table>`:""}
    </div></div>`;
}
const FORM_CSS=`.f49{font-family:Arial,Helvetica,sans-serif;color:#111;display:flex;flex-direction:column;gap:18px}
.f49-page{position:relative;background:#fff;border:1px solid #d5d9e4;padding:18px 20px 12px;max-width:820px;margin:0 auto;width:100%;box-sizing:border-box;overflow:hidden}
.f49-wm{position:absolute;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:90px;font-weight:800;color:rgba(40,120,90,.08);pointer-events:none;letter-spacing:.08em}
.f49-head{display:grid;grid-template-columns:150px 1fr 96px;gap:10px;margin-bottom:14px}.f49-agency{display:flex;align-items:center;gap:6px;background:#eef0f2;border-radius:6px;padding:8px;box-shadow:3px 3px 0 #c9cfd3}.f49-agency b{font-size:15px}.f49-agency span{font-size:12.5px;font-family:Georgia,serif}
.f49-title{background:#7cc4a4;color:#fff;border-radius:5px;padding:8px 12px;display:flex;flex-direction:column;justify-content:center;gap:4px;text-align:center;box-shadow:3px 3px 0 #c9cfd3}.f49-title strong{font-size:16px;line-height:1.2}.f49-title span{font-size:10px;font-weight:700}
.f49-model{background:#eef0f2;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:3px 3px 0 #c9cfd3;padding:4px}.f49-model small:first-child{background:#7cc4a4;color:#fff;font-weight:700;font-size:9.5px;padding:2px 6px;border-radius:3px;margin-bottom:4px;text-align:center}.f49-model small{font-size:10.5px}.f49-model b{font-size:28px}
.f49-two{display:grid;grid-template-columns:1.4fr 1fr;gap:12px;align-items:start}
.f49-box{border:1px solid #333;background:#e8f2ee;margin:16px 0 0;position:relative;padding:10px 10px 8px}.f49-tab{position:absolute;top:-12px;left:-1px;background:#7cc4a4;color:#fff;font-size:11px;font-weight:700;padding:1px 14px 1px 8px;border-radius:3px 12px 0 0}
.f49-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px}.f49-f.wide{grid-column:1/-1}.f49-f small{display:block;font-size:8.5px;margin-bottom:1px}.f49-f span{display:block;min-height:17px;background:#fff;border-right:2px solid #999;border-bottom:2px solid #999;padding:1px 5px;font-size:11px}
.f49-lines p,.f49-res p{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:10.5px}.f49-lines span,.f49-res span{flex:1;font-weight:700}.f49-lines em,.f49-res em{min-width:110px;background:#fff;border-right:2px solid #999;border-bottom:2px solid #999;padding:1px 5px;font-style:normal;text-align:right;font-size:11.5px}
.f49-res b{background:#7cc4a4;color:#fff;font-size:9px;padding:2px 4px}.f49-res em{min-width:170px}
.f49-chk{width:14px;height:14px;background:#fff;border:1px solid #888;box-shadow:2px 2px 0 #999;text-align:center;font-size:11px;line-height:14px}
.f49-t{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}.f49-t th{background:#7cc4a4;color:#fff;text-align:left;padding:5px 6px;font-size:10px}.f49-t td{border-bottom:1px solid #d7e6df;padding:5px 6px}.f49-t .num{text-align:right}.f49 h5{margin:16px 0 4px;font-size:12px}
.f49-foot{margin:12px 0 0;text-align:center;font-size:9px;color:#555}
@media(max-width:700px){.f49-page{padding:12px 10px}.f49-head{grid-template-columns:1fr 80px}.f49-agency{display:none}.f49-two,.f49-grid{grid-template-columns:1fr}.f49-res em{min-width:100px}}
@media print{.f49{gap:0}.f49-page{border:0;page-break-after:always;max-width:none}.f49-page:last-child{page-break-after:auto}}`;
function openForm(draft,confirmed){
  const form=formHtml(draft),title=`Borrador modelo 349 ${draft.year} ${draft.period} ${draft.client}`,s=draft.summary||{};
  document.querySelector("#tdFormView")?.remove();
  const view=document.createElement("div");view.id="tdFormView";view.className="td-modal";view.style.zIndex="3000";
  view.innerHTML=`<div class="td-modal-box td-form-modal"><header><div><span class="td-tag">${confirmed?"Borrador confirmado":"Vista previa del borrador"}</span><h3>Modelo 349 · ${escapeHtml(draft.period)} ${escapeHtml(draft.year)}</h3><p>${escapeHtml(draft.cif?draft.cif+" · ":"")}${escapeHtml(draft.client)} · ${s["01"]||0} operadores · ${tdEur(s["02"])}</p></div><div class="td-form-actions"><button type="button" class="secondary-button" data-file>Fichero AEAT</button><button type="button" class="secondary-button" data-print>Imprimir / guardar PDF</button><button type="button" class="td-close" aria-label="Cerrar">×</button></div></header>
    <div class="td-modal-body" style="background:#eef0f5"><style>${FORM_CSS}</style>${form}</div></div>`;
  document.body.append(view);
  view.querySelector("[data-file]").addEventListener("click",()=>download349(draft));
  view.querySelector("[data-print]").addEventListener("click",()=>{const w=window.open("","_blank");if(!w)return alert("Permite las ventanas emergentes.");w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${FORM_CSS}@page{size:A4;margin:8mm}body{margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${form}<script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script></body></html>`);w.document.close()});
  const close=()=>{view.remove();document.removeEventListener("keydown",onKey)},onKey=e=>{if(e.key==="Escape")close()};
  view.addEventListener("click",e=>{if(e.target===view||e.target.closest(".td-close"))close()});document.addEventListener("keydown",onKey);
}
if(typeof openConfirmedTaxDraft==="function"){
  const previousOpen=openConfirmedTaxDraft;
  openConfirmedTaxDraft=function(key){let data={};try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
    if(data.draft?.model===M&&Array.isArray(data.draft.operadores))return openForm(data.draft,true);return previousOpen.apply(this,arguments)};
}
(function(){const style=document.createElement("style");style.textContent=`
.m349-boxes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 20px 10px}
.m349-box{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;border:1px solid #e3e7ef;border-radius:14px;background:#fff;padding:12px 14px;cursor:pointer;font:inherit;transition:border-color .15s,box-shadow .15s}
.m349-box:hover{border-color:#b9c6e8;box-shadow:0 6px 16px rgba(20,39,155,.08)}.m349-box.on{border-color:#14279b;background:#f4f6ff}
.m349-n{font-size:11px;font-weight:800;color:#14279b;background:#eef1ff;border-radius:6px;padding:1px 7px}.m349-l{font-size:12px;line-height:1.3;color:#56627c;min-height:31px}.m349-box b{font-size:19px;color:#1d2a44;font-variant-numeric:tabular-nums}
.m349-panel{margin:0 20px 12px;border:1px solid #e3e7ef;border-radius:14px;background:#fff;overflow:auto}.m349-panel h6{margin:0;padding:10px 14px;font-size:12.5px;color:#14279b;background:#f6f8fd;border-bottom:1px solid #eef0f5}.m349-panel h6 small{color:#69748a;font-weight:500}
.m349-panel>.td-note{margin:10px 14px}.m349-ops input,.m349-ops select,.m349-rect input,.m349-rect select{height:30px;border:1px solid #dfe4ee;border-radius:7px;padding:2px 6px;font:inherit;font-size:12.5px;max-width:100%;background:#fff}
.m349-ops input[data-m349-opf="nombre"]{width:100%;min-width:180px}.m349-ops input[data-m349-opf="numero"]{width:130px}.m349-ops select{width:72px}.m349-ops .bad{border-color:#e0a23a;background:#fff7e8}
.m349-op.open>td{background:#f4f6ff}.m349-key{display:inline-block;min-width:22px;text-align:center;font-weight:800;color:#14279b;background:#eef1ff;border-radius:6px;padding:2px 6px}
.m349-inv-row>td{background:#f8f9fc;padding:6px 14px 10px}.m349-inv{background:#fff;border:1px solid #e3e7ef;border-radius:10px}.m349-inv .td-eye{margin:0 auto}
.m349-rect input{width:100%;min-width:70px}.m349-rect input.short{width:64px;min-width:0}.m349-rect input.num{text-align:right;min-width:100px}.m349-del{border:0;background:#fdecec;color:#b42318;border-radius:8px;width:28px;height:28px;font-size:18px;cursor:pointer}
.m349-add{margin:10px 14px}
.m349-opts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:4px 20px 10px}.m349-o{border:1px solid #e3e7ef;border-radius:12px;padding:10px 12px;background:#fff}.m349-o h6{margin:0 0 8px;font-size:12px;color:#14279b;text-transform:uppercase;letter-spacing:.04em}
.m349-row{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-end}.m349-row .td-cf{flex:1 1 180px}.m349-row .td-cf.short{flex:0 1 120px}.m349-row .td-cf input{width:100%}
.m349-check{display:flex;align-items:flex-start;gap:6px;font-size:12.5px;font-weight:600;cursor:pointer;line-height:1.3}.m349-check input{margin-top:2px}
@media(max-width:900px){.m349-opts{grid-template-columns:1fr}}
@media(max-width:760px){.m349-boxes{grid-template-columns:1fr 1fr;margin:0 12px 10px}.m349-panel,.m349-opts{margin-left:12px;margin-right:12px}}`;document.head.append(style)})();
if(document.querySelector("#tdModels")&&taxDrafts.client){renderTaxDraftModels();renderTaxDraftMain()}
})();
