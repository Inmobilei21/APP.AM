/* Gestión › Presupuestos: crear, enviar (enlace, WhatsApp, correo), seguir su aceptación y sus cobros, y verlos
   enlazados con Facturación. El presupuesto en PDF y, al aceptarse, el acuerdo y los justificantes de pago se guardan
   en CLIENTES/<cliente>/PRESUPUESTOS (o PRESUPUESTOS/<nombre> si el cliente aún es provisional). */
(function(){
  if(typeof openManagementSection!=="function")return;
  const ESTADOS={borrador:["Borrador","gris"],enviado:["Enviado","azul"],aceptado:["Aceptado · anticipo pendiente","ambar"],en_curso:["En curso","verde"],pago_final:["Pago final pendiente","ambar"],pagado:["Pagado","verde"],rechazado:["Rechazado","rojo"],anulado:["Anulado","gris"]};
  const FILTROS=[["todos","Todos"],["abiertos","Pendientes de aceptar"],["cobro","Pendientes de cobro"],["en_curso","En curso"],["pagado","Pagados"],["cerrados","Rechazados / anulados"]];
  const enFiltro=(p,f)=>f==="todos"||(f==="abiertos"&&["borrador","enviado"].includes(p.estado))||(f==="cobro"&&["aceptado","pago_final"].includes(p.estado))||(f==="en_curso"&&p.estado==="en_curso")||(f==="pagado"&&p.estado==="pagado")||(f==="cerrados"&&["rechazado","anulado"].includes(p.estado));
  const eur=v=>`${(Number(v)||0).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:"always"})} €`;
  const num=v=>{const n=Number(String(v??"").replace(/\s/g,"").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",","."));return Number.isFinite(n)?n:0};
  const day=iso=>iso?new Date(iso).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}):"";
  const esc=v=>escapeHtml(String(v??""));
  const link=p=>`${location.origin}/presupuesto.html?t=${encodeURIComponent(p.token)}`;
  let data={presupuestos:[],ajustes:{}},filtro="todos",buscar="";

  /* ---------- Pestaña y panel en Gestión ---------- */
  function ensureTab(){
    const nav=document.querySelector(".management-tabs");if(!nav||nav.querySelector('[data-management-tab="presupuestos"]'))return;
    const billing=nav.querySelector('[data-management-tab="billing"]'),tab=document.createElement("button");
    tab.type="button";tab.setAttribute("role","tab");tab.dataset.managementTab="presupuestos";tab.setAttribute("aria-selected","false");tab.textContent="Presupuestos";
    tab.addEventListener("click",()=>openManagementSection("presupuestos"));nav.insertBefore(tab,billing||null);
    const billingPanel=document.querySelector('[data-management-panel="billing"]');
    if(billingPanel&&!document.querySelector('[data-management-panel="presupuestos"]')){const panel=document.createElement("div");panel.dataset.managementPanel="presupuestos";panel.hidden=true;billingPanel.before(panel)}
  }
  new MutationObserver(ensureTab).observe(document.documentElement,{childList:true,subtree:true});ensureTab();
  const previous=openManagementSection;
  openManagementSection=function(name){const r=previous.apply(this,arguments);if(name==="presupuestos")render();return r};
  window.amOpenPresupuesto=async id=>{openManagementSection("presupuestos");await reload();detail(id)};

  async function reload(){try{data=await apiJson("/api/presupuestos")}catch(error){data={presupuestos:[],ajustes:{}};console.error(error)}}
  async function render(){
    const panel=document.querySelector('[data-management-panel="presupuestos"]');if(!panel)return;
    if(!panel.dataset.ready){panel.dataset.ready="1";panel.innerHTML=`<section class="management-workspace-head pq-head"><div><p class="eyebrow">PRESUPUESTOS</p><h2>Presupuestos</h2><p>Prepara presupuestos, envíalos para que el cliente los acepte y sigue el cobro del anticipo y del pago final.</p></div><div class="pq-head-actions"><button type="button" class="secondary-button" data-pq-ajustes>Ajustes</button><button type="button" class="primary blue-button" data-pq-nuevo>＋ Nuevo presupuesto</button></div></section>
      <section class="pq-panel"><div class="pq-tools"><div class="pq-filtros" role="tablist"></div><label class="pq-buscar"><span>⌕</span><input type="search" placeholder="Buscar cliente, servicio o número…"></label></div><div class="pq-table-wrap"><table class="pq-table"><thead><tr><th>Nº</th><th>Fecha</th><th>Cliente</th><th>Servicio</th><th class="num">Total</th><th class="num">Cobrado</th><th>Estado</th></tr></thead><tbody></tbody></table><p class="pq-empty" hidden>No hay presupuestos.</p></div></section>`;
      panel.querySelector("[data-pq-nuevo]").addEventListener("click",()=>form());
      panel.querySelector("[data-pq-ajustes]").addEventListener("click",ajustes);
      panel.querySelector(".pq-buscar input").addEventListener("input",e=>{buscar=normalizeFiscalText(e.target.value);draw()});
      panel.addEventListener("click",e=>{const f=e.target.closest("[data-pq-filtro]");if(f){filtro=f.dataset.pqFiltro;draw();return}const row=e.target.closest("[data-pq-id]");if(row)detail(row.dataset.pqId)});
    }
    await reload();draw();
  }
  function draw(){
    const panel=document.querySelector('[data-management-panel="presupuestos"]');if(!panel?.dataset.ready)return;
    const all=data.presupuestos||[];
    panel.querySelector(".pq-filtros").innerHTML=FILTROS.map(([k,l])=>{const n=all.filter(p=>enFiltro(p,k)).length;return `<button type="button" data-pq-filtro="${k}" class="${filtro===k?"on":""}">${l}<span>${n}</span></button>`}).join("");
    const list=all.filter(p=>enFiltro(p,filtro)&&(!buscar||normalizeFiscalText(`${p.numero} ${p.cliente.nombre} ${p.servicio}`).includes(buscar)));
    panel.querySelector("tbody").innerHTML=list.map(p=>{const [label,tone]=ESTADOS[p.estado]||[p.estado,"gris"],cobrado=p.pagos.filter(x=>x.estado==="pagado").reduce((s,x)=>s+x.importe,0);
      return `<tr data-pq-id="${p.id}"><td><b>${esc(p.numero)}</b></td><td>${day(p.fecha)}</td><td>${esc(p.cliente.nombre)}${p.cliente.provisional?'<small class="pq-prov">Provisional</small>':""}</td><td class="pq-serv">${esc(p.servicio)}</td><td class="num">${eur(p.total)}</td><td class="num">${eur(cobrado)}</td><td><span class="pq-badge ${tone}">${esc(label)}</span></td></tr>`}).join("");
    panel.querySelector(".pq-empty").hidden=Boolean(list.length);
  }

  /* ---------- Modal genérico ---------- */
  function modal(html,cls=""){
    document.querySelector("#pqModal")?.remove();
    const shell=document.createElement("div");shell.id="pqModal";shell.className="modal-shell open pq-modal-shell";shell.setAttribute("aria-hidden","false");
    shell.innerHTML=`<div class="modal-backdrop" data-pq-close></div><section class="client-modal pq-modal ${cls}" role="dialog" aria-modal="true">${html}</section>`;
    document.body.append(shell);document.body.classList.add("pq-open");
    const close=()=>{shell.remove();document.body.classList.remove("pq-open")};
    shell.addEventListener("click",e=>{if(e.target.closest("[data-pq-close]"))close()});
    return{shell,close};
  }

  /* ---------- Crear / editar ---------- */
  async function form(existing){
    let clients=[];try{clients=(await getAllClientMetadata()).filter(c=>c?.active!==false).sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id),"es"))}catch{}
    const a=data.ajustes||{},p=existing||{cliente:{},marca:"molinero",servicio:"",conceptos:[{descripcion:"",importe:""}],ivaPct:21,validez:30,pagos:[{etiqueta:"Anticipo a la aceptación",pct:50},{etiqueta:"Al finalizar el trabajo",pct:50}],pagoInstrucciones:a.pago||"",condiciones:a.condiciones||""};
    const plan=p.pagos.length===1?"unico":p.pagos.length===2&&p.pagos[0].pct===50?"mitad":"otro";
    const nuevo=!p.cliente.carpeta&&Boolean(p.cliente.nombre);
    const {shell,close}=modal(`<div class="modal-heading"><div><p class="eyebrow">${existing?`EDITAR ${esc(existing.numero)}`:"NUEVO PRESUPUESTO"}</p><h2>${existing?"Editar presupuesto":"Nuevo presupuesto"}</h2></div><button class="modal-close" type="button" data-pq-close aria-label="Cerrar">×</button></div>
      <form class="pq-form" novalidate>
        <fieldset><legend>Cliente</legend>
          <div class="pq-seg"><label><input type="radio" name="tipo" value="cliente"${nuevo?"":" checked"}>Cliente del despacho</label><label><input type="radio" name="tipo" value="nuevo"${nuevo?" checked":""}>Cliente nuevo (provisional)</label></div>
          <div class="pq-grid">
            <label class="pq-w2" data-cli="cliente">Cliente<input name="carpeta" list="pqClientes" placeholder="Busca el cliente…" value="${esc(p.cliente.carpeta||"")}"><datalist id="pqClientes">${clients.map(c=>`<option value="${esc(c.id||c.name)}">${esc(c.cif||"")}</option>`).join("")}</datalist></label>
            <label class="pq-w2" data-cli="nuevo">Nombre del cliente<input name="nombre" placeholder="Nombre o razón social" value="${esc(p.cliente.nombre||"")}"><small>Se guarda en PRESUPUESTOS / ${esc("<nombre>")} hasta que sea cliente.</small></label>
            <label>NIF / DNI<input name="nif" value="${esc(p.cliente.nif||"")}"></label>
            <label>Correo<input name="email" type="email" value="${esc(p.cliente.email||"")}"></label>
            <label>Teléfono (WhatsApp)<input name="telefono" type="tel" value="${esc(p.cliente.telefono||"")}"></label>
            <label>Marca<select name="marca"><option value="molinero">Asesoría Molinero</option><option value="propymes"${p.marca==="propymes"?" selected":""}>Asesoría Molinero + ProPymes</option></select></label>
          </div>
        </fieldset>
        <fieldset><legend>Servicio</legend>
          <label class="pq-full">Título del presupuesto<input name="servicio" placeholder="Ej. Constitución de sociedad limitada" value="${esc(p.servicio)}"></label>
          <div class="pq-conceptos"></div><button type="button" class="pq-link" data-pq-add>＋ Añadir concepto</button>
          <div class="pq-grid pq-g3"><label>IVA<select name="ivaPct">${[21,10,4,0].map(v=>`<option value="${v}"${Number(p.ivaPct)===v?" selected":""}>${v?`${v} %`:"Exento (0 %)"}</option>`).join("")}</select></label>
            <label>Forma de pago<select name="plan"><option value="mitad"${plan==="mitad"?" selected":""}>50 % al aceptar y 50 % al terminar</option><option value="unico"${plan==="unico"?" selected":""}>100 % al aceptar</option><option value="otro"${plan==="otro"?" selected":""}>Otro anticipo…</option></select></label>
            <label data-otro>Anticipo (%)<input name="pct" inputmode="decimal" value="${esc(plan==="otro"?p.pagos[0].pct:50)}"></label>
            <label>Validez (días)<input name="validez" inputmode="numeric" value="${esc(p.validez)}"></label></div>
          <div class="pq-resumen"></div>
        </fieldset>
        <fieldset><legend>Pago y condiciones</legend>
          <label class="pq-full">Cómo pagar (lo ve el cliente al aceptar)<textarea name="pagoInstrucciones" rows="2">${esc(p.pagoInstrucciones)}</textarea></label>
          <label class="pq-full">Condiciones (una por línea)<textarea name="condiciones" rows="6">${esc(p.condiciones)}</textarea></label>
          <label class="pq-full">Notas internas (no las ve el cliente)<textarea name="notas" rows="2">${esc(p.notas||"")}</textarea></label>
        </fieldset>
        <p class="pq-error" role="alert"></p>
        <div class="pq-actions"><button type="button" class="secondary-button" data-pq-close>Cancelar</button><button type="button" class="secondary-button" data-pq-preview>Previsualizar presupuesto</button><button type="submit" class="primary blue-button">${existing?"Guardar cambios":"Crear presupuesto"}</button></div>
      </form>`,"pq-modal-form");
    const f=shell.querySelector("form"),box=f.querySelector(".pq-conceptos");
    const conceptRow=c=>`<div class="pq-concepto"><textarea rows="1" placeholder="Descripción del concepto">${esc(c.descripcion)}</textarea><input inputmode="decimal" placeholder="0,00" value="${c.importe!==""&&c.importe!==undefined?String(c.importe).replace(".",","):""}"><span>€</span><button type="button" data-pq-del aria-label="Quitar concepto">×</button></div>`;
    box.innerHTML=p.conceptos.map(conceptRow).join("");
    const tipo=()=>f.tipo.value;
    const sync=()=>{f.querySelectorAll("[data-cli]").forEach(el=>el.hidden=el.dataset.cli!==tipo());f.querySelector("[data-otro]").hidden=f.plan.value!=="otro";
      const base=[...box.querySelectorAll(".pq-concepto input")].reduce((s,i)=>s+num(i.value),0),iva=Math.round(base*Number(f.ivaPct.value))/100,total=Math.round((base+iva)*100)/100;
      const pct=f.plan.value==="unico"?100:f.plan.value==="mitad"?50:Math.min(100,Math.max(0,num(f.pct.value)));
      f.querySelector(".pq-resumen").innerHTML=`<span>Base <b>${eur(base)}</b></span><span>IVA <b>${eur(iva)}</b></span><span class="t">Total <b>${eur(total)}</b></span>${pct<100?`<span>Anticipo <b>${eur(Math.round(total*pct)/100)}</b> · resto <b>${eur(total-Math.round(total*pct)/100)}</b></span>`:""}`};
    f.addEventListener("input",sync);f.addEventListener("change",e=>{
      if(e.target.name==="carpeta"){const c=clients.find(x=>(x.id||x.name)===e.target.value);if(c){const first=v=>(Array.isArray(v)?v:String(v||"").split(/[\n,;]+/)).map(x=>typeof x==="string"?x:(x?.value||x?.email||x?.phone||"")).map(x=>String(x).trim()).find(Boolean)||"";if(!f.nif.value)f.nif.value=c.cif||"";if(!f.email.value)f.email.value=first(c.emails);if(!f.telefono.value)f.telefono.value=first(c.phones).replace(/[^\d+]/g,"")}}
      sync()});
    f.addEventListener("click",e=>{if(e.target.closest("[data-pq-add]")){box.insertAdjacentHTML("beforeend",conceptRow({descripcion:"",importe:""}));box.lastElementChild.querySelector("textarea").focus();sync()}const del=e.target.closest("[data-pq-del]");if(del&&box.children.length>1){del.parentElement.remove();sync()}});
    sync();
    const collect=()=>{
      const cliente=tipo()==="cliente"?clients.find(x=>(x.id||x.name)===f.carpeta.value.trim()):null;
      const pct=f.plan.value==="unico"?100:f.plan.value==="mitad"?50:Math.min(100,Math.max(1,num(f.pct.value)));
      const body={cliente:{carpeta:cliente?(cliente.id||cliente.name):"",nombre:cliente?(cliente.name||cliente.id):f.nombre.value.trim(),nif:f.nif.value.trim(),email:f.email.value.trim(),telefono:f.telefono.value.trim()},marca:f.marca.value,servicio:f.servicio.value.trim(),
        conceptos:[...box.querySelectorAll(".pq-concepto")].map(r=>({descripcion:r.querySelector("textarea").value.trim(),importe:num(r.querySelector("input").value)})).filter(c=>c.descripcion||c.importe),
        ivaPct:Number(f.ivaPct.value),validez:Number(f.validez.value)||30,pagos:pct>=100?[{etiqueta:"Pago a la aceptación",pct:100}]:[{etiqueta:"Anticipo a la aceptación",pct},{etiqueta:"Al finalizar el trabajo",pct:100-pct}],
        pagoInstrucciones:f.pagoInstrucciones.value.trim(),condiciones:f.condiciones.value.trim(),notas:f.notas.value.trim()};
      return{body,cliente}};
    f.querySelector("[data-pq-preview]").addEventListener("click",async()=>{
      const {body}=collect(),err=f.querySelector(".pq-error");err.textContent="";
      if(!body.conceptos.length){err.textContent="Añade al menos un concepto para ver la vista previa.";return}
      viewer(`${existing?existing.numero:"Nuevo presupuesto"} · ${body.servicio||"Presupuesto"}`,`Vista previa ${existing?.numero||"presupuesto"}.pdf`,()=>fetchBlob("/api/presupuestos/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,id:existing?.id||""})}));
    });
    f.addEventListener("submit",async e=>{
      e.preventDefault();const err=f.querySelector(".pq-error");err.textContent="";
      const {body,cliente}=collect();
      if(tipo()==="cliente"&&!cliente){err.textContent="Elige un cliente de la lista o marca «Cliente nuevo (provisional)».";return}
      if(!body.cliente.nombre){err.textContent="Indica el nombre del cliente.";return}
      if(!body.servicio){err.textContent="Indica el título del presupuesto.";return}
      if(!body.conceptos.length){err.textContent="Añade al menos un concepto con su importe.";return}
      const btn=f.querySelector('[type="submit"]');btn.disabled=true;btn.textContent="Guardando y generando el PDF…";
      try{const saved=await apiJson(existing?`/api/presupuestos/${existing.id}`:"/api/presupuestos",{method:"POST",body:JSON.stringify(body)});close();await reload();draw();detail(saved.id)}
      catch(error){err.textContent=error.message;btn.disabled=false;btn.textContent=existing?"Guardar cambios":"Crear presupuesto"}
    });
  }

  /* ---------- Ajustes: datos del despacho, forma de pago y condiciones por defecto ---------- */
  function ajustes(){
    const a=data.ajustes||{};
    const {shell,close}=modal(`<div class="modal-heading"><div><p class="eyebrow">PRESUPUESTOS</p><h2>Ajustes</h2></div><button class="modal-close" type="button" data-pq-close aria-label="Cerrar">×</button></div>
      <form class="pq-form"><fieldset><legend>Datos del despacho (pie del presupuesto)</legend><div class="pq-grid">${[["nombre","Nombre"],["nif","NIF"],["direccion","Dirección"],["telefono","Teléfono"],["email","Correo"],["web","Web"]].map(([k,l])=>`<label>${l}<input name="${k}" value="${esc(a[k]||"")}"></label>`).join("")}</div></fieldset>
      <fieldset><legend>Por defecto en cada presupuesto nuevo</legend><label class="pq-full">Cómo pagar<textarea name="pago" rows="2">${esc(a.pago||"")}</textarea></label><label class="pq-full">Condiciones (una por línea)<textarea name="condiciones" rows="7">${esc(a.condiciones||"")}</textarea></label></fieldset>
      <p class="pq-error"></p><div class="pq-actions"><button type="button" class="secondary-button" data-pq-close>Cancelar</button><button class="primary blue-button" type="submit">Guardar</button></div></form>`,"pq-modal-form");
    const f=shell.querySelector("form");
    f.addEventListener("submit",async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(f));try{data.ajustes=await apiJson("/api/presupuestos/ajustes",{method:"POST",body:JSON.stringify(body)});close()}catch(error){f.querySelector(".pq-error").textContent=error.message}});
  }

  /* ---------- Visor de documentos dentro de la app (como la vista previa de facturas) ---------- */
  async function viewer(title,name,load){
    document.querySelector("#pqViewer")?.remove();
    const v=document.createElement("div");v.id="pqViewer";v.className="pq-viewer";v.setAttribute("role","dialog");v.setAttribute("aria-modal","true");
    v.innerHTML=`<div class="pq-viewer-box"><header><div><p class="eyebrow">VISTA PREVIA</p><h4>${esc(title)}</h4></div><div class="pq-viewer-actions"><a class="secondary-button" data-pq-download hidden>⤓ Descargar</a><button type="button" class="pq-viewer-close" aria-label="Cerrar">×</button></div></header><div class="pq-viewer-body"><p class="pq-viewer-msg">Generando el documento…</p></div></div>`;
    document.body.append(v);let url="";
    const close=()=>{v.remove();if(url)URL.revokeObjectURL(url);document.removeEventListener("keydown",esc_)},esc_=e=>{if(e.key==="Escape")close()};
    v.addEventListener("click",e=>{if(e.target===v||e.target.closest(".pq-viewer-close"))close()});document.addEventListener("keydown",esc_);
    const body=v.querySelector(".pq-viewer-body");
    try{
      const blob=await load();url=URL.createObjectURL(blob);
      const dl=v.querySelector("[data-pq-download]");dl.href=url;dl.download=name;dl.hidden=false;
      if(!/pdf/i.test(blob.type)&&!/\.pdf$/i.test(name)){body.innerHTML=/^image\//.test(blob.type)?`<img src="${url}" alt="">`:`<p class="pq-viewer-msg">No se puede mostrar este archivo. Descárgalo para verlo.</p>`;return}
      const pdfjs=await import("/vendor/pdfjs/pdf.min.mjs");pdfjs.GlobalWorkerOptions.workerSrc="/vendor/pdfjs/pdf.worker.min.mjs";
      const pdf=await pdfjs.getDocument({data:await blob.arrayBuffer()}).promise;body.innerHTML="";
      const width=Math.min(body.clientWidth-48,900),ratio=window.devicePixelRatio||1;
      for(let n=1;n<=pdf.numPages;n++){
        if(!v.isConnected)return;
        const page=await pdf.getPage(n),base=page.getViewport({scale:1}),vp=page.getViewport({scale:width/base.width*ratio}),c=document.createElement("canvas");
        c.width=vp.width;c.height=vp.height;c.style.width=`${vp.width/ratio}px`;body.append(c);await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
      }
    }catch(error){body.innerHTML=`<p class="pq-viewer-msg">${esc(error.message||"No se pudo mostrar el documento.")}</p>`}
  }
  const fetchBlob=async(url,options)=>{const r=await fetch(url,{credentials:"same-origin",...options});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||"No se encuentra el documento");return r.blob()};

  /* ---------- Ficha del presupuesto ---------- */
  function openDoc(p,name){return viewer(name.replace(/\.[a-z0-9]+$/i,""),name,()=>fetchBlob(`/api/presupuestos/${p.id}/doc/${encodeURIComponent(name)}`))}
  async function act(p,accion){const updated=await apiJson(`/api/presupuestos/${p.id}/accion`,{method:"POST",body:JSON.stringify({accion})});await reload();draw();return updated}
  const message=p=>{const pend=p.pagoFinalPedido?p.pagos.find(x=>x.estado!=="pagado"):null,saludo=`Hola${p.aceptacion?.nombre?` ${p.aceptacion.nombre.split(" ")[0]}`:""},`;
    return pend?`${saludo} hemos terminado el trabajo de «${p.servicio}». Aquí tienes el presupuesto ${p.numero} y los datos para el pago final de ${eur(pend.importe)}: ${link(p)}\n\n${data.ajustes?.nombre||"Asesoría Molinero"}`
      :`${saludo} te enviamos el presupuesto ${p.numero} para «${p.servicio}» (${eur(p.total)} IVA incluido). Puedes revisarlo y aceptarlo aquí: ${link(p)}\n\n${p.pagos.length>1?`Al aceptarlo, te indicaremos cómo abonar el anticipo de ${eur(p.pagos[0].importe)}.\n\n`:""}${data.ajustes?.nombre||"Asesoría Molinero"}`};
  async function detail(id){
    const p=(data.presupuestos||[]).find(x=>x.id===id);if(!p)return;
    const [label,tone]=ESTADOS[p.estado]||[p.estado,"gris"],docs=p.documentos||[],abierto=!["rechazado","anulado"].includes(p.estado);
    const docName={presupuesto:"Presupuesto",acuerdo:"Acuerdo de aceptación"};
    const pagos=p.pagos.map(x=>`<div class="pq-pago ${x.estado}"><div><b>${esc(x.etiqueta)}</b><small>${String(x.pct).replace(".",",")} % · ${x.estado==="pagado"?`Cobrado el ${day(x.pagadoEn)} por ${esc(x.metodo||"")}`:"Pendiente"}</small></div><strong>${eur(x.importe)}</strong>${x.estado==="pagado"?(x.justificante?`<button type="button" class="pq-link" data-pq-doc="${esc(x.justificante)}">Justificante</button>`:'<span class="pq-ok">✓</span>'):abierto?`<button type="button" class="secondary-button" data-pq-pagar="${x.id}">Registrar cobro</button>`:""}</div>`).join("");
    const fact=(p.facturacion||[]).map(e=>`<li>${esc(e.description)}</li>`).join("");
    const {shell,close}=modal(`<div class="modal-heading"><div><p class="eyebrow">PRESUPUESTO ${esc(p.numero)} · ${day(p.fecha)}</p><h2>${esc(p.servicio)}</h2><span class="pq-badge ${tone}">${esc(label)}</span></div><button class="modal-close" type="button" data-pq-close aria-label="Cerrar">×</button></div>
      <div class="pq-detail">
        <div class="pq-col">
          <section class="pq-card"><p class="pq-k">Cliente</p><b>${esc(p.cliente.nombre)}</b>${p.cliente.provisional?'<small class="pq-prov">Provisional · PRESUPUESTOS/'+esc(p.cliente.nombre)+"</small>":""}<small>${[p.cliente.nif,p.cliente.email,p.cliente.telefono].filter(Boolean).map(esc).join(" · ")}</small></section>
          <section class="pq-card"><p class="pq-k">Importe</p><div class="pq-tot"><span>Base</span><b>${eur(p.base)}</b></div><div class="pq-tot"><span>IVA ${p.ivaPct} %</span><b>${eur(p.iva)}</b></div><div class="pq-tot t"><span>Total</span><b>${eur(p.total)}</b></div></section>
          <section class="pq-card"><p class="pq-k">Pagos</p>${pagos}</section>
          ${p.aceptacion?`<section class="pq-card ok"><p class="pq-k">Aceptado</p><b>${esc(p.aceptacion.nombre)} · ${esc(p.aceptacion.dni)}</b><small>${new Date(p.aceptacion.fecha).toLocaleString("es-ES")} · IP ${esc(p.aceptacion.ip||"—")}</small></section>`:""}
        </div>
        <div class="pq-col">
          <section class="pq-card"><p class="pq-k">Enviar al cliente</p>${abierto?`<div class="pq-send"><button type="button" class="primary blue-button" data-pq-wa>WhatsApp</button><button type="button" class="secondary-button" data-pq-mail>Correo</button><button type="button" class="secondary-button" data-pq-copy>Copiar enlace</button><a class="secondary-button" href="${link(p)}" target="_blank" rel="noopener">Ver como cliente</a></div><small class="pq-hint">WhatsApp y Correo abren el mensaje ya escrito; solo tienes que enviarlo.</small>`:'<small>Este presupuesto está cerrado.</small>'}</section>
          <section class="pq-card"><p class="pq-k">Documentos</p>${docs.length?docs.map(d=>`<button type="button" class="pq-docrow" data-pq-doc="${esc(d.name)}"><span class="pq-pdf">${/\.pdf$/i.test(d.name)?"PDF":"DOC"}</span><span><b>${esc(docName[d.kind]||(d.kind.startsWith("justificante")?"Justificante de pago":d.kind))}</b><small>${esc(d.ruta||d.error||d.name)}</small></span></button>`).join(""):'<small>Sin documentos.</small>'}</section>
          <section class="pq-card"><p class="pq-k">Facturación</p>${fact?`<ul class="pq-fact">${fact}</ul>`:'<small>Cuando se registre un cobro, aparecerá en Facturación para emitir su factura.</small>'}</section>
          <section class="pq-card"><p class="pq-k">Historial</p><ul class="pq-hist">${(p.historial||[]).slice().reverse().map(h=>`<li><time>${new Date(h.fecha).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"})}</time>${esc(h.texto)}${h.por?` <em>· ${esc(h.por)}</em>`:""}</li>`).join("")}</ul></section>
        </div>
      </div>
      <div class="pq-actions pq-actions-detail">
        ${!p.aceptacion&&abierto?'<button type="button" class="secondary-button" data-pq-edit>Editar</button><button type="button" class="secondary-button danger" data-pq-act="rechazado">Rechazado</button>':""}
        ${p.aceptacion&&!p.pagoFinalPedido&&p.pagos.some(x=>x.estado!=="pagado")&&abierto?'<button type="button" class="primary blue-button" data-pq-act="terminado">Trabajo terminado · pedir pago final</button>':""}
        ${abierto&&!p.aceptacion?'<button type="button" class="secondary-button" data-pq-act="anulado">Anular</button>':""}
        ${!abierto&&!p.aceptacion?'<button type="button" class="secondary-button" data-pq-act="reabrir">Reabrir</button>':""}
      </div>`,"pq-modal-detail");
    const toast=t=>{const s=shell.querySelector(".pq-hint");if(s)s.textContent=t};
    shell.addEventListener("click",async e=>{
      const el=e.target.closest("button,a");if(!el)return;
      if(el.dataset.pqDoc)return openDoc(p,el.dataset.pqDoc);
      if(el.hasAttribute("data-pq-edit")){close();return form(p)}
      if(el.hasAttribute("data-pq-copy")){try{await navigator.clipboard.writeText(link(p));toast("Enlace copiado.")}catch{prompt("Copia el enlace:",link(p))}await act(p,"enviado");return}
      if(el.hasAttribute("data-pq-wa")){const tel=String(p.cliente.telefono||"").replace(/[^\d]/g,""),phone=tel.length===9?`34${tel}`:tel;window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message(p))}`,"_blank");await act(p,"enviado");return}
      if(el.hasAttribute("data-pq-mail")){location.href=`mailto:${encodeURIComponent(p.cliente.email||"")}?subject=${encodeURIComponent(`Presupuesto ${p.numero} · ${p.servicio}`)}&body=${encodeURIComponent(message(p))}`;await act(p,"enviado");return}
      if(el.dataset.pqAct){const accion=el.dataset.pqAct,labels={rechazado:"¿Marcar como rechazado?",anulado:"¿Anular el presupuesto?",terminado:"¿Trabajo terminado?",reabrir:"¿Reabrir el presupuesto?"};
        if(!await appConfirm({eyebrow:`PRESUPUESTO ${p.numero}`,title:labels[accion],message:accion==="terminado"?"Se marcará el trabajo como terminado y el enlace del cliente mostrará el pago final. Después envíaselo por WhatsApp o correo.":"",ok:"Confirmar",cancel:"Cancelar",danger:accion==="anulado"||accion==="rechazado"}))return;
        try{await act(p,accion);close();detail(p.id)}catch(error){alert(error.message)}return}
      if(el.dataset.pqPagar)return cobro(p,p.pagos.find(x=>x.id===el.dataset.pqPagar),close);
    });
  }
  // Cobro recibido: método, fecha y justificante (PDF o imagen), que se guarda en la carpeta del presupuesto.
  function cobro(p,pago,closeDetail){
    const today=new Date().toISOString().slice(0,10);
    const {shell,close}=modal(`<div class="modal-heading"><div><p class="eyebrow">${esc(p.numero)} · ${esc(pago.etiqueta)}</p><h2>Registrar cobro de ${eur(pago.importe)}</h2></div><button class="modal-close" type="button" data-pq-close aria-label="Cerrar">×</button></div>
      <form class="pq-form"><div class="pq-grid"><label>Forma de pago<select name="metodo"><option>transferencia</option><option>tarjeta</option><option>Bizum</option><option>efectivo</option><option>domiciliación</option></select></label><label>Fecha del cobro<input type="date" name="fecha" value="${today}"></label>
      <label class="pq-full">Justificante de pago (PDF o imagen)<input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp"><small>Se guarda en la carpeta del cliente junto al presupuesto.</small></label></div>
      <p class="pq-error"></p><div class="pq-actions"><button type="button" class="secondary-button" data-pq-close>Cancelar</button><button class="primary blue-button" type="submit">Registrar cobro</button></div></form>`,"pq-modal-form pq-modal-small");
    const f=shell.querySelector("form");
    f.addEventListener("submit",async e=>{e.preventDefault();const file=f.file.files[0],btn=f.querySelector('[type="submit"]');btn.disabled=true;btn.textContent="Guardando…";
      try{const r=await fetch(`/api/presupuestos/${p.id}/pago/${pago.id}`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":file?.type||"application/octet-stream","X-File-Name":encodeURIComponent(file?.name||""),"X-Metodo":encodeURIComponent(f.metodo.value),"X-Fecha":f.fecha.value},body:file||new Blob([])});
        const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudo registrar");close();closeDetail?.();await reload();draw();detail(p.id);if(typeof refreshBillingData==="function")refreshBillingData(true)}
      catch(error){f.querySelector(".pq-error").textContent=error.message;btn.disabled=false;btn.textContent="Registrar cobro"}});
  }
})();
