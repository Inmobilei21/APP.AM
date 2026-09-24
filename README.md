# APP AM

## Lector de facturas con IA

El botón "Procesar facturas" lee PDFs, fotos, XML y TXT con la API de Claude y rellena el borrador del Excel. Para activarlo, añade en Railway la variable `ANTHROPIC_API_KEY` (y opcionalmente `ANTHROPIC_MODEL`, por defecto `claude-sonnet-5`). Sin la clave, la app sigue usando el lector anterior (pdf.js + Tesseract).
