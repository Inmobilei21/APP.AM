/* Instalar la app en el móvil sin avisos de seguridad.
   En Android la instalación correcta es la de Google Chrome («Instalar aplicación»): Chrome crea la app con Google y
   cumple las protecciones de las versiones actuales de Android. Otros navegadores (Samsung Internet, Xiaomi, Opera…)
   generan accesos que Play Protect puede marcar como «desarrollada para una versión anterior de Android».
   Aquí se ofrece el botón de instalación de Chrome y, en otros navegadores, cómo hacerlo. Se carga después de app.js. */
(() => {
  const ua = navigator.userAgent, android = /Android/i.test(ua), ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const chrome = android && /Chrome\//.test(ua) && !/SamsungBrowser|MiuiBrowser|OPR\/|EdgA|YaBrowser|HuaweiBrowser|HeyTapBrowser|VivoBrowser|UCBrowser|Firefox/i.test(ua);
  let prompt = null;
  window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); prompt = event; document.querySelectorAll(".in-box").forEach(draw); });
  window.addEventListener("appinstalled", () => { prompt = null; document.querySelectorAll(".in-box").forEach(box => { box.innerHTML = '<p class="nt-note">App instalada. Ábrela desde el icono de la pantalla de inicio.</p>'; }); });

  function draw(box) {
    if (prompt) {
      box.innerHTML = '<div class="nt-card"><div class="nt-row"><span><strong>Instalar la app en este móvil</strong><small>Instalación oficial de Chrome, sin avisos de seguridad.</small></span></div><button type="button" class="nt-test in-go">Instalar aplicación</button></div>';
      box.querySelector(".in-go").onclick = async () => { const p = prompt; prompt = null; p.prompt(); try { await p.userChoice; } catch {} draw(box); };
      return;
    }
    if (android && !chrome) { box.innerHTML = '<p class="nt-note">Para instalar la app sin avisos de seguridad, ábrela en <b>Google Chrome</b>: menú <b>⋮</b> → <b>Instalar aplicación</b>. Si ya la instalaste desde otro navegador, desinstálala primero.</p>'; return; }
    if (android) { box.innerHTML = '<p class="nt-note">En Chrome: menú <b>⋮</b> → <b>Instalar aplicación</b> (no «Añadir a pantalla de inicio»).</p>'; return; }
    if (ios) { box.innerHTML = '<p class="nt-note">En Safari: <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>, y ábrela desde el icono.</p>'; return; }
    box.innerHTML = '<p class="nt-note">En Chrome o Edge: icono de instalar en la barra de direcciones.</p>';
  }

  if (standalone || typeof openAccountPanel !== "function") return;
  const previous = openAccountPanel;
  window.openAccountPanel = openAccountPanel = function () {
    const result = previous.apply(this, arguments);
    const slot = document.querySelector("#accountPanel .acc-slot-general");
    if (slot && !slot.querySelector(".in-box") && (android || ios || prompt)) {
      const title = document.createElement("h3"); title.className = "account-section"; title.textContent = "Instalar la app";
      const box = document.createElement("div"); box.className = "in-box"; slot.append(title, box); draw(box);
    }
    return result;
  };
})();
