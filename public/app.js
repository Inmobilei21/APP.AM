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
let mobileSwipeStart=null;
document.addEventListener("touchstart",event=>{
  if(!window.matchMedia("(max-width:760px)").matches||sidebar.classList.contains("open"))return;
  if(event.target.closest("input,select,textarea,button,a,.tax-table-wrap,.folder-grid"))return;
  const touch=event.touches[0];
  mobileSwipeStart={x:touch.clientX,y:touch.clientY,time:Date.now()};
},{passive:true});
document.addEventListener("touchend",event=>{
  if(!mobileSwipeStart)return;
  const touch=event.changedTouches[0],dx=touch.clientX-mobileSwipeStart.x,dy=Math.abs(touch.clientY-mobileSwipeStart.y),elapsed=Date.now()-mobileSwipeStart.time;
  mobileSwipeStart=null;
  if(dx>=75&&dx>dy*1.3&&elapsed<900)openMenu();
},{passive:true});
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
    <div class="modal-shell" id="clientModal" aria-hidden="true"><div class="modal-backdrop" data-close-modal></div><section class="client-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-heading"><div><p class="eyebrow" id="modalEyebrow">ALTA DE CLIENTE</p><h2 id="modalTitle">Nuevo cliente</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <form id="newClientForm"><div class="client-identity-grid"><label>Nombre del cliente<input id="clientName" type="text" placeholder="Ej. Empresa García, S.L." required maxlength="120"></label><label>CIF<input id="clientCif" type="text" placeholder="Ej. B12345678" required maxlength="9" autocomplete="off"><small>9 caracteres</small></label></div><section class="internal-client-data"><div class="internal-section-heading"><strong>Datos internos de contacto</strong><small>Información visible únicamente para el despacho.</small></div><div class="internal-data-grid"><label>Administradores<textarea id="clientAdministrators" rows="3" placeholder="Un administrador por línea"></textarea></label><label>Teléfonos de contacto<textarea id="clientPhones" rows="3" placeholder="Un teléfono por línea"></textarea></label><label>Correos electrónicos<textarea id="clientEmails" rows="3" placeholder="Un correo por línea"></textarea></label></div></section><fieldset class="fiscal-obligations"><legend>Obligaciones fiscales</legend><div class="fiscal-periodicity"><div><strong>Periodicidad</strong><small>Se aplicará a todos los modelos seleccionados.</small></div><select id="fiscalPeriodicity" aria-label="Periodicidad fiscal"><option value="trimestral" selected>Trimestral</option><option value="mensual">Mensual</option></select></div><p>Selecciona los modelos fiscales del cliente.</p><div class="obligation-grid">${["111","115","123","130-131","303","349"].map(m=>`<div class="obligation-item"><label><input type="checkbox" data-tax-model="${m}"><strong>Modelo ${m}</strong></label></div>`).join("")}</div></fieldset><div class="attachment-grid"><label class="file-field"><span><strong>Escrituras</strong><small>Opcional · varios archivos</small></span><input id="clientWritings" type="file" multiple></label><label class="file-field"><span><strong>Declaraciones</strong><small>Opcional · varios archivos</small></span><input id="clientDeclarations" type="file" multiple></label><label class="file-field"><span><strong>Firma digital</strong><small>Opcional · certificado digital</small></span><input id="clientSignature" type="file" accept=".p12,.pfx,.cer,.crt"></label></div><div class="signature-data"><label>Fecha de caducidad<input id="signatureExpiry" type="date"></label><label>Contraseña<input id="signaturePassword" type="password" autocomplete="new-password" placeholder="Contraseña de la firma"></label></div><p class="form-message" id="formMessage"></p><div class="modal-actions"><button type="button" class="secondary-button" data-close-modal>Cancelar</button><button class="primary blue-button" type="submit">Guardar cliente</button></div></form></section></div>`;
  bindHeader();
  document.querySelector("#openNewClient").addEventListener("click",openClientModal);
  document.querySelectorAll("[data-close-modal]").forEach(x=>x.addEventListener("click",closeClientModal));
  document.querySelector("#newClientForm").addEventListener("submit",createClient);
  document.querySelector("#managementSearch").addEventListener("input",filterManagementClients);
  loadManagementClients();
}
function showClientModal(){const m=document.querySelector("#clientModal");m.classList.add("open");m.setAttribute("aria-hidden","false");setTimeout(()=>document.querySelector("#clientName")?.focus(),180)}
function openClientModal(){
  const form=document.querySelector("#newClientForm");form.reset();delete form.dataset.editing;
  document.querySelector("#clientName").readOnly=false;
  document.querySelector("#modalEyebrow").textContent="ALTA DE CLIENTE";
  document.querySelector("#modalTitle").textContent="Nuevo cliente";
  form.querySelector("button[type=submit]").textContent="Guardar cliente";
  document.querySelector("#formMessage").textContent="";
  showClientModal();
}
async function openEditClient(name){
  const form=document.querySelector("#newClientForm");form.reset();form.dataset.editing=name;
  const clients=await getAllClientMetadata(),data=clients.find(client=>client.id===name)||{name,cif:"",periodicity:"trimestral",obligations:{}};
  const nameInput=document.querySelector("#clientName");nameInput.value=name;nameInput.readOnly=true;
  document.querySelector("#clientCif").value=data.cif||"";
  document.querySelector("#clientAdministrators").value=data.administrators||"";
  document.querySelector("#clientPhones").value=data.phones||"";
  document.querySelector("#clientEmails").value=data.emails||"";
  document.querySelector("#fiscalPeriodicity").value=data.periodicity||"trimestral";
  document.querySelectorAll("[data-tax-model]").forEach(check=>check.checked=Boolean(data.obligations&&data.obligations[check.dataset.taxModel]));
  document.querySelector("#modalEyebrow").textContent="FICHA INTERNA";
  document.querySelector("#modalTitle").textContent="Editar cliente";
  form.querySelector("button[type=submit]").textContent="Guardar cambios";
  document.querySelector("#formMessage").textContent="";
  showClientModal();
}
function closeClientModal(){const m=document.querySelector("#clientModal");m.classList.remove("open");m.setAttribute("aria-hidden","true")}
async function loadManagementClients(){
  const grid=document.querySelector("#managementGrid");
  try{const root=await getSavedHandle("clients-folder");if(!root||await root.queryPermission({mode:"read"})!=="granted"){grid.innerHTML='<div class="empty folder-empty"><h4>Carpeta de Clientes no autorizada</h4><p>Entra primero en Clientes y autoriza su carpeta.</p></div>';return}
  const clients=[];for await(const x of root.values())if(x.kind==="directory")clients.push(x.name);clients.sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));
  grid.innerHTML=clients.length?clients.map(n=>`<div class="folder-card management-client" data-client="${escapeHtml(n.toLocaleLowerCase("es"))}" data-client-name="${escapeHtml(n)}" tabindex="0" role="button"><span class="folder-icon">▰</span><span><strong>${escapeHtml(n)}</strong><small>Cliente</small></span><button class="client-edit-action" type="button" data-edit-client="${escapeHtml(n)}">Editar</button></div>`).join(""):'<div class="empty folder-empty"><h4>No hay clientes</h4></div>';document.querySelector("#managementCount").textContent=`${clients.length} ${clients.length===1?"cliente":"clientes"}`;grid.querySelectorAll(".management-client").forEach(card=>{const select=()=>{grid.querySelector(".management-client.selected")?.classList.remove("selected");card.classList.add("selected")};card.addEventListener("click",select);card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();select()}})});grid.querySelectorAll("[data-edit-client]").forEach(button=>button.addEventListener("click",event=>{event.stopPropagation();openEditClient(button.dataset.editClient)}))}catch{grid.innerHTML='<div class="empty folder-empty"><h4>No se pudieron cargar los clientes</h4></div>'}
}
function filterManagementClients(e){const q=e.target.value.trim().toLocaleLowerCase("es");const cards=[...document.querySelectorAll(".management-client")];let v=0;cards.forEach(c=>{const s=c.dataset.client.includes(q);c.hidden=!s;if(s)v++});document.querySelector("#managementCount").textContent=q?`${v} resultados`:`${cards.length} clientes`}
async function createClient(e){
  e.preventDefault();const input=document.querySelector("#clientName"),message=document.querySelector("#formMessage"),button=e.target.querySelector("button[type=submit]");const entered=input.value.trim(),name=entered.replace(/[. ]+$/,"");if(!name)return;if(/[\\/:*?"<>|]/.test(name)){message.className="form-message error";message.textContent="El nombre contiene caracteres que Windows no permite.";return}button.disabled=true;button.textContent="Guardando…";
  try{let root=await getSavedHandle("clients-folder");if(root&&await root.requestPermission({mode:"readwrite"})!=="granted")root=null;if(!root){root=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("clients-folder",root)}
  let existed=true;try{await root.getDirectoryHandle(name)}catch{existed=false}const client=await root.getDirectoryHandle(name,{create:true}),folders={};for(const f of defaultClientFolders)folders[f]=await client.getDirectoryHandle(f,{create:true});const accountingYear=await folders["CONTABILIDAD"].getDirectoryHandle(String(new Date().getFullYear()),{create:true});for(const subfolder of ["1T","2T","3T","4T","BANCOS"])await accountingYear.getDirectoryHandle(subfolder,{create:true});
  await copyFileList(document.querySelector("#clientWritings").files,folders["ESCRITURAS"]);await copyFileList(document.querySelector("#clientDeclarations").files,folders["DECLARACIONES"]);
  const sig=document.querySelector("#clientSignature");if(sig.files.length){let signaturesRoot=await getSavedHandle("signatures-folder");if(signaturesRoot&&await signaturesRoot.requestPermission({mode:"readwrite"})!=="granted")signaturesRoot=null;if(!signaturesRoot){signaturesRoot=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("signatures-folder",signaturesRoot)}const file=sig.files[0],savedName=`${name} - ${file.name}`;await copyNamedFile(file,signaturesRoot,savedName);await saveSignatureMetadata({id:savedName,client:name,document:savedName,password:document.querySelector("#signaturePassword").value,expiry:document.querySelector("#signatureExpiry").value})}
  const obligations={};document.querySelectorAll("[data-tax-model]:checked").forEach(check=>{obligations[check.dataset.taxModel]=true});await saveClientMetadata({id:name,name,cif:document.querySelector("#clientCif").value.trim().toUpperCase(),administrators:document.querySelector("#clientAdministrators").value.trim(),phones:document.querySelector("#clientPhones").value.trim(),emails:document.querySelector("#clientEmails").value.trim(),periodicity:document.querySelector("#fiscalPeriodicity").value,obligations});
  message.className="form-message success";message.textContent=existed?"Cliente actualizado correctamente.":`Cliente “${name}” creado correctamente.`;e.target.reset();await loadManagementClients();setTimeout(closeClientModal,850)}
  catch(error){if(error.name!=="AbortError"){message.className="form-message error";message.textContent="No se pudo guardar el cliente. Comprueba el permiso de escritura."}}finally{button.disabled=false;button.textContent=e.target.dataset.editing?"Guardar cambios":"Guardar cliente"}
}
async function copyFileList(list,dir){for(const file of list)await copyNamedFile(file,dir,file.name)}
async function copyNamedFile(file,dir,name){const dest=await dir.getFileHandle(name,{create:true}),w=await dest.createWritable();await w.write(file);await w.close()}
function renderHolded(){
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Holded</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="holded-panel">
      <div class="holded-original-logo"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAuIAAADnCAIAAADU06TyAAAQAElEQVR4AeydDZwUxZ33axI38rKbBCKoqOgTIvng23FqHg26j8npadSEuBg0AlFAEwGBCIJGhHMNgomgJEZd9DBADjWeCoaASTxNzsPw0SQag0Y/atRET3yHy4miQTPPd7bZ2dmZfqnu6ZnpnvnNp7a3uvpf/6r6Vk/Xr6umZz6U1UsEREAEREAEREAEEkngQ0YvERABERABERCB2AjIUZwEJFPipClfIiACIiACIiACMRKQTIkRplyJgAiIQDoJqNYikFQCkilJ7RnVSwREQAREQAQanoBkSsOfAgIgAukkoFqLgAg0AgHJlEboZbVRBERABERABFJJQDIlld2mSqeTgGotAiIgAiIQjoBkSjheshYBERABERABEagaAcmUqqFOZ0GqtQiIgAiIgAjUjoBkSu3Yq2QREAEREAEREAFfAnUoU3zbq4MiIAIiIAIiIAKpISCZkpquUkVFQAREQAREoCYEalioZEoN4atoERABERABERABPwKSKX50dEwEREAERCCdBFTrOiEgmVInHalmiIAIiIAIiED9EZBMqb8+VYtEQATSSUC1FgERKCEgmVKCRAkiIAIiIAIiIALJICCZkox+UC1EIJ0EVGsREAERqCgByZSK4pVzERABERABERCB6AQkU6KzU850ElCtRUAEREAEUkNAMiU1XaWKioAIiIAIiECjEZBMSUOPq44iIAIiIAIi0JAEJFMastvVaBEQAREQARFIA4FKyZQ0tF11FAEREAEREAERSDQByZREd48qJwIiIAIiIAIOgcbcSqY0Zr+r1SIgAiIgAiKQAgKSKSnoJFVRBERABNJJQLUWgXIJSKaUS1D5RUAEREAEREAEKkRAMqVCYOVWBEQgnQRUaxEQgSQRkExJUm+oLiIgAiIgAiIgAgUEJFMKYCgqAukkoFqLgAiIQL0SkEyp155Vu0RABERABEQg9QQkU1LfhelsgGotAiIgAiIgAsEEJFOCGclCBERABERABESgJgQkU6yxy1AEREAEREAERKC6BCRTqstbpYmACIiACIiACDgELLaSKRaQZCICIiACIiACIlALApIptaCuMkVABERABNJJQLWuMgHJlCoDV3EiIAIiIAIiIAK2BCRTbEnJTgREQATSSUC1FoEUE5BMSXHn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Zl1lpi/KhYs6pFE8MClZBERABERABGIgIJkSHmJTU26Vh4UeJEv43MohAiIgAiIgAg1JIEqjJVOiUFMeERABERABERCBKhCQTKkCZBUhAiIgAiKQTgKqda0JSKbUugdUvgiIgAiIgAiIgAcByRQPMEoWAREQgXQSUK1FoJ4ISKbUU2+qLSIgAiIgAiJQVwQkU+qqO9UYEUgnAdVaBERABNwJSKa4c1GqCIiACIiACIhAzQlIptS8C1SBdBJQrUVABERABCpPQDKl8oxVggiIgAiIgAiIQCQCkimRsKUzk2otAiIgAiIgAukiIJmSrv5SbUVABERABESggQgkXKY0UE+oqSIgAiIgAiIgAkUEJFOKgGhXBERABERABOqYQMqaJpmSsg5TdUVABERABESgcQhIpjROX6ulIiACIpBOAqp1AxOQTGngzlfTRUAEREAERCDZBCRTkt0/qp0IiEA6CajWIiACsRCQTIkFo5yIgAiIgAiIgAjET0AyJX6m8igC6SSgWouACIhA4ghIpiSuS1QhERABERABERABh4BkisNB23QSUK1FQAREQATqmoBkSl13rxonAiIgAiIgAmkmIJlS7d5TeSIgAiIgAiIgApYEJFMsQclMBERABERABESg2gRsZEq166TyREAEREAEREAERAACkilAUBABERABERCBahJQWbYEJFNsSclOBERABERABESgygQkU6oMXMWJgAiIQDoJqNYiUAsCkim1oK4yRUAEREAEREAELAhIplhAkokIiEA6CajWIiACaScgmZL2HlT9RUAEREAERKBuCUim1G3XqmHpJKBai4AIiIAIdBOQTOlmoZgIiIAIiIAIiECiCEimJKo70lkZ1VoEREAEREAEKkNAMqUyXOVVBERABERABESgbAINKlPK5iYHIiACIiACIiACFScgmVJxxCpABERABERABOqeQIUaKJlSIbByKwIiIAIiIAIiUC4ByZRyCSq/CIiACIhAOgmo1ikgIJmSgk5SFUVABERABESgMQlIpjRmv6vVIiAC6SSgWotAgxGQTGmwDldzRUAEREAERCA9BCRT0tNXqqkIpJOAai0CIiACkQlIpkRGp4wiIAIiIAIiIAKVJSCZUlm+8p5OAqq1CIiACIhAIghIpiSiG1QJERABERABERCBUgKSKaVM0pmiWouACIiACIhA3RGQTKm7LlWDREAEREAERKBeCNRSptQLQ7VDBERABERABESgIgQkUyqCVU5FQAREQAREoPoE6q9EyZT661O1SAREQAREQATqhIBkSp10pJohAiIgAukkoFqLgB8ByRQ/OjomAiIgAiIgAiJQQwKSKTWEr6JFQATSSUC1FgERqBYByZRqkVY5IiACIiACIiACIQlIpoQEJnMRSCcB1VoEREAE0khAMiWNvaY6i4AIiIAIiEBDEJBMaYhuTmcjVWsREAEREIFGJyCZ0uhngNovAiIgAiIgAokl8P8BAAD//331pFsAAAAGSURBVAMADUBGRZQHY+8AAAAASUVORK5CYII=" alt="Holded"></div>
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


const TASKS_STORAGE_KEY="app-am-tasks";
const taskStatuses=[
  {id:"pending",label:"Pte. Inicio"},
  {id:"progress",label:"En proceso"},
  {id:"done",label:"Final"}
];

function getTasks(){
  try{return JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY)||"[]")}
  catch{return[]}
}
function saveTasks(tasks){localStorage.setItem(TASKS_STORAGE_KEY,JSON.stringify(tasks))}
function taskDateLabel(value){return value?new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(value+"T12:00:00")):"Sin plazo"}
function taskCountdown(value){
  if(!value)return{label:"Sin plazo final",className:""};
  const today=new Date();today.setHours(0,0,0,0);
  const end=new Date(value+"T00:00:00");
  const days=Math.round((end-today)/86400000);
  if(days<0)return{label:`Vencida hace ${Math.abs(days)} ${Math.abs(days)===1?"día":"días"}`,className:"overdue"};
  if(days===0)return{label:"Vence hoy",className:"today"};
  return{label:`${days===1?"Queda":"Quedan"} ${days} ${days===1?"día":"días"}`,className:days<=3?"soon":""};
}
async function getTaskClientNames(){
  const names=new Set();
  try{(await getAllClientMetadata()).forEach(client=>client?.name&&names.add(client.name))}catch{}
  try{
    const root=await getSavedHandle("clients-folder");
    if(root&&await root.queryPermission({mode:"read"})==="granted"){
      for await(const entry of root.values())if(entry.kind==="directory")names.add(entry.name);
    }
  }catch{}
  return [...names].sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));
}
function taskCardMarkup(task){
  const countdown=taskCountdown(task.finalDate);
  const concept=task.concept==="Otro"?(task.customConcept||"Otro"):task.concept;
  return `<article class="task-note" draggable="true" data-task-id="${escapeHtml(task.id)}">
    <div class="task-note-top"><span class="task-concept">${escapeHtml(concept||"Sin concepto")}</span><span class="task-grip" aria-hidden="true">⠿</span></div>
    <h4>${escapeHtml(task.client||"Sin cliente")}</h4>
    <div class="task-deadline"><span>Plazo: ${taskDateLabel(task.finalDate)}</span><strong class="${countdown.className}">${countdown.label}</strong></div>
    ${task.description?`<p>${escapeHtml(task.description)}</p>`:""}
    <div class="task-assignee"><span>${escapeHtml(workerInitials(task.assigned||"—"))}</span><small>${escapeHtml(task.assigned||"Sin encargado")}</small></div>
    <label class="task-mobile-state">Estado<select data-task-state="${escapeHtml(task.id)}">${taskStatuses.map(status=>`<option value="${status.id}" ${status.id===task.status?"selected":""}>${status.label}</option>`).join("")}</select></label>
  </article>`;
}
function renderTaskBoard(){
  const tasks=getTasks();
  taskStatuses.forEach(status=>{
    const list=document.querySelector(`[data-task-list="${status.id}"]`);
    const count=document.querySelector(`[data-task-count="${status.id}"]`);
    if(!list)return;
    const items=tasks.filter(task=>task.status===status.id);
    count.textContent=items.length;
    list.innerHTML=items.length?items.map(taskCardMarkup).join(""):`<div class="task-empty">Arrastra aquí una tarea</div>`;
  });
  document.querySelectorAll(".task-note").forEach(card=>{
    card.addEventListener("dragstart",event=>{
      event.dataTransfer.effectAllowed="move";
      event.dataTransfer.setData("text/plain",card.dataset.taskId);
      requestAnimationFrame(()=>card.classList.add("dragging"));
    });
    card.addEventListener("dragend",()=>card.classList.remove("dragging"));
  });
  document.querySelectorAll("[data-task-list]").forEach(list=>{
    list.addEventListener("dragover",event=>{event.preventDefault();event.dataTransfer.dropEffect="move";list.closest(".task-column").classList.add("drag-over")});
    list.addEventListener("dragleave",event=>{if(!list.contains(event.relatedTarget))list.closest(".task-column").classList.remove("drag-over")});
    list.addEventListener("drop",event=>{
      event.preventDefault();
      list.closest(".task-column").classList.remove("drag-over");
      changeTaskStatus(event.dataTransfer.getData("text/plain"),list.dataset.taskList);
    });
  });
  document.querySelectorAll("[data-task-state]").forEach(select=>select.addEventListener("change",()=>changeTaskStatus(select.dataset.taskState,select.value)));
}
function changeTaskStatus(id,status){
  const tasks=getTasks(),task=tasks.find(item=>item.id===id);
  if(!task||!taskStatuses.some(item=>item.id===status))return;
  task.status=status;saveTasks(tasks);renderTaskBoard();
}
async function renderTasks(){
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">ORGANIZACIÓN DEL DESPACHO</p><h1>Tareas</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="tasks-head">
      <div><p class="eyebrow">CONTROL DE TAREAS</p><h2>Tablero de trabajo</h2><p>Organiza los plazos y mueve cada nota según avance el trabajo.</p></div>
      <button class="primary blue-button" id="openTaskModal">＋ Añadir tarea</button>
    </section>
    <section class="task-board" aria-label="Tablero de tareas">
      ${taskStatuses.map(status=>`<section class="task-column status-${status.id}" data-task-status="${status.id}">
        <header class="task-column-head"><div><span></span><h3>${status.label}</h3></div><strong data-task-count="${status.id}">0</strong></header>
        <div class="task-list" data-task-list="${status.id}"></div>
      </section>`).join("")}
    </section>
    <div class="modal-shell task-modal-shell" id="taskModal" aria-hidden="true">
      <div class="modal-backdrop" data-close-task></div>
      <section class="client-modal task-modal" role="dialog" aria-modal="true" aria-labelledby="taskModalTitle">
        <div class="client-modal-head"><div><p class="eyebrow">NUEVA TAREA</p><h2 id="taskModalTitle">Añadir tarea</h2></div><button class="modal-close" type="button" data-close-task aria-label="Cerrar">×</button></div>
        <form id="taskForm">
          <div class="task-form-grid">
            <label class="task-client-field">Cliente<div class="task-client-combobox"><span class="task-search-icon">⌕</span><input id="taskClient" type="search" autocomplete="off" placeholder="Buscar cliente…" required aria-autocomplete="list" aria-controls="taskClientResults"><div class="task-client-results" id="taskClientResults" role="listbox" hidden></div></div></label>
            <label>Encargado<select id="taskAssigned" required><option value="">Selecciona un trabajador</option>${workers.map(name=>`<option>${escapeHtml(name)}</option>`).join("")}</select></label>
            <label>Concepto<select id="taskConcept" required><option value="">Selecciona un concepto</option><option>Declaraciones</option><option>Notificación</option><option>Gestión</option><option>Cuentas Anuales</option><option>Otro</option></select></label>
            <label id="customConceptField" hidden>Concepto concreto<input id="taskCustomConcept" maxlength="80" placeholder="Escribe el concepto"></label>
            <label>Plazo de inicio<input id="taskStartDate" type="date" readonly></label>
            <label>Plazo final<input id="taskFinalDate" type="date" required></label>
            <label class="task-description-field">Descripción<textarea id="taskDescription" rows="4" maxlength="600" placeholder="Información útil para orientar la tarea"></textarea></label>
          </div>
          <p class="form-message" id="taskFormMessage"></p>
          <div class="modal-actions"><button class="task-cancel-button" type="button" data-close-task><span aria-hidden="true">×</span> Cancelar</button><button class="primary blue-button" type="submit">Guardar tarea</button></div>
        </form>
      </section>
    </div>`;
  bindHeader();renderTaskBoard();
  const modal=document.querySelector("#taskModal"),form=document.querySelector("#taskForm");
  let taskClientNames=[];
  const close=()=>{modal.classList.remove("open");modal.setAttribute("aria-hidden","true")};
  document.querySelectorAll("[data-close-task]").forEach(button=>button.addEventListener("click",close));
  const clientInput=document.querySelector("#taskClient"),clientResults=document.querySelector("#taskClientResults");
  function renderTaskClientResults(query){
    const normalized=query.trim().toLocaleLowerCase("es");
    const matches=taskClientNames.filter(name=>name.toLocaleLowerCase("es").includes(normalized)).slice(0,10);
    clientResults.innerHTML=matches.length?matches.map(name=>`<button type="button" role="option" data-task-client="${escapeHtml(name)}"><span>⌕</span><strong>${escapeHtml(name)}</strong></button>`).join(""):`<div class="task-client-no-results">${taskClientNames.length?"No se encontraron clientes":"No hay clientes disponibles"}</div>`;
    clientResults.hidden=false;
  }
  clientInput.addEventListener("focus",()=>renderTaskClientResults(clientInput.value));
  clientInput.addEventListener("input",()=>renderTaskClientResults(clientInput.value));
  clientInput.addEventListener("blur",()=>setTimeout(()=>clientResults.hidden=true,140));
  clientInput.addEventListener("keydown",event=>{
    if(event.key==="Escape"){clientResults.hidden=true;clientInput.blur()}
    if(event.key==="Enter"&&!clientResults.hidden){
      const first=clientResults.querySelector("[data-task-client]");
      if(first){event.preventDefault();clientInput.value=first.dataset.taskClient;clientResults.hidden=true}
    }
  });
  clientResults.addEventListener("mousedown",event=>{
    const option=event.target.closest("[data-task-client]");if(!option)return;
    event.preventDefault();clientInput.value=option.dataset.taskClient;clientResults.hidden=true;
  });
  document.querySelector("#openTaskModal").addEventListener("click",async()=>{
    form.reset();
    const today=new Date().toISOString().slice(0,10);
    document.querySelector("#taskStartDate").value=today;
    document.querySelector("#taskFinalDate").min=today;
    document.querySelector("#customConceptField").hidden=true;
    taskClientNames=await getTaskClientNames();
    clientInput.value="";
    modal.classList.add("open");modal.setAttribute("aria-hidden","false");
    renderTaskClientResults("");
    setTimeout(()=>clientInput.focus(),180);
  });
  document.querySelector("#taskConcept").addEventListener("change",event=>{
    const custom=document.querySelector("#customConceptField"),input=document.querySelector("#taskCustomConcept");
    custom.hidden=event.target.value!=="Otro";input.required=event.target.value==="Otro";
    if(custom.hidden)input.value="";
  });
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const concept=document.querySelector("#taskConcept").value;
    const task={
      id:`task-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      client:document.querySelector("#taskClient").value.trim(),
      assigned:document.querySelector("#taskAssigned").value,
      concept,
      customConcept:document.querySelector("#taskCustomConcept").value.trim(),
      description:document.querySelector("#taskDescription").value.trim(),
      startDate:new Date().toISOString(),
      finalDate:document.querySelector("#taskFinalDate").value,
      status:"pending"
    };
    const tasks=getTasks();tasks.push(task);saveTasks(tasks);close();renderTaskBoard();
  });
}


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
const taxQuarters=[{id:"1T",label:"1.º Trimestre"},{id:"2T",label:"2.º Trimestre"},{id:"3T",label:"3.º Trimestre"},{id:"4T",label:"4.º Trimestre"}];
const taxMonths=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((label,index)=>({id:"M"+String(index+1).padStart(2,"0"),label}));
let activeTaxType="trimestral";
let activeTaxModel="111";
let activeTaxQuarter="1T";
const taxUnlocks=new Set();

const withholdingMonthly=[
 ["2026-02-01","2026-02-17","2026-02-20"],["2026-03-01","2026-03-16","2026-03-20"],["2026-04-01","2026-04-15","2026-04-20"],["2026-05-01","2026-05-15","2026-05-20"],
 ["2026-06-01","2026-06-17","2026-06-22"],["2026-07-01","2026-07-15","2026-07-20"],["2026-08-01","2026-08-17","2026-08-20"],["2026-09-01","2026-09-16","2026-09-21"],
 ["2026-10-01","2026-10-15","2026-10-20"],["2026-11-01","2026-11-17","2026-11-20"],["2026-12-01","2026-12-16","2026-12-21"],["2027-01-01","2027-01-15","2027-01-20"]
];
const vatMonthly=[
 ["2026-02-01","2026-02-25","2026-03-02"],["2026-03-01","2026-03-25","2026-03-30"],["2026-04-01","2026-04-27","2026-04-30"],["2026-05-01","2026-05-27","2026-06-01"],
 ["2026-06-01","2026-06-25","2026-06-30"],["2026-07-01","2026-07-27","2026-07-30"],["2026-08-01","2026-08-26","2026-08-31"],["2026-09-01","2026-09-25","2026-09-30"],
 ["2026-10-01","2026-10-27","2026-10-30"],["2026-11-01","2026-11-25","2026-11-30"],["2026-12-01","2026-12-24","2026-12-30"],["2027-01-01","2027-01-25","2027-02-01"]
];
const form349Monthly=[
 ["2026-02-01",null,"2026-02-20"],["2026-03-01",null,"2026-03-20"],["2026-04-01",null,"2026-04-20"],["2026-05-01",null,"2026-05-20"],
 ["2026-06-01",null,"2026-06-22"],["2026-07-01",null,"2026-07-20"],["2026-08-01",null,"2026-09-21"],["2026-09-01",null,"2026-09-21"],
 ["2026-10-01",null,"2026-10-20"],["2026-11-01",null,"2026-11-20"],["2026-12-01",null,"2026-12-21"],["2027-01-01",null,"2027-02-01"]
];

function taxDeadline(model,period,type=activeTaxType){
  if(type==="mensual"){
    if(model==="130-131")return null;
    const index=Number(period.slice(1))-1,row=model==="303"?vatMonthly[index]:model==="349"?form349Monthly[index]:withholdingMonthly[index];
    if(!row)return null;
    return{start:row[0],domicileEnd:row[1],presentationEnd:row[2],provisional:index===11};
  }
  const standard={
    "1T":{start:"2026-04-01",domicileEnd:"2026-04-15",presentationEnd:"2026-04-20"},
    "2T":{start:"2026-07-01",domicileEnd:"2026-07-15",presentationEnd:"2026-07-20"},
    "3T":{start:"2026-10-01",domicileEnd:"2026-10-15",presentationEnd:"2026-10-20"}
  };
  if(standard[period]){const d={...standard[period]};if(model==="349")d.domicileEnd=null;return d}
  if(["130-131","303"].includes(model))return{start:"2027-01-01",domicileEnd:"2027-01-25",presentationEnd:"2027-02-01",provisional:true};
  if(model==="349")return{start:"2027-01-01",domicileEnd:null,presentationEnd:"2027-02-01",provisional:true};
  return{start:"2027-01-01",domicileEnd:"2027-01-15",presentationEnd:"2027-01-20",provisional:true};
}
function formatTaxDate(value){return new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"long",year:"numeric"}).format(new Date(value+"T12:00:00"))}
function taxWindowState(model,period,type=activeTaxType){
  const deadline=taxDeadline(model,period,type);
  if(!deadline)return{locked:true,type:"unavailable",label:"No disponible",deadline:null};
  const today=new Date(),start=new Date(deadline.start+"T00:00:00"),end=new Date(deadline.presentationEnd+"T23:59:59"),lockAt=new Date(end);lockAt.setDate(lockAt.getDate()+10);
  const key=model+"-"+type+"-"+period;
  if(today<start)return{locked:true,type:"upcoming",label:"Aún no abierto",deadline};
  if(today>lockAt&&!taxUnlocks.has(key))return{locked:true,type:"expired",label:"Periodo bloqueado",deadline};
  if(today>end)return{locked:false,type:"grace",label:"Plazo finalizado · edición disponible durante 10 días",deadline};
  return{locked:false,type:"open",label:"Plazo abierto",deadline};
}
function taxPeriodOptions(){return activeTaxType==="mensual"?taxMonths:taxQuarters}
function fillTaxPeriodSelect(){
  const select=document.querySelector("#taxQuarter");if(!select)return;
  select.innerHTML=taxPeriodOptions().map(period=>`<option value="${period.id}">${period.label}</option>`).join("");
  select.value=activeTaxQuarter;
}
function syncTaxModelTabs(){
  document.querySelectorAll("[data-tax-tab]").forEach(tab=>{const unavailable=activeTaxType==="mensual"&&tab.dataset.taxTab==="130-131";tab.disabled=unavailable;tab.classList.toggle("active",tab.dataset.taxTab===activeTaxModel)});
}


let declarationDocsCache=null;
let declarationDocsRoot=null;
let declarationObjectUrls=[];

function normalizeFiscalText(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim().replace(/\s+/g," ");
}
function normalizeFiscalClient(value){
  return normalizeFiscalText(value)
    .replace(/\b(SOCIEDAD LIMITADA PROFESIONAL|SOCIEDAD LIMITADA|SOCIEDAD ANONIMA|SLP|SLL|SL|SA|CB|SC|SCOOP)\b/g," ")
    .replace(/\s+/g," ").trim();
}
function fiscalPeriodAliases(type,period){
  if(type==="trimestral"){
    const number=String(period).replace(/\D/g,"");
    const words={1:["PRIMER","PRIMERO"],2:["SEGUNDO"],3:["TERCER","TERCERO"],4:["CUARTO"]}[number]||[];
    return [`${number}T`,`T${number}`,`${number} TRIMESTRE`,...words.map(word=>`${word} TRIMESTRE`)];
  }
  const month=Number(String(period).replace(/\D/g,""));
  const names=["","ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
  return [`M${String(month).padStart(2,"0")}`,names[month]].filter(Boolean);
}
function fiscalModelMatches(text,model){
  const models=model==="130-131"?["130","131"]:[model];
  return models.some(number=>{
    const separated=new RegExp(`(^| )${number}( |$)`).test(text);
    const joinedPeriod=new RegExp(`(^| )${number}(?=(?:[1-4]T|T[1-4]|M(?:0[1-9]|1[0-2])|20\\d{2}))`).test(text);
    return separated||joinedPeriod;
  });
}
async function collectDeclarationPdfs(directory,path="",depth=0){
  if(depth>5)return[];
  const documents=[];
  for await(const entry of directory.values()){
    const nextPath=path?`${path}/${entry.name}`:entry.name;
    if(entry.kind==="directory")documents.push(...await collectDeclarationPdfs(entry,nextPath,depth+1));
    else if(/\.pdf$/i.test(entry.name))documents.push({handle:entry,path:nextPath,name:entry.name,normalized:normalizeFiscalText(nextPath)});
  }
  return documents;
}
async function getDeclarationPdfs(force=false){
  const root=await getSavedHandle("declarations-folder");
  if(!root||await root.queryPermission({mode:"read"})!=="granted")return[];
  if(force||root!==declarationDocsRoot||!declarationDocsCache){
    declarationDocsRoot=root;
    declarationDocsCache=await collectDeclarationPdfs(root);
  }
  return declarationDocsCache;
}
function declarationClientScore(clientName,documentText){
  const client=normalizeFiscalClient(clientName);
  if(!client)return 0;
  if(documentText.includes(client))return 1;
  const tokens=client.split(" ").filter(token=>token.length>1);
  if(!tokens.length)return 0;
  const matched=tokens.filter(token=>new RegExp(`(^| )${token}( |$)`).test(documentText)).length;
  return matched/tokens.length;
}
async function declarationDocumentsForClients(clients,model,type,period,year){
  declarationObjectUrls.forEach(url=>URL.revokeObjectURL(url));declarationObjectUrls=[];
  const all=await getDeclarationPdfs();
  if(!all.length)return new Map();
  const typeWord=type==="mensual"?"MENSUAL":"TRIMESTRAL";
  const hasTypeFolders=all.some(doc=>/\b(MENSUAL|TRIMESTRAL)\b/.test(doc.normalized));
  const aliases=fiscalPeriodAliases(type,period);
  const candidates=all.filter(doc=>{
    if(hasTypeFolders&&!new RegExp(`(^| )${typeWord}( |$)`).test(doc.normalized))return false;
    if(!doc.normalized.includes(String(year)))return false;
    if(!fiscalModelMatches(doc.normalized,model))return false;
    return aliases.some(alias=>doc.normalized.includes(normalizeFiscalText(alias)));
  });
  const result=new Map(),used=new Set();
  clients.forEach(client=>{
    let best=null,bestScore=0;
    candidates.forEach(doc=>{
      if(used.has(doc.path))return;
      const score=declarationClientScore(client.name,doc.normalized);
      if(score>bestScore){best=doc;bestScore=score}
    });
    if(best&&bestScore>=0.6){result.set(client.name,best);used.add(best.path)}
  });
  for(const [client,doc] of result){
    try{const file=await doc.handle.getFile();doc.url=URL.createObjectURL(file);declarationObjectUrls.push(doc.url)}
    catch{result.delete(client)}
  }
  return result;
}
function declarationDocumentMarkup(document){
  if(!document)return'<span class="declaration-document-missing">No encontrado</span>';
  return `<div class="declaration-document-actions"><a href="${document.url}" target="_blank" rel="noopener" title="${escapeHtml(document.name)}"><span>PDF</span> Ver</a><a class="document-download" href="${document.url}" download="${escapeHtml(document.name)}" aria-label="Descargar ${escapeHtml(document.name)}">↓</a></div>`;
}
async function setupDeclarationFolderSource(elementId,reload){
  const panel=document.querySelector(`#${elementId}`);if(!panel)return;
  let root=null,connected=false;
  try{root=await getSavedHandle("declarations-folder");connected=Boolean(root&&await root.queryPermission({mode:"read"})==="granted")}catch{}
  panel.innerHTML=connected
    ?'<div><span class="declaration-source-icon">✓</span><p><strong>Carpeta de declaraciones conectada</strong><small>Se buscan los PDF dentro de Mensual/mes y Trimestral/trimestre.</small></p></div><button type="button">Cambiar carpeta</button>'
    :'<div><span class="declaration-source-icon">▰</span><p><strong>Conecta Gestión → Declaraciones</strong><small>Solo tendrás que seleccionar la carpeta principal una vez.</small></p></div><button type="button">Conectar carpeta</button>';
  panel.classList.toggle("connected",connected);
  panel.querySelector("button").addEventListener("click",async()=>{
    try{
      const selected=await window.showDirectoryPicker({mode:"read"});
      await saveHandle("declarations-folder",selected);
      declarationDocsCache=null;declarationDocsRoot=null;
      await setupDeclarationFolderSource(elementId,reload);
      await reload();
    }catch(error){if(error?.name!=="AbortError"){panel.querySelector("small").textContent="No se pudo acceder a la carpeta seleccionada."}}
  });
}


const declarationPayments=["Domicil.","N.R.C.","Cargo","Aplaz.","Pte. Pago","Negativa","Compensación","Devolver","Baja","Cliente"];
const declarationColumnFilterState={tax:{},history:{}};
const declarationColumns=[
  {field:"client",label:"Cliente",type:"text"},
  {field:"document",label:"Documento",type:"document"},
  {field:"cif",label:"CIF",type:"text"},
  {field:"manager",label:"Encargado",type:"worker"},
  {field:"prepared",label:"Fecha confección",type:"date"},
  {field:"amount",label:"Importe",type:"text"},
  {field:"payment",label:"Pago",type:"payment"},
  {field:"submitted",label:"Fecha presentación",type:"date"},
  {field:"submittedBy",label:"Presentado por",type:"worker"},
  {field:"reviewedBy",label:"Revisado por",type:"worker"}
];
function declarationTableHeaders(prefix){
  return declarationColumns.map(column=>`<th data-declaration-column="${column.field}"><span>${column.label}</span><button class="excel-filter-button ${declarationColumnFilterState[prefix]?.[column.field]?"active":""}" type="button" data-excel-filter="${column.field}" aria-label="Filtrar ${column.label}" title="Filtrar ${column.label}">▾</button></th>`).join("");
}
function setupDeclarationFilters(prefix,bodyId){
  const body=document.querySelector(`#${bodyId}`),table=body?.closest("table");if(!table)return;
  table.querySelectorAll("[data-excel-filter]").forEach(button=>button.addEventListener("click",event=>{
    event.stopPropagation();openDeclarationColumnFilter(prefix,bodyId,button);
  }));
}
function declarationFilterOptions(type){
  if(type==="worker")return workers;
  if(type==="payment")return declarationPayments;
  if(type==="document")return ["Con documento","Sin documento"];
  return [];
}
function openDeclarationColumnFilter(prefix,bodyId,button){
  document.querySelector(".excel-filter-popover")?.remove();
  const column=declarationColumns.find(item=>item.field===button.dataset.excelFilter);if(!column)return;
  const value=declarationColumnFilterState[prefix]?.[column.field]||"";
  const panel=document.createElement("div");panel.className="excel-filter-popover";
  const options=declarationFilterOptions(column.type);
  if(column.type==="date"){
    const concreteDate=value.startsWith("__")?"":value;
    panel.innerHTML=`<div class="excel-filter-title"><span>Filtrar por</span><strong>${column.label}</strong></div>
      <div class="excel-filter-option-list date-filter-options">
        <button type="button" data-date-filter="" class="${!value?"selected":""}"><span>${!value?"✓":""}</span>Mostrar todas</button>
        <button type="button" data-date-filter="__EMPTY__" class="${value==="__EMPTY__"?"selected":""}"><span>${value==="__EMPTY__"?"✓":""}</span>Solo vacías</button>
        <button type="button" data-date-filter="__HAS__" class="${value==="__HAS__"?"selected":""}"><span>${value==="__HAS__"?"✓":""}</span>Solo con fecha</button>
      </div>
      <div class="specific-date-filter"><label for="excelFilterValue">Fecha concreta</label><div><input id="excelFilterValue" type="date" value="${escapeHtml(concreteDate)}"><button type="button" data-apply-date aria-label="Aplicar fecha">Aplicar</button></div></div>`;
  }else if(options.length){
    panel.innerHTML=`<div class="excel-filter-title"><span>Filtrar por</span><strong>${column.label}</strong></div><div class="excel-filter-option-list"><button type="button" data-filter-option="" class="${!value?"selected":""}"><span>${!value?"✓":""}</span>Mostrar todos</button>${options.map(option=>`<button type="button" data-filter-option="${escapeHtml(option)}" class="${value===option?"selected":""}"><span>${value===option?"✓":""}</span>${escapeHtml(option)}</button>`).join("")}</div>`;
  }else{
    panel.innerHTML=`<div class="excel-filter-title"><span>Filtrar por</span><strong>${column.label}</strong></div><input id="excelFilterValue" type="search" value="${escapeHtml(value)}" placeholder="Buscar…"><div class="excel-filter-actions"><button type="button" data-clear-filter>Limpiar</button><button class="apply" type="button" data-apply-filter>Aplicar</button></div>`;
  }
  document.body.appendChild(panel);
  const rect=button.getBoundingClientRect();
  panel.style.left=Math.max(10,Math.min(rect.left,window.innerWidth-286))+"px";
  panel.style.top=Math.max(10,Math.min(rect.bottom+7,window.innerHeight-panel.offsetHeight-10))+"px";
  const close=()=>panel.remove();
  const setFilter=next=>{
    if(next)declarationColumnFilterState[prefix][column.field]=next;else delete declarationColumnFilterState[prefix][column.field];
    button.classList.toggle("active",Boolean(next));applyDeclarationFilters(prefix,bodyId);close();
  };
  panel.addEventListener("click",event=>event.stopPropagation());
  if(column.type==="date"){
    const input=panel.querySelector("#excelFilterValue");
    panel.querySelectorAll("[data-date-filter]").forEach(option=>option.addEventListener("click",()=>setFilter(option.dataset.dateFilter)));
    panel.querySelector("[data-apply-date]").addEventListener("click",()=>{if(input.value)setFilter(input.value)});
    input.addEventListener("keydown",event=>{if(event.key==="Enter"&&input.value)setFilter(input.value);if(event.key==="Escape")close()});
  }else if(options.length){
    panel.querySelectorAll("[data-filter-option]").forEach(option=>option.addEventListener("click",()=>setFilter(option.dataset.filterOption)));
  }else{
    const input=panel.querySelector("#excelFilterValue");
    panel.querySelector("[data-apply-filter]").addEventListener("click",()=>setFilter(input.value.trim()));
    panel.querySelector("[data-clear-filter]").addEventListener("click",()=>setFilter(""));
    input.addEventListener("keydown",event=>{if(event.key==="Enter")setFilter(input.value.trim());if(event.key==="Escape")close()});
    input.focus();
  }
  setTimeout(()=>document.addEventListener("click",close,{once:true}),0);
}
function declarationRowFilterValue(row,field){
  if(field==="client")return row.dataset.taxClient||"";
  if(field==="document")return row.querySelector(".declaration-document-missing")?"Sin documento":"Con documento";
  if(field==="cif")return row.children[2]?.textContent?.trim()||"";
  return row.querySelector(`[data-field="${field}"]`)?.value||"";
}
function applyDeclarationFilters(prefix,bodyId){
  const body=document.querySelector(`#${bodyId}`);if(!body)return;
  const filters=declarationColumnFilterState[prefix]||{};
  body.querySelectorAll("tr[data-tax-client]").forEach(row=>{
    const show=Object.entries(filters).every(([field,expected])=>{
      const actual=declarationRowFilterValue(row,field);
      if(expected==="__EMPTY__")return !actual;
      if(expected==="__HAS__")return Boolean(actual);
      if(field==="client"||field==="cif"||field==="amount")return actual.toLocaleLowerCase("es").includes(expected.toLocaleLowerCase("es"));
      return actual===expected;
    });
    row.hidden=!show;
  });
}

function renderDeclarations(){
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Declaraciones</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="declarations-panel">
      <div class="declarations-heading">
        <div><p class="eyebrow">OBLIGACIONES FISCALES</p><h2>Control de declaraciones</h2><p>Selecciona la periodicidad, el periodo y el modelo que quieres revisar.</p></div>
        <div class="control-period-selectors">
          <label class="quarter-selector"><span>Periodicidad</span><select id="taxType"><option value="trimestral">Trimestral</option><option value="mensual">Mensual</option></select></label>
          <label class="quarter-selector"><span>Periodo fiscal</span><select id="taxQuarter"></select></label>
        </div>
      </div>
      <div class="declaration-folder-source" id="taxDeclarationFolder"></div>
      <div class="tax-deadlines" id="taxDeadlines"></div>
      <div class="tax-tabs" role="tablist">${taxModels.map(model=>`<button type="button" role="tab" data-tax-tab="${model}" class="${model===activeTaxModel?"active":""}">Modelo ${model}</button>`).join("")}</div>
      <div class="tax-lock-banner" id="taxLockBanner" hidden></div>
      <div class="tax-table-wrap"><table class="tax-table"><thead><tr>${declarationTableHeaders("tax")}</tr></thead><tbody id="taxRows"><tr><td colspan="10" class="table-empty">Cargando clientes…</td></tr></tbody></table></div>
    </section>`;
   bindHeader();
  setupDeclarationFilters("tax","taxRows");
  document.querySelector("#taxType").value=activeTaxType;fillTaxPeriodSelect();syncTaxModelTabs();
  document.querySelector("#taxType").addEventListener("change",event=>{activeTaxType=event.target.value;activeTaxQuarter=activeTaxType==="mensual"?"M01":"1T";if(activeTaxType==="mensual"&&activeTaxModel==="130-131")activeTaxModel="111";fillTaxPeriodSelect();syncTaxModelTabs();loadTaxModel(activeTaxModel)});
  document.querySelector("#taxQuarter").addEventListener("change",event=>{activeTaxQuarter=event.target.value;loadTaxModel(activeTaxModel)});
  document.querySelectorAll("[data-tax-tab]").forEach(tab=>tab.addEventListener("click",()=>{if(tab.disabled)return;activeTaxModel=tab.dataset.taxTab;syncTaxModelTabs();loadTaxModel(activeTaxModel)}));
  setupDeclarationFolderSource("taxDeclarationFolder",()=>loadTaxModel(activeTaxModel));
  loadTaxModel(activeTaxModel);
}
function renderTaxDeadlines(model,period,state){
  if(!state.deadline){document.querySelector("#taxDeadlines").innerHTML='<div class="deadline-unavailable"><strong>El modelo 130/131 no tiene periodicidad mensual.</strong><span>Selecciona la modalidad trimestral para consultar y editar este modelo.</span></div>';return}
  const d=state.deadline,domicile=d.domicileEnd?`Del ${formatTaxDate(d.start)} al ${formatTaxDate(d.domicileEnd)}`:"No aplicable a este modelo";
  document.querySelector("#taxDeadlines").innerHTML=`
    <div class="deadline-card"><span class="deadline-icon">⌂</span><div><small>PLAZO DE DOMICILIACIÓN</small><strong>${domicile}</strong></div></div>
    <div class="deadline-card"><span class="deadline-icon">✓</span><div><small>PLAZO DE PRESENTACIÓN</small><strong>Del ${formatTaxDate(d.start)} al ${formatTaxDate(d.presentationEnd)}</strong></div></div>
    <span class="tax-status ${state.type}">${state.label}</span>
    ${d.provisional?'<p class="deadline-note">Periodo de diciembre/4.º trimestre: fechas calculadas con las reglas generales de la AEAT. Pendiente de confirmación en el calendario oficial de 2027.</p>':""}`;
}
function declarationKey(model,period,client,year=2026){return "app-am-declaration-"+year+"-"+model+"-"+period+"-"+client}
function declarationData(model,period,client,year=2026){try{const saved=localStorage.getItem(declarationKey(model,period,client,year));const legacy=year===2026?localStorage.getItem("app-am-declaration-"+model+"-"+period+"-"+client):null;return JSON.parse(saved||legacy||"{}")}catch{return{}}}
function workerOptions(selected){return '<option value="">Seleccionar…</option>'+workers.map(name=>`<option value="${escapeHtml(name)}" ${selected===name?"selected":""}>${escapeHtml(name)}</option>`).join("")}
async function loadTaxModel(model){
  const body=document.querySelector("#taxRows"),state=taxWindowState(model,activeTaxQuarter,activeTaxType);
  renderTaxDeadlines(model,activeTaxQuarter,state);
  try{
    const clients=(await getAllClientMetadata()).filter(client=>(client.periodicity||"trimestral")===activeTaxType&&client.obligations&&client.obligations[model]);
    const documents=await declarationDocumentsForClients(clients,model,activeTaxType,activeTaxQuarter,2026);
    body.innerHTML=clients.length?clients.sort((a,b)=>a.name.localeCompare(b.name,"es")).map(client=>{const d=declarationData(model,activeTaxQuarter,client.name);return `<tr data-tax-client="${escapeHtml(client.name)}" data-tax-model-row="${model}" data-tax-quarter-row="${activeTaxQuarter}"><td><strong>${escapeHtml(client.name)}</strong><small>${activeTaxType==="mensual"?"Mensual":"Trimestral"}</small></td><td>${declarationDocumentMarkup(documents.get(client.name))}</td><td>${escapeHtml(client.cif||"—")}</td><td><select data-field="manager">${workerOptions(d.manager)}</select></td><td><input type="date" data-field="prepared" value="${escapeHtml(d.prepared||"")}"></td><td><div class="amount-input"><input type="number" step="0.01" data-field="amount" value="${escapeHtml(d.amount||"")}" placeholder="0,00"><span>€</span></div></td><td><select data-field="payment"><option value="">Seleccionar…</option><option ${d.payment==="Domicil."?"selected":""}>Domicil.</option><option ${d.payment==="N.R.C."?"selected":""}>N.R.C.</option><option ${d.payment==="Cargo"?"selected":""}>Cargo</option><option ${d.payment==="Aplaz."?"selected":""}>Aplaz.</option><option ${d.payment==="Pte. Pago"?"selected":""}>Pte. Pago</option><option ${d.payment==="Negativa"?"selected":""}>Negativa</option><option ${d.payment==="Compensación"?"selected":""}>Compensación</option><option ${d.payment==="Devolver"?"selected":""}>Devolver</option><option ${d.payment==="Baja"?"selected":""}>Baja</option><option ${d.payment==="Cliente"?"selected":""}>Cliente</option></select></td><td><input type="date" data-field="submitted" value="${escapeHtml(d.submitted||"")}"></td><td><select data-field="submittedBy">${workerOptions(d.submittedBy)}</select></td><td><select data-field="reviewedBy">${workerOptions(d.reviewedBy)}</select></td></tr>`}).join(""):`<tr><td colspan="10" class="table-empty">No hay clientes ${activeTaxType==="mensual"?"mensuales":"trimestrales"} asignados al modelo ${escapeHtml(model)}.</td></tr>`;
    body.querySelectorAll("input,select").forEach(control=>{control.disabled=state.locked;control.addEventListener("change",event=>{saveDeclarationRow(event);applyDeclarationFilters("tax","taxRows")})});
    applyDeclarationFilters("tax","taxRows");
    renderTaxLock(state,model,activeTaxQuarter,activeTaxType);
  }catch{body.innerHTML='<tr><td colspan="10" class="table-empty">No se pudieron cargar las obligaciones fiscales.</td></tr>'}
}
function renderTaxLock(state,model,period,type){
  const banner=document.querySelector("#taxLockBanner");
  if(state.type==="unavailable"){banner.hidden=true;banner.innerHTML="";return}
  if(!state.locked){banner.hidden=true;banner.innerHTML="";return}
  banner.hidden=false;
  if(state.type==="upcoming")banner.innerHTML='<span>🔒</span><div><strong>Periodo bloqueado</strong><p>No se puede editar hasta que comience el plazo oficial de presentación.</p></div>';
  else banner.innerHTML=`<span>🔒</span><div><strong>Periodo cerrado</strong><p>Han pasado más de 10 días desde el final del plazo de presentación.</p></div><button type="button" id="unlockTax">Desbloquear</button>`;
  document.querySelector("#unlockTax")?.addEventListener("click",()=>openTaxUnlock(model,period,type));
}
function openTaxUnlock(model,period,type){
  document.querySelector("#taxAccess")?.remove();
  const shell=document.createElement("div");shell.id="taxAccess";shell.className="access-shell";
  shell.innerHTML=`<div class="access-backdrop"></div><section class="access-card" role="dialog" aria-modal="true" aria-labelledby="taxAccessTitle"><button class="access-close" type="button" aria-label="Cerrar">×</button><div class="access-icon">✓</div><p class="eyebrow">PERIODO CERRADO</p><h2 id="taxAccessTitle">Desbloquear periodo</h2><p class="access-copy">Introduce la contraseña para modificar este periodo fiscal.</p><form><label for="taxPassword">Contraseña</label><div class="access-input"><span>●</span><input id="taxPassword" type="password" required></div><p class="access-error" role="alert"></p><button class="primary blue-button" type="submit">Desbloquear</button></form></section>`;
  document.body.appendChild(shell);
  const close=()=>{shell.classList.remove("open");setTimeout(()=>shell.remove(),260)};
  shell.querySelector(".access-close").addEventListener("click",close);shell.querySelector(".access-backdrop").addEventListener("click",close);
  shell.querySelector("form").addEventListener("submit",event=>{event.preventDefault();const input=shell.querySelector("#taxPassword");if(input.value==="1234"){taxUnlocks.add(model+"-"+type+"-"+period);close();setTimeout(()=>loadTaxModel(model),180)}else{shell.querySelector(".access-error").textContent="La contraseña no es correcta.";input.select()}});
  requestAnimationFrame(()=>requestAnimationFrame(()=>shell.classList.add("open")));setTimeout(()=>shell.querySelector("#taxPassword").focus(),250);
}
function saveDeclarationRow(event){
  const row=event.target.closest("tr"),data={};
  row.querySelectorAll("[data-field]").forEach(field=>data[field.dataset.field]=field.value);
  localStorage.setItem(declarationKey(row.dataset.taxModelRow,row.dataset.taxQuarterRow,row.dataset.taxClient),JSON.stringify(data));
}

const historyUnlocks=new Set();
let activeHistoryYear=2025;
let activeHistoryType="trimestral";
let activeHistoryQuarter="1T";
let activeHistoryModel="111";

function historicalYears(){
  const now=new Date(),years=[];
  for(let year=2020;year<=now.getFullYear();year++){
    let deadline=new Date(year+1,0,30,23,59,59),day=deadline.getDay();
    if(day===6)deadline.setDate(deadline.getDate()+2);
    if(day===0)deadline.setDate(deadline.getDate()+1);
    if(now>deadline)years.push(year);
  }
  return years;
}
function historyPeriods(){return activeHistoryType==="mensual"?taxMonths:taxQuarters}
function fillHistoryPeriodSelect(){
  const select=document.querySelector("#historyQuarter");if(!select)return;
  select.innerHTML=historyPeriods().map(period=>`<option value="${period.id}">${period.label}</option>`).join("");
  select.value=activeHistoryQuarter;
}
function syncHistoryModelTabs(){
  document.querySelectorAll("[data-history-tax-tab]").forEach(tab=>{const unavailable=activeHistoryType==="mensual"&&tab.dataset.historyTaxTab==="130-131";tab.disabled=unavailable;tab.classList.toggle("active",tab.dataset.historyTaxTab===activeHistoryModel)});
}
function renderDeclarationHistory(){
  const years=historicalYears(),lastYear=years[years.length-1]||2025;
  if(!years.includes(activeHistoryYear))activeHistoryYear=lastYear;
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Historial declaraciones</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="declarations-panel history-panel">
      <div class="declarations-heading">
        <div><p class="eyebrow">ARCHIVO FISCAL</p><h2>Histórico de declaraciones</h2><p>Consulta las declaraciones de ejercicios y periodos anteriores.</p></div>
        <div class="history-selectors">
          <label class="quarter-selector"><span>Ejercicio</span><select id="historyYear">${years.map(year=>`<option value="${year}">${year}</option>`).join("")}</select></label>
          <label class="quarter-selector"><span>Periodicidad</span><select id="historyType"><option value="trimestral">Trimestral</option><option value="mensual">Mensual</option></select></label>
          <label class="quarter-selector"><span>Periodo fiscal</span><select id="historyQuarter"></select></label>
        </div>
      </div>
      <div class="declaration-folder-source" id="historyDeclarationFolder"></div>
      <div class="tax-tabs" role="tablist">${taxModels.map(model=>`<button type="button" role="tab" data-history-tax-tab="${model}" class="${model===activeHistoryModel?"active":""}">Modelo ${model}</button>`).join("")}</div>
      <div class="tax-lock-banner history-lock" id="historyLockBanner"></div>
      <div class="tax-table-wrap"><table class="tax-table"><thead><tr>${declarationTableHeaders("history")}</tr></thead><tbody id="historyTaxRows"><tr><td colspan="10" class="table-empty">Cargando histórico…</td></tr></tbody></table></div>
    </section>`;
  bindHeader();
  setupDeclarationFilters("history","historyTaxRows");
  document.querySelector("#historyYear").value=String(activeHistoryYear);
  document.querySelector("#historyType").value=activeHistoryType;
  fillHistoryPeriodSelect();syncHistoryModelTabs();
  document.querySelector("#historyYear").addEventListener("change",event=>{activeHistoryYear=Number(event.target.value);loadHistoricalModel(activeHistoryModel)});
  document.querySelector("#historyType").addEventListener("change",event=>{activeHistoryType=event.target.value;activeHistoryQuarter=activeHistoryType==="mensual"?"M01":"1T";if(activeHistoryType==="mensual"&&activeHistoryModel==="130-131")activeHistoryModel="111";fillHistoryPeriodSelect();syncHistoryModelTabs();loadHistoricalModel(activeHistoryModel)});
  document.querySelector("#historyQuarter").addEventListener("change",event=>{activeHistoryQuarter=event.target.value;loadHistoricalModel(activeHistoryModel)});
  document.querySelectorAll("[data-history-tax-tab]").forEach(tab=>tab.addEventListener("click",()=>{if(tab.disabled)return;activeHistoryModel=tab.dataset.historyTaxTab;syncHistoryModelTabs();loadHistoricalModel(activeHistoryModel)}));
  setupDeclarationFolderSource("historyDeclarationFolder",()=>loadHistoricalModel(activeHistoryModel));
  loadHistoricalModel(activeHistoryModel);
}
async function loadHistoricalModel(model){
  const body=document.querySelector("#historyTaxRows"),key=activeHistoryYear+"-"+activeHistoryType+"-"+activeHistoryQuarter+"-"+model,unlocked=historyUnlocks.has(key);
  try{
    const clients=(await getAllClientMetadata()).filter(client=>(client.periodicity||"trimestral")===activeHistoryType&&client.obligations&&client.obligations[model]);
    const documents=await declarationDocumentsForClients(clients,model,activeHistoryType,activeHistoryQuarter,activeHistoryYear);
    body.innerHTML=clients.length?clients.sort((a,b)=>a.name.localeCompare(b.name,"es")).map(client=>{const d=declarationData(model,activeHistoryQuarter,client.name,activeHistoryYear);return `<tr data-tax-client="${escapeHtml(client.name)}" data-tax-model-row="${model}" data-tax-quarter-row="${activeHistoryQuarter}" data-tax-year-row="${activeHistoryYear}"><td><strong>${escapeHtml(client.name)}</strong><small>${activeHistoryType==="mensual"?"Mensual":"Trimestral"} · ${activeHistoryYear}</small></td><td>${declarationDocumentMarkup(documents.get(client.name))}</td><td>${escapeHtml(client.cif||"—")}</td><td><select data-field="manager">${workerOptions(d.manager)}</select></td><td><input type="date" data-field="prepared" value="${escapeHtml(d.prepared||"")}"></td><td><div class="amount-input"><input type="number" step="0.01" data-field="amount" value="${escapeHtml(d.amount||"")}" placeholder="0,00"><span>€</span></div></td><td><select data-field="payment"><option value="">Seleccionar…</option><option ${d.payment==="Domicil."?"selected":""}>Domicil.</option><option ${d.payment==="N.R.C."?"selected":""}>N.R.C.</option><option ${d.payment==="Cargo"?"selected":""}>Cargo</option><option ${d.payment==="Aplaz."?"selected":""}>Aplaz.</option><option ${d.payment==="Pte. Pago"?"selected":""}>Pte. Pago</option><option ${d.payment==="Negativa"?"selected":""}>Negativa</option><option ${d.payment==="Compensación"?"selected":""}>Compensación</option><option ${d.payment==="Devolver"?"selected":""}>Devolver</option><option ${d.payment==="Baja"?"selected":""}>Baja</option><option ${d.payment==="Cliente"?"selected":""}>Cliente</option></select></td><td><input type="date" data-field="submitted" value="${escapeHtml(d.submitted||"")}"></td><td><select data-field="submittedBy">${workerOptions(d.submittedBy)}</select></td><td><select data-field="reviewedBy">${workerOptions(d.reviewedBy)}</select></td></tr>`}).join(""):`<tr><td colspan="10" class="table-empty">No hay clientes ${activeHistoryType==="mensual"?"mensuales":"trimestrales"} asignados al modelo ${escapeHtml(model)}.</td></tr>`;
    body.querySelectorAll("input,select").forEach(control=>{control.disabled=!unlocked;control.addEventListener("change",event=>{saveHistoricalRow(event);applyDeclarationFilters("history","historyTaxRows")})});
    applyDeclarationFilters("history","historyTaxRows");
    renderHistoryLock(unlocked,model);
  }catch{body.innerHTML='<tr><td colspan="10" class="table-empty">No se pudo cargar el histórico.</td></tr>'}
}
function renderHistoryLock(unlocked,model){
  const banner=document.querySelector("#historyLockBanner");
  if(unlocked){banner.innerHTML='<span>🔓</span><div><strong>Edición temporalmente desbloqueada</strong><p>Los cambios realizados en este histórico se guardarán en el dispositivo.</p></div>';return}
  banner.innerHTML='<span>🔒</span><div><strong>Histórico bloqueado</strong><p>El ejercicio está protegido para evitar modificaciones accidentales.</p></div><button type="button" id="unlockHistory">Desbloquear</button>';
  document.querySelector("#unlockHistory").addEventListener("click",()=>openHistoryUnlock(model));
}
function openHistoryUnlock(model){
  document.querySelector("#historyAccess")?.remove();
  const shell=document.createElement("div");shell.id="historyAccess";shell.className="access-shell";
  shell.innerHTML=`<div class="access-backdrop"></div><section class="access-card" role="dialog" aria-modal="true" aria-labelledby="historyAccessTitle"><button class="access-close" type="button" aria-label="Cerrar">×</button><div class="access-icon">◷</div><p class="eyebrow">HISTÓRICO PROTEGIDO</p><h2 id="historyAccessTitle">Desbloquear histórico</h2><p class="access-copy">Introduce la contraseña para modificar este ejercicio y periodo.</p><form><label for="historyPassword">Contraseña</label><div class="access-input"><span>●</span><input id="historyPassword" type="password" required></div><p class="access-error" role="alert"></p><button class="primary blue-button" type="submit">Desbloquear</button></form></section>`;
  document.body.appendChild(shell);
  const close=()=>{shell.classList.remove("open");setTimeout(()=>shell.remove(),260)};
  shell.querySelector(".access-close").addEventListener("click",close);shell.querySelector(".access-backdrop").addEventListener("click",close);
  shell.querySelector("form").addEventListener("submit",event=>{event.preventDefault();const input=shell.querySelector("#historyPassword");if(input.value==="1234"){historyUnlocks.add(activeHistoryYear+"-"+activeHistoryType+"-"+activeHistoryQuarter+"-"+model);close();setTimeout(()=>loadHistoricalModel(model),180)}else{shell.querySelector(".access-error").textContent="La contraseña no es correcta.";input.select()}});
  requestAnimationFrame(()=>requestAnimationFrame(()=>shell.classList.add("open")));setTimeout(()=>shell.querySelector("#historyPassword").focus(),250);
}
function saveHistoricalRow(event){
  const row=event.target.closest("tr"),data={};
  row.querySelectorAll("[data-field]").forEach(field=>data[field.dataset.field]=field.value);
  localStorage.setItem(declarationKey(row.dataset.taxModelRow,row.dataset.taxQuarterRow,row.dataset.taxClient,Number(row.dataset.taxYearRow)),JSON.stringify(data));
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
  else if(button.dataset.title==="Historial declaraciones") renderDeclarationHistory();
  else if(button.dataset.title==="Trabajadores") renderWorkers();
  else if(button.dataset.title==="Tareas") renderTasks();
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
