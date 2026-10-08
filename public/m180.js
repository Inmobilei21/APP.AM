/* Modelo 180 (resumen anual del 115) en Borradores: se despliega en la fila «Declaración anual» del 115.
   Un registro por arrendador con los datos de la operación (ya rellenados con los 115 del año) y los
   datos del inmueble. Los perceptores se ven en carrusel. Todo se guarda en Control (180 · 4T). */
(function(){
if(typeof taxDraftBuild!=="function")return;
const PERIOD="4T",CONTACT_KEY="app-am-347-contacto";
const PROVINCIAS={"01":"Álava","02":"Albacete","03":"Alicante","04":"Almería","05":"Ávila","06":"Badajoz","07":"Illes Balears","08":"Barcelona","09":"Burgos","10":"Cáceres","11":"Cádiz","12":"Castellón","13":"Ciudad Real","14":"Córdoba","15":"A Coruña","16":"Cuenca","17":"Girona","18":"Granada","19":"Guadalajara","20":"Gipuzkoa","21":"Huelva","22":"Huesca","23":"Jaén","24":"León","25":"Lleida","26":"La Rioja","27":"Lugo","28":"Madrid","29":"Málaga","30":"Murcia","31":"Navarra","32":"Ourense","33":"Asturias","34":"Palencia","35":"Las Palmas","36":"Pontevedra","37":"Salamanca","38":"S.C. Tenerife","39":"Cantabria","40":"Segovia","41":"Sevilla","42":"Soria","43":"Tarragona","44":"Teruel","45":"Toledo","46":"Valencia","47":"Valladolid","48":"Bizkaia","49":"Zamora","50":"Zaragoza","51":"Ceuta","52":"Melilla","99":"Extranjero"};
const SITUACION=[["1","1 · Con referencia catastral (territorio común)"],["2","2 · En el País Vasco"],["3","3 · En Navarra"],["4","4 · Sin referencia catastral"]];
const MODALIDAD=[["1","1 · Dineraria"],["2","2 · En especie"]];
const VIAS=["CALLE","AVENIDA","PLAZA","PASEO","CAMINO","CARRETERA","RONDA","TRAVESIA","URBANIZACION","POLIGONO","GLORIETA","PASAJE","BARRIO","OTROS"];
const NUMERACION=[["NUM","Número"],["KM.","Kilómetro"],["S/N","Sin número"]];
const CALIFICADOR=[["","—"],["BIS","Bis"],["DUP","Duplicado"],["MOD","Moderno"],["ANT","Antiguo"]];
const state=()=>{const data=declarationData("180",PERIOD,taxDrafts.client,taxDraftYear());const m=data.m180||{};m.detalle=m.detalle||{};return{data,m}};
function save(change,rerender=false){const key=declarationKey("180",PERIOD,taxDrafts.client,taxDraftYear()),{data,m}=state();change(m);data.m180=m;localStorage.setItem(key,JSON.stringify(data));if(rerender)renderTaxDraftMain()}
const num=v=>{const n=Number(String(v??"").replace(/\./g,"").replace(",","."));return Number.isFinite(n)?tdRound(n):0};
const fmt=v=>v===undefined||v===null||v===""?"":String(v);
function contact(){const {m}=state();let last={};try{last=JSON.parse(localStorage.getItem(CONTACT_KEY)||"{}")}catch{}return{telefono:m.contacto?.telefono??last.telefono??"",nombre:m.contacto?.nombre??last.nombre??""}}
function records(){
  const map=new Map(),{m}=state();
  ["1T","2T","3T","4T"].forEach(period=>(taxDraftBuild("115",period).lists.alquileres||[]).filter(item=>item.incluir!==false).forEach(item=>{
    const key=item.nif||item.cuenta,rec=map.get(key)||{key,nif:item.nif||"",nombre:item.nombre||item.cuenta,cuenta:item.cuenta,cp:item.cp||"",base:0,retencion:0,pct:new Map()};
    rec.base=tdRound(rec.base+item.base);rec.retencion=tdRound(rec.retencion+item.retencion);rec.pct.set(item.porcentaje,(rec.pct.get(item.porcentaje)||0)+1);map.set(key,rec);
  }));
  return [...map.values()].map(rec=>{const d=m.detalle[rec.key]||{},pct=[...rec.pct].sort((a,b)=>b[1]-a[1])[0]?.[0]??19;
    return{...rec,d,nif:(d.nif??rec.nif).toUpperCase(),nombre:d.nombre??rec.nombre,provincia:d.provincia??(/^\d{5}$/.test(rec.cp)?rec.cp.slice(0,2):""),modalidad:d.modalidad||"1",
      base:d.base!==undefined&&d.base!==""?num(d.base):rec.base,porcentaje:d.porcentaje!==undefined&&d.porcentaje!==""?num(d.porcentaje):pct,retencion:d.retencion!==undefined&&d.retencion!==""?num(d.retencion):rec.retencion,baseAuto:rec.base,retAuto:rec.retencion}}).sort((a,b)=>a.nombre.localeCompare(b.nombre,"es"));
}
const opt=(list,value)=>list.map(([v,l])=>`<option value="${escapeHtml(v)}"${String(v)===String(value)?" selected":""}>${escapeHtml(l)}</option>`).join("");
function card(r,i,n){
  const d=r.d,k=escapeHtml(r.key),inp=(f,label,value,extra="",cls="")=>`<label class="m180-f ${cls}"><small>${label}</small><input data-m180="${f}" data-key="${k}" value="${escapeHtml(fmt(value))}" ${extra}></label>`;
  const sel=(f,label,list,value,cls="")=>`<label class="m180-f ${cls}"><small>${label}</small><select data-m180="${f}" data-key="${k}">${opt(list,value)}</select></label>`;
  const provs=Object.entries(PROVINCIAS).map(([c,nm])=>[c,`${c} · ${nm}`]);
  const provSel=(f,label,value)=>provs.length?sel(f,label,[["","—"],...provs],value):inp(f,label,value,'maxlength="2"');
  return `<article class="m180-card" data-i="${i}"><header><span class="m180-n">Perceptor ${i+1} de ${n}</span><strong>${escapeHtml(r.nombre)}</strong><small>${escapeHtml(r.nif||"Sin NIF")} · cuenta ${escapeHtml(r.cuenta||"")}</small></header>
    <h6>Datos de la operación</h6>
    <div class="m180-g c3">${inp("nif","NIF del perceptor",r.nif,'maxlength="9"')}${inp("nifRepresentante","NIF del representante legal",d.nifRepresentante,'maxlength="9"')}${inp("nombre","Apellidos y nombre, razón social o denominación",r.nombre,"","wide")}</div>
    <div class="m180-g c3">${inp("ejercicioDevengo","Ejercicio de devengo",d.ejercicioDevengo,'maxlength="4" inputmode="numeric" placeholder="Solo si es de otro año"')}${provSel("provincia","Código provincia",r.provincia)}${sel("modalidad","Modalidad",MODALIDAD,r.modalidad)}</div>
    <div class="m180-g c3">${inp("base","Base retención e ingreso a cuenta",r.base.toFixed(2).replace(".",","),'inputmode="decimal"')}${inp("porcentaje","% Retención",String(r.porcentaje).replace(".",","),'inputmode="decimal"')}${inp("retencion","Retención e ingreso a cuenta",r.retencion.toFixed(2).replace(".",","),'inputmode="decimal"')}</div>
    ${Math.abs(r.base-r.baseAuto)>0.005||Math.abs(r.retencion-r.retAuto)>0.005?`<p class="m180-note">⚠ Modificado a mano. Según los 115 del año: base ${tdEur(r.baseAuto)} · retención ${tdEur(r.retAuto)}.</p>`:`<p class="m180-note ok">✓ Importes de los 115 del año.</p>`}
    <h6>Datos del inmueble</h6>
    <div class="m180-g c4">${sel("situacion","Situación del inmueble",[["","—"],...SITUACION],d.situacion,"span2")}${inp("refCatastral","Referencia catastral",d.refCatastral,'maxlength="20"',"span2")}</div>
    <div class="m180-g c4">${sel("tipoVia","Tipo de vía",[["",""],...VIAS.map(v=>[v,v])],d.tipoVia)}${inp("via","Nombre de la vía pública",d.via,"","span3")}</div>
    <div class="m180-g c8">${sel("tipoNum","Tipo de numeración",NUMERACION,d.tipoNum||"NUM")}${inp("numero","Número de casa",d.numero)}${sel("calificador","Calificador del número",CALIFICADOR,d.calificador)}${inp("bloque","Bloque",d.bloque)}${inp("portal","Portal",d.portal)}${inp("escalera","Escalera",d.escalera)}${inp("planta","Planta o piso",d.planta)}${inp("puerta","Puerta",d.puerta)}</div>
    <div class="m180-g c4">${inp("complemento","Complemento",d.complemento,"","span2")}${inp("codMunicipio","Código de municipio",d.codMunicipio,'maxlength="5" inputmode="numeric"')}${provSel("provInmueble","Código de provincia",d.provInmueble)}</div>
    <div class="m180-g c4">${inp("cp","Código postal",d.cp,'maxlength="5" inputmode="numeric"')}${inp("localidad","Localidad o población",d.localidad)}${inp("municipio","Municipio",d.municipio,"","span2")}</div>
  </article>`;
}
function detail(){
  const year=taxDraftYear(),recs=records(),c=contact(),control=state().data,total={base:tdRound(recs.reduce((s,r)=>s+r.base,0)),ret:tdRound(recs.reduce((s,r)=>s+r.retencion,0))};
  const ret115=tdRound(["1T","2T","3T","4T"].reduce((s,p)=>s+(Number(taxDraftBuild("115",p).summary?.retencion)||0),0));
  const idx=Math.min(taxDrafts.m180Index||0,Math.max(0,recs.length-1));
  return `<div class="td-card-title"><strong>Resumen anual · Modelo 180 · ${year}</strong><span>${escapeHtml(taxDrafts.clientData?.cif?taxDrafts.clientData.cif+" · ":"")}${escapeHtml(taxDrafts.client)}</span></div>
    <div class="m180-contact"><strong>Declarante</strong><label class="m180-f"><small>Teléfono de contacto</small><input data-m180c="telefono" value="${escapeHtml(c.telefono)}" maxlength="9" inputmode="tel"></label><label class="m180-f wide"><small>Persona con quien relacionarse</small><input data-m180c="nombre" value="${escapeHtml(c.nombre)}"></label></div>
    <div class="m347-summary m180-summary"><div><small>Nº de perceptores</small><b>${recs.length}</b></div><div><small>Base retenciones e ingresos a cuenta</small><b>${tdEur(total.base)}</b></div><div><small>Retenciones e ingresos a cuenta</small><b>${tdEur(total.ret)}</b></div></div>
    ${Math.abs(ret115-total.ret)<0.02?`<div class="td-check ok">✓ <div><b>Cuadra con los 115 del año</b>Retenciones de los cuatro trimestres: ${tdEur(ret115)}.</div></div>`:`<div class="td-check warn">⚠ <div><b>No cuadra con los 115</b>Suma de los 115: ${tdEur(ret115)} · resumen anual: ${tdEur(total.ret)}.</div></div>`}
    ${recs.length?`<div class="m180-nav"><button type="button" data-m180-go="-1" aria-label="Anterior"${idx<=0?" disabled":""}>‹</button><div class="m180-chips">${recs.map((r,i)=>`<button type="button" class="m180-chip${i===idx?" on":""}" data-m180-to="${i}" title="${escapeHtml(r.nombre)}">${i+1}. ${escapeHtml(r.nombre)}</button>`).join("")}</div><button type="button" data-m180-go="1" aria-label="Siguiente"${idx>=recs.length-1?" disabled":""}>›</button></div>
      <div class="m180-track">${recs.map((r,i)=>card(r,i,recs.length)).join("")}</div>`:'<p class="td-note">No hay arrendadores con retención en el año.</p>'}
    <div class="td-actions m347-actions">${control.draft?`<p class="td-confirmed">✓ Confirmado el ${tdDate(control.draft.confirmedAt)}${control.draft.confirmedBy?` por ${escapeHtml(control.draft.confirmedBy)}`:""}</p>`:""}<button type="button" class="primary blue-button" data-m180-confirm${recs.length?"":" disabled"}>${control.draft?"Confirmar de nuevo":"Confirmar borrador"}</button></div>`;
}
function bind(box){
  const track=box.querySelector(".m180-track"),recs=box.querySelectorAll(".m180-card").length;
  const go=i=>{i=Math.max(0,Math.min(recs-1,i));taxDrafts.m180Index=i;track?.scrollTo({left:track.clientWidth*i,behavior:"smooth"});box.querySelectorAll(".m180-chip").forEach((c,j)=>c.classList.toggle("on",j===i));const [prev,next]=box.querySelectorAll("[data-m180-go]");if(prev)prev.disabled=i<=0;if(next)next.disabled=i>=recs-1;box.querySelector(`.m180-chip[data-m180-to="${i}"]`)?.scrollIntoView({block:"nearest",inline:"nearest"})};
  if(track){track.scrollLeft=track.clientWidth*(taxDrafts.m180Index||0);let t=0;track.addEventListener("scroll",()=>{clearTimeout(t);t=setTimeout(()=>{const i=Math.round(track.scrollLeft/track.clientWidth);if(i!==taxDrafts.m180Index){taxDrafts.m180Index=i;box.querySelectorAll(".m180-chip").forEach((c,j)=>c.classList.toggle("on",j===i))}},120)},{passive:true})}
  box.querySelectorAll("[data-m180-go]").forEach(b=>b.addEventListener("click",()=>go((taxDrafts.m180Index||0)+Number(b.dataset.m180Go))));
  box.querySelectorAll("[data-m180-to]").forEach(b=>b.addEventListener("click",()=>go(Number(b.dataset.m180To))));
  box.querySelectorAll("[data-m180]").forEach(input=>input.addEventListener("change",()=>{const f=input.dataset.m180,key=input.dataset.key;
    save(m=>{const d=m.detalle[key]=m.detalle[key]||{};d[f]=f.startsWith("nif")||f==="refCatastral"?input.value.trim().toUpperCase():input.value.trim()},["base","porcentaje","retencion","nombre","nif"].includes(f))}));
  box.querySelectorAll("[data-m180c]").forEach(input=>input.addEventListener("change",()=>{const c={...contact(),[input.dataset.m180c]:input.value.trim()};save(m=>{m.contacto=c});try{localStorage.setItem(CONTACT_KEY,JSON.stringify(c))}catch{}}));
  box.querySelector("[data-m180-confirm]")?.addEventListener("click",()=>{
    const year=taxDraftYear(),key=declarationKey("180",PERIOD,taxDrafts.client,year),data=declarationData("180",PERIOD,taxDrafts.client,year),t=new Date(),recs=records();
    data.prepared=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
    data.draft={model:"180",period:PERIOD,year,client:taxDrafts.client,cif:taxDrafts.clientData?.cif||"",contacto:contact(),records:recs.map(({pct,d,...r})=>({...r,...d,nif:r.nif,nombre:r.nombre,provincia:r.provincia,base:r.base,porcentaje:r.porcentaje,retencion:r.retencion})),confirmedAt:t.toISOString(),confirmedBy:typeof signedInUser!=="undefined"&&signedInUser?signedInUser.name:""};
    localStorage.setItem(key,JSON.stringify(data));renderTaxDraftMain();
  });
  box.addEventListener("click",event=>event.stopPropagation());
}
const previousDetail=window.taxDraftAnnualDetail;
window.taxDraftAnnualDetail=model=>model==="180"?detail():(previousDetail?previousDetail(model):"");
const previousMain=renderTaxDraftMain;
renderTaxDraftMain=function(){const r=previousMain.apply(this,arguments);const box=document.querySelector('#tdMain [data-td-annual-detail="180"]');if(box)bind(box);return r};
(function(){const style=document.createElement("style");style.textContent=`
.m180-contact{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 16px;margin-bottom:10px}.m180-contact>strong{width:100%;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#1f4a99}
.m180-contact .m180-f{width:160px}.m180-contact .m180-f.wide{flex:1 1 300px;width:auto}
.m180-summary{grid-template-columns:repeat(3,minmax(0,1fr))!important;margin-bottom:8px;border:1px solid #e8ebf1;border-radius:12px;overflow:hidden}
.m180-f{display:flex;flex-direction:column;gap:4px;min-width:0}.m180-f small{font-size:11.5px;font-weight:600;color:#56627c}
.m180-f input,.m180-f select{height:34px;padding:4px 9px;border:1px solid #d8deea;border-radius:8px;font:inherit;font-size:13px;font-weight:500;background:#fff;min-width:0;width:100%}
.m180-nav{display:grid;grid-template-columns:36px minmax(0,1fr) 36px;gap:8px;align-items:center;margin:12px 0 8px}
.m180-nav>button{width:36px;height:36px;border-radius:50%;border:1px solid #d8deea;background:#fff;font-size:20px;line-height:1;cursor:pointer;color:#1f4a99}.m180-nav>button:disabled{opacity:.35;cursor:default}
.m180-chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px}.m180-chips::-webkit-scrollbar{display:none}
.m180-chip{flex:none;max-width:240px;padding:6px 12px;border-radius:999px;border:1px solid #d8deea;background:#fff;font:inherit;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.m180-chip.on{background:#1f4a99;border-color:#1f4a99;color:#fff}
.m180-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;border:1px solid #e3e7ef;border-radius:14px;background:#fff}.m180-track::-webkit-scrollbar{display:none}
.m180-card{flex:0 0 100%;scroll-snap-align:start;padding:14px 16px;min-width:0}
.m180-card>header{display:flex!important;flex-wrap:wrap;align-items:baseline;justify-content:flex-start!important;gap:4px 12px;min-height:0!important;height:auto!important;padding:0 0 10px!important;margin:0 0 6px!important;background:none!important;border-bottom:1px solid #eef0f5;position:static!important;box-shadow:none!important}
.m180-n{font-size:11px;font-weight:800;color:#1f4a99;background:#eef1ff;border-radius:999px;padding:2px 8px}.m180-card header strong{font-size:15px}.m180-card header small{color:#69748a;font-size:12px}
.m180-card h6{margin:12px 0 8px;font-size:12.5px;color:#1f4a99}
.m180-g{display:grid;gap:10px 12px;margin-bottom:10px}.m180-g.c3{grid-template-columns:repeat(3,minmax(0,1fr))}.m180-g.c4{grid-template-columns:repeat(4,minmax(0,1fr))}.m180-g.c8{grid-template-columns:repeat(8,minmax(0,1fr))}
.m180-g .span2{grid-column:span 2}.m180-g .span3{grid-column:span 3}
.m180-note{margin:0 0 4px;font-size:12px;color:#8a5a00}.m180-note.ok{color:#168456}
@media(max-width:900px){.m180-g.c8{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:760px){.m180-g.c3,.m180-g.c4,.m180-g.c8{grid-template-columns:1fr 1fr}.m180-g .span2,.m180-g .span3,.m180-g .wide{grid-column:1/-1}.m180-summary{grid-template-columns:1fr!important}.m180-contact .m180-f{width:100%}}`;document.head.append(style)})();
if(document.querySelector("#tdMain")&&taxDrafts.client&&taxDrafts.open==="anual")renderTaxDraftMain();
})();
