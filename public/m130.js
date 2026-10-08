/* Modelo 130 en Borradores: pago fraccionado del IRPF (estimación directa). Datos acumulados desde el 1 de
   enero hasta el final del trimestre con los saldos de las cuentas de ingresos (grupo 7) y gastos (grupo 6) de
   AMCOMTA y las retenciones de las facturas emitidas. Los apartados I, II y III se despliegan y se marcan si
   aplican. Lo que se escribe a mano (variación de gastos, % de difícil justificación, casillas 08, 10, 13 y 16,
   forma de pago) se guarda en Control (130 · trimestre). Se carga después de borradores.js. */
(function(){
if(typeof TAX_DRAFT_BUILDERS==="undefined"||typeof TAX_DRAFT_MODELS==="undefined")return;
const M="130-131";
TAX_DRAFT_MODELS[M]={title:"Pago fraccionado IRPF · estimación directa",ready:true};
if(typeof TD_COMPL_BOX!=="undefined")TD_COMPL_BOX[M]="18";
const LIMITE_DIFICIL=2000,LIMITE_VIVIENDA=660.14;
const num=v=>{if(typeof v==="number")return Number.isFinite(v)?v:0;const s=String(v??"").trim();if(!s)return 0;const n=Number(s.includes(",")||/^-?\d{1,3}(\.\d{3})+$/.test(s)?s.replace(/\./g,"").replace(",","."):s);return Number.isFinite(n)?n:0};
const inputValue=v=>{if(v===undefined||v===null||v==="")return"";const n=Number(v)||0,[i,d]=Math.abs(n).toFixed(2).split(".");return(n<0?"-":"")+i.replace(/\B(?=(\d{3})+(?!\d))/g,".")+","+d};
const st=period=>taxDraftControl(M,period).m130||{};
// Ajustes que se arrastran: si no se han tocado en este trimestre, valen los del trimestre anterior.
function setting(period,field,def){for(let q=Number(period[0]);q>=1;q--){const v=st(`${q}T`)[field];if(v!==undefined&&v!=="")return v}return def}
function save(period,field,value){
  const year=taxDraftYear(),key=declarationKey(M,period,taxDrafts.client,year),data=declarationData(M,period,taxDrafts.client,year);
  data.m130={...(data.m130||{}),[field]:value};localStorage.setItem(key,JSON.stringify(data));
}
const fisica=()=>(taxDrafts.clientData?.personType||"fisica")!=="juridica";
function cuentas(tipo,q){
  return (taxDrafts.base?.resultados||[]).filter(account=>account.tipo===tipo).map(account=>{
    const tri=[0,1,2,3].map(i=>tdRound(account.meses.slice(i*3,i*3+3).reduce((s,v)=>s+v,0)));
    return{cuenta:account.cuenta,nombre:account.nombre,tri,acum:tdRound(tri.slice(0,q).reduce((s,v)=>s+v,0))};
  }).filter(account=>account.tri.slice(0,q).some(v=>Math.abs(v)>0.004));
}
// Facturas guardadas al confirmar «Procesar facturas» (libros de emitidas y recibidas del cliente).
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
const inYearTo=(fecha,q)=>{const m=Number(String(fecha).slice(5,7));return String(fecha).slice(0,4)===String(taxDraftYear())&&m>=1&&m<=q*3};
function calc(period){
  const q=Number(period[0]),m=st(period);
  const secI=setting(period,"secI",true)!==false,secII=setting(period,"secII",false)===true;
  const modalidad=setting(period,"modalidad","simplificada"),pct=num(setting(period,"pct",7)),variacion=tdRound(num(setting(period,"variacion",0)));
  // Origen de los datos: contabilidad de AMCOMTA; si no hay, las facturas guardadas; si tampoco, a mano.
  const book=sinBase()?libro():null,emit=(book?.emitidas||[]).filter(item=>inYearTo(item.fecha,q)),recib=(book?.recibidas||[]).filter(item=>inYearTo(item.fecha,q));
  const fuente=!sinBase()?"contabilidad":emit.length||recib.length?"facturas":"manual";
  const porTrimestre=(list,nombre)=>list.length?[{cuenta:nombre,nombre:`${list.length} facturas`,tri:[1,2,3,4].map(i=>tdRound(list.filter(item=>Math.ceil(Number(item.fecha.slice(5,7))/3)===i).reduce((s,item)=>s+item.base,0))),acum:tdRound(list.reduce((s,item)=>s+item.base,0))}]:[];
  const ing=fuente==="contabilidad"?cuentas("ingreso",q):porTrimestre(emit,"Facturas emitidas"),gas=fuente==="contabilidad"?cuentas("gasto",q):porTrimestre(recib,"Facturas recibidas");
  const ret=fuente==="contabilidad"?(taxDrafts.base?.retencionesSoportadas||[]).filter(item=>inYearTo(item.fecha,q)):emit.filter(item=>item.retencion).map(item=>({...item,porcentaje:item.retencionPct}));
  const prev=[];for(let i=1;i<q;i++)prev.push(calc(`${i}T`));
  // Lo que sale de la documentación (contabilidad); si se escribe un importe a mano, manda el manual.
  const manual=f=>m[f]!==undefined&&m[f]!==""&&m[f]!==null;
  const auto={ingresos:tdRound(ing.reduce((s,a)=>s+a.acum,0)),gastos:tdRound(gas.reduce((s,a)=>s+a.acum,0)),ret:tdSum(ret,"retencion")};
  const ingresos=manual("o01")?tdRound(num(m.o01)):auto.ingresos,gastosContables=manual("oGastos")?tdRound(num(m.oGastos)):auto.gastos;
  const totalGastos=tdRound(gastosContables+variacion),previo=tdRound(ingresos-totalGastos);
  const dificil=modalidad==="simplificada"?tdRound(Math.min(Math.max(0,previo)*pct/100,LIMITE_DIFICIL)):0;
  const c={};
  c["01"]=secI?ingresos:0;c["02"]=secI?tdRound(totalGastos+dificil):0;c["03"]=tdRound(c["01"]-c["02"]);c["04"]=c["03"]>0?tdRound(c["03"]*0.2):0;
  c["05"]=secI?Math.max(0,tdRound(prev.reduce((s,p)=>s+Math.max(0,p.c["07"]),0)-prev.reduce((s,p)=>s+p.c["16"],0))):0;
  c["06"]=secI?(manual("o06")?tdRound(num(m.o06)):auto.ret):0;c["07"]=tdRound(c["04"]-c["05"]-c["06"]);
  c["08"]=secII?tdRound(num(m.c08)):0;c["09"]=tdRound(c["08"]*0.02);c["10"]=secII?tdRound(num(m.c10)):0;c["11"]=tdRound(c["09"]-c["10"]);
  c["12"]=Math.max(0,tdRound((secI?c["07"]:0)+(secII?c["11"]:0)));c["13"]=tdRound(num(m.c13));c["14"]=tdRound(c["12"]-c["13"]);
  // Resultados negativos de trimestres anteriores aún sin compensar (con el máximo de la diferencia).
  const pendiente=Math.max(0,tdRound(prev.reduce((s,p)=>s+Math.max(0,-p.c["19"]),0)-prev.reduce((s,p)=>s+p.c["15"],0)));
  c["15"]=c["14"]>0?tdRound(Math.min(pendiente,c["14"])):0;
  const topeVivienda=tdRound(Math.min(Math.max(0,c["03"])*0.02,LIMITE_VIVIENDA));
  c["16"]=c["14"]>0?tdRound(Math.min(num(m.c16),topeVivienda,Math.max(0,c["14"]-c["15"]))):0;
  c["17"]=tdRound(c["14"]-c["15"]-c["16"]);
  const compl=tdCompl(M,period);c["18"]=compl.deducir;c["19"]=tdRound(c["17"]-c["18"]);
  return{c,q,auto,manual,fuente,emit,recib,secI,secII,modalidad,pct,variacion,ing,gas,ret,prev,ingresos,gastosContables,totalGastos,previo,dificil,pendiente,topeVivienda,compl,m,
    pago:{forma:m.formaPago||(fisica()?"domiciliacion":"domiciliacion"),iban:m.iban??((taxDrafts.clientData?.bank?.ibans||[]).find(Boolean)||""),nrc:m.nrc||"",aDeducir:m.aDeducir===true}};
}
const LABELS={
  "01":"Ingresos computables correspondientes al conjunto de las actividades ejercidas",
  "02":"Gastos fiscalmente deducibles correspondientes al conjunto de las actividades ejercidas",
  "03":"Rendimiento neto ([01] − [02])",
  "04":"20 por 100 del importe de la casilla [03], si es positivo",
  "05":"A deducir · de los trimestres anteriores: importes positivos de la casilla [07] menos los de la casilla [16]",
  "06":"A deducir · retenciones e ingresos a cuenta soportados (del 1 de enero al último día del trimestre)",
  "07":"Pago fraccionado previo del trimestre ([04] − [05] − [06])",
  "08":"Volumen de ingresos del trimestre (excluidas subvenciones de capital e indemnizaciones)",
  "09":"2 por 100 del importe de la casilla [08]",
  "10":"A deducir · retenciones e ingresos a cuenta soportados en el trimestre",
  "11":"Pago fraccionado previo del trimestre ([09] − [10])",
  "12":"Suma de pagos fraccionados previos del trimestre ([07] + [11]); si es negativa, cero",
  "13":"A deducir · minoración por aplicación de la deducción del art. 110.3 c) del Reglamento",
  "14":"Diferencia ([12] − [13])",
  "15":"A deducir · resultados negativos de trimestres anteriores",
  "16":"A deducir · por destinar cantidades a la adquisición o rehabilitación de la vivienda habitual",
  "17":"Total ([14] − [15] − [16])",
  "18":"A deducir (exclusivamente en caso de autoliquidación complementaria)",
  "19":"Resultado de la autoliquidación ([17] − [18])"
};
const EYES={"01":"ing130","02":"gas130","03":"gas130","05":"prev130","06":"ret130","15":"prev130"};
const INPUTS={"01":"o01","06":"o06","08":"c08","10":"c10","13":"c13","16":"c16"};
const AUTO={"01":"ingresos","06":"ret"};
const sinBase=()=>!taxDrafts.base||taxDrafts.base.manual||!Array.isArray(taxDrafts.base.resultados);
TAX_DRAFT_BUILDERS[M]=period=>{
  const r=calc(period),c=r.c;
  const box=n=>({n,label:LABELS[n],value:c[n],kind:"money",eye:EYES[n],cls:n==="19"?"total":""});
  return{
    title:"Pago fraccionado IRPF · estimación directa",
    boxes:[{heading:"I. Actividades económicas en estimación directa, distintas de las agrícolas, ganaderas, forestales y pesqueras"},...["01","02","03","04","05","06","07"].map(box),
      {heading:"II. Actividades agrícolas, ganaderas, forestales y pesqueras"},...["08","09","10","11"].map(box),
      {heading:"III. Total liquidación"},...["12","13","14","15","16","17","18","19"].map(box)],
    complementaria:r.compl,result:c["19"],calc:r,
    summary:{perceptores:tdEur(c["01"]),base:c["03"],retencion:c["19"]},
    lists:{ret130:r.ret,ing130:r.ing,gas130:r.gas},
    checks:()=>{
      const out=[];
      if(r.fuente==="facturas")out.push(`<div class="td-check ok">✓ <div><b>Datos de las facturas guardadas</b>${r.emit.length} emitidas y ${r.recib.length} recibidas del 1 de enero al ${["31 de marzo","30 de junio","30 de septiembre","31 de diciembre"][r.q-1]} (se guardan al confirmar «Procesar facturas»). Puedes corregir cualquier importe a mano.</div></div>`);
      else if(r.fuente==="manual")out.push('<div class="td-check warn">⚠ <div><b>Sin contabilidad de AMCOMTA</b>Escribe a mano los ingresos (01), los gastos (ojo de la 02) y las retenciones (06). Si añades la base en la ficha del cliente, se rellenan solos.</div></div>');
      else if(r.manual("o01")||r.manual("oGastos")||r.manual("o06"))out.push(`<div class="td-check warn">⚠ <div><b>Hay importes escritos a mano</b>${[r.manual("o01")?`ingresos ${tdEur(r.c["01"])} (documentación ${tdEur(r.auto.ingresos)})`:"",r.manual("oGastos")?`gastos ${tdEur(r.gastosContables)} (documentación ${tdEur(r.auto.gastos)})`:"",r.manual("o06")?`retenciones ${tdEur(r.c["06"])} (documentación ${tdEur(r.auto.ret)})`:""].filter(Boolean).join(" · ")}.</div></div>`);
      if(r.secI&&!r.ing.length&&!sinBase()&&!r.manual("o01"))out.push('<div class="td-check warn">⚠ <div><b>Sin ingresos en el período</b>No hay saldos en las cuentas del grupo 7 hasta el final del trimestre.</div></div>');
      if(r.secI&&r.ing.length&&!sinBase())out.push(`<div class="td-check ok">✓ <div><b>Datos acumulados del 1 de enero al ${["31 de marzo","30 de junio","30 de septiembre","31 de diciembre"][r.q-1]}</b>${r.ing.length} cuentas de ingresos y ${r.gas.length} de gastos (incluidas amortizaciones).${r.modalidad==="simplificada"?` Gastos de difícil justificación: ${String(r.pct).replace(".",",")} % del rendimiento neto previo (máx. ${tdEur(LIMITE_DIFICIL)}).`:" Estimación directa normal: sin gastos de difícil justificación."}</div></div>`);
      const pagos473=(taxDrafts.base?.pagosACuenta||[]).filter(item=>inYearTo(item.fecha,r.q)&&item.importe>0&&!/130|202|PAGO FRACC|MOD\.?\s?1[23]0/i.test(item.concepto));
      const total473=tdSum(pagos473,"importe");
      if(r.secI&&Math.abs(total473-r.c["06"])>=0.01&&total473)out.push(`<div class="td-check warn">⚠ <div><b>Revisa las retenciones soportadas</b>Facturas emitidas con retención: ${tdEur(r.c["06"])} · cargos en la 473 del período: ${tdEur(total473)}. Míralo con el ojo de la casilla 06.</div></div>`);
      if(c["19"]<0)out.push(`<div class="td-check ok">✓ <div><b>Resultado negativo</b>Se descontará en los siguientes trimestres del ejercicio (casilla 15)${r.pago.aDeducir?"":"; marca «A deducir» si quieres dejarlo indicado en la autoliquidación"}.</div></div>`);
      if(c["19"]>0&&r.pago.forma==="adeudo"&&!r.pago.nrc)out.push('<div class="td-check warn">⚠ <div><b>Falta el NRC</b>Para pagar con adeudo en cuenta hace falta el NRC que da el banco.</div></div>');
      if(c["19"]>0&&r.pago.forma==="domiciliacion"&&!r.pago.iban)out.push('<div class="td-check warn">⚠ <div><b>Falta el IBAN</b>Indica la cuenta en la que se domicilia el pago.</div></div>');
      if(r.pendiente>c["15"]+0.004)out.push(`<div class="td-check ok">✓ <div><b>Quedan ${tdEur(tdRound(r.pendiente-c["15"]))} de resultados negativos por compensar</b>Se descontarán en los siguientes trimestres.</div></div>`);
      return out;
    }
  };
};

/* --- Casillas en pantalla: apartados I, II y III desplegables --- */
const eyeBtn=(n,value)=>{const kind=EYES[n];if(!kind)return'<span class="td-eye off" aria-hidden="true"></span>';
  return value||kind==="gas130"||kind==="ing130"||kind==="prev130"&&Number(taxDrafts.open?.[0])>1?`<button type="button" class="td-eye" data-td-eye="${kind}" title="Ver cómo se calcula la casilla ${n}" aria-label="Ver el detalle de la casilla ${n}">${tdEye}</button>`:`<span class="td-eye off" title="Sin datos en la casilla ${n}">${tdEyeOff}</span>`};
function line(r,n,editable){
  const v=r.c[n],field=INPUTS[n];
  const autoKey=AUTO[n],isManual=autoKey&&r.manual(field);
  const value=field&&editable?`<input class="m130-in${autoKey?" auto":""}${isManual?" manual":""}" data-m130="${field}" inputmode="decimal" value="${escapeHtml(inputValue(r.m[field]))}" placeholder="${autoKey?escapeHtml(tdEur(r.auto[autoKey])):"0,00"}">`:`<span class="tdg-v">${tdEur(v)}</span>`;
  const hint=autoKey&&editable?`<small class="m130-hint">${r.fuente==="manual"?"Sin documentación: escríbelo a mano":isManual?`Importe manual · según la documentación: ${tdEur(r.auto[autoKey])} (bórralo para volver a usarla)`:r.fuente==="facturas"?"Sale de las facturas guardadas · puedes escribir otro importe":"Sale de la documentación · puedes escribir otro importe"}</small>`:n==="02"&&editable?`<small class="m130-hint">Gastos y % de difícil justificación: pulsa el ojo${r.manual("oGastos")?" · gastos escritos a mano":""}</small>`:n==="16"&&editable?`<small class="m130-hint">Máx. 2 % de [03] (${tdEur(r.topeVivienda)} este trimestre)</small>`:n==="09"?`<small class="m130-hint">2 % de [08]</small>`:"";
  return `<div class="tdg-total m130-line${["07","11","19"].includes(n)?" result":""}${["17","12"].includes(n)?" strong":""}"><span class="tdg-label">${escapeHtml(LABELS[n])}${hint}</span><div class="tdg-cell${v||field?"":" zero"}"><span class="tdg-n">${n}</span><span class="tdg-cap"></span>${value}${editable?eyeBtn(n,v):""}</div></div>`;
}
function grid(r,editable=true){
  const open=taxDrafts.m130Open||(taxDrafts.m130Open={I:true,II:r.secII,III:true});
  const sec=(id,title,on,field,body,res)=>`<details class="m130-sec${on?"":" off"}" data-m130-sec="${id}"${open[id]?" open":""}><summary><span class="td-caret">›</span>${field?`<label class="m130-tog" title="Aplicar este apartado"><input type="checkbox" data-m130="${field}"${on?" checked":""}${editable?"":" disabled"}><span>${on?"Aplica":"No aplica"}</span></label>`:""}<b>${title}</b><span class="m130-res">${res}</span></summary><div class="m130-body">${body}</div></details>`;
  return `<div class="tdg m130">
    ${sec("I","I. Actividades económicas en estimación directa (normal o simplificada), distintas de las agrícolas, ganaderas, forestales y pesqueras",r.secI,"secI",r.secI?["01","02","03","04","05","06","07"].map(n=>line(r,n,editable)).join(""):'<p class="td-note">Apartado sin marcar.</p>',r.secI?`[07] ${tdEur(r.c["07"])}`:"")}
    ${sec("II","II. Actividades agrícolas, ganaderas, forestales y pesqueras en estimación directa",r.secII,"secII",r.secII?["08","09","10","11"].map(n=>line(r,n,editable)).join(""):'<p class="td-note">Apartado sin marcar. Márcalo si el cliente tiene actividad agrícola, ganadera, forestal o pesquera.</p>',r.secII?`[11] ${tdEur(r.c["11"])}`:"")}
    ${sec("III","III. Total liquidación",true,"",["12","13","14","15","16","17","18","19"].map(n=>line(r,n,editable)).join(""),`[19] ${tdEur(r.c["19"])}`)}
  </div>`;
}
function pagoBlock(r){
  const res=r.c["19"],p=r.pago,ibans=(taxDrafts.clientData?.bank?.ibans||[]).filter(Boolean);
  if(res>0){
    const opt=(v,l)=>`<label class="m130-radio"><input type="radio" name="m130pago" data-m130="formaPago" value="${v}"${p.forma===v?" checked":""}><span>${l}</span></label>`;
    return `<div class="m130-pago"><h6>Ingreso · ${tdEur(res)}</h6><div class="m130-radios">${opt("domiciliacion","Domiciliación")}${opt("adeudo","Adeudo en cuenta (NRC)")}${fisica()?opt("efectivo","Efectivo"):""}</div>
      ${p.forma==="domiciliacion"?`<label class="td-cf"><small>Código IBAN</small><input data-m130="iban" list="m130ibans" value="${escapeHtml(p.iban)}" maxlength="34" placeholder="ES00 0000 0000 0000 0000 0000"><datalist id="m130ibans">${ibans.map(i=>`<option value="${escapeHtml(i)}">`).join("")}</datalist></label>`:""}
      ${p.forma==="adeudo"?`<label class="td-cf"><small>NRC (número de referencia completo que da el banco)</small><input data-m130="nrc" value="${escapeHtml(p.nrc)}" maxlength="22" placeholder="22 caracteres"></label>`:""}
      ${p.forma==="efectivo"?'<p class="m130-hint">Pago en efectivo en la entidad colaboradora con la carta de pago (solo personas físicas).</p>':""}</div>`;
  }
  return `<div class="m130-pago"><h6>${res<0?"Resultado negativo":"Resultado cero"}</h6>${res<0?`<label class="m130-radio"><input type="checkbox" data-m130="aDeducir"${p.aDeducir?" checked":""}><span>Autoliquidación con resultado a deducir en los siguientes pagos fraccionados del mismo ejercicio</span></label>`:""}<p class="m130-hint">${res<0&&p.aDeducir?"Se presenta «a deducir».":"Se presenta como autoliquidación negativa."}</p></div>`;
}
if(typeof taxDraftBoxes==="function"){const previous=taxDraftBoxes;taxDraftBoxes=function(boxes,withEyes=true,model=""){
  if(model===M&&taxDrafts.open&&taxDrafts.model===M)return grid(calc(taxDrafts.open),withEyes);return previous.apply(this,arguments)}}
if(typeof taxDraftDetail==="function"){const previous=taxDraftDetail;taxDraftDetail=function(draft){const html=previous.apply(this,arguments);
  return draft.model===M?html.replace(`Borrador modelo ${M}`,"Borrador modelo 130").replace('<div class="td-checks">',`${pagoBlock(draft.calc||calc(draft.period))}<div class="td-checks">`):html}}

/* --- Ojo de cada concepto --- */
if(typeof TAX_DRAFT_SIDE!=="undefined")Object.assign(TAX_DRAFT_SIDE,{
  ing130:{title:()=>"Ingresos computables · casilla 01",sub:"Saldo de las cuentas de ingresos (grupo 7) de cada trimestre; la casilla es el acumulado desde el 1 de enero."},
  gas130:{title:()=>"Gastos fiscalmente deducibles · casilla 02",sub:"Cálculo con los saldos de las cuentas de gastos (grupo 6, con amortizaciones) acumulados desde el 1 de enero."},
  ret130:{title:draft=>`Retenciones soportadas · casilla 06 (${draft.lists.ret130.length})`,sub:"Facturas emitidas con retención de IRPF desde el 1 de enero hasta el final del trimestre."},
  prev130:{title:()=>"Trimestres anteriores · casillas 05 y 15",sub:"Pagos fraccionados positivos ya declarados y resultados negativos pendientes de compensar."}
});
function accountsTable(list,q,total){
  if(!list.length)return'<p class="td-note td-pad">Sin saldos en el período.</p>';
  const qs=[1,2,3,4].slice(0,q);
  return `<table class="td-list m130-acc"><thead><tr><th>Cuenta</th>${qs.map(i=>`<th class="num">${i}T</th>`).join("")}<th class="num">Acumulado</th></tr></thead><tbody>${list.map(a=>`<tr><td>${escapeHtml(a.cuenta)}<small>${escapeHtml(a.nombre)}</small></td>${qs.map(i=>`<td class="num">${tdEur(a.tri[i-1])}</td>`).join("")}<td class="num"><b>${tdEur(a.acum)}</b></td></tr>`).join("")}</tbody>
    <tfoot><tr><td>Total</td>${qs.map(i=>`<td class="num">${tdEur(tdRound(list.reduce((s,a)=>s+a.tri[i-1],0)))}</td>`).join("")}<td class="num">${tdEur(total)}</td></tr></tfoot></table>`;
}
const FIN=["31 de marzo","30 de junio","30 de septiembre","31 de diciembre"];
function sideHtml(kind,draft){
  const r=draft.calc||calc(draft.period),q=r.q;
  const facturas=(list,titulo)=>list.length?`<h4 class="td-list-title">${titulo} (${list.length})</h4><table class="td-list"><thead><tr><th>Fecha</th><th>Factura</th><th>${titulo.includes("emitidas")?"Cliente":"Proveedor"}</th><th class="num">Base</th><th class="num">IVA</th><th class="num">Retención</th><th class="num">Total</th></tr></thead><tbody>${list.map(item=>`<tr><td>${tdDate(item.fecha)}</td><td>${escapeHtml(item.numero)}</td><td>${escapeHtml(item.nombre)}<small>${escapeHtml(item.nif)}</small></td><td class="num">${tdEur(item.base)}</td><td class="num">${tdEur(item.cuota)}</td><td class="num">${item.retencion?tdEur(item.retencion):""}</td><td class="num">${tdEur(item.total)}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="3">Total</td><td class="num">${tdEur(tdSum(list,"base"))}</td><td class="num">${tdEur(tdSum(list,"cuota"))}</td><td class="num">${tdEur(tdSum(list,"retencion"))}</td><td class="num">${tdEur(tdSum(list,"total"))}</td></tr></tfoot></table>`:"";
  if(kind==="ing130")return accountsTable(r.ing,q,r.auto.ingresos)+(r.fuente==="facturas"?facturas(r.emit,"Facturas emitidas"):"");
  if(kind==="gas130"){
    const row=(label,value,cls="",input="")=>`<div class="m130-calc-row ${cls}"><span>${label}</span>${input||`<b>${tdEur(value)}</b>`}</div>`;
    return `<div class="m130-calc">
      <label class="m130-mod"><span>Modalidad</span><select data-m130="modalidad"><option value="simplificada"${r.modalidad==="simplificada"?" selected":""}>Estimación directa simplificada</option><option value="normal"${r.modalidad==="normal"?" selected":""}>Estimación directa normal</option></select></label>
      ${row(`Gastos (incluyendo amortizaciones) a ${FIN[q-1]}${r.fuente==="manual"?"":` <small>· documentación: ${tdEur(r.auto.gastos)}</small>`}`,r.gastosContables,"edit",`<input data-m130="oGastos" inputmode="decimal" value="${escapeHtml(inputValue(r.m.oGastos))}" placeholder="${escapeHtml(tdEur(r.auto.gastos))}">`)}
      ${row("Variación en los gastos a declarar (+/−)",r.variacion,"edit",`<input data-m130="variacion" inputmode="decimal" value="${escapeHtml(inputValue(r.variacion))}" placeholder="0,00">`)}
      ${row("Total gastos a declarar del período",r.totalGastos,"sub")}
      ${row(`Ingresos computables a ${FIN[q-1]} (casilla 01)${r.manual("o01")?" · a mano":""}`,r.ingresos)}
      ${row("Rendimiento neto previo",r.previo,"strong")}
      ${r.modalidad==="simplificada"?row(`Gastos de difícil justificación (<input class="m130-pct" data-m130="pct" inputmode="decimal" value="${escapeHtml(String(r.pct).replace(".",","))}"> % s/ rendimiento neto previo · lím. ${tdEur(LIMITE_DIFICIL)})`,r.dificil,"edit"):row("Gastos de difícil justificación (no se aplican en la modalidad normal)",0,"dim")}
      ${row("Gastos fiscalmente deducibles (casilla 02)",r.c["02"],"strong green")}
      ${row("Diferencia = rendimiento neto (casilla 03)",r.c["03"],"strong green")}
      ${row("20 % del rendimiento neto (casilla 04)",r.c["04"],"strong blue")}
    </div><h4 class="td-list-title">${r.fuente==="contabilidad"?"Cuentas de gastos":"Gastos por trimestre"}</h4>${accountsTable(r.gas,q,r.auto.gastos)}${r.fuente==="facturas"?facturas(r.recib,"Facturas recibidas"):""}`;
  }
  if(kind==="ret130"){
    const pagos=(taxDrafts.base?.pagosACuenta||[]).filter(item=>inYearTo(item.fecha,q));
    return `${r.ret.length?`<table class="td-list"><thead><tr><th>Fecha</th><th>Factura</th><th>Cliente</th><th class="num">Base</th><th class="num">%</th><th class="num">Retención</th></tr></thead><tbody>${r.ret.map(item=>`<tr><td>${tdDate(item.fecha)}</td><td>${escapeHtml(item.numero)}</td><td>${escapeHtml(item.nombre)}<small>${escapeHtml(item.nif)}</small></td><td class="num">${tdEur(item.base)}</td><td class="num">${String(item.porcentaje).replace(".",",")}</td><td class="num">${tdEur(item.retencion)}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="5">Total</td><td class="num">${tdEur(tdSum(r.ret,"retencion"))}</td></tr></tfoot></table>`:'<p class="td-note td-pad">No hay facturas emitidas con retención en el período.</p>'}
      ${pagos.length?`<h4 class="td-list-title">Movimientos de la cuenta 473 (para comprobar)</h4><table class="td-list"><thead><tr><th>Fecha</th><th>Concepto</th><th class="num">Importe</th></tr></thead><tbody>${pagos.map(item=>`<tr><td>${tdDate(item.fecha)}</td><td>${escapeHtml(item.concepto)}<small>${escapeHtml(item.cuenta)}</small></td><td class="num">${tdEur(item.importe)}</td></tr>`).join("")}</tbody></table>`:""}`;
  }
  if(kind==="prev130"){
    if(!r.prev.length)return'<p class="td-note td-pad">Es el primer trimestre del ejercicio.</p>';
    return `<table class="td-list"><thead><tr><th>Trimestre</th><th class="num">[07]</th><th class="num">[15]</th><th class="num">[16]</th><th class="num">[19]</th></tr></thead><tbody>${r.prev.map((p,i)=>`<tr><td>${i+1}T</td><td class="num">${tdEur(p.c["07"])}</td><td class="num">${tdEur(p.c["15"])}</td><td class="num">${tdEur(p.c["16"])}</td><td class="num">${tdEur(p.c["19"])}</td></tr>`).join("")}</tbody></table>
      <div class="m130-calc">${`<div class="m130-calc-row"><span>Casilla 05 · positivos de [07] − [16]</span><b>${tdEur(r.c["05"])}</b></div><div class="m130-calc-row"><span>Resultados negativos pendientes</span><b>${tdEur(r.pendiente)}</b></div><div class="m130-calc-row strong"><span>Casilla 15 · se compensan este trimestre</span><b>${tdEur(r.c["15"])}</b></div>`}</div>`;
  }
  return "";
}
if(typeof taxDraftLists==="function"){const previous=taxDraftLists;taxDraftLists=function(kind,draft){return /130$/.test(kind)?sideHtml(kind,draft):previous.apply(this,arguments)}}
function fieldValue(input){
  if(input.type==="checkbox")return input.checked;
  if(input.type==="radio")return input.value;
  const f=input.dataset.m130;
  if(["iban","nrc"].includes(f))return input.value.replace(/\s+/g,"").toUpperCase();
  if(f==="modalidad")return input.value;
  return input.value.trim()===""?"":num(input.value);
}
function bindInputs(root,period,after){
  root.querySelectorAll("[data-m130]").forEach(input=>input.addEventListener("change",()=>{
    const f=input.dataset.m130;save(period,f,fieldValue(input));
    if(f==="secII"&&input.checked)(taxDrafts.m130Open||={}).II=true;
    after();
  }));
  root.querySelectorAll("[data-m130]").forEach(input=>input.addEventListener("click",event=>event.stopPropagation()));
}
if(typeof openTaxDraftSide==="function"){const previous=openTaxDraftSide;openTaxDraftSide=function(kind,draft){
  const r=previous.apply(this,arguments);
  if(/130$/.test(kind)){const body=document.querySelector("#tdSideBody");bindInputs(body,draft.period,()=>{renderTaxDraftMain();openTaxDraftSide(kind,taxDraftBuild(M,draft.period))})}
  return r}}
const previousMain=renderTaxDraftMain;
renderTaxDraftMain=function(){
  // Sin base de contabilidad el 130 se puede hacer igualmente escribiendo los importes a mano.
  const original=taxDrafts.base,vacia=taxDrafts.model===M&&taxDrafts.client&&!taxDrafts.loading&&(!original||!Array.isArray(original.retencionesIrpf));
  if(vacia)taxDrafts.base={manual:true,resultados:[],retencionesIrpf:[],retencionesSoportadas:[],pagosACuenta:[]};
  let r;try{r=previousMain.apply(this,arguments)}finally{if(vacia)taxDrafts.base=original}
  const box=document.querySelector("#tdMain");
  if(box&&taxDrafts.model===M&&box.querySelector(".td-table")){
    const th=box.querySelectorAll(".td-table thead th");if(th.length>=4){th[1].textContent="Ingresos acum.";th[2].textContent="Rend. neto acum.";th[3].textContent="Resultado"}
    const foot=box.querySelector(".td-table tfoot tr td:nth-child(3)");if(foot)foot.textContent=tdEur(calc("4T").c["03"]);
    if(taxDrafts.open&&/^\dT$/.test(taxDrafts.open)){
      const period=taxDrafts.open,detail=box.querySelector(".td-detail .td-card");
      if(detail){bindInputs(detail,period,()=>renderTaxDraftMain());
        detail.querySelectorAll("[data-m130-sec]").forEach(d=>d.addEventListener("toggle",()=>{(taxDrafts.m130Open||={})[d.dataset.m130Sec]=d.open}));}
    }
  }
  return r;
};
// Al confirmar se guardan también la forma de pago y los datos del cálculo.
if(typeof confirmTaxDraft==="function"){const previous=confirmTaxDraft;confirmTaxDraft=function(){
  const period=taxDrafts.open,model=taxDrafts.model,r=previous.apply(this,arguments);
  if(model===M&&period){const year=taxDraftYear(),key=declarationKey(M,period,taxDrafts.client,year),data=declarationData(M,period,taxDrafts.client,year);
    if(data.draft){const k=calc(period);data.draft.pago=k.pago;data.draft.personType=taxDrafts.clientData?.personType||"";data.draft.calculo={modalidad:k.modalidad,pct:k.pct,variacion:k.variacion,gastosContables:k.gastosContables,previo:k.previo,dificil:k.dificil,secI:k.secI,secII:k.secII};delete data.draft.lists.ing130;delete data.draft.lists.gas130;localStorage.setItem(key,JSON.stringify(data))}}
  return r}}

/* --- Fichero para importar en la sede de la AEAT (diseño de registro DR130, página de 600 posiciones) --- */
const fpad=(value,width)=>String(value??"").slice(0,width).padEnd(width," ");
const fclean=value=>[...String(value||"").toUpperCase()].map(c=>c==="Ñ"||c==="Ç"?c:c.normalize("NFD").replace(/[̀-ͯ]/g,"")).join("").replace(/[^A-Z0-9ÑÇ ]/g," ").replace(/\s+/g," ").trim();
// Numéricos con signo: 15 enteros + 2 decimales, ceros a la izquierda y «N» en la primera posición si es negativo.
const fnum=value=>{const cents=Math.round((Number(value)||0)*100),digits=String(Math.abs(cents)).padStart(17,"0").slice(-17);return cents<0?"N"+digits.slice(1):digits};
function aeat130(draft){
  const boxes=new Map((draft.boxes||[]).filter(box=>box.n).map(box=>[box.n,Number(box.value)||0]));
  const nif=String(draft.cif||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(nif.length!==9)throw new Error("Falta el NIF del cliente (ficha del cliente).");
  const year=String(draft.year||""),period=String(draft.period||"");
  if(!/^\d{4}$/.test(year)||!/^[1-4]T$/.test(period))throw new Error("Ejercicio o período no válido.");
  // Persona física: «Apellidos, Nombre» → apellidos (60) y nombre (20).
  const [apellidos,nombre=""]=String(draft.client||"").split(",").map(part=>part.trim());
  const result=boxes.get("19")||0,pago=draft.pago||{},iban=String(pago.iban||"").replace(/\s+/g,"").toUpperCase();
  if(result>0&&pago.forma==="domiciliacion"&&!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(iban))throw new Error("Falta el IBAN para domiciliar el pago.");
  // Tipo: U domiciliación, I ingreso (adeudo en cuenta o efectivo), B a deducir, N negativa.
  const type=result>0?(pago.forma==="domiciliacion"?"U":"I"):result<0&&pago.aDeducir?"B":"N";
  const compl=draft.complementaria||{};
  let page=" "+type+fpad(nif,9)+fpad(fclean(apellidos),60)+fpad(fclean(nombre),20)+year+period
    +["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19"].map(n=>fnum(boxes.get(n))).join("")
    +(compl.activa?"X"+fpad(String(compl.justificante||"").replace(/\D/g,""),13):fpad("",14))
    +fpad(type==="U"?iban:"",34)+fpad("",96)+fpad("",13);
  if(page.length!==577)throw new Error("Error interno al montar el fichero del 130.");
  const head=`T1300${year}${period}0000`,aux=fpad(fpad("",70)+"AM01"+fpad("",4)+"B72758998",300);
  return `<${head}><AUX>${aux}</AUX><T13001000>${page}</T13001000></${head}>`;
}
function download130(draft){
  try{
    const text=aeat130(draft),bytes=new Uint8Array([...text].map(ch=>{const c=ch.charCodeAt(0);return c<256?c:32}));
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([bytes],{type:"application/octet-stream"}));
    a.download=`${String(draft.cif||"").toUpperCase()}_130_${draft.year}_${draft.period}.130`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  }catch(error){alert(error.message)}
}
window.aeat130=aeat130;
function currentDraft(period){
  const saved=taxDraftControl(M,period).draft;
  if(saved&&saved.model===M&&Array.isArray(saved.boxes))return{...saved,complementaria:tdCompl(M,period),cif:saved.cif||taxDrafts.clientData?.cif||""};
  const d=taxDraftBuild(M,period);return{...d,client:taxDrafts.client,cif:taxDrafts.clientData?.cif||"",pago:d.calc.pago};
}
if(typeof taxDraftDetail==="function"){const previous=taxDraftDetail;taxDraftDetail=function(draft){const html=previous.apply(this,arguments);
  return draft.model===M?html.replace('<button type="button" class="secondary-button" data-td-copy>',`<button type="button" class="secondary-button" data-m130-file="${escapeHtml(draft.period)}" title="Fichero para importar en la sede de la AEAT (presentación mediante fichero)">Fichero AEAT</button><button type="button" class="secondary-button" data-td-copy>`):html}}
document.addEventListener("click",event=>{const button=event.target.closest("[data-m130-file]");if(!button)return;event.preventDefault();download130(currentDraft(button.dataset.m130File))});
if(typeof openConfirmedTaxDraft==="function"){
  const previousOpen=openConfirmedTaxDraft;
  openConfirmedTaxDraft=async function(key){
    await previousOpen.apply(this,arguments);
    let data={};try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
    const draft=data.draft,actions=document.querySelector("#tdDraftView .td-form-actions");
    if(!draft||draft.model!==M||!actions||actions.querySelector("[data-m130-download]"))return;
    const button=document.createElement("button");button.type="button";button.className="secondary-button";button.dataset.m130Download="1";button.textContent="Fichero AEAT";
    button.addEventListener("click",()=>download130({...draft,cif:draft.cif||taxDrafts.clientData?.cif||""}));actions.prepend(button);
  };
}

/* --- Borrador con el aspecto del impreso del 130 --- */
if(typeof taxDraftFormHtml==="function"){
  const previousForm=taxDraftFormHtml;
  taxDraftFormHtml=function(draft,client={}){
    if(draft.model!==M)return previousForm.apply(this,arguments);
    const boxes=new Map((draft.boxes||[]).filter(box=>box.n).map(box=>[box.n,box]));
    const val=n=>tdFormMoney(boxes.get(n)?.value);
    const row=(n,label)=>`<div class="af-row"><span class="af-label">${label}</span><div class="af-cell"><div class="af-box"><b>${n}</b><span>${escapeHtml(val(n))}</span></div></div></div>`;
    const result=Number(boxes.get("19")?.value)||0,nif=draft.cif||client.cif||"",name=draft.client||client.name||"",check=on=>`<i class="af-check">${on?"X":""}</i>`,pago=draft.pago||{},compl=draft.complementaria||{};
    const h=t=>`<h5 class="m130-h">${t}</h5>`;
    return `<div class="aeat-form m130f"><div class="af-watermark">BORRADOR</div>
      <div class="af-head"><div class="af-agency"><strong>Agencia Tributaria</strong><small>Documento preparado por Asesoría Molinero</small></div><div class="af-title"><strong>Impuesto sobre la Renta de las Personas Físicas</strong><span>Actividades económicas en estimación directa</span><em>Pago fraccionado · Autoliquidación</em></div><div class="af-model"><small>Modelo</small><b>130</b></div></div>
      <section class="af-sec"><div class="af-side">Declarante</div><div class="af-body af-ident"><div><div class="af-grid af-g2"><label><small>NIF</small><span>${escapeHtml(nif)}</span></label><label><small>Apellidos y nombre</small><span>${escapeHtml(name)}</span></label></div></div><div class="af-devengo"><div class="af-side af-side-sm">Devengo</div><label><small>Ejercicio</small><span>${escapeHtml(draft.year||"")}</span></label><label><small>Período</small><span>${escapeHtml(draft.period||"")}</span></label></div></div></section>
      <section class="af-sec"><div class="af-side">Liquidación</div><div class="af-body">
        ${h("I. Actividades económicas en estimación directa, modalidad normal o simplificada, distintas de las agrícolas, ganaderas, forestales y pesqueras <small>(datos acumulados del período comprendido entre el primer día del año y el último día del trimestre)</small>")}
        ${["01","02","03","04","05","06","07"].map(n=>row(n,n==="07"?`<strong>${LABELS[n]}</strong>`:LABELS[n])).join("")}
        ${h("II. Actividades agrícolas, ganaderas, forestales y pesqueras en estimación directa, modalidad normal o simplificada")}
        ${["08","09","10","11"].map(n=>row(n,n==="11"?`<strong>${LABELS[n]}</strong>`:LABELS[n])).join("")}
        <div class="af-total">${h("III. Total liquidación")}${["12","13","14","15","16","17","18","19"].map(n=>row(n,["12","14","17","19"].includes(n)?`<strong>${LABELS[n]}</strong>`:LABELS[n])).join("")}</div>
      </div></section>
      <div class="af-split">
        <section class="af-sec"><div class="af-side">Ingreso</div><div class="af-body"><div class="af-row"><span class="af-label">Importe del ingreso (casilla 19)</span><div class="af-cell"><div class="af-box af-ingreso"><b>I</b><span>${result>0?escapeHtml(tdFormMoney(result)):""}</span></div></div></div>
          <p class="af-line">Forma de pago: ${check(result>0&&pago.forma==="domiciliacion")} Domiciliación ${check(result>0&&pago.forma==="adeudo")} Adeudo en cuenta ${check(result>0&&pago.forma==="efectivo")} Efectivo</p>
          ${result>0&&pago.forma==="domiciliacion"?`<p class="af-line"><small>Código IBAN</small> <b>${escapeHtml(String(pago.iban||"").replace(/(.{4})/g,"$1 ").trim())}</b></p>`:""}${result>0&&pago.forma==="adeudo"?`<p class="af-line"><small>NRC</small> <b>${escapeHtml(pago.nrc||"")}</b></p>`:""}</div></section>
        <section class="af-sec"><div class="af-side">A deducir</div><div class="af-body"><p class="af-line">${check(result<0&&pago.aDeducir)} Autoliquidación con resultado a deducir en los siguientes pagos fraccionados del mismo ejercicio</p></div></section>
      </div>
      <div class="af-split">
        <section class="af-sec"><div class="af-side">Negativa</div><div class="af-body"><p class="af-line">${check(result===0||(result<0&&!pago.aDeducir))} Autoliquidación negativa</p></div></section>
        <section class="af-sec"><div class="af-side">Complementaria</div><div class="af-body"><p class="af-line">${check(compl.activa)} Autoliquidación complementaria</p><p class="af-line"><small>N.º de justificante</small> ${escapeHtml(compl.justificante||"____________________")}</p></div></section>
      </div>
      <p class="af-foot">Borrador preparado con los datos de la contabilidad${draft.calculo?` · ${draft.calculo.modalidad==="normal"?"estimación directa normal":`estimación directa simplificada (difícil justificación ${String(draft.calculo.pct).replace(".",",")} %)`}`:""}${draft.confirmedBy?` · confirmado por ${escapeHtml(draft.confirmedBy)}`:""}. No válido para su presentación.</p></div>`;
  };
}
(function(){const style=document.createElement("style");style.textContent=`
.m130-sec{border:1px solid #e3e7ef;border-radius:12px;background:#fff;margin:0 0 10px;overflow:hidden}
.m130-sec>summary{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;list-style:none;background:#f6f8fd}.m130-sec>summary::-webkit-details-marker{display:none}
.m130-sec[open]>summary .td-caret{transform:rotate(90deg)}.m130-sec>summary .td-caret{display:inline-block;transition:transform .15s;color:#1f4a99;font-weight:800}
.m130-sec>summary b{flex:1;font-size:13px;line-height:1.3;color:#1d2a44}.m130-res{font-size:12.5px;font-weight:800;color:#1f4a99;white-space:nowrap;font-variant-numeric:tabular-nums}
.m130-sec.off>summary b{color:#8a93a6}.m130-sec.off .m130-res{display:none}
.m130-tog{display:flex;align-items:center;gap:6px;flex:none;font-size:11.5px;font-weight:700;color:#1f4a99;background:#eef1ff;border-radius:999px;padding:3px 10px 3px 6px;cursor:pointer}
.m130-sec.off .m130-tog{color:#69748a;background:#eef0f4}.m130-tog input{margin:0}
.m130-body{padding:8px 12px 10px}.m130-body .td-note{margin:4px 2px}
.m130 .m130-line .tdg-label small.m130-hint{display:block;font-weight:500;color:#69748a;font-size:11px}
.m130 .m130-line.strong .tdg-label{font-weight:800}
.m130-in.auto::placeholder{color:#1d2a44;opacity:1}.m130-in.auto{background:#fff}.m130-in.manual{background:#fff4e5;border-color:#f0b35a}
.m130-calc-row small{font-weight:500;color:#69748a}
.m130-in{width:100%;max-width:150px;height:30px;border:1px solid #c9d3ea;border-radius:7px;padding:2px 8px;text-align:right;font:inherit;font-size:13px;font-weight:700;background:#fffef5;justify-self:end}
.m130-pago{border:1px solid #e3e7ef;border-radius:12px;padding:12px 14px;margin:4px 20px 10px;background:#fff;display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 18px}
.m130-pago h6{width:100%;margin:0;font-size:12.5px;color:#1f4a99;text-transform:uppercase;letter-spacing:.04em}
.m130-radios{display:flex;flex-wrap:wrap;gap:6px}.m130-radio{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;border:1px solid #d8deea;border-radius:999px;padding:5px 12px;cursor:pointer;background:#fff}
.m130-radio:has(input:checked){border-color:#1f4a99;background:#eef1ff;color:#1f4a99}.m130-pago .td-cf{flex:1 1 260px}.m130-pago .td-cf input{width:100%}
.m130-hint{margin:0;font-size:12px;color:#69748a}
.m130-calc{border:1px solid #e3e7ef;border-radius:12px;overflow:hidden;margin:12px}
.m130-calc-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 12px;border-top:1px solid #eef0f5;font-size:13px}.m130-calc-row:first-child{border-top:0}
.m130-calc-row b{font-variant-numeric:tabular-nums;white-space:nowrap}.m130-calc-row.edit span{color:#b42318}.m130-calc-row.sub{background:#f1f3f7}.m130-calc-row.strong{font-weight:800;background:#f1f3f7}
.m130-calc-row.green{background:#e9f7ec}.m130-calc-row.blue{background:#e6f6fb}.m130-calc-row.dim{color:#8a93a6}
.m130-calc-row input{width:110px;height:30px;border:1px solid #c9d3ea;border-radius:7px;padding:2px 8px;text-align:right;font:inherit;font-weight:700;background:#fffef5}
.m130-calc-row input.m130-pct{width:52px;height:24px;padding:1px 4px;margin:0 2px}
.m130-mod{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 12px;background:#f6f8fd;font-size:13px;font-weight:700}.m130-mod select{height:30px;border:1px solid #c9d3ea;border-radius:7px;font:inherit;font-size:12.5px}
.m130-acc td small,.td-list td small{display:block;color:#69748a;font-size:11px}
.aeat-form .m130-h{margin:10px 0 4px;font-size:11px;line-height:1.3}.aeat-form .m130-h small{font-weight:400}
@media(max-width:760px){.m130-sec>summary{flex-wrap:wrap}.m130-sec>summary b{flex-basis:100%;order:3}.m130-res{margin-left:auto}.m130-in{max-width:120px}}`;document.head.append(style)})();
if(document.querySelector("#tdModels")&&taxDrafts.client){renderTaxDraftModels();renderTaxDraftMain()}
})();
