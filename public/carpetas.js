/* Carpetas nuevas dentro de los clientes: en la carpeta del cliente y en cualquier subcarpeta (p. ej. CONTABILIDAD/2023)
   se pueden crear carpetas, que se crean al momento en el servidor. Al crearla se pregunta si el cliente podrá verla
   en su aplicación; la decisión se guarda en la ficha (portalFolders) y se puede cambiar con el ojo de cada carpeta.
   Se carga después de app.js. */
(() => {
  if (typeof renderEntries !== "function") return;
  const EYE = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const HIDDEN = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  const insideClient = () => activeFolderConfig?.storageKey === "clients-folder" && currentDirectoryHandle?.remote && folderHistory.length >= 1;
  const clientRecord = async name => (await getAllClientMetadata()).find(c => clientIdentity(c) === name);
  const hiddenPaths = record => (record?.portalFolders || []).filter(f => f.visible === false).map(f => f.path);
  const hiddenBy = (path, hidden) => hidden.find(h => path === h || path.startsWith(h + "/"));

  async function saveFolderVisibility(clientName, path, name, visible) {
    const record = await clientRecord(clientName); if (!record) throw new Error("No se encontró la ficha del cliente.");
    const entry = { path, name, visible: Boolean(visible), decidedAt: new Date().toISOString(), decidedBy: signedInUser?.name || "" };
    await saveClientMetadata({ ...record, portalFolders: [...(record.portalFolders || []).filter(f => f.path !== path), entry] });
  }

  // Botón «Nueva carpeta» junto a «Añadir documentación»
  function ensureButton() {
    const actions = document.querySelector(".folder-actions"); if (!actions) return;
    let button = actions.querySelector("#newFolderButton");
    if (!button) {
      button = document.createElement("button"); button.type = "button"; button.id = "newFolderButton"; button.className = "upload-button new-folder-button";
      button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M12 11v5M9.5 13.5h5"/></svg><span>Nueva carpeta</span>';
      button.addEventListener("click", openCreateFolder);
      (actions.querySelector("#uploadFiles") || actions.lastElementChild)?.before(button);
    }
    button.hidden = !insideClient();
  }

  // Ojo en cada carpeta: visible u oculta para el cliente
  let turn = 0;
  async function decorate() {
    const mine = ++turn; ensureButton();
    const grid = document.querySelector("#folderGrid"); if (!grid || !insideClient()) return;
    const clientName = currentDocumentClientName(); if (!clientName) return;
    let record; try { record = await clientRecord(clientName); } catch { return; }
    if (mine !== turn || !record) return;
    const hidden = hiddenPaths(record), base = currentDirectoryHandle.path || "";
    grid.querySelectorAll(".folder-card").forEach(card => {
      const entry = currentEntries[Number(card.dataset.index)]; card.querySelector(".cf-ojo")?.remove();
      if (entry?.kind !== "directory") return;
      const path = remotePath(base, entry.name), by = hiddenBy(path, hidden), inherited = by && by !== path, visible = !by;
      const eye = document.createElement("span"); eye.className = `cf-ojo${visible ? " cf-si" : ""}${inherited ? " cf-heredado" : ""}`; eye.innerHTML = visible ? EYE : HIDDEN;
      eye.title = inherited ? "Oculta para el cliente porque una carpeta superior está oculta" : visible ? "El cliente ve esta carpeta · pulsa para ocultarla" : "Oculta para el cliente · pulsa para que la vea";
      if (!inherited) {
        eye.setAttribute("role", "button"); eye.tabIndex = 0;
        const toggle = async event => {
          event.preventDefault(); event.stopPropagation();
          const show = !visible, ok = await appConfirm({ eyebrow: "APLICACIÓN DEL CLIENTE", title: show ? "¿Mostrar esta carpeta al cliente?" : "¿Ocultar esta carpeta al cliente?", subtitle: `${clientName} · ${entry.name}`, message: show ? "El cliente verá en su aplicación los documentos visibles de esta carpeta." : "El cliente dejará de ver esta carpeta y todo lo que tenga dentro.", ok: show ? "Sí, que la vea" : "Sí, ocultarla", cancel: "Cancelar" });
          if (!ok) return;
          eye.classList.add("cf-guardando");
          try { await saveFolderVisibility(clientName, path, entry.name, show); } catch (error) { alert(error.message); }
          decorate();
        };
        eye.addEventListener("click", toggle); eye.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") toggle(event); });
      }
      card.append(eye);
    });
  }

  function openCreateFolder() {
    if (!insideClient()) return;
    document.querySelector("#newFolderModal")?.remove();
    const clientName = currentDocumentClientName(), base = currentDirectoryHandle.path || "", where = base.split("/").slice(1).join(" / ") || clientName;
    const shell = document.createElement("div"); shell.id = "newFolderModal"; shell.className = "nf-shell";
    shell.innerHTML = `<div class="nf-backdrop" data-nf-close></div><form class="nf-card" role="dialog" aria-modal="true" aria-labelledby="nfTitle">
      <p class="eyebrow">NUEVA CARPETA</p><h3 id="nfTitle">Crear carpeta</h3><p class="nf-where">Dentro de <b>${escapeHtml(where)}</b></p>
      <label><span>Nombre de la carpeta</span><input name="folder" maxlength="80" required autocomplete="off" placeholder="Ej.: ESCRITURAS"></label>
      <p class="nf-error" role="alert"></p>
      <div class="nf-actions"><button type="button" class="nf-cancel" data-nf-close>Cancelar</button><button type="submit" class="nf-ok">Crear carpeta</button></div></form>`;
    document.body.append(shell);
    const close = () => shell.remove(), input = shell.querySelector("input"), error = shell.querySelector(".nf-error");
    shell.querySelectorAll("[data-nf-close]").forEach(b => b.onclick = close);
    shell.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
    input.focus();
    shell.querySelector("form").onsubmit = async event => {
      event.preventDefault(); error.textContent = "";
      const name = input.value.replace(/\s+/g, " ").trim();
      if (!name) return void (error.textContent = "Escribe el nombre de la carpeta.");
      if (/[\\/:*?"<>|#%]/.test(name) || /^\.+$/.test(name)) return void (error.textContent = "El nombre no puede llevar estos caracteres: \\ / : * ? \" < > | # %");
      if (currentEntries.some(e => e.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"))) return void (error.textContent = "Ya hay una carpeta o un archivo con ese nombre aquí.");
      const ok = shell.querySelector(".nf-ok"); ok.disabled = true; ok.textContent = "Creando…";
      const parent = currentDirectoryHandle, config = activeFolderConfig;
      try { await parent.getDirectoryHandle(name, { create: true }); }
      catch (reason) { ok.disabled = false; ok.textContent = "Crear carpeta"; error.textContent = reason?.message || "No se pudo crear la carpeta en el servidor."; return; }
      close();
      const path = remotePath(base, name);
      const visible = await appConfirm({ eyebrow: "APLICACIÓN DEL CLIENTE", title: "¿Quieres que esta carpeta la vea el cliente?", subtitle: `${clientName} · ${name}`, message: "Podrás cambiarlo cuando quieras con el ojo de la carpeta.", ok: "Sí, que la vea", cancel: "No, solo el despacho" });
      try { await saveFolderVisibility(clientName, path, name, visible); } catch (reason) { alert(`La carpeta se ha creado, pero no se pudo guardar si la ve el cliente: ${reason.message}`); }
      if (currentDirectoryHandle === parent) await displayFolder(parent, config, true);
    };
  }

  const previous = renderEntries;
  renderEntries = function () { const result = previous.apply(this, arguments); decorate(); return result; };
  window.folderHiddenForClient = hiddenBy;
})();
