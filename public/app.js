const sidebar=document.querySelector("#sidebar");
const overlay=document.querySelector("#overlay");
const main=document.querySelector("main");
const homeMarkup=main.innerHTML;
let currentFolders=[];

document.querySelector("#menu").addEventListener("click",openMenu);
overlay.addEventListener("click",closeMenu);

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
  "Firmas digitales":{
    eyebrow:"FIRMAS DIGITALES",
    title:"Carpetas de firmas digitales",
    description:"Consulta y busca la documentación preparada para firma.",
    button:"Conectar carpeta Firmas digitales",
    path:"la carpeta de firmas digitales",
    storageKey:"signatures-folder",
    itemLabel:"Carpeta de firma"
  }
};

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
        <div><strong id="folderName">${name}</strong><span id="folderCount">0 carpetas</span></div>
        <label class="client-search"><span aria-hidden="true">⌕</span><input id="clientSearch" type="search" placeholder="Buscar…" aria-label="Buscar en ${name}"></label>
      </div>
      <div class="folder-grid" id="folderGrid">
        <div class="empty folder-empty"><span>▤</span><h4>Carpeta aún no conectada</h4><p>Pulsa “${config.button}” y selecciona ${config.path}.</p></div>
      </div>
    </section>`;
  bindHeader();
  document.querySelector("#connectFolder").addEventListener("click",()=>connectFolder(config));
  document.querySelector("#clientSearch").addEventListener("input",filterFolders);
  restoreFolder(config);
}

async function connectFolder(config){
  if(!("showDirectoryPicker" in window)){
    alert("Esta función necesita Google Chrome o Microsoft Edge en el ordenador.");
    return;
  }
  try{
    let handle=await getSavedHandle(config.storageKey);
    if(handle){
      const permission=await handle.requestPermission({mode:"read"});
      if(permission!=="granted") handle=null;
    }
    if(!handle) handle=await window.showDirectoryPicker({mode:"read"});
    await saveHandle(config.storageKey,handle);
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
      await displayFolder(handle,config);
    }else{
      document.querySelector("#folderStatus").textContent="Carpeta guardada. Pulsa el botón para volver a autorizar el acceso.";
      document.querySelector("#connectFolder").textContent="Autorizar carpeta guardada";
    }
  }catch(error){
    console.warn("No se pudo restaurar la carpeta",error);
  }
}

async function displayFolder(handle,config){
  const folders=[];
  for await(const entry of handle.values()){
    if(entry.kind==="directory") folders.push(entry.name);
  }
  folders.sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));
  currentFolders=folders;
  document.querySelector("#folderName").textContent=handle.name;
  document.querySelector("#folderStatus").textContent="Carpeta conectada y guardada. La lista refleja las subcarpetas actuales.";
  document.querySelector("#connectFolder").textContent="Cambiar carpeta";
  document.querySelector("#clientSearch").value="";
  renderCards(folders,config.itemLabel);
}

function renderCards(folders,itemLabel){
  document.querySelector("#folderCount").textContent=`${folders.length} ${folders.length===1?"carpeta":"carpetas"}`;
  document.querySelector("#folderGrid").innerHTML=folders.length
    ? folders.map(name=>`<button class="folder-card" data-client="${escapeHtml(name.toLocaleLowerCase("es"))}"><span class="folder-icon">▰</span><span><strong>${escapeHtml(name)}</strong><small>${itemLabel}</small></span></button>`).join("")
    : `<div class="empty folder-empty"><span>▤</span><h4>No hay carpetas</h4><p>La carpeta seleccionada no contiene subcarpetas.</p></div>`;
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
    : `${cards.length} ${cards.length===1?"carpeta":"carpetas"}`;
}

function folderDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open("app-am-folders",1);
    request.onupgradeneeded=()=>request.result.createObjectStore("handles");
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
  else{
    main.innerHTML=homeMarkup;
    bindHeader();
    const title=document.querySelector("#pageTitle");
    if(title) title.textContent=button.dataset.title;
  }
}));
