document.documentElement.classList.add("auth-pending");
let signedInUser=null;
let clientPreviewMode=false;
const teamUsers=[
  {id:"manuel",name:"Manuel Molinero",role:"admin"},{id:"alvaro",name:"Álvaro Molinero",role:"admin"},
  {id:"francisco",name:"Francisco Molinero",role:"user"},{id:"araceli",name:"Araceli Frías",role:"user"},{id:"jesus",name:"Jesús Carratalá",role:"user"}
];
function initials(name){return name.split(/\s+/).map(part=>part[0]).slice(0,2).join("").toUpperCase()}
async function apiJson(url,options={}){const response=await fetch(url,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||"No se pudo completar la operación.");return result}
let loadedApplicationVersion=null;
async function checkForApplicationUpdate(){
  try{
    const {version}=await apiJson(`/api/version?time=${Date.now()}`,{cache:"no-store"});
    if(loadedApplicationVersion===null){loadedApplicationVersion=version;return}
    if(version&&version!==loadedApplicationVersion)location.reload();
  }catch{}
}
checkForApplicationUpdate();
setInterval(checkForApplicationUpdate,20000);
function updateProfileButtons(){
  if(!signedInUser)return;
  document.querySelectorAll(".profile").forEach(button=>{button.innerHTML=`<span>${initials(signedInUser.name)}</span><span class="profile-copy"><strong>${signedInUser.name}</strong><small>${signedInUser.role==="admin"?"Administrador":"Usuario"}</small></span>`;button.title=signedInUser.role==="admin"?"Administrar usuarios":"Mi cuenta";button.onclick=openAccountPanel});
}
function authCard({setup=false,users=[]}={}){
  const available=(users.length?users:teamUsers).filter(user=>setup?user.role==="admin":user.passwordSet!==false);
  const shell=document.createElement("div");shell.className="login-gate";
  shell.innerHTML=`<section class="login-card"><div class="login-brand"><img src="/app-icon.png" alt=""><div><small>DESPACHO MOLINERO</small><h1>${setup?"Configurar acceso":"Iniciar sesión"}</h1></div></div><p>${setup?"Asigna la primera contraseña a Manuel o Álvaro. Después podrás establecer las del resto desde Mi cuenta.":"Accede con tu usuario y contraseña personal."}</p><form><label>Usuario<select required>${available.map(user=>`<option value="${user.id}">${user.name}</option>`).join("")}</select></label>${setup?'<label>Clave de configuración<input name="setupPassword" type="password" autocomplete="current-password" required></label>':""}<label>Contraseña<input name="password" type="password" autocomplete="current-password" minlength="6" required></label><p class="login-error" role="alert"></p><button class="primary" type="submit">${setup?"Guardar y entrar":"Entrar"}</button></form></section>`;
  document.body.appendChild(shell);document.documentElement.classList.remove("auth-pending");
  shell.querySelector("form").addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector("button"),error=form.querySelector(".login-error");error.textContent="";button.disabled=true;button.textContent="Comprobando…";try{const payload={userId:form.querySelector("select").value,password:form.password.value};if(setup)payload.setupPassword=form.setupPassword.value;const result=await apiJson(setup?"/api/auth/setup":"/api/auth/login",{method:"POST",body:JSON.stringify(payload)});signedInUser=result.user;shell.remove();updateProfileButtons();loadSharedTasks();refreshChatData();refreshBillingData()}catch(reason){error.textContent=reason.message}finally{button.disabled=false;button.textContent=setup?"Guardar y entrar":"Entrar"}});
}
async function checkAuthentication(){try{const status=await apiJson("/api/auth/status");if(status.user){signedInUser=status.user;document.documentElement.classList.remove("auth-pending");updateProfileButtons();loadSharedTasks();refreshChatData();refreshBillingData()}else authCard({setup:status.needsSetup,users:status.users})}catch{authCard()}}
function openAccountPanel(){
  document.querySelector("#accountPanel")?.remove();const shell=document.createElement("div");shell.id="accountPanel";shell.className="account-shell";
  shell.innerHTML=`<div class="account-backdrop"></div><section class="account-card"><button class="account-close" aria-label="Cerrar">×</button><p class="eyebrow">MI CUENTA</p><h2>${signedInUser.name}</h2><p>${signedInUser.role==="admin"?"Administración de usuarios y contraseñas":"Sesión de usuario"}</p><button class="view-mode-button" type="button"><span>${clientPreviewMode?"▣":"▱"}</span><span><strong>${clientPreviewMode?"Visión como despacho":"Visión como cliente"}</strong><small>${clientPreviewMode?"Volver a la aplicación de gestión":"Abrir la maqueta temporal del portal"}</small></span><b>›</b></button><div class="account-users">${signedInUser.role==="admin"?teamUsers.map(user=>`<form data-user-id="${user.id}"><div><strong>${user.name}</strong><small>${user.role==="admin"?"Administrador":"Usuario"}</small></div><input type="password" minlength="6" placeholder="Nueva contraseña" required><button type="submit">Guardar</button></form>`).join(""):""}</div><p class="account-message"></p><button class="logout-button" type="button">Cerrar sesión</button></section>`;document.body.appendChild(shell);
  const close=()=>shell.remove();shell.querySelector(".account-close").onclick=close;shell.querySelector(".account-backdrop").onclick=close;
  shell.querySelectorAll("[data-user-id]").forEach(form=>form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector("button"),message=shell.querySelector(".account-message");button.disabled=true;try{await apiJson(`/api/users/${form.dataset.userId}`,{method:"PUT",body:JSON.stringify({password:form.querySelector("input").value})});form.reset();message.textContent="Contraseña actualizada correctamente."}catch(reason){message.textContent=reason.message}finally{button.disabled=false}});
  shell.querySelector(".view-mode-button").onclick=()=>{close();toggleClientPreview()};
  shell.querySelector(".logout-button").onclick=async()=>{await apiJson("/api/auth/logout",{method:"POST"});location.reload()};
}
checkAuthentication();

const sidebar=document.querySelector("#sidebar");
const overlay=document.querySelector("#overlay");
const main=document.querySelector("main");
let clientPreviewName="Inmobilei";
function installHomeActivityLayout(){
  const welcome=main.querySelector(".welcome"),metrics=main.querySelector(".metrics"),news=main.querySelector(".news-portal");
  if(!welcome||!metrics||!news)return;
  [["homeClientsCount","Clientes"],["homeContactsCount","Contactos"],["homeTasksCount","Tareas"],["homeWorkersCount","Trabajadores"]].forEach(([id,route])=>{const card=metrics.querySelector(`#${id}`)?.closest("article");if(card){card.dataset.homeRoute=route;card.setAttribute("role","button");card.tabIndex=0;card.setAttribute("aria-label",`Abrir ${route}`)}});
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
const clientPortalIcons={
  document:'<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h5"/></svg>',
  people:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M16 6a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2"/></svg>',
  shield:'<svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM9 12l2 2 4-5"/></svg>',
  chart:'<svg viewBox="0 0 24 24"><path d="M5 20V11h4v9M10 20V5h4v15M15 20v-7h4v7"/></svg>',
  admin:'<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6zM14 3v4h4M9 11h6M9 15h6"/></svg>',
  legal:'<svg viewBox="0 0 24 24"><path d="M12 3v18M6 6h12M7 6l-4 7h8zM17 6l-4 7h8zM8 21h8"/></svg>'
};
const clientDesktopIcons={
  home:'<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>',
  documents:'<svg viewBox="0 0 24 24"><path d="M4 5h6l2 2h8v12H4z"/><path d="M4 9h16"/></svg>',
  messages:'<svg viewBox="0 0 24 24"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h7"/></svg>',
  profile:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>',
  logout:'<svg viewBox="0 0 24 24"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></svg>',
  file:'<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6zM14 2v5h4"/><path d="M9 12h6M9 16h5"/></svg>',
  send:'<svg viewBox="0 0 24 24"><path d="m3 11 18-8-8 18-2-8zM11 13 21 3"/></svg>',
  phone:'<svg viewBox="0 0 24 24"><path d="M7 3 4 5c0 8 7 15 15 15l2-3-5-3-2 2c-3-1-5-3-6-6l2-2z"/></svg>',
  mail:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
  map:'<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>'
};
function clientDesktopIcon(name){return `<span class="client-ui-icon" aria-hidden="true">${clientDesktopIcons[name]}</span>`}
function clientServiceCard(title,icon,contracted=false){return `<button class="client-service-card${contracted?" contracted":""}" type="button"${contracted?' aria-disabled="true"':` data-client-unavailable="${escapeHtml(title)}"`}>${contracted?"":'<span class="client-service-lock">●</span>'}<span class="client-service-icon">${clientPortalIcons[icon]}</span><strong>${title}</strong><small>${contracted?"Contratado":"No contratado"}</small></button>`}
function clientDesktopServiceCard(title,icon,contracted=false){return `<article class="client-desktop-service${contracted?" contracted":""}"${contracted?"":` data-client-unavailable="${escapeHtml(title)}"`}>${contracted?"":'<span class="client-service-lock">●</span>'}<span class="client-service-icon">${clientPortalIcons[icon]}</span><h3>${title}</h3><small>${contracted?"Contratado":"No contratado"}</small><p>${contracted?"Tu información fiscal y contable siempre disponible.":"Uff, parece que no tienes contratado este servicio. ¿Quieres más información?"}</p><button type="button" aria-disabled="true">${contracted?"Acceder":"Más información"} <b>→</b></button></article>`}
function openClientUnavailable(service){
  document.querySelector(".client-unavailable-overlay")?.remove();
  const overlay=document.createElement("div");overlay.className="client-unavailable-overlay";
  overlay.innerHTML=`<section class="client-unavailable-card" role="dialog" aria-modal="true" aria-label="Servicio no contratado"><header><button type="button" data-close-client-unavailable aria-label="Volver">‹</button><strong>${escapeHtml(service)}</strong><span></span></header><div class="client-unavailable-body"><div class="client-unavailable-illustration" aria-hidden="true"><svg viewBox="0 0 180 150"><path class="blob" d="M31 45C47 14 95 8 128 26c31 17 39 60 20 88-20 30-72 34-103 13C17 108 14 76 31 45Z"/><path class="folder" d="M49 48h35l10 12h37v62H49z"/><path class="face" d="M72 83h2m30 0h2M82 100c7-6 14-6 21 0"/><path class="legs" d="M73 122v13m35-13v13M66 136h14m22 0h14"/><rect class="lock" x="119" y="82" width="37" height="39" rx="7"/><path class="lockline" d="M127 82v-8a10 10 0 0 1 20 0v8m-10 16v8"/><circle class="lockhole" cx="137" cy="97" r="3"/></svg></div><h2>¡Uff, vaya!</h2><h3>Parece que no tienes<br>contratado este servicio.</h3><p>Pero podemos ayudarte.<br>Descubre todo lo que podemos hacer por ti y solicita información sin compromiso.</p><button class="client-unavailable-primary" type="button" aria-disabled="true">Más información</button><button class="client-unavailable-secondary" type="button" aria-disabled="true">Pedir presupuesto</button><button class="client-unavailable-advisor" type="button" aria-disabled="true">${clientDesktopIcon("messages")}<span>Hablar con un asesor</span></button></div><nav class="client-unavailable-nav"><span>⌂<small>Inicio</small></span><span>▤<small>Documentos</small></span><span>◌<small>Mensajes</small></span><span>♙<small>Perfil</small></span></nav></section>`;
  document.body.appendChild(overlay);overlay.querySelector("[data-close-client-unavailable]").onclick=()=>overlay.remove();
}
function renderClientPreview(){
  clientPreviewMode=true;document.body.classList.add("client-preview-mode");closeMenu();
  const realLogo=document.querySelector(".brand img")?.src||"/app-icon.png";
  const mobile=`<div class="client-portal-shell client-mobile-portal"><header class="client-portal-header"><img src="${realLogo}" alt="Asesoría Molinero"><button class="profile client-preview-user" type="button" aria-label="Usuario activo"><span>${initials(signedInUser?.name||"AM")}</span><span class="profile-copy"><strong>${escapeHtml(signedInUser?.name||"Usuario activo")}</strong><small>Visión cliente</small></span></button></header><div class="client-portal-content"><section class="client-greeting"><h1>Hola, Inmobilei</h1><p>Nos alegra verte por aquí.</p></section><button class="client-document-banner" type="button" aria-disabled="true"><span>${clientPortalIcons.document}</span><strong>Tu documentación<br>siempre a mano</strong><b>→</b></button><section class="client-services"><div class="client-section-title"><h2>Mis servicios</h2><button type="button" aria-disabled="true">Ver todos</button></div><div class="client-services-grid">${clientServiceCard("Asesoría Fiscal y Contable","document",true)}${clientServiceCard("Asesoría Laboral","people")}${clientServiceCard("Protección de Datos","shield")}${clientServiceCard("Auditoría de Cuentas","chart")}${clientServiceCard("Gestión Administrativa","admin")}${clientServiceCard("Servicios Jurídicos","legal")}</div></section><button class="client-help-card" type="button" aria-disabled="true"><span>↗</span><span><strong>¿Necesitas algo?</strong><small>Escríbenos y te ayudamos</small></span><b>→</b></button></div><nav class="client-portal-nav" aria-label="Navegación del portal de cliente"><button class="active" type="button"><span>⌂</span><small>Inicio</small></button><button type="button"><span>▤</span><small>Documentos</small></button><button type="button"><span>◌</span><small>Mensajes</small></button><button type="button"><span>♙</span><small>Perfil</small></button></nav></div>`;
  const documents=[["Modelo 303 – 3T 2024","14 oct 2024","Declaraciones"],["Modelo 111 – 3T 2024","14 oct 2024","Declaraciones"],["Cuentas anuales 2023","02 oct 2024","Contabilidad"],["Modelo 200 – 2023","02 oct 2024","Declaraciones"],["Balance de sumas y saldos","25 sep 2024","Contabilidad"]];
  const documentRows=documents.map(item=>`<div class="client-desktop-document">${clientDesktopIcon("file")}<div><strong>${item[0]}</strong><small>Asesoría Fiscal y Contable &gt; ${item[2]}</small></div><time>${item[1]}</time></div>`).join("");
  const messages=[["Se ha añadido nueva documentación: Modelo 303 – 3T 2024. Puedes consultarla en tu área de documentos.","Hoy, 10:24"],["Recordatorio: el plazo del Modelo 349 finaliza el 30 de noviembre.","Ayer, 16:10"],["Tu documentación del cierre 2023 ya está disponible.","02 oct 2024"]];
  const messageRows=messages.map(item=>`<div class="client-desktop-message"><span>AM</span><div><strong>Asesoría Molinero</strong><p>${item[0]}</p></div><time>${item[1]}</time></div>`).join("");
  const desktop=`<div class="client-desktop-shell"><header class="client-desktop-header"><img src="${realLogo}" alt="Asesoría Molinero"><span class="client-desktop-motto">Tu tranquilidad,<br>nuestro compromiso</span><nav><button class="active" type="button">${clientDesktopIcon("home")}<span>Inicio</span></button><button type="button">${clientDesktopIcon("documents")}<span>Mis documentos</span></button><button type="button">${clientDesktopIcon("messages")}<span>Mensajes</span></button><button class="client-preview-user client-desktop-profile" type="button">${clientDesktopIcon("profile")}<span>Mi perfil</span></button></nav><button class="client-desktop-logout" type="button" aria-disabled="true">${clientDesktopIcon("logout")}<span>Cerrar sesión</span></button></header><section class="client-desktop-hero"><div><h1>👋 Hola, Inmobilei</h1><h2>Bienvenido a tu área de cliente</h2><p>Aquí tienes toda tu documentación, comunicaciones y gestiones con<br>Asesoría Molinero, de forma rápida, segura y siempre a tu alcance.</p></div><div class="client-desktop-hero-image"><strong>ASESORÍA<br>MOLINERO</strong><small>Personas que te acompañan</small></div></section><div class="client-desktop-content"><section class="client-desktop-services"><div class="client-desktop-title"><div><h2>Nuestros servicios</h2><p>Accede a tus servicios contratados o descubre todo lo que podemos hacer por ti.</p></div><em>Tu crecimiento también es nuestro objetivo</em></div><div class="client-desktop-services-grid">${clientDesktopServiceCard("Asesoría Fiscal y Contable","document",true)}${clientDesktopServiceCard("Asesoría Laboral","people")}${clientDesktopServiceCard("Protección de Datos","shield")}${clientDesktopServiceCard("Auditoría de Cuentas","chart")}${clientDesktopServiceCard("Gestión Administrativa","admin")}${clientDesktopServiceCard("Servicios Jurídicos","legal")}</div></section><section class="client-desktop-dashboard"><article class="client-desktop-panel client-desktop-documents"><div class="client-desktop-panel-title"><h3>${clientDesktopIcon("documents")}<span>Últimos documentos</span></h3><button type="button">Ver todos →</button></div>${documentRows}</article><article class="client-desktop-panel client-desktop-messages"><div class="client-desktop-panel-title"><h3>${clientDesktopIcon("messages")}<span>Mensajes recientes</span></h3><button type="button">Ver todos →</button></div>${messageRows}<button class="client-desktop-outline" type="button">Ir al chat →</button></article><aside><article class="client-desktop-panel client-desktop-help"><h3>${clientDesktopIcon("send")}<span>¿Necesitas algo?</span></h3><p>Estamos aquí para ayudarte. Puedes enviarnos un mensaje, una consulta o solicitar información sobre cualquier servicio.</p><button type="button">${clientDesktopIcon("messages")}<span>Nuevo mensaje</span></button></article><article class="client-desktop-contact"><h3>${clientDesktopIcon("phone")}<span>También puedes contactarnos</span></h3><p>${clientDesktopIcon("phone")}<span>953 24 12 00</span></p><p>${clientDesktopIcon("mail")}<span>info@asesoriamolinero.es</span></p><p>${clientDesktopIcon("map")}<span>C/ Ejemplo 12, 23001 Jaén</span></p></article></aside></section></div><footer class="client-desktop-footer"><span><img src="/app-icon.png" alt=""><strong>ASESORÍA<br>MOLINERO</strong><i>Tu tranquilidad, nuestro compromiso</i></span><small>Política de privacidad &nbsp; | &nbsp; Aviso legal &nbsp; | &nbsp; Contacto</small></footer></div>`;
  main.innerHTML=mobile+desktop;const mobileGreeting=main.querySelector(".client-greeting h1"),desktopGreeting=main.querySelector(".client-desktop-hero h1");if(mobileGreeting)mobileGreeting.textContent=`Hola, ${clientPreviewName}`;if(desktopGreeting)desktopGreeting.textContent=`👋 Hola, ${clientPreviewName}`;updateProfileButtons();document.querySelectorAll(".client-preview-user").forEach(button=>button.onclick=openAccountPanel);document.querySelectorAll("[data-client-unavailable]").forEach(card=>card.addEventListener("click",()=>openClientUnavailable(card.dataset.clientUnavailable)));
}
function closeClientPreview(){
  clientPreviewMode=false;document.querySelector(".client-unavailable-overlay")?.remove();document.body.classList.remove("client-preview-mode");
  const home=document.querySelector('.sidebar nav button[data-title="Inicio"]');if(home)home.click();else{main.innerHTML=homeMarkup;bindHeader();initHome()}
}
function toggleClientPreview(){clientPreviewMode?closeClientPreview():renderClientPreview()}
function previewAsClient(name){clientPreviewName=name||"Cliente";renderClientPreview()}
let currentEntries=[];
let folderHistory=[];
let activeFolderConfig=null;
let currentDirectoryHandle=null;
const FOLDER_VIEW_STORAGE_KEY="app-am-folder-view";
let folderViewMode=localStorage.getItem(FOLDER_VIEW_STORAGE_KEY)==="list"?"list":"grid";
const defaultClientFolders=["ACTAS","CIERRES ANUALES","CONTABILIDAD","DECLARACIONES","ESCRITURAS","LIBROS OFICIALES","OTRA DOCUMENTACIÓN"];

document.querySelector("#menu").addEventListener("click",openMenu);
overlay.addEventListener("click",closeMenu);

function openMenu(){sidebar.classList.add("open");overlay.classList.add("show");document.body.classList.add("menu-open")}
function closeMenu(){sidebar.classList.remove("open");overlay.classList.remove("show");document.body.classList.remove("menu-open")}
let mobileSwipeStart=null;
document.addEventListener("touchstart",event=>{
  if(!window.matchMedia("(max-width:760px)").matches||sidebar.classList.contains("open")||document.querySelector(".chat-panel.open")){mobileSwipeStart=null;return}
  if(event.target.closest("input,select,textarea,button,a,.tax-table-wrap,.folder-grid"))return;
  const touch=event.touches[0];
  mobileSwipeStart={x:touch.clientX,y:touch.clientY,time:Date.now()};
},{passive:true});
document.addEventListener("touchend",event=>{
  if(!mobileSwipeStart)return;
  if(document.querySelector(".chat-panel.open")){mobileSwipeStart=null;return}
  const touch=event.changedTouches[0],dx=touch.clientX-mobileSwipeStart.x,dy=Math.abs(touch.clientY-mobileSwipeStart.y),elapsed=Date.now()-mobileSwipeStart.time;
  mobileSwipeStart=null;
  if(dx>=75&&dx>dy*1.3&&elapsed<900)openMenu();
},{passive:true});
function bindHeader(){document.querySelector("#menu")?.addEventListener("click",openMenu);updateProfileButtons()}

function syncMobileNavigation(title="Inicio"){
  document.querySelectorAll("[data-mobile-route]").forEach(button=>button.classList.toggle("active",button.dataset.mobileRoute===title));
}
function mobileRoute(title,after){
  document.querySelector(`nav button[data-title="${title}"]`)?.click();
  if(after)setTimeout(()=>document.querySelector(after)?.click(),0);
}
function installMobileChrome(){
  const chrome=document.createElement("div");chrome.className="mobile-app-chrome";
  chrome.innerHTML=`<nav class="mobile-bottom-nav" aria-label="Navegación móvil">
    <button type="button" class="active" data-mobile-route="Inicio"><span>⌂</span><small>Inicio</small></button>
    <button type="button" data-mobile-route="Clientes"><span>▰</span><small>Clientes</small></button>
    <button type="button" data-mobile-route="Tareas"><span>✓</span><small>Tareas</small></button>
    <button type="button" data-mobile-route="Calendario"><span>▦</span><small>Agenda</small></button>
    <button type="button" data-mobile-menu><span>☰</span><small>Más</small></button>
  </nav>
  <button class="mobile-quick-button" type="button" aria-label="Crear nuevo" aria-expanded="false">＋</button>
  <div class="mobile-action-backdrop"></div><section class="mobile-action-sheet" aria-hidden="true"><i></i><div><p class="eyebrow">ACCESOS RÁPIDOS</p><h2>¿Qué quieres hacer?</h2></div>
    <button type="button" data-mobile-action="client"><span>＋</span><b>Nuevo cliente</b><small>Crear su ficha y documentación</small></button>
    <button type="button" data-mobile-action="task"><span>✓</span><b>Nueva tarea</b><small>Asignar trabajo al equipo</small></button>
    <button type="button" data-mobile-action="calendar"><span>▦</span><b>Nuevo recordatorio</b><small>Añadir una fecha a la agenda</small></button>
  </section>`;
  document.body.appendChild(chrome);
  const quick=chrome.querySelector(".mobile-quick-button"),sheet=chrome.querySelector(".mobile-action-sheet");
  const closeActions=()=>{chrome.classList.remove("actions-open");quick.setAttribute("aria-expanded","false");sheet.setAttribute("aria-hidden","true")};
  quick.addEventListener("click",()=>{const opening=!chrome.classList.contains("actions-open");chrome.classList.toggle("actions-open",opening);quick.setAttribute("aria-expanded",String(opening));sheet.setAttribute("aria-hidden",String(!opening))});
  chrome.querySelector(".mobile-action-backdrop").addEventListener("click",closeActions);
  chrome.querySelectorAll("[data-mobile-route]").forEach(button=>button.addEventListener("click",()=>mobileRoute(button.dataset.mobileRoute)));
  chrome.querySelector("[data-mobile-menu]").addEventListener("click",openMenu);
  chrome.querySelector('[data-mobile-action="client"]').addEventListener("click",()=>{closeActions();mobileRoute("Gestión","#openNewClient")});
  chrome.querySelector('[data-mobile-action="task"]').addEventListener("click",()=>{closeActions();mobileRoute("Tareas","#openTaskModal")});
  chrome.querySelector('[data-mobile-action="calendar"]').addEventListener("click",()=>{closeActions();mobileRoute("Calendario","#newCalendarItem")});
}
installMobileChrome();

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

let managementClientView="active";
let billingEntries=[];
let billingUnreadCount=0;
function clientIsActive(client){return client?.active!==false}
function clientIdentity(client){return client?.id||client?.name||""}
function renderManagement(){
  managementClientView="active";
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Gestión</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <nav class="management-tabs" role="tablist" aria-label="Apartados de gestión"><button type="button" role="tab" data-management-tab="clients" aria-selected="true">Clientes</button><button type="button" role="tab" data-management-tab="client-users" aria-selected="false">Usuarios clientes</button><button type="button" role="tab" data-management-tab="models" aria-selected="false">Modelos</button><button type="button" role="tab" data-management-tab="billing" aria-selected="false">Facturación<span class="management-tab-alert" data-billing-tab-alert hidden></span></button></nav>
    <div data-management-panel="clients"><section class="management-search"><div><p class="eyebrow">CLIENTES</p><h2>Buscador de clientes</h2><p>Localiza rápidamente cualquier cliente del despacho.</p></div><button class="primary blue-button" id="openNewClient">＋ Nuevo cliente</button><label class="management-searchbox"><span>⌕</span><input id="managementSearch" type="search" placeholder="Buscar por nombre…"></label></section>
    <section class="management-clients"><div class="folder-toolbar management-client-toolbar"><div><strong id="managementClientHeading">Clientes activos</strong><span id="managementCount">0 clientes</span></div><div class="management-client-sections" role="tablist" aria-label="Estado de los clientes"><button type="button" role="tab" data-client-section="active" aria-selected="true">Activos</button><button type="button" role="tab" data-client-section="historical" aria-selected="false">Históricos</button></div></div><div class="folder-grid" id="managementGrid"><div class="empty folder-empty"><span>▤</span><h4>Cargando clientes</h4></div></div></section></div>
    <div data-management-panel="models" hidden></div>
    <div data-management-panel="client-users" hidden></div>
    <div data-management-panel="billing" hidden></div>
    <div class="modal-shell" id="clientModal" aria-hidden="true"><div class="modal-backdrop" data-close-modal></div><section class="client-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-heading"><div><p class="eyebrow" id="modalEyebrow">ALTA DE CLIENTE</p><h2 id="modalTitle">Nuevo cliente</h2></div><div class="client-modal-heading-actions"><button type="button" class="secondary-button" id="clientModalDismiss" data-close-modal>Cerrar</button><button type="button" class="secondary-button client-view-edit" id="editClientFromView" hidden>Editar</button><button class="primary blue-button" id="saveClientButton" type="submit" form="newClientForm">Guardar</button><button class="modal-close" type="button" data-close-modal aria-label="Cerrar">×</button></div></div><div class="client-unsaved-banner" id="clientUnsavedBanner" role="alertdialog" aria-modal="true" aria-labelledby="clientUnsavedMessage" hidden><p id="clientUnsavedMessage">No se han guardado los cambios, ¿Deseas cerrar igualmente?</p><div><button type="button" class="secondary-button" id="continueClientEditing">Seguir editando</button><button type="button" class="client-discard-button" id="discardClientChanges">Cerrar sin guardar</button></div></div>
    <form id="newClientForm"><div class="client-identity-grid"><label class="client-name-field">Nombre del cliente<input id="clientName" type="text" placeholder="Ej. Empresa García, S.L." required maxlength="120"></label><label class="client-active-field"><span>Cliente activo</span><span class="client-active-control"><input id="clientActive" type="checkbox" checked><i aria-hidden="true"></i><small>Visible en los controles</small></span></label><label>DNI / CIF<input id="clientCif" type="text" placeholder="Ej. B12345678" required maxlength="9" autocomplete="off"><small>9 caracteres</small></label><label>Tipo de persona<select id="clientPersonType"><option value="juridica" selected>Persona jurídica</option><option value="fisica">Persona física</option></select></label></div><section class="internal-client-data" id="clientPeople"><div class="internal-section-heading"><strong>Personas físicas</strong><small>Información visible únicamente para el despacho.</small></div><div class="registry-tabs" role="tablist" aria-label="Personas físicas"><button type="button" role="tab" id="peopleSociosTab" aria-controls="peopleSocios" data-people-tab="Socios" aria-selected="true">Socios</button><button type="button" role="tab" id="peopleContactosTab" aria-controls="peopleContactos" data-people-tab="Contactos" aria-selected="false">Contactos</button></div><section id="peopleSocios" role="tabpanel" aria-labelledby="peopleSociosTab"><div class="client-administrator-grid"><label>Tipo de administración<select id="clientAdministrationType"><option>Administrador único</option><option>Administradores solidarios</option><option>Administradores mancomunados</option></select></label><label>Socio administrador<select id="clientAdministratorPartner"><option value="">Seleccionar socio…</option></select></label></div><div id="clientPartnerRows"></div><button type="button" class="secondary-button" id="addClientPartner">+ Añadir socio</button></section><section id="peopleContactos" role="tabpanel" aria-labelledby="peopleContactosTab" hidden><div id="clientContactRows"></div><button type="button" class="secondary-button" id="addClientContact">+ Añadir contacto</button></section></section><section class="internal-client-data" id="legacyClientPeople"><div class="internal-section-heading"><strong>Datos internos de contacto</strong><small>Información visible únicamente para el despacho.</small></div><div class="internal-data-grid"><label>Administradores<textarea id="clientAdministrators" rows="3" placeholder="Un administrador por línea"></textarea></label><label>Teléfonos de contacto<textarea id="clientPhones" rows="3" placeholder="Un teléfono por línea"></textarea></label><label>Correos electrónicos<textarea id="clientEmails" rows="3" placeholder="Un correo por línea"></textarea></label><label>Representante<input id="clientRepresentative" type="text" maxlength="120" placeholder="Nombre y apellidos"></label><label>NIF representante<input id="clientRepresentativeNif" type="text" maxlength="9" autocomplete="off" placeholder="Ej. 12345678A"><small>Máximo 9 caracteres</small></label></div></section><fieldset class="fiscal-obligations"><legend>Obligaciones fiscales</legend><div class="fiscal-settings-row"><div class="fiscal-periodicity"><div><strong>Periodicidad</strong></div><select id="fiscalPeriodicity" aria-label="Periodicidad fiscal"><option value="trimestral" selected>Trimestral</option><option value="mensual">Mensual</option></select></div><label class="fiscal-courtesy-inline"><input type="checkbox" id="courtesyDaysRequired"><span><strong>Días de cortesía</strong></span></label></div><p>Selecciona los modelos fiscales del cliente.</p><div class="obligation-grid">${["111","115","123","130-131","303","349","182","347","202"].map(m=>`<div class="obligation-item"><label><input type="checkbox" data-tax-model="${m}"><strong>Modelo ${m}</strong></label></div>`).join("")}</div></fieldset><fieldset class="financial-framework"><legend>Marco de información financiera aplicable</legend><label><span>Información aplicable al cliente</span><input id="financialReportingFramework" type="text" maxlength="500" placeholder="Escribe el marco de información financiera…"></label></fieldset><fieldset class="digital-signature-section"><legend>Firmas digitales</legend><p>Gestiona el documento de firma del cliente, su caducidad y contraseña.</p><div class="digital-signature-document"><span class="digital-signature-copy"><strong>Documento de firma</strong><small>Sube una nueva firma o vincula una existente sin duplicarla.</small></span><input id="clientSignature" type="file" accept=".p12,.pfx,.cer,.crt"><div class="existing-signature-divider"><span>o</span></div><button class="secondary-button existing-signature-button" id="browseExistingSignature" type="button">⌕ Buscar firma existente</button><p class="linked-signature-name" id="linkedSignatureName">Ninguna firma vinculada</p><div class="existing-signature-picker" id="existingSignaturePicker" hidden><div class="existing-signature-picker-head"><strong>Firmas disponibles</strong><button type="button" id="closeExistingSignaturePicker" aria-label="Cerrar buscador">×</button></div><label class="existing-signature-search"><span>⌕</span><input id="existingSignatureSearch" type="search" autocomplete="off" placeholder="Buscar documento…"></label><div class="existing-signature-list" id="existingSignatureList"></div></div></div><div class="signature-data"><label>Fecha de caducidad<input id="signatureExpiry" type="date"></label><label>Contraseña<input id="signaturePassword" type="password" autocomplete="new-password" placeholder="Contraseña de la firma"></label></div></fieldset><fieldset class="commercial-registry-section" id="commercialRegistrySection"><legend>Registro Mercantil</legend><p class="registry-intro">Información societaria, bancaria y de acceso de la persona jurídica.</p><div class="registry-tabs" role="tablist" aria-label="Apartados de Registro Mercantil"><button type="button" role="tab" data-registry-tab="domicilio" aria-selected="true">Domicilio</button><button type="button" role="tab" data-registry-tab="bancos" aria-selected="false">Bancos</button><button type="button" role="tab" data-registry-tab="acceso" aria-selected="false">Acceso</button><button type="button" role="tab" data-registry-tab="seguridad" aria-selected="false">Seguridad</button><button type="button" role="tab" data-registry-tab="observaciones" aria-selected="false">Observaciones</button></div><div class="registry-tab-content"><section class="registry-tab-panel" data-registry-panel="domicilio"><div class="registry-fields"><label class="registry-wide">Certificado<input id="registryCertificate" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"><small id="registryCertificateName">Ningún certificado guardado</small></label><label class="registry-wide">Dirección<input id="registryAddress" type="text" maxlength="180"></label><label>CP<input id="registryPostalCode" type="text" inputmode="numeric" maxlength="5"></label><label>Provincia<select id="registryProvince"><option value="">Seleccionar…</option>${provinceOptions()}</select></label><label>Municipio<select id="registryMunicipality"><option value="">Selecciona una provincia</option></select></label></div></section><section class="registry-tab-panel" data-registry-panel="bancos" hidden><div class="registry-fields"><label>Titular<input id="bankHolder" type="text" maxlength="160"></label><label>CIF<input id="bankTaxId" type="text" maxlength="9"></label><label>BIC<input id="bankBic" type="text" maxlength="11"></label><label>CCC<input id="bankCcc" type="text" maxlength="20"></label><div class="registry-wide bank-ibans"><div id="bankIbanList"></div><button type="button" class="registry-add-button" id="addBankIban" aria-label="Añadir otro IBAN" title="Añadir otro IBAN">＋</button></div><label>Nombre del banco<input id="bankName" type="text" maxlength="140"></label><label class="registry-wide">Dirección del banco<input id="bankAddress" type="text" maxlength="180"></label><label>CP<input id="bankPostalCode" type="text" inputmode="numeric" maxlength="5"></label><label>Provincia<select id="bankProvince"><option value="">Seleccionar…</option>${provinceOptions()}</select></label><label>Municipio<select id="bankMunicipality"><option value="">Selecciona una provincia</option></select></label></div></section><section class="registry-tab-panel" data-registry-panel="acceso" hidden><div class="registry-fields registry-credentials"><label>Usuario<input id="registryAccessUser" type="text" autocomplete="off"></label><label>Contraseña<input id="registryAccessPassword" type="password" autocomplete="new-password"></label></div></section><section class="registry-tab-panel" data-registry-panel="seguridad" hidden><div class="registry-fields registry-credentials"><label>Usuario<input id="registrySecurityUser" type="text" autocomplete="off"></label><label>Contraseña<input id="registrySecurityPassword" type="password" autocomplete="new-password"></label></div></section><section class="registry-tab-panel" data-registry-panel="observaciones" hidden><label class="registry-observations"><textarea id="registryObservations" rows="5" maxlength="1500" placeholder="Notas internas sobre el Registro Mercantil…"></textarea></label></section></div></fieldset><p class="form-message" id="formMessage"></p><div class="modal-actions"><button type="button" class="secondary-button" id="clientModalDismiss" data-close-modal>Cancelar</button><button type="button" class="secondary-button client-view-edit" id="editClientFromView" hidden>Editar</button><button class="primary blue-button" id="saveClientButton" type="submit">Guardar cliente</button></div></form></section></div>`;
  bindHeader();
  installClientPortalAccessBlock();
  installClientAppAvailabilityToggle();
  document.querySelector("#newClientForm .modal-actions")?.remove();
  document.querySelector("#openNewClient").addEventListener("click",openClientModal);
  document.querySelectorAll("[data-close-modal]").forEach(x=>x.addEventListener("click",closeClientModal));
  document.querySelector("#newClientForm").addEventListener("submit",createClient);
  document.querySelector("#browseExistingSignature").addEventListener("click",openExistingSignaturePicker);
  document.querySelector("#closeExistingSignaturePicker").addEventListener("click",()=>document.querySelector("#existingSignaturePicker").hidden=true);
  document.querySelector("#existingSignatureSearch").addEventListener("input",filterExistingSignatures);
  document.querySelector("#clientSignature").addEventListener("change",onNewSignatureSelected);
  document.querySelector("#managementSearch").addEventListener("input",filterManagementClients);
  document.querySelectorAll("[data-client-section]").forEach(button=>button.addEventListener("click",()=>setManagementClientView(button.dataset.clientSection)));
  document.querySelector("#editClientFromView").addEventListener("click",enableClientEditing);
  document.querySelector("#clientPersonType").addEventListener("change",toggleCommercialRegistry);
  document.querySelectorAll("[data-registry-tab]").forEach(tab=>tab.addEventListener("click",()=>openRegistryTab(tab.dataset.registryTab)));
  document.querySelector("#registryProvince").addEventListener("change",()=>fillMunicipalitySelect("registryProvince","registryMunicipality"));
  document.querySelector("#bankProvince").addEventListener("change",()=>fillMunicipalitySelect("bankProvince","bankMunicipality"));
  document.querySelector("#addBankIban").addEventListener("click",()=>renderBankIbans([...readBankIbans(),""]));
  document.querySelector("#registryCertificate").addEventListener("change",event=>{document.querySelector("#registryCertificateName").textContent=event.target.files[0]?.name||document.querySelector("#newClientForm").dataset.registryCertificate||"Ningún certificado guardado"});
  document.querySelector("#continueClientEditing").addEventListener("click",hideClientUnsavedBanner);
  document.querySelector("#discardClientChanges").addEventListener("click",performClientModalClose);
  document.querySelectorAll("[data-management-tab]").forEach(tab=>tab.addEventListener("click",()=>openManagementSection(tab.dataset.managementTab)));
  updateBillingAlerts();
  loadManagementClients();
}

const MANAGEMENT_MODELS=[
  {id:"share-sale",title:"Contrato de compraventa de acciones o participaciones",category:"Mercantil",description:"Documento base editable para formalizar la transmisión entre vendedor y comprador.",body:`CONTRATO DE COMPRAVENTA DE PARTICIPACIONES SOCIALES\n\nEn [LOCALIDAD], a [FECHA].\n\nREUNIDOS\n\nDe una parte, [VENDEDOR], con NIF [NIF_VENDEDOR].\nDe otra, [COMPRADOR], con NIF [NIF_COMPRADOR].\n\nINTERVIENEN\n\nEn su propio nombre y derecho, reconociéndose capacidad suficiente.\n\nEXPONEN\n\nI. Que [SOCIEDAD], con NIF [CIF_CLIENTE], tiene su domicilio en [DOMICILIO].\nII. Que el vendedor es titular de [NUMERO] participaciones/acciones, numeradas de [DESDE] a [HASTA].\n\nACUERDAN\n\nPrimero. El vendedor transmite al comprador las participaciones/acciones descritas por un precio de [PRECIO] euros.\nSegundo. El pago se realiza mediante [FORMA_PAGO].\nTercero. Las partes solicitarán la anotación que legalmente corresponda y realizarán las comunicaciones tributarias aplicables.\n\nY en prueba de conformidad, firman por duplicado.\n\nEL VENDEDOR                         EL COMPRADOR`},
  {id:"board-minute",title:"Acta de junta general",category:"Societario",description:"Acta editable para documentar acuerdos de socios.",body:`ACTA DE LA JUNTA GENERAL DE [CLIENTE]\n\nEn [LOCALIDAD], a [FECHA], se reúne la Junta General de la sociedad [CLIENTE], con NIF [CIF_CLIENTE].\n\nAsistentes: [ASISTENTES].\nPresidente: [PRESIDENTE]. Secretario: [SECRETARIO].\n\nORDEN DEL DÍA\n[ORDEN_DIA]\n\nACUERDOS\n[ACUERDOS]\n\nSin más asuntos, se levanta la sesión y firman el presidente y el secretario.`},
  {id:"sole-shareholder",title:"Certificación de decisiones del socio único",category:"Societario",description:"Certificación editable para sociedades unipersonales.",body:`CERTIFICACIÓN DE DECISIONES DEL SOCIO ÚNICO\n\nD./D.ª [REPRESENTANTE], en calidad de [CARGO] de [CLIENTE], con NIF [CIF_CLIENTE], CERTIFICA:\n\nQue el socio único adoptó en fecha [FECHA] las siguientes decisiones:\n\n[ACUERDOS]\n\nY para que conste, expide la presente certificación en [LOCALIDAD], a [FECHA].\n\nFdo.: [REPRESENTANTE]`},
  {id:"vehicle-sale",title:"Contrato de compraventa de vehículo",category:"Contratos",description:"Contrato entre comprador y vendedor con los datos esenciales del vehículo.",body:`CONTRATO DE COMPRAVENTA DE VEHÍCULO\n\nEn [LOCALIDAD], a [FECHA] a las [HORA].\n\nVENDEDOR: [VENDEDOR], NIF [NIF_VENDEDOR].\nCOMPRADOR: [COMPRADOR], NIF [NIF_COMPRADOR].\nVEHÍCULO: marca [MARCA], modelo [MODELO], matrícula [MATRICULA], bastidor [BASTIDOR].\nPRECIO: [PRECIO] euros.\n\nEl vendedor declara que el vehículo se entrega libre de cargas salvo las expresamente indicadas: [CARGAS]. El comprador declara haber examinado el vehículo y ambas partes acuerdan tramitar el cambio de titularidad.\n\nFirma del vendedor                    Firma del comprador`},
  {id:"capital-increase",title:"Certificación de ampliación de capital",category:"Mercantil",description:"Borrador de certificación del acuerdo de aumento de capital.",body:`CERTIFICACIÓN DEL ACUERDO DE AUMENTO DE CAPITAL\n\nD./D.ª [REPRESENTANTE], [CARGO] de [CLIENTE], con NIF [CIF_CLIENTE], CERTIFICA que la Junta General celebrada el [FECHA] acordó aumentar el capital social en [IMPORTE] euros mediante [MODALIDAD], con la correspondiente modificación del artículo [ARTICULO] de los estatutos.\n\nEl capital resultante queda fijado en [CAPITAL_RESULTANTE] euros.\n\nEn [LOCALIDAD], a [FECHA].`},
  {id:"debt-capitalization",title:"Certificación de capitalización de créditos",category:"Mercantil",description:"Borrador para aumento de capital por compensación de créditos.",body:`CERTIFICACIÓN DE AUMENTO DE CAPITAL POR COMPENSACIÓN DE CRÉDITOS\n\nD./D.ª [REPRESENTANTE], [CARGO] de [CLIENTE], con NIF [CIF_CLIENTE], CERTIFICA que la Junta General celebrada el [FECHA] aprobó aumentar el capital en [IMPORTE] euros mediante compensación de los créditos descritos en el informe del órgano de administración, declarados líquidos y exigibles en los términos legalmente aplicables.\n\nSe modifica el artículo [ARTICULO] de los estatutos y el capital queda fijado en [CAPITAL_RESULTANTE] euros.\n\nEn [LOCALIDAD], a [FECHA].`}
];
const MANAGEMENT_PROCEDURES=[
  {id:"company-creation",title:"Creación de sociedad",category:"Societario",summary:"Constitución de una sociedad de capital y puesta en marcha fiscal.",steps:["Definir socios, denominación, domicilio, objeto, capital y órgano de administración.","Solicitar certificación negativa de denominación y preparar estatutos.","Aportar capital o documentar aportaciones; otorgar escritura pública.","Solicitar NIF y alta censal mediante modelo 036.","Inscribir la escritura en el Registro Mercantil y completar altas posteriores."],law:"Ley de Sociedades de Capital; Reglamento del Registro Mercantil; trámites CIRCE y AEAT.",source:"https://www.boe.es/buscar/act.php?id=BOE-A-2010-10544"},
  {id:"dissolution",title:"Disolución y liquidación",category:"Societario",summary:"Cese ordenado de actividad, liquidación y extinción registral.",steps:["Comprobar causa legal o estatutaria de disolución y situación patrimonial.","Convocar y celebrar junta; documentar el acuerdo y nombrar liquidadores.","Formar inventario y balance, cobrar créditos y pagar deudas.","Aprobar balance final, cuota de liquidación y reparto.","Otorgar escritura de extinción, inscribirla y tramitar bajas censales."],law:"Arts. 360 y siguientes de la Ley de Sociedades de Capital.",source:"https://www.boe.es/buscar/act.php?id=BOE-A-2010-10544"},
  {id:"vehicle-transfer",title:"Compraventa de vehículos",category:"Contratos",summary:"Contrato, fiscalidad y cambio de titularidad de un vehículo usado.",steps:["Solicitar informe y verificar titularidad, cargas, ITV e impuestos.","Firmar contrato con identidad de las partes, vehículo, precio, fecha y hora.","Justificar el ITP o su exención/no sujeción cuando corresponda.","Solicitar el cambio de titularidad en el plazo aplicable.","El vendedor puede notificar la venta para limitar responsabilidades posteriores."],law:"Procedimiento de transferencia de vehículos de la Dirección General de Tráfico.",source:"https://www.dgt.es/nuestros-servicios/tu-vehiculo/vas-a-comprar-o-vender-un-vehiculo-de-segunda-mano/"},
  {id:"holding",title:"Estructura holding",category:"Reestructuración",summary:"Análisis y ejecución de una sociedad cabecera sobre participadas.",steps:["Definir motivo económico, perímetro societario y gobierno del grupo.","Valorar participaciones y revisar pactos, restricciones y financiación.","Elegir la vía jurídica: compraventa, aportación no dineraria, canje u operación estructural.","Analizar fiscalidad, operaciones vinculadas y posible régimen especial.","Formalizar acuerdos, escrituras, inscripciones y comunicaciones."],law:"Ley de Sociedades de Capital, Ley del Impuesto sobre Sociedades y, cuando proceda, libro primero del RDL 5/2023.",source:"https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328"},
  {id:"capital-increase",title:"Ampliación de capital",category:"Capital",summary:"Aumento de capital con aportaciones dinerarias, no dinerarias o reservas.",steps:["Definir importe, modalidad, prima y nuevas participaciones o acciones.","Preparar informe y documentación de las aportaciones cuando proceda.","Convocar junta y respetar los derechos de preferencia aplicables.","Adoptar el acuerdo y modificar estatutos.","Otorgar escritura e inscribirla en el Registro Mercantil."],law:"Arts. 295 y siguientes de la Ley de Sociedades de Capital.",source:"https://www.boe.es/buscar/act.php?id=BOE-A-2010-10544"},
  {id:"capital-reduction",title:"Reducción de capital",category:"Capital",summary:"Reducción por pérdidas, devolución de aportaciones u otras finalidades legales.",steps:["Determinar finalidad, cifra, procedimiento y efecto sobre participaciones o acciones.","Preparar balances, informes o verificaciones exigibles según el caso.","Convocar junta y adoptar el acuerdo con modificación estatutaria.","Aplicar la tutela de socios y acreedores que corresponda.","Otorgar escritura, publicar cuando proceda e inscribir."],law:"Arts. 317 y siguientes de la Ley de Sociedades de Capital.",source:"https://www.boe.es/buscar/act.php?id=BOE-A-2010-10544"},
  {id:"debt-conversion",title:"Conversión de deudas en capital",category:"Capital",summary:"Aumento de capital mediante compensación de créditos.",steps:["Identificar acreedores, créditos, vencimiento, liquidez y exigibilidad.","Preparar el informe del órgano de administración con detalle de los créditos.","Poner la documentación a disposición de los socios y convocar junta.","Aprobar el aumento y la modificación estatutaria.","Otorgar escritura e inscribir, incorporando los informes exigibles."],law:"Art. 301 de la Ley de Sociedades de Capital.",source:"https://www.boe.es/buscar/act.php?id=BOE-A-2010-10544"},
  {id:"share-sale",title:"Compraventa de acciones o participaciones",category:"Mercantil",summary:"Transmisión de títulos o participaciones con revisión societaria y fiscal.",steps:["Identificar partes, títulos, cargas, derechos y precio.","Revisar estatutos, pactos y restricciones legales a la transmisión.","Obtener autorizaciones, renuncias o comunicaciones necesarias.","Formalizar el contrato y, en la SL, documentar la transmisión en documento público.","Actualizar el libro registro correspondiente y revisar obligaciones fiscales."],law:"Arts. 104 y siguientes de la Ley de Sociedades de Capital.",source:"https://www.boe.es/buscar/act.php?id=BOE-A-2010-10544"}
];

function openManagementSection(name){
  document.querySelectorAll("[data-management-tab]").forEach(tab=>tab.setAttribute("aria-selected",String(tab.dataset.managementTab===name)));
  document.querySelectorAll("[data-management-panel]").forEach(panel=>panel.hidden=panel.dataset.managementPanel!==name);
  if(name==="models")renderManagementModels();
  if(name==="client-users")renderClientUsers();
  if(name==="billing")renderManagementBilling();
}
const clientPortalAccessKey="app-am-client-portal-access";
function clientPortalAccessRecords(){try{return JSON.parse(localStorage.getItem(clientPortalAccessKey)||"{}")}catch{return{}}}
function saveClientPortalAccessRecords(records){localStorage.setItem(clientPortalAccessKey,JSON.stringify(records))}
function defaultClientEmail(client){return client?.contacts?.find(contact=>contact.primary)?.email||client?.contacts?.find(contact=>contact.email)?.email||String(client?.emails||"").split(/[\n,;]/).map(value=>value.trim()).find(Boolean)||""}
function portalAccessFor(client){const records=clientPortalAccessRecords();return records[clientIdentity(client)]||{email:defaultClientEmail(client),status:"none",invitedAt:"",lastAccess:""}}
function portalStatusLabel(status){return status==="active"?"Activo":status==="invited"?"Invitación enviada":status==="blocked"?"Bloqueado":"Sin acceso"}
function setPortalAccess(clientName,changes){const records=clientPortalAccessRecords(),current=records[clientName]||{};records[clientName]={...current,...changes};saveClientPortalAccessRecords(records)}
function installClientPortalAccessBlock(){
  const form=document.querySelector("#newClientForm"),before=form?.querySelector(".fiscal-obligations");if(!form||!before)return;
  const fieldset=document.createElement("fieldset");fieldset.className="client-portal-access";fieldset.innerHTML=`<legend>Acceso al portal del cliente</legend><p>Prepara el usuario con el que el cliente accederá únicamente a su propia documentación.</p><div class="client-portal-access-grid"><label>Correo de acceso<input id="clientPortalEmail" type="email" placeholder="cliente@empresa.es"></label><div><span>Estado</span><strong id="clientPortalStatus" class="portal-status none">Sin acceso</strong></div><button class="secondary-button" id="sendClientInvitation" type="button">Enviar invitación</button><button class="secondary-button" id="previewClientPortal" type="button">Ver como cliente</button></div><small id="clientPortalAccessNote">El envío de correo se conectará en la siguiente fase.</small>`;before.before(fieldset);
  fieldset.querySelector("#sendClientInvitation").addEventListener("click",()=>{const name=form.dataset.editing||form.querySelector("#clientName").value.trim(),email=fieldset.querySelector("#clientPortalEmail").value.trim();if(!name||!email){fieldset.querySelector("#clientPortalAccessNote").textContent="Guarda el cliente e indica un correo válido.";return}setPortalAccess(name,{email,status:"invited",invitedAt:new Date().toISOString()});syncClientPortalAccessBlock({name,emails:email});fieldset.querySelector("#clientPortalAccessNote").textContent="Vista previa: invitación marcada como enviada. El correo real se conectará después."});
  fieldset.querySelector("#previewClientPortal").addEventListener("click",()=>{const name=form.dataset.editing||form.querySelector("#clientName").value.trim();if(name)previewAsClient(name)});
  syncClientPortalAccessBlock();
}
function installClientAppAvailabilityToggle(){const personType=document.querySelector("#clientPersonType")?.closest("label");if(!personType||document.querySelector("#clientAppEnabled"))return;const field=document.createElement("label");field.className="client-active-field client-app-field";field.innerHTML='<span>Aplicación disponible</span><span class="client-active-control"><input id="clientAppEnabled" type="checkbox"><i aria-hidden="true"></i><small>Permitir acceso al portal</small></span>';personType.after(field)}
function syncClientPortalAccessBlock(client={}){const fieldset=document.querySelector(".client-portal-access");if(!fieldset)return;const name=clientIdentity(client)||document.querySelector("#newClientForm")?.dataset.editing||"",access=name?portalAccessFor({...client,id:name,name}):{email:"",status:"none"};fieldset.querySelector("#clientPortalEmail").value=access.email||defaultClientEmail(client);const status=fieldset.querySelector("#clientPortalStatus");status.textContent=portalStatusLabel(access.status);status.className=`portal-status ${access.status||"none"}`;fieldset.querySelector("#sendClientInvitation").textContent=access.status==="invited"?"Reenviar invitación":"Enviar invitación";fieldset.querySelector("#previewClientPortal").disabled=!name}
async function renderClientUsers(){
  const panel=document.querySelector('[data-management-panel="client-users"]');if(!panel)return;panel.innerHTML=`<section class="management-workspace-head"><div><p class="eyebrow">PORTAL DE CLIENTES</p><h2>Usuarios clientes</h2><p>Gestiona invitaciones y revisa c��mo verá cada cliente su portal.</p></div></section><section class="client-users-panel"><div class="client-users-table-wrap"><table><thead><tr><th>Cliente</th><th>Correo de acceso</th><th>Estado</th><th>Último acceso</th><th>Acciones</th></tr></thead><tbody id="clientUsersRows"><tr><td colspan="5">Cargando clientes…</td></tr></tbody></table></div></section>`;
  const body=panel.querySelector("#clientUsersRows");try{const clients=(await getAllClientMetadata()).filter(clientIsActive).sort((a,b)=>clientIdentity(a).localeCompare(clientIdentity(b),"es"));body.innerHTML=clients.length?clients.map(client=>{const name=clientIdentity(client),access=portalAccessFor(client);return `<tr><td><strong>${escapeHtml(name)}</strong><small>${escapeHtml(client.cif||"Sin CIF")}</small></td><td>${access.email?escapeHtml(access.email):'<em>Sin correo configurado</em>'}</td><td><span class="portal-status ${access.status||"none"}">${portalStatusLabel(access.status)}</span></td><td>${access.lastAccess?escapeHtml(new Date(access.lastAccess).toLocaleString("es-ES")):"Nunca"}</td><td><div class="client-user-actions"><button type="button" data-invite-client="${escapeHtml(name)}">${access.status==="invited"?"Reenviar":"Invitar"}</button><button type="button" data-preview-client="${escapeHtml(name)}">Ver como cliente</button><button type="button" data-block-client="${escapeHtml(name)}">${access.status==="blocked"?"Desbloquear":"Bloquear"}</button></div></td></tr>`}).join(""):'<tr><td colspan="5">No hay clientes activos.</td></tr>'}catch{body.innerHTML='<tr><td colspan="5">No se pudieron cargar los clientes.</td></tr>'}
  body.querySelectorAll("[data-preview-client]").forEach(button=>button.addEventListener("click",()=>previewAsClient(button.dataset.previewClient)));
  body.querySelectorAll("[data-invite-client]").forEach(button=>button.addEventListener("click",()=>{const name=button.dataset.inviteClient,email=button.closest("tr").children[1].textContent.trim();if(!email||email==="Sin correo configurado"){alert("Añade primero un correo de acceso desde la ficha del cliente.");return}setPortalAccess(name,{email,status:"invited",invitedAt:new Date().toISOString()});renderClientUsers()}));
  body.querySelectorAll("[data-block-client]").forEach(button=>button.addEventListener("click",()=>{const name=button.dataset.blockClient,current=clientPortalAccessRecords()[name]?.status;setPortalAccess(name,{status:current==="blocked"?"none":"blocked"});renderClientUsers()}));
}
function billingHoursLabel(value){return value==="12+"?"12+ h":`${String(value).replace(".",",")} h`}
function billingDateLabel(value){
  const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}).format(date);
}
function updateBillingAlerts(){
  const nav=document.querySelector('nav button[data-title="Gestión"]');
  let badge=nav?.querySelector(".billing-nav-alert");
  if(!billingUnreadCount){badge?.remove();nav?.classList.remove("has-billing-alert")}else if(nav){if(!badge){badge=document.createElement("span");badge.className="billing-nav-alert";nav.appendChild(badge)}const count=billingUnreadCount>99?"99+":String(billingUnreadCount);badge.setAttribute("aria-label",`${count} nuevos avisos de facturación`);badge.innerHTML=`<b>F</b><small>${count}</small>`;nav.classList.add("has-billing-alert")}
  const tab=document.querySelector("[data-billing-tab-alert]");if(tab){tab.hidden=!billingUnreadCount;tab.textContent=billingUnreadCount>99?"99+":String(billingUnreadCount)}
}
async function refreshBillingData(redraw=false){
  if(!signedInUser)return;
  try{const result=await apiJson("/api/billing");billingEntries=Array.isArray(result.entries)?result.entries:[];billingUnreadCount=Number(result.unreadCount)||0;const visible=document.querySelector('[data-management-panel="billing"]')?.hidden===false;if(visible&&billingUnreadCount){await apiJson("/api/billing/read",{method:"POST",body:"{}"});billingUnreadCount=0}updateBillingAlerts();if(redraw||visible)drawManagementBilling()}catch{}
}
function drawManagementBilling(){
  const body=document.querySelector("#billingTableBody"),empty=document.querySelector("#billingEmpty");if(!body||!empty)return;
  empty.hidden=Boolean(billingEntries.length);body.innerHTML=billingEntries.map(entry=>`<tr><td><strong>${escapeHtml(billingDateLabel(entry.date))}</strong><small>${escapeHtml(chatMessageTime(entry.createdAt))}</small></td><td><span class="billing-employee"><i>${workerInitials(entry.employee||entry.employeeId||"")}</i>${escapeHtml(entry.employee||entry.employeeId||"—")}</span></td><td>${entry.client?escapeHtml(entry.client):'<span class="billing-no-client">Sin cliente</span>'}</td><td class="billing-description">${escapeHtml(entry.description)}</td><td><strong class="billing-hours">${escapeHtml(billingHoursLabel(entry.hours))}</strong></td></tr>`).join("");
}
async function renderManagementBilling(){
  const panel=document.querySelector('[data-management-panel="billing"]');if(!panel)return;
  if(!panel.dataset.ready){panel.dataset.ready="true";panel.innerHTML=`<section class="management-workspace-head billing-workspace-head"><div><p class="eyebrow">TRABAJOS PARA FACTURAR</p><h2>Facturación</h2><p>Notas de trabajos realizados por el equipo que deben incluirse en la facturación.</p></div><button class="primary blue-button" id="managementNewBilling" type="button">＋ Añadir trabajo</button></section><section class="billing-panel"><div class="billing-table-wrap"><table class="billing-table"><thead><tr><th>Fecha</th><th>Empleado</th><th>Cliente</th><th>Trabajo realizado</th><th>Horas</th></tr></thead><tbody id="billingTableBody"></tbody></table><div class="billing-empty" id="billingEmpty" hidden><span>€</span><strong>No hay trabajos pendientes de registrar</strong><small>Las notas que añada el equipo aparecerán aquí.</small></div></div></section>`;panel.querySelector("#managementNewBilling").addEventListener("click",openBillingModal)}
  await refreshBillingData(true);
  try{await apiJson("/api/billing/read",{method:"POST",body:"{}"});billingUnreadCount=0;updateBillingAlerts()}catch{}
}
async function openBillingModal(){
  document.querySelector("#billingModal")?.remove();let clients=[];try{clients=(await getAllClientMetadata()).filter(clientIsActive).sort((a,b)=>clientIdentity(a).localeCompare(clientIdentity(b),"es"))}catch{}
  const shell=document.createElement("div");shell.id="billingModal";shell.className="modal-shell billing-modal-shell open";shell.setAttribute("aria-hidden","false");
  const hourOptions=[...Array.from({length:24},(_,index)=>String((index+1)/2)),"12+"];
  shell.innerHTML=`<div class="modal-backdrop" data-close-billing></div><section class="client-modal billing-modal" role="dialog" aria-modal="true" aria-labelledby="billingModalTitle"><div class="modal-heading"><div><p class="eyebrow">NUEVA NOTA</p><h2 id="billingModalTitle">Trabajo para facturación</h2></div><button class="modal-close" type="button" data-close-billing aria-label="Cerrar">×</button></div><form id="billingForm"><div class="billing-form-grid"><label>Fecha<input id="billingDate" type="date" required value="${localDateKey(new Date())}"></label><label>Horas<select id="billingHours" required>${hourOptions.map(value=>`<option value="${value}">${billingHoursLabel(value)}</option>`).join("")}</select></label><label class="billing-client-field">Cliente <small>Opcional</small><select id="billingClient"><option value="">Sin cliente relacionado</option>${clients.map(client=>`<option value="${escapeHtml(clientIdentity(client))}">${escapeHtml(clientIdentity(client))}</option>`).join("")}</select></label><label class="billing-description-field">Descripción del trabajo<textarea id="billingDescription" rows="5" maxlength="1500" required placeholder="Indica el trabajo que se ha realizado…"></textarea></label></div><p class="billing-form-note">Empleado: <strong>${escapeHtml(signedInUser?.name||"")}</strong></p><p class="form-message" id="billingFormMessage"></p><div class="modal-actions"><button class="task-cancel-button" type="button" data-close-billing><span>×</span>Cancelar</button><button class="primary blue-button" type="submit">Guardar en facturación</button></div></form></section>`;
  document.body.appendChild(shell);const close=()=>shell.remove();shell.querySelectorAll("[data-close-billing]").forEach(button=>button.addEventListener("click",close));
  shell.querySelector("form").addEventListener("submit",async event=>{event.preventDefault();const submit=event.currentTarget.querySelector('button[type="submit"]'),message=shell.querySelector("#billingFormMessage");submit.disabled=true;message.textContent="";try{await apiJson("/api/billing",{method:"POST",body:JSON.stringify({date:shell.querySelector("#billingDate").value,client:shell.querySelector("#billingClient").value,description:shell.querySelector("#billingDescription").value,hours:shell.querySelector("#billingHours").value})});close();await refreshBillingData(true)}catch(reason){message.textContent=reason.message}finally{submit.disabled=false}});
  setTimeout(()=>shell.querySelector("#billingDescription")?.focus(),100);
}
function renderManagementModels(){
  const panel=document.querySelector('[data-management-panel="models"]');if(!panel||panel.dataset.ready)return;panel.dataset.ready="true";
  panel.innerHTML=`<section class="management-workspace-head"><div><p class="eyebrow">BIBLIOTECA DEL DESPACHO</p><h2>Modelos de documentos</h2><p>Busca un modelo, completa los datos desde una ficha de cliente o rellénalo manualmente.</p></div><label class="management-library-search"><span>⌕</span><input id="modelSearch" type="search" placeholder="Buscar contrato, acta, certificación…"></label></section><section class="management-library-layout"><div class="management-library-list" id="modelList"></div><div class="management-editor-empty" id="modelWorkspace"><span>▤</span><h3>Selecciona un modelo</h3><p>Podrás editarlo, cargar datos de clientes e imprimirlo.</p></div></section>`;
  document.querySelector("#modelSearch").addEventListener("input",event=>drawManagementModelList(event.target.value));drawManagementModelList();
}
function drawManagementModelList(query=""){
  const list=document.querySelector("#modelList"),q=query.trim().toLocaleLowerCase("es"),items=MANAGEMENT_MODELS.filter(item=>(item.title+" "+item.category+" "+item.description).toLocaleLowerCase("es").includes(q));
  list.innerHTML=items.length?items.map(item=>`<button type="button" data-model-id="${item.id}"><span>${item.category}</span><strong>${item.title}</strong><small>${item.description}</small><b>Editar modelo ›</b></button>`).join(""):'<div class="management-library-no-results">No se encontraron modelos.</div>';
  list.querySelectorAll("[data-model-id]").forEach(button=>button.addEventListener("click",()=>openManagementModel(button.dataset.modelId)));
}
async function openManagementModel(id){
  const model=MANAGEMENT_MODELS.find(item=>item.id===id),workspace=document.querySelector("#modelWorkspace");if(!model||!workspace)return;
  let clients=[];try{clients=(await getAllClientMetadata()).filter(clientIsActive)}catch{}
  const saved=localStorage.getItem(`app-am-model-${id}`)||model.body;
  workspace.className="management-model-editor";workspace.innerHTML=`<div class="management-editor-heading"><div><p class="eyebrow">${model.category}</p><h3>${model.title}</h3></div><button type="button" class="secondary-button" id="resetManagementModel">Restaurar</button></div><div class="management-model-data"><label>Cliente<select id="managementModelClient"><option value="">Rellenar manualmente</option>${clients.sort((a,b)=>(a.name||a.id).localeCompare(b.name||b.id,"es")).map(client=>`<option value="${escapeHtml(client.id)}">${escapeHtml(client.name||client.id)}</option>`).join("")}</select></label><label>Nombre / sociedad<input id="managementModelName" type="text" placeholder="Nombre o razón social"></label><label>NIF / CIF<input id="managementModelCif" type="text" maxlength="9" placeholder="B12345678"></label><label>Representante<input id="managementModelRepresentative" type="text" placeholder="Nombre y apellidos"></label></div><label class="management-model-document">Contenido editable<textarea id="managementModelBody" spellcheck="true"></textarea></label><div class="management-editor-actions"><small>Revisa siempre los datos y adapta el texto al caso concreto antes de firmar.</small><button type="button" class="secondary-button" id="saveManagementModel">Guardar cambios</button><button type="button" class="primary blue-button" id="printManagementModel">Imprimir / PDF</button></div>`;
  const body=document.querySelector("#managementModelBody");body.value=saved;
  document.querySelector("#managementModelClient").addEventListener("change",event=>{const client=clients.find(item=>item.id===event.target.value);if(!client)return;document.querySelector("#managementModelName").value=client.name||client.id||"";document.querySelector("#managementModelCif").value=client.cif||"";document.querySelector("#managementModelRepresentative").value=client.representative||""});
  document.querySelector("#resetManagementModel").addEventListener("click",()=>{body.value=model.body;localStorage.removeItem(`app-am-model-${id}`)});
  document.querySelector("#saveManagementModel").addEventListener("click",event=>{localStorage.setItem(`app-am-model-${id}`,body.value);event.currentTarget.textContent="Guardado ✓";setTimeout(()=>event.currentTarget.textContent="Guardar cambios",1300)});
  document.querySelector("#printManagementModel").addEventListener("click",()=>printManagementText(model.title,fillManagementModel(body.value)));
}
function fillManagementModel(text){const values={CLIENTE:document.querySelector("#managementModelName")?.value||"[CLIENTE]",SOCIEDAD:document.querySelector("#managementModelName")?.value||"[SOCIEDAD]",CIF_CLIENTE:document.querySelector("#managementModelCif")?.value||"[CIF_CLIENTE]",REPRESENTANTE:document.querySelector("#managementModelRepresentative")?.value||"[REPRESENTANTE]",FECHA:new Date().toLocaleDateString("es-ES")};return Object.entries(values).reduce((result,[key,value])=>result.replaceAll(`[${key}]`,value),text)}
function printManagementText(title,text){const printWindow=window.open("","_blank");if(!printWindow)return;printWindow.opener=null;printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:15px/1.65 Arial,sans-serif;color:#172033;max-width:820px;margin:45px auto;padding:0 35px}h1{font-size:22px;border-bottom:2px solid #14279b;padding-bottom:12px}pre{font:inherit;white-space:pre-wrap}ol{padding-left:22px}small{color:#667085}@media print{body{margin:0}}</style></head><body><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(text)}</pre></body></html>`);printWindow.document.close();printWindow.focus();setTimeout(()=>printWindow.print(),250)}
let workCatalog=null;
let activeWorkArea="01";
function renderWorkProcedures(){
  main.innerHTML=`<header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">PROCEDIMIENTOS DEL DESPACHO</p><h1>Trabajos</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header><section class="management-workspace-head work-catalog-head"><div><p class="eyebrow">CATÁLOGO DE TRÁMITES</p><h2>Procedimientos de trabajo</h2><p>Procedimiento, documentación, plazo y normativa de cada encargo.</p></div><div class="work-head-actions"><label class="management-library-search"><span>⌕</span><input id="procedureSearch" type="search" placeholder="Buscar entre procedimientos…"></label><button type="button" class="primary blue-button" id="newCustomWork">＋ Nuevo trabajo</button></div></section><section class="work-catalog-layout"><aside class="work-area-list" id="workAreaList"><div class="work-loading">Cargando áreas…</div></aside><div class="work-procedure-content"><div class="work-procedure-heading" id="workProcedureHeading"></div><div class="work-procedure-list" id="procedureGrid"><div class="work-loading">Cargando procedimientos…</div></div></div></section>`;
  bindHeader();
  document.querySelector("#procedureSearch").addEventListener("input",event=>drawWorkCatalog(event.target.value));
  document.querySelector("#newCustomWork").addEventListener("click",()=>openCustomWorkEditor());
  loadWorkCatalog();
}
async function loadWorkCatalog(){
  try{
    if(!workCatalog){const response=await fetch("/catalogo-tramites.json?v=1");if(!response.ok)throw new Error();workCatalog=await response.json()}
    drawWorkAreas();drawWorkCatalog();
  }catch{document.querySelector("#procedureGrid").innerHTML='<div class="management-library-no-results">No se pudo cargar el catálogo de procedimientos.</div>'}
}
function drawWorkAreas(){
  const list=document.querySelector("#workAreaList");if(!list||!workCatalog)return;
  const custom=getCustomWorks(),areas=custom.length?[{id:"custom",title:"Trabajos personalizados",procedures:custom},...workCatalog.areas]:workCatalog.areas;
  list.innerHTML=`<div class="work-area-title"><strong>Áreas de trabajo</strong><small>${areas.length} áreas · ${allWorkProcedures().length} procedimientos</small></div>${areas.map(area=>`<button type="button" data-work-area="${area.id}" class="${area.id===activeWorkArea?"active":""}"><span>${area.id==="custom"?"★":area.id}</span><strong>${escapeHtml(area.title)}</strong><small>${area.procedures.length}</small></button>`).join("")}`;
  list.querySelectorAll("[data-work-area]").forEach(button=>button.addEventListener("click",()=>{activeWorkArea=button.dataset.workArea;document.querySelector("#procedureSearch").value="";drawWorkAreas();drawWorkCatalog()}));
}
function drawWorkCatalog(query=""){
  const grid=document.querySelector("#procedureGrid"),heading=document.querySelector("#workProcedureHeading");if(!grid||!heading||!workCatalog)return;
  const q=query.trim().toLocaleLowerCase("es"),custom={id:"custom",title:"Trabajos personalizados",scope:"Procesos creados por el despacho.",procedures:getCustomWorks()},areas=[custom,...workCatalog.areas],selected=areas.find(area=>area.id===activeWorkArea)||areas.find(area=>area.procedures.length)||workCatalog.areas[0];
  const items=(q?allWorkProcedures():selected.procedures.map(item=>({...item,areaTitle:selected.title,custom:selected.id==="custom"}))).filter(item=>!q||(`${item.title} ${item.section||""} ${item.description||""} ${item.organism||""} ${item.law||""}`).toLocaleLowerCase("es").includes(q));
  heading.innerHTML=q?`<div><p class="eyebrow">RESULTADOS</p><h2>Búsqueda global</h2></div><strong>${items.length} encontrados</strong>`:`<div><p class="eyebrow">ÁREA ${selected.id}</p><h2>${escapeHtml(selected.title)}</h2><p>${escapeHtml(selected.scope)}</p></div><strong>${items.length} procedimientos</strong>`;
  grid.innerHTML=items.length?items.map(item=>`<details class="work-procedure-card"><summary><span class="work-procedure-number">${escapeHtml(item.custom?"★":item.id)}</span><span class="work-procedure-summary"><small>${escapeHtml(q?item.areaTitle:(item.section||selected.title))}</small><strong>${escapeHtml(item.title)}</strong><em>${escapeHtml(item.description||"")}</em></span><span class="work-procedure-open">＋</span></summary><div class="work-procedure-detail">${item.organism?`<p class="work-organism"><strong>Organismo</strong><span>${escapeHtml(item.organism)}</span></p>`:""}<section><h3>Procedimiento</h3><ol>${(item.steps||[]).map(step=>`<li>${escapeHtml(step)}</li>`).join("")}</ol></section><section><h3>Documentación necesaria</h3><ul>${(item.documents||[]).map(document=>`<li>${escapeHtml(document)}</li>`).join("")}</ul></section><div class="work-reference-grid"><section><h3>Plazo</h3><p>${escapeHtml(item.deadline||"Sin plazo definido")}</p></section><section><h3>Normativa / notas</h3><p>${escapeHtml(item.law||"Sin indicaciones")}</p></section></div><div class="procedure-actions"><small>Revisar requisitos vigentes antes de ejecutar el expediente.</small><div>${item.custom?`<button type="button" data-edit-custom-work="${escapeHtml(item.id)}">Editar</button>`:""}<button type="button" data-print-work="${escapeHtml(item.id)}">Imprimir / PDF</button></div></div></div></details>`).join(""):'<div class="management-library-no-results">No se encontraron procedimientos.</div>';
  grid.querySelectorAll("[data-print-work]").forEach(button=>button.addEventListener("click",event=>{event.preventDefault();const item=items.find(value=>value.id===button.dataset.printWork);if(!item)return;printManagementText(item.title,`${item.description}\n\nORGANISMO\n${item.organism}\n\nPROCEDIMIENTO\n\n${item.steps.map((step,index)=>`${index+1}. ${step}`).join("\n\n")}\n\nDOCUMENTACIÓN NECESARIA\n\n${item.documents.map(document=>`• ${document}`).join("\n")}\n\nPLAZO\n${item.deadline}\n\nNORMATIVA\n${item.law}\n\nNota: revisar la normativa vigente y las circunstancias concretas antes de ejecutar el expediente.`)}));
  grid.querySelectorAll("[data-edit-custom-work]").forEach(button=>button.addEventListener("click",event=>{event.preventDefault();openCustomWorkEditor(button.dataset.editCustomWork)}));
}
function openCustomWorkEditor(id=""){
  document.querySelector("#customWorkModal")?.remove();const existing=getCustomWorks().find(item=>item.id===id),shell=document.createElement("div");shell.id="customWorkModal";shell.className="modal-shell task-modal-shell open";shell.setAttribute("aria-hidden","false");
  shell.innerHTML=`<div class="modal-backdrop" data-close-custom-work></div><section class="client-modal custom-work-modal" role="dialog" aria-modal="true"><div class="client-modal-head"><div><p class="eyebrow">${existing?"EDITAR PLANTILLA":"NUEVA PLANTILLA"}</p><h2>${existing?"Editar trabajo":"Añadir trabajo"}</h2></div><button class="modal-close" type="button" data-close-custom-work aria-label="Cerrar">×</button></div><form id="customWorkForm"><div class="custom-work-grid"><label>Nombre del trabajo<input id="customWorkTitle" maxlength="120" required value="${escapeHtml(existing?.title||"")}" placeholder="Ej. Constitución de una sociedad"></label><label>Categoría<input id="customWorkCategory" maxlength="60" value="${escapeHtml(existing?.section||"")}" placeholder="Societario, fiscal, laboral…"></label><label class="wide">Descripción<textarea id="customWorkDescription" rows="2" maxlength="500" placeholder="Finalidad y alcance del trabajo">${escapeHtml(existing?.description||"")}</textarea></label><label class="wide">Pasos del proceso <small>Escribe un paso por línea.</small><textarea id="customWorkSteps" rows="8" required placeholder="Certificado negativo de denominación\nApertura de cuenta bancaria\nRedacción de estatutos">${escapeHtml((existing?.steps||[]).join("\n"))}</textarea></label><label class="wide">Documentación necesaria <small>Un documento por línea.</small><textarea id="customWorkDocuments" rows="5" placeholder="DNI de los socios\nCertificación negativa\nJustificante bancario">${escapeHtml((existing?.documents||[]).join("\n"))}</textarea></label><label>Organismo<input id="customWorkOrganism" maxlength="120" value="${escapeHtml(existing?.organism||"")}" placeholder="Registro Mercantil / AEAT"></label><label>Plazo<input id="customWorkDeadline" maxlength="180" value="${escapeHtml(existing?.deadline||"")}" placeholder="Plazo orientativo"></label><label class="wide">Normativa o indicaciones<textarea id="customWorkLaw" rows="3" maxlength="700">${escapeHtml(existing?.law||"")}</textarea></label></div><div class="modal-actions"><button class="task-cancel-button" type="button" data-close-custom-work>Cancelar</button><button class="primary blue-button" type="submit">Guardar trabajo</button></div></form></section>`;
  document.body.appendChild(shell);const close=()=>shell.remove();shell.querySelectorAll("[data-close-custom-work]").forEach(button=>button.addEventListener("click",close));
  shell.querySelector("form").addEventListener("submit",event=>{event.preventDefault();const lines=id=>document.querySelector(id).value.split("\n").map(value=>value.trim()).filter(Boolean),items=getCustomWorks(),data={id:existing?.id||`custom-${Date.now()}`,title:document.querySelector("#customWorkTitle").value.trim(),section:document.querySelector("#customWorkCategory").value.trim()||"Personalizado",description:document.querySelector("#customWorkDescription").value.trim(),steps:lines("#customWorkSteps"),documents:lines("#customWorkDocuments"),organism:document.querySelector("#customWorkOrganism").value.trim(),deadline:document.querySelector("#customWorkDeadline").value.trim(),law:document.querySelector("#customWorkLaw").value.trim()};
    const index=items.findIndex(item=>item.id===data.id);if(index>=0)items[index]=data;else items.unshift(data);saveCustomWorks(items);activeWorkArea="custom";close();drawWorkAreas();drawWorkCatalog();
  });
  setTimeout(()=>shell.querySelector("#customWorkTitle")?.focus(),120);
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
function toggleClientPeople(){
  const legal=document.querySelector('#clientPersonType').value==='juridica';
  document.querySelector('#clientPeople').hidden=!legal;
  document.querySelector('#legacyClientPeople').hidden=legal;
}
function openPeopleTab(name){
  document.querySelectorAll('[data-people-tab]').forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.peopleTab===name)));
  for(const item of ['Socios','Contactos'])document.querySelector('#people'+item).hidden=item!==name;
}
function addClientPerson(kind,value={}){
  const partner=kind==='partner',row=document.createElement('div');row.className='client-person-row';row.dataset.personKind=kind;if(partner)row.dataset.partnerId=value.id||crypto.randomUUID();
  const fields=partner?[['name','Nombre','text'],['dni','DNI','text'],['participation','% de participación','number']]:[['name','Nombre','text'],['phone','Teléfono','tel'],['email','Correo electrónico','email']];
  for(const [key,label,type] of fields){const wrapper=document.createElement('label');wrapper.textContent=label;const input=document.createElement('input');input.type=type;input.dataset.personField=key;input.addEventListener('invalid',()=>openPeopleTab(partner?'Socios':'Contactos'));input.value=value[key]??'';if(type==='number'){input.min='0';input.max='100';input.step='0.01'}else input.maxLength=key==='dni'?9:254;if(partner)input.addEventListener('input',()=>refreshAdministratorOptions());wrapper.append(input);row.append(wrapper)}
  if(!partner){const label=document.createElement('label');label.className='client-primary-contact';const radio=document.createElement('input');radio.type='radio';radio.name='clientPrimaryContact';radio.dataset.personField='primary';radio.checked=Boolean(value.primary);label.append(radio,document.createTextNode('Contacto principal'));row.append(label)}
  const remove=document.createElement('button');remove.type='button';remove.className='client-person-delete';remove.setAttribute('aria-label',partner?'Eliminar socio':'Eliminar contacto');remove.title=partner?'Eliminar socio':'Eliminar contacto';remove.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>';remove.onclick=()=>{row.remove();if(partner)refreshAdministratorOptions()};row.append(remove);
  document.querySelector(partner?'#clientPartnerRows':'#clientContactRows').append(row);if(partner)refreshAdministratorOptions();
}
function refreshAdministratorOptions(selected){
  const select=document.querySelector('#clientAdministratorPartner');if(!select)return;
  const current=selected===undefined?select.value:selected;
  select.replaceChildren(new Option('Seleccionar socio…',''));
  document.querySelectorAll('[data-person-kind="partner"]').forEach(row=>{
    const name=row.querySelector('[data-person-field="name"]').value.trim();
    const dni=row.querySelector('[data-person-field="dni"]').value.trim();
    if(name)select.add(new Option(name+(dni?' · '+dni:''),row.dataset.partnerId));
  });
  select.value=[...select.options].some(option=>option.value===current)?current:'';
}
function populateClientPeople(data={}){
  document.querySelector('#clientPartnerRows').replaceChildren();document.querySelector('#clientContactRows').replaceChildren();
  document.querySelector('#clientAdministrationType').value=data.administrationType||'Administrador único';
  for(const value of data.partners||[])addClientPerson('partner',value);
  refreshAdministratorOptions(data.administratorPartnerId||'');
  // Old phone/email lists have no reliable association: preserve each as its own contact.
  const contacts=data.contacts??[...contactLines(data.phones).map(phone=>({phone})),...contactLines(data.emails).map(email=>({email}))];
  for(const value of contacts)addClientPerson('contact',value);
  const legacy=document.querySelector('#clientPeopleLegacy');if(legacy)legacy.remove();
  if(data.administrators||data.representative){const note=document.createElement('p');note.id='clientPeopleLegacy';note.textContent='Datos anteriores — Administradores: '+(data.administrators||'—')+'. Representante: '+(data.representative||'—')+' '+(data.representativeNif||'');document.querySelector('#peopleSocios').append(note)}
  document.querySelectorAll('[data-people-tab]').forEach(tab=>tab.onclick=()=>openPeopleTab(tab.dataset.peopleTab));
  document.querySelector('#addClientPartner').onclick=()=>addClientPerson('partner');document.querySelector('#addClientContact').onclick=()=>addClientPerson('contact');
  openPeopleTab('Socios');toggleClientPeople();
}
function collectClientPeople(){
  const read=kind=>[...document.querySelectorAll('[data-person-kind="'+kind+'"]')].map(row=>Object.fromEntries([...row.querySelectorAll('[data-person-field]')].map(input=>[input.dataset.personField,input.type==='radio'?input.checked:input.type==='number'?(input.value===''?null:Number(input.value)):input.value.trim()])));
  return {administrationType:document.querySelector('#clientAdministrationType').value,administratorPartnerId:document.querySelector('#clientAdministratorPartner').value,partners:read('partner').map((p,i)=>({...p,id:document.querySelectorAll('[data-person-kind="partner"]')[i].dataset.partnerId})),contacts:read('contact')};
}
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
function toggleCommercialRegistry(){toggleClientPeople();const section=document.querySelector("#commercialRegistrySection");if(section)section.hidden=document.querySelector("#clientPersonType").value!=="juridica"}
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
  form.querySelectorAll("#clientPeople button:not([role=tab])").forEach(button=>button.disabled=viewOnly);
  form.querySelectorAll("input,select,textarea").forEach(control=>{control.disabled=viewOnly});  document.querySelector("#browseExistingSignature").disabled=viewOnly;  document.querySelectorAll("#commercialRegistrySection button:not([role=tab])").forEach(button=>button.disabled=viewOnly);
  document.querySelector("#editClientFromView").hidden=!viewOnly;
  document.querySelector("#saveClientButton").hidden=viewOnly;
  document.querySelector("#clientModalDismiss").textContent="Cerrar";
}
function openClientModal(){
  const form=document.querySelector("#newClientForm");form.reset();delete form.dataset.editing;delete form.dataset.existingSignature;
  document.querySelector("#linkedSignatureName").textContent="Ninguna firma vinculada";document.querySelector("#existingSignaturePicker").hidden=true;
  populateClientPeople();
  resetCommercialRegistry();
  document.querySelector("#clientAppEnabled").checked=false;
  syncClientPortalAccessBlock();
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
  document.querySelector("#clientActive").checked=clientIsActive(data);
  document.querySelector("#clientAppEnabled").checked=Boolean(data.appAccessEnabled);
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
  populateClientPeople(data);
  populateCommercialRegistry(data.commercialRegistry||{});
  syncClientPortalAccessBlock(data);
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
  const grid=document.querySelector("#managementGrid");if(!grid)return;
  try{
    const root=await getSavedHandle("clients-folder");
    if(!root||await root.queryPermission({mode:"read"})!=="granted"){
      grid.innerHTML='<div class="empty folder-empty"><h4>Carpeta de Clientes no autorizada</h4><p>Entra primero en Clientes y autoriza su carpeta.</p></div>';return;
    }
    const metadata=await getAllClientMetadata(),metadataMap=new Map(metadata.map(client=>[clientIdentity(client),client]));
    const clients=[];
    for await(const entry of root.values()){
      if(entry.kind!=="directory")continue;
      const record=metadataMap.get(entry.name),active=clientIsActive(record);
      if((managementClientView==="active"&&active)||(managementClientView==="historical"&&!active))clients.push({name:entry.name,active});
    }
    clients.sort((a,b)=>a.name.localeCompare(b.name,"es",{sensitivity:"base"}));
    const historical=managementClientView==="historical";
    grid.innerHTML=clients.length?clients.map(client=>`<div class="folder-card management-client ${historical?"historical-client":""}" data-client="${escapeHtml(client.name.toLocaleLowerCase("es"))}" data-client-name="${escapeHtml(client.name)}" tabindex="0" role="button" aria-label="Abrir ficha de ${escapeHtml(client.name)}"><span class="folder-icon">${historical?"◷":"▰"}</span><span><strong>${escapeHtml(client.name)}</strong><small>${historical?"Cliente histórico · abrir ficha":"Ver ficha del cliente"}</small></span><span class="client-card-arrow" aria-hidden="true">›</span></div>`).join(""):`<div class="empty folder-empty"><h4>${historical?"No hay clientes históricos":"No hay clientes activos"}</h4></div>`;
    document.querySelector("#managementClientHeading").textContent=historical?"Clientes históricos":"Clientes activos";
    document.querySelector("#managementCount").textContent=`${clients.length} ${clients.length===1?"cliente":"clientes"}`;
    grid.querySelectorAll(".management-client").forEach(card=>{
      const open=()=>{grid.querySelector(".management-client.selected")?.classList.remove("selected");card.classList.add("selected");openClientDetails(card.dataset.clientName)};
      card.addEventListener("click",open);
      card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open()}});
    });
  }catch{grid.innerHTML='<div class="empty folder-empty"><h4>No se pudieron cargar los clientes</h4></div>'}
}
function setManagementClientView(view){
  managementClientView=view==="historical"?"historical":"active";
  document.querySelectorAll("[data-client-section]").forEach(button=>button.setAttribute("aria-selected",String(button.dataset.clientSection===managementClientView)));
  const search=document.querySelector("#managementSearch");if(search)search.value="";
  loadManagementClients();
}
function filterManagementClients(e){const q=e.target.value.trim().toLocaleLowerCase("es");const cards=[...document.querySelectorAll(".management-client")];let v=0;cards.forEach(c=>{const s=c.dataset.client.includes(q);c.hidden=!s;if(s)v++});document.querySelector("#managementCount").textContent=q?`${v} resultados`:`${cards.length} clientes`}
async function createClient(e){
  e.preventDefault();const input=document.querySelector("#clientName"),message=document.querySelector("#formMessage"),button=document.querySelector("#saveClientButton");const entered=input.value.trim(),name=entered.replace(/[. ]+$/,"");if(!name)return;if(/[\\/:*?"<>|]/.test(name)){message.className="form-message error";message.textContent="El nombre contiene caracteres que Windows no permite.";return}button.disabled=true;button.textContent="Guardando…";
  try{let root=await getSavedHandle("clients-folder");if(root&&await root.requestPermission({mode:"readwrite"})!=="granted")root=null;if(!root){root=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("clients-folder",root)}
  let existed=true;try{await root.getDirectoryHandle(name)}catch{existed=false}const client=await root.getDirectoryHandle(name,{create:true}),folders={};for(const f of defaultClientFolders)folders[f]=await client.getDirectoryHandle(f,{create:true});const accountingYear=await folders["CONTABILIDAD"].getDirectoryHandle(String(new Date().getFullYear()),{create:true});for(const subfolder of ["1T","2T","3T","4T","BANCOS"])await accountingYear.getDirectoryHandle(subfolder,{create:true});
  const existingClientData=(await getAllClientMetadata()).find(item=>item.id===name)||{},personType=document.querySelector("#clientPersonType").value,certificate=document.querySelector("#registryCertificate");let registryCertificateName=existingClientData.commercialRegistry?.certificateName||"";
  if(personType==="juridica"&&certificate.files.length){const registryFolder=await folders["OTRA DOCUMENTACIÓN"].getDirectoryHandle("REGISTRO MERCANTIL",{create:true});await copyFileList(certificate.files,registryFolder);registryCertificateName=certificate.files[0].name}
  const sig=document.querySelector("#clientSignature");let signatureLink=null;if(sig.files.length){let signaturesRoot=await getSavedHandle("signatures-folder");if(signaturesRoot&&await signaturesRoot.requestPermission({mode:"readwrite"})!=="granted")signaturesRoot=null;if(!signaturesRoot){signaturesRoot=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("signatures-folder",signaturesRoot)}const file=sig.files[0],savedName=`${name} - ${file.name}`;await copyNamedFile(file,signaturesRoot,savedName);signatureLink={id:savedName,client:name,document:savedName,password:document.querySelector("#signaturePassword").value,expiry:document.querySelector("#signatureExpiry").value}}else if(e.target.dataset.existingSignature){const existingName=e.target.dataset.existingSignature;signatureLink={id:existingName,client:name,document:existingName,password:document.querySelector("#signaturePassword").value,expiry:document.querySelector("#signatureExpiry").value}}if(signatureLink){const allSignatures=await getAllSignatureMetadata(),conflict=allSignatures.find(item=>(item.id===signatureLink.id||item.document===signatureLink.document)&&item.client&&item.client!==name);if(conflict){const error=new Error("La firma seleccionada ya está vinculada a otra empresa.");error.userMessage=`Esta firma ya está vinculada a ${conflict.client}. Cada firma solo puede pertenecer a una empresa.`;throw error}for(const item of allSignatures)if(item.client===name&&item.id!==signatureLink.id)await saveSignatureMetadata({...item,client:""});await saveSignatureMetadata(signatureLink)}
  const obligations={};document.querySelectorAll("[data-tax-model]:checked").forEach(check=>{obligations[check.dataset.taxModel]=true});await saveClientMetadata({...existingClientData,...collectClientPeople(),id:name,name,cif:document.querySelector("#clientCif").value.trim().toUpperCase(),personType,commercialRegistry:personType==="juridica"?collectCommercialRegistryData(registryCertificateName):null,administrators:document.querySelector("#clientAdministrators").value.trim(),phones:document.querySelector("#clientPhones").value.trim(),emails:document.querySelector("#clientEmails").value.trim(),representative:document.querySelector("#clientRepresentative").value.trim(),representativeNif:document.querySelector("#clientRepresentativeNif").value.trim().toUpperCase(),periodicity:document.querySelector("#fiscalPeriodicity").value,active:document.querySelector("#clientActive").checked,appAccessEnabled:document.querySelector("#clientAppEnabled").checked,obligations,courtesyDaysRequired:document.querySelector("#courtesyDaysRequired").checked,financialReportingFramework:document.querySelector("#financialReportingFramework").value.trim()});
  message.className="form-message success";message.textContent=existed?"Cliente actualizado correctamente.":`Cliente “${name}” creado correctamente.`;e.target.reset();markClientFormClean();await loadManagementClients();setTimeout(closeClientModal,850)}
  catch(error){if(error.name!=="AbortError"){message.className="form-message error";message.textContent=error.userMessage||"No se pudo guardar el cliente. Comprueba el permiso de escritura."}}finally{button.disabled=false;button.textContent="Guardar"}
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
  main.innerHTML=`<header><button class="menu" id="menu">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Firmas digitales</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header><section class="signatures-panel"><div class="table-heading"><div><p class="eyebrow">CERTIFICADOS</p><h2>Firmas digitales de clientes</h2></div><div class="signature-actions"><button class="upload-button" id="connectSignatures">Conectar carpeta Firmas digitales</button><label class="client-search"><span>⌕</span><input id="signatureSearch" type="search" placeholder="Buscar cliente…"></label></div></div><div class="signature-table-wrap"><table class="signature-table"><thead><tr><th>Cliente</th><th>Documento</th><th>Estado</th><th>Contraseña</th><th>Caducidad</th><th>Representante</th><th>NIF representante</th></tr></thead><tbody id="signatureRows"><tr><td colspan="7" class="table-empty">Cargando firmas…</td></tr></tbody></table></div></section>`;bindHeader();document.querySelector("#signatureSearch").addEventListener("input",filterSignatureRows);document.querySelector("#connectSignatures").addEventListener("click",connectSignaturesFolder);loadSignatures()
}
async function connectSignaturesFolder(){try{const saved=await getSavedHandle("signatures-folder");if(saved?.remote){await loadSignatures();return}const root=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("signatures-folder",root);await loadSignatures()}catch(error){if(error.name!=="AbortError")alert("No se pudo conectar la carpeta de firmas digitales.")}}
async function loadSignatures(){
 const body=document.querySelector("#signatureRows");try{const root=await getSavedHandle("signatures-folder");if(!root||await root.queryPermission({mode:"read"})!=="granted"){body.innerHTML='<tr><td colspan="7" class="table-empty">Conecta la carpeta Gestión → Firmas digitales.</td></tr>';return}const connect=document.querySelector("#connectSignatures");if(root.remote&&connect){connect.textContent="● Servidor conectado";connect.classList.add("is-connected");connect.disabled=true}const metadata=await getAllSignatureMetadata(),map=new Map(metadata.map(x=>[x.id,x])),clientMetadata=await getAllClientMetadata(),clientMap=new Map(clientMetadata.map(x=>[x.id,x])),inactiveClients=new Set(clientMetadata.filter(client=>!clientIsActive(client)).map(clientIdentity)),rows=[];
 for await(const doc of root.values()){if(doc.kind!=="file")continue;const m=map.get(doc.name)||{},clientName=m.client||"Sin asignar";if(inactiveClients.has(clientName))continue;const client=clientMap.get(clientName)||{};rows.push({client:clientName,document:doc.name,handle:doc,password:m.password||"",expiry:m.expiry||"",representative:client.representative||"",representativeNif:client.representativeNif||""})}
 rows.sort((a,b)=>{if(!a.expiry&&!b.expiry)return a.client.localeCompare(b.client,"es");if(!a.expiry)return 1;if(!b.expiry)return-1;return a.expiry.localeCompare(b.expiry)||a.client.localeCompare(b.client,"es")});
 window.signatureFiles=rows;body.innerHTML=rows.length?rows.map((r,i)=>{const status=signatureExpiryStatus(r.expiry),previewId=registerPreviewDocument(r);return `<tr data-search="${escapeHtml((r.client+" "+r.document+" "+status.label+" "+r.representative+" "+r.representativeNif).toLocaleLowerCase("es"))}"><td><strong title="${escapeHtml(r.client)}">${escapeHtml(r.client)}</strong></td><td><button class="document-link" data-preview-document="${previewId}" title="Vista preliminar de ${escapeHtml(r.document)}">▱ ${escapeHtml(r.document)}</button></td><td><span class="signature-status ${status.className}">${status.label}</span></td><td><button class="password-cell" data-password="${escapeHtml(r.password)}">${r.password?"••••••••":"—"}</button></td><td><span class="expiry ${expiryClass(r.expiry)}">${formatDate(r.expiry)}</span></td><td title="${escapeHtml(r.representative||"")}">${escapeHtml(r.representative||"—")}</td><td>${escapeHtml(r.representativeNif||"—")}</td></tr>`}).join(""):'<tr><td colspan="7" class="table-empty">Todavía no hay firmas digitales.</td></tr>';
 body.querySelectorAll("[data-password]").forEach(x=>x.addEventListener("click",()=>{x.textContent=x.textContent.includes("•")?(x.dataset.password||"—"):"••••••••"}))}catch{body.innerHTML='<tr><td colspan="7" class="table-empty">No se pudieron cargar las firmas.</td></tr>'}
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
    const clients=(await getAllClientMetadata()).filter(clientIsActive),rows=[];
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
const COURTESY_FIRST_YEAR=2026;
let courtesySelectedYear=COURTESY_FIRST_YEAR;
const courtesyUnlockedYears=new Set();

function courtesyYears(){
  const currentYear=new Date().getFullYear();
  return Array.from({length:Math.max(1,currentYear-COURTESY_FIRST_YEAR+1)},(_,index)=>COURTESY_FIRST_YEAR+index);
}
function courtesyStorageKey(client,year=courtesySelectedYear){return `app-am-courtesy-${year}-${client}`}
function legacyCourtesyStorageKey(client){return "app-am-courtesy-"+client}
function getCourtesyData(client,year=courtesySelectedYear){
  try{
    const current=localStorage.getItem(courtesyStorageKey(client,year));
    if(current)return JSON.parse(current);
    if(year===COURTESY_FIRST_YEAR){
      const legacy=localStorage.getItem(legacyCourtesyStorageKey(client));
      if(legacy){
        const migrated=JSON.parse(legacy);
        localStorage.setItem(courtesyStorageKey(client,year),JSON.stringify(migrated));
        return migrated;
      }
    }
    return{};
  }catch{return{}}
}
function saveCourtesyData(client,data,year=courtesySelectedYear){localStorage.setItem(courtesyStorageKey(client,year),JSON.stringify(data))}
function courtesyClientKey(name){return normalizeFiscalClient(name).toLocaleLowerCase("es")}
function courtesyExerciseState(year=courtesySelectedYear){
  const now=new Date(),opens=new Date(year,5,15),closes=new Date(year,7,1);
  const unlocked=courtesyUnlockedYears.has(year);
  if(unlocked)return{editable:true,unlocked:true,label:"Ejercicio desbloqueado",detail:"Edición temporal habilitada con contraseña."};
  if(now<opens)return{editable:false,label:"Ejercicio bloqueado",detail:`Se abrirá el 15 de junio de ${year}.`};
  if(now>=closes)return{editable:false,label:"Ejercicio cerrado",detail:`Bloqueado desde el 1 de agosto de ${year}.`};
  return{editable:true,label:"Periodo abierto",detail:`Editable hasta el 31 de julio de ${year}.`};
}
function courtesyYearOptions(){
  return courtesyYears().map(year=>`<option value="${year}"${year===courtesySelectedYear?" selected":""}>${year}</option>`).join("");
}
async function renderCourtesyDays(){
  courtesySelectedYear=COURTESY_FIRST_YEAR;
  const state=courtesyExerciseState();
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Días de cortesía</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="courtesy-panel">
      <div class="table-heading courtesy-heading">
        <div><p class="eyebrow">NOTIFICACIONES ELECTRÓNICAS</p><h2>Control de días de cortesía</h2><p>Clientes incluidos desde su ficha interna.</p></div>
        <div class="courtesy-heading-actions">
          <label class="courtesy-year-filter"><span>Ejercicio</span><select id="courtesyYear">${courtesyYearOptions()}</select></label>
          <button class="upload-button courtesy-server-button" id="connectCourtesyFolder">Conectar servidor</button>
        </div>
      </div>
      <div class="courtesy-exercise-status ${state.editable?"is-open":"is-locked"}" id="courtesyExerciseStatus"></div>
      <div class="courtesy-table-wrap"><table class="courtesy-table"><thead><tr><th>Cliente</th><th>CIF</th><th>Firma</th><th>Fecha presentación</th><th>Periodo solicitado</th><th>Documento</th></tr></thead><tbody id="courtesyRows"><tr><td colspan="6" class="table-empty">Cargando clientes…</td></tr></tbody></table></div>
    </section>`;
  bindHeader();
  document.querySelector("#connectCourtesyFolder").addEventListener("click",connectCourtesyFolder);
  document.querySelector("#courtesyYear").addEventListener("change",async event=>{courtesySelectedYear=Number(event.target.value)||COURTESY_FIRST_YEAR;await loadCourtesyDays()});
  await loadCourtesyDays();
}
function renderCourtesyExerciseStatus(){
  const box=document.querySelector("#courtesyExerciseStatus");if(!box)return;
  const state=courtesyExerciseState();
  box.className=`courtesy-exercise-status ${state.editable?"is-open":"is-locked"}`;
  box.innerHTML=`<div><span aria-hidden="true">${state.editable?"✓":"◆"}</span><p><strong>${state.label} · ${courtesySelectedYear}</strong><small>${state.detail}</small></p></div>${state.editable?"":'<button type="button" id="unlockCourtesyYear">Desbloquear</button>'}`;
  document.querySelector("#unlockCourtesyYear")?.addEventListener("click",unlockCourtesyYear);
}
function unlockCourtesyYear(){
  openPasswordDialog({
    id:"courtesyUnlockDialog",
    eyebrow:"CONTROL PROTEGIDO",
    title:`Desbloquear ejercicio ${courtesySelectedYear}`,
    copy:"Introduce la contraseña de protección para habilitar temporalmente la edición.",
    icon:"◈",
    onSuccess:async()=>{courtesyUnlockedYears.add(courtesySelectedYear);await loadCourtesyDays()}
  });
}
async function connectCourtesyFolder(){
  try{
    let root=await getSavedHandle("courtesy-folder");
    if(root){
      const permission=await root.requestPermission({mode:"readwrite"});
      if(permission==="granted"){await loadCourtesyDays();return}
    }
    root=await window.showDirectoryPicker({mode:"readwrite"});
    await saveHandle("courtesy-folder",root);
    await loadCourtesyDays();
  }catch(error){if(error?.name!=="AbortError")alert("No se pudo autorizar la carpeta de días de cortesía.")}
}
async function courtesyFileUrl(handle){
  const file=await handle.getFile(),url=URL.createObjectURL(file);courtesyObjectUrls.push(url);return{url,name:file.name,file,handle};
}
async function loadCourtesyDays(){
  const body=document.querySelector("#courtesyRows"),connect=document.querySelector("#connectCourtesyFolder");
  if(!body||!connect)return;
  const selectedYear=courtesySelectedYear,state=courtesyExerciseState(selectedYear);
  courtesyObjectUrls.forEach(url=>URL.revokeObjectURL(url));courtesyObjectUrls=[];
  renderCourtesyExerciseStatus();
  try{
    const clients=(await getAllClientMetadata()).filter(client=>clientIsActive(client)&&client.courtesyDaysRequired).sort((a,b)=>a.name.localeCompare(b.name,"es"));
    let courtesyRoot=null,signatureRoot=null,courtesyHandleSaved=false;
    try{
      const savedCourtesyRoot=await getSavedHandle("courtesy-folder");
      courtesyHandleSaved=Boolean(savedCourtesyRoot);
      if(savedCourtesyRoot&&await savedCourtesyRoot.queryPermission({mode:"read"})==="granted")courtesyRoot=savedCourtesyRoot;
    }catch{}
    try{signatureRoot=await getSavedHandle("signatures-folder");if(signatureRoot&&await signatureRoot.queryPermission({mode:"read"})!=="granted")signatureRoot=null}catch{}
    connect.textContent=courtesyRoot?"● Servidor conectado":courtesyHandleSaved?"Autorizar servidor":"Conectar servidor";
    connect.classList.toggle("is-connected",Boolean(courtesyRoot));
    connect.classList.toggle("is-saved",courtesyHandleSaved&&!courtesyRoot);
    const signatures=await getAllSignatureMetadata(),signatureMap=new Map(signatures.map(item=>[courtesyClientKey(item.client),item]));
    const rows=[];
    for(const client of clients){
      const data=getCourtesyData(client.name,selectedYear),signatureMeta=signatureMap.get(courtesyClientKey(client.name));
      let signature=null,documentFile=null;
      if(signatureRoot&&signatureMeta?.document){try{signature=await courtesyFileUrl(await signatureRoot.getFileHandle(signatureMeta.document))}catch{}}
      if(courtesyRoot&&data.document){try{documentFile=await courtesyFileUrl(await courtesyRoot.getFileHandle(data.document))}catch{}}
      rows.push({client,data,signature,documentFile,year:selectedYear});
    }
    window.courtesyRows=rows;
    const disabled=state.editable?"":" disabled";
    body.innerHTML=rows.length?rows.map((row,index)=>`<tr data-courtesy-client="${escapeHtml(row.client.name)}"><td><strong title="${escapeHtml(row.client.name)}">${escapeHtml(row.client.name)}</strong></td><td>${escapeHtml(row.client.cif||"—")}</td><td>${row.signature?`<button type="button" class="courtesy-file-link" data-preview-document="${registerPreviewDocument(row.signature)}">Firma disponible ▱</button>`:'<span class="courtesy-missing">No disponible</span>'}</td><td><input type="date" data-courtesy-field="submitted" value="${escapeHtml(row.data.submitted||"")}"${disabled}></td><td><input type="text" data-courtesy-field="period" value="${escapeHtml(row.data.period||"")}" placeholder="Ej. del 5 al 12 de agosto"${disabled}></td><td>${row.documentFile?`<div class="courtesy-document-actions"><button type="button" class="courtesy-file-link" data-preview-document="${registerPreviewDocument(row.documentFile)}">Vista preliminar</button></div>`:'<span class="courtesy-missing">Sin documento</span>'}${state.editable?`<label class="courtesy-upload"><span>${row.documentFile?"Sustituir":"Adjuntar"}</span><input type="file" accept=".pdf" data-courtesy-upload="${index}"></label>`:""}</td></tr>`).join(""):'<tr><td colspan="6" class="table-empty">No hay clientes marcados con la obligación de días de cortesía.</td></tr>';
    body.querySelectorAll("[data-courtesy-field]").forEach(input=>input.addEventListener("change",saveCourtesyRow));
    body.querySelectorAll("[data-courtesy-upload]").forEach(input=>input.addEventListener("change",event=>uploadCourtesyDocument(Number(event.target.dataset.courtesyUpload),event.target.files[0])));
  }catch{body.innerHTML='<tr><td colspan="6" class="table-empty">No se pudo cargar el control de días de cortesía.</td></tr>'}
}
function saveCourtesyRow(event){
  if(!courtesyExerciseState().editable){event.target.value=getCourtesyData(event.target.closest("tr").dataset.courtesyClient)[event.target.dataset.courtesyField]||"";return}
  const row=event.target.closest("tr"),client=row.dataset.courtesyClient,data=getCourtesyData(client);
  row.querySelectorAll("[data-courtesy-field]").forEach(field=>data[field.dataset.courtesyField]=field.value);
  saveCourtesyData(client,data);
}
async function uploadCourtesyDocument(index,file){
  if(!file||!courtesyExerciseState().editable)return;
  const row=window.courtesyRows[index],client=row.client.name,year=row.year;
  try{
    let root=await getSavedHandle("courtesy-folder");
    if(root&&await root.requestPermission({mode:"readwrite"})!=="granted")root=null;
    if(!root){root=await window.showDirectoryPicker({mode:"readwrite"});await saveHandle("courtesy-folder",root)}
    const savedName=`${year} - ${client} - ${file.name}`;
    await copyNamedFile(file,root,savedName);
    const data=getCourtesyData(client,year);data.document=savedName;saveCourtesyData(client,data,year);
    await loadCourtesyDays();
  }catch(error){if(error?.name!=="AbortError")alert("No se pudo guardar el documento. Comprueba el permiso de escritura.")}
}


const workers=["Manuel Molinero","Álvaro Molinero","Francisco Molinero","Araceli Frías","Jesús Carratalá"];


const TASKS_STORAGE_KEY="app-am-tasks";
const CUSTOM_WORKS_STORAGE_KEY="app-am-custom-works";
let taskScope="mine";
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
function workerByNameOrId(value){const key=String(value||"").trim().toLocaleLowerCase("es");return teamUsers.find(user=>user.id===key||user.name.toLocaleLowerCase("es")===key)||null}
function normalizeTaskOwners(tasks){return tasks.map(task=>{const owner=workerByNameOrId(task.assignedId||task.assigned);return owner?{...task,assignedId:owner.id,assigned:owner.name}:task})}
function personalTasks(tasks=getTasks()){return signedInUser?tasks.filter(task=>task.assignedId===signedInUser.id||task.assigned===signedInUser.name):tasks}
function boardTasks(){const tasks=getTasks();return signedInUser?.role==="admin"&&taskScope==="all"?tasks:personalTasks(tasks)}
async function loadSharedTasks(){
  if(!signedInUser)return;
  try{
    const remote=normalizeTaskOwners(await apiJson("/api/tasks")),local=normalizeTaskOwners(getTasks());
    const merged=new Map(remote.map(task=>[task.id,task]));
    const unsaved=[];for(const task of local)if(!merged.has(task.id)){const record={...task,creatorId:task.creatorId||signedInUser.id};merged.set(task.id,record);unsaved.push(record)}
    const tasks=[...merged.values()];localStorage.setItem(TASKS_STORAGE_KEY,JSON.stringify(tasks));
    await Promise.allSettled(unsaved.map(task=>apiJson(`/api/tasks/${encodeURIComponent(task.id)}`,{method:"PUT",body:JSON.stringify(task)})));
    updateTaskNavAlert();renderHomeActivityRail();if(document.querySelector(".task-board"))renderTaskBoard();
  }catch{}
}
function saveTasks(tasks){
  const previous=normalizeTaskOwners(getTasks()),normalized=normalizeTaskOwners(tasks),nextIds=new Set(normalized.map(task=>task.id));
  localStorage.setItem(TASKS_STORAGE_KEY,JSON.stringify(normalized));updateTaskNavAlert();renderHomeActivityRail();
  if(!signedInUser)return;
  const oldById=new Map(previous.map(task=>[task.id,task]));
  const changed=normalized.filter(task=>JSON.stringify(oldById.get(task.id)||null)!==JSON.stringify(task));
  const removed=previous.filter(task=>!nextIds.has(task.id));
  Promise.allSettled([...changed.map(task=>apiJson(`/api/tasks/${encodeURIComponent(task.id)}`,{method:"PUT",body:JSON.stringify(task)})),...removed.map(task=>apiJson(`/api/tasks/${encodeURIComponent(task.id)}`,{method:"DELETE"}))]).catch(()=>{});
}
function getCustomWorks(){
  try{const value=JSON.parse(localStorage.getItem(CUSTOM_WORKS_STORAGE_KEY)||"[]");return Array.isArray(value)?value:[]}
  catch{return[]}
}
function saveCustomWorks(items){localStorage.setItem(CUSTOM_WORKS_STORAGE_KEY,JSON.stringify(items))}
function allWorkProcedures(){
  const catalog=(workCatalog?.areas||[]).flatMap(area=>area.procedures.map(item=>({...item,areaTitle:area.title})));
  return [...getCustomWorks().map(item=>({...item,areaTitle:"Trabajos personalizados",custom:true})),...catalog];
}
function taskChecklistProgress(task){
  const steps=Array.isArray(task.checklist)?task.checklist:[],done=steps.filter(step=>step.done).length;
  return{steps,done,total:steps.length,percent:steps.length?Math.round(done/steps.length*100):0};
}
async function homeClientCount(){
  try{
    const inactiveNames=new Set((await getAllClientMetadata()).filter(client=>!clientIsActive(client)).map(clientIdentity));
    const root=await getSavedHandle("clients-folder");
    if(root&&await root.queryPermission({mode:"read"})==="granted"){
      let count=0;for await(const entry of root.values())if(entry.kind==="directory"&&!inactiveNames.has(entry.name))count++;
      return count;
    }
  }catch{}
  try{return(await getAllClientMetadata()).filter(clientIsActive).length}catch{return 0}
}
async function homeContactCount(){
  try{return(await getAllClientMetadata()).filter(clientIsActive).reduce((total,client)=>total+contactLines(client.phones).length,0)}catch{return 0}
}
let homeNewsArticles=[];
let activeHomeNewsTopic="Todas";
const homeNewsFallbackImages={AEAT:"https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=75",IVA:"https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=75",IRPF:"https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=75","Contabilidad e ICAC":"https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=75","Normativa fiscal":"https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=900&q=75"};
function homeNewsMarkup(article){
  const date=article.date?new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"short"}).format(new Date(article.date)):"Hoy";
  const isGooglePlaceholder=/(?:news\.google|googleusercontent|gstatic|google\.com)/i.test(article.image||"");
  const image=!isGooglePlaceholder&&article.image?article.image:homeNewsFallbackImages[article.topic]||homeNewsFallbackImages["Normativa fiscal"];
  const mailto=`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(`${article.title}\n\n${article.link}`)}`;
  return `<article class="news-card"><a class="news-card-image" href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(image)}" alt="" loading="lazy"></a><div class="news-card-body"><div class="news-card-meta"><span>${escapeHtml(article.source||"Actualidad")}</span><time>${escapeHtml(date)}</time></div><h4>${escapeHtml(article.title)}</h4><p>${escapeHtml(article.topic||"Fiscal y contable")}</p><div class="news-card-actions"><a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">Leer noticia <span>↗</span></a><a href="${escapeHtml(mailto)}" class="news-email-share" title="Compartir por correo">✉ Correo</a></div></div></article>`;
}
function renderFilteredHomeNews(){
  const container=document.querySelector("#homeNews");if(!container)return;
  const articles=activeHomeNewsTopic==="Todas"?homeNewsArticles:homeNewsArticles.filter(article=>article.topic===activeHomeNewsTopic);
  container.innerHTML=articles.length?articles.map(homeNewsMarkup).join(""):'<div class="news-empty"><strong>No hay noticias en esta categoría</strong><p>Prueba con otro filtro.</p></div>';
}
async function loadHomeNews(force=false){
  const container=document.querySelector("#homeNews"),button=document.querySelector("#refreshHomeNews");if(!container)return;
  if(button){button.disabled=true;button.classList.add("loading")}
  container.innerHTML='<div class="news-loading"><span></span><strong>Buscando las últimas noticias…</strong></div>';
  try{
    const response=await fetch(`/api/news${force?"?refresh=1":""}`);if(!response.ok)throw new Error();
    homeNewsArticles=await response.json();renderFilteredHomeNews();
  }catch{container.innerHTML='<div class="news-empty"><strong>No se pudieron cargar las noticias</strong><p>Comprueba la conexión y pulsa Actualizar.</p></div>'}
  finally{if(button){button.disabled=false;button.classList.remove("loading")}}
}
function homeActivityEmpty(icon,title,text){
  return `<div class="home-activity-empty"><span aria-hidden="true">${icon}</span><strong>${title}</strong><small>${text}</small></div>`;
}
function homeTaskTitle(task){
  return task.concept==="Otro"?(task.customConcept||"Tarea sin concepto"):(task.concept||task.customConcept||"Tarea sin concepto");
}
function homeActivityDate(value,withWeekday=false){
  if(!value)return "Sin fecha límite";
  const date=new Date(`${value}T12:00:00`);
  if(Number.isNaN(date.getTime()))return value;
  return new Intl.DateTimeFormat("es-ES",withWeekday?{weekday:"short",day:"2-digit",month:"short"}:{day:"2-digit",month:"short"}).format(date);}
function renderHomeActivityRail(){  const messagesBox=document.querySelector("#homeMessagesPreview"),tasksBox=document.querySelector("#homeTasksPreview"),remindersBox=document.querySelector("#homeRemindersPreview");
  if(!messagesBox||!tasksBox||!remindersBox)return;
  const latestMessages=recentChatItems.slice(0,3).map(item=>({worker:item.worker,...item.message,time:chatMessageTime(item.message.createdAt)}));
  messagesBox.innerHTML=latestMessages.length?latestMessages.map(message=>`<button type="button" class="home-activity-row home-message-row" data-home-open-chat="${escapeHtml(message.worker)}"><span class="home-activity-avatar">${workerInitials(message.worker)}</span><span class="home-activity-copy"><strong>${escapeHtml(message.worker)}</strong><small>${escapeHtml(message.text)}</small></span><time>${escapeHtml(message.time||"")}</time></button>`).join(""):homeActivityEmpty("✉","Sin mensajes recientes","Las conversaciones del equipo aparecerán aquí.");

  const pendingTasks=personalTasks().filter(task=>task.status!=="done").sort((a,b)=>(a.finalDate||"9999-12-31").localeCompare(b.finalDate||"9999-12-31")).slice(0,4);
  tasksBox.innerHTML=pendingTasks.length?pendingTasks.map(task=>`<button type="button" class="home-activity-row home-task-row" data-home-route="Tareas"><span class="home-status-dot status-${escapeHtml(task.status||"pending")}"></span><span class="home-activity-copy"><strong>${escapeHtml(homeTaskTitle(task))}</strong><small>${escapeHtml(task.client||task.assigned||"Tarea del despacho")}</small></span><time>${escapeHtml(homeActivityDate(task.finalDate))}</time></button>`).join(""):homeActivityEmpty("✓","Todo al día","No hay tareas pendientes.");

  const today=localDateKey(new Date()),upcoming=getCalendarItems().filter(item=>item.date>=today).sort((a,b)=>`${a.date} ${a.time||"99:99"}`.localeCompare(`${b.date} ${b.time||"99:99"}`)).slice(0,4);
  remindersBox.innerHTML=upcoming.length?upcoming.map(item=>`<button type="button" class="home-activity-row home-reminder-row" data-home-route="Calendario"><span class="home-date-badge"><b>${escapeHtml(homeActivityDate(item.date).split(" ")[0])}</b><small>${escapeHtml(homeActivityDate(item.date).split(" ").slice(1).join(" "))}</small></span><span class="home-activity-copy"><strong>${escapeHtml(item.title||"Recordatorio")}</strong><small>${escapeHtml(item.time?`${item.time} · ${item.assigned||"Agenda"}`:(item.assigned||"Todo el día"))}</small></span></button>`).join(""):homeActivityEmpty("⌁","Sin recordatorios próximos","Añade avisos desde el calendario.");

  document.querySelectorAll("[data-home-summary], [data-home-route]").forEach(button=>button.addEventListener("click",()=>{
    const destination=button.dataset.homeSummary||button.dataset.homeRoute;
    if(destination==="messages"){document.querySelector("#chatLauncher")?.click();return}
    const title=destination==="tasks"?"Tareas":destination==="calendar"?"Calendario":destination;
    document.querySelector(`nav button[data-title="${title}"]`)?.click();
  }));
  document.querySelectorAll(".metrics [data-home-route]").forEach(card=>card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();card.click()}}));
  document.querySelectorAll("[data-home-open-chat]").forEach(button=>button.addEventListener("click",()=>{document.querySelector("#chatLauncher")?.click();setTimeout(()=>renderConversation(button.dataset.homeOpenChat),0)}));
}
async function initHome(){
  const clients=document.querySelector("#homeClientsCount");if(!clients)return;
  const contacts=document.querySelector("#homeContactsCount"),tasks=document.querySelector("#homeTasksCount"),workersCount=document.querySelector("#homeWorkersCount");
  const [clientCount,contactCount]=await Promise.all([homeClientCount(),homeContactCount()]);
  if(!document.querySelector("#homeClientsCount"))return;
  clients.textContent=String(clientCount);contacts.textContent=String(contactCount);
  tasks.textContent=String(personalTasks().filter(task=>task.status!=="done").length);workersCount.textContent=String(workers.length);
  renderHomeActivityRail();
  document.querySelector("#homeBilling")?.addEventListener("click",openBillingModal);
  document.querySelector("#homeNewTask")?.addEventListener("click",()=>{document.querySelector('nav button[data-title="Tareas"]')?.click();setTimeout(()=>document.querySelector("#openTaskModal")?.click(),0)});
  document.querySelector("#refreshHomeNews")?.addEventListener("click",()=>loadHomeNews(true));
  document.querySelectorAll("[data-news-topic]").forEach(button=>button.addEventListener("click",()=>{activeHomeNewsTopic=button.dataset.newsTopic;document.querySelector("[data-news-topic].active")?.classList.remove("active");button.classList.add("active");renderFilteredHomeNews()}));
  loadHomeNews();
}
function updateTaskNavAlert(){
  const button=document.querySelector('nav button[data-title="Tareas"]');if(!button)return;
  const count=personalTasks().filter(task=>task.status!=="done").length;
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
  const names=new Set(),inactiveNames=new Set();
  try{
    (await getAllClientMetadata()).forEach(client=>{
      const name=client?.name||client?.id;
      if(!name)return;
      if(clientIsActive(client))names.add(name);else inactiveNames.add(name);
    });
  }catch{}
  try{
    const root=await getSavedHandle("clients-folder");
    if(root&&await root.queryPermission({mode:"read"})==="granted"){
      for await(const entry of root.values())if(entry.kind==="directory"&&!inactiveNames.has(entry.name))names.add(entry.name);
    }
  }catch{}
  return [...names].sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));
}
function taskCardMarkup(task){
  const countdown=taskCountdown(task.finalDate);
  const concept=task.workTitle||task.customConcept||task.concept||"Sin concepto",progress=taskChecklistProgress(task);
  return `<article class="task-note" draggable="true" data-task-id="${escapeHtml(task.id)}">
    <div class="task-note-top"><div class="task-heading-badges"><span class="task-concept">${escapeHtml(concept||"Sin concepto")}</span>${taskStatusMarkup(task.status)}</div><div><button type="button" class="task-edit-button" data-edit-task="${escapeHtml(task.id)}" aria-label="Editar tarea" title="Editar tarea">✎</button><span class="task-grip" aria-hidden="true">⠿</span></div></div>
    <h4>${escapeHtml(task.client||"Sin cliente")}</h4>
    <div class="task-deadline"><span>Plazo: ${taskDateLabel(task.finalDate)}</span><strong class="${countdown.className}">${countdown.label}</strong></div>
    ${task.description?`<p>${escapeHtml(task.description)}</p>`:""}
    ${progress.total?`<section class="task-checklist"><div class="task-progress-head"><strong>Proceso</strong><span>${progress.done}/${progress.total} · ${progress.percent}%</span></div><div class="task-progress-track"><i style="width:${progress.percent}%"></i></div><div class="task-step-list">${progress.steps.map((step,index)=>`<label><input type="checkbox" data-task-step="${escapeHtml(task.id)}" data-step-index="${index}" ${step.done?"checked":""}><span>${escapeHtml(step.text)}</span></label>`).join("")}</div></section>`:""}
    <div class="task-assignee"><span>${escapeHtml(workerInitials(task.assigned||"—"))}</span><small>${escapeHtml(task.assigned||"Sin encargado")}</small></div>
    <label class="task-mobile-state">Estado<select data-task-state="${escapeHtml(task.id)}">${taskStatuses.map(status=>`<option value="${status.id}" ${status.id===task.status?"selected":""}>${status.label}</option>`).join("")}</select></label>
  </article>`;
}
function renderTaskBoard(){
  const tasks=boardTasks();
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
  document.querySelectorAll("[data-task-step]").forEach(check=>check.addEventListener("change",event=>{
    event.stopPropagation();const tasks=getTasks(),task=tasks.find(item=>item.id===check.dataset.taskStep),step=task?.checklist?.[Number(check.dataset.stepIndex)];if(!step)return;
    step.done=check.checked;step.completedAt=check.checked?new Date().toISOString():"";step.completedBy=check.checked?(signedInUser?.name||""):"";
    const progress=taskChecklistProgress(task);task.status=progress.done===0?"pending":progress.done===progress.total?"done":"progress";
    saveTasks(tasks);renderTaskBoard();
  }));
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
      <div class="tasks-head-actions">${signedInUser?.role==="admin"?`<label>Mostrar<select id="taskScope"><option value="mine" ${taskScope==="mine"?"selected":""}>Mis tareas</option><option value="all" ${taskScope==="all"?"selected":""}>Todo el equipo</option></select></label>`:""}<button class="primary blue-button" id="openTaskModal">＋ Añadir tarea</button></div>
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
            <label class="task-work-field">Concepto<input id="taskConceptSearch" type="search" list="taskWorkOptions" maxlength="120" autocomplete="off" placeholder="Buscar trabajo o escribir un concepto…" required><datalist id="taskWorkOptions"></datalist><small>Selecciona un trabajo para cargar sus pasos o escribe un concepto personalizado.</small></label>
            <input id="taskWorkId" type="hidden"><input id="taskCustomConcept" type="hidden">
            <label>Plazo de inicio<input id="taskStartDate" type="date" readonly></label>
            <label>Plazo final<input id="taskFinalDate" type="date" required></label>
            <label class="task-description-field">Descripción<textarea id="taskDescription" rows="4" maxlength="600" placeholder="Información útil para orientar la tarea"></textarea></label>
            <section class="task-form-checklist" id="taskFormChecklist" hidden><div><strong>Pasos del trabajo</strong><span id="taskFormStepCount"></span></div><div id="taskFormStepList"></div><button type="button" id="addTaskStep">＋ Añadir paso particular</button></section>
          </div>
          <p class="form-message" id="taskFormMessage"></p>
          <div class="modal-actions"><button class="task-cancel-button" type="button" data-close-task><span aria-hidden="true">×</span> Cancelar</button><button class="primary blue-button" id="taskSaveButton" type="submit">Guardar tarea</button></div>
        </form>
      </section>
    </div>`;
  bindHeader();renderTaskBoard();loadSharedTasks();
  document.querySelector("#taskScope")?.addEventListener("change",event=>{taskScope=event.target.value;renderTaskBoard()});
  const modal=document.querySelector("#taskModal"),form=document.querySelector("#taskForm");
  let taskClientNames=[],taskFormSteps=[];
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
    await loadWorkCatalog();
    const procedures=allWorkProcedures(),options=document.querySelector("#taskWorkOptions");
    options.innerHTML=procedures.map(item=>`<option value="${escapeHtml(item.title)}">${escapeHtml(item.areaTitle||item.section||"")}</option>`).join("");
    document.querySelector("#taskConceptSearch").value=task?.workTitle||task?.customConcept||task?.concept||"";
    document.querySelector("#taskWorkId").value=task?.workId||"";
    taskFormSteps=Array.isArray(task?.checklist)?task.checklist.map(step=>({...step})):[];renderTaskFormSteps();
    document.querySelector("#taskFinalDate").value=task?.finalDate||"";
    document.querySelector("#taskDescription").value=task?.description||"";
    const linked=task?.sourceType==="annualCorrection";
    clientInput.readOnly=linked;
    document.querySelector("#taskConceptSearch").readOnly=linked;
    modal.classList.add("open");modal.setAttribute("aria-hidden","false");
    renderTaskClientResults("");
    setTimeout(()=>clientInput.focus(),180);
  };
  document.querySelector("#openTaskModal").addEventListener("click",()=>openTaskForm());
  taskEditHandler=id=>{const task=getTasks().find(item=>item.id===id);if(task)openTaskForm(task)};
  function renderTaskFormSteps(){
    const shell=document.querySelector("#taskFormChecklist"),list=document.querySelector("#taskFormStepList");shell.hidden=false;
    document.querySelector("#taskFormStepCount").textContent=taskFormSteps.length?`${taskFormSteps.filter(step=>step.done).length}/${taskFormSteps.length}`:"Sin pasos";
    list.innerHTML=taskFormSteps.length?taskFormSteps.map((step,index)=>`<div><input type="checkbox" data-form-step-check="${index}" ${step.done?"checked":""}><input type="text" data-form-step-text="${index}" value="${escapeHtml(step.text)}" maxlength="240"><button type="button" data-remove-form-step="${index}" aria-label="Eliminar paso">×</button></div>`).join(""):'<p class="task-no-steps">Selecciona un trabajo o añade pasos particulares.</p>';
    list.querySelectorAll("[data-form-step-check]").forEach(input=>input.addEventListener("change",()=>{taskFormSteps[Number(input.dataset.formStepCheck)].done=input.checked;renderTaskFormSteps()}));
    list.querySelectorAll("[data-form-step-text]").forEach(input=>input.addEventListener("input",()=>taskFormSteps[Number(input.dataset.formStepText)].text=input.value));
    list.querySelectorAll("[data-remove-form-step]").forEach(button=>button.addEventListener("click",()=>{taskFormSteps.splice(Number(button.dataset.removeFormStep),1);renderTaskFormSteps()}));
  }
  document.querySelector("#addTaskStep").addEventListener("click",()=>{taskFormSteps.push({id:`step-${Date.now()}`,text:"Nuevo paso",done:false});renderTaskFormSteps();document.querySelector("[data-form-step-text]:last-of-type")?.select()});
  document.querySelector("#taskConceptSearch").addEventListener("change",event=>{
    const title=event.target.value.trim(),work=allWorkProcedures().find(item=>item.title.localeCompare(title,"es",{sensitivity:"base"})===0);
    document.querySelector("#taskWorkId").value=work?.id||"";
    if(work)taskFormSteps=(work.steps||[]).map((text,index)=>({id:`${work.id}-${index}`,text,done:false,completedAt:"",completedBy:""}));
    else taskFormSteps=[];
    renderTaskFormSteps();
  });
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const conceptTitle=document.querySelector("#taskConceptSearch").value.trim(),selectedWork=allWorkProcedures().find(item=>item.title.localeCompare(conceptTitle,"es",{sensitivity:"base"})===0),workId=selectedWork?.id||"";
    const taskData={
      client:document.querySelector("#taskClient").value.trim(),
      assigned:document.querySelector("#taskAssigned").value,
      assignedId:workerByNameOrId(document.querySelector("#taskAssigned").value)?.id||"",
      concept:workId?"Trabajo":"Otro",
      workId,
      workTitle:conceptTitle,
      customConcept:workId?"":conceptTitle,
      checklist:taskFormSteps.filter(step=>step.text.trim()).map(step=>({...step,text:step.text.trim()})),
      description:document.querySelector("#taskDescription").value.trim(),
      finalDate:document.querySelector("#taskFinalDate").value,
    };
    const tasks=getTasks(),existing=tasks.find(item=>item.id===form.dataset.editTaskId);
    if(existing){Object.assign(existing,taskData);const progress=taskChecklistProgress(existing);if(progress.total)existing.status=progress.done===0?"pending":progress.done===progress.total?"done":"progress";syncTaskToAnnualCorrection(existing)}
    else{const created={id:`task-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,startDate:new Date().toISOString(),creatorId:signedInUser?.id||"",...taskData,status:"pending"},progress=taskChecklistProgress(created);if(progress.total&&progress.done)created.status=progress.done===progress.total?"done":"progress";tasks.push(created)}
    saveTasks(tasks);close();renderTaskBoard();
  });
}


const CALENDAR_STORAGE_KEY="app-am-calendar-reminders";
let calendarView=localStorage.getItem("app-am-calendar-view")==="week"?"week":"month";
let calendarAnchor=new Date();
function localDateKey(date){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
function calendarMonday(date){const value=new Date(date.getFullYear(),date.getMonth(),date.getDate()),offset=(value.getDay()+6)%7;value.setDate(value.getDate()-offset);return value}
function getCalendarItems(){try{const value=JSON.parse(localStorage.getItem(CALENDAR_STORAGE_KEY)||"[]");return Array.isArray(value)?value:[]}catch{return[]}}
function saveCalendarItems(items){localStorage.setItem(CALENDAR_STORAGE_KEY,JSON.stringify(items))}
function calendarItemsFor(date){const key=localDateKey(date);return getCalendarItems().filter(item=>item.date===key).sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99")||a.title.localeCompare(b.title,"es"))}
function calendarEventMarkup(item,compact=false){return`<button type="button" class="calendar-event type-${escapeHtml(item.type||"reminder")}" data-calendar-event="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}"><span>${item.time?escapeHtml(item.time):item.type==="notice"?"Aviso":"Todo el día"}</span><strong>${escapeHtml(item.title)}</strong>${!compact&&item.assigned?`<small>${escapeHtml(item.assigned)}</small>`:""}</button>`}
function calendarTaskDate(value){const key=String(value||"").slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(key)?key:""}
function calendarDateFromKey(key){return new Date(`${key}T12:00:00`)}
function calendarDayDistance(from,to){return Math.round((calendarDateFromKey(to)-calendarDateFromKey(from))/86400000)}
function calendarTasks(){
  return personalTasks().map(task=>{const start=calendarTaskDate(task.startDate)||calendarTaskDate(task.finalDate),requestedEnd=calendarTaskDate(task.finalDate)||start;return start?{...task,startKey:start,endKey:requestedEnd>=start?requestedEnd:start}:null}).filter(Boolean);
}
function calendarTaskSegments(visibleStart,weekCount){
  const startKey=localDateKey(visibleStart),segments=[],lanesByWeek=[];
  for(let week=0;week<weekCount;week++){
    const weekStart=new Date(visibleStart);weekStart.setDate(visibleStart.getDate()+week*7);
    const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+6);
    const weekStartKey=localDateKey(weekStart),weekEndKey=localDateKey(weekEnd),laneEnds=[];
    calendarTasks().filter(task=>task.startKey<=weekEndKey&&task.endKey>=weekStartKey).sort((a,b)=>a.startKey.localeCompare(b.startKey)||b.endKey.localeCompare(a.endKey)).forEach(task=>{
      const segmentStart=task.startKey>weekStartKey?task.startKey:weekStartKey,segmentEnd=task.endKey<weekEndKey?task.endKey:weekEndKey;
      let lane=laneEnds.findIndex(end=>end<segmentStart);if(lane<0)lane=laneEnds.length;laneEnds[lane]=segmentEnd;
      segments.push({task,week,lane,columnStart:calendarDayDistance(weekStartKey,segmentStart)+1,columnEnd:calendarDayDistance(weekStartKey,segmentEnd)+2,continuesBefore:task.startKey<weekStartKey,continuesAfter:task.endKey>weekEndKey});
    });
    lanesByWeek[week]=laneEnds.length;
  }
  return{segments,lanesByWeek,startKey};
}
function calendarTaskMarkup(segment,view){
  const task=segment.task,status=["pending","progress","done"].includes(task.status)?task.status:"pending",classes=`calendar-task-band status-${status}${segment.continuesBefore?" continues-before":""}${segment.continuesAfter?" continues-after":""}`;
  const style=`grid-column:${segment.columnStart}/${segment.columnEnd};grid-row:${segment.week+1};--task-offset:${segment.lane*(view==="week"?29:22)}px`;
  return`<button type="button" class="${classes}" style="${style}" data-calendar-task="${escapeHtml(task.id)}" title="${escapeHtml(`${homeTaskTitle(task)} · ${task.client||task.assigned||"Tarea del despacho"}`)}"><span>${escapeHtml(homeTaskTitle(task))}</span>${view==="week"?`<small>${escapeHtml(task.client||task.assigned||"")}</small>`:""}</button>`;
}
function calendarMonthMarkup(){
  const year=calendarAnchor.getFullYear(),month=calendarAnchor.getMonth(),first=new Date(year,month,1),start=new Date(first);start.setDate(1-(first.getDay()+6)%7);
  const days=Array.from({length:42},(_,index)=>{const date=new Date(start);date.setDate(start.getDate()+index);return date});
  const taskLayout=calendarTaskSegments(start,6);
  return`<div class="calendar-weekdays">${["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"].map(day=>`<span>${day}</span>`).join("")}</div><div class="calendar-month-grid">${days.map((date,index)=>{const outside=date.getMonth()!==month,today=localDateKey(date)===localDateKey(new Date()),items=calendarItemsFor(date),week=Math.floor(index/7),taskOffset=(taskLayout.lanesByWeek[week]||0)*22;return`<section class="calendar-day${outside?" outside":""}${today?" today":""}" style="grid-column:${index%7+1};grid-row:${week+1};--calendar-task-offset:${taskOffset}px" data-calendar-date="${localDateKey(date)}"><button type="button" class="calendar-day-number" data-new-calendar-item="${localDateKey(date)}">${date.getDate()}</button><div>${items.slice(0,3).map(item=>calendarEventMarkup(item,true)).join("")}${items.length>3?`<button class="calendar-more" type="button" data-new-calendar-item="${localDateKey(date)}">+${items.length-3} más</button>`:""}</div></section>`}).join("")}${taskLayout.segments.map(segment=>calendarTaskMarkup(segment,"month")).join("")}</div>`;
}
function calendarWeekMarkup(){
  const start=calendarMonday(calendarAnchor),days=Array.from({length:7},(_,index)=>{const date=new Date(start);date.setDate(start.getDate()+index);return date});
  const taskLayout=calendarTaskSegments(start,1),taskLanes=taskLayout.lanesByWeek[0]||0;
  return`<div class="calendar-week-grid">${days.map((date,index)=>{const today=localDateKey(date)===localDateKey(new Date()),items=calendarItemsFor(date);return`<section class="calendar-week-day${today?" today":""}" style="grid-column:${index+1};grid-row:1;--calendar-task-offset:${taskLanes*29}px"><button type="button" class="calendar-week-heading" data-new-calendar-item="${localDateKey(date)}"><span>${new Intl.DateTimeFormat("es-ES",{weekday:"long"}).format(date)}</span><strong>${date.getDate()}</strong><small>${new Intl.DateTimeFormat("es-ES",{month:"short"}).format(date)}</small></button><div class="calendar-week-events">${items.length?items.map(item=>calendarEventMarkup(item)).join(""):`<button type="button" class="calendar-add-empty" data-new-calendar-item="${localDateKey(date)}">＋ Añadir</button>`}</div></section>`}).join("")}${taskLayout.segments.map(segment=>calendarTaskMarkup(segment,"week")).join("")}</div>`;
}
function calendarPeriodLabel(){
  if(calendarView==="month")return new Intl.DateTimeFormat("es-ES",{month:"long",year:"numeric"}).format(calendarAnchor);
  const start=calendarMonday(calendarAnchor),end=new Date(start);end.setDate(start.getDate()+6);
  return`${new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short"}).format(start)} – ${new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short",year:"numeric"}).format(end)}`;
}
function bindCalendarGrid(){
  document.querySelectorAll("[data-new-calendar-item]").forEach(button=>button.addEventListener("click",event=>{event.stopPropagation();openCalendarItem(button.dataset.newCalendarItem)}));
  document.querySelectorAll("[data-calendar-event]").forEach(button=>button.addEventListener("click",event=>{event.stopPropagation();openCalendarItem("",button.dataset.calendarEvent)}));
  document.querySelectorAll("[data-calendar-task]").forEach(button=>button.addEventListener("click",event=>{event.stopPropagation();const id=button.dataset.calendarTask;document.querySelector('nav button[data-title="Tareas"]')?.click();setTimeout(()=>taskEditHandler?.(id),0)}));
}
function refreshCalendar(){const title=document.querySelector("#calendarPeriodTitle"),body=document.querySelector("#calendarBody");if(!title||!body)return;title.textContent=calendarPeriodLabel();body.innerHTML=calendarView==="month"?calendarMonthMarkup():calendarWeekMarkup();document.querySelectorAll("[data-calendar-view]").forEach(button=>button.classList.toggle("active",button.dataset.calendarView===calendarView));bindCalendarGrid()}
function openCalendarItem(date="",id=""){
  const modal=document.querySelector("#calendarModal"),form=document.querySelector("#calendarForm"),item=getCalendarItems().find(value=>value.id===id);if(!modal||!form)return;
  form.reset();form.dataset.itemId=item?.id||"";document.querySelector("#calendarModalTitle").textContent=item?"Editar recordatorio":"Añadir recordatorio";document.querySelector("#calendarItemTitle").value=item?.title||"";document.querySelector("#calendarItemDate").value=item?.date||date||localDateKey(new Date());document.querySelector("#calendarItemTime").value=item?.time||"";document.querySelector("#calendarItemType").value=item?.type||"reminder";document.querySelector("#calendarItemAssigned").value=item?.assigned||"";document.querySelector("#calendarItemNotes").value=item?.notes||"";document.querySelector("#deleteCalendarItem").hidden=!item;modal.classList.add("open");modal.setAttribute("aria-hidden","false");setTimeout(()=>document.querySelector("#calendarItemTitle")?.focus(),150)
}
function closeCalendarItem(){const modal=document.querySelector("#calendarModal");if(modal){modal.classList.remove("open");modal.setAttribute("aria-hidden","true")}}
function renderCalendar(){
  main.innerHTML=`<header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">ORGANIZACIÓN DEL DESPACHO</p><h1>Calendario</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="calendar-shell panel"><div class="calendar-top"><div><p class="eyebrow">AGENDA COMPARTIDA</p><h2>Tareas, recordatorios y avisos</h2><p>Las tareas se muestran automáticamente desde su inicio hasta la fecha límite.</p></div><button class="primary blue-button" id="newCalendarItem">＋ Añadir recordatorio</button></div>
    <div class="calendar-toolbar"><div class="calendar-navigation"><button type="button" id="calendarPrevious" aria-label="Periodo anterior">‹</button><button type="button" id="calendarToday">Hoy</button><button type="button" id="calendarNext" aria-label="Periodo siguiente">›</button><h3 id="calendarPeriodTitle"></h3></div><div class="calendar-view-switch"><button type="button" data-calendar-view="month">Mes</button><button type="button" data-calendar-view="week">Semana</button></div></div><div class="calendar-body" id="calendarBody"></div></section>    <div class="modal-shell" id="calendarModal" aria-hidden="true"><div class="modal-backdrop" data-close-calendar></div><section class="client-modal calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendarModalTitle"><div class="client-modal-head"><div><p class="eyebrow">AGENDA</p><h2 id="calendarModalTitle">Añadir recordatorio</h2></div><button class="modal-close" type="button" data-close-calendar aria-label="Cerrar">×</button></div><form id="calendarForm"><div class="calendar-form-grid"><label class="calendar-title-field">Título<input id="calendarItemTitle" maxlength="100" required placeholder="Ej. Presentar modelo 303"></label><label>Fecha<input id="calendarItemDate" type="date" required></label><label>Hora opcional<input id="calendarItemTime" type="time"></label><label>Tipo<select id="calendarItemType"><option value="reminder">Recordatorio</option><option value="notice">Aviso</option></select></label><label>Responsable<select id="calendarItemAssigned"><option value="">Todo el equipo</option>${workers.map(name=>`<option>${escapeHtml(name)}</option>`).join("")}</select></label><label class="calendar-notes-field">Notas<textarea id="calendarItemNotes" rows="3" maxlength="400" placeholder="Información adicional"></textarea></label></div><div class="modal-actions calendar-modal-actions"><button type="button" class="calendar-delete" id="deleteCalendarItem" hidden>Eliminar</button><button type="button" class="secondary-button" data-close-calendar>Cancelar</button><button type="submit" class="primary blue-button">Guardar</button></div></form></section></div>`;
  bindHeader();refreshCalendar();
  document.querySelector("#newCalendarItem").addEventListener("click",()=>openCalendarItem(localDateKey(new Date())));  document.querySelector("#calendarPrevious").addEventListener("click",()=>{if(calendarView==="month"){calendarAnchor.setDate(1);calendarAnchor.setMonth(calendarAnchor.getMonth()-1)}else calendarAnchor.setDate(calendarAnchor.getDate()-7);refreshCalendar()});
  document.querySelector("#calendarNext").addEventListener("click",()=>{if(calendarView==="month"){calendarAnchor.setDate(1);calendarAnchor.setMonth(calendarAnchor.getMonth()+1)}else calendarAnchor.setDate(calendarAnchor.getDate()+7);refreshCalendar()});
  document.querySelector("#calendarToday").addEventListener("click",()=>{calendarAnchor=new Date();refreshCalendar()});
  document.querySelectorAll("[data-calendar-view]").forEach(button=>button.addEventListener("click",()=>{calendarView=button.dataset.calendarView;localStorage.setItem("app-am-calendar-view",calendarView);refreshCalendar()}));
  document.querySelectorAll("[data-close-calendar]").forEach(button=>button.addEventListener("click",closeCalendarItem));
  document.querySelector("#calendarForm").addEventListener("submit",event=>{event.preventDefault();const form=event.currentTarget,items=getCalendarItems(),data={title:document.querySelector("#calendarItemTitle").value.trim(),date:document.querySelector("#calendarItemDate").value,time:document.querySelector("#calendarItemTime").value,type:document.querySelector("#calendarItemType").value,assigned:document.querySelector("#calendarItemAssigned").value,notes:document.querySelector("#calendarItemNotes").value.trim()},existing=items.find(item=>item.id===form.dataset.itemId);if(existing)Object.assign(existing,data);else items.push({id:`calendar-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,...data});saveCalendarItems(items);closeCalendarItem();refreshCalendar()});
  document.querySelector("#deleteCalendarItem").addEventListener("click",()=>{const id=document.querySelector("#calendarForm").dataset.itemId;if(!id)return;saveCalendarItems(getCalendarItems().filter(item=>item.id!==id));closeCalendarItem();refreshCalendar()});
}
function renderRenta(){
  main.innerHTML=`<header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">CAMPAÑA FISCAL</p><h1>Renta</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header><section class="renta-hero"><div><p class="eyebrow light">CAMPAÑA DE RENTA</p><h2>Gestión de expedientes de renta</h2><p>Un espacio independiente para organizar la documentación y el estado de cada declaración cuando comience la campaña.</p></div><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5M17 16h.01M7 2v3M17 2v3"/></svg></span></section><section class="renta-status-grid"><article><span>01</span><h3>Documentación</h3><p>Recopilación de datos fiscales y justificantes.</p></article><article><span>02</span><h3>En preparación</h3><p>Seguimiento de las declaraciones que se están confeccionando.</p></article><article><span>03</span><h3>Presentadas</h3><p>Control de expedientes terminados y presentados.</p></article></section><section class="panel renta-ready"><span>✓</span><div><h3>Sección preparada</h3><p>La estructura de Renta ya está disponible en el menú. Cuando concretemos el modelo de trabajo, incorporaremos aquí los clientes, responsables, plazos y documentos.</p></div></section>`;bindHeader()
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
    const clients=(await getAllClientMetadata()).filter(client=>clientIsActive(client)&&(client.personType||"juridica")==="juridica").sort((a,b)=>{
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
      </article>`}).join(""):`<div class="review-empty"><span>✓</span><strong>No hay correcciones añadidas</strong><p>Añade una cuando detectes algo que el compañero deba solucionar.</p><label><input id="reviewWithoutCorrections" type="checkbox" ${state.reviewNoCorrections?"checked":""}> Marcar revisión finalizada sin correcciones</label></div>`}</div>`;  const form=document.querySelector("#reviewCorrectionForm");
  const resetCorrectionForm=()=>{form.reset();form.dataset.editingId="";form.hidden=true;document.querySelector("#saveReviewCorrection").textContent="Guardar corrección"};
  document.querySelector("#addReviewCorrection").addEventListener("click",()=>{form.reset();form.dataset.editingId="";form.hidden=false;document.querySelector("#reviewCorrectionDueDate").min=new Date().toISOString().slice(0,10);document.querySelector("#saveReviewCorrection").textContent="Guardar corrección";document.querySelector("#reviewCorrectionTitle").focus()});
  document.querySelector("#cancelReviewCorrection").addEventListener("click",resetCorrectionForm);  form.addEventListener("submit",event=>{
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
  banner.innerHTML=locked?`<span>🔒</span><div><strong>Ficha presentada y bloqueada</strong><small>Presentada el ${new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(state.presentedDate+"T12:00:00"))}. Puedes consultarla o desbloquearla para modificarla.</small></div><button type="button" id="unlockAnnualRecord">Desbloquear edición</button>`:"";
  document.querySelector("#unlockAnnualRecord")?.addEventListener("click",()=>openAnnualRecordUnlock(clientId));
}
function openAnnualRecordUnlock(clientId){
  openPasswordDialog({
    id:"annualRecordAccess",eyebrow:"FICHA PRESENTADA",title:"Desbloquear edición",copy:"Introduce la contraseña para modificar este cierre anual.",icon:"🔒",
    onSuccess:()=>{annualClosingUnlocks.add(clientId);const active=document.querySelector("[data-annual-stage].active")?.dataset.annualStage||"accounting";renderAnnualClosingStage(active);updateAnnualClosingTableRow(clientId,annualClosingState(clientId))}
  });
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
    .replace(/\b(SOCIEDAD LIMITADA PROFESIONAL|SOCIEDAD LIMITADA|SOCIEDAD ANONIMA|S L P|S L L|S L|S A|SLP|SLL|SL|SA|CB|SC|SCOOP)\b/g," ")
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
  const all=await getDeclarationPdfs(true);
  if(!all.length)return new Map();
  const aliases=fiscalPeriodAliases(type,period);
  const candidates=all.filter(doc=>{
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
  const previewId=registerPreviewDocument(document);
  return `<div class="declaration-document-actions"><button type="button" data-preview-document="${previewId}" title="Vista preliminar de ${escapeHtml(document.name)}"><span>PDF</span> Ver documento</button></div>`;
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
  return [];}
function openDeclarationColumnFilter(prefix,bodyId,button){
  document.querySelector(".excel-filter-popover")?.remove();
  const column=declarationColumns.find(item=>item.field===button.dataset.excelFilter);if(!column)return;
  const value=declarationColumnFilterState[prefix]?.[column.field]||"";  const panel=document.createElement("div");panel.className="excel-filter-popover";
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

let declarationViewMode="current";
function declarationViewSelector(){return `<label class="quarter-selector declaration-view-selector"><span>Periodo</span><select id="declarationView"><option value="current">Periodo actual</option><option value="history">Histórico</option></select></label>`}
function bindDeclarationViewSelector(){const select=document.querySelector("#declarationView");if(!select)return;select.value=declarationViewMode;select.addEventListener("change",event=>{declarationViewMode=event.target.value;if(declarationViewMode==="history")renderDeclarationHistory();else renderDeclarations()})}
function renderDeclarations(){
  declarationViewMode="current";
  activeTaxQuarter=defaultControlTaxPeriod(activeTaxType);
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Declaraciones</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="declarations-panel">
      <div class="declarations-heading">
        ${declarationViewSelector()}
        <div class="control-period-selectors">
          <label class="quarter-selector"><span>Periodicidad</span><select id="taxType"><option value="trimestral">Trimestral</option><option value="mensual">Mensual</option></select></label>
          <label class="quarter-selector"><span>Periodo fiscal</span><select id="taxQuarter"></select></label>
        </div>
      </div>
      <div class="tax-deadlines" id="taxDeadlines"></div>
      <div class="tax-tabs" role="tablist">${[...taxModels,...annualTaxModels].map(model=>`<button type="button" role="tab" data-tax-tab="${model}" class="${model===activeTaxModel?"active":""}">Modelo ${model}</button>`).join("")}</div>
      <div class="tax-lock-banner" id="taxLockBanner" hidden></div>
      <div class="tax-table-wrap"><table class="tax-table"><thead><tr id="taxTableHead">${declarationTableHeaders("tax",activeTaxModel)}</tr></thead><tbody id="taxRows"><tr><td colspan="10" class="table-empty">Cargando clientes…</td></tr></tbody></table></div>
    </section>`;
   bindHeader();
  bindDeclarationViewSelector();
  setupDeclarationFilters("tax","taxRows");
  document.querySelector("#taxType").value=activeTaxType;fillTaxPeriodSelect();syncTaxModelTabs();
  document.querySelector("#taxType").addEventListener("change",event=>{activeTaxType=event.target.value;activeTaxQuarter=defaultControlTaxPeriod(activeTaxType);if(activeTaxType==="mensual"&&activeTaxModel==="130-131")activeTaxModel="111";fillTaxPeriodSelect();syncTaxModelTabs();loadTaxModel(activeTaxModel)});
  document.querySelector("#taxQuarter").addEventListener("change",event=>{activeTaxQuarter=event.target.value;syncTaxModelTabs();loadTaxModel(activeTaxModel)});
  document.querySelectorAll("[data-tax-tab]").forEach(tab=>tab.addEventListener("click",()=>{if(tab.disabled)return;activeTaxModel=tab.dataset.taxTab;syncTaxModelTabs();loadTaxModel(activeTaxModel)}));
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
    const clients=(await getAllClientMetadata()).filter(client=>clientIsActive(client)&&(client.periodicity||"trimestral")===activeTaxType&&client.obligations&&client.obligations[sourceTaxModel(model)]);
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
  openPasswordDialog({
    id:"taxAccess",eyebrow:"PERIODO CERRADO",title:"Desbloquear periodo",copy:"Introduce la contraseña para modificar este periodo fiscal.",icon:"✓",
    onSuccess:()=>{taxUnlocks.add(model+"-"+type+"-"+period);loadTaxModel(model)}
  });
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
const historyControlColumnsKey="app-am-history-control-columns";

function historyControlColumns(){try{return JSON.parse(localStorage.getItem(historyControlColumnsKey)||"[]")}catch{return[]}}
function historyTableHeaders(){
  const controls=historyControlColumns().map(column=>`<th class="history-control-heading" data-history-control="${escapeHtml(column.field)}"><span>${escapeHtml(column.label)}</span></th>`).join("");
  return declarationTableHeaders("history")+controls+'<th class="history-add-column-heading"><button id="addHistoryColumn" type="button" aria-label="Añadir columna de control" title="Añadir columna de control">＋</button></th>';
}
function bindHistoryColumnCreator(){document.querySelector("#addHistoryColumn")?.addEventListener("click",event=>openHistoryColumnCreator(event.currentTarget))}
function openHistoryColumnCreator(button){
  document.querySelector(".excel-filter-popover")?.remove();
  const panel=document.createElement("form");panel.className="excel-filter-popover history-column-creator";
  panel.innerHTML='<div class="excel-filter-title"><span>Nueva columna</span><strong>Control personalizado</strong></div><label for="historyColumnName">Nombre de la columna</label><input id="historyColumnName" type="text" maxlength="40" placeholder="Ej. Revisado" required><div class="excel-filter-actions"><button type="button" data-cancel-column>Cancelar</button><button class="apply" type="submit">Añadir</button></div>';
  document.body.appendChild(panel);
  const rect=button.getBoundingClientRect();panel.style.left=Math.max(10,Math.min(rect.left-210,window.innerWidth-286))+"px";panel.style.top=Math.max(10,Math.min(rect.bottom+7,window.innerHeight-panel.offsetHeight-10))+"px";
  const close=()=>panel.remove();panel.addEventListener("click",event=>event.stopPropagation());panel.querySelector("[data-cancel-column]").addEventListener("click",close);
  panel.addEventListener("submit",event=>{event.preventDefault();const input=panel.querySelector("#historyColumnName"),label=input.value.trim();if(!label)return;const columns=historyControlColumns();columns.push({field:"control_"+Date.now(),label});localStorage.setItem(historyControlColumnsKey,JSON.stringify(columns));close();renderDeclarationHistory()});
  panel.querySelector("#historyColumnName").focus();setTimeout(()=>document.addEventListener("click",close,{once:true}),0);
}

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
  declarationViewMode="history";
  const years=historicalYears(),lastYear=years[years.length-1]||2025;
  if(!years.includes(activeHistoryYear))activeHistoryYear=lastYear;
  main.innerHTML=`
    <header><button class="menu" id="menu" aria-label="Abrir menú">☰</button><div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Declaraciones</h1></div><button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button></header>
    <section class="declarations-panel history-panel">
      <div class="declarations-heading">
        ${declarationViewSelector()}
        <div class="history-selectors">
          <label class="quarter-selector"><span>Ejercicio</span><select id="historyYear">${years.map(year=>`<option value="${year}">${year}</option>`).join("")}</select></label>
          <label class="quarter-selector"><span>Periodicidad</span><select id="historyType"><option value="trimestral">Trimestral</option><option value="mensual">Mensual</option></select></label>
          <label class="quarter-selector"><span>Periodo fiscal</span><select id="historyQuarter"></select></label>
        </div>
      </div>
      <div class="tax-tabs" role="tablist">${taxModels.map(model=>`<button type="button" role="tab" data-history-tax-tab="${model}" class="${model===activeHistoryModel?"active":""}">Modelo ${model}</button>`).join("")}</div>
      <div class="tax-lock-banner history-lock" id="historyLockBanner"></div>
      <div class="tax-table-wrap"><table class="tax-table history-tax-table"><thead><tr>${historyTableHeaders()}</tr></thead><tbody id="historyTaxRows"><tr><td colspan="${11+historyControlColumns().length}" class="table-empty">Cargando histórico…</td></tr></tbody></table></div>
    </section>`;
  bindHeader();
  bindDeclarationViewSelector();
  setupDeclarationFilters("history","historyTaxRows");
  bindHistoryColumnCreator();
  document.querySelector("#historyYear").value=String(activeHistoryYear);
  document.querySelector("#historyType").value=activeHistoryType;
  fillHistoryPeriodSelect();syncHistoryModelTabs();
  document.querySelector("#historyYear").addEventListener("change",event=>{activeHistoryYear=Number(event.target.value);loadHistoricalModel(activeHistoryModel)});
  document.querySelector("#historyType").addEventListener("change",event=>{activeHistoryType=event.target.value;activeHistoryQuarter=activeHistoryType==="mensual"?"M01":"1T";if(activeHistoryType==="mensual"&&activeHistoryModel==="130-131")activeHistoryModel="111";fillHistoryPeriodSelect();syncHistoryModelTabs();loadHistoricalModel(activeHistoryModel)});
  document.querySelector("#historyQuarter").addEventListener("change",event=>{activeHistoryQuarter=event.target.value;loadHistoricalModel(activeHistoryModel)});
  document.querySelectorAll("[data-history-tax-tab]").forEach(tab=>tab.addEventListener("click",()=>{if(tab.disabled)return;activeHistoryModel=tab.dataset.historyTaxTab;syncHistoryModelTabs();loadHistoricalModel(activeHistoryModel)}));
  loadHistoricalModel(activeHistoryModel);
}
async function loadHistoricalModel(model){
  const body=document.querySelector("#historyTaxRows"),key=activeHistoryYear+"-"+activeHistoryType+"-"+activeHistoryQuarter+"-"+model,unlocked=historyUnlocks.has(key);
  const controlColumns=historyControlColumns(),columnCount=11+controlColumns.length;
  try{
    const clients=(await getAllClientMetadata()).filter(client=>clientIsActive(client)&&(client.periodicity||"trimestral")===activeHistoryType&&client.obligations&&client.obligations[model]);
    const documents=await declarationDocumentsForClients(clients,model,activeHistoryType,activeHistoryQuarter,activeHistoryYear);
    body.innerHTML=clients.length?clients.sort((a,b)=>a.name.localeCompare(b.name,"es")).map(client=>{const d=declarationData(model,activeHistoryQuarter,client.name,activeHistoryYear),controls=controlColumns.map(column=>`<td class="history-control-cell"><input type="text" data-field="${escapeHtml(column.field)}" value="${escapeHtml(d[column.field]||"")}" placeholder="—"></td>`).join("");return `<tr data-tax-client="${escapeHtml(client.name)}" data-tax-model-row="${model}" data-tax-quarter-row="${activeHistoryQuarter}" data-tax-year-row="${activeHistoryYear}"><td><strong>${escapeHtml(client.name)}</strong><small>${activeHistoryType==="mensual"?"Mensual":"Trimestral"} · ${activeHistoryYear}</small></td><td>${declarationDocumentMarkup(documents.get(client.name))}</td><td>${escapeHtml(client.cif||"—")}</td><td><select data-field="manager">${workerOptions(d.manager)}</select></td><td><input type="date" data-field="prepared" value="${escapeHtml(d.prepared||"")}"></td><td><div class="amount-input"><input type="number" step="0.01" data-field="amount" value="${escapeHtml(d.amount||"")}" placeholder="0,00"><span>€</span></div></td><td><select data-field="payment"><option value="">Seleccionar…</option><option ${d.payment==="Domicil."?"selected":""}>Domicil.</option><option ${d.payment==="N.R.C."?"selected":""}>N.R.C.</option><option ${d.payment==="Cargo"?"selected":""}>Cargo</option><option ${d.payment==="Aplaz."?"selected":""}>Aplaz.</option><option ${d.payment==="Pte. Pago"?"selected":""}>Pte. Pago</option><option ${d.payment==="Negativa"?"selected":""}>Negativa</option><option ${d.payment==="Compensación"?"selected":""}>Compensación</option><option ${d.payment==="Devolver"?"selected":""}>Devolver</option><option ${d.payment==="Baja"?"selected":""}>Baja</option><option ${d.payment==="Cliente"?"selected":""}>Cliente</option></select></td><td><input type="date" data-field="submitted" value="${escapeHtml(d.submitted||"")}"></td><td><select data-field="submittedBy">${workerOptions(d.submittedBy)}</select></td><td><select data-field="reviewedBy">${workerOptions(d.reviewedBy)}</select></td>${controls}<td class="history-add-column-spacer"></td></tr>`}).join(""):`<tr><td colspan="${columnCount}" class="table-empty">No hay clientes ${activeHistoryType==="mensual"?"mensuales":"trimestrales"} asignados al modelo ${escapeHtml(model)}.</td></tr>`;
    body.querySelectorAll("input,select").forEach(control=>{control.disabled=!unlocked;control.addEventListener("change",event=>{saveHistoricalRow(event);applyDeclarationFilters("history","historyTaxRows")})});
    applyDeclarationFilters("history","historyTaxRows");
    renderHistoryLock(unlocked,model);
  }catch{body.innerHTML=`<tr><td colspan="${columnCount}" class="table-empty">No se pudo cargar el histórico.</td></tr>`}
}
function renderHistoryLock(unlocked,model){
  const banner=document.querySelector("#historyLockBanner");
  if(unlocked){banner.innerHTML='<span>🔓</span><div><strong>Edición temporalmente desbloqueada</strong><p>Los cambios realizados en este histórico se guardarán en el dispositivo.</p></div>';return}
  banner.innerHTML='<span>🔒</span><div><strong>Histórico bloqueado</strong><p>El ejercicio está protegido para evitar modificaciones accidentales.</p></div><button type="button" id="unlockHistory">Desbloquear</button>';
  document.querySelector("#unlockHistory").addEventListener("click",()=>openHistoryUnlock(model));
}
function openHistoryUnlock(model){
  openPasswordDialog({
    id:"historyAccess",eyebrow:"HISTÓRICO PROTEGIDO",title:"Desbloquear histórico",copy:"Introduce la contraseña para modificar este ejercicio y periodo.",icon:"◷",
    onSuccess:()=>{historyUnlocks.add(activeHistoryYear+"-"+activeHistoryType+"-"+activeHistoryQuarter+"-"+model);loadHistoricalModel(model)}
  });
}
function saveHistoricalRow(event){
  const row=event.target.closest("tr"),data={};
  row.querySelectorAll("[data-field]").forEach(field=>data[field.dataset.field]=field.value);
  localStorage.setItem(declarationKey(row.dataset.taxModelRow,row.dataset.taxQuarterRow,row.dataset.taxClient,Number(row.dataset.taxYearRow)),JSON.stringify(data));
}

function renderFolderView(name){
  const config=views[name];
  currentDirectoryHandle=null;currentEntries=[];folderHistory=[];activeFolderConfig=config;
  main.innerHTML=`
    <header>
      <button class="menu" id="menu" aria-label="Abrir menú">☰</button>
      <div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>${name}</h1></div>
      <button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button>
    </header>
    <section class="folder-panel">
      <div class="folder-toolbar">
        <div><button class="folder-back" id="folderBack" type="button" aria-label="Volver" hidden>←</button><strong id="folderName">${name}</strong><span id="folderCount">0 elementos</span></div>
        <div class="folder-actions"><div class="folder-view-toggle" role="group" aria-label="Forma de mostrar los elementos"><button type="button" data-folder-view="grid" aria-label="Vista en cuadrícula" title="Vista en cuadrícula">▦</button><button type="button" data-folder-view="list" aria-label="Vista en lista" title="Vista en lista">☷</button></div><label class="client-search"><span aria-hidden="true">⌕</span><input id="clientSearch" type="search" placeholder="Buscar…" aria-label="Buscar en ${name}"></label><button class="upload-button" id="uploadFiles" type="button" hidden>＋ Añadir documentación</button><button class="upload-button invoice-process-open" id="openInvoiceProcessor" type="button" hidden>▦ Procesar facturas</button></div>
      </div>
      <section class="invoice-processor" id="invoiceProcessor" hidden><div class="invoice-processor-head"><div><p class="eyebrow">LECTURA DE FACTURAS</p><h3>Procesar facturas</h3><p>Selecciona el cliente y añade las facturas para generar el Excel.</p></div><button type="button" id="closeInvoiceProcessor" aria-label="Cerrar">×</button></div><div class="invoice-processor-fields"><label><span>Cliente</span><select id="invoiceClient"><option value="">Seleccionar cliente…</option></select></label><label class="invoice-drop-zone" id="invoiceDropZone"><input id="invoiceFiles" type="file" accept=".pdf,.xml,.txt" multiple><span>⇩</span><strong>Añadir documentación</strong><small>Selecciona los archivos o arrástralos directamente aquí</small></label></div><div class="invoice-selected-files" id="invoiceSelectedFiles">Ningún archivo seleccionado</div><div class="invoice-processor-actions"><p id="invoiceProcessStatus"></p><button class="primary blue-button" id="processInvoices" type="button">Procesar y generar Excel</button></div></section>
      <div class="folder-grid" id="folderGrid">
        <div class="empty folder-empty"><span>▤</span><h4>Cargando documentación</h4></div>
      </div>
    </section>`;
  bindHeader();
  document.querySelector("#clientSearch").addEventListener("input",filterFolders);
  document.querySelector("#folderBack").addEventListener("click",goBackFolder);
  document.querySelector("#uploadFiles").addEventListener("click",uploadDocuments);
  setupInvoiceProcessor();
  document.querySelectorAll("[data-folder-view]").forEach(button=>button.addEventListener("click",()=>setFolderViewMode(button.dataset.folderView)));
  if(name==="Clientes") setupClientFolderDropZone();
  setFolderViewMode(folderViewMode,false);
  restoreFolder(config);
}

let invoiceProcessorFiles=[];
async function setupInvoiceProcessor(){
  const panel=document.querySelector("#invoiceProcessor"),open=document.querySelector("#openInvoiceProcessor");if(!panel||!open)return;
  const select=panel.querySelector("#invoiceClient"),input=panel.querySelector("#invoiceFiles"),drop=panel.querySelector("#invoiceDropZone");
  try{const clients=(await getAllClientMetadata()).filter(clientIsActive).sort((a,b)=>a.name.localeCompare(b.name,"es"));select.insertAdjacentHTML("beforeend",clients.map(client=>`<option value="${escapeHtml(client.name)}">${escapeHtml(client.name)}</option>`).join(""))}catch{}
  const renderFiles=()=>{panel.querySelector("#invoiceSelectedFiles").innerHTML=invoiceProcessorFiles.length?`<strong>${invoiceProcessorFiles.length} ${invoiceProcessorFiles.length===1?"archivo":"archivos"}</strong><span>${invoiceProcessorFiles.map(file=>escapeHtml(file.name)).join(" · ")}</span>`:"Ningún archivo seleccionado"};
  const addFiles=files=>{invoiceProcessorFiles=[...files].filter(file=>/\.(pdf|xml|txt)$/i.test(file.name));renderFiles()};
  open.addEventListener("click",()=>{panel.hidden=false;panel.scrollIntoView({behavior:"smooth",block:"nearest"})});
  panel.querySelector("#closeInvoiceProcessor").addEventListener("click",()=>{panel.hidden=true});
  input.addEventListener("change",()=>addFiles(input.files));
  ["dragenter","dragover"].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add("dragging")}));
  ["dragleave","drop"].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove("dragging")}));
  drop.addEventListener("drop",event=>addFiles(event.dataTransfer.files));
  panel.querySelector("#processInvoices").addEventListener("click",()=>processInvoiceFiles(select.value));
}
async function invoiceFileText(file){
  if(/\.(xml|txt)$/i.test(file.name))return file.text();
  const pdfjs=await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
  const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;let text="";
  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){const page=await pdf.getPage(pageNumber),content=await page.getTextContent();text+="\n"+content.items.map(item=>item.str).join(" ")}
  return text;
}
function invoiceMatch(text,patterns){for(const pattern of patterns){const match=text.match(pattern);if(match?.[1])return match[1].trim()}return""}
function invoiceAmount(value){if(!value)return"";const clean=value.replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".").replace(/[^\d.-]/g,"");const number=Number(clean);return Number.isFinite(number)?number.toFixed(2):""}
function invoiceRecord(file,text,client){
  const compact=text.replace(/\s+/g," ").trim(),lines=text.split(/[\r\n]+/).map(line=>line.trim()).filter(Boolean);
  const nif=invoiceMatch(compact,[/(?:NIF|CIF|VAT|N\.I\.F\.?)[\s:.-]*([A-Z]\d{7}[0-9A-Z]|\d{8}[A-Z])/i,/\b([A-Z]\d{7}[0-9A-Z])\b/i]);
  return{client,number:invoiceMatch(compact,[/(?:n[uú]mero|n[º°o.]|num\.?)[\s]*(?:de[\s]*)?factura[\s:#-]*([A-Z0-9][A-Z0-9\-/.]+)/i,/(?:factura|invoice)[\s]*(?:n[uú]m(?:ero)?|n[º°o.]|#)?[\s:#-]*([A-Z0-9][A-Z0-9\-/.]+)/i]),date:invoiceMatch(compact,[/(?:fecha(?: de)? factura|fecha expedici[oó]n|fecha)[\s:.-]*(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4})/i]),supplier:(invoiceMatch(compact,[/(?:proveedor|emisor|raz[oó]n social)[\s:.-]*([^|]{3,80}?)(?=\s+(?:NIF|CIF|VAT|Direcci[oó]n|Factura)|$)/i])||lines[0]||"").slice(0,120),supplierNif:nif,base:invoiceAmount(invoiceMatch(compact,[/(?:base imponible|subtotal)[\s:€]*([\d.,]+)/i])),vatRate:invoiceMatch(compact,[/(?:IVA|I\.V\.A\.)[\s]*(\d{1,2}(?:[,.]\d+)?)\s*%/i]),vat:invoiceAmount(invoiceMatch(compact,[/(?:cuota IVA|total IVA|IVA)[\s:€]*(?:\d{1,2}(?:[,.]\d+)?\s*%)?[\s:€]*([\d.,]+)/i])),total:invoiceAmount(invoiceMatch(compact,[/(?:total factura|importe total|total a pagar|TOTAL)[\s:€]*([\d.,]+)/i])),file:file.name};
}
function excelXmlEscape(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function downloadInvoiceExcel(records,client){
  const headers=["Cliente","Número de factura","Fecha","Proveedor","NIF/CIF proveedor","Base imponible","Tipo IVA (%)","Cuota IVA","Importe total","Archivo original","Observaciones"];
  const rows=records.map(record=>[record.client,record.number,record.date,record.supplier,record.supplierNif,record.base,record.vatRate,record.vat,record.total,record.file,record.number&&record.total?"":"Revisar datos no detectados"]);
  const cell=value=>`<Cell><Data ss:Type="String">${excelXmlEscape(value)}</Data></Cell>`;
  const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Facturas"><Table><Row>${headers.map(cell).join("")}</Row>${rows.map(row=>`<Row>${row.map(cell).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
  const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([xml],{type:"application/vnd.ms-excel"}));link.download=`Facturas ${client} ${new Date().toISOString().slice(0,10)}.xls`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
async function processInvoiceFiles(client){
  const status=document.querySelector("#invoiceProcessStatus"),button=document.querySelector("#processInvoices");
  if(!client){status.textContent="Selecciona un cliente.";return}if(!invoiceProcessorFiles.length){status.textContent="Añade al menos una factura.";return}
  button.disabled=true;button.textContent="Procesando…";status.textContent="Leyendo la información de las facturas…";
  const records=[];for(const file of invoiceProcessorFiles){try{records.push(invoiceRecord(file,await invoiceFileText(file),client))}catch{records.push(invoiceRecord(file,"",client))}}
  downloadInvoiceExcel(records,client);status.textContent=`Excel generado con ${records.length} ${records.length===1?"factura":"facturas"}. Revisa las filas marcadas.`;button.disabled=false;button.textContent="Procesar y generar Excel";
}

function setupClientFolderDropZone(){
  const panel=document.querySelector(".folder-panel");if(!panel)return;
  const overlay=document.createElement("div");overlay.className="folder-drop-overlay";overlay.id="folderDropOverlay";overlay.setAttribute("aria-hidden","true");overlay.innerHTML='<span aria-hidden="true">⇩</span><strong>Suelta aquí la documentación</strong><small>Se guardará en la carpeta que tienes abierta</small>';panel.appendChild(overlay);
  let dragDepth=0;
  const hasFiles=event=>[...(event.dataTransfer?.types||[])].includes("Files");
  const show=()=>{overlay.classList.add("active");overlay.setAttribute("aria-hidden","false")};
  const hide=()=>{dragDepth=0;overlay.classList.remove("active");overlay.setAttribute("aria-hidden","true")};
  panel.addEventListener("dragenter",event=>{if(!hasFiles(event))return;event.preventDefault();if(!currentDirectoryHandle)return;dragDepth++;show()});
  panel.addEventListener("dragover",event=>{if(!hasFiles(event))return;event.preventDefault();if(!currentDirectoryHandle)return;event.dataTransfer.dropEffect="copy";show()});  panel.addEventListener("dragleave",()=>{if(dragDepth>0)dragDepth--;if(!dragDepth)hide()});
  panel.addEventListener("drop",async event=>{if(!hasFiles(event))return;event.preventDefault();hide();if(!currentDirectoryHandle){alert("No se puede acceder a la documentación. Contacta con el administrador del servidor.");return}const items=[...(event.dataTransfer.items||[])],files=items.length?items.filter(item=>item.kind==="file").map(item=>item.getAsFile()).filter(Boolean):[...(event.dataTransfer.files||[])];if(!files.length)return;await addDocumentsToCurrentFolder(files)});
}

function setFolderViewMode(mode,persist=true){
  folderViewMode=mode==="list"?"list":"grid";  if(persist)localStorage.setItem(FOLDER_VIEW_STORAGE_KEY,folderViewMode);
  document.querySelector("#folderGrid")?.classList.toggle("list-view",folderViewMode==="list");
  document.querySelectorAll("[data-folder-view]").forEach(button=>{const active=button.dataset.folderView===folderViewMode;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))});
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
      const grid=document.querySelector("#folderGrid");if(grid)grid.innerHTML='<div class="empty folder-empty"><span>▤</span><h4>No se puede acceder a la documentación</h4><p>Contacta con el administrador del servidor.</p></div>';
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
  let entries=[];
  for await(const entry of handle.values()){
    entries.push({name:entry.name,kind:entry.kind,handle:entry});
  }
  if(config.storageKey==="clients-folder"&&folderHistory.length===0){
    try{
      const inactiveNames=new Set((await getAllClientMetadata()).filter(client=>!clientIsActive(client)).map(clientIdentity));
      entries=entries.filter(entry=>entry.kind!=="directory"||!inactiveNames.has(entry.name));
    }catch{}
  }
  entries.sort((a,b)=>a.kind===b.kind
    ? a.name.localeCompare(b.name,"es",{sensitivity:"base"})
    : a.kind==="directory" ? -1 : 1);
  currentEntries=entries;
  currentDirectoryHandle=handle;
  activeFolderConfig=config;
  document.querySelector("#folderName").textContent=handle.name;
  document.querySelector("#clientSearch").value="";
  document.querySelector("#folderBack").hidden=folderHistory.length===0;
  const upload=document.querySelector("#uploadFiles");
  if(upload) upload.hidden=false;
  const invoiceProcessor=document.querySelector("#openInvoiceProcessor");if(invoiceProcessor)invoiceProcessor.hidden=false;
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

const documentPreviewRegistry=new Map();
function registerPreviewDocument(record){
  const id="preview-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
  documentPreviewRegistry.set(id,record);
  return id;
}
async function openRegisteredDocumentPreview(id){
  const record=documentPreviewRegistry.get(id);if(!record)return;
  try{
    let file=record.file;
    if(!file&&record.handle)file=await record.handle.getFile();
    if(!file&&record.url){const response=await fetch(record.url);const blob=await response.blob();file=new File([blob],record.name||"documento",{type:blob.type})}
    if(file)openDocumentPreview(file);
  }catch{alert("No se pudo abrir la vista preliminar del documento.")}
}
document.addEventListener("click",event=>{
  const button=event.target.closest("[data-preview-document]");if(!button)return;
  event.preventDefault();openRegisteredDocumentPreview(button.dataset.previewDocument);
});
let activeDocumentPreviewUrl=null;
function closeDocumentPreview(){
  const shell=document.querySelector("#documentPreview");
  if(!shell)return;
  shell.remove();
  if(activeDocumentPreviewUrl){URL.revokeObjectURL(activeDocumentPreviewUrl);activeDocumentPreviewUrl=null}
}
function printPreviewDocument(file,url,kind){
  if(kind==="pdf"||kind==="text"){
    const frame=document.querySelector("#documentPreviewFrame");
    try{frame?.contentWindow?.focus();frame?.contentWindow?.print();return}catch{}
  }
  const printWindow=window.open("","_blank","noopener,noreferrer");
  if(!printWindow)return;
  const safeUrl=String(url).replace(/"/g,"%22");
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(file.name)}</title><style>html,body{margin:0;height:100%;display:grid;place-items:center}img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><img src="${safeUrl}" onload="window.print();window.close()"></body></html>`);
  printWindow.document.close();
}
function openDocumentPreview(file){
  closeDocumentPreview();
  const url=URL.createObjectURL(file),extension=(file.name.split(".").pop()||"").toLowerCase(),mime=file.type||"";
  activeDocumentPreviewUrl=url;
  const kind=mime==="application/pdf"||extension==="pdf"?"pdf":mime.startsWith("image/")?"image":mime.startsWith("text/")||["txt","csv","xml","json","html","log"].includes(extension)?"text":mime.startsWith("audio/")?"audio":mime.startsWith("video/")?"video":"other";
  const content=kind==="pdf"||kind==="text"
    ?`<iframe id="documentPreviewFrame" src="${url}${kind==="pdf"?"#toolbar=0":""}" title="Vista previa de ${escapeHtml(file.name)}"></iframe>`
    :kind==="image"?`<img src="${url}" alt="Vista previa de ${escapeHtml(file.name)}">`
    :kind==="audio"?`<audio src="${url}" controls></audio>`
    :kind==="video"?`<video src="${url}" controls></video>`
    :`<div class="document-preview-unavailable"><span>${documentTypeVisual(file.name)}</span><h3>Vista previa no disponible</h3><p>Este formato no puede mostrarse dentro del navegador, pero puedes descargarlo o imprimirlo con su aplicación correspondiente.</p></div>`;
  const shell=document.createElement("div");shell.id="documentPreview";shell.className="document-preview-shell";
  shell.innerHTML=`<div class="document-preview-backdrop" data-close-preview></div><section class="document-preview-card" role="dialog" aria-modal="true" aria-labelledby="documentPreviewTitle"><header><div><p class="eyebrow">VISTA PRELIMINAR</p><h2 id="documentPreviewTitle">${escapeHtml(file.name)}</h2><small>${file.size?new Intl.NumberFormat("es-ES",{maximumFractionDigits:1}).format(file.size/1024)+" KB":"Documento"}</small></div><button type="button" data-close-preview aria-label="Cerrar">×</button></header><div class="document-preview-body ${kind}">${content}</div><footer><button type="button" class="secondary-button" data-close-preview>Cerrar</button><button type="button" class="secondary-button" id="printPreviewDocument">⌁ Imprimir</button><button type="button" class="primary blue-button" id="downloadPreviewDocument">↓ Descargar</button></footer></section>`;
  document.body.appendChild(shell);
  shell.querySelectorAll("[data-close-preview]").forEach(button=>button.addEventListener("click",closeDocumentPreview));
  shell.querySelector("#downloadPreviewDocument").addEventListener("click",()=>{const link=document.createElement("a");link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove()});
  const printButton=shell.querySelector("#printPreviewDocument");
  if(kind==="other"||kind==="audio"||kind==="video"){printButton.disabled=true;printButton.title="Este formato necesita su aplicación para imprimirse"}else printButton.addEventListener("click",()=>printPreviewDocument(file,url,kind));
  const escapeHandler=event=>{if(event.key==="Escape"){document.removeEventListener("keydown",escapeHandler);closeDocumentPreview()}};
  document.addEventListener("keydown",escapeHandler);
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
    openDocumentPreview(file);
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
    await addDocumentsToCurrentFolder(await Promise.all(fileHandles.map(sourceHandle=>sourceHandle.getFile())),true);
  }catch(error){
    if(error.name!=="AbortError") alert("No se pudieron añadir los documentos. Comprueba el permiso de escritura.");
  }
}

async function addDocumentsToCurrentFolder(files,permissionGranted=false){
  if(!currentDirectoryHandle||!files.length)return;
  try{
    if(!permissionGranted&&await currentDirectoryHandle.requestPermission({mode:"readwrite"})!=="granted")return;
    for(const file of files)await copyNamedFile(file,currentDirectoryHandle,file.name);
    const destination=currentDirectoryHandle.name;
    await offerClientDocumentVisibility(files);
    await displayFolder(currentDirectoryHandle,activeFolderConfig,true);
    alert(files.length===1?`Documento guardado en “${destination}”.`:`${files.length} documentos guardados en “${destination}”.`);
  }catch(error){
    if(error.name!=="AbortError")alert("No se pudieron guardar los documentos. Comprueba el permiso de escritura de la carpeta.");
  }
}

function currentDocumentClientName(){if(activeFolderConfig?.storageKey!=="clients-folder"||!folderHistory.length)return"";return folderHistory.length===1?currentDirectoryHandle?.name||"":folderHistory[1]?.name||""}
async function offerClientDocumentVisibility(files){
  const clientName=currentDocumentClientName();if(!clientName)return;
  try{const clients=await getAllClientMetadata(),client=clients.find(item=>clientIdentity(item)===clientName);if(!client?.appAccessEnabled)return;
    const visible=confirm(files.length===1?`¿Quieres que “${files[0].name}” sea visible para el cliente en su aplicación?`:`¿Quieres que estos ${files.length} documentos sean visibles para el cliente en su aplicación?`);if(!visible)return;
    const existing=Array.isArray(client.portalDocuments)?client.portalDocuments:[],basePath=currentDirectoryHandle?.path||currentDirectoryHandle?.name||clientName,now=new Date().toISOString(),added=files.map(file=>({name:file.name,path:remotePath(basePath,file.name),visible:true,addedAt:now}));
    const merged=[...existing.filter(item=>!added.some(document=>document.path===item.path)),...added];await saveClientMetadata({...client,portalDocuments:merged});
  }catch(error){console.warn("No se pudo guardar la visibilidad del documento",error)}
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

const webdavFolderMap={
  "clients-folder":"CLIENTES",
  "signatures-folder":"FIRMAS DIGITALES",
  "courtesy-folder":"DIAS DE CORTESIA",
  "declarations-folder":"DECLARACIONES",
  "annual-closings-folder":"CIERRES ANUALES"
};
let webdavStatusCache={checked:0,connected:false};
function remotePath(parent,name){return [parent,name].filter(Boolean).join("/")}
async function webdavResponse(url,options={}){
  const response=await fetch(url,{...options,credentials:"same-origin"});
  if(!response.ok){const result=await response.json().catch(()=>({}));const error=new Error(result.error||"No se pudo acceder al servidor.");error.status=response.status;throw error}
  return response;
}
async function webdavConnected(force=false){
  if(!force&&Date.now()-webdavStatusCache.checked<15000)return webdavStatusCache.connected;
  try{await webdavResponse("/api/webdav/status",{cache:"no-store"});webdavStatusCache={checked:Date.now(),connected:true}}
  catch{webdavStatusCache={checked:Date.now(),connected:false}}
  return webdavStatusCache.connected;
}
class WebDavFileHandle{
  constructor(path,name){this.kind="file";this.path=path;this.name=name;this.remote=true}
  async queryPermission(){return await webdavConnected()?"granted":"denied"}
  async requestPermission(){return this.queryPermission()}
  async getFile(){
    const response=await webdavResponse(`/api/webdav/file?path=${encodeURIComponent(this.path)}`,{cache:"no-store"}),blob=await response.blob();
    return new File([blob],this.name,{type:blob.type||"application/octet-stream",lastModified:Date.now()});
  }
  async createWritable(){
    const chunks=[],handle=this;
    return {async write(value){chunks.push(value)},async close(){const blob=new Blob(chunks),response=await webdavResponse(`/api/webdav/file?path=${encodeURIComponent(handle.path)}`,{method:"PUT",headers:{"Content-Type":blob.type||"application/octet-stream"},body:blob});return response.ok},async abort(){chunks.length=0}};
  }
}
class WebDavDirectoryHandle{
  constructor(path,name){this.kind="directory";this.path=path;this.name=name;this.remote=true}
  async queryPermission(){return await webdavConnected()?"granted":"denied"}
  async requestPermission(){return this.queryPermission()}
  async *values(){
    const response=await webdavResponse(`/api/webdav/list?path=${encodeURIComponent(this.path)}`,{cache:"no-store"}),{entries=[]}=await response.json();
    for(const entry of entries){const childPath=remotePath(this.path,entry.name);yield entry.kind==="directory"?new WebDavDirectoryHandle(childPath,entry.name):new WebDavFileHandle(childPath,entry.name)}
  }
  async getDirectoryHandle(name,options={}){
    const childPath=remotePath(this.path,name);
    if(options.create)await webdavResponse("/api/webdav/directory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:childPath})});
    else await webdavResponse(`/api/webdav/stat?path=${encodeURIComponent(childPath)}`,{cache:"no-store"});
    return new WebDavDirectoryHandle(childPath,name);
  }
  async getFileHandle(name,options={}){
    const childPath=remotePath(this.path,name);
    if(!options.create)await webdavResponse(`/api/webdav/stat?path=${encodeURIComponent(childPath)}`,{cache:"no-store"});
    return new WebDavFileHandle(childPath,name);
  }
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
  if(handle?.remote)return;
  const db=await folderDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction("handles","readwrite");
    tx.objectStore("handles").put(handle,key);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function getSavedHandle(key){
  if(webdavFolderMap[key]&&await webdavConnected())return new WebDavDirectoryHandle(webdavFolderMap[key],webdavFolderMap[key]);
  const db=await folderDb();
  return new Promise((resolve,reject)=>{
    const request=db.transaction("handles","readonly").objectStore("handles").get(key);
    request.onsuccess=()=>resolve(request.result||null);
    request.onerror=()=>reject(request.error);
  });
}

async function remoteMetadata(kind,method="GET",record){return apiJson(`/api/metadata/${kind}`,method==="GET"?{}:{method,body:JSON.stringify(record)})}
async function saveSignatureMetadata(data){const d=await folderDb();await new Promise((ok,no)=>{const tx=d.transaction("signatureMetadata","readwrite");tx.objectStore("signatureMetadata").put(data);tx.oncomplete=()=>{d.close();ok()};tx.onerror=()=>no(tx.error)});try{await remoteMetadata("signatures","PUT",data)}catch{}}
async function deleteSignatureMetadata(id){const d=await folderDb();return new Promise((ok,no)=>{const tx=d.transaction("signatureMetadata","readwrite");tx.objectStore("signatureMetadata").delete(id);tx.oncomplete=()=>{d.close();ok()};tx.onerror=()=>no(tx.error)})}
async function getLocalMetadata(store){const d=await folderDb();return new Promise((ok,no)=>{const r=d.transaction(store,"readonly").objectStore(store).getAll();r.onsuccess=()=>{d.close();ok(r.result||[])};r.onerror=()=>no(r.error)})}
async function getMergedMetadata(kind,store){const local=await getLocalMetadata(store);let remote=[];try{remote=await remoteMetadata(kind)}catch{return local}const map=new Map(remote.map(item=>[item.id,item]));for(const item of local)if(!map.has(item.id)){map.set(item.id,item);remoteMetadata(kind,"PUT",item).catch(()=>{})}return [...map.values()]}
async function getAllSignatureMetadata(){return getMergedMetadata("signatures","signatureMetadata")}

async function saveClientMetadata(data){if(data.personType==='juridica'&&data.administratorPartnerId!==undefined){const administrator=data.partners?.find(p=>p.id===data.administratorPartnerId);data={...data,administrators:administrator?.name||'',representative:administrator?.name||'',representativeNif:administrator?.dni?.toUpperCase()||''}}const d=await folderDb();await new Promise((ok,no)=>{const tx=d.transaction("clientMetadata","readwrite");tx.objectStore("clientMetadata").put(data);tx.oncomplete=()=>{d.close();ok()};tx.onerror=()=>no(tx.error)});await remoteMetadata("clients","PUT",data)}
async function getAllClientMetadata(){return getMergedMetadata("clients","clientMetadata")}

function escapeHtml(value){
  const node=document.createElement("div");
  node.textContent=value;
  return node.innerHTML;
}

document.querySelectorAll(".sidebar nav button").forEach(button=>button.addEventListener("click",()=>{
  document.querySelector(".sidebar nav button.active")?.classList.remove("active");
  button.classList.add("active");
  syncMobileNavigation(button.dataset.title);
  closeMenu();
  if(views[button.dataset.title]) renderFolderView(button.dataset.title);
  else if(button.dataset.title==="Firmas digitales") renderSignatures();
  else if(button.dataset.title==="Holded") renderHolded();
  else if(button.dataset.title==="Declaraciones") renderDeclarations();
  else if(button.dataset.title==="Historial declaraciones") renderDeclarationHistory();
  else if(button.dataset.title==="Trabajadores") renderWorkers();
  else if(button.dataset.title==="Tareas") renderTasks();
  else if(button.dataset.title==="Calendario") renderCalendar();
  else if(button.dataset.title==="Renta") renderRenta();
  else if(button.dataset.title==="Contactos") renderContacts();
  else if(button.dataset.title==="Días de cortesía") renderCourtesyDays();
  else if(button.dataset.title==="Cierres anuales") renderAnnualClosings();
  else if(button.dataset.title==="Gestión") openProtectedManagement();
  else if(button.dataset.title==="Trabajos") renderWorkProcedures();
  else{
    main.innerHTML=homeMarkup;
    bindHeader();
    const title=document.querySelector("#pageTitle");
    if(title) title.textContent=button.dataset.title;
    if(button.dataset.title==="Inicio")initHome();
  }
}));


const chatWorkers=["Manuel Molinero","Álvaro Molinero","Francisco Molinero","Araceli Frías","Jesús Carratalá"];
let activeChatWorker=null;
let recentChatItems=[];
let chatUnreadCount=0;
const chatCache=new Map();

function workerInitials(name){return name.split(" ").slice(0,2).map(part=>part[0]).join("").toUpperCase()}
function chatMessageTime(value){if(!value)return"";return new Intl.DateTimeFormat("es-ES",{hour:"2-digit",minute:"2-digit"}).format(new Date(value))}
function getChatMessages(name){return chatCache.get(name)||[]}
function chatMessagesMarkup(messages,name){return messages.length?messages.map(message=>{const outgoing=message.senderId===signedInUser?.id,read=outgoing&&Boolean(message.readAt);return `<div class="chat-message ${outgoing?"outgoing":"incoming"}"><p>${escapeHtml(message.text)}</p><time>${escapeHtml(chatMessageTime(message.createdAt))}${outgoing?`<span class="chat-read-ticks${read?" read":""}" title="${read?"Leído":"Enviado"}" aria-label="${read?"Leído":"Enviado"}">${read?"✓✓":"✓"}</span>`:""}</time></div>`}).join(""):`<div class="chat-empty"><span>✦</span><strong>Inicia la conversación</strong><small>Escribe el primer mensaje para ${escapeHtml(name)}.</small></div>`}
function updateChatUnreadBadge(){
  const launcher=document.querySelector("#chatLauncher");if(!launcher)return;
  let badge=launcher.querySelector(".chat-unread-badge");
  if(!chatUnreadCount){badge?.remove();launcher.setAttribute("aria-label","Abrir chat de trabajadores");return}
  if(!badge){badge=document.createElement("span");badge.className="chat-unread-badge";launcher.appendChild(badge)}
  badge.textContent=chatUnreadCount>99?"99+":String(chatUnreadCount);launcher.setAttribute("aria-label",`${chatUnreadCount} mensajes sin leer`);
}
async function refreshChatData(refreshOpenConversation=true){
  if(!signedInUser)return;
  try{
    const records=await apiJson("/api/chat/recent");
    recentChatItems=records.map(item=>({worker:teamUsers.find(user=>user.id===item.otherId)?.name||item.otherId,message:item.message,unreadCount:Number(item.unreadCount)||0}));
    chatUnreadCount=recentChatItems.reduce((total,item)=>total+item.unreadCount,0);updateChatUnreadBadge();
    renderHomeActivityRail();
    if(refreshOpenConversation&&activeChatWorker&&document.querySelector("#chatPanel")?.classList.contains("open"))await refreshOpenChatMessages(activeChatWorker);
    else if(refreshOpenConversation&&!activeChatWorker&&document.querySelector("#chatContent"))renderChatContacts();
  }catch{}
}

async function refreshOpenChatMessages(name){
  const messagesBox=document.querySelector("#chatMessages");
  if(!messagesBox||activeChatWorker!==name)return;
  const user=workerByNameOrId(name);
  const messages=await apiJson(`/api/chat/messages?with=${encodeURIComponent(user?.id||name)}`);
  if(activeChatWorker!==name)return;
  const previous=getChatMessages(name);
  chatCache.set(name,messages);
  await apiJson("/api/chat/read",{method:"POST",body:JSON.stringify({withUserId:user?.id||name})});
  const unchanged=previous.length===messages.length&&previous.every((message,index)=>message.id===messages[index]?.id&&message.text===messages[index]?.text&&message.readAt===messages[index]?.readAt);
  if(unchanged||activeChatWorker!==name)return;
  const stayAtBottom=messagesBox.scrollHeight-messagesBox.scrollTop-messagesBox.clientHeight<80;
  messagesBox.innerHTML=chatMessagesMarkup(messages,name);
  if(stayAtBottom)messagesBox.scrollTop=messagesBox.scrollHeight;
}

function createWorkerChat(){
  const widget=document.createElement("div");
  widget.className="worker-chat";
  widget.innerHTML=`
    <div class="ai-launchers">
      <button class="perplexity-launcher" id="perplexityLauncher" type="button" aria-label="Abrir Perplexity" title="Perplexity">
        <img src="/perplexity-logo.png" alt="" aria-hidden="true">
      </button>
      <button class="chatgpt-launcher" id="chatgptLauncher" type="button" aria-label="Abrir ChatGPT" title="ChatGPT">
        <img src="/chatgpt-logo.svg" alt="" aria-hidden="true">
      </button>
    </div>
    <button class="chat-launcher" id="chatLauncher" type="button" aria-label="Abrir chat de trabajadores">
      <span class="chat-launcher-icon">✉</span><span class="chat-launcher-label">Chat</span>
    </button>
    <section class="chat-panel" id="chatPanel" aria-hidden="true">
      <header class="chat-header chat-team-header"><div class="chat-brand"><img class="chat-brand-logo" src="data:image/png;base64,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" alt="Molinero"><div><span class="chat-kicker">EQUIPO</span><h2>Chat de trabajadores</h2></div></div><button id="closeChat" type="button" aria-label="Cerrar chat">×</button></header>
      <div id="chatContent"></div>
    </section>
    <section class="chat-panel perplexity-panel" id="perplexityPanel" aria-hidden="true">
      <header class="chat-header perplexity-header"><div><span class="chat-kicker">ASISTENTE WEB</span><h2>Perplexity</h2></div><button id="closePerplexity" type="button" aria-label="Cerrar Perplexity">×</button></header>
      <div class="perplexity-toolbar"><p><strong>Pregunta directamente a Perplexity</strong><small>Inicia sesión si te lo solicita.</small></p><a href="https://www.perplexity.ai/" target="_blank" rel="noopener noreferrer">Abrir aparte ↗</a></div>
      <div class="perplexity-frame-wrap"><iframe data-src="https://www.perplexity.ai/" title="Perplexity" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-read; clipboard-write"></iframe><div class="perplexity-frame-help"><strong>¿No aparece Perplexity?</strong><span>La web puede impedir que se muestre dentro de otras aplicaciones.</span><a href="https://www.perplexity.ai/" target="_blank" rel="noopener noreferrer">Abrir Perplexity en otra pestaña</a></div></div>
    </section>
    <section class="chat-panel chatgpt-panel" id="chatgptPanel" aria-hidden="true">
      <header class="chat-header chatgpt-header"><div><span class="chat-kicker">ASISTENTE IA</span><h2>ChatGPT</h2></div><button id="closeChatgpt" type="button" aria-label="Cerrar ChatGPT">×</button></header>
      <div class="chatgpt-toolbar"><p><strong>Consulta tus dudas en ChatGPT</strong><small>El acceso se realiza de forma segura en la web oficial de OpenAI.</small></p><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Iniciar sesión / Abrir ↗</a></div>
      <div class="chatgpt-frame-wrap"><iframe data-src="https://chatgpt.com/" title="ChatGPT" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-read; clipboard-write"></iframe><div class="chatgpt-frame-help"><img src="/chatgpt-logo.svg" alt=""><strong>Inicia sesión para consultar</strong><span>Por seguridad, escribe tu usuario y contraseña únicamente en la página oficial de ChatGPT.</span><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Iniciar sesión y abrir ChatGPT</a></div></div>
    </section>`;
  document.body.appendChild(widget);
  document.querySelector("#chatLauncher").addEventListener("click",toggleWorkerChat);
  document.querySelector("#perplexityLauncher").addEventListener("click",togglePerplexity);
  document.querySelector("#chatgptLauncher").addEventListener("click",toggleChatgpt);
  document.querySelector("#closeChat").addEventListener("click",closeWorkerChat);
  document.querySelector("#closePerplexity").addEventListener("click",closePerplexity);
  document.querySelector("#closeChatgpt").addEventListener("click",closeChatgpt);
  renderChatContacts();
}

function toggleWorkerChat(){
  closePerplexity();
  closeChatgpt();
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
function togglePerplexity(){
  closeWorkerChat();
  closeChatgpt();
  const panel=document.querySelector("#perplexityPanel");
  const opening=!panel.classList.contains("open");
  if(opening){const frame=panel.querySelector("iframe");if(!frame.src)frame.src=frame.dataset.src}
  panel.classList.toggle("open",opening);
  panel.setAttribute("aria-hidden",String(!opening));
  document.querySelector("#perplexityLauncher").classList.toggle("active",opening);
}
function closePerplexity(){
  const panel=document.querySelector("#perplexityPanel");  if(!panel)return;
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden","true");
  document.querySelector("#perplexityLauncher")?.classList.remove("active");
}
function toggleChatgpt(){
  closeWorkerChat();
  closePerplexity();
  const panel=document.querySelector("#chatgptPanel");
  const opening=!panel.classList.contains("open");
  if(opening){const frame=panel.querySelector("iframe");if(!frame.src)frame.src=frame.dataset.src}
  panel.classList.toggle("open",opening);
  panel.setAttribute("aria-hidden",String(!opening));
  document.querySelector("#chatgptLauncher").classList.toggle("active",opening);
}
function closeChatgpt(){
  const panel=document.querySelector("#chatgptPanel");if(!panel)return;
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden","true");
  document.querySelector("#chatgptLauncher")?.classList.remove("active");
}
function renderChatContacts(){
  activeChatWorker=null;
  const content=document.querySelector("#chatContent");
  const contacts=chatWorkers.filter(name=>name!==signedInUser?.name);
  content.innerHTML=`<div class="chat-intro"><strong>¿A quién quieres escribir?</strong><span>Los mensajes llegan a la cuenta personal de cada trabajador.</span></div><div class="chat-contacts">${contacts.map(name=>{const unread=recentChatItems.find(item=>item.worker===name)?.unreadCount||0;return `<button type="button" data-chat-worker="${escapeHtml(name)}"${unread?` aria-label="${escapeHtml(name)}, ${unread} ${unread===1?"mensaje sin leer":"mensajes sin leer"}"`:""}><span class="chat-avatar">${workerInitials(name)}</span><span><strong>${escapeHtml(name)}</strong><small class="${unread?"has-unread":""}">${unread?`${unread} ${unread===1?"mensaje sin leer":"mensajes sin leer"}`:"Abrir conversación"}</small></span>${unread?`<span class="chat-contact-unread">${unread>99?"99+":unread}</span>`:""}<b>›</b></button>`}).join("")}</div>`;
  content.querySelectorAll("[data-chat-worker]").forEach(button=>button.addEventListener("click",()=>renderConversation(button.dataset.chatWorker)));
}
async function renderConversation(name,focus=true){
  activeChatWorker=name;
  const content=document.querySelector("#chatContent");
  content.innerHTML=`<div class="conversation-bar"><button id="chatBack" type="button" aria-label="Volver">←</button><span class="chat-avatar">${workerInitials(name)}</span><div><strong>${escapeHtml(name)}</strong><small>Conversación privada</small></div></div><div class="chat-messages"><div class="chat-empty"><span>···</span><strong>Cargando conversación</strong></div></div>`;
  document.querySelector("#chatBack").addEventListener("click",renderChatContacts);
  try{const user=workerByNameOrId(name),messages=await apiJson(`/api/chat/messages?with=${encodeURIComponent(user?.id||name)}`);chatCache.set(name,messages);await apiJson("/api/chat/read",{method:"POST",body:JSON.stringify({withUserId:user?.id||name})});refreshChatData(false)}catch{}
  if(activeChatWorker!==name)return;
  const messages=getChatMessages(name);
  content.innerHTML=`
    <div class="conversation-bar"><button id="chatBack" type="button" aria-label="Volver">←</button><span class="chat-avatar">${workerInitials(name)}</span><div><strong>${escapeHtml(name)}</strong><small>Conversación privada</small></div></div>
    <div class="chat-messages" id="chatMessages">${chatMessagesMarkup(messages,name)}</div>
    <form class="chat-composer" id="chatForm"><textarea id="chatMessage" rows="1" maxlength="500" placeholder="Escribe un mensaje…" required></textarea><button type="submit" aria-label="Enviar mensaje">➤</button></form>
    <p class="chat-note">Conversación vinculada a ${escapeHtml(signedInUser?.name||"tu usuario")} y ${escapeHtml(name)}.</p>`;
  document.querySelector("#chatBack").addEventListener("click",renderChatContacts);
  document.querySelector("#chatForm").addEventListener("submit",sendChatMessage);
  if(focus)document.querySelector("#chatMessage").focus();
  const box=document.querySelector("#chatMessages");box.scrollTop=box.scrollHeight;
}
async function sendChatMessage(event){
  event.preventDefault();
  const input=document.querySelector("#chatMessage"),button=event.currentTarget.querySelector("button");
  const text=input.value.trim();
  if(!text||!activeChatWorker)return;
  button.disabled=true;
  try{await apiJson("/api/chat/messages",{method:"POST",body:JSON.stringify({recipientId:workerByNameOrId(activeChatWorker)?.id,text})});await renderConversation(activeChatWorker);refreshChatData()}
  catch(reason){alert(reason.message)}finally{button.disabled=false}
}

createWorkerChat();
setInterval(()=>{if(signedInUser)refreshChatData()},10000);
setInterval(()=>{if(signedInUser)loadSharedTasks()},15000);
setInterval(()=>{if(signedInUser)refreshBillingData()},15000);
initHome();
