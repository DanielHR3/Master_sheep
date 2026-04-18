# Guía de Gestión de Perfiles: Master Sheep

Esta guía describe cómo administrar el acceso del personal a la plataforma Master Sheep, asegurando que la información sensible (costos y reportes financieros) esté protegida y que el trabajo de campo sea fluido.

## 1. Jerarquía de Roles

| Rol | Usuario Típico | Permisos Clave |
| :--- | :--- | :--- |
| **Dueño (Owner)** | Propietario del Rancho | Acceso total, gestión de costos, reportes de ventas, borrado de registros, gestión de usuarios. |
| **Caporal (Foreman)** | Administrador de Campo | Gestión de inventario, registro de preñez, movimientos de corral, altas/bajas de animales. |
| **Operario (Staff)** | Personal Operativo | Consulta de aretes, registro de partos, confirmación de ultrasonidos sencillos. |

---

## 2. Proceso de Alta de Personal

Para agregar un nuevo trabajador al sistema:

1. **Registro en Supabase Auth**:
   - Accede al panel de **Authentication** en tu proyecto de Supabase.
   - Crea un nuevo usuario con el correo institucional del trabajador.
   - *Nota*: En el futuro, esto se podrá hacer desde una vista de "Administración" dentro de la App.

2. **Asignación de Rol**:
   - En la tabla `profiles`, busca el ID del nuevo usuario.
   - Cambia el valor de la columna `role` a: `'owner'`, `'foreman'` o `'worker'`.

---

## 3. Seguridad a Nivel de Datos (RLS)

Incluso si un usuario avanzado intentara acceder a datos de otro rancho, el sistema lo bloquea automáticamente mediante **Row Level Security (RLS)**.

- **Políticas**: Las tablas `animales`, `eventos_reproductivos` y `movimientos` están configuradas para que un usuario solo pueda ver registros asociados a su ID de usuario raíz (el del dueño).
- **Herencia**: Los operarios "heredan" la visibilidad del dueño bajo el cual están registrados.

---

## 4. Preguntas Frecuentes

**¿Qué pasa si un operario pierde su celular en el campo?**
> Solo es necesario desactivar su cuenta en el panel de Supabase. Ningún dato se pierde ya que todo se sincroniza en tiempo real con la nube.

**¿Puede un Caporal ver cuánto costó una borrega?**
> No. La vista de "Costos y Finanzas" está bloqueada por rol y solo es accesible para el perfil 'Owner'.

---
> [!NOTE]
> Esta configuración garantiza que Master Sheep sea una herramienta profesional apta para ranchos con múltiples niveles de mando.
