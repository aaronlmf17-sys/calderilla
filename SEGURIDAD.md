# Auditoría de seguridad de Calderilla

**Fecha:** 12/11/2026 · **Versión auditada:** 3.x (web + Android) · **Estado:** todos los hallazgos corregidos

## Alcance
- Código de la app: `www/app.js`, `www/parser.js`, `www/index.html`, `www/sw.js`.
- Plugin nativo de terceros `capacitor-notifications-listener` 0.6.1 (código Java).
- Proyecto Android: manifiesto, copias de seguridad, FileProvider y configuración de Capacitor.
- Dependencias: npm y librerías que se cargaban desde CDN.
- Compilación y publicación en GitHub Actions.

## Puertas traseras y llamadas ocultas
**No se ha encontrado ninguna.** Comprobaciones hechas:
- No hay llamadas de red a ningún servidor propio ni de terceros (`fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`).
- No se usa `eval` ni `new Function`, salvo un `new Function("return this")` inofensivo de la librería OCR para detectar el objeto global.
- No hay analítica ni rastreadores.
- El código Java del plugin no hace conexiones de red.

Lo único que se descargaba de internet eran dos librerías desde CDN. Ahora van dentro de la app (hallazgo 4).

## Hallazgos y correcciones

### 1. CRÍTICO · El plugin de notificaciones filtraba los avisos del banco a otras apps
El plugin reenviaba cada notificación leída mediante un *broadcast implícito*. Cualquier app instalada podía registrarse para recibirlo y leer el texto de tus avisos bancarios (importes, comercios, nombres de Bizum).
**Corrección:** el broadcast ahora es explícito (`setPackage`) y solo lo recibe Calderilla. El parche está en `patches/` y se aplica automáticamente en cada compilación con `patch-package`.

### 2. ALTO · Cualquier app podía inyectar notificaciones falsas
El receptor interno estaba registrado como `RECEIVER_EXPORTED`, así que otra app podía mandar "pagos" inventados que Calderilla apuntaría como gastos.
**Corrección:** el receptor es no exportado en todas las versiones de Android (`ContextCompat.RECEIVER_NOT_EXPORTED`). En Android < 13 queda protegido con un permiso de firma de la propia app.

### 3. ALTO · Inyección de código (XSS) con una copia de seguridad manipulada
Los nombres, iconos y colores de las categorías, y los identificadores de movimientos y metas, se insertaban en la página sin escapar. Un archivo `.json` manipulado (por ejemplo, uno que "te pasa un amigo") ejecutaba código al importarlo. En Android ese código habría tenido acceso al lector de notificaciones.
**Prueba:** el mismo archivo malicioso ejecutó código en 3 puntos de la versión anterior y en ninguno de la nueva.
**Corrección:**
- Todo lo que se carga o se importa pasa por una validación estricta: solo campos conocidos, con tipo, formato y longitud válidos. Se descarta lo demás, incluido `__proto__`.
- Todo dato se escapa al pintarlo en pantalla.
- Una CSP estricta (hallazgo 5) actúa como segunda barrera.

### 4. MEDIO · Librerías con vulnerabilidades conocidas y cargadas desde CDN
- SheetJS 0.18.5 (lectura de Excel) tenía dos vulnerabilidades conocidas: **CVE-2023-30533** (contaminación de prototipos al leer archivos manipulados) y **CVE-2024-22363** (ReDoS).
- Tesseract se cargaba desde CDN con versión flotante (`@5`): un cambio en el CDN habría ejecutado código nuevo dentro de la app.

**Corrección:**
- SheetJS actualizado a 0.20.3. Su huella SHA-256 se ha comprobado byte a byte contra la publicación oficial de `cdn.sheetjs.com`.
- SheetJS y Tesseract 5.1.1 (incluido el motor WebAssembly) van ahora **dentro de la app**, con sus huellas en `www/vendor/CHECKSUMS.sha256`.
- Desde internet solo se descarga el diccionario de español del OCR: son datos, no código, y con versión fija.

### 5. MEDIO · Sin política de seguridad de contenido (CSP)
**Corrección:** CSP estricta en `index.html`:
- Solo se ejecuta código de la propia app.
- Las únicas conexiones permitidas son a la propia app y al diccionario del OCR.
- No se permiten objetos, iframes ni envío de formularios.

**Prueba:** un intento de mandar datos a un dominio externo queda bloqueado.

### 6. MEDIO · La copia de seguridad en Android pasaba por el portapapeles
Otras apps (por ejemplo, teclados) pueden leer el portapapeles.
**Corrección:** la copia se guarda como archivo y se abre el menú de compartir del sistema (Drive, correo…).
Además, el FileProvider solo expone la carpeta de exportaciones; antes exponía todo el almacenamiento externo.

### 7. BAJO · El texto de las notificaciones se escribía en el registro del sistema
**Corrección:** eliminado del parche del plugin (logcat).

### 8. BAJO · Copias de seguridad de Android sin cifrar
**Corrección:**
- La copia automática en la nube de Google solo se hace si va cifrada de extremo a extremo con el bloqueo de pantalla.
- La caché nunca se copia.
- Tráfico sin cifrar (HTTP) prohibido.
- Depuración del WebView desactivada en la versión publicada.
- Retirado el permiso de cámara, que no hacía falta.

### 9. BAJO · Sin límites de tamaño en las entradas
**Corrección:** límites en el texto de las notificaciones (300 caracteres), los tickets, las copias importadas (20 MB) y los extractos (15 MB, 50.000 filas). Evitan bloqueos con archivos o textos enormes o manipulados.

### 10. BAJO · Compilación en GitHub
**Corrección:**
- Permisos mínimos por trabajo.
- Acciones de terceros fijadas a un commit concreto, no a una etiqueta que se puede mover.
- Dependencias instaladas sin ejecutar scripts de terceros (`npm ci --ignore-scripts`).
- La clave de firma se borra del disco al terminar.
- Cada APK se publica con su huella SHA-256.

## Recomendaciones que dependen de ti
1. **Activa la verificación en dos pasos** en tu cuenta de GitHub y en la de Google (la de Play Console). Quien controle esas cuentas puede publicar una actualización maliciosa que les llegaría a tus amigos. Hoy es el mayor riesgo del proyecto.
2. **Guarda la clave de firma** (`secretos/`) en un gestor de contraseñas y bórrala del escritorio cuando tengas la copia.
3. En el repositorio de GitHub, activa **Settings → Security → Dependabot alerts**, para recibir avisos si alguna dependencia publica una vulnerabilidad.
4. Pásate copias de seguridad (`.json`) solo con gente de confianza. Ahora son inofensivas, pero contienen todos tus gastos.

## Cómo repetir las pruebas
- `npm test`: lector de notificaciones y extractos.
- Ataque de copia manipulada: importar un `.json` con `<img onerror>` en nombres, iconos, colores e IDs. Resultado esperado: no se ejecuta nada y los valores se limpian.
