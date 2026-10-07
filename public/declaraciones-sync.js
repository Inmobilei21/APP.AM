/* ===== Control de declaraciones compartido en el servidor ===== */
// La app sigue leyendo y escribiendo las filas en localStorage (claves «app-am-declaration-…»),
// pero cada escritura se envía al servidor y cada 15 segundos se recoge lo que han anotado los
// demás, de modo que todo el despacho ve lo mismo sin recargar.
(function(){
  const PREFIX="app-am-declaration-",MIGRATED="app-am-declaraciones-en-servidor",POLL_MS=15000;
  const nativeSetItem=Storage.prototype.setItem;
  let pending={},flushTimer=null,since="",started=false,applying=false,refreshWanted=false;

  Storage.prototype.setItem=function(key,value){
    nativeSetItem.call(this,key,value);
    if(applying||this!==window.localStorage||!String(key).startsWith(PREFIX))return;
    try{pending[key]=JSON.parse(value)}catch{return}
    clearTimeout(flushTimer);flushTimer=setTimeout(flush,300);
  };
  async function flush(){
    const records=pending;pending={};if(!Object.keys(records).length)return;
    try{
      const response=await fetch("/api/declaraciones",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({records})});
      if(!response.ok)throw new Error(String(response.status));
      apply((await response.json()).records,false);
    }catch{pending={...records,...pending};clearTimeout(flushTimer);flushTimer=setTimeout(flush,10000)}
  }
  // Guarda en este navegador lo que viene del servidor; si cambia algo, refresca la pantalla abierta.
  function apply(records,refresh){
    let changed=false;applying=true;
    try{for(const [key,record] of Object.entries(records||{})){if(pending[key])continue;const value=JSON.stringify(record?.data||{});if(localStorage.getItem(key)!==value){nativeSetItem.call(localStorage,key,value);changed=true}}}
    finally{applying=false}
    if(changed&&refresh)refreshOpenView();
  }
  function editing(){const active=document.activeElement;return Boolean(active&&active.closest?.(".tax-table, .td-shell")&&/^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName))}
  function refreshOpenView(){
    if(editing()){refreshWanted=true;return}
    refreshWanted=false;
    try{
      if(document.querySelector("#taxRows")&&typeof loadTaxModel==="function")loadTaxModel(activeTaxModel);
      else if(document.querySelector("#historyTaxRows")&&typeof loadHistoricalModel==="function")loadHistoricalModel(activeHistoryModel);
      else if(document.querySelector("#tdMain")&&typeof renderTaxDraftMain==="function")renderTaxDraftMain();
    }catch(error){console.error("Actualizar declaraciones",error)}
  }
  document.addEventListener("focusout",()=>{if(refreshWanted)setTimeout(()=>{if(!editing())refreshOpenView()},200)});

  async function pull(){
    try{
      const response=await fetch(`/api/declaraciones${since?`?since=${encodeURIComponent(since)}`:""}`,{credentials:"same-origin",cache:"no-store"});
      if(!response.ok)return false;
      const result=await response.json();
      const first=!since;since=result.now||since;
      if(first)await migrateLocal(result.records||{});
      apply(result.records,true);
      return true;
    }catch{return false}
  }
  // La primera vez, lo que este navegador tenía anotado y el servidor aún no conoce se sube.
  async function migrateLocal(serverRecords){
    let done=false;try{done=localStorage.getItem(MIGRATED)==="1"}catch{}
    if(done)return;
    const local={};
    for(let index=0;index<localStorage.length;index++){
      const key=localStorage.key(index);
      if(!key||!key.startsWith(PREFIX)||serverRecords[key])continue;
      try{const data=JSON.parse(localStorage.getItem(key)||"{}");if(data&&typeof data==="object"&&Object.values(data).some(value=>value!==""&&value!==false&&value!==null))local[key]=data}catch{}
    }
    if(Object.keys(local).length){
      try{
        const response=await fetch("/api/declaraciones",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({records:local})});
        if(!response.ok)return;
      }catch{return}
    }
    try{nativeSetItem.call(localStorage,MIGRATED,"1")}catch{}
  }
  async function start(){
    if(started)return;
    if(!(await pull())){setTimeout(start,5000);return}
    started=true;
    setInterval(()=>{if(!document.hidden)pull()},POLL_MS);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)pull()});
  }
  if(window.__authDecidida)start();else document.addEventListener("auth-decidida",start,{once:true});
})();
