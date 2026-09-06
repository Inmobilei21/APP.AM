const sidebar=document.querySelector("#sidebar");
const overlay=document.querySelector("#overlay");
const main=document.querySelector("main");
const homeMarkup=main.innerHTML;

document.querySelector("#menu").addEventListener("click",()=>{sidebar.classList.add("open");overlay.classList.add("show")});
overlay.addEventListener("click",closeMenu);

function closeMenu(){sidebar.classList.remove("open");overlay.classList.remove("show")}

function bindHeader(){
  document.querySelector("#menu")?.addEventListener("click",()=>{sidebar.classList.add("open");overlay.classList.add("show")});
}

function renderClients(){
  main.innerHTML=`
    <header>
      <button class="menu" id="menu" aria-label="Abrir menú">☰</button>
      <div><p class="eyebrow">GESTIÓN DEL DESPACHO</p><h1>Clientes</h1></div>
      <button class="profile"><span>AM</span><span class="profile-copy"><strong>Mi cuenta</strong><small>Administrador</small></span></button>
    </header>
    <section class="clients-head">
      <div><p class="eyebrow">ARCHIVO DE CLIENTES</p><h2>Carpetas de clientes</h2><p id="folderStatus">Conecta la carpeta del escritorio para consultar tus clientes.</p></div>
      <button class="primary blue-button" id="connectFolder">Conectar carpeta Clientes</button>
    </section>
    <section class="folder-panel">
      <div class="folder-toolbar"><strong id="folderName">Gestión / Clientes</strong><span id="folderCount">0 carpetas</span></div>
      <div class="folder-grid" id="folderGrid">
        <div class="empty folder-empty"><span>▤</span><h4>Carpeta aún no conectada</h4><p>Pulsa “Conectar carpeta Clientes” y selecciona Escritorio → Gestión → Clientes.</p></div>
      </div>
    </section>`;
  bindHeader();
  document.querySelector("#connectFolder").addEventListener("click",connectClientsFolder);
}

async function connectClientsFolder(){
  if(!("showDirectoryPicker" in window)){
    alert("Esta función necesita Google Chrome o Microsoft Edge en el ordenador.");
    return;
  }
  try{
    const handle=await window.showDirectoryPicker({mode:"read"});
    const folders=[];
    for await(const entry of handle.values()){
      if(entry.kind==="directory") folders.push(entry.name);
    }
    folders.sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));
    document.querySelector("#folderName").textContent=handle.name;
    document.querySelector("#folderCount").textContent=`${folders.length} ${folders.length===1?"carpeta":"carpetas"}`;
    document.querySelector("#folderStatus").textContent="Carpeta conectada. La lista refleja las subcarpetas actuales.";
    document.querySelector("#folderGrid").innerHTML=folders.length
      ? folders.map(name=>`<button class="folder-card"><span class="folder-icon">▰</span><span><strong>${escapeHtml(name)}</strong><small>Carpeta de cliente</small></span></button>`).join("")
      : `<div class="empty folder-empty"><span>▤</span><h4>No hay carpetas</h4><p>La carpeta seleccionada no contiene subcarpetas de clientes.</p></div>`;
  }catch(error){
    if(error.name!=="AbortError") alert("No se pudo leer la carpeta seleccionada.");
  }
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
  if(button.dataset.title==="Clientes") renderClients();
  else {
    main.innerHTML=homeMarkup;
    bindHeader();
    const title=document.querySelector("#pageTitle");
    if(title) title.textContent=button.dataset.title;
  }
}));
