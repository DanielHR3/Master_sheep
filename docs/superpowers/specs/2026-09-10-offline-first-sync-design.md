# Offline-First Sync — Design

## Contexto y motivación

La documentación técnica del proyecto (`MEMORIA_TECNICA_V2.md`) describe un
`OfflineManager` "validado mediante un build limpio y listo para despliegue
en campo" que resuelve la operación sin internet en el rancho. En la
práctica, `offline_manager.go` es un placeholder (`time.Sleep(2 * time.Second)
// Simulando red`) que **nunca se instancia** en ningún punto de arranque de
la aplicación. No existe ningún mecanismo real de sincronización entre la
base de datos local (SQLite, usada por la app de escritorio Wails) y la
base de datos en la nube (Postgres/Supabase).

Este documento diseña la versión real de esa funcionalidad.

## Alcance

**Dentro de alcance:**
- La aplicación de escritorio (Wails), que es la que se usa físicamente en
  el rancho con conectividad intermitente.
- Sincronización en un solo sentido: local (SQLite) → nube (Postgres).
- Reintento automático en segundo plano (no requiere acción del usuario).

**Fuera de alcance (decisión explícita, no un olvido):**
- La versión web (Cloud Run) no necesita modo offline: si no hay internet,
  no hay forma de cargarla, así que no aplica.
- Sincronización en dos sentidos (nube → local). Se asume una sola
  persona/computadora por rancho como patrón principal de uso, por lo que
  no hay necesidad actual de traer de vuelta cambios hechos desde la web.
- Resolución de conflictos sofisticada (CRDTs, vector clocks). Se usa
  última-escritura-gana por timestamp, suficiente para el patrón de uso de
  un solo editor por rancho.

## Arquitectura

### 1. Identidad: dejar de sembrar usuarios locales independientes

Hoy, `initDB()` decide un único backend al arrancar: si `DATABASE_URL` está
presente usa Postgres, si no, usa SQLite local y **siembra sus propios
usuarios admin con UUIDs generados en ese momento** (`uuid.New().String()`).
Esos IDs no tienen ninguna relación con los UUIDs reales de esas mismas
cuentas en Supabase.

Para que sincronizar tenga sentido, la app de escritorio debe usar siempre
la identidad real de Supabase, cacheada localmente:

- **Login con internet disponible:** autentica contra Postgres (como ya
  hace `authenticate()`), y además guarda una copia cacheada del usuario
  (id, email, hash de contraseña, rol, rancho_id) en una tabla local nueva
  `cached_identity` en SQLite.
- **Login sin internet:** si Postgres no responde, busca el email en
  `cached_identity` y valida la contraseña contra el hash cacheado
  (bcrypt ya soporta esto sin cambios). Si no hay identidad cacheada para
  ese email, no se puede iniciar sesión offline (primera vez siempre
  requiere estar en línea una vez).
- Todo lo que la sesión escriba localmente (animales, tratamientos, etc.)
  usa el `rancho_id`/`user_id` de esa identidad cacheada — nunca un ID
  generado localmente.

Esto reemplaza la siembra actual de admins locales en el flujo de
escritorio; **no afecta** el modo servidor (`-tags server`), que sigue
usando Postgres directo sin caché de identidad.

### 2. Almacenamiento local: SQLite siempre, sin excepción

La app de escritorio deja de "elegir" backend. Siempre lee/escribe contra
SQLite local. La conexión a Postgres pasa a ser un segundo recurso
(`a.cloudDB *sql.DB`), abierto de forma perezosa/opcional, usado
**únicamente** por el proceso de sincronización — nunca por las rutas de
lectura/escritura normales de la UI.

### 3. Tabla de cola: `sync_outbox`

```sql
CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY,
    operation TEXT NOT NULL,      -- 'insert' | 'update' | 'delete'
    entity_type TEXT NOT NULL,    -- 'animal', 'tratamiento', 'corral', ...
    entity_id TEXT NOT NULL,
    payload TEXT NOT NULL,        -- JSON del registro completo
    rancho_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    last_error TEXT               -- NULL si nunca ha fallado
);
```

### 4. Instrumentación de escrituras

Cada uno de los métodos de negocio que ya escriben en SQLite (`AddAnimal`,
`UpdateAnimal`, `DeleteAnimal`, `AddCorral`, `DeleteCorral`,
`RegistrarEventoReproductivo`, `AddInsumo`, `RegistrarTratamiento`,
`RegistrarParto`, `RegistrarDiagnosticoGestacion`, `CrearRecetaVeterinaria`,
`AddTarea`, `CompletarTarea`, `AddSeguimientoPeso`, `ConfirmarUltrasonido`,
`MoverAnimal`) agrega una llamada a un helper nuevo:

```go
func (a *App) enqueueSync(op, entityType, entityID string, payload interface{}) error
```

Este helper solo actúa si `a.driverName == "sqlite"` (en modo Postgres
directo no hay nada que encolar, el dato ya vive en la nube). Se llama
**después** de que el escritor local ya confirmó, dentro de la misma
transacción cuando el método ya usa una (ej. `DeleteAnimal`), para que la
escritura de datos y su registro en la cola sean atómicos.

### 5. Proceso de sincronización en segundo plano

Reemplaza completamente `offline_manager.go` actual. Vive en el mismo
archivo, con esta forma:

```go
func (o *OfflineManager) StartSyncLoop(ctx context.Context, interval time.Duration)
func (o *OfflineManager) syncData() // ahora hace trabajo real
```

Cada tick (cada 3 minutos, configurable):
1. Intenta abrir/usar `a.cloudDB` con un `SELECT 1` corto como ping.
2. Si falla: no hace nada más, mantiene `GetSyncStatus() == "PENDING"` o
   similar; la UI no muestra error, solo "pendiente de sincronizar".
3. Si responde: lee `sync_outbox` ordenado por `created_at`, y por cada
   fila ejecuta el INSERT/UPDATE/DELETE equivalente contra Postgres usando
   el `rancho_id` cacheado. Si tiene éxito, borra la fila de la cola. Si
   falla, anota `last_error` y continúa con las demás filas (un fallo
   puntual no bloquea el resto de la cola).
4. Actualiza `lastSyncTime` solo si al menos un ciclo completo corrió sin
   error de conexión (aunque haya filas individuales con error).

### 6. UI: conectar el botón "Sync Cloud" a esto de verdad

Hoy `SyncToJarvis()` apunta a un servicio local no relacionado
(`localhost:3000/api/sync/master-sheep`). Se reemplaza por una llamada que
expone `GetSyncStatus()` y el conteo de `sync_outbox` pendientes, y un
botón "Sincronizar ahora" que fuerza un ciclo inmediato en vez de esperar
al siguiente tick. El texto actual de "Modo Cloud Activo..." (que asumía
Postgres siempre conectado) se ajusta para reflejar el estado real:
pendientes / última sincronización exitosa.

## Testing

- Pruebas de Go para `enqueueSync` y el ciclo de sincronización usando dos
  bases SQLite en memoria (una como "local", otra simulando Postgres via
  SQLite para no depender de una base Postgres real en CI).
- Prueba manual: cortar la red real, capturar un animal y un tratamiento,
  confirmar que aparecen en `sync_outbox`, reconectar, confirmar que se
  sincronizan a Supabase real y la cola queda vacía.
- Prueba manual del fallback de login offline: iniciar sesión una vez en
  línea, cortar la red, cerrar y volver a abrir la app, iniciar sesión con
  la misma cuenta sin internet.

## Nota sobre datos locales existentes

Cualquier instalación de escritorio que ya tenga una base SQLite local con
usuarios sembrados a la manera antigua (UUIDs locales, sin relación con
Supabase) no se migra automáticamente. Al actualizar, esa base local queda
huérfana del nuevo flujo de identidad cacheada; los datos que ya tenga
capturados no se sincronizarán retroactivamente. Dado que hoy no hay
instalaciones de escritorio en uso real en campo (el despliegue actual es
Cloud Run), esto no afecta a nadie todavía, pero se documenta para no
sorprender a futuro.

## Fuera de esta fase (trabajo futuro, no ahora)

- Sincronización nube → local (dos sentidos).
- Resolución de conflictos más allá de última-escritura-gana.
- Sincronización de archivos/fotos de animales (`foto` en `animales`) —
  por ahora esos campos se sincronizan como referencia/URL igual que el
  resto de las columnas, sin manejo especial de binarios grandes.
