# Landing page pública de SheepMaster — diseño

**Fecha:** 2026-09-11
**Estado:** aprobado por el usuario el 2026-09-11 (con la demo por correo, ver §6); pendiente de plan de implementación
**Alcance:** una página pública de ventas servida por la propia app en Cloud Run, con formulario de contacto por correo y enlace para agendar demo. Sin dominio propio todavía.

## 1. Objetivo

Atraer ranchos nuevos (dueños de ranchos ovinos, administradores y MVZ) y convertirlos en una demo agendada o un contacto por correo. El argumento de venta tiene dos partes que hoy son verdad y que casi nadie más puede decir:

1. **Funciona sin internet en el corral** y se respalda solo al llegar a casa (sincronización real, verificada 2026-09-11).
2. **Se ajusta a cada rancho**: el mismo sistema corre un negocio de engorda (Rancho Don Pablito) y uno de pie de cría (Rancho Las Bugambilias) con pantallas y reglas distintas.

Buyer persona y mensaje central vienen de `CAMPANA_MARKETING_DIGITAL.md` (vault). La landing es el paso 3 de esa campaña.

## 2. Dónde vive y cómo se navega

- La app no usa enrutador y no se agrega uno. La decisión se toma en `App.tsx` a partir de `window.location.pathname` y del estado de sesión:
  - `/` sin sesión y sin la marca local `sheepmaster_seen_app` → **Landing**.
  - `/` sin sesión con la marca → **Login** (un operador que ya usó la app no paga un clic extra).
  - `/login` sin sesión → **Login**.
  - Cualquier ruta con sesión válida → panel (comportamiento actual).
- La marca `sheepmaster_seen_app` se escribe en `localStorage` al iniciar sesión con éxito.
- "Iniciar sesión" en la landing navega a `/login` con `history.pushState` y re-render (sin recarga). El botón "Volver" del navegador funciona por el evento `popstate`.
- El servidor ya hace SPA fallback (`/login` sirve `index.html`); no cambia.
- El build de escritorio (Wails) y el servidor local en modo móvil sirven el mismo frontend; la regla de la marca local evita que el personal vea la landing más de una vez.

## 3. Estructura de la página

Una sola página con scroll, móvil primero (la mayoría llegará desde el teléfono vía Facebook). Orden y contenido:

1. **Barra fija.** Logo SheepMaster a la izquierda. A la derecha: "Iniciar sesión" (texto) y "Agenda una demo" (botón esmeralda). En móvil, solo el botón y un icono de acceso.
2. **Hero (fondo oscuro).** Titular: "Registra en el corral sin señal. Se respalda solo al llegar a casa." Subtítulo: control de pesajes, tratamientos, reproducción y genealogía de tu hato ovino, hecho a la medida de tu rancho. Botones: "Agenda una demo" y "Ver cómo funciona" (ancla a la sección 4). A la derecha (abajo en móvil): video corto en bucle de la app registrando un pesaje sin conexión y sincronizando.
3. **A la medida de tu rancho.** Dos tarjetas lado a lado (apiladas en móvil):
   - **Engorda** (inspirado en Rancho Don Pablito): captura del semáforo de venta. Beneficios: sabes qué borregos ya dan el peso y la edad de venta; no gastas alimento en animales que ya deberían salir; ocupación de corrales de un vistazo.
   - **Pie de cría** (inspirado en Rancho Las Bugambilias): captura del árbol genealógico. Beneficios: padres, abuelos y método de concepción de cada animal; alertas de destete y pesaje a 150 días; diagnóstico de gestación y partos con historial.
   - Los nombres de los ranchos se muestran solo si el usuario confirma que tiene permiso; por defecto se usa "un rancho de engorda en Jalisco"/"un rancho de pie de cría" (texto configurable en el componente).
4. **Lo que ves cada mañana.** Tres bloques alternando texto y medio:
   - Semáforo de venta (video corto).
   - Agenda sanitaria con periodo de retiro (captura).
   - Árbol genealógico con fotos (captura).
5. **Quiénes somos.** Misión, visión y valores (sección 8) en tres columnas cortas, con la línea "Plataforma agrotech desarrollada en México".
6. **Cómo empezamos.** Tres pasos: ajustamos el sistema a tu forma de trabajar; pasamos tu libreta o Excel al sistema; capacitamos a tu equipo en menos de una hora.
7. **Contacto.** Un solo formulario (nombre, rancho, teléfono, correo, mensaje) con la casilla "Quiero una demo en vivo"; al marcarla aparece el campo "Fecha y horario que te acomoda" (texto libre). Al lado, tarjeta "Prefieres verlo en vivo" cuyo botón marca la casilla y enfoca el formulario.
8. **Pie.** Logo, "Iniciar sesión", correo de contacto, año.

Vocabulario: nada de "JARVIS", "Terminal Táctica" ni "Hernia Protect". Se habla de borregos, corrales, pesos, ventas y partos.

## 4. Identidad visual

- Paleta del estándar Executive Panther (vault): fondo `slate-950` en hero, sección "Quiénes somos" y pie; secciones intermedias en claro (`slate-50`/blanco) para que respire y se lea al sol. `emerald-500` es el único color de acción (botones). Cian solo en acentos pequeños (iconos, subrayados). Rosa aparece únicamente dentro de la captura del semáforo.
- Tipografía: la misma display que ya usa el panel para titulares; cuerpo en la sans actual.
- **Banner original.** No se usa `agrotech_banner.jpg` ni imágenes de stock (procedencia desconocida). El banner del hero es SVG/CSS propio: degradado oscuro, siluetas geométricas sutiles y el video/captura real de la app como protagonista. Cero riesgo de derechos de autor.
- **Marca.** La marca visible es **SheepMaster**. "Agrotech" se usa solo como descriptor en minúsculas ("plataforma agrotech"), nunca como logotipo: es un término genérico ya usado por terceros en México (agrotech.mx, comunidad Agrotech México). Pendiente del usuario: búsqueda en MARCANET (IMPI) de "SheepMaster" (clases 9 y 42) antes de invertir en anuncios; existe un "Sheep Master Gold" en EE. UU.
- Título, descripción y etiquetas Open Graph en `index.html`; imagen de vista previa (`/landing/og.png`, captura del panel con el titular) para que el enlace se vea bien al compartirlo por WhatsApp.

## 5. Formulario de contacto (backend)

- **Endpoint:** `POST /api/contact`, público, sin sesión. Cuerpo JSON: `nombre`, `rancho`, `telefono`, `correo`, `mensaje`, `quiere_demo` (bool), `horario_preferido`, `website` (campo trampa: debe venir vacío).
- **Validación:** nombre y (correo o teléfono) obligatorios; correo con formato válido si viene; longitudes máximas (nombre 120, rancho 120, teléfono 30, correo 160, mensaje 2000). Campo trampa lleno → responder 200 sin guardar ni enviar (el bot no se entera).
- **Límite por IP:** 5 envíos por hora por dirección (`X-Forwarded-For` primero, luego `RemoteAddr`), reutilizando el patrón de `ratelimit.go`.
- **Persistencia primero:** tabla nueva `leads` (id, nombre, rancho, telefono, correo, mensaje, quiere_demo, horario_preferido, origen_ip, created_at, notified_at NULL) en `createSchema()`. Se inserta antes de intentar el correo; así ningún contacto se pierde. Mientras no exista `SMTP_PASSWORD`, los contactos se consultan en la tabla `leads` de Supabase (o se piden a Claude, que puede leerlos con la cadena de conexión local).
- **Correo después:** SMTP de Gmail (`smtp.gmail.com:587`, STARTTLS) con `net/smtp` de la librería estándar; sin dependencias nuevas. Remitente y destinatario: `danielhrubio3@gmail.com`. Asunto: `Nuevo contacto SheepMaster: <nombre> (<rancho>)`, o `Solicitud de DEMO SheepMaster: <nombre> (<rancho>)` cuando `quiere_demo` es verdadero; en ese caso el cuerpo incluye el horario preferido al inicio. Cuerpo en texto plano con todos los campos. Si el envío tiene éxito se marca `notified_at`; si falla se registra en el log y el visitante igual recibe "recibido" (el lead ya está guardado). Un envío tarda hasta 10 s; se hace en una goroutine para no bloquear la respuesta.
- **Configuración por entorno:** `SMTP_USER`, `SMTP_PASSWORD` (Secret Manager `sheepmaster-smtp-password`, contraseña de aplicación de Google; requiere verificación en dos pasos en la cuenta), `CONTACT_TO`. Sin `SMTP_PASSWORD` el endpoint guarda y no envía, con un aviso en el log al arrancar.
- **Respuesta:** `{"ok": true}`. El frontend muestra "Recibido, te escribimos en menos de 24 horas".
- **Pruebas:** la función de envío se define como interfaz `mailSender`; en pruebas se usa una falsa. Se prueba: inserción del lead, campo trampa, validación, límite por IP, y que un fallo de correo no cambia la respuesta.
- **Seguridad:** ya cubierto por CSP (`form-action 'self'`), cabeceras y CORS restringido. No se guarda nada del lead en `localStorage`.

## 6. Agendar demo

- **Ahora:** "Agenda una demo" no sale de la página. Todos los botones con ese texto llevan al formulario de contacto con la casilla "Quiero una demo en vivo" marcada y enfocan el campo de horario preferido. La solicitud llega por correo (sección 5) con asunto distinguible.
- **Después (opcional):** cuando el usuario cree un horario de citas en Google Calendar, el servidor expondrá `GET /api/landing-config` → `{"bookingUrl": "<DEMO_BOOKING_URL>"}` leído del entorno. Si la variable existe, los botones abren esa página en pestaña nueva; si no, se comportan como hoy. El endpoint y la lectura en el frontend se implementan desde el inicio (son diez líneas) para que activar la reserva sea solo configurar la variable en Cloud Run.

## 7. Material visual (producción propia)

- **Datos de demostración:** script en Go (`scratch/demo_data`, no se publica) que llena una base SQLite local con un hato realista: ~60 animales (Dorper, Katahdin, Pelibuey), corrales con distinta ocupación, pesajes en el tiempo con GDP, tratamientos con periodo de retiro, eventos reproductivos, diagnósticos, partos y una genealogía de tres generaciones con fotos de muestra generadas (siluetas SVG, no fotos ajenas). Se ejecuta contra la app de escritorio en modo local (`SERVER_ONLY=true` con `HOME` temporal), igual que en la verificación de sincronización.
- **Grabación:** script Playwright (Node, ya instalado en el repo) que inicia sesión, recorre los flujos y graba video (`recordVideo`) a 1280×800 y capturas a 2x. Flujos: (a) registrar pesaje sin conexión y ver la cola sincronizarse al reconectar; (b) semáforo de venta; (c) agenda sanitaria; (d) árbol genealógico. Móvil: capturas a 390×844.
- **Postproceso:** `ffmpeg` recorta y convierte a MP4 (H.264, sin audio, ≤ 2 MB cada uno, 8-12 s) y genera un póster PNG por video. Los videos usan `autoplay muted loop playsinline` y `preload="metadata"`.
- **Ubicación:** `frontend/public/landing/` (videos, capturas, `og.png`, banner SVG). Servidos por el mismo servidor; CSP ya permite `'self'`.
- Foto real de rancho: el usuario aportará una si quiere; hasta entonces el hero usa el banner original y el video.

## 8. Quiénes somos (propuesta de texto, a ajustar por el usuario)

- **Misión.** Poner en manos de los ranchos ovinos de México una herramienta que funcione donde están los animales, sin internet ni complicaciones, para que cada decisión de venta, salud y cría se tome con datos y no de memoria.
- **Visión.** Ser la plataforma de referencia para la ganadería ovina en Latinoamérica: un sistema que se adapta a cada rancho, crece con él y convierte la libreta del corral en la base de un negocio rentable.
- **Objetivo.** Que ningún borrego listo para venta se quede en el corral, que ningún tratamiento se olvide y que cada animal tenga su historia completa, desde sus abuelos hasta su último pesaje.
- **Valores.**
  - *Sencillez:* si no se entiende con guantes puestos y sol de frente, no sirve.
  - *A la medida:* cada rancho trabaja distinto; el sistema se ajusta al rancho, no al revés.
  - *Confiabilidad:* los datos se guardan primero en tu equipo y se respaldan solos; nunca dependes de la señal.
  - *Cercanía:* te capacitamos en persona y respondemos cuando lo necesitas.

## 9. Fuera de alcance

Dominio propio, analítica y píxeles de anuncios, prueba gratuita automática, versión en inglés, blog, y el arreglo del scroll horizontal del panel (se atiende aparte).

## 10. Pruebas y verificación

- Go: pruebas unitarias del endpoint de contacto (sección 5) y de `landing-config`; `go test ./...`, `go vet`, `govulncheck` y ambos builds en verde.
- Frontend: `tsc --noEmit` sin errores; `npm run build`; prueba manual con Playwright de la lógica de enrutado (visitante nuevo ve landing; tras iniciar sesión y cerrarla, ve login; `/login` directo funciona) y del formulario (envío real a Gmail una vez en producción, con `SMTP_PASSWORD` configurada).
- Accesibilidad básica: contraste AA en textos sobre oscuro, etiquetas en todos los campos, navegación por teclado en la barra.
- Rendimiento en móvil: página inicial < 1.5 MB sin contar videos; videos con carga diferida.
