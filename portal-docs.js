// Documentos pendientes de revisar en las carpetas de clientes con aplicación.
// La primera vez que se revisa un cliente se toma una "foto" de lo que ya hay (queda oculto);
// todo lo que aparezca después sin una decisión (visible u oculto) cuenta como pendiente.
"use strict";
const fs = require("fs");
const path = require("path");

module.exports = function createPortalDocs({ dataDirectory, davRequest, parseDavEntries, webdavProperties, loadMetadata }) {
  const baselineFile = path.join(dataDirectory, "portal-docs-baseline.json");
  const cache = new Map();
  const CACHE_MS = 60 * 1000;

  function loadBaselines() { try { return JSON.parse(fs.readFileSync(baselineFile, "utf8")) || {}; } catch { return {}; } }
  function saveBaselines(data) {
    fs.mkdirSync(dataDirectory, { recursive: true });
    const tmp = `${baselineFile}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 }); fs.renameSync(tmp, baselineFile);
  }
  const identity = client => client?.id || client?.name || "";
  const appClients = () => loadMetadata().clients.filter(c => c && c.active !== false && c.appAccessEnabled);

  async function listFiles(root) {
    const files = [], queue = [[root, 0]]; let folders = 0;
    while (queue.length && folders < 400 && files.length < 5000) {
      const [dir, depth] = queue.shift(); folders++;
      const response = await davRequest(dir, { method: "PROPFIND", headers: { Depth: "1", "Content-Type": "application/xml" }, body: webdavProperties });
      for (const entry of parseDavEntries(await response.text(), dir)) {
        const entryPath = `${dir}/${entry.name}`;
        if (entry.kind === "directory") { if (depth < 10) queue.push([entryPath, depth + 1]); }
        else if (!entry.name.startsWith(".") && !/^(thumbs\.db|desktop\.ini)$/i.test(entry.name)) files.push({ name: entry.name, path: entryPath, modified: entry.modified || "", size: entry.size || 0 });
      }
    }
    return files;
  }

  async function pendingFor(client, refresh = false) {
    const name = identity(client), cached = cache.get(name);
    if (!refresh && cached && Date.now() - cached.at < CACHE_MS) return cached.items;
    const files = await listFiles(`CLIENTES/${name}`);
    const baselines = loadBaselines();
    if (!baselines[name]) { baselines[name] = { taken: new Date().toISOString(), paths: files.map(f => f.path) }; saveBaselines(baselines); }
    const known = new Set(baselines[name].paths || []);
    const decided = new Set((Array.isArray(client.portalDocuments) ? client.portalDocuments : []).map(d => d.path));
    const items = files.filter(f => !known.has(f.path) && !decided.has(f.path)).map(f => ({ ...f, folder: f.path.split("/").slice(2, -1).join(" / ") }));
    cache.set(name, { at: Date.now(), items });
    return items;
  }

  async function pending(clientName, refresh = false) {
    const clients = appClients().filter(c => !clientName || identity(c) === clientName);
    const result = {};
    for (const client of clients) {
      try { result[identity(client)] = await pendingFor(client, refresh); }
      catch (error) { result[identity(client)] = { error: error.message }; }
    }
    return result;
  }
  return { pending, invalidate: name => (name ? cache.delete(name) : cache.clear()) };
};
