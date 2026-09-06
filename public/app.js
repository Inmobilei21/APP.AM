const sidebar=document.querySelector("#sidebar");
const overlay=document.querySelector("#overlay");
const main=document.querySelector("main");
const homeMarkup=main.innerHTML;
let currentEntries=[];
let folderHistory=[];
let activeFolderConfig=null;
let currentDirectoryHandle=null;
let managementUnlocked=false;
const defaultClientFolders=["ACTAS","CIERRES ANUALES","CONTABILIDAD","DECLARACIONES","ESCRITURAS","LIBROS OFICIALES","OTRA DOCUMENTACIÓN"];

document.querySelector("#menu").addEventListener("click",openMenu);
overlay.addEventListener("click",closeMenu);
if(window.matchMedia("(max-width:760px)").matches){sidebar.classList.add("open");overlay.classList.add("show")}

function openMenu(){sidebar.classList.add("open");overlay.classList.add("show")}
function closeMenu(){sidebar.classList.remove("open");overlay.classList.remove("show")}
function bindHeader(){document.querySelector("#menu")?.addEventListener("click",openMenu)}

const views={
  "Clientes":{
    eyebrow:"ARCHIVO DE CLIENTES",
    title:"Carpetas de clientes",
    description:"Consulta y busca las carpetas de clientes del despacho.",
    button:"Conectar carpeta Clientes",
    path:"Escritorio → Gestión → Clientes",
    storageKey:"clients-folder",
    itemLabel:"Carpeta de cliente"
  },
};

function openProtectedManagement(){
  if(managementUnlocked){renderManagement();return}
  document.querySelector("#managementAccess")?.remove();
  const shell=document.createElement("div");
  shell.id="managementAccess";
  shell.className="access-shell";
  shell.innerHTML=`
    <div class="access-backdrop"></div>
    <section class="access-card" role="dialog" aria-modal="true" aria-labelledby="accessTitle">
      <button class="access-close" type="button" aria-label="Cerrar">×</button>
      <div class="access-icon">⌘</div>
      <p class="eyebrow">ACCESO PROTEGIDO</p>
      <h2 id="accessTitle">Entrar en Gestión</h2>
      <p class="access-copy">Introduce la contraseña para acceder a la gestión de clientes.</p>
      <form>
        <label for="managementPassword">Contraseña</label>
        <div class="access-input"><span>●</span><input id="managementPassword" type="password" autocomplete="current-password" placeholder="Introduce la contraseña" required></div>
        <p class="access-error" role="alert"></p>
        <button class="primary blue-button" type="submit">Acceder</button>
      </form>
    </section>`;
  document.body.appendChild(shell);
  const close=()=>{shell.classList.remove("open");setTimeout(()=>shell.remove(),260)};
  shell.querySelector(".access-close").addEventListener("click",close);
  shell.querySelector(".access-backdrop").addEventListener("click",close);
  shell.querySelector("form").addEventListener("submit",event=>{
    event.preventDefault();
    const input=shell.querySelector("#managementPassword");
    if(input.value==="1234"){
      managementUnlocked=true;
      close();
      setTimeout(renderManagement,180);
    }else{
      shell.querySelector(".access-error").textContent="La contraseña no es correcta.";
      input.classList.add("invalid");
      input.select();
    }
  });
  requestAnimationFrame(()=>requestAnimationFrame(()=>shell.classList.add("open")));
  setTimeout(()=>shell.querySelector("#managementPassword").focus(),280);
}

function renderManagement(){
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Gestión</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="management-search"><div><p class="eyebrow">CLIENTES</p><h2>Buscador de clientes</h2><p>Localiza rápidamente cualquier cliente del despacho.</p></div><button class="primary blue-button" id="openNewClient">＋ Nuevo cliente</button><label class="management-searchbox"><span>⌕</span><input id="managementSearch" type="search" placeholder="Buscar por nombre…"></label></section>
    <section class="management-clients"><div class="folder-toolbar"><div><strong>Clientes</strong><span id="managementCount">0 clientes</span></div></div><div class="folder-grid" id="managementGrid"><div class="empty folder-empty"><span>▤</span><h4>Cargando clientes</h4></div></div></section>
    <div class="modal-shell" id="clientModal" aria-hidden="true"><div class="modal-backdrop" data-close-modal></div><section class="client-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-heading"><div><p class="eyebrow">ALTA DE CLIENTE</p><h2 id="modalTitle">Nuevo cliente</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <form id="newClientForm"><div class="client-identity-grid"><label>Nombre del cliente<input id="clientName" type="text" placeholder="Ej. Empresa García, S.L." required maxlength="120"></label><label>CIF<input id="clientCif" type="text" placeholder="Ej. B12345678" required maxlength="9" autocomplete="off"><small>9 caracteres</small></label></div><fieldset class="fiscal-obligations"><legend>Obligaciones fiscales</legend><div class="fiscal-periodicity"><div><strong>Periodicidad</strong><small>Se aplicará a todos los modelos seleccionados.</small></div><select id="fiscalPeriodicity" aria-label="Periodicidad fiscal"><option value="trimestral" selected>Trimestral</option><option value="mensual">Mensual</option></select></div><p>Selecciona los modelos fiscales del cliente.</p><div class="obligation-grid">${["111","115","123","130-131","303","349"].map(m=>`<div class="obligation-item"><label><input type="checkbox" data-tax-model="${m}"><strong>Modelo ${m}</strong></label></div>`).join("")}</div></fieldset><div class="attachment-grid"><label class="file-field"><span><strong>Escrituras</strong><small>Opcional · varios archivos</small></span><input id="clientWritings" type="file" multiple></label><label class="file-field"><span><strong>Declaraciones</strong><small>Opcional · varios archivos</small></span><input id="clientDeclarations" type="file" multiple></label><label class="file-field"><span><strong>Firma digital</strong><small>Opcional · certificado digital</small></span><input id="clientSignature" type="file" accept=".p12,.pfx,.cer,.crt"></label></div><div class="signature-data"><label>Fecha de caducidad<input id="signatureExpiry" type="date"></label><label>Contraseña<input id="signaturePassword" type="password" autocomplete="new-password" placeholder="Contraseña de la firma"></label></div><p class="form-message" id="formMessage"></p><div class="modal-actions"><button type="button" class="secondary-button" data-close-modal>Cancelar</button><button class="primary blue-button" type="submit">Guardar cliente</button></div></form></section></div>`;
  bindHeader();
  document.querySelector("#openNewClient").addEventListener("click",openClientModal);
  document.querySelectorAll("[data-close-modal]").forEach(x=>x.addEventListener("click",closeClientModal));
  document.querySelector("#newClientForm").addEventListener("submit",createClient);
  document.querySelector("#managementSearch").addEventListener("input",filterManagementClients);
  loadManagementClients();
}
function openClientModal(){const m=document.querySelector("#clientModal");m.classList.add("open");m.setAttribute("aria-hidden","false");setTimeout(()=>document.querySelector("#clientName")?.focus(),180)}
function closeClientModal(){const m=document.querySelector("#clientModal");m.classList.remove("open");m.setAttribute("aria-hidden","true")}
async function loadManagementClients(){
  const grid=document.querySelector("#managementGrid");
  try{const root=await getSavedHandle("clients-folder");if(!root||await root.queryPermission({mode:"read"})!=="granted"){grid.innerHTML='<div class="empty folder-empty"><h4>Carpeta de Clientes no autorizada</h4><p>Entra primero en Clientes y autoriza su carpeta.</p></div>';return}
  const clients=[];for await(const x of root.values())if(x.kind==="directory")clients.push(x.name);clients.sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));
  grid.innerHTML=clients.length?clients.map(n=>`<button class="folder-card management-client" data-client="${escapeHtml(n.toLocaleLowerCase("es"))}"><span class="folder-icon">▰</span><span><strong>${escapeHtml(n)}</strong><small>Cliente</small></span></button>`).join(""):'<div class="empty folder-empty"><h4>No hay clientes</h4></div>';document.querySelector("#managementCount").textContent=`${clients.length} ${clients.length===1?"cliente":"clientes"}`}catch{grid.innerHTML='<div class="empty folder-empty"><h4>No se pudieron cargar los clientes</h4></div>'}
}
function filterManagementClients(e){const q=e.target.value.trim().toLocaleLowerCase("es");const cards=[...document.querySelectorAll(".management-client")];let v=0;cards.forEach(c=>{const s=c.dataset.client.includes(q);c.hidden=!s;if(s)v++});document.querySelector("#managementCount").textContent=q?`${v} resultados`:`${cards.length} clientes`}
async function createClient(e){
  e.preventDefault();const input=document.querySelector("#clientName"),message=document.querySelector("#formMessage"),button=e.target.querySelector("button[type=submit]");const entered=input.value.trim(),name=entered.replace(/[. ]+$/,"");if(!name)return;if(/[\\/:*?"<>|]/.test(name)){message.className="form-message error";message.textContent="El nombre contiene caracteres que Windows no permite.";return}button.disabled=true;button.textContent="Guardando…";
  try{let root=await getSavedHandle("clients-folder");if(root&&await root.requestPermission({mode:"readwrite"})!=="granted")root=null;if(!root){root=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("clients-folder",root)}
  let existed=true;try{await root.getDirectoryHandle(name)}catch{existed=false}const client=await root.getDirectoryHandle(name,{create:true}),folders={};for(const f of defaultClientFolders)folders[f]=await client.getDirectoryHandle(f,{create:true});const accountingYear=await folders["CONTABILIDAD"].getDirectoryHandle(String(new Date().getFullYear()),{create:true});for(const subfolder of ["1T","2T","3T","4T","BANCOS"])await accountingYear.getDirectoryHandle(subfolder,{create:true});
  await copyFileList(document.querySelector("#clientWritings").files,folders["ESCRITURAS"]);await copyFileList(document.querySelector("#clientDeclarations").files,folders["DECLARACIONES"]);
  const sig=document.querySelector("#clientSignature");if(sig.files.length){let signaturesRoot=await getSavedHandle("signatures-folder");if(signaturesRoot&&await signaturesRoot.requestPermission({mode:"readwrite"})!=="granted")signaturesRoot=null;if(!signaturesRoot){signaturesRoot=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("signatures-folder",signaturesRoot)}const file=sig.files[0],savedName=`${name} - ${file.name}`;await copyNamedFile(file,signaturesRoot,savedName);await saveSignatureMetadata({id:savedName,client:name,document:savedName,password:document.querySelector("#signaturePassword").value,expiry:document.querySelector("#signatureExpiry").value})}
  const obligations={};document.querySelectorAll("[data-tax-model]:checked").forEach(check=>{obligations[check.dataset.taxModel]=true});await saveClientMetadata({id:name,name,cif:document.querySelector("#clientCif").value.trim().toUpperCase(),periodicity:document.querySelector("#fiscalPeriodicity").value,obligations});
  message.className="form-message success";message.textContent=existed?"Cliente actualizado correctamente.":`Cliente “${name}” creado correctamente.`;e.target.reset();await loadManagementClients();setTimeout(closeClientModal,850)}
  catch(error){if(error.name!=="AbortError"){message.className="form-message error";message.textContent="No se pudo guardar el cliente. Comprueba el permiso de escritura."}}finally{button.disabled=false;button.textContent="Guardar cliente"}
}
async function copyFileList(list,dir){for(const file of list)await copyNamedFile(file,dir,file.name)}
async function copyNamedFile(file,dir,name){const dest=await dir.getFileHandle(name,{create:true}),w=await dest.createWritable();await w.write(file);await w.close()}
function renderHolded(){
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Holded</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="holded-panel">
      <div class="holded-hero-mark" aria-hidden="true"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAADjCAMAAABdCzrMAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAMAUExURQAAACY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xSY7xf///5Q+wGUAAAD+dFJOUwAAAmTkxDwTO47r1HAsDEev5fr12pIpFUDp0XIwRLL335Ml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" alt=""></div>
      <div><p class="eyebrow">GESTIÓN CONTABLE</p><h2>Acceso a Holded</h2><p>Abre la plataforma de gestión y contabilidad del despacho.</p></div>
      <a class="primary blue-button holded-open" href="https://app.holded.com" target="_blank" rel="noopener noreferrer">Abrir Holded <span>↗</span></a>
    </section>`;
  bindHeader();
}

function renderSignatures(){
  main.innerHTML=`<header><button class="menu" id="menu">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Firmas digitales</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header><section class="signatures-panel"><div class="table-heading"><div><p class="eyebrow">CERTIFICADOS</p><h2>Firmas digitales de clientes</h2></div><div class="signature-actions"><button class="upload-button" id="connectSignatures">Conectar carpeta Firmas digitales</button><label class="client-search"><span>⌕</span><input id="signatureSearch" type="search" placeholder="Buscar cliente…"></label></div></div><div class="signature-table-wrap"><table class="signature-table"><thead><tr><th>Cliente</th><th>Documento</th><th>Contraseña</th><th>Caducidad</th></tr></thead><tbody id="signatureRows"><tr><td colspan="4" class="table-empty">Cargando firmas…</td></tr></tbody></table></div></section>`;bindHeader();document.querySelector("#signatureSearch").addEventListener("input",filterSignatureRows);document.querySelector("#connectSignatures").addEventListener("click",connectSignaturesFolder);loadSignatures()
}
async function connectSignaturesFolder(){try{const root=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("signatures-folder",root);await loadSignatures()}catch(error){if(error.name!=="AbortError")alert("No se pudo conectar la carpeta de firmas digitales.")}}
async function loadSignatures(){
 const body=document.querySelector("#signatureRows");try{const root=await getSavedHandle("signatures-folder");if(!root||await root.queryPermission({mode:"read"})!=="granted"){body.innerHTML='<tr><td colspan="4" class="table-empty">Conecta la carpeta Gestión → Firmas digitales.</td></tr>';return}const metadata=await getAllSignatureMetadata(),map=new Map(metadata.map(x=>[x.id,x])),rows=[];
 for await(const doc of root.values()){if(doc.kind!=="file")continue;const m=map.get(doc.name)||{};rows.push({client:m.client||"Sin asignar",document:doc.name,handle:doc,password:m.password||"",expiry:m.expiry||""})}
 window.signatureFiles=rows;body.innerHTML=rows.length?rows.map((r,i)=>`<tr data-search="${escapeHtml((r.client+" "+r.document).toLocaleLowerCase("es"))}"><td><strong>${escapeHtml(r.client)}</strong></td><td><button class="document-link" data-download="${i}">⇩ ${escapeHtml(r.document)}</button></td><td><button class="password-cell" data-password="${escapeHtml(r.password)}">${r.password?"••••••••":"—"}</button></td><td><span class="expiry ${expiryClass(r.expiry)}">${formatDate(r.expiry)}</span></td></tr>`).join(""):'<tr><td colspan="4" class="table-empty">Todavía no hay firmas digitales.</td></tr>';
 body.querySelectorAll("[data-download]").forEach(x=>x.addEventListener("click",()=>downloadSignature(Number(x.dataset.download))));body.querySelectorAll("[data-password]").forEach(x=>x.addEventListener("click",()=>{x.textContent=x.textContent.includes("•")?(x.dataset.password||"—"):"••••••••"}))}catch{body.innerHTML='<tr><td colspan="4" class="table-empty">No se pudieron cargar las firmas.</td></tr>'}
}
async function downloadSignature(i){const file=await window.signatureFiles[i].handle.getFile(),url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function filterSignatureRows(e){const q=e.target.value.trim().toLocaleLowerCase("es");document.querySelectorAll("#signatureRows tr[data-search]").forEach(r=>r.hidden=!r.dataset.search.includes(q))}
function formatDate(v){return v?new Intl.DateTimeFormat("es-ES").format(new Date(v+"T12:00:00")):"—"}
function expiryClass(v){if(!v)return"";const d=(new Date(v+"T23:59:59")-new Date())/86400000;return d<0?"expired":d<60?"warning":"valid"}

const workers=["Manuel Molinero","Álvaro Molinero","Francisco Molinero","Araceli Frías","Jesús Carratalá"];

function renderWorkers(){
  main.innerHTML=`
    <header>
      <button class="menu" id="menu" aria-label="Abrir menú">☰</button>
      <div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Trabajadores</h1></div>
      <button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button>
    </header>
    <section class="clients-head">
      <div><p class="eyebrow">EQUIPO</p><h2>Gestión de trabajadores</h2><p>Consulta las fichas del equipo del despacho.</p></div>
    </section>
    <section class="folder-panel">
      <div class="folder-toolbar"><div><strong>TRABAJADORES</strong><span>${workers.length} trabajadores</span></div></div>
      <div class="folder-grid">
        ${workers.map((name,index)=>`<button class="folder-card worker-card" type="button" data-worker="${escapeHtml(name)}"><span class="folder-icon">♟</span><span><strong>${escapeHtml(name)}</strong><small>Ficha del trabajador</small></span></button>`).join("")}
      </div>
    </section>`;
  bindHeader();
}

const taxModels=["111","115","123","130-131","303","349"];

function renderDeclarations(){
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Declaraciones</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="declarations-panel">
      <div class="declarations-heading"><div><p class="eyebrow">OBLIGACIONES FISCALES</p><h2>Control de declaraciones</h2><p>Selecciona un modelo para revisar sus clientes y presentación.</p></div></div>
      <div class="tax-tabs" role="tablist">${taxModels.map((model,index)=>`<button type="button" role="tab" data-tax-tab="${model}" class="${index===0?"active":""}">Modelo ${model}</button>`).join("")}</div>
      <div class="tax-table-wrap"><table class="tax-table"><thead><tr><th>Cliente</th><th>CIF</th><th>Encargado</th><th>Fecha confección</th><th>Importe</th><th>Pago</th><th>Fecha presentación</th><th>Presentado por</th><th>Revisado por</th></tr></thead><tbody id="taxRows"><tr><td colspan="9" class="table-empty">Cargando clientes…</td></tr></tbody></table></div>
    </section>`;
  bindHeader();
  document.querySelectorAll("[data-tax-tab]").forEach(tab=>tab.addEventListener("click",()=>{document.querySelector("[data-tax-tab].active")?.classList.remove("active");tab.classList.add("active");loadTaxModel(tab.dataset.taxTab)}));
  loadTaxModel(taxModels[0]);
}
function declarationKey(model,client){return "app-am-declaration-"+model+"-"+client}
function declarationData(model,client){try{return JSON.parse(localStorage.getItem(declarationKey(model,client))||"{}")}catch{return{}}}
function workerOptions(selected){return '<option value="">Seleccionar…</option>'+workers.map(name=>`<option value="${escapeHtml(name)}" ${selected===name?"selected":""}>${escapeHtml(name)}</option>`).join("")}
async function loadTaxModel(model){
  const body=document.querySelector("#taxRows");
  try{
    const clients=(await getAllClientMetadata()).filter(client=>client.obligations&&client.obligations[model]);
    body.innerHTML=clients.length?clients.sort((a,b)=>a.name.localeCompare(b.name,"es")).map(client=>{const d=declarationData(model,client.name);return `<tr data-tax-client="${escapeHtml(client.name)}" data-tax-model-row="${model}"><td><strong>${escapeHtml(client.name)}</strong><small>${(client.periodicity||client.obligations[model])==="mensual"?"Mensual":"Trimestral"}</small></td><td>${escapeHtml(client.cif||"—")}</td><td><select data-field="manager">${workerOptions(d.manager)}</select></td><td><input type="date" data-field="prepared" value="${escapeHtml(d.prepared||"")}"></td><td><div class="amount-input"><input type="number" step="0.01" data-field="amount" value="${escapeHtml(d.amount||"")}" placeholder="0,00"><span>€</span></div></td><td><select data-field="payment"><option value="">Seleccionar…</option><option ${d.payment==="Pendiente"?"selected":""}>Pendiente</option><option ${d.payment==="Domiciliado"?"selected":""}>Domiciliado</option><option ${d.payment==="NRC"?"selected":""}>NRC</option><option ${d.payment==="Pagado"?"selected":""}>Pagado</option></select></td><td><input type="date" data-field="submitted" value="${escapeHtml(d.submitted||"")}"></td><td><select data-field="submittedBy">${workerOptions(d.submittedBy)}</select></td><td><select data-field="reviewedBy">${workerOptions(d.reviewedBy)}</select></td></tr>`}).join(""):`<tr><td colspan="9" class="table-empty">No hay clientes asignados al modelo ${escapeHtml(model)}. Puedes asignarlos desde Gestión → Nuevo cliente.</td></tr>`;
    body.querySelectorAll("input,select").forEach(control=>control.addEventListener("change",saveDeclarationRow));
  }catch{body.innerHTML='<tr><td colspan="9" class="table-empty">No se pudieron cargar las obligaciones fiscales.</td></tr>'}
}
function saveDeclarationRow(event){
  const row=event.target.closest("tr"),data={};
  row.querySelectorAll("[data-field]").forEach(field=>data[field.dataset.field]=field.value);
  localStorage.setItem(declarationKey(row.dataset.taxModelRow,row.dataset.taxClient),JSON.stringify(data));
}

function renderFolderView(name){
  const config=views[name];
  main.innerHTML=`
    <header>
      <button class="menu" id="menu" aria-label="Abrir menú">☰</button>
      <div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>${name}</h1></div>
      <button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button>
    </header>
    <section class="clients-head">
      <div><p class="eyebrow">${config.eyebrow}</p><h2>${config.title}</h2><p id="folderStatus">${config.description}</p></div>
      <button class="primary blue-button" id="connectFolder">${config.button}</button>
    </section>
    <section class="folder-panel">
      <div class="folder-toolbar">
        <div><button class="folder-back" id="folderBack" type="button" aria-label="Volver" hidden>←</button><strong id="folderName">${name}</strong><span id="folderCount">0 elementos</span></div>
        <div class="folder-actions"><label class="client-search"><span aria-hidden="true">⌕</span><input id="clientSearch" type="search" placeholder="Buscar…" aria-label="Buscar en ${name}"></label><button class="upload-button" id="uploadFiles" type="button" hidden>＋ Añadir documentación</button></div>
      </div>
      <div class="folder-grid" id="folderGrid">
        <div class="empty folder-empty"><span>▤</span><h4>Carpeta aún no conectada</h4><p>Pulsa “${config.button}” y selecciona ${config.path}.</p></div>
      </div>
    </section>`;
  bindHeader();
  document.querySelector("#connectFolder").addEventListener("click",()=>connectFolder(config));
  document.querySelector("#clientSearch").addEventListener("input",filterFolders);
  document.querySelector("#folderBack").addEventListener("click",goBackFolder);
  document.querySelector("#uploadFiles").addEventListener("click",uploadDocuments);
  restoreFolder(config);
}

async function connectFolder(config){
  if(!("showDirectoryPicker" in window)){
    alert("Esta función necesita Google Chrome o Microsoft Edge en el ordenador.");
    return;
  }
  try{
    const changing=document.querySelector("#connectFolder")?.dataset.connected==="true";
    let handle=changing ? null : await getSavedHandle(config.storageKey);
    if(handle){
      const permission=await handle.requestPermission({mode:"read"});
      if(permission!=="granted") handle=null;
    }
    if(!handle) handle=await window.showDirectoryPicker({mode:"read"});
    await saveHandle(config.storageKey,handle);
    folderHistory=[];
    await displayFolder(handle,config);
  }catch(error){
    if(error.name!=="AbortError") alert("No se pudo leer la carpeta seleccionada.");
  }
}

async function restoreFolder(config){
  try{
    const handle=await getSavedHandle(config.storageKey);
    if(!handle) return;
    const permission=await handle.queryPermission({mode:"read"});
    if(permission==="granted"){
      folderHistory=[];
      await displayFolder(handle,config);
    }else{
      document.querySelector("#folderStatus").textContent="Carpeta guardada. Pulsa el botón para volver a autorizar el acceso.";
      document.querySelector("#connectFolder").textContent="Autorizar carpeta guardada";
    }
  }catch(error){
    console.warn("No se pudo restaurar la carpeta",error);
  }
}

async function displayFolder(handle,config,fromBack=false){
  const entries=[];
  for await(const entry of handle.values()){
    entries.push({name:entry.name,kind:entry.kind,handle:entry});
  }
  entries.sort((a,b)=>a.kind===b.kind
    ? a.name.localeCompare(b.name,"es",{sensitivity:"base"})
    : a.kind==="directory" ? -1 : 1);
  currentEntries=entries;
  currentDirectoryHandle=handle;
  activeFolderConfig=config;
  document.querySelector("#folderName").textContent=handle.name;
  document.querySelector("#folderStatus").textContent="Carpeta conectada y guardada. Pulsa un cliente para ver sus documentos.";
  document.querySelector("#connectFolder").textContent="Cambiar carpeta";
  document.querySelector("#connectFolder").dataset.connected="true";
  document.querySelector("#clientSearch").value="";
  document.querySelector("#folderBack").hidden=folderHistory.length===0;
  const upload=document.querySelector("#uploadFiles");
  if(upload) upload.hidden=false;
  renderEntries(entries);
}

function renderEntries(entries){
  document.querySelector("#folderCount").textContent=`${entries.length} ${entries.length===1?"elemento":"elementos"}`;
  const grid=document.querySelector("#folderGrid");
  grid.innerHTML=entries.length
    ? entries.map((entry,index)=>`<button class="folder-card" data-index="${index}" data-client="${escapeHtml(entry.name.toLocaleLowerCase("es"))}"><span class="folder-icon ${entry.kind==="file"?"file":""}">${entry.kind==="directory"?"▰":"▤"}</span><span><strong>${escapeHtml(entry.name)}</strong><small>${entry.kind==="directory"?"Abrir carpeta":"Abrir documento"}</small></span></button>`).join("")
    : `<div class="empty folder-empty"><span>▤</span><h4>Carpeta vacía</h4><p>No contiene documentos ni subcarpetas.</p></div>`;
  grid.querySelectorAll(".folder-card").forEach(card=>card.addEventListener("click",()=>openEntry(Number(card.dataset.index))));
}

async function openEntry(index){
  const entry=currentEntries[index];
  if(!entry) return;
  if(entry.kind==="directory"){
    const currentName=document.querySelector("#folderName").textContent;
    const currentHandle=await findCurrentHandle();
    if(currentHandle) folderHistory.push(currentHandle);
    await displayFolder(entry.handle,activeFolderConfig);
  }else{
    const file=await entry.handle.getFile();
    const url=URL.createObjectURL(file);
    window.open(url,"_blank","noopener");
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
}

async function findCurrentHandle(){
  if(folderHistory.length){
    const parent=folderHistory[folderHistory.length-1];
    for await(const entry of parent.values()){
      if(entry.kind==="directory" && entry.name===document.querySelector("#folderName").textContent) return entry;
    }
  }
  return getSavedHandle(activeFolderConfig.storageKey);
}

async function goBackFolder(){
  const handle=folderHistory.pop();
  if(handle) await displayFolder(handle,activeFolderConfig,true);
}


async function uploadDocuments(){
  if(!currentDirectoryHandle) return;
  if(!("showOpenFilePicker" in window)){
    alert("Esta función necesita Google Chrome o Microsoft Edge.");
    return;
  }
  try{
    const permission=await currentDirectoryHandle.requestPermission({mode:"readwrite"});
    if(permission!=="granted") return;
    const fileHandles=await window.showOpenFilePicker({multiple:true});
    for(const sourceHandle of fileHandles){
      const file=await sourceHandle.getFile();
      const destination=await currentDirectoryHandle.getFileHandle(file.name,{create:true});
      const writable=await destination.createWritable();
      await writable.write(file);
      await writable.close();
    }
    await displayFolder(currentDirectoryHandle,activeFolderConfig,true);
    document.querySelector("#folderStatus").textContent=fileHandles.length===1
      ? "Documento añadido correctamente."
      : `${fileHandles.length} documentos añadidos correctamente.`;
  }catch(error){
    if(error.name!=="AbortError") alert("No se pudieron añadir los documentos. Comprueba el permiso de escritura.");
  }
}

function filterFolders(event){
  const query=event.target.value.trim().toLocaleLowerCase("es");
  const cards=[...document.querySelectorAll(".folder-card")];
  let visible=0;
  cards.forEach(card=>{
    const matches=card.dataset.client.includes(query);
    card.hidden=!matches;
    if(matches) visible++;
  });
  document.querySelector("#folderCount").textContent=query
    ? `${visible} ${visible===1?"resultado":"resultados"}`
    : `${cards.length} ${cards.length===1?"elemento":"elementos"}`;
}

function folderDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open("app-am-folders",3);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("handles"))request.result.createObjectStore("handles");if(!request.result.objectStoreNames.contains("signatureMetadata"))request.result.createObjectStore("signatureMetadata",{keyPath:"id"});if(!request.result.objectStoreNames.contains("clientMetadata"))request.result.createObjectStore("clientMetadata",{keyPath:"id"})};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
async function saveHandle(key,handle){
  const db=await folderDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction("handles","readwrite");
    tx.objectStore("handles").put(handle,key);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function getSavedHandle(key){
  const db=await folderDb();
  return new Promise((resolve,reject)=>{
    const request=db.transaction("handles","readonly").objectStore("handles").get(key);
    request.onsuccess=()=>resolve(request.result||null);
    request.onerror=()=>reject(request.error);
  });
}

async function saveSignatureMetadata(data){const d=await folderDb();return new Promise((ok,no)=>{const tx=d.transaction("signatureMetadata","readwrite");tx.objectStore("signatureMetadata").put(data);tx.oncomplete=()=>{d.close();ok()};tx.onerror=()=>no(tx.error)})}
async function getAllSignatureMetadata(){const d=await folderDb();return new Promise((ok,no)=>{const r=d.transaction("signatureMetadata","readonly").objectStore("signatureMetadata").getAll();r.onsuccess=()=>{d.close();ok(r.result||[])};r.onerror=()=>no(r.error)})}

async function saveClientMetadata(data){const d=await folderDb();return new Promise((ok,no)=>{const tx=d.transaction("clientMetadata","readwrite");tx.objectStore("clientMetadata").put(data);tx.oncomplete=()=>{d.close();ok()};tx.onerror=()=>no(tx.error)})}
async function getAllClientMetadata(){const d=await folderDb();return new Promise((ok,no)=>{const r=d.transaction("clientMetadata","readonly").objectStore("clientMetadata").getAll();r.onsuccess=()=>{d.close();ok(r.result||[])};r.onerror=()=>no(r.error)})}

function escapeHtml(value){
  const node=document.createElement("div");
  node.textContent=value;
  return node.innerHTML;
}

document.querySelectorAll("nav button").forEach(button=>button.addEventListener("click",()=>{
  document.querySelector("nav button.active")?.classList.remove("active");
  button.classList.add("active");
  closeMenu();
  if(views[button.dataset.title]) renderFolderView(button.dataset.title);
  else if(button.dataset.title==="Firmas digitales") renderSignatures();
  else if(button.dataset.title==="Holded") renderHolded();
  else if(button.dataset.title==="Declaraciones") renderDeclarations();
  else if(button.dataset.title==="Trabajadores") renderWorkers();
  else if(button.dataset.title==="Gestión") openProtectedManagement();
  else{
    main.innerHTML=homeMarkup;
    bindHeader();
    const title=document.querySelector("#pageTitle");
    if(title) title.textContent=button.dataset.title;
  }
}));


const chatWorkers=["Manuel Molinero","Álvaro Molinero","Francisco Molinero","Araceli Frías","Jesús Carratalá"];
let activeChatWorker=null;

function workerInitials(name){return name.split(" ").slice(0,2).map(part=>part[0]).join("").toUpperCase()}
function getChatMessages(name){try{return JSON.parse(localStorage.getItem("app-am-chat-"+name)||"[]")}catch{return[]}}
function saveChatMessages(name,messages){localStorage.setItem("app-am-chat-"+name,JSON.stringify(messages))}

function createWorkerChat(){
  const widget=document.createElement("div");
  widget.className="worker-chat";
  widget.innerHTML=`
    <button class="chat-launcher" id="chatLauncher" type="button" aria-label="Abrir chat de trabajadores">
      <span class="chat-launcher-icon">✉</span><span class="chat-launcher-label">Chat</span>
    </button>
    <section class="chat-panel" id="chatPanel" aria-hidden="true">
      <header class="chat-header"><div><span class="chat-kicker">EQUIPO</span><h2>Chat de trabajadores</h2></div><button id="closeChat" type="button" aria-label="Cerrar chat">×</button></header>
      <div id="chatContent"></div>
    </section>`;
  document.body.appendChild(widget);
  document.querySelector("#chatLauncher").addEventListener("click",toggleWorkerChat);
  document.querySelector("#closeChat").addEventListener("click",closeWorkerChat);
  renderChatContacts();
}

function toggleWorkerChat(){
  const panel=document.querySelector("#chatPanel");
  const opening=!panel.classList.contains("open");
  panel.classList.toggle("open",opening);
  panel.setAttribute("aria-hidden",String(!opening));
  document.querySelector("#chatLauncher").classList.toggle("active",opening);
}
function closeWorkerChat(){
  const panel=document.querySelector("#chatPanel");
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden","true");
  document.querySelector("#chatLauncher").classList.remove("active");
}
function renderChatContacts(){
  activeChatWorker=null;
  const content=document.querySelector("#chatContent");
  content.innerHTML=`<div class="chat-intro"><strong>¿A quién quieres escribir?</strong><span>Selecciona un trabajador para abrir el chat.</span></div><div class="chat-contacts">${chatWorkers.map(name=>`<button type="button" data-chat-worker="${escapeHtml(name)}"><span class="chat-avatar">${workerInitials(name)}</span><span><strong>${escapeHtml(name)}</strong><small>Abrir conversación</small></span><b>›</b></button>`).join("")}</div>`;
  content.querySelectorAll("[data-chat-worker]").forEach(button=>button.addEventListener("click",()=>renderConversation(button.dataset.chatWorker)));
}
function renderConversation(name){
  activeChatWorker=name;
  const messages=getChatMessages(name);
  const content=document.querySelector("#chatContent");
  content.innerHTML=`
    <div class="conversation-bar"><button id="chatBack" type="button" aria-label="Volver">←</button><span class="chat-avatar">${workerInitials(name)}</span><div><strong>${escapeHtml(name)}</strong><small>Conversación interna</small></div></div>
    <div class="chat-messages" id="chatMessages">${messages.length?messages.map(message=>`<div class="chat-message"><p>${escapeHtml(message.text)}</p><time>${escapeHtml(message.time)}</time></div>`).join(""):`<div class="chat-empty"><span>✦</span><strong>Inicia la conversación</strong><small>Escribe el primer mensaje para ${escapeHtml(name)}.</small></div>`}</div>
    <form class="chat-composer" id="chatForm"><textarea id="chatMessage" rows="1" maxlength="500" placeholder="Escribe un mensaje…" required></textarea><button type="submit" aria-label="Enviar mensaje">➤</button></form>
    <p class="chat-note">Entrega entre usuarios disponible cuando activemos los perfiles.</p>`;
  document.querySelector("#chatBack").addEventListener("click",renderChatContacts);
  document.querySelector("#chatForm").addEventListener("submit",sendChatMessage);
  document.querySelector("#chatMessage").focus();
  const box=document.querySelector("#chatMessages");box.scrollTop=box.scrollHeight;
}
function sendChatMessage(event){
  event.preventDefault();
  const input=document.querySelector("#chatMessage");
  const text=input.value.trim();
  if(!text||!activeChatWorker)return;
  const messages=getChatMessages(activeChatWorker);
  messages.push({text,time:new Intl.DateTimeFormat("es-ES",{hour:"2-digit",minute:"2-digit"}).format(new Date())});
  saveChatMessages(activeChatWorker,messages);
  renderConversation(activeChatWorker);
}

createWorkerChat();
