# Calderilla en Google Play: qué poner en cada pantalla

Guía para cuando Google verifique tu identidad. Todo en **prueba interna**: solo la ven las personas que invites.

## 1. Crear la app
**Inicio → Crear aplicación**
- Nombre: `Calderilla`
- Idioma predeterminado: Español (España)
- Aplicación o juego: Aplicación
- Gratis o de pago: Gratis
- Marca las dos declaraciones (políticas del programa y leyes de exportación).

## 2. Subir la primera versión (prueba interna)
1. En GitHub: **Actions → Paquete para Google Play (AAB) → Run workflow**. Cuando termine (unos 5 minutos), descarga **calderilla-aab** de la sección *Artifacts* y descomprímelo; dentro está `calderilla.aab`.
2. En Play Console: **Probar y publicar → Pruebas → Prueba interna → Crear versión**.
3. Si pregunta por la firma de apps, deja **la que gestiona Google (Firma de aplicaciones de Google Play)**. `calderilla.aab` va firmado con tu clave, que pasa a ser la *clave de subida*.
4. Sube `calderilla.aab`. Nombre de la versión: lo que proponga. Notas: `Primera versión de prueba.`
5. Guarda. Aún no la publiques: antes hay que completar el contenido de la app (punto 4).

## 3. Testers
**Prueba interna → Testers → Crear lista de correo**
- Nombre: `Amigos`
- Añade los Gmail de cada persona, separados por comas.
- Copia el **enlace para unirse** y pásaselo. Lo abren desde el móvil, aceptan y les lleva a la Play Store para instalar.

## 4. Contenido de la aplicación (Política → Contenido de la aplicación)

| Apartado | Qué contestar |
|---|---|
| **Política de privacidad** | `https://aaronlmf17-sys.github.io/calderilla/privacidad.html` |
| **Acceso a la aplicación** | Toda la funcionalidad está disponible sin restricciones (no hay inicio de sesión). |
| **Anuncios** | No, mi aplicación no contiene anuncios. |
| **Clasificación de contenido** | Cuestionario → Categoría *Todas las demás aplicaciones* → contesta **No** a todo (violencia, sexo, apuestas, compras, chat…). Saldrá PEGI 3. |
| **Público objetivo** | 18 años o más. |
| **Aplicación de noticias** | No. |
| **Aplicaciones gubernamentales** | No. |
| **Funciones financieras** | Marca solo *Herramientas de gestión de finanzas personales / presupuestos* (si aparece). No ofrece préstamos, pagos, criptomonedas ni banca. |
| **Salud** | Ninguna. |
| **Seguridad de los datos** | Ver punto 5. |

## 5. Seguridad de los datos
- ¿Tu app recopila o comparte alguno de los tipos de datos de usuario requeridos? → **No**.
  - Es correcto porque nada sale del móvil: Google solo cuenta como "recopilado" lo que se envía fuera del dispositivo.
- (Si lo pregunta) ¿Los datos se cifran en tránsito? → No aplica, no se transmiten datos.
- (Si lo pregunta) ¿Los usuarios pueden pedir que se eliminen? → Se borran desde la app (Ajustes → Borrar todo) o al desinstalarla.

## 6. Ficha de Play Store (Hacer crecer → Presencia en la tienda → Ficha principal)

**Descripción breve** (máx. 80):
```
Apunta tus gastos en dos segundos y descubre en qué se te va el dinero.
```

**Descripción completa:**
```
Calderilla te ayuda a saber en qué gastas y a ahorrar, sin complicaciones ni registros.

• Apunta como hablas: escribe "café 1,80" o "súper 45 ayer" y listo.
• Automático: lee los avisos de tu banco (pagos, Bizum, transferencias) y apunta los gastos solo. Sin dar claves ni conectar con tu banco.
• Foto del ticket: haz una foto y lee el total por ti.
• Atajos inteligentes: tus gastos habituales a un toque, según la hora y el día.
• Suscripciones al descubierto: detecta pagos fijos como Netflix o el gimnasio y te dice cuánto te cuestan al año.
• Dónde ahorrar: te enseña tus gastos hormiga y cuánto ahorrarías recortándolos.
• Metas de ahorro: dinos para qué ahorras y cuándo, y te decimos cuánto apartar al mes.
• Presupuestos con avisos al 80 % y al 100 %.
• Importa el extracto de tu banco (CSV o Excel).
• Categorías a tu gusto.

Privacidad de verdad: tus datos se quedan en tu móvil. Sin cuentas, sin servidores, sin anuncios.
```

**Recursos gráficos:**
- Icono 512×512: `www/icon-512.png` del repositorio.
- Gráfico de funciones 1024×500: te lo preparo si lo pide.
- Capturas de móvil: mínimo 2. Hazlas desde la app instalada.

**Categoría:** Finanzas. **Correo de contacto:** el tuyo (Google no lo hace público, porque declaraste que no eres operador).

## 7. Publicar
**Prueba interna → Revisar versión → Iniciar lanzamiento**. En unos minutos tus testers pueden instalarla.

## Importante
- Si tenías instalada la versión de GitHub, **desinstálala antes** (exporta primero tus datos desde Ajustes → Exportar). Play firma la app con otra clave y no puede actualizarse encima.
- Cada nueva versión para Play: vuelve a lanzar *Paquete para Google Play (AAB)* y sube el `.aab` en una nueva versión de prueba interna.
