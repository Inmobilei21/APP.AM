# APP AM

## Lector de facturas con IA

El botón "Procesar facturas" lee PDFs, fotos, XML y TXT con la API de Claude y rellena el borrador del Excel. Para activarlo, añade en Railway la variable `ANTHROPIC_API_KEY` (y opcionalmente `ANTHROPIC_MODEL`, por defecto `claude-sonnet-5`). Sin la clave, la app sigue usando el lector anterior (pdf.js + Tesseract).

## Marta Wellness

App aparte en `/marta/` (archivos en `public/marta/`): entrenamiento por máquinas con progreso semanal, dieta y lista de la compra semanal. Se instala en el móvil desde el navegador (Añadir a pantalla de inicio) con su propio icono MW. Los datos se guardan en el móvil de quien la usa. Las máquinas del gimnasio y la dieta se cambian en `public/marta/data.js`.
