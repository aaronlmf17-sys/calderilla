# Librerías incluidas en la app (sin CDN)

Se sirven desde la propia app para no ejecutar código descargado de internet.
Las sumas SHA-256 están en `CHECKSUMS.sha256`.

| Archivo | Origen | Notas |
|---|---|---|
| `xlsx.full.min.js` | SheetJS 0.20.3 (npm `@e965/xlsx@0.20.3`) | Comprobado byte a byte contra `cdn.sheetjs.com/xlsx-0.20.3`. Corrige CVE-2023-30533 y CVE-2024-22363 de la 0.18.5 |
| `tesseract/tesseract.min.js`, `tesseract/worker.min.js` | npm `tesseract.js@5.1.1` | |
| `tesseract/tesseract-core-*-lstm.wasm.js` | npm `tesseract.js-core@5.1.1` | Motor OCR (con y sin SIMD) |
| `capacitor.js` | npm `@capacitor/core@8.6.0` | |

El diccionario de español del OCR (datos, no código) se descarga de
`cdn.jsdelivr.net/npm/@tesseract.js-data/spa/4.0.0_best_int`, versión fija.
