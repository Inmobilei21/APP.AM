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
const previousDetail=taxDraftDetail;
taxDraftDetail=function(draft,control){
  const html=previousDetail.apply(this,arguments);
  if(!AEAT_FILE_MODELS[draft.model])return html;
  return html.replace('<button type="button" class="secondary-button" data-td-copy>',`<button type="button" class="secondary-button" data-aeat-file="${escapeHtml(draft.model)}|${escapeHtml(draft.period)}" title="Fichero para importar en la sede de la AEAT (presentación mediante fichero)">Fichero AEAT</button><button type="button" class="secondary-button" data-td-copy>`);
};
document.addEventListener("click",event=>{
  const button=event.target.closest("[data-aeat-file]");if(!button)return;
  event.preventDefault();
  const [model,period]=button.dataset.aeatFile.split("|");
  // Se usa el borrador confirmado si lo hay; si no, el cálculo actual.
  const saved=taxDraftControl(model,period).draft;
  const base=saved&&saved.model===model&&aeatBoxes(saved).length?saved:{...taxDraftBuild(model,period),client:taxDrafts.client};
  const draft={...base,complementaria:typeof tdCompl==="function"?tdCompl(model,period):base.complementaria};
  downloadAeatFile({...draft,cif:draft.cif||taxDrafts.clientData?.cif||"",client:draft.client||taxDrafts.client});
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
    button.addEventListener("click",()=>downloadAeatFile(draft));actions.prepend(button);
  };
}
if(document.querySelector("#tdMain")&&taxDrafts.client)renderTaxDraftMain();
})();
