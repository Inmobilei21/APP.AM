/* Modelo 123 en Borradores: retenciones sobre rendimientos del capital mobiliario (intereses, dividendos).
   Sale de los asientos con abono a la cuenta 4751 de capital mobiliario. Cada renta va a «Resto de rentas»
   salvo que se marque como «Dividendos». Se carga después de borradores.js (desde despacho-cliente.js). */
(function(){
if(typeof TAX_DRAFT_BUILDERS==="undefined"||typeof TAX_DRAFT_MODELS==="undefined")return;
TAX_DRAFT_MODELS["123"]={title:"Rendimientos del capital mobiliario",ready:true};
const rentaId=entry=>`cap|${entry.fecha}|${entry.asiento}`;
TAX_DRAFT_BUILDERS["123"]=period=>{
  const dividendos=new Set(taxDraftControl("123",period).especie||[]);
  const todas=tdCarry("123",period,taxDrafts.base?.capital,rentaId).map(entry=>({...entry,dividendo:dividendos.has(entry.id)}));
  const rentas=todas.filter(entry=>entry.incluir),div=rentas.filter(entry=>entry.dividendo),resto=rentas.filter(entry=>!entry.dividendo);
  const c={"01":div.length,"02":resto.length,"03":rentas.length,"04":tdSum(div,"base"),"05":tdSum(resto,"base"),"06":tdSum(rentas,"base"),"07":tdSum(div,"retencion"),"08":tdSum(resto,"retencion"),"09":tdSum(rentas,"retencion"),"10":0,"11":0};
  const total=tdRound(c["09"]+c["11"]),compl=tdCompl("123",period);
  const box=(n,label,kind,cls)=>({n,label,value:c[n],kind,eye:"capital",cls});
  return{
    title:"Rendimientos del capital mobiliario",
    boxes:[
      {heading:"Dividendos y otras rentas de participación en fondos propios de entidades"},
      box("01","Número de rentas","count"),box("04","Base de retenciones e ingresos a cuenta","money"),box("07","Retenciones e ingresos a cuenta","money"),
      {heading:"Resto de rentas"},
      box("02","Número de rentas","count"),box("05","Base de retenciones e ingresos a cuenta","money"),box("08","Retenciones e ingresos a cuenta","money"),
      {heading:"Totales"},
      box("03","Número de rentas","count"),box("06","Base de retenciones e ingresos a cuenta","money"),box("09","Retenciones e ingresos a cuenta","money"),
      {heading:"Total liquidación"},
      {n:"10",label:"Periodificación (ingresos de ejercicios anteriores)",value:0,kind:"money"},
      {n:"11",label:"Regularización",value:0,kind:"money"},
      {n:"12",label:"Suma de retenciones e ingresos a cuenta y regularización ([09] + [11])",value:total,kind:"money",eye:"capital"},
      {n:"13",label:"A deducir (exclusivamente en caso de autoliquidación complementaria)",value:compl.deducir,kind:"money"},
      {n:"14",label:"Resultado a ingresar ([12] − [13])",value:tdRound(total-compl.deducir),kind:"money",eye:"capital",cls:"total"}
    ],
    complementaria:compl,result:tdRound(total-compl.deducir),summary:{perceptores:rentas.length,base:c["06"],retencion:c["09"]},
    lists:{capital:todas},
    checks:()=>{
      if(!(taxDrafts.base?.capital||[]).length)return['<div class="td-check warn">⚠ <div><b>Sin cuenta de retenciones del capital mobiliario</b>No hay asientos con abono a una cuenta 4751 de intereses o capital mobiliario. Si el cliente no paga intereses ni dividendos, no hay nada que declarar.</div></div>'];
      if(!rentas.length)return['<div class="td-check warn">⚠ <div><b>Sin retenciones en el trimestre</b>No hay asientos de intereses o dividendos con retención en este trimestre.</div></div>'];
      const rates=[...new Set(rentas.map(entry=>Math.round(entry.porcentaje)))].filter(rate=>rate!==19);
      return[rates.length?`<div class="td-check warn">⚠ <div><b>Revisa el tipo de retención</b>Hay rentas con ${rates.map(rate=>`${rate} %`).join(", ")}; lo habitual es el 19 %.</div></div>`:'<div class="td-check ok">✓ <div><b>Tipo de retención correcto</b>Todas las rentas aplican el 19 %.</div></div>',
        `<div class="td-check ok">✓ <div><b>${div.length?`${div.length} marcadas como dividendos`:"Todas como resto de rentas"}</b>Marca «Dividendos» en el detalle (ojo) las que lo sean.</div></div>`];
    }
  };
};
if(typeof TAX_DRAFT_SIDE!=="undefined")TAX_DRAFT_SIDE.capital={title:draft=>`Rentas del trimestre (${draft.lists.capital.length})`,sub:"Asientos con retención del capital mobiliario en AMCOMTA. Marca «Dividendos» en las que lo sean; el resto va a «Resto de rentas»."};
function capitalTable(entries,editable){
  if(!entries.length)return'<p class="td-note td-pad">No hay rentas del capital mobiliario con retención en el trimestre.</p>';
  const inc=entries.filter(entry=>entry.incluir!==false);
  return `<table class="td-list"><thead><tr><th class="center">Incluir</th><th>Fecha</th><th>Concepto</th><th class="num">Base</th><th class="num">Retención</th><th class="num">%</th><th class="center">Dividendos</th></tr></thead><tbody>${entries.map(entry=>`<tr class="${entry.dividendo?"td-especie":""}${entry.incluir===false?" td-off":""}"><td class="center">${taxDraftIncluirCell(entry,editable)}</td><td>${tdDate(entry.fecha)}${tdOrigen(entry)}</td><td>${escapeHtml(entry.concepto||`Asiento ${entry.asiento}`)}<small style="display:block;color:#69748a">${escapeHtml(entry.cuentas.map(cuenta=>`${cuenta.cuenta} ${cuenta.nombre}`).join(" · "))}</small></td><td class="num">${tdEur(entry.base)}</td><td class="num">${tdEur(entry.retencion)}</td><td class="num">${String(entry.porcentaje).replace(".",",")} %</td><td class="center">${editable?`<input type="checkbox" data-td-especie="${escapeHtml(entry.id)}"${entry.dividendo?" checked":""} aria-label="Dividendos">`:entry.dividendo?"Sí":"—"}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td colspan="3">Total incluido</td><td class="num">${tdEur(tdSum(inc,"base"))}</td><td class="num">${tdEur(tdSum(inc,"retencion"))}</td><td colspan="2"></td></tr></tfoot></table>`;
}
if(typeof taxDraftLists==="function"){const previousLists=taxDraftLists;taxDraftLists=function(kind,draft,editable){return kind==="capital"?capitalTable(draft.lists.capital||[],editable):previousLists.apply(this,arguments)}}
// Borrador confirmado con el aspecto del impreso del 123.
if(typeof openConfirmedTaxDraft==="function"){
  const previousOpen=openConfirmedTaxDraft;
  openConfirmedTaxDraft=async function(key){
    await previousOpen.apply(this,arguments);
    let data={};try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
    const view=document.querySelector("#tdDraftView");
    if(data.draft?.model==="123"&&view&&data.draft.lists?.capital){const annex=view.querySelector(".td-form-annex");const html=`<details class="td-form-annex"><summary>Detalle de la contabilidad</summary><h4>Rentas (${data.draft.lists.capital.length})</h4>${capitalTable(data.draft.lists.capital,false)}</details>`;if(annex)annex.outerHTML=html;else view.querySelector(".td-modal-body")?.insertAdjacentHTML("beforeend",html)}
  };
}
if(typeof taxDraftFormHtml==="function"){
  const previousForm=taxDraftFormHtml;
  taxDraftFormHtml=function(draft,client={}){
    if(draft.model!=="123")return previousForm.apply(this,arguments);
    const boxes=new Map((draft.boxes||[]).filter(box=>box.n).map(box=>[box.n,box]));
    const val=n=>{const box=boxes.get(n);if(!box)return"";return box.kind==="count"?(Number(box.value)?String(box.value):""):tdFormMoney(box.value)};
    const cell=n=>`<div class="af-cell"><div class="af-box"><b>${n}</b><span>${escapeHtml(val(n))}</span></div></div>`;
    const row=(label,ns)=>`<div class="af-row"><span class="af-label">${label}</span>${ns.map(cell).join("")}</div>`;
    const result=Number(boxes.get("14")?.value)||0,nif=draft.cif||client.cif||"",name=draft.client||client.name||"",check=on=>`<i class="af-check">${on?"X":""}</i>`;
    return `<div class="aeat-form m123"><div class="af-watermark">BORRADOR</div>
      <div class="af-head"><div class="af-agency"><strong>Agencia Tributaria</strong><small>Documento preparado por Asesoría Molinero</small></div><div class="af-title"><strong>Retenciones e ingresos a cuenta sobre determinados rendimientos del capital mobiliario</strong><span>Impuesto sobre la Renta de las Personas Físicas · Impuesto sobre Sociedades · Impuesto sobre la Renta de no Residentes (establecimientos permanentes)</span><em>Autoliquidación periódica</em></div><div class="af-model"><small>Modelo</small><b>123</b></div></div>
      <section class="af-sec"><div class="af-side">Identificación</div><div class="af-body af-ident"><div><div class="af-grid af-g2"><label><small>NIF</small><span>${escapeHtml(nif)}</span></label><label><small>Apellidos y nombre o razón social</small><span>${escapeHtml(name)}</span></label></div></div><div class="af-devengo"><div class="af-side af-side-sm">Devengo</div><label><small>Ejercicio</small><span>${escapeHtml(draft.year||"")}</span></label><label><small>Período</small><span>${escapeHtml(draft.period||"")}</span></label></div></div></section>
      <section class="af-sec"><div class="af-side">Liquidación</div><div class="af-body">
        <div class="af-row m123-head"><span class="af-label"></span><div class="af-cell"><small>Dividendos y otras rentas de participación en fondos propios de entidades</small></div><div class="af-cell"><small>Resto de rentas</small></div><div class="af-cell"><small>Totales</small></div></div>
        ${row("Número de rentas",["01","02","03"])}${row("Base de retenciones e ingresos a cuenta",["04","05","06"])}${row("Retenciones e ingresos a cuenta",["07","08","09"])}
        <div class="af-row m123-head"><span class="af-label"></span><div class="af-cell"><small>Ingresos ejercicios anteriores</small></div><div class="af-cell"><small>Regularización</small></div></div>
        ${row("Periodificación",["10","11"])}
        <div class="af-total"><h5>Total liquidación</h5>${row("Suma de retenciones e ingresos a cuenta y regularización, en su caso ([09] + [11])",["12"])}${row("A deducir (exclusivamente en caso de autoliquidación complementaria)",["13"])}${row("<strong>Resultado a ingresar ([12] − [13])</strong>",["14"])}</div>
      </div></section>
      <div class="af-split">
        <section class="af-sec"><div class="af-side">Ingreso</div><div class="af-body"><div class="af-row"><span class="af-label">Importe del ingreso (casilla 14)</span><div class="af-cell"><div class="af-box af-ingreso"><b>I</b><span>${escapeHtml(tdFormMoney(result))}</span></div></div></div><p class="af-line">Forma de pago: ${check(result>0&&draft.pago?.forma==="domiciliacion")} Domiciliación ${check(result>0&&draft.pago?.forma==="efectivo")} En efectivo ${check(result>0&&draft.pago?.forma==="adeudo")} Adeudo en cuenta</p>${result>0&&draft.pago?.forma==="domiciliacion"&&draft.pago.iban?`<p class="af-line"><small>Código IBAN</small> <b>${escapeHtml(String(draft.pago.iban).replace(/(.{4})/g,"$1 ").trim())}</b></p>`:""}</div></section>
        <section class="af-sec"><div class="af-side">${result?"Complementaria":"Negativa"}</div><div class="af-body">${result?`<p class="af-line">${check(false)} Autoliquidación complementaria</p><p class="af-line"><small>N.º de justificante</small> ____________________</p>`:`<p class="af-line">${check(true)} Autoliquidación negativa</p>`}</div></section>
      </div>
      <p class="af-foot">Borrador preparado con los datos de la contabilidad${draft.confirmedBy?` · confirmado por ${escapeHtml(draft.confirmedBy)}`:""}. No válido para su presentación.</p></div>`;
  };
}
(function(){const style=document.createElement("style");style.textContent=".aeat-form .m123-head{margin-bottom:0}.aeat-form .m123-head .af-cell small{min-height:22px;display:flex;align-items:flex-end;justify-content:center;line-height:1.15}";document.head.append(style)})();
if(document.querySelector("#tdModels")&&taxDrafts.client){renderTaxDraftModels();renderTaxDraftMain()}
})();
