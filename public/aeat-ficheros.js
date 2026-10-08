/* Ficheros para importar en la sede de la AEAT (presentación mediante fichero), con el mismo diseño de
   registro que genera Cegid Diez «Impresos Hacienda». Modelos 111, 115 y 123.
   Estructura: <T{modelo}0{ejercicio}{periodo}0000><AUX>…</AUX><T{modelo}01000>{página 1}</T{modelo}01000></T…> */
(function(){
if(typeof taxDraftDetail!=="function")return;
const AEAT_FILE_MODELS={
  // Casillas en orden: [número, ancho]. Recuentos sin decimales; importes en céntimos.
  "115":{page:477,boxes:[["01",15],["02",17],["03",17],["04",17],["05",17]],result:"05"},
  "123":{page:577,boxes:[["01",15],["02",15],["03",15],...["04","05","06","07","08","09","10","11","12","13","14"].map(n=>[n,17])],result:"14"},
  "111":{page:977,boxes:[...Array.from({length:9},(_,g)=>[[String(g*3+1).padStart(2,"0"),8],[String(g*3+2).padStart(2,"0"),17],[String(g*3+3).padStart(2,"0"),17]]).flat(),["28",17],["29",17],["30",17]],result:"30"}
};
const pad=(value,width)=>String(value).slice(0,width).padEnd(width," ");
const num=(value,width,cents)=>{const n=Math.round(Math.abs(Number(value)||0)*(cents?100:1));return String(n).padStart(width,"0").slice(-width)};
const clean=value=>[...String(value||"").toUpperCase()].map(c=>c==="Ñ"||c==="Ç"?c:c.normalize("NFD").replace(/[\u0300-\u036f]/g,"")).join("").replace(/[^A-Z0-9ÑÇ ,.\-&]/g," ").replace(/\s+/g," ").trim();
// Los borradores del 115 confirmados con la primera versión guardaban «casillas» en vez de «boxes».
function aeatBoxes(draft){
  if(Array.isArray(draft.boxes)&&draft.boxes.some(box=>box.n))return draft.boxes;
  if(draft.casillas&&typeof draft.casillas==="object")return Object.entries(draft.casillas).map(([n,value])=>({n,value}));
  return[];
}
function aeatFile(draft){
  const spec=AEAT_FILE_MODELS[draft.model];if(!spec)throw new Error("Modelo sin fichero.");
  draft={...draft,boxes:aeatBoxes(draft)};
  if(!draft.boxes.length)throw new Error("El borrador no tiene casillas. Vuelve a confirmarlo y descarga el fichero.");
  const boxes=new Map((draft.boxes||[]).filter(box=>box.n).map(box=>[box.n,box]));
  const value=(n,width)=>{const box=boxes.get(n);return num(box?box.value:0,width,width===17)};
  const result=Number(boxes.get(spec.result)?.value)||0,nif=String(draft.cif||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(nif.length!==9)throw new Error("Falta el NIF del cliente (ficha del cliente).");
  const period=String(draft.period||""),year=String(draft.year||"");
  // Tipo: I ingreso, U domiciliación (con IBAN), N negativa. Tras las casillas: complementaria (1),
  // justificante anterior (13) e IBAN (34), como en el fichero del 123 de Impresos Hacienda.
  const iban=String(draft.iban||"").replace(/\s+/g,"").toUpperCase(),type=result>0?(iban?"U":"I"):"N";
  let page=" "+type+pad(nif,9)+pad(clean(draft.client),60)+pad("",20)+year+pad(period,2)+spec.boxes.map(([n,width])=>value(n,width)).join("")+(draft.complementaria?.activa?"X"+String(draft.complementaria.justificante||"").replace(/\D/g,"").padStart(13,"0").slice(-13):pad("",14))+pad(type==="U"?iban:"",34);
  page=pad(page,spec.page);
  const aux=pad("",70)+"AM01"+pad("",4)+"B72758998";
  const head=`T${draft.model}0${year}${period}0000`;
  return `<${head}><AUX>${pad(aux,300)}</AUX><T${draft.model}01000>${page}</T${draft.model}01000></${head}>`;
}
// Si hay importe y el cliente tiene IBAN en su ficha, se pregunta si se domicilia el pago.
async function askIban(draft){
  const result=Number(aeatBoxes(draft).find(box=>box.n===AEAT_FILE_MODELS[draft.model]?.result)?.value)||0;if(!(result>0))return"";
  let client=null;try{client=(await getAllClientMetadata()).find(item=>item.name===draft.client||item.id===draft.client)}catch{}
  const iban=(client?.bank?.ibans||[]).find(Boolean)||"";
  if(!iban)return"";
  return await appConfirm({eyebrow:"FICHERO AEAT",title:`¿Domiciliar el pago de ${tdEur(result)}?`,message:`Cuenta ${iban}`,ok:"Domiciliar",cancel:"Ingreso sin domiciliar"})?iban:"";
}
async function downloadAeatFile(draft){
  try{
    if(draft.iban===undefined)draft={...draft,iban:await askIban(draft)};
    const text=aeatFile(draft),bytes=new Uint8Array([...text].map(ch=>{const c=ch.charCodeAt(0);return c<256?c:32}));
    const blob=new Blob([bytes],{type:"application/octet-stream"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=`${String(draft.cif||"").toUpperCase()}_${draft.model}_${draft.year}_${draft.period}.${draft.model}`;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  }catch(error){alert(error.message)}
}
window.downloadAeatFile=downloadAeatFile;
/* --- Forma de pago (se guarda en Control y va al fichero): domiciliación (U) con el IBAN de la ficha, adeudo en
   cuenta o efectivo (I). Si el resultado es cero o negativo, la declaración es negativa (N). --- */
function clientIbans(){const bank=taxDrafts.clientData?.bank||{},list=(bank.ibans||[]).map(i=>String(i).replace(/\s+/g,"").toUpperCase()).filter(Boolean),pref=String(bank.ibanPreferido||"").replace(/\s+/g,"").toUpperCase();
  return{list:pref&&list.includes(pref)?[pref,...list.filter(i=>i!==pref)]:list,pref:list.includes(pref)?pref:""}}
function pagoOf(model,period){
  const saved=taxDraftControl(model,period).pago||{},{list,pref}=clientIbans();
  const forma=saved.forma||(list.length?"domiciliacion":"adeudo");
  return{forma,iban:forma==="domiciliacion"?(saved.iban??(pref||list[0]||"")):""};
}
function savePago(model,period,field,value){
  const year=taxDraftYear(),key=declarationKey(model,period,taxDrafts.client,year),data=declarationData(model,period,taxDrafts.client,year);
  data.pago={...pagoOf(model,period),...(data.pago||{}),[field]:value};localStorage.setItem(key,JSON.stringify(data));renderTaxDraftMain();
}
const ibanText=iban=>String(iban||"").replace(/(.{4})/g,"$1 ").trim();
function pagoBlock(draft){
  const spec=AEAT_FILE_MODELS[draft.model];if(!spec)return"";
  const result=Number(draft.result)||0,p=pagoOf(draft.model,draft.period),{list,pref}=clientIbans();
  if(!(result>0))return `<div class="aeat-pago"><h6>Resultado ${result<0?"negativo":"cero"}</h6><p class="aeat-pago-hint">Se presenta como declaración negativa.</p></div>`;
  const opt=(value,label)=>`<label class="aeat-pago-radio"><input type="radio" name="aeatPago${draft.model}" data-aeat-pago="forma" value="${value}"${p.forma===value?" checked":""}><span>${label}</span></label>`;
  const otra=p.iban&&!list.includes(p.iban);
  return `<div class="aeat-pago"><h6>Ingreso · ${tdEur(result)}</h6><div class="aeat-pago-radios">${opt("domiciliacion","Domiciliación")}${opt("adeudo","Adeudo en cuenta")}${opt("efectivo","En efectivo")}</div>
    ${p.forma==="domiciliacion"?`<label class="td-cf aeat-pago-iban"><small>Cuenta de domiciliación (IBAN)</small><select data-aeat-pago="iban">${list.map(i=>`<option value="${i}"${i===p.iban?" selected":""}>${i===pref?"★ ":""}${ibanText(i)}</option>`).join("")}${otra?`<option value="${escapeHtml(p.iban)}" selected>${escapeHtml(ibanText(p.iban))}</option>`:""}<option value="__otra">Otra cuenta…</option>${list.length||otra?"":'<option value="" selected>Sin IBAN en la ficha del cliente</option>'}</select></label>`:""}
    <p class="aeat-pago-hint">${p.forma==="domiciliacion"?(p.iban?"La domiciliación solo se puede hacer hasta unos días antes de que termine el plazo. ★ = cuenta preferida de la ficha del cliente.":"⚠ Añade el IBAN en la ficha del cliente (Gestión) o elige «Otra cuenta…»."):p.forma==="adeudo"?"Se presenta con NRC: el pago se hace en el banco o en la sede de la AEAT.":"Pago en efectivo en una entidad colaboradora con la carta de pago."}</p></div>`;
}
document.addEventListener("change",event=>{
  const el=event.target.closest?.("[data-aeat-pago]");if(!el||!document.querySelector("#tdMain")?.contains(el))return;
  const model=taxDrafts.model,period=taxDrafts.open;if(!AEAT_FILE_MODELS[model]||!period)return;
  if(el.dataset.aeatPago==="iban"&&el.value==="__otra"){openOtherIban(model,period);return}
  savePago(model,period,el.dataset.aeatPago,el.value);
});
function openOtherIban(model,period){
  const shade=document.createElement("div");shade.className="app-confirm";
  shade.innerHTML=`<div class="app-confirm-box"><header><p class="eyebrow">FORMA DE PAGO</p><h3>Otra cuenta de domiciliación</h3></header><p class="app-confirm-msg"><input class="aeat-other-iban" maxlength="34" placeholder="ES00 0000 0000 0000 0000 0000"></p><footer><button type="button" class="secondary-button" data-x="0">Cancelar</button><button type="button" class="primary blue-button" data-x="1">Usar esta cuenta</button></footer></div>`;
  document.body.append(shade);const input=shade.querySelector("input");input.focus();
  const done=ok=>{const iban=input.value.replace(/\s+/g,"").toUpperCase();shade.remove();if(ok&&/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(iban))savePago(model,period,"iban",iban);else{if(ok)alert("El IBAN no es válido.");renderTaxDraftMain()}};
  shade.addEventListener("click",e=>{const b=e.target.closest("[data-x]");if(b)done(b.dataset.x==="1");else if(e.target===shade)done(false)});
  input.addEventListener("keydown",e=>{if(e.key==="Enter")done(true);if(e.key==="Escape")done(false)});
}
// Al confirmar el borrador se guarda también la forma de pago.
if(typeof confirmTaxDraft==="function"){const previousConfirm=confirmTaxDraft;confirmTaxDraft=function(){
  const model=taxDrafts.model,period=taxDrafts.open,r=previousConfirm.apply(this,arguments);
  if(AEAT_FILE_MODELS[model]&&period){const year=taxDraftYear(),key=declarationKey(model,period,taxDrafts.client,year),data=declarationData(model,period,taxDrafts.client,year);if(data.draft){data.draft.pago=pagoOf(model,period);localStorage.setItem(key,JSON.stringify(data))}}
  return r}}
const withPago=draft=>{const p=draft.pago;return p?{...draft,iban:p.forma==="domiciliacion"?p.iban||"":""}:draft};
const previousDetail=taxDraftDetail;
taxDraftDetail=function(draft,control){
  const html=previousDetail.apply(this,arguments);
  if(!AEAT_FILE_MODELS[draft.model])return html;
  return html.replace('<div class="td-checks">',`${pagoBlock(draft)}<div class="td-checks">`).replace('<button type="button" class="secondary-button" data-td-copy>',`<button type="button" class="secondary-button" data-aeat-file="${escapeHtml(draft.model)}|${escapeHtml(draft.period)}" title="Fichero para importar en la sede de la AEAT (presentación mediante fichero)">Fichero AEAT</button><button type="button" class="secondary-button" data-td-copy>`);
};
document.addEventListener("click",event=>{
  const button=event.target.closest("[data-aeat-file]");if(!button)return;
  event.preventDefault();
  const [model,period]=button.dataset.aeatFile.split("|");
  // Se usa el borrador confirmado si lo hay; si no, el cálculo actual.
  const saved=taxDraftControl(model,period).draft;
  const base=saved&&saved.model===model&&aeatBoxes(saved).length?saved:{...taxDraftBuild(model,period),client:taxDrafts.client};
  const draft={...base,complementaria:typeof tdCompl==="function"?tdCompl(model,period):base.complementaria};
  // Forma de pago: la del borrador confirmado o, si no hay, la elegida en pantalla.
  const pago=saved&&saved.model===model&&saved.pago?saved.pago:pagoOf(model,period);
  downloadAeatFile(withPago({...draft,pago,cif:draft.cif||taxDrafts.clientData?.cif||"",client:draft.client||taxDrafts.client}));
});
// En el borrador confirmado (ojo), botón para descargar el fichero.
if(typeof openConfirmedTaxDraft==="function"){
  const previousOpen=openConfirmedTaxDraft;
  openConfirmedTaxDraft=async function(key){
    await previousOpen.apply(this,arguments);
    let data={};try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
    const draft=data.draft,actions=document.querySelector("#tdDraftView .td-form-actions");
    if(!draft||!AEAT_FILE_MODELS[draft.model]||!actions||actions.querySelector("[data-aeat-download]"))return;
    const button=document.createElement("button");button.type="button";button.className="secondary-button";button.dataset.aeatDownload="1";button.textContent="Fichero AEAT";
    button.addEventListener("click",()=>downloadAeatFile(withPago(draft)));actions.prepend(button);
  };
}
if(document.querySelector("#tdMain")&&taxDrafts.client)renderTaxDraftMain();
})();
