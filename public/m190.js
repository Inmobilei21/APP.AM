/* Modelo 190 (resumen anual del 111) en Borradores. Se abre desde la fila «Declaración anual» del 111.
   Relación de perceptores del año: trabajadores (clave A) desde las nóminas y profesionales (clave G)
   desde las facturas con retención. NIF, provincia y subclave se pueden corregir; se guardan en el
   Control de declaraciones (190 · 4T) y se comparten con todo el despacho. */
(function(){
if(typeof taxDraftBuild!=="function"||typeof TAX_DRAFT_BUILDERS==="undefined")return;
const PERIOD="4T";
const SUBCLAVES={A:[["","—"]],G:[["01","01 · Actividades profesionales (tipo general)"],["02","02 · Profesionales: inicio de actividad"],["03","03 · Determinadas actividades (15 %)"],["04","04 · Otras actividades profesionales"]]};
const state=()=>{const data=declarationData("190",PERIOD,taxDrafts.client,taxDraftYear());return{data,m:data.m190||{nif:{},provincia:{},subclave:{},nombre:{}}}};
function save(change){const year=taxDraftYear(),key=declarationKey("190",PERIOD,taxDrafts.client,year),{data,m}=state();change(m);data.m190=m;localStorage.setItem(key,JSON.stringify(data))}
const prov=cp=>/^\d{5}$/.test(String(cp||""))?String(cp).slice(0,2):"";
function m190Records(){
  const map=new Map(),{m}=state(),drafts=["1T","2T","3T","4T"].map(period=>taxDraftBuild("111",period));
  const add=(key,base,values)=>{const rec=map.get(key)||{key,...base,integra:0,retenciones:0,especieValor:0,especieIngresos:0,estimado:false};
    for(const k of ["integra","retenciones","especieValor","especieIngresos"])rec[k]=tdRound(rec[k]+(values[k]||0));if(values.estimado)rec.estimado=true;map.set(key,rec)};
  drafts.forEach(draft=>{
    (draft.lists.trabajo||[]).forEach(entry=>{
      const workers=entry.trabajadores||[],total=workers.reduce((sum,w)=>sum+(Number(w.liquido)||0),0);
      workers.forEach(w=>{
        const share=workers.length===1?1:(total?(Number(w.liquido)||0)/total:1/workers.length);
        const gross=entry.percepciones*share,ret=entry.retencion*share;
        add(`A|${w.cuenta}`,{clave:"A",cuenta:w.cuenta,nif:w.nif||"",nombre:w.nombre||w.cuenta,cp:w.cp||""},entry.especie?{especieValor:gross,especieIngresos:ret,estimado:workers.length>1}:{integra:gross,retenciones:ret,estimado:workers.length>1});
      });
    });
    (draft.lists.profesionales||[]).forEach(item=>{
      add(`G|${item.nif||item.cuenta}`,{clave:"G",cuenta:item.cuenta,nif:item.nif||"",nombre:item.nombre||item.cuenta,cp:item.cp||""},item.especie?{especieValor:item.base,especieIngresos:item.retencion}:{integra:item.base,retenciones:item.retencion});
    });
  });
  return [...map.values()].map(rec=>({...rec,nif:(m.nif[rec.key]??rec.nif).toUpperCase(),nombre:m.nombre[rec.key]??rec.nombre,provincia:m.provincia[rec.key]??prov(rec.cp),subclave:m.subclave[rec.key]??(rec.clave==="G"?"01":"")}))
    .sort((a,b)=>a.clave.localeCompare(b.clave)||a.nombre.localeCompare(b.nombre,"es"));
}
function m190Summary(records){return{n:records.length,importe:tdRound(records.reduce((s,r)=>s+r.integra+r.especieValor,0)),retenciones:tdRound(records.reduce((s,r)=>s+r.retenciones+r.especieIngresos,0))}}
function m190Draft(){
  const records=m190Records(),sum=m190Summary(records);
  return{model:"190",period:PERIOD,year:taxDraftYear(),client:taxDrafts.client,cif:taxDrafts.clientData?.cif||"",title:"Resumen anual de retenciones del trabajo y profesionales",records,summary:sum,result:sum.retenciones,
    confirmedAt:new Date().toISOString(),confirmedBy:typeof signedInUser!=="undefined"&&signedInUser?signedInUser.name:""};
}
function m190DetailHtml(){
  const year=taxDraftYear(),records=m190Records(),sum=m190Summary(records),control=state().data;
  const ret111=tdRound(["1T","2T","3T","4T"].reduce((s,period)=>s+taxDraftBuild("111",period).result,0));
  const checks=[Math.abs(ret111-sum.retenciones)<0.02?`<div class="td-check ok">✓ <div><b>Cuadra con los 111 del año</b>Retenciones de los cuatro trimestres: ${tdEur(ret111)}.</div></div>`:`<div class="td-check warn">⚠ <div><b>No cuadra con los 111</b>Suma de los 111: ${tdEur(ret111)} · resumen anual: ${tdEur(sum.retenciones)}.</div></div>`];
  const sinNif=records.filter(r=>!/^[A-Z0-9]{9}$/.test(r.nif)).length,sinProv=records.filter(r=>!r.provincia).length,est=records.filter(r=>r.estimado).length;
  if(sinNif)checks.push(`<div class="td-check warn">⚠ <div><b>${sinNif} perceptor${sinNif===1?"":"es"} sin NIF</b>Complétalo en la tabla (o en la ficha de la cuenta en AMCOMTA).</div></div>`);
  if(sinProv)checks.push(`<div class="td-check warn">⚠ <div><b>${sinProv} sin provincia</b>Indica el código de provincia (2 cifras).</div></div>`);
  if(est)checks.push(`<div class="td-check warn">⚠ <div><b>${est} trabajador${est===1?"":"es"} con importes estimados</b>Hay nóminas contabilizadas en un único asiento para varios trabajadores; el reparto se ha hecho en proporción al líquido de cada uno. Con un asiento por trabajador sale exacto.</div></div>`);
  const row=r=>`<tr data-m190="${escapeHtml(r.key)}"><td><b>${r.clave}</b></td><td>${r.clave==="G"?`<select data-m190-sub>${SUBCLAVES.G.map(([v,l])=>`<option value="${v}"${v===r.subclave?" selected":""}>${escapeHtml(l)}</option>`).join("")}</select>`:'<span class="td-dim">—</span>'}</td>
    <td><input class="m190-nif" data-m190-nif value="${escapeHtml(r.nif)}" maxlength="9" placeholder="NIF"></td><td><input class="m190-name" data-m190-name value="${escapeHtml(r.nombre)}"><small>${escapeHtml(r.cuenta)}${r.estimado?" · estimado":""}</small></td>
    <td><input class="m347-small" data-m190-prov value="${escapeHtml(r.provincia)}" maxlength="2" inputmode="numeric"></td>
    <td class="num">${tdEur(r.integra)}</td><td class="num">${tdEur(r.retenciones)}</td><td class="num">${r.especieValor?tdEur(r.especieValor):'<span class="td-dim">—</span>'}</td><td class="num">${r.especieIngresos?tdEur(r.especieIngresos):'<span class="td-dim">—</span>'}</td></tr>`;
  return `<div class="td-card-title"><strong>Resumen anual · Modelo 190 · ${year}</strong><span>${escapeHtml(taxDrafts.clientData?.cif?taxDrafts.clientData.cif+" · ":"")}${escapeHtml(taxDrafts.client)}</span></div>
      <div class="m347-summary m190-summary"><div><small>01 · Número de percepciones</small><b>${sum.n}</b></div><div><small>02 · Importe de las percepciones</small><b>${tdEur(sum.importe)}</b></div><div><small>03 · Retenciones e ingresos a cuenta</small><b>${tdEur(sum.retenciones)}</b></div></div>
      ${checks.join("")}
      <div class="td-table-wrap"><table class="td-list m190-table"><thead><tr><th>Clave</th><th>Subclave</th><th>NIF</th><th>Perceptor</th><th>Prov.</th><th class="num">Percepción íntegra</th><th class="num">Retenciones</th><th class="num">Especie: valoración</th><th class="num">Ingresos a cuenta</th></tr></thead>
      <tbody>${records.map(row).join("")||'<tr><td colspan="9" class="td-dim">No hay percepciones con retención en el año.</td></tr>'}</tbody></table></div>
      <div class="td-actions m347-actions">${control.draft?`<p class="td-confirmed">✓ Confirmado el ${tdDate(control.draft.confirmedAt)}${control.draft.confirmedBy?` por ${escapeHtml(control.draft.confirmedBy)}`:""}</p>`:""}<button type="button" class="secondary-button" data-m190-csv>Excel (CSV)</button><button type="button" class="secondary-button" data-m190-view>Ver borrador</button><button type="button" class="primary blue-button" data-m190-confirm${records.length?"":" disabled"}>${control.draft?"Confirmar de nuevo":"Confirmar borrador"}</button></div>`;
}
function bindM190(box){
  const year=taxDraftYear(),keyOf=el=>el.closest("[data-m190]").dataset.m190;
  box.querySelectorAll("[data-m190-nif]").forEach(i=>i.addEventListener("change",()=>{save(m=>{m.nif[keyOf(i)]=i.value.trim().toUpperCase()});renderTaxDraftMain()}));
  box.querySelectorAll("[data-m190-name]").forEach(i=>i.addEventListener("change",()=>{save(m=>{m.nombre[keyOf(i)]=i.value.trim()});renderTaxDraftMain()}));
  box.querySelectorAll("[data-m190-prov]").forEach(i=>i.addEventListener("change",()=>{save(m=>{m.provincia[keyOf(i)]=i.value.replace(/\D/g,"").padStart(i.value.trim()?2:0,"0")});renderTaxDraftMain()}));
  box.querySelectorAll("[data-m190-sub]").forEach(i=>i.addEventListener("change",()=>{save(m=>{m.subclave[keyOf(i)]=i.value});renderTaxDraftMain()}));
  box.querySelector("[data-m190-confirm]")?.addEventListener("click",()=>{
    const draft=m190Draft(),key=declarationKey("190",PERIOD,taxDrafts.client,draft.year),data=declarationData("190",PERIOD,taxDrafts.client,draft.year),t=new Date();
    data.prepared=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;data.draft=draft;localStorage.setItem(key,JSON.stringify(data));
    renderTaxDraftMain();
  });
  box.querySelector("[data-m190-view]")?.addEventListener("click",()=>openM190Form(m190Draft(),false));
  box.querySelector("[data-m190-csv]")?.addEventListener("click",()=>{
    const cell=v=>`"${String(v??"").replace(/"/g,'""')}"`,num=v=>(Number(v)||0).toFixed(2).replace(".",",");
    const lines=[["Clave","Subclave","NIF","Perceptor","Provincia","Percepción íntegra","Retenciones","Especie valoración","Ingresos a cuenta"].map(cell).join(";"),...m190Records().map(r=>[cell(r.clave),cell(r.subclave),cell(r.nif),cell(r.nombre),cell(r.provincia),num(r.integra),num(r.retenciones),num(r.especieValor),num(r.especieIngresos)].join(";"))];
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"}));a.download=`Modelo 190 ${year} ${taxDrafts.client}.csv`;document.body.append(a);a.click();a.remove();
  });
  // Los clics dentro del detalle no pliegan la fila.
  box.addEventListener("click",event=>event.stopPropagation());
}
const previousDetail=window.taxDraftAnnualDetail;
window.taxDraftAnnualDetail=model=>model==="190"?m190DetailHtml():(previousDetail?previousDetail(model):"");
const previousMain=renderTaxDraftMain;
renderTaxDraftMain=function(){const r=previousMain.apply(this,arguments);const box=document.querySelector('#tdMain [data-td-annual-detail="190"]');if(box)bindM190(box);return r};
/* Borrador con el aspecto del impreso: hoja resumen y relación de percepciones (Percepción 1, 2…) */
function m190FormHtml(draft){
  const f=(label,value,cls="")=>`<label class="${cls}"><small>${label}</small><span>${escapeHtml(value??"")}</span></label>`,money=tdFormMoney;
  const perc=draft.records.map((r,i)=>`<section class="m347-dec m190-dec"><div class="m347-dec-n">Percepción ${i+1}</div><div class="m347-dec-body">
      <div class="m347-grid g3">${f("NIF del perceptor",r.nif)}${f("NIF del representante legal","")}${f("Apellidos y nombre del perceptor o denominación de la entidad perceptora",r.nombre)}</div>
      <div class="m347-grid g6">${f("Provincia",r.provincia)}${f("Clave",r.clave)}${f("Subclave",r.subclave)}${f("Ejercicio de devengo","")}${f("Ceuta o Melilla","")}${f("Tipo de prestación","")}</div>
      <div class="m347-grid g2">${f("Percepciones dinerarias · Percepción íntegra",money(r.integra),"amount")}${f("Retenciones practicadas",money(r.retenciones),"amount")}</div>
      <div class="m347-grid g2">${f("Percepciones en especie · Valoración",money(r.especieValor),"amount")}${f("Ingresos a cuenta efectuados",money(r.especieIngresos),"amount")}</div>
    </div></section>`).join("");
  return `<div class="aeat-form m190-form"><div class="af-watermark">BORRADOR</div>
    <div class="af-head"><div class="af-agency"><strong>Agencia Tributaria</strong><small>Documento preparado por Asesoría Molinero</small></div><div class="af-title"><strong>Retenciones e ingresos a cuenta del IRPF</strong><span>Rendimientos del trabajo y de actividades económicas, premios y determinadas ganancias patrimoniales e imputaciones de renta</span><em>Resumen anual · Ejercicio ${escapeHtml(draft.year)}</em></div><div class="af-model"><small>Modelo</small><b>190</b></div></div>
    <section class="af-sec"><div class="af-side">Declarante</div><div class="af-body"><div class="af-grid af-g2">${f("NIF",draft.cif)}${f("Apellidos y nombre, denominación o razón social",draft.client)}</div><div class="af-grid af-g3">${f("Ejercicio",draft.year)}${f("Modalidad de presentación","Telemática")}${f("Declaración complementaria o sustitutiva","")}</div></div></section>
    <section class="af-sec"><div class="af-side">Resumen</div><div class="af-body">
      <div class="af-row"><span class="af-label">Número total de percepciones relacionadas en la declaración</span><div class="af-cell"><div class="af-box"><b>01</b><span>${draft.summary.n||""}</span></div></div></div>
      <div class="af-row"><span class="af-label">Importe total de las percepciones relacionadas</span><div class="af-cell"><div class="af-box"><b>02</b><span>${money(draft.summary.importe)}</span></div></div></div>
      <div class="af-row"><span class="af-label">Importe total de las retenciones e ingresos a cuenta relacionados</span><div class="af-cell"><div class="af-box"><b>03</b><span>${money(draft.summary.retenciones)}</span></div></div></div></div></section>
    <section class="af-sec"><div class="af-side">Relación de percepciones</div><div class="af-body">${perc||'<p class="af-line">Sin percepciones.</p>'}</div></section>
    <p class="af-foot">Borrador preparado con los datos de la contabilidad${draft.confirmedBy?` · ${escapeHtml(draft.confirmedBy)}`:""}. No válido para su presentación.</p></div>`;
}
const M190_CSS=`.m190-form .af-title{background:#8a6418}.m190-form .af-model,.m190-form .af-side{background:#e8d9a8}.m190-form .af-sec{border-color:#c8a24a}
.m347-dec{display:grid;grid-template-columns:24px 1fr;border:1.5px solid #c8a24a;border-radius:4px;margin:0 0 10px;background:#fffdf6;break-inside:avoid}
.m347-dec-n{writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;background:#f1e6c4;font-weight:700;font-size:10px;padding:4px 0}
.m347-dec-body{padding:6px 8px}.m347-grid{display:grid;gap:6px;margin-bottom:5px}.m347-grid.g3{grid-template-columns:120px 120px 1fr}.m347-grid.g6{grid-template-columns:repeat(6,1fr)}.m347-grid.g2{grid-template-columns:1fr 1fr}
.m190-form label span{border-color:#c8a24a}.m190-form label.amount span{text-align:right}.m190-form .af-check{border-color:#c8a24a}
.m347-q{border:1px solid #c8a24a;border-radius:3px;background:#fff}.m347-q small{display:block;font-size:9px;color:#56627c;padding:2px 5px;border-bottom:1px solid #c8a24a}.m347-q div{display:flex;border-top:1px solid #ecdcae}.m347-q div:first-of-type{border-top:0}.m347-q b{width:30px;border-right:1px solid #c8a24a;font-size:10px;padding:2px 4px}.m347-q span{flex:1;text-align:right;padding:2px 6px;font-weight:700;font-variant-numeric:tabular-nums;min-height:18px}
@media(max-width:700px){.m347-grid.g6{grid-template-columns:repeat(3,1fr)}.m347-grid.g3,.m347-grid.g2{grid-template-columns:1fr}}
.m190-form .af-title{background:#1f4a99}.m190-form .af-model,.m190-form .af-side{background:#b9c6de}.m190-form .af-sec,.m190-form .m347-q{border-color:#a9b8d6}.m190-form .m347-dec{border-color:#a9b8d6;background:#fff}.m190-form .m347-dec-n{background:#dfe6f3}.m190-form label span{border-color:#a9b8d6}.m190-form label.amount span{text-align:right}`;
function openM190Form(draft,confirmed){
  const form=m190FormHtml(draft),title=`Borrador modelo 190 ${draft.year} ${draft.client}`;
  const css=(typeof AEAT_FORM_CSS!=="undefined"?AEAT_FORM_CSS:"")+M190_CSS;
  document.querySelector("#tdFormView")?.remove();
  const view=document.createElement("div");view.id="tdFormView";view.className="td-modal";view.style.zIndex="80";
  view.innerHTML=`<div class="td-modal-box td-form-modal"><header><div><span class="td-tag">${confirmed?"Borrador confirmado":"Vista previa del borrador"}</span><h3>Modelo 190 · ${escapeHtml(draft.year)}</h3><p>${escapeHtml(draft.cif?draft.cif+" · ":"")}${escapeHtml(draft.client)} · ${draft.summary.n} percepciones · ${tdEur(draft.summary.retenciones)}</p></div><div class="td-form-actions"><button type="button" class="secondary-button" data-print>Imprimir / guardar PDF</button><button type="button" class="td-close" aria-label="Cerrar">×</button></div></header>
    <div class="td-modal-body"><style>${css}</style>${form}</div></div>`;
  document.body.append(view);
  view.querySelector("[data-print]").addEventListener("click",()=>{const w=window.open("","_blank");if(!w)return alert("Permite las ventanas emergentes.");w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${css}@page{size:A4;margin:10mm}body{margin:0}.aeat-form{border:0;max-width:none;padding:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${form}<script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script></body></html>`);w.document.close()});
  const close=()=>{view.remove();document.removeEventListener("keydown",onKey)},onKey=e=>{if(e.key==="Escape")close()};
  view.addEventListener("click",e=>{if(e.target===view||e.target.closest(".td-close"))close()});document.addEventListener("keydown",onKey);
}
// «Ver borrador» del 190 en Control de declaraciones.
if(typeof openConfirmedTaxDraft==="function"){
  const previousOpen=openConfirmedTaxDraft;
  openConfirmedTaxDraft=function(key){let data={};try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
    if(data.draft?.model==="190")return openM190Form(data.draft,true);return previousOpen.apply(this,arguments)};
}
(function(){const style=document.createElement("style");style.textContent=`.td-table tfoot tr.td-annual{cursor:pointer}.td-table tfoot tr.td-annual:hover td{background:#eef2fb}
.td-table tfoot tr.td-annual.open .td-caret{transform:rotate(90deg)}.td-table tfoot tr.td-annual-detail>td{white-space:normal;font-weight:400;background:#f6f8fd;padding:4px 12px 14px}.td-annual-detail .m190-summary{grid-template-columns:repeat(3,minmax(0,1fr))!important}.td-annual-detail .td-card *{font-weight:inherit}.td-annual-detail .td-card b,.td-annual-detail .td-card strong,.td-annual-detail .td-card th{font-weight:800}.td-annual-detail .td-card input,.td-annual-detail .td-card select{font-weight:500}.td-card-title{display:flex;justify-content:space-between;gap:10px;margin-bottom:10px}.td-card-title span{color:#69748a;font-size:12px}.m190-summary{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:12px;border:1px solid #e8ebf1;border-radius:12px;overflow:hidden}
.m190-table input{height:30px;padding:3px 6px;border:1px solid #dfe4ee;border-radius:7px;font:inherit;font-size:12.5px}.m190-nif{width:100px}.m190-name{width:100%;min-width:220px}.m190-table small{display:block;color:#69748a;font-size:11px}.m190-table select{height:30px;border:1px solid #dfe4ee;border-radius:7px;font:inherit;font-size:12px;max-width:190px}
[data-td-annual-detail] .td-check{margin:6px 0}`;document.head.append(style)})();
})();
