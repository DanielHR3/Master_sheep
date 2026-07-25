# Estrategia Multi-Cliente y Arquitectura para "Pie de Cría"

Este documento describe la arquitectura y los pasos de implementación para adaptar **SheepMaster** a un nuevo cliente enfocado en "Pie de Cría", sin afectar el código base ni la experiencia del usuario original (Rancho Don Pablito).

## 1. Arquitectura: Un Solo Código, Múltiples "Sabores" (Feature Flags)

Para evitar la duplicación de código y el mantenimiento de múltiples repositorios, se adoptará un enfoque de **Feature Flags** (Interruptores de Características) en tiempo de compilación.

Se definirán variables de entorno en el Frontend para identificar el tipo de cliente y el tipo de ganado. Por ejemplo:
- `VITE_APP_CLIENT_TYPE`: Puede ser `DON_PABLITO` o `PIE_DE_CRIA`.
- `VITE_APP_LIVESTOCK_TYPE`: Puede ser `SHEEP` (Borregos) o `COW` (Vacas).

**Variaciones resultantes:**
1. **Don Pablito (Original):** `CLIENT_TYPE=DON_PABLITO`, `LIVESTOCK_TYPE=SHEEP`. La interfaz mostrará las opciones originales (ej. "Pisos Elevados") y ocultará módulos no relevantes.
2. **Nuevo Cliente (Borregos):** `CLIENT_TYPE=PIE_DE_CRIA`, `LIVESTOCK_TYPE=SHEEP`. La interfaz habilitará módulos avanzados de genética (genealogía profunda), ocultará elementos innecesarios para rebaños pequeños y usará terminología de borregos.
3. **Nuevo Cliente (Vacas):** `CLIENT_TYPE=PIE_DE_CRIA`, `LIVESTOCK_TYPE=COW`. Igual que el anterior, pero adaptando la terminología a vacas/becerros en todo el sistema.

## 2. Cambios en la Base de Datos (Backend - SQLite)

Se mantendrá un único esquema maestro de base de datos (`app.go`). Los nuevos campos serán llenados por el cliente de Pie de Cría, y permanecerán como `NULL` o valores por defecto para Don Pablito. Al ser una base de datos local SQLite, los datos de los clientes están físicamente separados y jamás se cruzarán.

### 2.1. Tabla `animales`
Nuevas columnas a agregar:
- `abuelo_paterno_id` (TEXT)
- `abuela_paterna_id` (TEXT)
- `abuelo_materno_id` (TEXT)
- `abuela_materna_id` (TEXT)
- `tipo_parto` (TEXT) - Ej. 'Sencillo', 'Doble'
- `metodo_concepcion` (TEXT) - Ej. 'Monta Natural', 'Inseminación Artificial', 'Parto Inducido'

## 3. Cambios en el Frontend (React)

- **Condicionales de Renderizado:** Se envolverán componentes específicos bajo sentencias lógicas.
  ```tsx
  {clientType === 'DON_PABLITO' && <SeccionPisosElevados />}
  {clientType === 'PIE_DE_CRIA' && <SeccionGenealogia />}
  ```
- **Perfil del Animal:** Se rediseñará la vista de detalles para incluir un "Árbol Genealógico" interactivo, donde al ingresar el arete del animal, se consulte la API para traer a padres y abuelos en una sola vista estructurada.

## 4. Cambios en la API (`api_server.go`)

- Modificar los endpoints de consulta de animales (`/api/animals`) para hacer un JOIN o subconsultas que extraigan el árbol genealógico completo de hasta 2 niveles de profundidad (Padres -> Abuelos).

## 5. Escalabilidad Futura (Vacas vs Borregos)

Al utilizar variables de entorno, la plataforma está preparada para un futuro `VITE_APP_LIVESTOCK_TYPE=COW` que permita cambiar la terminología de "Borrego" a "Vaca", "Cordero" a "Becerro", etc., reutilizando todo el sistema de inventario, salud y alimentación.
