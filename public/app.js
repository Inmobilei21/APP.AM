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
 list.querySelectorAll("[data-existing-signature]:not(:disabled)").forEach(button=>button.addEventListener("click",async()=>{const name=button.dataset.existingSignature,form=document.querySelector("#newClientForm");form.dataset.existingSignature=name;document.querySelector("#clientSignature").value="";document.querySelector("#linkedSignatureName").textContent=`Vinculada: ${name}`;document.querySelector("#existingSignaturePicker").hidden=true;const selectedMetadata=metadata.find(item=>item.id===name||item.document===name);if(selectedMetadata){document.querySelector("#signatureExpiry").value=selectedMetadata.expiry||"";document.querySelector("#signaturePassword").value=selectedMetadata.password||""}}));
}
function filterExistingSignatures(event){const query=event.target.value.trim().toLocaleLowerCase("es");document.querySelectorAll("#existingSignatureList [data-existing-signature]").forEach(button=>{const visible=button.dataset.existingSignature.toLocaleLowerCase("es").includes(query);button.hidden=!visible;button.style.display=visible?"":"none"})}
async function loadManagementClients(){
  const grid=document.querySelector("#managementGrid");
  try{const root=await getSavedHandle("clients-folder");if(!root||await root.queryPermission({mode:"read"})!=="granted"){grid.innerHTML='<div class="empty folder-empty"><h4>Carpeta de Clientes no autorizada</h4><p>Entra primero en Clientes y autoriza su carpeta.</p></div>';return}
  const clients=[];for await(const x of root.values())if(x.kind==="directory")clients.push(x.name);clients.sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));
  grid.innerHTML=clients.length?clients.map(n=>`<div class="folder-card management-client" data-client="${escapeHtml(n.toLocaleLowerCase("es"))}" data-client-name="${escapeHtml(n)}" tabindex="0" role="button" aria-label="Abrir ficha de ${escapeHtml(n)}"><span class="folder-icon">▰</span><span><strong>${escapeHtml(n)}</strong><small>Ver ficha del cliente</small></span><span class="client-card-arrow" aria-hidden="true">›</span></div>`).join(""):'<div class="empty folder-empty"><h4>No hay clientes</h4></div>';document.querySelector("#managementCount").textContent=`${clients.length} ${clients.length===1?"cliente":"clientes"}`;grid.querySelectorAll(".management-client").forEach(card=>{const open=()=>{grid.querySelector(".management-client.selected")?.classList.remove("selected");card.classList.add("selected");openClientDetails(card.dataset.clientName)};card.addEventListener("click",open);card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open()}})})}catch{grid.innerHTML='<div class="empty folder-empty"><h4>No se pudieron cargar los clientes</h4></div>'}
}
function filterManagementClients(e){const q=e.target.value.trim().toLocaleLowerCase("es");const cards=[...document.querySelectorAll(".management-client")];let v=0;cards.forEach(c=>{const s=c.dataset.client.includes(q);c.hidden=!s;if(s)v++});document.querySelector("#managementCount").textContent=q?`${v} resultados`:`${cards.length} clientes`}
async function createClient(e){
  e.preventDefault();const input=document.querySelector("#clientName"),message=document.querySelector("#formMessage"),button=document.querySelector("#saveClientButton");const entered=input.value.trim(),name=entered.replace(/[. ]+$/,"");if(!name)return;if(/[\\/:*?"<>|]/.test(name)){message.className="form-message error";message.textContent="El nombre contiene caracteres que Windows no permite.";return}button.disabled=true;button.textContent="Guardando…";
  try{let root=await getSavedHandle("clients-folder");if(root&&await root.requestPermission({mode:"readwrite"})!=="granted")root=null;if(!root){root=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("clients-folder",root)}
  let existed=true;try{await root.getDirectoryHandle(name)}catch{existed=false}const client=await root.getDirectoryHandle(name,{create:true}),folders={};for(const f of defaultClientFolders)folders[f]=await client.getDirectoryHandle(f,{create:true});const accountingYear=await folders["CONTABILIDAD"].getDirectoryHandle(String(new Date().getFullYear()),{create:true});for(const subfolder of ["1T","2T","3T","4T","BANCOS"])await accountingYear.getDirectoryHandle(subfolder,{create:true});
  const existingClientData=(await getAllClientMetadata()).find(item=>item.id===name)||{},personType=document.querySelector("#clientPersonType").value,certificate=document.querySelector("#registryCertificate");let registryCertificateName=existingClientData.commercialRegistry?.certificateName||"";
  if(personType==="juridica"&&certificate.files.length){const registryFolder=await folders["OTRA DOCUMENTACIÓN"].getDirectoryHandle("REGISTRO MERCANTIL",{create:true});await copyFileList(certificate.files,registryFolder);registryCertificateName=certificate.files[0].name}
  const sig=document.querySelector("#clientSignature");let signatureLink=null;if(sig.files.length){let signaturesRoot=await getSavedHandle("signatures-folder");if(signaturesRoot&&await signaturesRoot.requestPermission({mode:"readwrite"})!=="granted")signaturesRoot=null;if(!signaturesRoot){signaturesRoot=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("signatures-folder",signaturesRoot)}const file=sig.files[0],savedName=`${name} - ${file.name}`;await copyNamedFile(file,signaturesRoot,savedName);signatureLink={id:savedName,client:name,document:savedName,password:document.querySelector("#signaturePassword").value,expiry:document.querySelector("#signatureExpiry").value}}else if(e.target.dataset.existingSignature){const existingName=e.target.dataset.existingSignature;signatureLink={id:existingName,client:name,document:existingName,password:document.querySelector("#signaturePassword").value,expiry:document.querySelector("#signatureExpiry").value}}if(signatureLink){const allSignatures=await getAllSignatureMetadata(),conflict=allSignatures.find(item=>(item.id===signatureLink.id||item.document===signatureLink.document)&&item.client&&item.client!==name);if(conflict){const error=new Error("La firma seleccionada ya está vinculada a otra empresa.");error.userMessage=`Esta firma ya está vinculada a ${conflict.client}. Cada firma solo puede pertenecer a una empresa.`;throw error}for(const item of allSignatures)if(item.client===name&&item.id!==signatureLink.id)await saveSignatureMetadata({...item,client:""});await saveSignatureMetadata(signatureLink)}
  const obligations={};document.querySelectorAll("[data-tax-model]:checked").forEach(check=>{obligations[check.dataset.taxModel]=true});await saveClientMetadata({id:name,name,cif:document.querySelector("#clientCif").value.trim().toUpperCase(),personType,commercialRegistry:personType==="juridica"?collectCommercialRegistryData(registryCertificateName):null,administrators:document.querySelector("#clientAdministrators").value.trim(),phones:document.querySelector("#clientPhones").value.trim(),emails:document.querySelector("#clientEmails").value.trim(),representative:document.querySelector("#clientRepresentative").value.trim(),representativeNif:document.querySelector("#clientRepresentativeNif").value.trim().toUpperCase(),periodicity:document.querySelector("#fiscalPeriodicity").value,obligations,courtesyDaysRequired:document.querySelector("#courtesyDaysRequired").checked,financialReportingFramework:document.querySelector("#financialReportingFramework").value.trim()});
  message.className="form-message success";message.textContent=existed?"Cliente actualizado correctamente.":`Cliente “${name}” creado correctamente.`;e.target.reset();markClientFormClean();await loadManagementClients();setTimeout(closeClientModal,850)}
  catch(error){if(error.name!=="AbortError"){message.className="form-message error";message.textContent=error.userMessage||"No se pudo guardar el cliente. Comprueba el permiso de escritura."}}finally{button.disabled=false;button.textContent="Guardar"}
}
async function copyFileList(list,dir){for(const file of list)await copyNamedFile(file,dir,file.name)}
async function copyNamedFile(file,dir,name){const dest=await dir.getFileHandle(name,{create:true}),w=await dest.createWritable();await w.write(file);await w.close()}
function renderHolded(){
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Holded</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="holded-panel">
      <div class="holded-original-logo"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAuIAAADnCAIAAADU06TyAAAQAElEQVR4AeydDZwUxZ33axI38rKbBCKoqOgTIvng23FqHg26j8npadSEuBg0AlFAEwGBCIJGhHMNgomgJEZd9DBADjWeCoaASTxNzsPw0SQag0Y/atRET3yHy4miQTPPd7bZ2dmZfqnu6ZnpnvnNp7a3uvpf/6r6Vk/Xr6umZz6U1UsEREAEREAEREAEEkngQ0YvERABERABERCB2AjIUZwEJFPipClfIiACIiACIiACMRKQTIkRplyJgAiIQDoJqNYikFQCkilJ7RnVSwREQAREQAQanoBkSsOfAgIgAukkoFqLgAg0AgHJlEboZbVRBERABERABFJJQDIlld2mSqeTgGotAiIgAiIQjoBkSjheshYBERABERABEagaAcmUqqFOZ0GqtQiIgAiIgAjUjoBkSu3Yq2QREAEREAEREAFfAnUoU3zbq4MiIAIiIAIiIAKpISCZkpquUkVFQAREQAREoCYEalioZEoN4atoERABERABERABPwKSKX50dEwEREAERCCdBFTrOiEgmVInHalmiIAIiIAIiED9EZBMqb8+VYtEQATSSUC1FgERKCEgmVKCRAkiIAIiIAIiIALJICCZkox+UC1EIJ0EVGsREAERqCgByZSK4pVzERABERABERCB6AQkU6KzU850ElCtRUAEREAEUkNAMiU1XaWKioAIiIAIiECjEZBMSUOPq44iIAIiIAIi0JAEJFMastvVaBEQAREQARFIA4FKyZQ0tF11FAEREAEREAERSDQByZREd48qJwIiIAIiIAIOgcbcSqY0Zr+r1SIgAiIgAiKQAgKSKSnoJFVRBERABNJJQLUWgXIJSKaUS1D5RUAEREAEREAEKkRAMqVCYOVWBEQgnQRUaxEQgSQRkExJUm+oLiIgAiIgAiIgAgUEJFMKYCgqAukkoFqLgAiIQL0SkEyp155Vu0RABERABEQg9QQkU1LfhelsgGotAiIgAiIgAsEEJFOCGclCBERABERABESgJgQkU6yxy1AEREAEREAERKC6BCRTqstbpYmACIiACIiACDgELLaSKRaQZCICIiACIiACIlALApIptaCuMkVABERABNJJQLWuMgHJlCoDV3EiIAIiIAIiIAK2BCRTbEnJTgREQATSSUC1FoEUE5BMSXHnqeoiIAIiIAIiUN8EJFPqu3/VOhFIJwHVWgREQAQ6CUimdGLQRgREQAREQAREIHkEJFOS1yeqUToJqNYiIAIiIAKxE5BMiR2pHIqACIiACIiACMRDQDIlHo7p9KJai4AIiIAIiECiCUimJLp7VDkREAEREAERaGQCaZMpjdxXarsIiIAIiIAINBgByZQG63A1VwREQAREQAQKCSQ7LpmS7P5R7URABERABESggQlIpjRw56vpIiACIpBOAqp14xCQTGmcvlZLRUAEREAERCBlBBpJpuzYYdISUnYWqboiIAKBBGQgAiIQhUBjyJR77jEdN5jvXxNbuO77pqJh1XKzcUNOVEXpU+URAREQAREQgToh0AAypeOG7Le/k735tuxd62MLP/tptqLhh9dmr1loFn3bvP5anZxoakYaCajOIiACIlBrAvUuUzZuQKCYPs3uoaWvsQz9+5jCsGuLKQoUQQpbt5BpaS4K5mN9/cJuu5u/Z7L3/1f2vPFSKrV+j6h8ERABERCBmhGod5nyhyc80X4463mo6ECTtWVRRmMyH84FE+H1oazp18f89W1z6Syz7a0IDhozi1otAiIgAiJQTwTqXaaU2VcIFIK/E+QOARtnS8Q3ZD+UJfiaGINGcSz69ck++xdzzZVSKg4PbUVABERABBqKQL3LlH84wL077SSFe94yUt0ESom7vEZxjqBU7r3bLLtBn6h1eGgrAiIgAiLQOATqXaaMaM2MPd28s61HjwZqFGcGxdn2yFmy4+uKFZ+SDEEJRRrFMR84MLv2VrNunbOnrQiIgAiIgAg0CIFIMiVdbL42xhx5eLdS8RUWO1u2I2NsNMpOa/d/pRoleCrFVaM47lEqt92Ye0rZ2dVWBERABERABBqAQAPIlOaWzEWzdioVG41CrwdqFMePs8W+JMSsUbr8555S3riha0//RUAEREAE6oWA2uFBoAFkCi0fMDAz/dzcs8fEfQLqxAk+NvlDaJQPMvm9wkiFNIpTRE6pvPCsE0/F9t133129enVHyNfmzZtT0TpVMk8gZA93cFbk86Y9Erbtixcv3rp1a9pb3eD1f+aZZ8L2O+c818MG5xah+Y0hUwAzeEhm3oXmhb8Q9Qys9RA8D3cdQKA40XzE2e3cRtEonRmtNqioXd42S65O15ep3HnnnVNCvl555RUrIDJKBgEuviF7eMqqVavIlYzql1uLsG2fPXv29u3byy01AfkbuQqvvvpq2H7nSqh+j3DOpFOmbHvLrFqenXWhWXyVefJR20dgRrRmliw2b73tjgkF4AT3w12pbtKk65jLV6QEfx6FzD4fSeFoPlA94pk+2dcfM//6gxQ9otzU1ETFFUSgkEDv3r0Ld1Md33PPPVNdf1U+GoF99tknVEZdCUPhyhunUKZs3JAdPSa79N/Mg7/Lffn9V840y35oq1SOPz4z6WueSiVPJVIk4jxKKI3iVAyl8tt15oeLnT1tRUAErAnIUAREIGUE0iZTXng2O//KnM7Ifyf9Xvvlvg4fpWJJ/vRxuY/Tls6pBC73MI9C8CilVKN4GPZMjqBRHAfNu2d/tdasvcXZ01YEREAEREAE6pJAqmTKtreyY75uPsjkfqCnsDf6NOeUypo1hWme8aamzBULXJSKs6Timc3vgKtGCV7usdQoXiWjVP59qZSKF576SVdLREAERKCBCaRHpqBR2ud79hRKpWO57deKoFQummWG7tf95ShlaBTXKsWpUXzqxuoPSkWPKLv2gRJFQAREQATSTyA9MmXpjebB3xXPo/TsgGz7IttHYAYMzLRfYp59IadUfHRAT/+ue6VTKVXSKE5tUCrXX2IS9oiyUzVtRUAEREAERKBMAimRKYuvyi5f6a9RHBDZsefYPgIzeEjmX68zW95xMvptP5w1hAKLvDTJR/LSJB8pMO8ZtV/rsdRPKJX2KVIqPSlrTwREQAREoB4IpEGmrFmTvWu92Ws/K97vbMuyNrTtLSvjEa2ZC6Z1KhVv854CxbHLfpD7n9co7GT+nvuqtxpoFMom/G17dtk1tvoMewUREAEREAERSAOBxMuUjRuyHcuD51HyYqKlb25tiBUiS/ptbZlTTjbbXnY3z7stOexoFEevcDBYoGBkHyznUfIOM33Mc783P7gkn6CICIiACIiACNSUQDyFJ1umPPlo9uvnhWiooypa+uZWiDpusM046wJz6LHmvZIJGMebmxdHo3CkO/L3TIBSYa2HQJ7AEFajOA4/0jv7mw3mhkXOnrYiIAIiIAIiUAcEEixTXn8tO3Oe7VrPB7k1l+7+GLxv7hHle+7pTvGNZdrnZQ44yBQqFQuNUugyQKMUmvrHo2kUJ1e/gdkNP9Ujyv6AdVQEREAEPAnoQPIIJFWmoFG+uzj3NW6WyFAVhEJj5lSW/CD3VfqFiV7x5hYzY2ampXnn8SJXO1Nz//LTJ7mdrr8AjcIkCqHL2O+/ozb8LNyOFeb6SO+sHlF2g6Q0ERABERCBNBJIpEzZ9lYWjRL0+HE3bm9Vkf36TNtHYAYPMfMXmMIJle4C/GIBGsUvaxzHCjWK4+8jvbOXjbHVZ04WbUVABFJLQBUXgfomkEiZsvTG3Mdg+3TNbZTXA9n2BbZfpjJseGbS+cZDqTCPQiiqS7BGsZxHwW+p4CDRP3hl2euA7E1X2+oz/yJ0VAREQAREQARqRyB5MsV5/NhGoziTKM7Wi2BLX/P0n3NzM5aPKLe1Zb423ryzzctfuPSKahT/qrzyZ3PTFba/yOjvSkdFIGYCcicCIiACtgQSJlPuuSd71Q+CHz92WvdBpuhb14zrC6XC+tE1V9qO2eMmZE78UpFScZ1HCZhKqbRG8ZpKcSD07pXd9HD24rNtW+3k0lYEREAEREAEkkQgSTJl44bst79jq1GA6D+PgkF+IO/fJ3v/f5nbVpFmFc77Zu7Bn645lVKNEuykohqFdhECK7HbAPPsY2b1D6VUAlEFG8hCBERABESgFgQSI1NeeDY7/8qYNcqOzqeUnRF915bsv60wlo8oNzWZGTPNXkOYU3HVKLHNo1Suy5lqwvluA7I/vdn87HaiCiIgAiIgAiKQOgLJkClolPYFIR4/tsFcqFEce5TKVQtsf0V58JDcbxN+rK+TtXAboFEKTQPjjoQKNCs0CMzCJFNn2JmJ1Z/rLjIbfrFzt97/vfvuu1tLXiTWWbtpUT7UWdOq1hwHYOHJQkrVSk9IQTTZCQmpTxWqQXsLO504KVUoV0VEJpAAmbJjR/aaG8zTf7adSikcg/3bXTqif+ij5urv2D4Cg1I5/+LsllcKCwnWKJVe7imsTWkcOKWJg4eZ5e31+ogyV5lHHnnk7rvv7ujoWLx48ZzO14wZM87ufE2dOrUzYc7ll1+OwerVqzEmSymkJKds3ryZatPGFStW0AqaOb/rRZxAIk3D4Jlnnkld66pGntEIPlDKY3TODc4WJ8LWOU8wwAxjslStelUoiBPpgQceoGk0kHOGM6frPJpPw9klkUMYcL7VzYlEQ2gObxCaRhtpMh1NoN8JRAik03Zs4AOlKvSFirAnkACZ8v1ruh4/tq92kCUChVBq1ZTNvrXNLLna9hHlEa2ZaXPzSiUFGsVZ6ylpePbDLdmrL7TVZyXZE5jA+MFFZ/LkyaNHjz7jjDNOPvnkKVOmzJ49e8mSJUuXLl25cuWaztctt9zCLonz5s3D4NRTT8WYLGTkWpzAdhVWiWsrV8+xY8dSYapNGydMmEAraObCrhftYpdEmjZu3Di2GI8fPx44uto6MDlV6Gt6fMyYMfCBkoMRdJwYnB6cLWwJ7JIITAwwAyNZZs6cydCFE8dbGrfU/5JLLhk1ahTnBi3yP5FoOwa0HWOycCIh19LYas5/Kp9/+9D1NI03C28d+ppAvxOI0O+k0+/YwMdpOLqNN2AaG15/da61TOm4IXvXett5FPC7zhaQbh9Y+nni8XCPKE+cirhJh0bx4JPZJZv54C1zzYW2+syeZ3UtuTHimsvVs3fv3lx0uMTcd999Tz/9tH0tMCYLGbkWZzIZdECirsI0kIsjQyN1O+yww7h6orQ2btxItQPbSN7HHnuM1nHxBc5ee+3Vv39/rtQ0MNWjbGDDXQ0YpVAnxx13HKcKfU2PI1zhAyVX+6JEzMBOFsaw1tZWnDByc+7htsgymbvUk9pSZ04k6s/YTFto0YsvvmhTYUBxIpGFE2no0KE4YbKBMxMsNtlrZcN5ztnOpMigQYM4/6k8bx8aYvP2ceoMHyjRcAQrb0AajsJLfsOdyntsU59cU5myZk3ul3dsviLF4ewxBjsHQ2x3bTGPPWSWH1yFcgAAEABJREFU3mib5ZSvZI75f+avb/vZ13yth3kUfz67Npstm82yy43lV8j4tbYGx7gAcfVhJYdrLheRuGqADuAqjFjhsh6Xz2h+qACSglUqLo4MjdGcFOViUOFKTQOZ1mbQKjpar7sMVIyp3BOjThii4mom4o9z78wzz8Q5nRWX29j9OM2nntSWOsfln8kGzkxWSRB/nFdxuY3RD2KCBZ0jjjiCSZGXX345Ls8oPKfhXH+4CsXlVn7sCdROpmzcEOIrUmiQ/xiMQT64Lvfkjzp++jRn777FrFmTT/aLNLeY6Reaj/X1VCoV1Sh+Nes8Rot8NQpTKZ12xqBUnvmtuXlp6h5R5gL0xS9+katPjAJlJ5POf4iVL3zhC1yGOveqveHah0BhWEVScPNXieLRPSNHjmQCvL7FCsMnc/WcJ4yp3BNXgiS6B+d0FtKWjqtEEZF90nxu/XmnUEPqGdmPT0Z0D+KPIjhjfczKPRQyP8qMeaNTTjkFSQGEkLmtzGk45xVLQqg0qwwyio9AjWTKk49mL7w0xFqPfYObsgG2+RH9Y3tkl37P9hHl5pbMdSsyQ/YNcO5/OLBurtn9c6FRXHN5JaJU7rsh92UqXgYJS+eiw8DD3UyFLrv55jLLzWVo8uTJlJhPrHSEcY6r3qBBgxAoFRpW802gXWgg7rC5oHNZz6fXR4TWMXCyyMVcPV1Z6UbRWUhbVoKQtnTiLrvsUukS/f3TfGQTzWectl/g8Pfpc5Tmc8Z++tOfRvXSfB/LSh9iWovrA/OFyAjWaypdHLdJqLRDDjmEcitdlvznCdRCprz+WnbRNfkaBEcYiQmBdgznhECzQlesN934fdtHlAcMNNNmZv7e+V0shaVYTqXY1K3QrRO3yZUXXk6Wgi3zKISChM7oJ/6PuXNRKh5RfuaZZ1jlYeDprHc1NkuXLqXE6lyDaB1T6Fz1GGOq0bauMrigH3vssYxqtR1guqoTw38m21gsY+CMwVdIF0hbOvH9998PmS9Oc7QCszvIpjidWvhCD6F6WU/kTLYwj98EjUjDq3l9cNqADj788MOXLVv2/vvvOynaVpRALWTK7x8N9/hxXAAKBUqXz+wHJnvZXNsPlg4bbr7xTfPGq125jbHUKN0ZwsT8NUq+OflIT98uAiVvgFL5yY1JXvppaWlh7OG+n9uXfK2rE6FEFoAqLR24wqIVUEXVaVRRKdx3MqohyGo1wBTVp5xdJlFYg2CiqBwn5eSlE2P8JETYmsycOZPlvErPNfrUivVEtBqTgj42sR/i7cnyFuUyrxO7cxuH9Dhyn62NsWzKJFADmZK9517bSnsMwC7Z/Uf0fAZXh8ypXDrL9oOlxx+fmTh154dU7DWKZfXy9SQSmMV7EoXcwWHLZvPgL4PNamRx2223MfbU6hrE3dIxxxzDpbASrcetc4VFK1TCv7VPw9DObHmVBxj76gVaMunFIh2TKI05WiAxjzrqKFQCZ1Qgq4oa8H5hUpDFl+rMz3EDw8WB5a2KNkrOk0OgBjLFbHkjzvYznBMCPboKlK5c2Wf/Yux/m/D0cbnfJvR/8KfLc+6/TfVydgV/gVloDqEgR1HUbyolb7r1zXw0aREmcms79nDlZTY79ssuIyvLE4m6wjLAMCGRtBMgsD4OSWYyAi3r0gBxWcO5BFekvGdZ/6q0ZmKFC41SqxsY14YrsdIEaiFTLNvkOwzv9MFw7nwp/s79KP8yHzaZlubcbxNe932r/E1N5rxvmoPtPk5LDa2cFhgFZgkiY6VRCgpMTbS6FWUI/PGPfxxjmYysZ555JnMYMfqMxRUTEosXL47FVXWcMJEASZbnqlNc0kphxRBxiZJOWsV4yzANGbu4zzcTcdba2lrbG5h8ZRSpGoEayJTMl74U3LygkXinBzSKzaDu5g11ghNnm4ugVNbealYtJx4cmpoy7ddl+g8wW9/xNKZiBM/DHgciZOnpyVaj7NpsdtunZ1btFRNg/GaGuTg10j4j6+jRo2v4GQL/Ws+ePZulKH+bhBylR5hISCzJSlNi6ovmV7qUyP4RT4MGDUKRR/bgldERZ15HlV7HBGogU8xhhwQ8iuymKlz6gBGd4HLAKin7gclrFCdDpv8e5q47bB/8aW4x02aafn2cvF7bcOk2zfGFY6tRnGodMtz5r60PgVhW3LlqT548OeEz1SxFdXR0VO5W2Aey/SFIjh8/nrHQPks9WTJUI50T3iLWfZjroqdirCfzKEkWZzG2VK5KCdRCpgwekpk8wbyzrbQ2uRTfYThn4PzZjOiOpce2SKM4VrlvxLf/bcJhwzPnnW9ee83J22MboXqBWSBD6FFMj50QGuXN582YWQal1cOBdlwIsLLAJdLlgHUSA//UqVNTcfc/ZcqUeNe5rCFZGTL+QbJhNcoDDzyQlqGas525Q6tOtTBi/mzcuHEWhjKpTwKlMqUq7Wxry4w93UWp+A7DuZo5Y7mzze17/+HKCQUmjjRhSyhI3hnNaZTOaHb8abaPKLeekPnWFcVKxaZ6nQV1b2yyfJDpti+JhdAo720zp842rSeU+FCCO4Hrr78+8q0hGmXGjBloHXfXyUudMGFCmbKsQm2C5Jw5c1JEMl4ODNVnn312vD4r6o25w1GjRtFrZZbCaulhhx2GQi3Tj7Knl0CNZArAzplojjy8h1JBVZDuH3b4DdXdWT1csdDTbdMz1q1RPpQ1Tc1m4WW2SsV5RHmXt3f6sxEcO027/llm8WgUXsJplOHHm1ETyaVgSYBbwwcffNDSuMhs+fLlS5cuLUpM+C53rowNSavktddemzqScTFksL/wwgufDvMTm3EVXY4fNCXnfzkeaHh7e3s5HhKTVxWJTqB2MqWpKXPRrGKlEtgQyxHdY+KhdBLFUSfOtrvwj/XNPvG4+dcf2H6ZyunjMgcck/s4rWX1ukuyiyFQCB624TTKPgeayXNNU5OHMyW7Ezj//PPdD/imcgfMMoqvSfSD/fr1i57ZNyd3rgsWLGDra1XVg5CcPXt2VYtMUmFMI6GV46oRZ86xxx6LTzTEhq7X+vXr2Z00adLQoUPjKgg/nP+sVRGJFtCmCXwyLlpblCsygdrJFKo8YGBm+rlm6H65ORXvYRjD7sBsSqAUwBWhO0+PWJFSyfw9U6xRHHOUyr13m2U3OHsBW0b92f+SOeAgk/V+8MfLhU1zvPIaE0qjZPvvb2YvqSeNwtV2xowZ8+fP5wrL9fbhrhdxLrukc7Strc2U/XrxxRfDXm0Z5s8444yyS97pgFbkxxXuqrds2fLss8+yJU5jWZaKq6VOeStXrkzOh1Q2b948bdo0p2JxbTlzzjrrLKBBNR/YJXHEiBFxlRKLn9WrVy9ZsqR8V5xCixYt4i3CaXPvvfeiRMePH3901+ukk05it6Oj46mnnsLgzjvvnDRpUiwoWltbeS9EqD/vuHi1qaPPkGL5HncipIwZM+bggw+OUEllqQKBmsoU2jd4SGb2dP5bBUZ0gr+pt0BxzeeuURzT3XbPrr3VrFnj7AVsUSozZppMn3BKJbA5AaWGOdx/UGb6pfXxsdl+/fpxwWV45qp69dVXz507lyss19tDu17EueySzlFuyJAsjEBhYLnY3nzzzS6p3kkM82gI7+O2RxBbtJRW5MeV/fffHwJOIE5jJ0+e7LQUS668tq597bgPTsjSD/fTGzdu9K2s7UHGXSQdlDhzWEICGlTzgV0SV6xYgQFmSRi3kGjUxLZ5HnYIFN4CnEKzZs3iLeJh1Z3MqTVq1CgQgYLS99xzz+5jkWLXXXddhHwxLvdAAOGFOPvRj36E5sv3uBOhpcChsVCK6+0Tob3K4kWg1jKFeg0bnrnyMv77hbKHcyZRCEVF+GkUx3TgwOxtN9o+oozkmvMd835fJ2vwNrBRSC6C1wLWLtlQUynm7Hlm8JDgWiXbggso183HH3+cCy7DM4N0YH0HDRqEZFm4cCGioZyBZ9OmTYwZgcU5Bgzw5X8NCQLlpZdeQmzRUlrhePbZYoPlvHnzyMWsgI+l5aGLLrrI0rJyZjC3v6X2qQYDFeKDpRMkHZQ4c3r16lVqTyKHMMDs/vvvJwvzLqVmVUtBolHncopjeMYJbwFOj7B+QAGH3/3ud2WqfN6zTI2EKh3RUGbDneKoOW98CCC8kGhAoIudQ4VbLiwchRJvHyaTqHC8i1+FZSkelkACZApVHtGamTHNvNX1KVRSikLZaz1F/tgN1igfymJGyP024ZOPEgkOSK7pc6wmVGw0ygd2nxcOrNZ728yEdjMs9d+SwtwsAoXrJteawEYXGXBt4pr7m9/8JvLdEjf0jz76aJFbr11uBKNNdDsOGVOZnEegRGspubjKM8Tix3EYbbtmzZqaP/UzderUaJXP50JngIKlE8QHp0E+PTDC0EUWbsEZ6XESaB+7AWK3HInGCI1gZXgO1erSVnA6Mc/ETANzUaVHbVJefvllJiPfffddG2Ns0KZXXHEFkXIClwveRNScN749ASzpdy4yf/jDH7hP2GcffQdmOZ0QT95kyBTacvzxuUeUX/gLUZdgM6j3zFY4d1IYxypYoGDUpVGImn59spddbPvgD5LrtElm26u5jF5/gc1xMjKVQsTZEikI4eZRTplm0v/48fLly5mt5YpZgCF0lGsQd0uRlcoTTzxhUySjC3dvNpbGuFixnnXTTTdxb+dyLEwSQyx+GKvCZCq2ZXQpR28Vuwu5D0mkUshMPcyByTw/KHqkhtxhpMcJg1bIfOWasyQR2QXzAcwglvl+KSydmYbbb789svBlNY1ZmUKHPvGf/OQnTIH4GAQeQlRxuSjnTcS1gvuEu+66qyYKNbCBDWWQGJkC9XMmZiac5TKnYjmo46Eg5J89LtIomHh+bJZjXmHrO9kfLLBVKieOzhwz1lOp2DTHTZrkqxZOo5ww3owck8+b0gi3s+PHj+fCUX79cYJSiXZf+Pvf/95mzC5ndEGNsZ7F/Vz5LcUDfhirGKqJRwvorT/+8Y/R8pafi1vhcpwwVgEzlqEaJwxanIfl1CdU3kceeWTlypWhsuSNqSfzAZzq+ZRYIkDgfIisVJhitKkGUynU38bS1YaFXSZREFWxNB+hw3Ra5Ca71lCJYQkkSaY0NZlJ38g9ouys/jjDubP1b5b3oF6qUfAUPJtSOJVCBkK/PuaBB2wfUaYh55yb+fxIl9Ufy+Z4L/eE0yjDjzenn0v14wxV98XIze1sjMVy/VqxYkWEDwb+7Gc/e+ONN/xrwujyy1/+0t/G6yhXZ9SY19Fo6TSWoRqG0bKTq0ytgIdoAZLojGh5hw4d6oxV0bJ75eI8ZP0I8edlEGM6J0M0b2SkntHyBubidEKpRPvk03333UefBhbx4IMPYhlo5mrAzAfNR1u4Ho2cyIph5CnYyIUqY55AkmQKlWpuyX2ZSkvf3JyKzedRyELwGNRj0ygUQRg4MHv/f5mb7b6qq7nFTJxlert8Rg9PfsFbcox9iYoAABAASURBVJErnEbZ/zO5OpAtzYEF5q9+9auxt4Dl6gkTJoR1y1TKq6/6LucZ89BDD7344othPWOPkqjc6IL6iXydZdmFxRdqWOUQmST1vPXWW2Mfq3BLYP1o7dq1RCoaAP6f//mfEYpgZapyZ5FTH5QKU3RMWji7obarVq0KtL/qqqsCbVwNkI+szfHWdj1aZiJTsGWun5ZZgUbOnjCZQlcMGJi54XsGpWIz8YC9x7heqFGwckKUeRQnp7Pt1ye7ep3tI8rNLZl5HU6+ndvAFuXbko/szJn7F06j9B9kxn6zDh4/5oLIZTHX/rj/Tj311Aifj/P/QZnI89WoMZRE3E3s4Y85lWg3wXhh8oltNQOKsKOj59vHunjmYCqkUZwqoFS4ZXfiFdpymm0M/ww2/XveeedVqEqFbln9iUYA6YkCK3RVFOdohIY7TlidoWJOPPYtVyGmFZmli92zHAYSSJ5MocqDh2Suns//gMBYTsDI2RLpCmiU/GdTutJMuRrFcYRSWfq9cI8oOxntNYpj33MbTqPs2mymX1kHjx9ff/313CH1JBHbHiPZ4YcfHtad/3OVzz33XIT56hEjRnCvFrYmYe0heckll0S7Cb7jjjvsH9MIWzFX++eff56h2vWQfyLnzEknneRvU/5RZiyYtyjfj6sHUNMK10M+ifQs/Usv+9jEeIhJC+b/wjpEgvz617/2yRVZECObeEf7eI7l0K9+9SsplTzJqkUSKVNo/bDhmanTzbaXibqHEmlSZIZSKUyJR6M4Hgf2zl6z0Ng/ojz6TM+P0zoO2fo2J4RGwRXha/9SBxqFC+6Xv/xlWlO58M///M9hnbMw75OFNWyfo16HLrjggsrdBRYWytAyc+bMwhTL+Ouvv27/mIalT38zRh1/A9ejbW1tlVgidC2LeYsIs3GurooSt2/fHkHsTp48mf4tclXRXd6eAA9bxKZNm9BhrrlIZ7rF9ZB/ItNICEd/m1iO8j4t/0npWGrSUE6SKlPohOOPz0ycat57i2iPwIhO8P48CgKlaColTo3iTIo0ZUM8ojxyTOYLY8zW13q0onDHaY5HiwoNreIT2s2IVivLZBvNmTOHi0JF63jcccfF639J+C8150JfnSus09JoS0sswTwY9ccXnXLDbqOt+Jxzzjmo27BlRbOnoKWV+VFJbtkjVAmZEiFXOVkgMG7cuLAemJnbsmWLa64nnngi2ue6WBp2dViSGEMCc3VjxqT+2ckYQFTRRYJlChTGTcic+CUXpcKIztCOQUFAneT3CuP5xBgijkZxHO3ydu4R5W0lKso5WrSdeH7uwZ+/bS9K7t6lOYTu/e5YiKmUN583J06og69IcRp/5JFHOpHKbaPdDTNmu1aJZXXXdP/EaNMb/j79j65fv97fwPXo448/7tVwV/tyEiEZoSwEH0NIOeWGzUtxFBo2V6C9zedMi5xEm3wqchJhF4V97LHHhsqIEHnllVdcszDREuHrUlh9q/T9TGFte/XqxfRnYYrilSaQbJlC68851xx8RLdSccZyZ8vRgsAMSqk6YR6FUGDlFi19/NjNyhRqFAwyfcxzvzfXXEk0ODQ1mYmzMkOGmiKlQkMI3vlDaJT3tpljz62Dr0hxYHDt23333Z145bZccVjRD+vf65nkCJ+lYJ376KOPDluBMu2HDx8eodWPPPKIV8PLrE9p9ggkcVJ9wUehzN+wjTf86U9/6nZoEeMsqoKm96rIlClTvA55pXut7Pz3f/+3VxavdGZ0Tj/9dK+jFUo/9NBDI7yDKlSZRnCbeJnS3JK5YoHZa0i3UvHollKN4mHYM9lSo/TMtHMv0yf723Xmtht27vr/a24xs5eYt3vOvjAtRPDIGE6jDD/ejJ3k4Sl9yayyE6pQ76OOOipsKV7PJP/Hf/xHWFcXX3xx2Czl23PreeaZZ4b1g3TwanhYV4H2Dz/8cKBNkQG69sADDyxKrMIumo+iYyyImaT/+Z//CeXws5/97HPPPYeOrEkYOHBgqNpi7Dr3w/zZk08+ydFQgUXMaHOioUopNW5vby9NVEqFCCReptDupqbMd7+TGbKvKf2cCkc7g6tGiW0ehSKKplJIcULz7tkfLzVrb3H2ArbNLZmFy7ttmEdxQndSpBjzKPscaM44rw4eP863v3///vl4RSN77bVXWP+vveb+MaMIo3gEkRS2tq72BxxwgGu6f6JXw4tylb/r9dkFH8/jxo3jxtrHoEKH0Hyf+9znYnSOTGFZJJTDlStXtra2HlajF0WHqi3Grh8QZq4OKczRUIHJSOZEQ2WJxZjpqwjfDxlL0Q3oJA0yhW4ZMNBMm5lpaSZaGFzViWNQDY3ilIRSuWul7SPKw4ZnJszMLf0gULznUXAcYioF66kLDYiI1EvYe++9q9OUT3ziE2ELcpUj3Av+7//+byhXbW1tffv2DZUlLmPmAEaMGBHWG7fsYbNEsI9AklI+9alPsa1JYAkgxnKfsPvdqBhLrImrd91+hjCsTGHlhVCT+nMfVbVnymrSwEQVmhKZArNhw83Mb5l3thHNh+wHuWiRWEGgEHIHfP7s13q85lEKne/IZBdNNy88W5jmGW89IXPaJPPG6wal4mEUTqPM7qgzjQKVfffdl20VQu/evY0JV86bb75ZmoF7wbCTDcOGDeNevNRVFVIoN8JHf5591u4ML68BkHQVgj5eWXb55Cc/6WNQ0UOsudRkIqeijaq089IZo7fe6rkgblED1puqszRcWhemcGpVdGll6j4lPTKFrhjRmpl0fpFSKdIoWAWHeDWKUx5zKu1TbH+bcOSY3IM/2991shZtw2mU6YsMAq7IRfp3P/rRj1anEREK2r7d5YktRtawHymo2oyRK8kIMmXTpk2uruJNZLgKK/gYMLi7jbca9t7QKAMGDLC397FkjmHz5s0+BnVziPdLUVu8Hv8pMivcpd8Ld6scr9qtVJXblcDiUiVT4NfWljllTF6plGqUas+jUKV8+Nt2s+xyY/uI8qzMgcNNT6WCQCHk/flFOOY8flyPGoXG9enTh20yg6tMYcVn27YeU32BlY8wkRPo094gwodynnzyScZR+yIiW7733nuh8kKSu9tQWeI1jvFTnK5nV7y1TYK3UiUa4dQaMmRIDduyxx57DB06tIYVaJyi0yZT6JnJ5+a+TOWdbVE0Ctktg81aT5Grj/TO/vFR88PFZseOoiMuu80t5py5Zo/9ipSKi6Vr0nvbzKmz6+bxY9cmJjbRdSDhIrt169ZQdY4wkRPKv79xhLmcsA30r4DPUSZUfI6WHqrhVIpTmUMOOcSJlLl1PbXK9JnM7Mj6ooqVphQZlO7WcKWPyrS0tOy2225EFCpNoHoyJc6WnD8rM2Tf7Fs9bl6D51GogeVyTwSN4mRBqfxqrVn9Q4oKDgMGZqZfmjPrnFMJMY+CRjlilBk1MZdXf6klUNsJgNqKJJ9Oe+edd3yOuh6K8DloVz+RE2PUSQ2iVGJp5sDwz0JH7uLSjLX6/HtpTeo+JZ0yhW751qWFSiURGoVaEfoNzP70ZrPhF0SDw+AhmXMvyXxkRziNss+Bua9IaWoK9i8LEfAgEOHm1cOTkkVABGpGoBEKTq1MGTzETJtpPtbXtpMqPY9SWA/mVG5YYPvbhK0nmAnthgmSQg9eccz6DzJzO+rpK1K82lr36aXL89Vs8htvvFHN4uzL6tOnzy677GJvj+Xbb7/NtoYhwhe91LC2SSi6d/gn7EqrLaldyqQuU1IrU+iNYcMzly3MbnH/eQiOd4fKaZTuMnrGUCoLpts/omxOGG/efL6nC7c9NMr0K43mUdzY1DaNFZx+/fqFqkMs896hSiw0jvB0cdgGFhYXKv7xj388lH3VPjTjVavS51a8LP3TGbwJ/jbpP5prQemaY4QVnL/85S85XzX6e+WVV8J+iKpGNU19sWmWKcBHqUybG6BULDUK3iKEpqxPpuw1l9k+ojxqojl6bMCcClMpZ88zTCP5FKlDNSLAZbe5ufjrB/3r4vr9K/5ZYjwa4U502LBhqLEY6+DqqqXz5XrIK7G2go9a/fnPf2ZbfgBvg8iUUlGyxx57hAUY4TeAwhbhY//OO+/UtgI+dauzQymXKfRGW1tm4lTzV49ZX3uN4is4KMcl+Gf5SG/zyp9tH1FmguSM88z+n/FUKmgU1oaGDXephpISQGD33Xf/+Mc/Hqoif/rTn2o1DbB58+YIEwBxPc/iT2m33XYDpr9N0VFUQmVJFpXXc/fdd999/nmLqdCeubz2Bg0a5HWontJLuxh1GraBT4b/DaCwRfjY1/D961OrujyUfplCt5w+LveI8huvEu0RaqhRnHr07pX9zYbcI8rOrv92wMDcI8os65SaoVFOmWZaTyg9opSEEOjbt2/Y6+w999xTqw+IPPfcc4888khYdNX5mgqmE0rHMP+qMmDEKBT8yyo9+sQTT7z88sul6UrxIeD6TTNhv4YEqV1DeaqpFJ/+jfdQXcgUpiLO+2bmH440hUqlthrF+SL8DzJmtwHm0Xtsf5sQpcKyzpvP95hTYfeIUebE0fF2vLzFS4Cb4LCDK2PbM888E2818t78I4zrEa7v1fmaChY+wj7f+9hjj73yyiv+Ta7c0YceeihG5wcccEBYbwz5DPCEgw8+eETn69iuV1vB66yu16TO14wZM+Z0veZ3vhZ1vq7vei3v+bqz4LW+67Wh6/VwmBeZ6OWiZiL0DzzwwKJE/1206R//+Ed/mwod5e0TQehXqDJ177YuZAq9hFKZc2lOqXit/mDjGvwXbsrJglIhGJP9cEv235faKhWWdS67w+xT8HYd921z7mx9bNa1KxKVGFamUPmrr76abZUDV9i1a9dGKHS//faLkCtClghfgn7vvfey+BKhrDKzADNemULbkR2havW1r33tD3/4w1NPPbVp06Zfd76g4YTVBa8VXa+Ozhfn3oKu19zO16zO1+Su1/ier1EFr5O6Xkd3vQ4N8yJTaQPRpsOGDStN90lB6D/44IM+BpU7hEJas2ZN5fzLcyGBepEptImpiBmdjygzj0IgJTBE0CiBPjHoVCf87w6s/qBUNm7oTvGJDRtuLltmLl5qpi8y3765Yb5q1odIOg4dccQRYSt63333VX9ChRvQCFdY7tTDrmqFpZG3P+qoo/Jxy8iSJUtq8lQwwxWLd5aVtDFDpoT9kBOqoyZtt2mOvQ3zK3vvvbe9vWP585//fHMtfgVp1apVTgW0rQKBOpIp0Bo8JHPZQvPaa0SDQzSNEpgLjcJaj2vxyy60ffCH7IOH5H5TEO1FXCENBCIMrjSLMYZtNUN7e3uE4rhb3q1aXw3OUB2hhrfcckuEXGVm+eUvf8k9fZlOirJ/6lOfKkrx32VG5yc/+Ym/TSqO7rvvvmEfekfoP/roo1VuHfN2yOIqF9rIxdWXTKEnhw3PXP49/geEQLVRmp8shML00jgahURnS6Qw9O6V2/vu5BBjA657AAAQAElEQVRKJZdBf6khEG1w/fGPf/zAAw9UrZGUxZU9QnEHHXRQ2CEkQin5LGPGjMnHLSOzZ8+u8o01M2EUalk9e7Nx48bZGzuWU6ZMYex04undfvaznw277kNjTz75ZLbVDPPnz69mcSqr7mQKXTqiNXP6N8zW0L8MQtaygqs66fKY+zr8XZvNls1m2eVm21tdyfpfVwTmzJkTtj3ciy9btqw6Ywyj+EUXXRS2htgjUI488kgiVQtjx46NUNZ1110XIVfkLAsWLIic1ydjNNSLFy/28ZmKQ5xm0bT+ihUrqtbARx555I477qhacY1YUEmb61Gm0Mi2tsyoL3qu/gROiuChKARm8dUo3c5QKs/81vYR5e5siqWDwIknnhihoitXrmROJULGsFlYFtm4cWPYXNgPGDDg8MMPJ1K1MHz48AhlsYLGKBIhY4Qsd999Nx0XIWNglv79+x977LGBZkUGN954Y9Xa7hQNgdjl9WmnneY4D7W94oormNkKlSWaMe1dtWrV008/HS27ckUjUKcyBRjnzs4cd5LLnEqg4CBv2IBG8fo8Sqer3FRKZyS3Qak8cLO57YZcXH/1ReCTn/xkhAEGBhMmTKj0GLN69erIKxRf+cpXevXqXLWkrlUJDNURpta3bt16yimnMGlU6TrSWd/61rcqVAqoWcQJ6/zFF1+88MILq9B2p2KsHrLa8sUvfjFefXDSSSc5/kNt0Q3t7e30fqhcEYyvvfZa10+lRHClLPYE6lemwGD6heaInvdk0TSKfy5Ho7ClRLeQ2aXkC/U/8X/ML1aYDb9wM1daigkMGjToC1/4QrQGcMVn8IuWNzAXnk899dRAMy+D8ePHex2qUDpD9ec+97kIzhmtUWMVHbFwjiB47LHHIlTPMsvBnd+AYmmcN7vvvvsiaLt8dvsI0sSZ9qDEoUOHsuYCE/vs/paLFi3yN3A9ykxhpduOMuPUci1diRUlUNcypbklM+2Sbnz+aqPbrmfMP5ejTpxtz3zOnotGcQ4wp7K83fZXlJ0s2qaBwD/90z+F/d4Lp1kvv/zyGWecwQDg7Ma45fKKBorssK2tLdonBiKX6GQ88MADKdqJh9oyYi1evJj5+VC5LI1xO2PGDIZnS/toZgCPptKWLl1K2y0KjW7ChA2yldM174K5wLPPPjuuU5d3UN5zqAjzHJVrO2+ikSNHhqqPjOMiUNcyBUgDBmauvNbs8rbxVxtYugabXN7LPZ4axSkLpbJID/44LOpne+ihh0a+zjJ3zb0pF8QYcXCn29raWjiohHU+c+bMsFlise/Xr1+EZ16cohcuXDhmzJgYb/Edt4zEuK3QR1KcIvJbpEA+HirCHf8ll1yCnAqVy9IYjbLXXnuVfsJpzZo1nLqcbOWXyzsowkfRnfo7bY+93++++27eRLG7deqsbSCBepcpABg8JDMl0gfyAzWKM4nibCmoZwjQKHnjW68zO3bk9xSpAwIMEuW0ggsiN4XlXxMZUS6//HLudMupDKMysxrleCgn76hRo7qnpkI6YuAcPXo0wiJkPk9z5CPSAbeeFrEeYELlrLPOiuYSlcZIzwkQLbtXLgj4f5Kak41pFVYYvTxYprNAueeee1oaF5nF23ZUF9rr5Ko/81zUqAbfbQCZQg+PaM2MPtO89DpR22CpUTzc2WoUJlReeNy8/IKHGyWnkgADDKN7OVXnppAhlnu4yE64tp555pnz5s2L7MHJyIDBrIYTr8mWVYzI5bI0w2pXR0dHZA/5jDg57bTTSmcR8gaViJSjd1kB4QRAWMRVMSQvBAKn5VhxY+0SXOWUy4TK8ccfH9kD5wxtL+ft4xSNxkV1ob2cXW1rRaAxZAp0R47JTJxqtpX8ijKHSkOgRiELaz0EIiXBVqOUZFRC3RBob2/v169fOc1hiOUe7qijjuJqazmzwp0fN9CrV68+5JBDuLbioZwKkLetrY35DCI1DKygTZo0KXIFWEebMmXK4MGDGbAtMRaWRRb4ZzIZnASO0IUZY4mjd6+//vrIrjgBmJljzY6zIrITTirQffrTn0byWhJwmHPqMsxHLheZFTkvGWk7b5/jjjuOOtAEUkIFiCHLhg4diuoKlVHGlSDQMDIFeOMmZD4/0mSDvvYtUKOwypMPuO0ZQmuUvv1M/4E9fWgv0QS2b98eWD8GGGbdA80CDbh952p7zDHHcNFEfzCdzgWUsTN/5SVOCukcZamIOXnmP+J6COW73/1uYA0rbdCrV6+vf/3rkZd+nOq9+OKLDNhMUDHJBKs8Pedo6RYDzJgSIAv8Sw2qlvLlL395xIgR5RTHeH/QQQdxbtCiUH44tZBoaETQoTxC5cWYU5dhHuDAZDdsYA5v+fLlYXMV2SNWqMOMGTN4d6BXio6W7vJWQpPxXoMYsqzUQCk1IdBIMgXAE2eZPfYLVipYVie8+bw5brRpbqlOaRalyCQ2AkwXc4mMxR2yg4sm+oPpdGaz8czgMb7zRZyUU045haPYWN7v2tSK+3jElo1lpW1YAvjGN75RfikMWkwygQ1orKcwdDFyMzI5gWGMIYphlekHDEDNDApZyi+3HA+DBg264IILyvFAXgQHy4i0iLajV2gpiV4BYzjABwhItDI/Lwxw/HiV5Z+ORGM+z9/G5ihrQLw7aDsBCeLa70jSyZMn81YaOXIk7yMg2HiWTXUINJhMaW7JtF/np1T8p1KcSRTvngk3lfLeNnPqbNN6grc/HUkxAW4H161bF28DuKll4FyzZg2DhxOIk8JsQbwFnXXWWV/96lfj9VmOt7lz5x588MHleMjnRfMxk79w4UKGrsMOO2yvrheasrW1lWGV6QcMQJ3PUtsI627MB5RfB1rEOYNeoaUsYxHGjh2LHHEC4owlEhL79+8PB/hwapVfKB4Y/tlGCLyDmM8rcyItXy6zOzQfCeLa70hS1AxvJQmUPLHkRNIvU8KybG7JTL/UfKS3y5xKoEbxLSu0RjlilBk10delDqabALMRzEmksQ0MXQwSiar5nXfeGZdSSVS7bCrD4Brt2439naPGkCNOQJwxSPvbRzjK+X/00UdHyOhk4R30ve99z4lr27AEGk+m0NWDh2TOmcv/HqHKGmWfA83YSaapqUcdtFN3BLg7Z2YiXc1av349w0PS6kyV2tvbk1ar6tQHyXjllVcyC1Kd4uIqhSUbzv8yvTGZFMvHvMqsRsNlT1KDG1Km0AEjWnNfppJ/8Kc8jYK/EIG1nl2bzWXL9JGUENBSa9qrVy8mk7lep6UFy5cvj/a7KlVoICMW1atCQQks4tBDD73pppsSWDGvKo0YMWL16tWc/14G9ulMJsWy7GVfoiwTRaBRZQqdgFKZMDu39OOvUbD0Daz1EHxNCg6iUfoPMhcvLUhStM4JcKW+9tprKzFpHzu4RYsWJeojKaUNHD9+fMPeW7N6wspXKZMEpqBRbr/99rgqxjsIpRL4XURxFSc/SSPQwDKFrjhxdKb1S2bra0Tdw4dLfjWwp10IgeJkZB7l7Hlm8BBnT9sGITBo0KCOjg6u3UluLzess2bNYkhIciWpGyNWwyqVtMwnoVE45+msuALLXmjohL+D4mqs/BQRaGyZ0tRkJp6f+fxI8zfvb8LwViqhNcqbz5vpi8ywnj/aXNQh2q1TAvvvvz/X7sSu/jAGXH311algj5BasGABFU5FbX0rGeUg80nr16+PkrMqeQ4++ODt27fHq1GciuNz3bp1k8r4rj/Hj7apI9DYMoXuyimVWblHlP/moVQ8vmqWrOECyz3jvi2NEg5afVlznWX1J4Fz18uXL586dWq6YDPxc30Z39CarsYW1fakk05CqSAIitJrvouG+PnPf46OrFBNmFNZuHAh034V8i+3ySTQ8DKFbnEeUSZSpFSYR0GjsOVQSQg3lYJGOWG8GTmmxI0SGouAo1QSdZ1lwOMG3XZoSVJ3TZ48mconqUbVqwtK5c4770yUUpk/f/6SJUs4wytKwVEqDTuXVlG2iXUumdLZNYOHZBYuz+wxoHPHGKQJgR1nS6RnCK1RjhhlTj+3pw/tNSgBrrMsrzDG1Pz50rPOOuull15iwEtvT1D5LVu21PbjyZROn1afIcuImzZtQvLWpPTC9qKW0Itz586tjtilFObSNmzYUNuPqtSq3wvJN0hcMqWrowcPMaPOz32cFmnCJEpXcun/0Bpl/8+Yc2eX+lFKdQgks5RRo0ax0M4YU5PqMbBxP7p06dJK3/tWoXW0BZK1WgAC4+2337733ntXoaWuRSB5V61axZDperQKiZzDaG70YhXKKizi6KOPXrFiBaUXJlYnvueeeyLL2tvba9jv1WlpQkqRTCnoCOcR5TdeL0gqjobWKP0HmdKvkiv2qv1GJMDdMAvtXOKr3Pi2traHHnqI+1HuSqtcdIWKoyEsAD399NPVHK0p6+GHHwYjOqlC7bJ0i0RAKrHmYmkflxnTgUxpcA5zJsflM5QfyqV06hAqV5nGCKP7778f5rvvvnuZrpTdkoBkSk9QI8dkvjrJ68GfKBrlog4zIOwPIPeskvbqlwDjK9Mq27dvZzKg0jPYjKZjxozhmr569Wqu7/UHlUbde++9NJBmVrR1+KcUyjr00EMrWpC9czqXNRfWv+bMmcMSjH3GaJZINOT1U089xZQG53A0J7HkonTqkM1meQdRq1h8ujpBkzmLpExfcaa52iixQgQkU0rAjpqY+b+fNyVzKqE1Co6nXymNAgYFfwJcapkM4IZ4+fLlbW1t/sbRjnILuHbt2ptuuolrejQPaclFA2kmc/I0OfY64xPP+KeUQuctLS2Fu7WKI1YWLFjAUghjdoVUL0M1BDhXkde1aqZruRV9B7G0d+uttwK2aJE0If3uCqSeEmOSKfWEpKnJTJ6bGfJJs/3dfLPCaRQn24R2fY2bQ2LHjh1ORFsfAlwBx48fzxDInfqk+L4cghGL1RDmxhlZ0UM+FajyIeaQKlQizWROnibTcAaYWEphSQVv+MQz/ot89u7duyilhrvM8TBmr1u3Dj0Ro+qFJASWLFkCAfRQDRvoVTS1ct5BLMYhp7zM7NOZQWHS6KWXXmJpD6r2GWUZLwHJFDeeKJX2FbkvU+lUKqE1ynvbDBql9QQ3142Y9o//+I+Mu6FC1W5TBg4cyBUtVN0OOuigyvUil1r0REdHB/PY6BVGR6rHbPY+++xjUygT/oxMZGFihssrThixmKMuHVltvIWyodBQGCt93afJNJwBBgiMr8g1qgccxp7AdkEb5rSIsZkxDw8sqeANn655OcTshX2wqYNrQfaJnEjoCRb4qDx6hcUg1qpoFE2zcZI/keAGPZxAkmbi1iZ7DW2oIacWMx/Umb6j4fSjZcOdVnOeOG8fVrWYNOL+wbU5ffv23W+//ew7Hcv+/fu7uvJM1IFOApIpnRhKN86XqfTuVXokIOXN580p04w0Shcmruxc4Bh3QwUuiF0OKvsfTcAVLVTdaE5lRm3+tQAABtBJREFU69TlnboxOlK9H/3oR3fddReDDfd2DBuMnVx8nYCOYZerKocwwJj5GLbcVnpdXrvcx/mfXqbQUBhpGrnirIS3L04n5BrVu/baa5m9BxS4gAY6ByNbSMKWRI5CG+a0iL5mzPN2vPPIvHnzMLYP69atq+aIhV5hMejmm2+GwC233EIDaT6NLWo+uzSfQxjQFudEghv0drYzbf/oOxpOW+hNn4aDIt9qzhAo2bx9eH+1t7fj3D5wOqGi0kax9vWVTPHug8FDMjOvzPz1uez7GW+jnkeYRzl6rDlxdM9U7YlAWQS4IHLBZbDh3o5hg4sd46ITiBO4qnIIA8x0HfRhXUgSaKBzMLIlDlsSHYxY+vgpOoQxY3moUDWJVlhVaoj2pYGcLTSWJtNwJxAn0HwOYRD5RCosLjlxOsir4chlUORbjaV9teEZKoRybl+NureUTPHt4mHDzbTrMh+85WvUdRCNMvx4M3GWYc2oK03/RaASBBjk8qES/hvHZx4jkcZpdb6ltDof8omNEGnMVqe0ZyVTgjqO5RsWcZAg/oYY7HNgTqM0J+Iz//6V1VEREIEuAvovAiKQaAKSKRbdM3KMYZrkzef9THdtNlMXGmkUP0Y6JgIiIAIiIALhCEim2PGafpn5x5MMUyau5n0/ai5eqq9IcWWjxPgJyKMIiIAINAwByRTrrj5nrmFZp1SpkHL2PH1FijVHGYqACIiACIiALQHJFFtSucmSsy82LO6gS/KZWAma0G6GDc8nKOJKQIkiIAIiIAIiEIGAZEoYaIOHmG/fbPb/zM48rPVMu05fkbKThv6JgAiIgAiIQNwEJFO8iHqkDxhoZl1lpi/KhYs6pFE8MClZBERABERABGIgIJkSHmJTU26Vh4UeJEv43MohAiIgAiIgAg1JIEqjJVOiUFMeERABERABERCBKhCQTKkCZBUhAiIgAiKQTgKqda0JSKbUugdUvgiIgAiIgAiIgAcByRQPMEoWAREQgXQSUK1FoJ4ISKbUU2+qLSIgAiIgAiJQVwQkU+qqO9UYEUgnAdVaBERABNwJSKa4c1GqCIiACIiACIhAzQlIptS8C1SBdBJQrUVABERABCpPQDKl8oxVggiIgAiIgAiIQCQCkimRsKUzk2otAiIgAiIgAukiIJmSrv5SbUVABERABESggQgkXKY0UE+oqSIgAiIgAiIgAkUEJFOKgGhXBERABERABOqYQMqaJpmSsg5TdUVABERABESgcQhIpjROX6ulIiACIpBOAqp1AxOQTGngzlfTRUAEREAERCDZBCRTkt0/qp0IiEA6CajWIiACsRCQTIkFo5yIgAiIgAiIgAjET0AyJX6m8igC6SSgWouACIhA4ghIpiSuS1QhERABERABERABh4BkisNB23QSUK1FQAREQATqmoBkSl13rxonAiIgAiIgAmkmIJlS7d5TeSIgAiIgAiIgApYEJFMsQclMBERABERABESg2gRsZEq166TyREAEREAEREAERAACkilAUBABERABERCBahJQWbYEJFNsSclOBERABERABESgygQkU6oMXMWJgAiIQDoJqNYiUAsCkim1oK4yRUAEREAEREAELAhIplhAkokIiEA6CajWIiACaScgmZL2HlT9RUAEREAERKBuCUim1G3XqmHpJKBai4AIiIAIdBOQTOlmoZgIiIAIiIAIiECiCEimJKo70lkZ1VoEREAEREAEKkNAMqUyXOVVBERABERABESgbAINKlPK5iYHIiACIiACIiACFScgmVJxxCpABERABERABOqeQIUaKJlSIbByKwIiIAIiIAIiUC4ByZRyCSq/CIiACIhAOgmo1ikgIJmSgk5SFUVABERABESgMQlIpjRmv6vVIiAC6SSgWotAgxGQTGmwDldzRUAEREAERCA9BCRT0tNXqqkIpJOAai0CIiACkQlIpkRGp4wiIAIiIAIiIAKVJSCZUlm+8p5OAqq1CIiACIhAIghIpiSiG1QJERABERABERCBUgKSKaVM0pmiWouACIiACIhA3RGQTKm7LlWDREAEREAERKBeCNRSptQLQ7VDBERABERABESgIgQkUyqCVU5FQAREQAREoPoE6q9EyZT661O1SAREQAREQATqhIBkSp10pJohAiIgAukkoFqLgB8ByRQ/OjomAiIgAiIgAiJQQwKSKTWEr6JFQATSSUC1FgERqBYByZRqkVY5IiACIiACIiACIQlIpoQEJnMRSCcB1VoEREAE0khAMiWNvaY6i4AIiIAIiEBDEJBMaYhuTmcjVWsREAEREIFGJyCZ0uhngNovAiIgAiIgAokl8P8BAAD//331pFsAAAAGSURBVAMADUBGRZQHY+8AAAAASUVORK5CYII=" alt="Holded"></div>
      <div><p class="eyebrow">GESTIÓN CONTABLE</p><h2>Acceso a Holded</h2><p>Abre la plataforma de gestión y contabilidad del despacho.</p></div>
      <a class="primary blue-button holded-open" href="https://app.holded.com" target="_blank" rel="noopener noreferrer">Abrir Holded <span>↗</span></a>
    </section>`;
  bindHeader();
}

function renderSignatures(){
  main.innerHTML=`<header><button class="menu" id="menu">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Firmas digitales</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header><section class="signatures-panel"><div class="table-heading"><div><p class="eyebrow">CERTIFICADOS</p><h2>Firmas digitales de clientes</h2></div><div class="signature-actions"><button class="upload-button" id="connectSignatures">Conectar carpeta Firmas digitales</button><label class="client-search"><span>⌕</span><input id="signatureSearch" type="search" placeholder="Buscar cliente…"></label></div></div><div class="signature-table-wrap"><table class="signature-table"><thead><tr><th>Cliente</th><th>Documento</th><th>Estado</th><th>Contraseña</th><th>Caducidad</th><th>Representante</th><th>NIF representante</th></tr></thead><tbody id="signatureRows"><tr><td colspan="7" class="table-empty">Cargando firmas…</td></tr></tbody></table></div></section>`;bindHeader();document.querySelector("#signatureSearch").addEventListener("input",filterSignatureRows);document.querySelector("#connectSignatures").addEventListener("click",connectSignaturesFolder);loadSignatures()
}
async function connectSignaturesFolder(){try{const root=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("signatures-folder",root);await loadSignatures()}catch(error){if(error.name!=="AbortError")alert("No se pudo conectar la carpeta de firmas digitales.")}}
async function loadSignatures(){
 const body=document.querySelector("#signatureRows");try{const root=await getSavedHandle("signatures-folder");if(!root||await root.queryPermission({mode:"read"})!=="granted"){body.innerHTML='<tr><td colspan="7" class="table-empty">Conecta la carpeta Gestión → Firmas digitales.</td></tr>';return}const metadata=await getAllSignatureMetadata(),map=new Map(metadata.map(x=>[x.id,x])),clientMetadata=await getAllClientMetadata(),clientMap=new Map(clientMetadata.map(x=>[x.id,x])),rows=[];
 for await(const doc of root.values()){if(doc.kind!=="file")continue;const m=map.get(doc.name)||{},clientName=m.client||"Sin asignar",client=clientMap.get(clientName)||{};rows.push({client:clientName,document:doc.name,handle:doc,password:m.password||"",expiry:m.expiry||"",representative:client.representative||"",representativeNif:client.representativeNif||""})}
 rows.sort((a,b)=>{if(!a.expiry&&!b.expiry)return a.client.localeCompare(b.client,"es");if(!a.expiry)return 1;if(!b.expiry)return-1;return a.expiry.localeCompare(b.expiry)||a.client.localeCompare(b.client,"es")});
 window.signatureFiles=rows;body.innerHTML=rows.length?rows.map((r,i)=>{const status=signatureExpiryStatus(r.expiry);return `<tr data-search="${escapeHtml((r.client+" "+r.document+" "+status.label+" "+r.representative+" "+r.representativeNif).toLocaleLowerCase("es"))}"><td><strong title="${escapeHtml(r.client)}">${escapeHtml(r.client)}</strong></td><td><button class="document-link" data-download="${i}" title="${escapeHtml(r.document)}">⇩ ${escapeHtml(r.document)}</button></td><td><span class="signature-status ${status.className}">${status.label}</span></td><td><button class="password-cell" data-password="${escapeHtml(r.password)}">${r.password?"••••••••":"—"}</button></td><td><span class="expiry ${expiryClass(r.expiry)}">${formatDate(r.expiry)}</span></td><td title="${escapeHtml(r.representative||"")}">${escapeHtml(r.representative||"—")}</td><td>${escapeHtml(r.representativeNif||"—")}</td></tr>`}).join(""):'<tr><td colspan="7" class="table-empty">Todavía no hay firmas digitales.</td></tr>';
 body.querySelectorAll("[data-download]").forEach(x=>x.addEventListener("click",()=>downloadSignature(Number(x.dataset.download))));body.querySelectorAll("[data-password]").forEach(x=>x.addEventListener("click",()=>{x.textContent=x.textContent.includes("•")?(x.dataset.password||"—"):"••••••••"}))}catch{body.innerHTML='<tr><td colspan="7" class="table-empty">No se pudieron cargar las firmas.</td></tr>'}
}
async function downloadSignature(i){const file=await window.signatureFiles[i].handle.getFile(),url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function filterSignatureRows(e){const q=e.target.value.trim().toLocaleLowerCase("es");document.querySelectorAll("#signatureRows tr[data-search]").forEach(r=>r.hidden=!r.dataset.search.includes(q))}
function formatDate(v){if(!v)return"—";const value=String(v).trim(),iso=value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/),spanish=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(iso)return `${iso[3].padStart(2,"0")}/${iso[2].padStart(2,"0")}/${iso[1]}`;if(spanish)return `${spanish[1].padStart(2,"0")}/${spanish[2].padStart(2,"0")}/${spanish[3]}`;return value}
function expiryClass(v){if(!v)return"";const d=(new Date(v+"T23:59:59")-new Date())/86400000;return d<0?"expired":d<=10?"warning":"valid"}
function signatureExpiryStatus(v){
 if(!v)return{label:"Sin fecha",className:"no-date"};
 const today=new Date();today.setHours(0,0,0,0);
 const expiry=new Date(v+"T00:00:00");
 const days=Math.ceil((expiry-today)/86400000);
 if(days<0)return{label:"Caducada",className:"expired"};
 if(days<=10)return{label:"Urgente",className:"urgent"};
 const oneMonth=new Date(today);oneMonth.setMonth(oneMonth.getMonth()+1);
 if(expiry<oneMonth)return{label:"Inminente",className:"imminent"};
 return{label:"En vigor",className:"valid"};
}



function contactLines(value){return String(value||"").split(/\r?\n/).map(item=>item.trim()).filter(Boolean)}
function normalizePhoneSearch(value){return String(value||"").replace(/\D/g,"")}
async function renderContacts(){
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Contactos</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="contacts-panel">
      <div class="contacts-heading">
        <div><p class="eyebrow">AGENDA DE CLIENTES</p><h2>Teléfonos de contacto</h2><p>Localiza rápidamente quién está llamando.</p></div>
        <label class="phone-search"><span>⌕</span><input id="phoneSearch" type="search" inputmode="tel" autocomplete="off" placeholder="Buscar teléfono, cliente o persona…"></label>
      </div>
      <div class="contacts-summary"><strong id="contactsCount">0</strong><span>contactos encontrados</span></div>
      <div class="contacts-table-wrap"><table class="contacts-table"><thead><tr><th>Cliente</th><th>CIF</th><th>Contacto</th><th>Persona</th></tr></thead><tbody id="contactsRows"><tr><td colspan="4" class="table-empty">Cargando contactos…</td></tr></tbody></table></div>
    </section>`;
  bindHeader();
  document.querySelector("#phoneSearch").addEventListener("input",filterContacts);
  await loadContacts();
}
async function loadContacts(){
  const body=document.querySelector("#contactsRows");
  try{
    const clients=await getAllClientMetadata(),rows=[];
    clients.forEach(client=>{
      const phones=contactLines(client.phones),people=contactLines(client.administrators);
      phones.forEach((phone,index)=>rows.push({client:client.name,cif:client.cif||"",phone,person:people[index]||people[0]||""}));
    });
    rows.sort((a,b)=>a.client.localeCompare(b.client,"es",{sensitivity:"base"})||a.person.localeCompare(b.person,"es",{sensitivity:"base"}));
    body.innerHTML=rows.length?rows.map(row=>`<tr data-contact-search="${escapeHtml((row.client+" "+row.cif+" "+row.phone+" "+row.person).toLocaleLowerCase("es"))}" data-contact-phone="${escapeHtml(normalizePhoneSearch(row.phone))}"><td><strong title="${escapeHtml(row.client)}">${escapeHtml(row.client)}</strong></td><td>${escapeHtml(row.cif||"—")}</td><td><a class="contact-phone-link" href="tel:${escapeHtml(normalizePhoneSearch(row.phone))}"><span>☎</span>${escapeHtml(row.phone)}</a></td><td>${escapeHtml(row.person||"—")}</td></tr>`).join(""):'<tr><td colspan="4" class="table-empty">Todavía no hay teléfonos guardados en las fichas de clientes.</td></tr>';
    document.querySelector("#contactsCount").textContent=String(rows.length);
  }catch{body.innerHTML='<tr><td colspan="4" class="table-empty">No se pudieron cargar los contactos.</td></tr>'}
}
function filterContacts(event){
  const query=event.target.value.trim().toLocaleLowerCase("es"),digits=normalizePhoneSearch(query);
  let visible=0;
  document.querySelectorAll("#contactsRows tr[data-contact-search]").forEach(row=>{
    const matches=!query||row.dataset.contactSearch.includes(query)||(digits&&row.dataset.contactPhone.includes(digits));
    row.hidden=!matches;if(matches)visible++;
  });
  document.querySelector("#contactsCount").textContent=String(visible);
}


let courtesyObjectUrls=[];
function courtesyStorageKey(client){return"app-am-courtesy-"+client}
function getCourtesyData(client){try{return JSON.parse(localStorage.getItem(courtesyStorageKey(client))||"{}")}catch{return{}}}
function saveCourtesyData(client,data){localStorage.setItem(courtesyStorageKey(client),JSON.stringify(data))}
function courtesyClientKey(name){return normalizeFiscalClient(name).toLocaleLowerCase("es")}
async function renderCourtesyDays(){
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Días de cortesía</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="courtesy-panel">
      <div class="table-heading courtesy-heading"><div><p class="eyebrow">NOTIFICACIONES ELECTRÓNICAS</p><h2>Control de días de cortesía</h2><p>Clientes incluidos desde su ficha interna.</p></div><button class="upload-button" id="connectCourtesyFolder">Conectar carpeta Días de cortesía</button></div>
      <div class="courtesy-table-wrap"><table class="courtesy-table"><thead><tr><th>Cliente</th><th>CIF</th><th>Firma</th><th>Fecha presentación</th><th>Periodo solicitado</th><th>Documento</th></tr></thead><tbody id="courtesyRows"><tr><td colspan="6" class="table-empty">Cargando clientes…</td></tr></tbody></table></div>
    </section>`;
  bindHeader();
  document.querySelector("#connectCourtesyFolder").addEventListener("click",connectCourtesyFolder);
  await loadCourtesyDays();
}
async function connectCourtesyFolder(){
  try{const root=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("courtesy-folder",root);await loadCourtesyDays()}
  catch(error){if(error?.name!=="AbortError")alert("No se pudo conectar la carpeta de días de cortesía.")}
}
async function courtesyFileUrl(handle){
  const file=await handle.getFile(),url=URL.createObjectURL(file);courtesyObjectUrls.push(url);return{url,name:file.name};
}
async function loadCourtesyDays(){
  const body=document.querySelector("#courtesyRows"),connect=document.querySelector("#connectCourtesyFolder");
  courtesyObjectUrls.forEach(url=>URL.revokeObjectURL(url));courtesyObjectUrls=[];
  try{
    const clients=(await getAllClientMetadata()).filter(client=>client.courtesyDaysRequired).sort((a,b)=>a.name.localeCompare(b.name,"es"));
    let courtesyRoot=null,signatureRoot=null;
    try{courtesyRoot=await getSavedHandle("courtesy-folder");if(courtesyRoot&&await courtesyRoot.queryPermission({mode:"read"})!=="granted")courtesyRoot=null}catch{}
    try{signatureRoot=await getSavedHandle("signatures-folder");if(signatureRoot&&await signatureRoot.queryPermission({mode:"read"})!=="granted")signatureRoot=null}catch{}
    connect.textContent=courtesyRoot?"Cambiar carpeta":"Conectar carpeta Días de cortesía";
    const signatures=await getAllSignatureMetadata(),signatureMap=new Map(signatures.map(item=>[courtesyClientKey(item.client),item]));
    const rows=[];
    for(const client of clients){
      const data=getCourtesyData(client.name),signatureMeta=signatureMap.get(courtesyClientKey(client.name));
      let signature=null,documentFile=null;
      if(signatureRoot&&signatureMeta?.document){try{signature=await courtesyFileUrl(await signatureRoot.getFileHandle(signatureMeta.document))}catch{}}
      if(courtesyRoot&&data.document){try{documentFile=await courtesyFileUrl(await courtesyRoot.getFileHandle(data.document))}catch{}}
      rows.push({client,data,signature,documentFile});
    }
    window.courtesyRows=rows;
    body.innerHTML=rows.length?rows.map((row,index)=>`<tr data-courtesy-client="${escapeHtml(row.client.name)}"><td><strong title="${escapeHtml(row.client.name)}">${escapeHtml(row.client.name)}</strong></td><td>${escapeHtml(row.client.cif||"—")}</td><td>${row.signature?`<a class="courtesy-file-link" href="${row.signature.url}" download="${escapeHtml(row.signature.name)}">Firma disponible ↓</a>`:'<span class="courtesy-missing">No disponible</span>'}</td><td><input type="date" data-courtesy-field="submitted" value="${escapeHtml(row.data.submitted||"")}"></td><td><input type="text" data-courtesy-field="period" value="${escapeHtml(row.data.period||"")}" placeholder="Ej. del 5 al 12 de agosto"></td><td>${row.documentFile?`<div class="courtesy-document-actions"><a class="courtesy-file-link" href="${row.documentFile.url}" target="_blank" rel="noopener">Ver PDF</a><a class="courtesy-download" href="${row.documentFile.url}" download="${escapeHtml(row.documentFile.name)}">↓</a></div>`:'<span class="courtesy-missing">Sin documento</span>'}<label class="courtesy-upload"><span>${row.documentFile?"Sustituir":"Adjuntar"}</span><input type="file" accept=".pdf" data-courtesy-upload="${index}"></label></td></tr>`).join(""):'<tr><td colspan="6" class="table-empty">No hay clientes marcados con la obligación de días de cortesía.</td></tr>';
    body.querySelectorAll("[data-courtesy-field]").forEach(input=>input.addEventListener("change",saveCourtesyRow));
    body.querySelectorAll("[data-courtesy-upload]").forEach(input=>input.addEventListener("change",event=>uploadCourtesyDocument(Number(event.target.dataset.courtesyUpload),event.target.files[0])));
  }catch{body.innerHTML='<tr><td colspan="6" class="table-empty">No se pudo cargar el control de días de cortesía.</td></tr>'}
}
function saveCourtesyRow(event){
  const row=event.target.closest("tr"),client=row.dataset.courtesyClient,data=getCourtesyData(client);
  row.querySelectorAll("[data-courtesy-field]").forEach(field=>data[field.dataset.courtesyField]=field.value);
  saveCourtesyData(client,data);
}
async function uploadCourtesyDocument(index,file){
  if(!file)return;
  const row=window.courtesyRows[index],client=row.client.name;
  try{
    let root=await getSavedHandle("courtesy-folder");
    if(root&&await root.requestPermission({mode:"readwrite"})!=="granted")root=null;
    if(!root){root=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("courtesy-folder",root)}
    const savedName=`${client} - ${file.name}`;
    await copyNamedFile(file,root,savedName);
    const data=getCourtesyData(client);data.document=savedName;saveCourtesyData(client,data);
    await loadCourtesyDays();
  }catch(error){if(error?.name!=="AbortError")alert("No se pudo guardar el documento. Comprueba el permiso de escritura.")}
}


const workers=["Manuel Molinero","Álvaro Molinero","Francisco Molinero","Araceli Frías","Jesús Carratalá"];


const TASKS_STORAGE_KEY="app-am-tasks";
const taskStatuses=[
  {id:"pending",label:"Pte. Inicio"},
  {id:"progress",label:"En proceso"},
  {id:"done",label:"Final"}
];
let taskEditHandler=null;

function getTasks(){
  try{return JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY)||"[]")}
  catch{return[]}
}
function saveTasks(tasks){localStorage.setItem(TASKS_STORAGE_KEY,JSON.stringify(tasks));updateTaskNavAlert()}
function updateTaskNavAlert(){
  const button=document.querySelector('nav button[data-title="Tareas"]');if(!button)return;
  const count=getTasks().filter(task=>task.status!=="done").length;
  let alert=button.querySelector(".task-nav-alert");
  if(!count){alert?.remove();button.classList.remove("has-task-alert");return}
  if(!alert){alert=document.createElement("span");alert.className="task-nav-alert";alert.setAttribute("aria-label","Tareas pendientes");button.appendChild(alert)}
  alert.textContent=count>99?"99+":String(count);button.classList.add("has-task-alert");
}
window.addEventListener("storage",event=>{if(event.key===TASKS_STORAGE_KEY)updateTaskNavAlert()});
queueMicrotask(updateTaskNavAlert);
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
function taskStatusMarkup(status){
  const labels={pending:"Sin empezar",progress:"En proceso",done:"Terminado"},safeStatus=labels[status]?status:"pending";
  return `<span class="task-status-chip status-${safeStatus}"><i aria-hidden="true"></i>${labels[safeStatus]}</span>`;
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
    <div class="task-note-top"><div class="task-heading-badges"><span class="task-concept">${escapeHtml(concept||"Sin concepto")}</span>${taskStatusMarkup(task.status)}</div><div><button type="button" class="task-edit-button" data-edit-task="${escapeHtml(task.id)}" aria-label="Editar tarea" title="Editar tarea">✎</button><span class="task-grip" aria-hidden="true">⠿</span></div></div>
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
  document.querySelectorAll("[data-edit-task]").forEach(button=>button.addEventListener("click",event=>{event.stopPropagation();taskEditHandler?.(button.dataset.editTask)}));
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
  task.status=status;saveTasks(tasks);syncTaskToAnnualCorrection(task);renderTaskBoard();
}
function syncTaskToAnnualCorrection(task){
  if(task.sourceType!=="annualCorrection"||!task.sourceClientId||!task.sourceCorrectionId)return;
  const year=Number(task.sourceYear)||new Date().getFullYear(),state=annualClosingState(task.sourceClientId,year);
  const correction=state.reviewCorrections.find(item=>String(item.id)===String(task.sourceCorrectionId));if(!correction)return;
  correction.done=task.status==="done";correction.assigned=task.assigned||"";correction.dueDate=task.finalDate||"";
  saveAnnualClosingState(task.sourceClientId,state,year);
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
        <div class="client-modal-head"><div><p class="eyebrow" id="taskModalEyebrow">NUEVA TAREA</p><h2 id="taskModalTitle">Añadir tarea</h2></div><button class="modal-close" type="button" data-close-task aria-label="Cerrar">×</button></div>
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
          <div class="modal-actions"><button class="task-cancel-button" type="button" data-close-task><span aria-hidden="true">×</span> Cancelar</button><button class="primary blue-button" id="taskSaveButton" type="submit">Guardar tarea</button></div>
        </form>
      </section>
    </div>`;
  bindHeader();renderTaskBoard();
  const modal=document.querySelector("#taskModal"),form=document.querySelector("#taskForm");
  let taskClientNames=[];
  const close=()=>{modal.classList.remove("open");modal.setAttribute("aria-hidden","true");form.dataset.editTaskId=""};
  document.querySelectorAll("[data-close-task]").forEach(button=>button.addEventListener("click",close));
  const clientInput=document.querySelector("#taskClient"),clientResults=document.querySelector("#taskClientResults");
  function renderTaskClientResults(query){
    if(clientInput.readOnly){clientResults.hidden=true;return}
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
  const openTaskForm=async(task=null)=>{
    form.reset();
    const today=new Date().toISOString().slice(0,10);
    form.dataset.editTaskId=task?.id||"";
    document.querySelector("#taskModalEyebrow").textContent=task?"EDITAR TAREA":"NUEVA TAREA";
    document.querySelector("#taskModalTitle").textContent=task?"Editar tarea":"Añadir tarea";
    document.querySelector("#taskSaveButton").textContent=task?"Guardar cambios":"Guardar tarea";
    document.querySelector("#taskStartDate").value=task?.startDate?.slice(0,10)||today;
    document.querySelector("#taskFinalDate").min=task?"":today;
    taskClientNames=await getTaskClientNames();
    clientInput.value=task?.client||"";
    document.querySelector("#taskAssigned").value=task?.assigned||"";
    document.querySelector("#taskConcept").value=task?.concept||"";
    document.querySelector("#taskCustomConcept").value=task?.customConcept||"";
    document.querySelector("#taskFinalDate").value=task?.finalDate||"";
    document.querySelector("#taskDescription").value=task?.description||"";
    document.querySelector("#customConceptField").hidden=task?.concept!=="Otro";
    document.querySelector("#taskCustomConcept").required=task?.concept==="Otro";
    const linked=task?.sourceType==="annualCorrection";
    clientInput.readOnly=linked;
    document.querySelector("#taskConcept").disabled=linked;
    document.querySelector("#taskCustomConcept").readOnly=linked;
    modal.classList.add("open");modal.setAttribute("aria-hidden","false");
    renderTaskClientResults("");
    setTimeout(()=>clientInput.focus(),180);
  };
  document.querySelector("#openTaskModal").addEventListener("click",()=>openTaskForm());
  taskEditHandler=id=>{const task=getTasks().find(item=>item.id===id);if(task)openTaskForm(task)};
  document.querySelector("#taskConcept").addEventListener("change",event=>{
    const custom=document.querySelector("#customConceptField"),input=document.querySelector("#taskCustomConcept");
    custom.hidden=event.target.value!=="Otro";input.required=event.target.value==="Otro";
    if(custom.hidden)input.value="";
  });
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const concept=document.querySelector("#taskConcept").value;
    const taskData={
      client:document.querySelector("#taskClient").value.trim(),
      assigned:document.querySelector("#taskAssigned").value,
      concept,
      customConcept:document.querySelector("#taskCustomConcept").value.trim(),
      description:document.querySelector("#taskDescription").value.trim(),
      finalDate:document.querySelector("#taskFinalDate").value,
    };
    const tasks=getTasks(),existing=tasks.find(item=>item.id===form.dataset.editTaskId);
    if(existing){Object.assign(existing,taskData);syncTaskToAnnualCorrection(existing)}
    else tasks.push({id:`task-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,startDate:new Date().toISOString(),...taskData,status:"pending"});
    saveTasks(tasks);close();renderTaskBoard();
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


const annualClosingUnlocks=new Set();
const annualClosingFiles=[
  {id:"formulationMinutes",label:"Acta formulación",aliases:["ACTA FORMULACION","ACTAS FORMULACION"]},
  {id:"submissionReceipt",label:"Acuse presentación",aliases:["ACUSE PRESENTACION","ACUSES PRESENTACION"]},
  {id:"submissionEntry",label:"Asiento presentación",aliases:["ASIENTO PRESENTACION","ASIENTOS PRESENTACION"]},
  {id:"certifications",label:"Certificaciones",aliases:["CERTIFICACION","CERTIFICACIONES"]},
  {id:"invoices",label:"Facturas",aliases:["FACTURA","FACTURAS"]},
  {id:"proofs",label:"Justificantes",aliases:["JUSTIFICANTE","JUSTIFICANTES"]}
];
const annualClosingStages=[
  {id:"accounting",label:"Cierre contable",tasks:["Aplicación del resultado anterior","Revisión de facturas emitidas al 100 %","Conciliación de bancos","Revisión de saldos pendientes","Periodificación de préstamos de largo a corto plazo","Dotación de amortización","Imputación de subvenciones","Revisión de facturas periódicas","Tabla de amortización CCAA","Tabla de pagos en 5 años","Clasificación de A. Fros. y P. Fros. CCAA"]},
  {id:"review",label:"Revisión contable",tasks:[]},
  {id:"annual",label:"Cierre anual",tasks:annualClosingFiles.map(file=>file.label)}
];
function annualClosingKey(clientId,year=new Date().getFullYear()){return `app-am-annual-closing-${year}-${clientId}`}
function annualClosingState(clientId,year=new Date().getFullYear()){
  try{
    const stored=JSON.parse(localStorage.getItem(annualClosingKey(clientId,year))||"{}");
    const state={};
    annualClosingStages.forEach(stage=>state[stage.id]=stage.tasks.map((_,index)=>stage.id==="annual"&&stored.annualFilesVersion!==1?false:Boolean(stored[stage.id]?.[index])));
    state.reviewCorrections=Array.isArray(stored.reviewCorrections)?stored.reviewCorrections.map(item=>({id:item.id||Date.now()+Math.random(),title:String(item.title||""),comment:String(item.comment||""),assigned:String(item.assigned||""),dueDate:String(item.dueDate||""),taskId:String(item.taskId||""),done:Boolean(item.done)})):[];
    state.reviewNoCorrections=Boolean(stored.reviewNoCorrections);
    state.presented=Boolean(stored.presented);state.presentedDate=String(stored.presentedDate||"");state.formulationDate=String(stored.formulationDate||"");state.certificationSigned=Boolean(stored.certificationSigned);state.annualFilesVersion=stored.annualFilesVersion===1?1:0;
    return state;
  }catch{
    const state=Object.fromEntries(annualClosingStages.map(stage=>[stage.id,stage.tasks.map(()=>false)]));
    state.reviewCorrections=[];state.reviewNoCorrections=false;state.presented=false;state.presentedDate="";state.formulationDate="";state.certificationSigned=false;state.annualFilesVersion=0;return state;
  }
}
function saveAnnualClosingState(clientId,state,year=new Date().getFullYear()){localStorage.setItem(annualClosingKey(clientId,year),JSON.stringify(state))}
function annualPendingCorrections(state){return(state.reviewCorrections||[]).filter(item=>!item.done).length}
function annualStageProgress(state,stage){
  if(stage.id==="review"){
    const corrections=state.reviewCorrections||[];
    if(corrections.length)return Math.round(corrections.filter(item=>item.done).length/corrections.length*100);
    return state.reviewNoCorrections?100:0;
  }
  const values=state[stage.id]||[];
  return values.length?Math.round(values.filter(Boolean).length/values.length*100):0;
}
function annualProgressMarkup(progress){
  return `<div class="annual-progress"><div class="annual-progress-track"><span style="width:${progress}%"></span></div><strong>${progress}%</strong></div>`;
}
async function renderAnnualClosings(){
  const year=new Date().getFullYear();
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Cierres anuales</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="annual-closing-panel">
      <div class="annual-closing-heading">
        <div><p class="eyebrow">CONTROL SOCIETARIO</p><h2>Cierres anuales</h2><p>Seguimiento por etapas de todas las personas jurídicas.</p></div>
        <div class="annual-heading-controls">
          <div class="annual-closing-deadlines compact">
            <article><div><small>FORMULACIÓN</small><strong>31 de marzo</strong></div></article>
            <article><div><small>APROBACIÓN</small><strong>30 de junio</strong></div></article>
            <article><div><small>INSCRIPCIÓN</small><strong>31 de julio</strong></div></article>
          </div>
          <span class="annual-year">${year}</span>
        </div>
      </div>
      <div class="annual-closing-search"><div><strong>Buscar empresa</strong><small>Filtra por nombre del cliente o CIF.</small></div><label><span>⌕</span><input id="annualClosingSearch" type="search" autocomplete="off" placeholder="Buscar empresa o CIF…"></label></div>
      <div class="annual-closing-table-wrap"><table class="annual-closing-table"><thead><tr><th>Cliente</th>${annualClosingStages.map(stage=>`<th>${stage.label}</th>`).join("")}<th>Presentado</th></tr></thead><tbody id="annualClosingRows"><tr><td colspan="5" class="table-empty">Cargando clientes…</td></tr></tbody></table></div>
    </section>
    <div class="modal-shell annual-closing-shell" id="annualClosingModal" aria-hidden="true"><div class="modal-backdrop" data-close-annual></div><section class="annual-closing-modal" role="dialog" aria-modal="true" aria-labelledby="annualClosingTitle"><div class="modal-heading"><div><p class="eyebrow">CIERRE ANUAL · ${year}</p><h2 id="annualClosingTitle">Ficha del cliente</h2></div><button class="modal-close" type="button" data-close-annual>×</button></div><div class="annual-stage-tabs" id="annualStageTabs"></div><div class="annual-record-lock" id="annualRecordLock" hidden></div><div class="annual-stage-content" id="annualStageContent"></div><div class="modal-actions"><button type="button" class="secondary-button" data-close-annual>Cerrar</button></div></section></div>`;
  bindHeader();
  document.querySelectorAll("[data-close-annual]").forEach(button=>button.addEventListener("click",closeAnnualClosingModal));
  document.querySelector("#annualClosingSearch").addEventListener("input",event=>{
    const query=event.target.value.trim().toLocaleLowerCase("es");
    document.querySelectorAll("#annualClosingRows [data-annual-client]").forEach(row=>{row.hidden=Boolean(query)&&!row.textContent.toLocaleLowerCase("es").includes(query)});
  });
  try{
    const clients=(await getAllClientMetadata()).filter(client=>(client.personType||"juridica")==="juridica").sort((a,b)=>{
      const pendingDifference=annualPendingCorrections(annualClosingState(b.id||b.name))-annualPendingCorrections(annualClosingState(a.id||a.name));
      return pendingDifference||a.name.localeCompare(b.name,"es",{sensitivity:"base"});
    });
    const body=document.querySelector("#annualClosingRows");
    body.innerHTML=clients.length?clients.map(client=>{
      const state=annualClosingState(client.id||client.name);
      const pending=annualPendingCorrections(state);
      return `<tr class="annual-client-row" tabindex="0" data-annual-client="${escapeHtml(client.id||client.name)}" data-pending-corrections="${pending}"><td><strong title="${escapeHtml(client.name)}">${escapeHtml(client.name)}</strong><small>${escapeHtml(client.cif||"Sin CIF")}</small></td>${annualClosingStages.map(stage=>`<td data-annual-progress="${stage.id}">${annualProgressMarkup(annualStageProgress(state,stage))}${stage.id==="review"&&pending?`<span class="annual-review-alert" title="${pending} corrección${pending===1?"":"es"} pendiente${pending===1?"":"s"}"><span class="annual-review-alert-icon"><svg viewBox="0 0 32 30" aria-hidden="true"><path fill="#d92d20" d="M12.8 4.2c1.4-2.5 5-2.5 6.4 0l11.9 20.5c1.4 2.4-.4 5.3-3.1 5.3H4c-2.7 0-4.5-2.9-3.1-5.3L12.8 4.2Z"/><path fill="#ffffff" d="M14.45 9.7h3.1l-.5 10.4h-2.1l-.5-10.4ZM16 25.4a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"/></svg></span><b>${pending}</b></span>`:""}</td>`).join("")}<td data-annual-submission>${annualSubmissionMarkup(state,client.id||client.name)}</td></tr>`;
    }).join(""):'<tr><td colspan="5" class="table-empty">No hay personas jurídicas registradas.</td></tr>';
    body.querySelectorAll("[data-annual-client]").forEach(row=>{
      const client=clients.find(item=>(item.id||item.name)===row.dataset.annualClient);
      bindAnnualSubmissionControls(row,client.id||client.name);
      const open=()=>openAnnualClosingModal(client);
      row.addEventListener("click",open);
      row.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open()}});
    });
  }catch{
    document.querySelector("#annualClosingRows").innerHTML='<tr><td colspan="5" class="table-empty">No se pudieron cargar los clientes.</td></tr>';
  }
}
function annualSubmissionMarkup(state,clientId){
  const stagesComplete=annualClosingStages.every(stage=>annualStageProgress(state,stage)===100);
  const recordLocked=state.presented&&state.presentedDate&&!annualClosingUnlocks.has(clientId);
  const disabled=!stagesComplete||recordLocked;
  const hint=!stagesComplete?"Completa las tres etapas al 100 % para habilitar la presentación":recordLocked?"Ficha presentada y bloqueada":"Indica que el cierre ha sido presentado";
  return `<div class="annual-submission ${state.presented?"complete":""} ${!stagesComplete?"waiting":""}" title="${hint}"><label><input type="checkbox" data-annual-presented ${state.presented?"checked":""} ${disabled?"disabled":""}><span>Presentado</span></label><input type="date" data-annual-presented-date value="${escapeHtml(state.presentedDate||"")}" ${disabled?"disabled":""}></div>`;
}
function bindAnnualSubmissionControls(row,clientId){
  row.querySelectorAll("[data-annual-presented],[data-annual-presented-date]").forEach(control=>control.addEventListener("click",event=>event.stopPropagation()));
  const check=row.querySelector("[data-annual-presented]"),date=row.querySelector("[data-annual-presented-date]");
  const save=()=>{
    const state=annualClosingState(clientId);
    state.presented=check.checked;state.presentedDate=date.value;
    if(state.presented&&!state.presentedDate)state.presentedDate=new Date().toISOString().slice(0,10);
    saveAnnualClosingState(clientId,state);updateAnnualClosingTableRow(clientId,state);
  };
  check?.addEventListener("change",save);date?.addEventListener("change",save);
}
let annualClosingFilesCache=null;
let annualClosingFilesRoot=null;
let annualClosingFileUrls=[];
async function collectAnnualClosingPdfs(directory,path=directory.name,depth=0){
  if(depth>6)return[];
  const documents=[];
  for await(const entry of directory.values()){
    const nextPath=`${path}/${entry.name}`;
    if(entry.kind==="directory")documents.push(...await collectAnnualClosingPdfs(entry,nextPath,depth+1));
    else if(/\.pdf$/i.test(entry.name))documents.push({handle:entry,path:nextPath,name:entry.name,normalized:normalizeFiscalText(nextPath)});
  }
  return documents;
}
async function getAnnualClosingPdfs(force=false){
  const root=await getSavedHandle("annual-closings-folder");
  if(!root||await root.queryPermission({mode:"read"})!=="granted")return[];
  if(force||root!==annualClosingFilesRoot||!annualClosingFilesCache){
    annualClosingFilesRoot=root;
    annualClosingFilesCache=await collectAnnualClosingPdfs(root);
  }
  return annualClosingFilesCache;
}
async function annualClosingDocumentsForClient(clientName,year,force=false){
  annualClosingFileUrls.forEach(url=>URL.revokeObjectURL(url));annualClosingFileUrls=[];
  const yearText=String(year),all=await getAnnualClosingPdfs(force);
  const result=new Map();
  for(const definition of annualClosingFiles){
    const candidates=all.filter(document=>document.normalized.includes(yearText)&&definition.aliases.some(alias=>document.normalized.includes(alias)));
    let best=null,bestScore=0;
    candidates.forEach(document=>{const score=declarationClientScore(clientName,document.normalized);if(score>bestScore){best=document;bestScore=score}});
    if(best&&bestScore>=.6){
      try{const file=await best.handle.getFile();best.url=URL.createObjectURL(file);annualClosingFileUrls.push(best.url);result.set(definition.id,best)}catch{}
    }
  }
  return result;
}
function annualClosingFileComplete(definition,document,state){
  if(!document)return false;
  if(definition.id==="formulationMinutes")return Boolean(state.formulationDate);
  if(definition.id==="certifications")return Boolean(state.certificationSigned);
  return true;
}
function annualClosingFileStatus(definition,document,state){
  if(!document)return"PDF no encontrado";
  if(definition.id==="formulationMinutes"&&!state.formulationDate)return"PDF localizado · falta indicar la fecha";
  if(definition.id==="certifications"&&!state.certificationSigned)return"PDF localizado · pendiente de firma";
  return"Documento completado";
}
async function setupAnnualClosingFolderSource(clientId){
  const panel=document.querySelector("#annualClosingFolderSource");if(!panel)return;
  let root=null,connected=false;
  try{root=await getSavedHandle("annual-closings-folder");connected=Boolean(root&&await root.queryPermission({mode:"read"})==="granted")}catch{}
  panel.innerHTML=connected
    ?'<div><span class="declaration-source-icon">✓</span><p><strong>Carpeta de cierres anuales conectada</strong><small>Buscando en 2026 y sus subcarpetas.</small></p></div><button type="button">Cambiar carpeta</button>'
    :'<div><span class="declaration-source-icon">▰</span><p><strong>Conecta Gestión → Cierres anuales</strong><small>La aplicación buscará los PDF dentro de 2026.</small></p></div><button type="button">Conectar carpeta</button>';
  panel.classList.toggle("connected",connected);
  panel.querySelector("button").addEventListener("click",async()=>{
    try{
      const selected=await window.showDirectoryPicker({mode:"read"});
      await saveHandle("annual-closings-folder",selected);
      annualClosingFilesCache=null;annualClosingFilesRoot=null;
      await renderAnnualClosingFilesContent(clientId,true);
    }catch(error){if(error?.name!=="AbortError")panel.querySelector("small").textContent="No se pudo acceder a la carpeta seleccionada."}
  });
}
async function renderAnnualClosingFilesContent(clientId,force=false){
  const content=document.querySelector("#annualStageContent"),year=new Date().getFullYear();if(!content)return;
  const initialState=annualClosingState(clientId);
  content.innerHTML=`<div class="annual-stage-summary"><div><small>PROGRESO DE LA ETAPA</small><h3>Cierre anual</h3></div>${annualProgressMarkup(annualStageProgress(initialState,annualClosingStages.find(stage=>stage.id==="annual")))}</div><div class="declaration-folder-source annual-folder-source" id="annualClosingFolderSource"></div><div class="annual-files-list" id="annualClosingFilesList"><div class="annual-files-loading">Buscando documentos de la empresa…</div></div>`;
  await setupAnnualClosingFolderSource(clientId);
  let documents=new Map();
  try{documents=await annualClosingDocumentsForClient(document.querySelector("#annualClosingModal")?.dataset.clientName||clientId,year,force)}catch{}
  const modal=document.querySelector("#annualClosingModal");
  if(!modal||modal.dataset.clientId!==clientId||document.querySelector("[data-annual-stage].active")?.dataset.annualStage!=="annual")return;
  const state=annualClosingState(clientId);
  state.annual=annualClosingFiles.map(definition=>annualClosingFileComplete(definition,documents.get(definition.id),state));
  state.annualFilesVersion=1;
  saveAnnualClosingState(clientId,state);
  const list=document.querySelector("#annualClosingFilesList");
  list.innerHTML=annualClosingFiles.map(definition=>{
    const file=documents.get(definition.id),complete=annualClosingFileComplete(definition,file,state);
    const extra=definition.id==="formulationMinutes"?`<label class="annual-file-date"><span>Fecha de formulación</span><input type="date" id="annualFormulationDate" value="${escapeHtml(state.formulationDate)}"></label>`:definition.id==="certifications"?`<label class="annual-file-signed"><input type="checkbox" id="annualCertificationSigned" ${state.certificationSigned?"checked":""}><span>Firmado</span></label>`:"";
    return `<article class="annual-file-row ${complete?"complete":""}"><div class="annual-file-concept"><span>${complete?"✓":""}</span><div><strong>${definition.label}</strong><small>${annualClosingFileStatus(definition,file,state)}</small></div></div>${extra}<div class="annual-file-document">${declarationDocumentMarkup(file)}</div></article>`;
  }).join("");
  const progress=annualStageProgress(state,annualClosingStages.find(stage=>stage.id==="annual"));
  document.querySelector("#annualStageContent .annual-stage-summary>.annual-progress").outerHTML=annualProgressMarkup(progress);
  document.querySelector("#annualFormulationDate")?.addEventListener("change",event=>{const updated=annualClosingState(clientId);updated.formulationDate=event.target.value;saveAnnualClosingState(clientId,updated);renderAnnualClosingFilesContent(clientId)});
  document.querySelector("#annualCertificationSigned")?.addEventListener("change",event=>{const updated=annualClosingState(clientId);updated.certificationSigned=event.target.checked;saveAnnualClosingState(clientId,updated);renderAnnualClosingFilesContent(clientId)});
  updateAnnualClosingTableRow(clientId,state);
  applyAnnualRecordLock(clientId);
}
function closeAnnualClosingModal(){
  const modal=document.querySelector("#annualClosingModal");if(!modal)return;
  modal.classList.remove("open");modal.setAttribute("aria-hidden","true");
}
function openAnnualClosingModal(client){
  if(!client)return;
  const modal=document.querySelector("#annualClosingModal"),clientId=client.id||client.name;
  modal.dataset.clientId=clientId;
  modal.dataset.clientName=client.name;
  document.querySelector("#annualClosingTitle").textContent=client.name;
  const state=annualClosingState(clientId);
  const firstPending=annualClosingStages.find(stage=>annualStageProgress(state,stage)<100);
  renderAnnualClosingStage(firstPending?.id||annualClosingStages.at(-1).id);
  modal.classList.add("open");modal.setAttribute("aria-hidden","false");
}
function renderAnnualClosingStage(stageId){
  const modal=document.querySelector("#annualClosingModal"),clientId=modal.dataset.clientId,state=annualClosingState(clientId);
  let previousComplete=true;
  const availability={};
  annualClosingStages.forEach(stage=>{availability[stage.id]=previousComplete;previousComplete=previousComplete&&annualStageProgress(state,stage)===100});
  if(!availability[stageId])stageId=annualClosingStages.find(stage=>availability[stage.id]&&annualStageProgress(state,stage)<100)?.id||"accounting";
  document.querySelector("#annualStageTabs").innerHTML=annualClosingStages.map(stage=>{
    const progress=annualStageProgress(state,stage),locked=!availability[stage.id];
    return `<button type="button" data-annual-stage="${stage.id}" class="${stage.id===stageId?"active":""}" ${locked?"disabled":""}><span>${locked?"🔒":progress===100?"✓":""} ${stage.label}</span>${annualProgressMarkup(progress)}</button>`;
  }).join("");
  document.querySelectorAll("[data-annual-stage]").forEach(button=>button.addEventListener("click",()=>renderAnnualClosingStage(button.dataset.annualStage)));
  const stage=annualClosingStages.find(item=>item.id===stageId),progress=annualStageProgress(state,stage);
  if(stage.id==="review"){renderAnnualReviewContent(clientId,state,stage,progress);applyAnnualRecordLock(clientId);return}
  if(stage.id==="annual"){renderAnnualClosingFilesContent(clientId);return}
  document.querySelector("#annualStageContent").innerHTML=`
    <div class="annual-stage-summary"><div><small>PROGRESO DE LA ETAPA</small><h3>${stage.label}</h3></div>${annualProgressMarkup(progress)}</div>
    <div class="annual-checklist">${stage.tasks.map((task,index)=>`<label><input type="checkbox" data-annual-check="${index}" ${state[stage.id][index]?"checked":""}><span><strong>${escapeHtml(task)}</strong><small>${state[stage.id][index]?"Completado":"Pendiente"}</small></span></label>`).join("")}</div>`;
  document.querySelectorAll("[data-annual-check]").forEach(check=>check.addEventListener("change",()=>{
    const updated=annualClosingState(clientId);
    updated[stage.id][Number(check.dataset.annualCheck)]=check.checked;
    saveAnnualClosingState(clientId,updated);
    updateAnnualClosingTableRow(clientId,updated);
    renderAnnualClosingStage(stage.id);
  }));
  applyAnnualRecordLock(clientId);
}
function upsertAnnualCorrectionTask(clientId,clientName,correction){
  const tasks=getTasks();let task=tasks.find(item=>item.id===correction.taskId);
  if(!task){correction.taskId=`annual-correction-${correction.id}-${Math.random().toString(36).slice(2,7)}`;task={id:correction.taskId,startDate:new Date().toISOString(),status:correction.done?"done":"pending"};tasks.push(task)}
  Object.assign(task,{client:clientName||clientId,assigned:correction.assigned,concept:"Cuentas Anuales",customConcept:"",description:`Corrección: ${correction.title}\n${correction.comment}`,finalDate:correction.dueDate,sourceType:"annualCorrection",sourceClientId:clientId,sourceYear:new Date().getFullYear(),sourceCorrectionId:String(correction.id)});
  saveTasks(tasks);
}
function renderAnnualReviewContent(clientId,state,stage,progress){
  const corrections=state.reviewCorrections||[];
  document.querySelector("#annualStageContent").innerHTML=`
    <div class="annual-stage-summary"><div><small>PROGRESO DE LA ETAPA</small><h3>${stage.label}</h3></div>${annualProgressMarkup(progress)}</div>
    <div class="review-corrections-toolbar"><div><strong>Correcciones de la revisión</strong><small>El revisor puede indicar los ajustes que debe solucionar el compañero.</small></div><button type="button" id="addReviewCorrection">＋ Añadir corrección</button></div>
    <form class="review-correction-form" id="reviewCorrectionForm" hidden>
      <label>Encabezado<input id="reviewCorrectionTitle" type="text" maxlength="100" placeholder="Ej. Revisar saldo del proveedor" required></label>
      <label>Explicación<textarea id="reviewCorrectionComment" rows="4" maxlength="800" placeholder="Explica qué debe corregirse y cualquier indicación útil…" required></textarea></label>
      <div class="review-correction-assignment"><label>Responsable<select id="reviewCorrectionAssigned" required><option value="">Selecciona una persona…</option>${workers.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}</select></label><label>Fecha límite<input id="reviewCorrectionDueDate" type="date" required></label></div>
      <div><button type="button" class="secondary-button" id="cancelReviewCorrection">Cancelar</button><button type="submit" class="primary blue-button" id="saveReviewCorrection">Guardar corrección</button></div>
    </form>
    <div class="review-corrections-list">${corrections.length?corrections.map(item=>{const linkedTask=getTasks().find(task=>task.id===item.taskId),linkedStatus=linkedTask?.status||(item.done?"done":"pending");return`
      <article class="review-correction ${item.done?"resolved":""}">
        <label><input type="checkbox" data-review-correction="${escapeHtml(String(item.id))}" ${item.done?"checked":""}><span><span class="review-correction-title"><strong>${escapeHtml(item.title)}</strong>${taskStatusMarkup(linkedStatus)}</span><small>${item.done?"Solucionada":"Pendiente de solucionar"}</small></span></label>
        <div class="review-correction-task-meta"><span>♟ ${escapeHtml(item.assigned||"Sin responsable")}</span><span>◷ ${item.dueDate?taskDateLabel(item.dueDate):"Sin fecha límite"}</span></div>
        <p>${escapeHtml(item.comment)}</p>
        <div class="review-correction-actions"><button type="button" data-edit-review-correction="${escapeHtml(String(item.id))}" aria-label="Editar corrección" title="Editar corrección">✎</button><button type="button" data-remove-review-correction="${escapeHtml(String(item.id))}" aria-label="Eliminar corrección" title="Eliminar corrección">×</button></div>
      </article>`}).join(""):`<div class="review-empty"><span>✓</span><strong>No hay correcciones añadidas</strong><p>Añade una cuando detectes algo que el compañero deba solucionar.</p><label><input id="reviewWithoutCorrections" type="checkbox" ${state.reviewNoCorrections?"checked":""}> Marcar revisión finalizada sin correcciones</label></div>`}</div>`;
  const form=document.querySelector("#reviewCorrectionForm");
  const resetCorrectionForm=()=>{form.reset();form.dataset.editingId="";form.hidden=true;document.querySelector("#saveReviewCorrection").textContent="Guardar corrección"};
  document.querySelector("#addReviewCorrection").addEventListener("click",()=>{form.reset();form.dataset.editingId="";form.hidden=false;document.querySelector("#reviewCorrectionDueDate").min=new Date().toISOString().slice(0,10);document.querySelector("#saveReviewCorrection").textContent="Guardar corrección";document.querySelector("#reviewCorrectionTitle").focus()});
  document.querySelector("#cancelReviewCorrection").addEventListener("click",resetCorrectionForm);
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const title=document.querySelector("#reviewCorrectionTitle").value.trim(),comment=document.querySelector("#reviewCorrectionComment").value.trim(),assigned=document.querySelector("#reviewCorrectionAssigned").value,dueDate=document.querySelector("#reviewCorrectionDueDate").value;
    if(!title||!comment||!assigned||!dueDate)return;
    const updated=annualClosingState(clientId);
    updated.reviewNoCorrections=false;
    let correction=updated.reviewCorrections.find(item=>String(item.id)===form.dataset.editingId);
    if(correction)Object.assign(correction,{title,comment,assigned,dueDate});
    else{correction={id:Date.now(),title,comment,assigned,dueDate,taskId:"",done:false};updated.reviewCorrections.push(correction)}
    upsertAnnualCorrectionTask(clientId,document.querySelector("#annualClosingModal")?.dataset.clientName||clientId,correction);
    saveAnnualClosingState(clientId,updated);updateAnnualClosingTableRow(clientId,updated);renderAnnualClosingStage("review");
  });
  document.querySelector("#reviewWithoutCorrections")?.addEventListener("change",event=>{
    const updated=annualClosingState(clientId);updated.reviewNoCorrections=event.target.checked;
    saveAnnualClosingState(clientId,updated);updateAnnualClosingTableRow(clientId,updated);renderAnnualClosingStage("review");
  });
  document.querySelectorAll("[data-review-correction]").forEach(check=>check.addEventListener("change",()=>{
    const updated=annualClosingState(clientId),item=updated.reviewCorrections.find(entry=>String(entry.id)===check.dataset.reviewCorrection);
    if(item){item.done=check.checked;const tasks=getTasks(),task=tasks.find(entry=>entry.id===item.taskId);if(task){task.status=check.checked?"done":"pending";saveTasks(tasks)}}
    saveAnnualClosingState(clientId,updated);updateAnnualClosingTableRow(clientId,updated);renderAnnualClosingStage("review");
  }));
  document.querySelectorAll("[data-edit-review-correction]").forEach(button=>button.addEventListener("click",()=>{
    const item=annualClosingState(clientId).reviewCorrections.find(entry=>String(entry.id)===button.dataset.editReviewCorrection);if(!item)return;
    form.dataset.editingId=String(item.id);form.hidden=false;
    document.querySelector("#reviewCorrectionTitle").value=item.title;
    document.querySelector("#reviewCorrectionComment").value=item.comment;
    document.querySelector("#reviewCorrectionAssigned").value=item.assigned||"";
    document.querySelector("#reviewCorrectionDueDate").min="";
    document.querySelector("#reviewCorrectionDueDate").value=item.dueDate||"";
    document.querySelector("#saveReviewCorrection").textContent="Guardar cambios";
    form.scrollIntoView({block:"nearest",behavior:"smooth"});document.querySelector("#reviewCorrectionTitle").focus();
  }));
  document.querySelectorAll("[data-remove-review-correction]").forEach(button=>button.addEventListener("click",()=>{
    const updated=annualClosingState(clientId),removed=updated.reviewCorrections.find(item=>String(item.id)===button.dataset.removeReviewCorrection);updated.reviewCorrections=updated.reviewCorrections.filter(item=>String(item.id)!==button.dataset.removeReviewCorrection);
    if(removed?.taskId)saveTasks(getTasks().filter(task=>task.id!==removed.taskId));
    saveAnnualClosingState(clientId,updated);updateAnnualClosingTableRow(clientId,updated);renderAnnualClosingStage("review");
  }));
}
function applyAnnualRecordLock(clientId){
  const state=annualClosingState(clientId),locked=state.presented&&state.presentedDate&&!annualClosingUnlocks.has(clientId);
  const banner=document.querySelector("#annualRecordLock"),content=document.querySelector("#annualStageContent");if(!banner||!content)return;
  content.classList.toggle("locked",locked);
  content.querySelectorAll("input,textarea,button").forEach(control=>control.disabled=locked);
  banner.hidden=!locked;
  banner.innerHTML=locked?`<span>🔒</span><div><strong>Ficha presentada y bloqueada</strong><small>Presentada el ${new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(state.presentedDate+"T12:00:00"))}. Puedes consultarla, pero necesitas contraseña para modificarla.</small></div><button type="button" id="unlockAnnualRecord">Desbloquear edición</button>`:"";
  document.querySelector("#unlockAnnualRecord")?.addEventListener("click",()=>openAnnualRecordUnlock(clientId));
}
function openAnnualRecordUnlock(clientId){
  document.querySelector("#annualRecordAccess")?.remove();
  const shell=document.createElement("div");shell.id="annualRecordAccess";shell.className="access-shell";
  shell.innerHTML=`<div class="access-backdrop"></div><section class="access-card" role="dialog" aria-modal="true"><button class="access-close" type="button">×</button><div class="access-icon">🔒</div><p class="eyebrow">FICHA PRESENTADA</p><h2>Desbloquear edición</h2><p class="access-copy">Introduce la contraseña para modificar este cierre anual.</p><form><label for="annualRecordPassword">Contraseña</label><div class="access-input"><span>●</span><input id="annualRecordPassword" type="password" required></div><p class="access-error"></p><button class="primary blue-button" type="submit">Desbloquear</button></form></section>`;
  document.body.appendChild(shell);
  const close=()=>{shell.classList.remove("open");setTimeout(()=>shell.remove(),260)};
  shell.querySelector(".access-close").addEventListener("click",close);shell.querySelector(".access-backdrop").addEventListener("click",close);
  shell.querySelector("form").addEventListener("submit",event=>{event.preventDefault();const input=shell.querySelector("#annualRecordPassword");if(input.value==="1234"){annualClosingUnlocks.add(clientId);close();const active=document.querySelector("[data-annual-stage].active")?.dataset.annualStage||"accounting";setTimeout(()=>{renderAnnualClosingStage(active);const state=annualClosingState(clientId);updateAnnualClosingTableRow(clientId,state)},180)}else{shell.querySelector(".access-error").textContent="La contraseña no es correcta.";input.select()}});
  requestAnimationFrame(()=>requestAnimationFrame(()=>shell.classList.add("open")));setTimeout(()=>shell.querySelector("#annualRecordPassword").focus(),250);
}
function updateAnnualClosingTableRow(clientId,state){
  const row=[...document.querySelectorAll("[data-annual-client]")].find(item=>item.dataset.annualClient===clientId);if(!row)return;
  const pending=annualPendingCorrections(state);row.dataset.pendingCorrections=String(pending);
  annualClosingStages.forEach(stage=>{
    const cell=row.querySelector(`[data-annual-progress="${stage.id}"]`);if(!cell)return;
    cell.innerHTML=annualProgressMarkup(annualStageProgress(state,stage))+(stage.id==="review"&&pending?`<span class="annual-review-alert" title="${pending} corrección${pending===1?"":"es"} pendiente${pending===1?"":"s"}"><span class="annual-review-alert-icon"><svg viewBox="0 0 32 30" aria-hidden="true"><path fill="#d92d20" d="M12.8 4.2c1.4-2.5 5-2.5 6.4 0l11.9 20.5c1.4 2.4-.4 5.3-3.1 5.3H4c-2.7 0-4.5-2.9-3.1-5.3L12.8 4.2Z"/><path fill="#ffffff" d="M14.45 9.7h3.1l-.5 10.4h-2.1l-.5-10.4ZM16 25.4a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"/></svg></span><b>${pending}</b></span>`:"");
  });
  const submission=row.querySelector("[data-annual-submission]");if(submission){submission.innerHTML=annualSubmissionMarkup(state,clientId);bindAnnualSubmissionControls(row,clientId)}
  reorderAnnualClosingRows();
}
function reorderAnnualClosingRows(){
  const body=document.querySelector("#annualClosingRows");if(!body)return;
  [...body.querySelectorAll("[data-annual-client]")].sort((a,b)=>Number(b.dataset.pendingCorrections||0)-Number(a.dataset.pendingCorrections||0)||a.children[0].textContent.localeCompare(b.children[0].textContent,"es",{sensitivity:"base"})).forEach(row=>body.appendChild(row));
}

const taxModels=["111","115","123","130-131","303","349","182","347","202"];
const annualTaxModels=["190","180","390"];
const annualTaxSource={"190":"111","180":"115","390":"303"};
function sourceTaxModel(model){return annualTaxSource[model]||model}
function visibleControlTaxModels(){return activeTaxType==="trimestral"&&activeTaxQuarter==="4T"?[...taxModels,...annualTaxModels]:taxModels}
const taxQuarters=[{id:"1T",label:"1.º Trimestre"},{id:"2T",label:"2.º Trimestre"},{id:"3T",label:"3.º Trimestre"},{id:"4T",label:"4.º Trimestre"}];
const taxMonths=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((label,index)=>({id:"M"+String(index+1).padStart(2,"0"),label}));
function defaultControlTaxPeriod(type,date=new Date()){
  if(type==="mensual"){
    const previousMonth=date.getMonth()===0?12:date.getMonth();
    return "M"+String(previousMonth).padStart(2,"0");
  }
  const month=date.getMonth()+1;
  if(month<=3)return "4T";
  if(month<=6)return "1T";
  if(month<=9)return "2T";
  return "3T";
}
let activeTaxType="trimestral";
let activeTaxModel="111";
let activeTaxQuarter=defaultControlTaxPeriod("trimestral");
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
  const visible=visibleControlTaxModels();
  if(!visible.includes(activeTaxModel))activeTaxModel="111";
  document.querySelectorAll("[data-tax-tab]").forEach(tab=>{
    const model=tab.dataset.taxTab;
    tab.hidden=!visible.includes(model);
    const unavailable=activeTaxType==="mensual"&&model==="130-131";
    tab.disabled=unavailable;
    tab.classList.toggle("active",model===activeTaxModel);
  });
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
function declarationTableHeaders(prefix,model=""){
  const columns=[...declarationColumns];
  if(prefix==="tax"&&model==="111")columns.splice(columns.findIndex(column=>column.field==="cif")+1,0,{field:"notRequired",label:"No obligada",type:"boolean"});
  return columns.map(column=>{
    const label=prefix==="tax"&&column.field==="prepared"?"Confección":prefix==="tax"&&column.field==="submitted"?"Presentación":column.label;
    if(column.type==="boolean")return `<th data-declaration-column="${column.field}"><span>${label}</span></th>`;
    return `<th data-declaration-column="${column.field}"><span>${label}</span><button class="excel-filter-button ${declarationColumnFilterState[prefix]?.[column.field]?"active":""}" type="button" data-excel-filter="${column.field}" aria-label="Filtrar ${label}" title="Filtrar ${label}">▾</button></th>`;
  }).join("");
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
  activeTaxQuarter=defaultControlTaxPeriod(activeTaxType);
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
      <div class="tax-tabs" role="tablist">${[...taxModels,...annualTaxModels].map(model=>`<button type="button" role="tab" data-tax-tab="${model}" class="${model===activeTaxModel?"active":""}">Modelo ${model}</button>`).join("")}</div>
      <div class="tax-lock-banner" id="taxLockBanner" hidden></div>
      <div class="tax-table-wrap"><table class="tax-table"><thead><tr id="taxTableHead">${declarationTableHeaders("tax",activeTaxModel)}</tr></thead><tbody id="taxRows"><tr><td colspan="10" class="table-empty">Cargando clientes…</td></tr></tbody></table></div>
    </section>`;
   bindHeader();
  setupDeclarationFilters("tax","taxRows");
  document.querySelector("#taxType").value=activeTaxType;fillTaxPeriodSelect();syncTaxModelTabs();
  document.querySelector("#taxType").addEventListener("change",event=>{activeTaxType=event.target.value;activeTaxQuarter=defaultControlTaxPeriod(activeTaxType);if(activeTaxType==="mensual"&&activeTaxModel==="130-131")activeTaxModel="111";fillTaxPeriodSelect();syncTaxModelTabs();loadTaxModel(activeTaxModel)});
  document.querySelector("#taxQuarter").addEventListener("change",event=>{activeTaxQuarter=event.target.value;syncTaxModelTabs();loadTaxModel(activeTaxModel)});
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
  const body=document.querySelector("#taxRows"),state=taxWindowState(sourceTaxModel(model),activeTaxQuarter,activeTaxType);
  const isModel111=model==="111";
  const columnCount=isModel111?11:10;
  const tableHead=document.querySelector("#taxTableHead");
  if(tableHead){tableHead.innerHTML=declarationTableHeaders("tax",model);setupDeclarationFilters("tax","taxRows")}
  renderTaxDeadlines(model,activeTaxQuarter,state);
  try{
    const clients=(await getAllClientMetadata()).filter(client=>(client.periodicity||"trimestral")===activeTaxType&&client.obligations&&client.obligations[sourceTaxModel(model)]);
    const documents=await declarationDocumentsForClients(clients,model,activeTaxType,activeTaxQuarter,2026);
    body.innerHTML=clients.length?clients.sort((a,b)=>a.name.localeCompare(b.name,"es")).map(client=>{const d=declarationData(model,activeTaxQuarter,client.name);return `<tr data-tax-client="${escapeHtml(client.name)}" data-tax-model-row="${model}" data-tax-quarter-row="${activeTaxQuarter}"><td><strong>${escapeHtml(client.name)}</strong><small>${activeTaxType==="mensual"?"Mensual":"Trimestral"}</small></td><td>${declarationDocumentMarkup(documents.get(client.name))}</td><td>${escapeHtml(client.cif||"—")}</td>${isModel111?`<td class="not-required-cell"><label><input type="checkbox" data-field="notRequired" ${d.notRequired?"checked":""}><span>No obligada</span></label></td>`:""}<td><select data-field="manager">${workerOptions(d.manager)}</select></td><td><input type="date" data-field="prepared" value="${escapeHtml(d.prepared||"")}"></td><td><div class="amount-input"><input type="number" step="0.01" data-field="amount" value="${escapeHtml(d.amount||"")}" placeholder="0,00"><span>€</span></div></td><td><select data-field="payment"><option value="">Seleccionar…</option><option ${d.payment==="Domicil."?"selected":""}>Domicil.</option><option ${d.payment==="N.R.C."?"selected":""}>N.R.C.</option><option ${d.payment==="Cargo"?"selected":""}>Cargo</option><option ${d.payment==="Aplaz."?"selected":""}>Aplaz.</option><option ${d.payment==="Pte. Pago"?"selected":""}>Pte. Pago</option><option ${d.payment==="Negativa"?"selected":""}>Negativa</option><option ${d.payment==="Compensación"?"selected":""}>Compensación</option><option ${d.payment==="Devolver"?"selected":""}>Devolver</option><option ${d.payment==="Baja"?"selected":""}>Baja</option><option ${d.payment==="Cliente"?"selected":""}>Cliente</option></select></td><td><input type="date" data-field="submitted" value="${escapeHtml(d.submitted||"")}"></td><td><select data-field="submittedBy">${workerOptions(d.submittedBy)}</select></td><td><select data-field="reviewedBy">${workerOptions(d.reviewedBy)}</select></td></tr>`}).join(""):`<tr><td colspan="${columnCount}" class="table-empty">No hay clientes ${activeTaxType==="mensual"?"mensuales":"trimestrales"} asignados al modelo ${escapeHtml(model)}.</td></tr>`;
    body.querySelectorAll("tr[data-tax-client]").forEach(row=>{
      const toggle=row.querySelector('[data-field="notRequired"]');
      const applyRowLock=()=>{
        const notRequired=Boolean(toggle?.checked);
        row.classList.toggle("not-required-row",notRequired);
        row.querySelectorAll("[data-field]").forEach(control=>{control.disabled=state.locked||(notRequired&&control!==toggle)});
      };
      applyRowLock();
      row.querySelectorAll("input,select").forEach(control=>control.addEventListener("change",event=>{applyRowLock();saveDeclarationRow(event);applyDeclarationFilters("tax","taxRows")}));
    });
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
  row.querySelectorAll("[data-field]").forEach(field=>data[field.dataset.field]=field.type==="checkbox"?field.checked:field.value);
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

function documentTypeVisual(name){
  const extension=(String(name).split(".").pop()||"").toLocaleLowerCase("es");
  const types={
    pdf:{className:"pdf",label:"PDF"},
    doc:{className:"word",label:"DOC"},docx:{className:"word",label:"DOCX"},odt:{className:"word",label:"ODT"},
    xls:{className:"excel",label:"XLS"},xlsx:{className:"excel",label:"XLSX"},xlsm:{className:"excel",label:"XLSM"},csv:{className:"excel",label:"CSV"},ods:{className:"excel",label:"ODS"},
    ppt:{className:"powerpoint",label:"PPT"},pptx:{className:"powerpoint",label:"PPTX"},
    jpg:{className:"image",label:"JPG"},jpeg:{className:"image",label:"JPG"},png:{className:"image",label:"PNG"},gif:{className:"image",label:"GIF"},webp:{className:"image",label:"WEBP"},svg:{className:"image",label:"SVG"},
    p12:{className:"certificate",label:"P12"},pfx:{className:"certificate",label:"PFX"},cer:{className:"certificate",label:"CER"},crt:{className:"certificate",label:"CRT"},
    zip:{className:"archive",label:"ZIP"},rar:{className:"archive",label:"RAR"},"7z":{className:"archive",label:"7Z"},
    txt:{className:"text",label:"TXT"},rtf:{className:"text",label:"RTF"},xml:{className:"code",label:"XML"},json:{className:"code",label:"JSON"}
  };
  const type=types[extension]||{className:"other",label:(extension||"FILE").slice(0,4).toUpperCase()};
  return `<span class="file-type-icon ${type.className}" aria-label="Archivo ${escapeHtml(type.label)}"><span class="file-sheet" aria-hidden="true"></span><b>${escapeHtml(type.label)}</b></span>`;
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
    ? entries.map((entry,index)=>`<button class="folder-card" data-index="${index}" data-client="${escapeHtml(entry.name.toLocaleLowerCase("es"))}">${entry.kind==="directory"?'<span class="folder-icon">▰</span>':documentTypeVisual(entry.name)}<span><strong>${escapeHtml(entry.name)}</strong><small>${entry.kind==="directory"?"Abrir carpeta":"Abrir documento"}</small></span></button>`).join("")
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
async function deleteSignatureMetadata(id){const d=await folderDb();return new Promise((ok,no)=>{const tx=d.transaction("signatureMetadata","readwrite");tx.objectStore("signatureMetadata").delete(id);tx.oncomplete=()=>{d.close();ok()};tx.onerror=()=>no(tx.error)})}
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
  else if(button.dataset.title==="Contactos") renderContacts();
  else if(button.dataset.title==="Días de cortesía") renderCourtesyDays();
  else if(button.dataset.title==="Cierres anuales") renderAnnualClosings();
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
