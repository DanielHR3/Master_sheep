# Master Sheep 🐑

![Master Sheep Logo](file:///C:/Users/mocas/.gemini/antigravity/brain/e9589eef-7f5e-4f66-a6dd-723907782df3/master_sheep_logo_1775941006524.png)

**Master Sheep** es una solución Agrotech de última generación diseñada para la gestión integral de ganado ovino. Enfocada en la eficiencia operativa, el sistema permite llevar un control estricto de pesajes, eventos reproductivos, tratamientos médicos e inventarios, todo bajo una arquitectura **Offline-First**.

## 🚀 Características Principales

- **💻 App de Escritorio (Wails):** Rendimiento nativo en Windows para gestión administrativa y reportes pesados.
- **📱 PWA Mobile-Ready:** Interfaz responsiva que puede instalarse en dispositivos móviles (iPhone/Android) para uso directo en corrales.
- **📡 Arquitectura Híbrida:** 
  - **PC Mode:** Comunicación ultra-rápida vía Wails bindings.
  - **Mobile Mode:** Servidor API REST integrado en Go para sincronización local.
- **💾 Offline-First:** Diseñado para trabajar en zonas de baja conectividad (Corrales/Campo).
- **📊 Dashboard en Tiempo Real:** KPIs de fertilidad, GDP (Ganancia Diaria de Peso) y ocupación de corrales.

## 🛠️ Stack Tecnológico

- **Backend:** [Go](https://go.dev/) (Golang) + [Wails v2](https://wails.io/)
- **Frontend:** [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling:** Vanilla CSS + [TailwindCSS v4](https://tailwindcss.com/)
- **Database:** SQLite (Persistencia Local)
- **Mobile Support:** Vite PWA Plugin + API Server Bridge

## ⚙️ Instalación y Desarrollo

### Requisitos Previos
- Go 1.18+
- Node.js & npm
- Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### Ejecución en Desarrollo
Para iniciar el entorno de desarrollo con Hot Reload:
```bash
wails dev
```

### Acceso desde Móvil
1. Asegúrate de que tu PC y tu móvil estén en la misma red.
2. Identifica la IP local de tu computadora.
3. En tu móvil, accede a `http://[TU-IP]:5173`.
4. El servidor API de Go escuchará automáticamente en el puerto `8080`.

## 🏗️ Construcción para Producción

Para generar el ejecutable de Windows (.exe):
```bash
wails build
```

## 🔐 Credenciales por Defecto
- **Email:** `admin@rancho-legacy.com`
- **Password:** `admin123`

---
*Desarrollado para Rancho Don Pablito - Master Sheep Enterprise.*
