# Documentación Técnica - SheepMaster
## Sistema de Gestión Ganadera (Wails Desktop Edition)

### 1. Stack Tecnológico
- **Frontend:** React + Vite (TypeScript, Vanilla CSS, Lucide Icons).
- **Backend:** Go 1.22+.
- **Database:** SQLite (modernc.org/sqlite - driver puro de Go).
- **Framework de Escritorio:** Wails v2 (Vite Bridge).

---

### 2. Estructura del Proyecto
- `frontend/`: Aplicación React.
- `app.go`: Lógica principal del sistema (Inyección de DB, Handlers de Wails).
- `api_server.go`: Servidor REST paralelo para soporte web/móvil.
- `main.go`: Punto de entrada y configuración de la ventana Wails.
- `wailsjs/`: Enlaces automáticos generados por Wails entre Go y JS.

---

### 3. Persistencia de Datos
El sistema utiliza una base de datos SQLite local para garantizar el funcionamiento offline.
- **Ruta Windows:** `%USERPROFILE%\Documents\SheepMaster\sheepmaster.db`
- **Driver:** SQLite (No requiere instalaciones adicionales en el SO).
- **Esquema:** El sistema inicializa automáticamente las tablas en el primer arranque (`initDB` en `app.go`).

---

### 4. Requerimientos de Despliegue (Producción)
Para distribuir el ejecutable en sistemas Windows:
- **WebView2:** El usuario final debe tener instalado el runtime de WebView2 (estándar en Windows 10/11 actualizado).
- **Arquitectura:** Compilado nativamente para `windows/amd64`.

---

### 5. Comandos de Desarrollo
- **Entorno de Desarrollo:** `wails dev` (Activa Hot Reload en Frontend y Backend).
- **Compilación Final:** `wails build -clean`.
- **Limpieza de Caché:** `taskkill /F /IM sheepmaster.exe` (necesario si el proceso queda bloqueado durante el build).

---

### 6. Consideraciones de Seguridad
- Las contraseñas se almacenan cifradas utilizando `bcrypt`.
- La aplicación maneja sesiones locales en el frontend utilizando `localStorage` para el estado de login.

---
*Desarrollado con ❤️ por DanielHR3*
