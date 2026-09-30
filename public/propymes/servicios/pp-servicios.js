// ProPymes · aviso "Servicio no contratado" del área de cliente.
// Con la imagen de ProPymes: presentaciones PDF propias y "Más información" abre, en la
// misma ventana, un formulario (nombre, servicio, correo y teléfono opcional) que llega
// al asesor como mensaje del cliente.
// Se usa en APP_PP (atributo data-siempre: todos los clientes salvo los de Molinero) y en
// APP.AM (solo cuando el cliente es de ProPymes: body.pp-propymes).
(() => {
  const BASE = "/propymes/servicios/";
  const ADVISOR = "alvaro";
  const always = document.currentScript?.hasAttribute("data-siempre");
  const active = () => always ? !document.body.classList.contains("pp-molinero") : document.body.classList.contains("pp-propymes");
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, PHONE = /^[+\d][\d\s().-]{5,19}$/;

  // Sustituye un botón por una copia sin los eventos originales.
  function swap(root, selector, handler) {
    const button = root.querySelector(selector);
    if (!button) return null;
    const fresh = button.cloneNode(true);
    fresh.addEventListener("click", handler);
    button.replaceWith(fresh);
    return fresh;
  }

  function download(service) {
    const name = clientServicePdfNames[service];
    if (!name) return downloadClientServicePdf(service);
    // En el móvil: vista previa de la presentación con botones Descargar y Compartir
    if (window.abrirPresentacionServicio && window.esMovilPresentacion?.())
      return window.abrirPresentacionServicio(service, { pdfUrl: `${BASE}pdf/${name}`, imgBase: `${BASE}img/` });
    const link = document.createElement("a");
    link.href = `${BASE}pdf/${name}`; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
  }

  function showForm(overlay, service) {
    const body = overlay.querySelector(".client-unavailable-body");
    const eyebrow = overlay.querySelector(".client-unavailable-card>header small");
    if (!body) return;
    if (eyebrow) eyebrow.textContent = "Solicitar información";
    body.classList.add("pp-srv-body");
    body.innerHTML = `<form class="pp-srv-form" novalidate>
      <div class="pp-srv-intro"><h2>Más información</h2><p>Déjanos tus datos y te contamos, sin compromiso, cómo podemos ayudarte.</p></div>
      <label><span>Nombre</span><input name="nombre" autocomplete="name" maxlength="80" required value="${escapeHtml(clientPreviewName || "")}"></label>
      <label><span>Servicio</span><input name="servicio" value="${escapeHtml(service)}" readonly tabindex="-1"></label>
      <label><span>Correo electrónico <em>obligatorio</em></span><input name="correo" type="email" inputmode="email" autocomplete="email" maxlength="120" required placeholder="nombre@empresa.es"></label>
      <label><span>Teléfono <em>opcional</em></span><input name="telefono" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="600 000 000"></label>
      <p class="pp-srv-error" role="alert" hidden></p>
      <button class="client-unavailable-primary" type="submit">Enviar solicitud</button>
      <button class="client-unavailable-secondary" type="button" data-pp-srv-back>Volver</button>
    </form>`;
    const form = body.querySelector("form"), error = form.querySelector(".pp-srv-error");
    form.querySelector("[data-pp-srv-back]").addEventListener("click", () => openClientUnavailable(service));
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const value = key => form.elements[key].value.trim();
      const nombre = value("nombre"), correo = value("correo"), telefono = value("telefono");
      const problem = !nombre ? ["nombre", "Escribe tu nombre."]
        : !EMAIL.test(correo) ? ["correo", "Escribe un correo electrónico válido."]
        : telefono && !PHONE.test(telefono) ? ["telefono", "Revisa el teléfono o déjalo en blanco."] : null;
      form.querySelectorAll("[aria-invalid]").forEach(input => input.removeAttribute("aria-invalid"));
      if (problem) {
        form.elements[problem[0]].setAttribute("aria-invalid", "true"); form.elements[problem[0]].focus();
        error.textContent = problem[1]; error.hidden = false; return;
      }
      error.hidden = true;
      const submit = form.querySelector("[type=submit]"); submit.disabled = true; submit.textContent = "Enviando…";
      const text = `Solicitud de información · ${service} — Nombre: ${nombre} · Correo: ${correo} · Teléfono: ${telefono || "no indicado"}`;
      try {
        await apiJson("/api/client-chat/messages", { method: "POST", body: JSON.stringify({ client: clientPreviewName, recipientId: ADVISOR, text }) });
        showThanks(overlay, service, nombre, correo);
      } catch {
        submit.disabled = false; submit.textContent = "Enviar solicitud";
        error.textContent = "No se pudo enviar la solicitud. Inténtalo de nuevo o habla con un asesor."; error.hidden = false;
      }
    });
    setTimeout(() => form.elements[form.elements.nombre.value ? "correo" : "nombre"].focus(), 60);
  }

  function showThanks(overlay, service, nombre, correo) {
    const body = overlay.querySelector(".client-unavailable-body");
    body.innerHTML = `<div class="pp-srv-done"><span aria-hidden="true">✓</span><h2>¡Gracias, ${escapeHtml(nombre.split(" ")[0])}!</h2>
      <p>Hemos recibido tu solicitud sobre <strong>${escapeHtml(service)}</strong>. Te escribiremos a <strong>${escapeHtml(correo)}</strong> muy pronto.</p>
      <button class="client-unavailable-primary" type="button">Cerrar</button></div>`;
    body.querySelector("button").addEventListener("click", () => overlay.remove());
    body.querySelector("button").focus();
  }

  const base = window.openClientUnavailable;
  if (typeof base !== "function") return;
  window.openClientUnavailable = function (service) {
    const result = base.apply(this, arguments);
    if (!active()) return result;
    const overlay = document.querySelector(".client-unavailable-overlay");
    if (!overlay) return result;
    overlay.classList.add("pp-srv");
    const header = overlay.querySelector(".client-unavailable-card>header");
    if (header && !header.querySelector(".pp-srv-logo")) header.insertAdjacentHTML("afterbegin", `<img class="pp-srv-logo" src="${BASE}logo.png" alt="ProPymes Asesores">`);
    swap(overlay, "[data-download-client-service]", () => download(service));
    const more = swap(overlay, "[data-request-client-service]", () => showForm(overlay, service));
    if (more) more.textContent = "Más información";
    return result;
  };
})();
