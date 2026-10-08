/* Modelo 180 (resumen anual del 115) en Borradores: se despliega en la fila «Declaración anual» del 115.
   Un registro por arrendador con los datos de la operación (ya rellenados con los 115 del año) y los
   datos del inmueble. Los perceptores se ven en carrusel. Todo se guarda en Control (180 · 4T). */
(function(){
if(typeof taxDraftBuild!=="function")return;
const PERIOD="4T",CONTACT_KEY="app-am-347-contacto";
const PROVINCIAS={"01":"Álava","02":"Albacete","03":"Alicante","04":"Almería","05":"Ávila","06":"Badajoz","07":"Illes Balears","08":"Barcelona","09":"Burgos","10":"Cáceres","11":"Cádiz","12":"Castellón","13":"Ciudad Real","14":"Córdoba","15":"A Coruña","16":"Cuenca","17":"Girona","18":"Granada","19":"Guadalajara","20":"Gipuzkoa","21":"Huelva","22":"Huesca","23":"Jaén","24":"León","25":"Lleida","26":"La Rioja","27":"Lugo","28":"Madrid","29":"Málaga","30":"Murcia","31":"Navarra","32":"Ourense","33":"Asturias","34":"Palencia","35":"Las Palmas","36":"Pontevedra","37":"Salamanca","38":"S.C. Tenerife","39":"Cantabria","40":"Segovia","41":"Sevilla","42":"Soria","43":"Tarragona","44":"Teruel","45":"Toledo","46":"Valencia","47":"Valladolid","48":"Bizkaia","49":"Zamora","50":"Zaragoza","51":"Ceuta","52":"Melilla","99":"Extranjero"};
const SITUACION=[["1","1 · Con referencia catastral (territorio común)"],["2","2 · En el País Vasco"],["3","3 · En Navarra"],["4","4 · Sin referencia catastral"]];
const MODALIDAD=[["1","1 · Dineraria"],["2","2 · En especie"]];
const VIAS=[["CALLE","Calle"],["AVDA","Avenida"],["PLAZA","Plaza"],["PASEO","Paseo"],["CMNO","Camino"],["CTRA","Carretera"],["RONDA","Ronda"],["TRVA","Travesía"],["URB","Urbanización"],["POLIG","Polígono"],["GTA","Glorieta"],["PSAJE","Pasaje"],["BARRIO","Barrio"],["OTROS","Otros"]];
const VIA_OLD={AVENIDA:"AVDA",CAMINO:"CMNO",CARRETERA:"CTRA",TRAVESIA:"TRVA",URBANIZACION:"URB",POLIGONO:"POLIG",GLORIETA:"GTA",PASAJE:"PSAJE"};
const via=v=>VIA_OLD[v]||v||"";
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
    <div class="m180-g c4">${sel("tipoVia","Tipo de vía",[["",""],...VIAS.map(([v,l])=>[v,`${v} · ${l}`])],via(d.tipoVia))}${inp("via","Nombre de la vía pública",d.via,"","span3")}</div>
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
    <div class="td-actions m347-actions">${control.draft?`<p class="td-confirmed">✓ Confirmado el ${tdDate(control.draft.confirmedAt)}${control.draft.confirmedBy?` por ${escapeHtml(control.draft.confirmedBy)}`:""}</p>`:""}<button type="button" class="secondary-button" data-m180-view${recs.length?"":" disabled"}>Ver borrador</button><button type="button" class="primary blue-button" data-m180-confirm${recs.length?"":" disabled"}>${control.draft?"Confirmar de nuevo":"Confirmar borrador"}</button></div>`;
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
  box.querySelector("[data-m180-view]")?.addEventListener("click",()=>openForm(draftNow(),false));
  box.querySelector("[data-m180-confirm]")?.addEventListener("click",()=>{
    const year=taxDraftYear(),key=declarationKey("180",PERIOD,taxDrafts.client,year),data=declarationData("180",PERIOD,taxDrafts.client,year),t=new Date();
    data.prepared=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
    data.draft={...draftNow(),confirmedAt:t.toISOString(),confirmedBy:typeof signedInUser!=="undefined"&&signedInUser?signedInUser.name:""};
    data.amount=data.draft.summary.retencion;
    localStorage.setItem(key,JSON.stringify(data));renderTaxDraftMain();
  });
  box.addEventListener("click",event=>event.stopPropagation());
}
function draftNow(){const recs=records();
  return{model:"180",period:PERIOD,year:taxDraftYear(),client:taxDrafts.client,cif:taxDrafts.clientData?.cif||"",contacto:contact(),
    records:recs.map(({pct,d,...r})=>({...d,...r,cpPerceptor:r.cp,cp:d.cp||"",tipoVia:via(d.tipoVia),nif:r.nif,nombre:r.nombre,provincia:r.provincia,base:r.base,porcentaje:r.porcentaje,retencion:r.retencion})),
    summary:{n:recs.length,base:tdRound(recs.reduce((s,r)=>s+r.base,0)),retencion:tdRound(recs.reduce((s,r)=>s+r.retencion,0))}};
}
/* Borrador con el aspecto del impreso presentado: hoja resumen + relación de perceptores (4 por hoja). */
const es2=v=>{const [i,dc]=Math.abs(Number(v)).toFixed(2).split(".");return(Number(v)<0?"-":"")+i.replace(/\B(?=(\d{3})+(?!\d))/g,".")+","+dc};
const money=v=>Number(v)?es2(v):"";
const pctTxt=v=>v===""||v===undefined||v===null?"":es2(v);
function formHtml(dr){
  const e=v=>escapeHtml(v??""),f=(label,value,w,cls="")=>`<div class="f80-f ${cls}" style="grid-column:span ${w}"><small>${label}</small><span>${e(value)}</span></div>`;
  const recs=dr.records||[],sum=dr.summary||{n:recs.length,base:recs.reduce((s,r)=>s+(+r.base||0),0),retencion:recs.reduce((s,r)=>s+(+r.retencion||0),0)};
  const head=(title,big)=>`<div class="f80-head"><div class="f80-agency"><b>AT</b><span>Agencia Tributaria</span></div><div class="f80-title">${title}<strong>${big}</strong></div><div class="f80-model"><small>Modelo</small><b>180</b></div></div>`;
  const perceptor=(r,i)=>`<section class="f80-box"><div class="f80-tab">Perceptor ${i}</div><div class="f80-grid">
      ${f("N.I.F. perceptor",r?.nif,3)}${f("N.I.F. representante legal",r?.nifRepresentante,3)}${f("Apellidos y nombre, razón social o denominación del perceptor",r?.nombre,11)}${f("Provincia (Código)",r?.provincia,3)}
      ${f("Modalidad",r?.modalidad,2)}${f("Base retenciones e ingresos a cuenta",money(r?.base),5,"num")}${f("% retención",r?pctTxt(r.porcentaje):"",2,"num")}${f("Retenciones e ingresos a cuenta",money(r?.retencion),5,"num")}${f("Ejercicio devengo",r?.ejercicioDevengo,3)}<i style="grid-column:span 3"></i>
      ${f("Situación (Código)",r?.situacion,2)}${f("Referencia catastral",r?.refCatastral,11)}<i style="grid-column:span 7"></i>
      ${f("Tipo de vía",r?.tipoVia,2)}${f("Nombre de la vía pública",r?.via,7)}${f("Tipo Num.",r?(r.tipoNum||"NUM"):"",2)}${f("Núm. casa",r?.numero,2)}${f("Calif. nu",r?.calificador,1)}${f("Bloque",r?.bloque,1)}${f("Portal",r?.portal,1)}${f("Escal.",r?.escalera,1)}${f("Planta",r?.planta,1)}${f("Puerta",r?.puerta,2)}
      ${f("Complemento domicilio (ej: Urbanización, Polígono Industrial, C. Comercial…)",r?.complemento,10)}${f("Localidad / Población (si es distinta de Municipio)",r?.localidad,10)}
      ${f("Nombre del municipio",r?.municipio,8)}${f("Cód. municipio",r?.codMunicipio,2)}${f("Provincia",r&&PROVINCIAS[r.provInmueble]?PROVINCIAS[r.provInmueble].toUpperCase():"",6)}${f("Cód. provincia",r?.provInmueble,2)}${f("Cód. postal",r?.cp,2)}
    </div></section>`;
  const hojas=[];for(let i=0;i<Math.max(1,recs.length);i+=4)hojas.push(recs.slice(i,i+4));
  const ident=`<section class="f80-box f80-ident"><div class="f80-tab">Datos identificativos de esta hoja</div><div class="f80-grid">${f("N.I.F. del declarante",dr.cif,10)}${f("Ejercicio",dr.year,10)}</div></section>`;
  return `<div class="f80"><div class="f80-page"><div class="f80-wm">BORRADOR</div>${head("<span>Impuesto sobre la Renta de las Personas Físicas · Impuesto sobre Sociedades · Impuesto sobre la Renta de no Residentes (establecimientos permanentes)</span><em>Retenciones e ingresos a cuenta sobre determinadas rentas o rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos</em>","Resumen anual")}
      <div class="f80-row2"><section class="f80-box"><div class="f80-tab">Declarante</div><div class="f80-grid">${f("N.I.F.",dr.cif,8)}<i style="grid-column:span 12"></i>${f("Apellidos y nombre, razón social o denominación",dr.client,20)}${f("Apellidos y nombre de la persona con quien relacionarse",dr.contacto?.nombre,20)}${f("Teléfono de contacto",dr.contacto?.telefono,8)}</div></section>
      <section class="f80-box"><div class="f80-tab">Ejercicio</div><div class="f80-grid">${f("Ejercicio",dr.year,20)}</div></section></div>
      <section class="f80-box"><div class="f80-tab">Declaración complementaria o sustitutiva</div><div class="f80-cs"><p><span>Declaración complementaria por inclusión de datos</span><b class="f80-chk">${dr.complementaria?"X":""}</b></p><p><span>Declaración sustitutiva</span><b class="f80-chk">${dr.sustitutiva?"X":""}</b></p>${f("Número identificativo de la declaración anterior",dr.anterior,1)}</div></section>
      <section class="f80-box"><div class="f80-tab">Resumen de los datos incluidos en la declaración</div><div class="f80-res">
        <div><small>Nº Total de Perceptores</small><p><b>01</b><span>${sum.n||""}</span></p></div><div><small>Base retenciones e ingresos a cuenta</small><p><b>02</b><span>${money(sum.base)}</span></p></div><div><small>Retenciones e ingresos a cuenta</small><p><b>03</b><span>${money(sum.retencion)}</span></p></div></div></section>
      <p class="f80-foot">Borrador preparado por Asesoría Molinero con los datos de los modelos 115 del ejercicio${dr.confirmedBy?` · ${e(dr.confirmedBy)}`:""}. No válido para su presentación.</p></div>
    ${hojas.map((h,k)=>`<div class="f80-page"><div class="f80-wm">BORRADOR</div>${head("<span>Retenciones e ingresos a cuenta I.R.P.F., Impuesto sobre Sociedades e Impuesto sobre la Renta de no Residentes (establecimientos permanentes)</span>","Relación de perceptores")}${ident}
      ${[0,1,2,3].map(j=>perceptor(h[j],k*4+j+1)).join("")}<p class="f80-foot">Hoja ${k+1} de ${hojas.length}</p></div>`).join("")}</div>`;
}
const FORM_CSS=`.f80{font-family:Arial,Helvetica,sans-serif;color:#111;display:flex;flex-direction:column;gap:18px}
.f80-page{position:relative;background:#fff;border:1px solid #d5d9e4;padding:18px 20px 12px;max-width:820px;margin:0 auto;width:100%;box-sizing:border-box;overflow:hidden}
.f80-wm{position:absolute;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:90px;font-weight:800;color:rgba(31,46,140,.07);pointer-events:none;letter-spacing:.08em}
.f80-head{display:grid;grid-template-columns:150px 1fr 70px;gap:10px;align-items:stretch;margin-bottom:14px}
.f80-agency{display:flex;align-items:center;gap:6px;background:#e3e6f4;border-radius:6px;padding:8px}.f80-agency b{font-size:15px;color:#1a2a8c}.f80-agency span{font-size:12.5px;font-family:Georgia,serif}
.f80-title{background:#16288a;color:#fff;border-radius:5px;padding:7px 10px;display:flex;flex-direction:column;gap:3px;box-shadow:4px 4px 0 #bbb}.f80-title span{font-size:10.5px;font-weight:700;line-height:1.25}.f80-title em{font-style:normal;font-size:8.5px;font-weight:700;text-transform:uppercase;line-height:1.25}.f80-title strong{font-size:16px}
.f80-model{background:#e3e6f4;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:4px 4px 0 #bbb}.f80-model small{font-size:11px;font-weight:700}.f80-model b{font-size:28px}
.f80-box{border:1px solid #333;background:#e3e6f4;margin:16px 0 0;position:relative;padding:8px 8px 6px}.f80-tab{position:absolute;top:-14px;left:-1px;background:#16288a;color:#fff;font-size:11px;font-weight:700;padding:2px 12px 2px 8px;border-radius:5px 5px 0 0;border-top-right-radius:12px}
.f80-grid{display:grid;grid-template-columns:repeat(20,minmax(0,1fr));gap:4px 5px}.f80-f{min-width:0}.f80-f small{display:block;font-size:8.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:1px}
.f80-f span{display:block;min-height:17px;background:#fff;border-left:1px solid #16288a;border-bottom:1px solid #16288a;padding:1px 4px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.f80-f.num span{text-align:right}
.f80-row2{display:grid;grid-template-columns:1.6fr 1fr;gap:10px;align-items:end}
.f80-cs{display:grid;grid-template-columns:1fr 1fr;gap:6px 30px;padding:8px 6px;font-size:10px;font-weight:700}.f80-cs p{margin:0;display:flex;justify-content:space-between;align-items:center;gap:8px}.f80-cs .f80-f{grid-column:2!important;grid-row:1/3;align-self:center}
.f80-chk{width:15px;height:15px;background:#fff;border:1px solid #888;box-shadow:2px 2px 0 #999;text-align:center;font-size:11px;line-height:15px}
.f80-res{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:6px 10px 10px}.f80-res small{font-size:9px}.f80-res p{margin:2px 0 0;display:flex}.f80-res b{border:1px solid #16288a;color:#16288a;font-size:9px;padding:1px 3px;background:#fff}.f80-res span{flex:1;background:#fff;border-bottom:1px solid #16288a;text-align:right;padding:1px 4px;font-size:11.5px;min-height:16px}
.f80-ident{display:inline-block;min-width:260px}.f80-ident .f80-grid{grid-template-columns:repeat(20,minmax(0,1fr))}
.f80-foot{margin:12px 0 0;text-align:center;font-size:9px;color:#555}
@media(max-width:700px){.f80-page{padding:12px 10px}.f80-head{grid-template-columns:1fr 60px}.f80-agency{display:none}.f80-row2,.f80-cs,.f80-res{grid-template-columns:1fr}.f80-cs .f80-f{grid-column:1!important;grid-row:auto}.f80-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.f80-grid>*{grid-column:span 2!important}.f80-grid>i{display:none}}
@media print{.f80{gap:0}.f80-page{border:0;page-break-after:always;max-width:none}.f80-page:last-child{page-break-after:auto}}`;
function openForm(draft,confirmed){
  const form=formHtml(draft),title=`Borrador modelo 180 ${draft.year} ${draft.client}`,sum=draft.summary||{n:(draft.records||[]).length,retencion:(draft.records||[]).reduce((s,r)=>s+(+r.retencion||0),0)};
  document.querySelector("#tdFormView")?.remove();
  const view=document.createElement("div");view.id="tdFormView";view.className="td-modal";view.style.zIndex="3000";
  view.innerHTML=`<div class="td-modal-box td-form-modal"><header><div><span class="td-tag">${confirmed?"Borrador confirmado":"Vista previa del borrador"}</span><h3>Modelo 180 · ${escapeHtml(draft.year)}</h3><p>${escapeHtml(draft.cif?draft.cif+" · ":"")}${escapeHtml(draft.client)} · ${sum.n} perceptores · ${tdEur(sum.retencion)}</p></div><div class="td-form-actions"><button type="button" class="secondary-button" data-print>Imprimir / guardar PDF</button><button type="button" class="td-close" aria-label="Cerrar">×</button></div></header>
    <div class="td-modal-body" style="background:#eef0f5"><style>${FORM_CSS}</style>${form}</div></div>`;
  document.body.append(view);
  view.querySelector("[data-print]").addEventListener("click",()=>{const w=window.open("","_blank");if(!w)return alert("Permite las ventanas emergentes.");w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${FORM_CSS}@page{size:A4;margin:8mm}body{margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${form}<script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script></body></html>`);w.document.close()});
  const close=()=>{view.remove();document.removeEventListener("keydown",onKey)},onKey=e=>{if(e.key==="Escape")close()};
  view.addEventListener("click",e=>{if(e.target===view||e.target.closest(".td-close"))close()});document.addEventListener("keydown",onKey);
}
// El ojo de Control abre este borrador hasta que esté la declaración definitiva.
if(typeof openConfirmedTaxDraft==="function"){
  const previousOpen=openConfirmedTaxDraft;
  openConfirmedTaxDraft=function(key){let data={};try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
    if(data.draft?.model==="180")return openForm(data.draft,true);return previousOpen.apply(this,arguments)};
}
window.openM180Form=openForm;
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
