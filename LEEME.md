# Calderilla 3: web + app Android que lee los avisos del banco

Un solo repositorio de GitHub con dos salidas:

- **App Android (APK):** lee las notificaciones de tu banco y apunta solos los pagos, bizums y transferencias.
- **Web instalable (GitHub Pages):** la misma app para quien use iPhone, sin la lectura automática.

Cada vez que subes un cambio a `main`, GitHub compila el APK, lo publica en *Releases* y actualiza la web. Tú no compilas nada.

---

## 1. Crear el repositorio

Créalo **público**: así tus amigos pueden descargar el APK sin cuenta de GitHub. Solo contiene código; los datos de gastos nunca salen de cada móvil.

```bash
cd calderilla-app
git init -b main
git add .
git commit -m "Calderilla 3"
git remote add origin https://github.com/TU_USUARIO/calderilla.git
git push -u origin main
```

La carpeta `secretos/` no se sube (está en `.gitignore`), y ni siquiera viene en este zip. Va aparte, en `calderilla-clave.zip`.

## 2. Guardar la clave de firma en GitHub (una sola vez)

Android solo acepta una actualización si va firmada con la misma clave que la versión instalada. La clave está en `calderilla-clave.zip`.

1. En el repositorio, ve a **Settings → Secrets and variables → Actions → New repository secret**.
2. Crea `KEYSTORE_BASE64` y pega el contenido de `secretos/KEYSTORE_BASE64.txt`.
3. Crea `KEYSTORE_PASSWORD` y pega el contenido de `secretos/KEYSTORE_PASSWORD.txt`.

⚠️ **Guarda `calderilla-clave.zip` en un sitio seguro** (gestor de contraseñas, copia en la nube). Si se pierde, la siguiente versión no podrá actualizar la que ya está instalada: habría que desinstalar, y se perderían los datos que no se hayan exportado antes.

## 3. Activar la web

Ve a **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## 4. Lanzar la compilación

Ve a **Actions → Compilar y publicar Calderilla → Run workflow**. También se lanza sola con cada `git push`. Tarda entre 5 y 8 minutos. Al acabar tendrás:

- **APK:** `https://github.com/TU_USUARIO/calderilla/releases/latest/download/calderilla.apk`. Este enlace es fijo y siempre apunta a la última versión.
- **Web:** `https://TU_USUARIO.github.io/calderilla/`. Desde un Android, en *Ajustes* sale el botón *Descargar* con el APK.

## 5. Instalar en Android

1. Abre el enlace del APK desde el móvil y descárgalo.
2. Al abrirlo, Android pedirá permitir **instalar apps de fuentes desconocidas** para Chrome. Acepta.
3. Abre Calderilla y ve a **Ajustes → Automático → Activar**.
4. Pulsa **Abrir ajustes** y activa Calderilla en «Acceso a notificaciones».
   - Si el interruptor sale gris o pone **«Ajuste restringido»** (Android 13 o superior con apps instaladas fuera de la Play Store): ve a *Ajustes → Aplicaciones → Calderilla → ⋮ → Permitir ajustes restringidos* y repite este paso.
5. En **Ajustes → Avisos → Activar** se activan el recordatorio diario y los avisos de cobros.
6. Si tienes Xiaomi, Huawei, OnePlus u Oppo, quita el ahorro de batería a Calderilla.

### Pasar los datos de la versión web a la app

En la web, *Ajustes → Exportar* descarga un `.json`. En la app, *Ajustes → Importar* y eliges ese archivo.

## Cómo funciona la lectura del banco

- Solo se leen las apps de bancos de la lista. Ya vienen incluidos BBVA, Santander, CaixaBank, imagin, ING, Openbank, Sabadell, Bankinter, EVO, Ibercaja, Revolut, N26, Wise, PayPal y Google Wallet.
- Si tu banco no reconoce los avisos, usa **Detectar mi banco (48 h)**: la app busca qué app te avisa de pagos con importe en euros y te la propone. Las notificaciones de otras apps se descartan al momento.
- Un aviso claro, como «Has pagado 12,50 € en MERCADONA», se apunta solo con su categoría. Uno dudoso queda en **📥 Por revisar**.
- Se ignoran códigos de verificación, peticiones de autorización, avisos de saldo y promociones.
- Si el mismo pago llega dos veces (por ejemplo, del banco y de Google Wallet) o ya lo apuntaste a mano, se apunta una sola vez.
- Los avisos que llegan con la app cerrada se guardan en el móvil y se procesan al abrirla.
- **Probar con una notificación** (en Ajustes) enseña cómo entiende la app un texto pegado. Si alguno sale mal, ese texto es lo que hay que añadir a `tests/run.js` para corregirlo.

## Desarrollo

| Ruta | Qué es |
|---|---|
| `www/` | La app (HTML, CSS y JS sin compilar). Es lo que se publica en la web y lo que va dentro del APK |
| `www/parser.js` | Lógica: texto natural, categorías, tickets, extractos y **notificaciones del banco** |
| `www/app.js` | Interfaz, metas, importador, integración con Android |
| `android.zip` | Proyecto nativo de Capacitor 8 (permiso de notificaciones, firma, iconos). GitHub Actions lo descomprime al compilar; para tocarlo en local, descomprímelo, cámbialo y vuelve a comprimirlo |
| `tests/run.js` | Pruebas que se ejecutan antes de compilar. Si fallan, no se publica nada |
| `.github/workflows/build.yml` | Compilación del APK y publicación de la web |

Para probar en local: `npm install && npm test`. Para abrirlo en Android Studio: `unzip android.zip && npx cap sync android && npx cap open android`.
