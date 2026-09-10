const sidebar=document.querySelector("#sidebar");
const overlay=document.querySelector("#overlay");
const main=document.querySelector("main");
function installHomeActivityLayout(){
  const welcome=main.querySelector(".welcome"),metrics=main.querySelector(".metrics"),news=main.querySelector(".news-portal");
  if(!welcome||!metrics||!news)return;
  const layout=document.createElement("div"),rail=document.createElement("aside");
  layout.className="home-dashboard-layout";rail.className="home-activity-rail";rail.setAttribute("aria-label","Resumen de actividad");
  rail.innerHTML=`
    <section class="home-activity-card home-messages-card"><div class="home-activity-heading"><span class="home-activity-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4.5 3v-3H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/><path d="M7.5 10h9M7.5 13h6"/></svg></span><div><small>COMUNICACIÓN</small><h3>Últimos mensajes</h3></div><button type="button" data-home-summary="messages">Ver todos</button></div><div class="home-activity-list" id="homeMessagesPreview"></div></section>
    <section class="home-activity-card home-tasks-card"><div class="home-activity-heading"><span class="home-activity-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 1.5 1.5L12 8M14 9h3M8 15l1.5 1.5L12 14M14 15h3"/></svg></span><div><small>SEGUIMIENTO</small><h3>Tareas pendientes</h3></div><button type="button" data-home-summary="tasks">Ver todas</button></div><div class="home-activity-list" id="homeTasksPreview"></div></section>
    <section class="home-activity-card home-reminders-card"><div class="home-activity-heading"><span class="home-activity-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 8H3c0-1 3-1 3-8Z"/><path d="M10 21h4M9 3V2m6 1V2"/></svg></span><div><small>AGENDA</small><h3>Próximos recordatorios</h3></div><button type="button" data-home-summary="calendar">Ver calendario</button></div><div class="home-activity-list" id="homeRemindersPreview"></div></section>`;
  welcome.before(layout);layout.append(welcome,metrics,rail,news);
}
installHomeActivityLayout();
const homeMarkup=main.innerHTML;
let currentEntries=[];
let folderHistory=[];
let activeFolderConfig=null;
let currentDirectoryHandle=null;
const FOLDER_VIEW_STORAGE_KEY="app-am-folder-view";
let folderViewMode=localStorage.getItem(FOLDER_VIEW_STORAGE_KEY)==="list"?"list":"grid";
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
  renderManagement();
}

function openPasswordDialog({id,eyebrow,title,copy,icon,onSuccess}){
  document.querySelector(`#${id}`)?.remove();
  const shell=document.createElement("div");shell.id=id;shell.className="access-shell";
  shell.innerHTML=`<div class="access-backdrop"></div><section class="access-card" role="dialog" aria-modal="true" aria-labelledby="${id}Title"><button class="access-close" type="button" aria-label="Cerrar">×</button><div class="access-icon">${icon}</div><p class="eyebrow">${eyebrow}</p><h2 id="${id}Title">${title}</h2><p class="access-copy">${copy}</p><form><label>Contraseña</label><div class="access-input"><span>●</span><input type="password" autocomplete="current-password" required></div><p class="access-error" role="alert"></p><button class="primary blue-button" type="submit">Desbloquear</button></form></section>`;
  document.body.appendChild(shell);
  const input=shell.querySelector("input"),error=shell.querySelector(".access-error"),submit=shell.querySelector('button[type="submit"]');
  const close=()=>{shell.classList.remove("open");setTimeout(()=>shell.remove(),260)};
  shell.querySelector(".access-close").addEventListener("click",close);shell.querySelector(".access-backdrop").addEventListener("click",close);
  shell.querySelector("form").addEventListener("submit",async event=>{
    event.preventDefault();error.textContent="";submit.disabled=true;submit.textContent="Comprobando…";
    try{
      const response=await fetch("/api/verify-record-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:input.value})});
      if(response.ok){close();setTimeout(onSuccess,180);return}
      const result=await response.json().catch(()=>({}));error.textContent=result.error||"La contraseña no es correcta.";input.select();
    }catch{error.textContent="No se pudo comprobar la contraseña."}
    finally{submit.disabled=false;submit.textContent="Desbloquear"}
  });
  requestAnimationFrame(()=>requestAnimationFrame(()=>shell.classList.add("open")));setTimeout(()=>input.focus(),250);
}

function renderManagement(){
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Gestión</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="management-search"><div><p class="eyebrow">CLIENTES</p><h2>Buscador de clientes</h2><p>Localiza rápidamente cualquier cliente del despacho.</p></div><button class="primary blue-button" id="openNewClient">＋ Nuevo cliente</button><label class="management-searchbox"><span>⌕</span><input id="managementSearch" type="search" placeholder="Buscar por nombre…"></label></section>
    <section class="management-clients"><div class="folder-toolbar"><div><strong>Clientes</strong><span id="managementCount">0 clientes</span></div></div><div class="folder-grid" id="managementGrid"><div class="empty folder-empty"><span>▤</span><h4>Cargando clientes</h4></div></div></section>
    <div class="modal-shell" id="clientModal" aria-hidden="true"><div class="modal-backdrop" data-close-modal></div><section class="client-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-heading"><div><p class="eyebrow" id="modalEyebrow">ALTA DE CLIENTE</p><h2 id="modalTitle">Nuevo cliente</h2></div><div class="client-modal-heading-actions"><button type="button" class="secondary-button" id="clientModalDismiss" data-close-modal>Cerrar</button><button type="button" class="secondary-button client-view-edit" id="editClientFromView" hidden>Editar</button><button class="primary blue-button" id="saveClientButton" type="submit" form="newClientForm">Guardar</button><button class="modal-close" type="button" data-close-modal aria-label="Cerrar">×</button></div></div><div class="client-unsaved-banner" id="clientUnsavedBanner" role="alertdialog" aria-modal="true" aria-labelledby="clientUnsavedMessage" hidden><p id="clientUnsavedMessage">No se han guardado los cambios, ¿Deseas cerrar igualmente?</p><div><button type="button" class="secondary-button" id="continueClientEditing">Seguir editando</button><button type="button" class="client-discard-button" id="discardClientChanges">Cerrar sin guardar</button></div></div>
    <form id="newClientForm"><div class="client-identity-grid"><label>Nombre del cliente<input id="clientName" type="text" placeholder="Ej. Empresa García, S.L." required maxlength="120"></label><label>DNI / CIF<input id="clientCif" type="text" placeholder="Ej. B12345678" required maxlength="9" autocomplete="off"><small>9 caracteres</small></label><label>Tipo de persona<select id="clientPersonType"><option value="juridica" selected>Persona jurídica</option><option value="fisica">Persona física</option></select></label></div><section class="internal-client-data"><div class="internal-section-heading"><strong>Datos internos de contacto</strong><small>Información visible únicamente para el despacho.</small></div><div class="internal-data-grid"><label>Administradores<textarea id="clientAdministrators" rows="3" placeholder="Un administrador por línea"></textarea></label><label>Teléfonos de contacto<textarea id="clientPhones" rows="3" placeholder="Un teléfono por línea"></textarea></label><label>Correos electrónicos<textarea id="clientEmails" rows="3" placeholder="Un correo por línea"></textarea></label><label>Representante<input id="clientRepresentative" type="text" maxlength="120" placeholder="Nombre y apellidos"></label><label>NIF representante<input id="clientRepresentativeNif" type="text" maxlength="9" autocomplete="off" placeholder="Ej. 12345678A"><small>Máximo 9 caracteres</small></label></div></section><fieldset class="fiscal-obligations"><legend>Obligaciones fiscales</legend><div class="fiscal-settings-row"><div class="fiscal-periodicity"><div><strong>Periodicidad</strong></div><select id="fiscalPeriodicity" aria-label="Periodicidad fiscal"><option value="trimestral" selected>Trimestral</option><option value="mensual">Mensual</option></select></div><label class="fiscal-courtesy-inline"><input type="checkbox" id="courtesyDaysRequired"><span><strong>Días de cortesía</strong></span></label></div><p>Selecciona los modelos fiscales del cliente.</p><div class="obligation-grid">${["111","115","123","130-131","303","349","182","347","202"].map(m=>`<div class="obligation-item"><label><input type="checkbox" data-tax-model="${m}"><strong>Modelo ${m}</strong></label></div>`).join("")}</div></fieldset><fieldset class="financial-framework"><legend>Marco de información financiera aplicable</legend><label><span>Información aplicable al cliente</span><input id="financialReportingFramework" type="text" maxlength="500" placeholder="Escribe el marco de información financiera…"></label></fieldset><fieldset class="digital-signature-section"><legend>Firmas digitales</legend><p>Gestiona el documento de firma del cliente, su caducidad y contraseña.</p><div class="digital-signature-document"><span class="digital-signature-copy"><strong>Documento de firma</strong><small>Sube una nueva firma o vincula una existente sin duplicarla.</small></span><input id="clientSignature" type="file" accept=".p12,.pfx,.cer,.crt"><div class="existing-signature-divider"><span>o</span></div><button class="secondary-button existing-signature-button" id="browseExistingSignature" type="button">⌕ Buscar firma existente</button><p class="linked-signature-name" id="linkedSignatureName">Ninguna firma vinculada</p><div class="existing-signature-picker" id="existingSignaturePicker" hidden><div class="existing-signature-picker-head"><strong>Firmas disponibles</strong><button type="button" id="closeExistingSignaturePicker" aria-label="Cerrar buscador">×</button></div><label class="existing-signature-search"><span>⌕</span><input id="existingSignatureSearch" type="search" autocomplete="off" placeholder="Buscar documento…"></label><div class="existing-signature-list" id="existingSignatureList"></div></div></div><div class="signature-data"><label>Fecha de caducidad<input id="signatureExpiry" type="date"></label><label>Contraseña<input id="signaturePassword" type="password" autocomplete="new-password" placeholder="Contraseña de la firma"></label></div></fieldset><fieldset class="commercial-registry-section" id="commercialRegistrySection"><legend>Registro Mercantil</legend><p class="registry-intro">Información societaria, bancaria y de acceso de la persona jurídica.</p><div class="registry-tabs" role="tablist" aria-label="Apartados de Registro Mercantil"><button type="button" role="tab" data-registry-tab="domicilio" aria-selected="true">Domicilio</button><button type="button" role="tab" data-registry-tab="bancos" aria-selected="false">Bancos</button><button type="button" role="tab" data-registry-tab="acceso" aria-selected="false">Acceso</button><button type="button" role="tab" data-registry-tab="seguridad" aria-selected="false">Seguridad</button><button type="button" role="tab" data-registry-tab="observaciones" aria-selected="false">Observaciones</button></div><div class="registry-tab-content"><section class="registry-tab-panel" data-registry-panel="domicilio"><div class="registry-fields"><label class="registry-wide">Certificado<input id="registryCertificate" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"><small id="registryCertificateName">Ningún certificado guardado</small></label><label class="registry-wide">Dirección<input id="registryAddress" type="text" maxlength="180"></label><label>CP<input id="registryPostalCode" type="text" inputmode="numeric" maxlength="5"></label><label>Provincia<select id="registryProvince"><option value="">Seleccionar…</option>${provinceOptions()}</select></label><label>Municipio<select id="registryMunicipality"><option value="">Selecciona una provincia</option></select></label></div></section><section class="registry-tab-panel" data-registry-panel="bancos" hidden><div class="registry-fields"><label>Titular<input id="bankHolder" type="text" maxlength="160"></label><label>CIF<input id="bankTaxId" type="text" maxlength="9"></label><label>BIC<input id="bankBic" type="text" maxlength="11"></label><label>CCC<input id="bankCcc" type="text" maxlength="20"></label><div class="registry-wide bank-ibans"><div id="bankIbanList"></div><button type="button" class="registry-add-button" id="addBankIban" aria-label="Añadir otro IBAN" title="Añadir otro IBAN">＋</button></div><label>Nombre del banco<input id="bankName" type="text" maxlength="140"></label><label class="registry-wide">Dirección del banco<input id="bankAddress" type="text" maxlength="180"></label><label>CP<input id="bankPostalCode" type="text" inputmode="numeric" maxlength="5"></label><label>Provincia<select id="bankProvince"><option value="">Seleccionar…</option>${provinceOptions()}</select></label><label>Municipio<select id="bankMunicipality"><option value="">Selecciona una provincia</option></select></label></div></section><section class="registry-tab-panel" data-registry-panel="acceso" hidden><div class="registry-fields registry-credentials"><label>Usuario<input id="registryAccessUser" type="text" autocomplete="off"></label><label>Contraseña<input id="registryAccessPassword" type="password" autocomplete="new-password"></label></div></section><section class="registry-tab-panel" data-registry-panel="seguridad" hidden><div class="registry-fields registry-credentials"><label>Usuario<input id="registrySecurityUser" type="text" autocomplete="off"></label><label>Contraseña<input id="registrySecurityPassword" type="password" autocomplete="new-password"></label></div></section><section class="registry-tab-panel" data-registry-panel="observaciones" hidden><label class="registry-observations"><textarea id="registryObservations" rows="5" maxlength="1500" placeholder="Notas internas sobre el Registro Mercantil…"></textarea></label></section></div></fieldset><p class="form-message" id="formMessage"></p><div class="modal-actions"><button type="button" class="secondary-button" id="clientModalDismiss" data-close-modal>Cancelar</button><button type="button" class="secondary-button client-view-edit" id="editClientFromView" hidden>Editar</button><button class="primary blue-button" id="saveClientButton" type="submit">Guardar cliente</button></div></form></section></div>`;
  bindHeader();
  document.querySelector("#newClientForm .modal-actions")?.remove();
  document.querySelector("#openNewClient").addEventListener("click",openClientModal);
  document.querySelectorAll("[data-close-modal]").forEach(x=>x.addEventListener("click",closeClientModal));
  document.querySelector("#newClientForm").addEventListener("submit",createClient);
  document.querySelector("#browseExistingSignature").addEventListener("click",openExistingSignaturePicker);
  document.querySelector("#closeExistingSignaturePicker").addEventListener("click",()=>document.querySelector("#existingSignaturePicker").hidden=true);
  document.querySelector("#existingSignatureSearch").addEventListener("input",filterExistingSignatures);
  document.querySelector("#clientSignature").addEventListener("change",onNewSignatureSelected);
  document.querySelector("#managementSearch").addEventListener("input",filterManagementClients);
  document.querySelector("#editClientFromView").addEventListener("click",enableClientEditing);
  document.querySelector("#clientPersonType").addEventListener("change",toggleCommercialRegistry);
  document.querySelectorAll("[data-registry-tab]").forEach(tab=>tab.addEventListener("click",()=>openRegistryTab(tab.dataset.registryTab)));
  document.querySelector("#registryProvince").addEventListener("change",()=>fillMunicipalitySelect("registryProvince","registryMunicipality"));
  document.querySelector("#bankProvince").addEventListener("change",()=>fillMunicipalitySelect("bankProvince","bankMunicipality"));
  document.querySelector("#addBankIban").addEventListener("click",()=>renderBankIbans([...readBankIbans(),""]));
  document.querySelector("#registryCertificate").addEventListener("change",event=>{document.querySelector("#registryCertificateName").textContent=event.target.files[0]?.name||document.querySelector("#newClientForm").dataset.registryCertificate||"Ningún certificado guardado"});
  document.querySelector("#continueClientEditing").addEventListener("click",hideClientUnsavedBanner);
  document.querySelector("#discardClientChanges").addEventListener("click",performClientModalClose);
  loadManagementClients();
}
function clientFormSnapshot(){
  const form=document.querySelector("#newClientForm");if(!form)return"";
  const controls=[...form.querySelectorAll("input,select,textarea")].map((control,index)=>({key:control.id||control.name||control.dataset.taxModel||`control-${index}`,value:control.type==="checkbox"||control.type==="radio"?control.checked:control.type==="file"?[...control.files].map(file=>`${file.name}:${file.size}:${file.lastModified}`).join("|"):control.value}));
  return JSON.stringify({controls,existingSignature:form.dataset.existingSignature||"",registryCertificate:form.dataset.registryCertificate||""});
}
function markClientFormClean(){const form=document.querySelector("#newClientForm");if(form)form.dataset.cleanSnapshot=clientFormSnapshot()}
function clientFormHasUnsavedChanges(){const form=document.querySelector("#newClientForm");return Boolean(form&&!form.classList.contains("client-view-mode")&&form.dataset.cleanSnapshot!==clientFormSnapshot())}
function hideClientUnsavedBanner(){const banner=document.querySelector("#clientUnsavedBanner");if(banner)banner.hidden=true}
function showClientUnsavedBanner(){const banner=document.querySelector("#clientUnsavedBanner");if(!banner)return;banner.hidden=false;banner.scrollIntoView({block:"nearest",behavior:"smooth"});setTimeout(()=>document.querySelector("#continueClientEditing")?.focus(),0)}
function showClientModal(){const m=document.querySelector("#clientModal");hideClientUnsavedBanner();m.classList.add("open");m.setAttribute("aria-hidden","false");setTimeout(()=>document.querySelector("#clientName")?.focus(),180)}
function openRegistryTab(name="domicilio"){
  document.querySelectorAll("[data-registry-tab]").forEach(tab=>tab.setAttribute("aria-selected",String(tab.dataset.registryTab===name)));
  document.querySelectorAll("[data-registry-panel]").forEach(panel=>panel.hidden=panel.dataset.registryPanel!==name);
}
function provinceOptions(){return Object.entries(window.SPAIN_LOCATIONS||{}).sort((a,b)=>a[1].name.localeCompare(b[1].name,"es",{sensitivity:"base"})).map(([code,item])=>`<option value="${code}">${escapeHtml(item.name)}</option>`).join("")}
function fillMunicipalitySelect(provinceId,municipalityId,selected=""){
  const province=document.querySelector("#"+provinceId),municipality=document.querySelector("#"+municipalityId);if(!province||!municipality)return;
  const items=(window.SPAIN_LOCATIONS?.[province.value]?.municipalities)||[];
  municipality.innerHTML=`<option value="">${province.value?"Seleccionar…":"Selecciona una provincia"}</option>`+items.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  municipality.value=selected||"";
}
function readBankIbans(){return[...document.querySelectorAll("[data-bank-iban]")].map(input=>input.value.trim())}
function renderBankIbans(values=[""]){
  const list=document.querySelector("#bankIbanList");if(!list)return;const items=values.length?values:[""];
  list.innerHTML=items.map((value,index)=>`<div class="bank-iban-row"><label>IBAN ${index+1}<input type="text" data-bank-iban maxlength="34" value="${escapeHtml(value)}"></label>${index>0?'<button type="button" data-remove-iban="'+index+'" aria-label="Eliminar IBAN">×</button>':""}</div>`).join("");
  list.querySelectorAll("[data-remove-iban]").forEach(button=>button.addEventListener("click",()=>{const current=readBankIbans();current.splice(Number(button.dataset.removeIban),1);renderBankIbans(current)}));
}
function toggleCommercialRegistry(){const section=document.querySelector("#commercialRegistrySection");if(section)section.hidden=document.querySelector("#clientPersonType").value!=="juridica"}
function resetCommercialRegistry(){
  const form=document.querySelector("#newClientForm");delete form.dataset.registryCertificate;
  document.querySelector("#registryCertificateName").textContent="Ningún certificado guardado";
  renderBankIbans([""]);fillMunicipalitySelect("registryProvince","registryMunicipality");fillMunicipalitySelect("bankProvince","bankMunicipality");openRegistryTab("domicilio");toggleCommercialRegistry();
}
function populateCommercialRegistry(value={}){
  const form=document.querySelector("#newClientForm"),address=value.registeredAddress||{},bank=value.bank||{},access=value.access||{},security=value.security||{};
  const set=(id,v)=>{const element=document.querySelector("#"+id);if(element)element.value=v||""};
  set("registryAddress",address.address);set("registryPostalCode",address.postalCode);set("registryProvince",address.province);fillMunicipalitySelect("registryProvince","registryMunicipality",address.municipality);
  set("bankHolder",bank.holder);set("bankTaxId",bank.cif);set("bankBic",bank.bic);set("bankCcc",bank.ccc);renderBankIbans(bank.ibans?.length?bank.ibans:[""]);set("bankName",bank.name);set("bankAddress",bank.address);set("bankPostalCode",bank.postalCode);set("bankProvince",bank.province);fillMunicipalitySelect("bankProvince","bankMunicipality",bank.municipality);
  set("registryAccessUser",access.username);set("registryAccessPassword",access.password);set("registrySecurityUser",security.username);set("registrySecurityPassword",security.password);set("registryObservations",value.observations);
  if(value.certificateName)form.dataset.registryCertificate=value.certificateName;else delete form.dataset.registryCertificate;
  document.querySelector("#registryCertificateName").textContent=value.certificateName||"Ningún certificado guardado";openRegistryTab("domicilio");toggleCommercialRegistry();
}
function collectCommercialRegistryData(certificateName=""){
  const value=id=>document.querySelector("#"+id).value.trim();
  return{certificateName,registeredAddress:{address:value("registryAddress"),postalCode:value("registryPostalCode"),province:value("registryProvince"),municipality:value("registryMunicipality")},bank:{holder:value("bankHolder"),cif:value("bankTaxId").toUpperCase(),bic:value("bankBic").toUpperCase(),ccc:value("bankCcc"),ibans:readBankIbans().filter(Boolean).map(item=>item.replace(/\s+/g,"").toUpperCase()),name:value("bankName"),address:value("bankAddress"),postalCode:value("bankPostalCode"),province:value("bankProvince"),municipality:value("bankMunicipality")},access:{username:value("registryAccessUser"),password:value("registryAccessPassword")},security:{username:value("registrySecurityUser"),password:value("registrySecurityPassword")},observations:value("registryObservations")};
}
function setClientViewMode(viewOnly){
  const form=document.querySelector("#newClientForm");
  form.classList.toggle("client-view-mode",viewOnly);
  form.querySelectorAll("input,select,textarea").forEach(control=>{control.disabled=viewOnly});
  document.querySelector("#browseExistingSignature").disabled=viewOnly;
  document.querySelectorAll("#commercialRegistrySection button:not([role=tab])").forEach(button=>button.disabled=viewOnly);
  document.querySelector("#editClientFromView").hidden=!viewOnly;
  document.querySelector("#saveClientButton").hidden=viewOnly;
  document.querySelector("#clientModalDismiss").textContent="Cerrar";
}
function openClientModal(){
  const form=document.querySelector("#newClientForm");form.reset();delete form.dataset.editing;delete form.dataset.existingSignature;
  document.querySelector("#linkedSignatureName").textContent="Ninguna firma vinculada";document.querySelector("#existingSignaturePicker").hidden=true;
  resetCommercialRegistry();
  setClientViewMode(false);
  document.querySelector("#clientName").readOnly=false;
  document.querySelector("#modalEyebrow").textContent="ALTA DE CLIENTE";
  document.querySelector("#modalTitle").textContent="Nuevo cliente";
  document.querySelector("#saveClientButton").textContent="Guardar";
  document.querySelector("#formMessage").textContent="";
  markClientFormClean();
  showClientModal();
}
async function openClientRecord(name,viewOnly=true){
  const form=document.querySelector("#newClientForm");form.reset();form.dataset.editing=name;delete form.dataset.existingSignature;document.querySelector("#existingSignaturePicker").hidden=true;
  const clients=await getAllClientMetadata(),data=clients.find(client=>client.id===name)||{name,cif:"",personType:"juridica",periodicity:"trimestral",obligations:{}};
  const nameInput=document.querySelector("#clientName");nameInput.value=name;nameInput.readOnly=true;
  document.querySelector("#clientCif").value=data.cif||"";
  document.querySelector("#clientPersonType").value=data.personType||"juridica";
  document.querySelector("#clientAdministrators").value=data.administrators||"";
  document.querySelector("#clientPhones").value=data.phones||"";
  document.querySelector("#clientEmails").value=data.emails||"";
  document.querySelector("#clientRepresentative").value=data.representative||"";
  document.querySelector("#clientRepresentativeNif").value=data.representativeNif||"";
  const linkedSignature=(await getAllSignatureMetadata()).find(item=>item.client===name);document.querySelector("#linkedSignatureName").textContent=linkedSignature?`Vinculada: ${linkedSignature.document||linkedSignature.id}`:"Ninguna firma vinculada";if(linkedSignature){form.dataset.existingSignature=linkedSignature.document||linkedSignature.id;document.querySelector("#signatureExpiry").value=linkedSignature.expiry||"";document.querySelector("#signaturePassword").value=linkedSignature.password||""}
  document.querySelector("#fiscalPeriodicity").value=data.periodicity||"trimestral";
  document.querySelectorAll("[data-tax-model]").forEach(check=>check.checked=Boolean(data.obligations&&data.obligations[check.dataset.taxModel]));
  document.querySelector("#courtesyDaysRequired").checked=Boolean(data.courtesyDaysRequired);
  document.querySelector("#financialReportingFramework").value=data.financialReportingFramework||"";
  populateCommercialRegistry(data.commercialRegistry||{});
  setClientViewMode(viewOnly);
  document.querySelector("#modalEyebrow").textContent="FICHA DEL CLIENTE";
  document.querySelector("#modalTitle").textContent=viewOnly?name:"Editar cliente";
  document.querySelector("#saveClientButton").textContent="Guardar";
  document.querySelector("#formMessage").textContent="";
  markClientFormClean();
  showClientModal();
}
function openClientDetails(name){return openClientRecord(name,true)}
function openEditClient(name){return openClientRecord(name,false)}
function enableClientEditing(){
  setClientViewMode(false);
  document.querySelector("#clientName").readOnly=true;
  document.querySelector("#modalEyebrow").textContent="EDICIÓN DE CLIENTE";
  document.querySelector("#modalTitle").textContent="Editar cliente";
  document.querySelector("#clientCif")?.focus();
}
function clearManagementSearch(){const search=document.querySelector("#managementSearch");if(!search)return;search.value="";search.dispatchEvent(new Event("input",{bubbles:true}))}
function performClientModalClose(){const m=document.querySelector("#clientModal");hideClientUnsavedBanner();m.classList.remove("open");m.setAttribute("aria-hidden","true");clearManagementSearch()}
function closeClientModal(){if(clientFormHasUnsavedChanges()){showClientUnsavedBanner();return}performClientModalClose()}
function onNewSignatureSelected(event){const form=document.querySelector("#newClientForm"),picker=document.querySelector("#existingSignaturePicker"),label=document.querySelector("#linkedSignatureName");if(event.target.files.length){delete form.dataset.existingSignature;label.textContent=`Nueva firma: ${event.target.files[0].name}`;picker.hidden=true}else label.textContent=form.dataset.existingSignature?`Vinculada: ${form.dataset.existingSignature}`:"Ninguna firma vinculada"}
async function openExistingSignaturePicker(){
 const picker=document.querySelector("#existingSignaturePicker"),list=document.querySelector("#existingSignatureList"),search=document.querySelector("#existingSignatureSearch");
 picker.hidden=false;list.innerHTML='<p class="existing-signature-empty">Cargando firmas…</p>';
 try{let root=await getSavedHandle("signatures-folder");if(root&&await root.requestPermission({mode:"read"})!=="granted")root=null;if(!root){root=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("signatures-folder",root)}const names=[];for await(const entry of root.values())if(entry.kind==="file")names.push(entry.name);names.sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));const metadata=await getAllSignatureMetadata();renderExistingSignatureOptions(names,metadata);search.value="";search.focus()}catch(error){if(error.name==="AbortError"){picker.hidden=true;return}list.innerHTML='<p class="existing-signature-empty">No se pudo abrir la carpeta de firmas.</p>'}
}
function renderExistingSignatureOptions(names,metadata=[]){
 const list=document.querySelector("#existingSignatureList"),currentClient=document.querySelector("#clientName").value.trim(),byDocument=new Map(metadata.map(item=>[item.document||item.id,item]));list.innerHTML=names.length?names.map(name=>{const linked=byDocument.get(name),blocked=Boolean(linked?.client&&linked.client!==currentClient),current=Boolean(linked?.client&&linked.client===currentClient),action=blocked?`Vinculada a ${escapeHtml(linked.client)}`:current?"Firma actual":"Vincular";return `<button type="button" data-existing-signature="${escapeHtml(name)}" ${blocked?"disabled":""}><span class="existing-signature-file">▱</span><span title="${escapeHtml(name)}">${escapeHtml(name)}</span><b>${action}</b></button>`}).join(""):'<p class="existing-signature-empty">No hay documentos en la carpeta.</p>';
 list.querySelectorAll("[data-existing-signature]:not(:disabled)").forEach(button=>button.addEventListener("click",async()=>{const name=button.dataset.existingSignature,form=document.querySelector("#newClientForm");form.dataset.existingSignature=name;document.querySelector("#clientSignature").value="";document.querySelector("#linkedSignatureName").textContent=`Vinculada: ${name}`;document.querySelector("#ex