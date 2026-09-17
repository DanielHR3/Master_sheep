package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
)

// App struct
type App struct {
	ctx        context.Context
	db         *sql.DB
	cloudDB    *sql.DB // conexión opcional a Postgres, solo para sincronización/login en modo escritorio
	user       *User   // Usuario actualmente autenticado
	IsDemoMode bool    // Modo Lectura (Bloquea mutaciones)
	driverName string

	offlineManager *OfflineManager // solo en escritorio con DATABASE_URL: cola local → nube
	mailer         mailSender      // correo de avisos del formulario público; nil si no hay SMTP_PASSWORD
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	err := a.initDB()
	if err != nil {
		fmt.Printf("Error initializing database: %v\n", err)
	}
}

// initDB inicializa la base de datos (PostgreSQL si hay URL, si no SQLite local)
func (a *App) initDB() error {
	if !isServerBuild {
		if n := loadDesktopConfig(desktopConfigPath()); n > 0 {
			fmt.Printf("Configuración de escritorio cargada desde %s\n", desktopConfigPath())
		}
	}
	dbURL := os.Getenv("DATABASE_URL")
	var db *sql.DB
	var err error

	// El build de escritorio SIEMPRE trabaja contra SQLite local; Postgres
	// (si hay DATABASE_URL) se abre aparte como a.cloudDB y solo lo usan el
	// login y la sincronización en segundo plano. El build de servidor
	// (-tags server) sigue usando Postgres directo.
	if isServerBuild && dbURL != "" {
		fmt.Println("Conectando a base de datos PostgreSQL (Nube)...")
		db, err = sql.Open("postgres", dbURL)
		a.driverName = "postgres"
	} else {
		// Determinar ruta de la base de datos (Carpeta de Documentos del usuario)
		fmt.Println("Conectando a base de datos SQLite (Local)...")
		home, _ := os.UserHomeDir()
		dbDir := filepath.Join(home, "Documents", "SheepMaster")
		_ = os.MkdirAll(dbDir, 0755)
		dbPath := filepath.Join(dbDir, "sheepmaster.db")
		db, err = sql.Open("sqlite", dbPath)
		a.driverName = "sqlite"
	}

	if err != nil {
		return err
	}
	a.db = db
	a.mailer = newMailerFromEnv()

	if !isServerBuild {
		if cloudURL := os.Getenv("DATABASE_URL"); cloudURL != "" {
			// a.cloudDB se abre una sola vez aquí y se mantiene abierto por
			// toda la vida del proceso de escritorio (nunca se cierra
			// explícitamente) — igual que a.db. Es intencional, no una fuga:
			// es un proceso de escritorio de larga duración con un único
			// usuario, así que el pool de conexiones vive hasta que el
			// proceso termina y el SO libera el socket.
			if cloudDB, err := sql.Open("postgres", cloudURL); err == nil {
				a.cloudDB = cloudDB
			}
		}
	}

	// Crear tablas si no existen
	if err := a.createSchema(); err != nil {
		fmt.Printf("Aviso: Error en esquema inicial (posiblemente tablas ya existen): %v\n", err)
	}

	// Las sesiones HTTP viven en la base de datos (no en memoria del proceso)
	// para que funcionen correctamente en plataformas que corren múltiples
	// instancias concurrentes (ej. Cloud Run autoescalado).
	sessions.init(a.db, a.driverName)

	// Migraciones y Setup Inicial con ON CONFLICT para Postgres / OR IGNORE para SQLite
	if a.driverName == "postgres" {
		_, _ = a.db.Exec("INSERT INTO settings (key, value) VALUES ('is_demo_mode', 'false') ON CONFLICT DO NOTHING")
	} else {
		_, _ = a.db.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('is_demo_mode', 'false')")
	}

	a.runMigrations()

	// Las cuentas semilla solo se crean en el servidor. El escritorio ya no
	// siembra admins con UUIDs locales: usa la identidad real de Supabase
	// cacheada en cached_identity (ver identity_cache.go), para que los
	// datos que sincroniza lleven el rancho_id/user_id correcto.
	if isServerBuild {
		// Cuentas semilla: SOLO si el operador define SEED_ADMIN_PASSWORD en el
		// entorno del servidor (una vez, para una base nueva). Ya no existe
		// ninguna contraseña por defecto en el código: la anterior (admin123)
		// estuvo publicada en el README y seguía activa en producción.
		if seedPwd := os.Getenv("SEED_ADMIN_PASSWORD"); seedPwd != "" {
			superAdminID := uuid.New().String()
			donPablitoID := uuid.New().String()
			bugambiliasID := uuid.New().String()
			hashedPwd, _ := bcrypt.GenerateFromPassword([]byte(seedPwd), bcrypt.DefaultCost)
			if a.driverName == "postgres" {
				_, _ = a.db.Exec(a.q("INSERT INTO users (id, email, password, name, role, rancho_id) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING"),
					superAdminID, "admin@sheepmaster.com", string(hashedPwd), "Super Admin", "SuperAdmin", superAdminID)
				_, _ = a.db.Exec(a.q("INSERT INTO users (id, email, password, name, role, rancho_id) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING"),
					donPablitoID, "admin@donpablito.com", string(hashedPwd), "Admin Don Pablito", "Admin", donPablitoID)
				_, _ = a.db.Exec(a.q("INSERT INTO users (id, email, password, name, role, rancho_id) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING"),
					bugambiliasID, "admin@bugambilias.com", string(hashedPwd), "Admin Rancho Bugambilias", "Admin", bugambiliasID)
			} else {
				_, _ = a.db.Exec("INSERT OR IGNORE INTO users (id, email, password, name, role, rancho_id) VALUES (?, ?, ?, ?, ?, ?)",
					superAdminID, "admin@sheepmaster.com", string(hashedPwd), "Super Admin", "SuperAdmin", superAdminID)
				_, _ = a.db.Exec("INSERT OR IGNORE INTO users (id, email, password, name, role, rancho_id) VALUES (?, ?, ?, ?, ?, ?)",
					donPablitoID, "admin@donpablito.com", string(hashedPwd), "Admin Don Pablito", "Admin", donPablitoID)
				_, _ = a.db.Exec("INSERT OR IGNORE INTO users (id, email, password, name, role, rancho_id) VALUES (?, ?, ?, ?, ?, ?)",
					bugambiliasID, "admin@bugambilias.com", string(hashedPwd), "Admin Rancho Bugambilias", "Admin", bugambiliasID)
			}
		} else {
			fmt.Println("Aviso: SEED_ADMIN_PASSWORD no definida; no se crean cuentas semilla.")
		}
	}

	// Cargar configuración de Modo Demo
	var demoVal string
	err = a.db.QueryRow(a.q("SELECT value FROM settings WHERE key = 'is_demo_mode'")).Scan(&demoVal)
	if err == nil {
		a.IsDemoMode = (demoVal == "true")
	} else {
		a.IsDemoMode = false
	}

	// Sincronización en segundo plano (solo escritorio con nube configurada).
	if !isServerBuild && a.cloudDB != nil {
		ctx := a.ctx
		if ctx == nil { // initDB() normalmente corre tras startup(), pero por si acaso
			ctx = context.Background()
		}
		interval := 3 * time.Minute
		if v := os.Getenv("SHEEPMASTER_SYNC_INTERVAL"); v != "" { // p. ej. "10s" para pruebas
			if d, err := time.ParseDuration(v); err == nil && d > 0 {
				interval = d
			}
		}
		a.offlineManager = NewOfflineManager(a.db, a.cloudDB)
		a.offlineManager.StartSyncLoop(ctx, interval)
	}

	return nil
}

// GetSyncStatus expone a la UI cuántos cambios están pendientes y cuándo
// fue la última sincronización exitosa.
func (a *App) GetSyncStatus() map[string]interface{} {
	if a.offlineManager == nil {
		return map[string]interface{}{"pending": 0, "lastSync": "N/A"}
	}
	pending, lastSync := a.offlineManager.GetSyncStatus()
	return map[string]interface{}{"pending": pending, "lastSync": lastSync}
}

// SyncNow fuerza un ciclo de sincronización inmediato (botón "Sync Cloud")
// y devuelve el estado resultante con la misma forma que GetSyncStatus.
func (a *App) SyncNow() (map[string]interface{}, error) {
	if a.offlineManager == nil {
		return a.GetSyncStatus(), nil
	}
	if err := a.offlineManager.syncData(); err != nil {
		return a.GetSyncStatus(), err
	}
	return a.GetSyncStatus(), nil
}

// runMigrations agrega columnas introducidas después del esquema base.
// Cada ALTER falla silenciosamente si la columna ya existe. Se extrajo de
// initDB() para que las pruebas con SQLite en memoria vean el mismo
// esquema que la app real (ver newTestApp en schema_offline_test.go).
func (a *App) runMigrations() {
	a.db.Exec("ALTER TABLE animales ADD COLUMN peso_nacer REAL DEFAULT 0")
	a.db.Exec("ALTER TABLE animales ADD COLUMN peso_destete REAL DEFAULT 0")
	a.db.Exec("ALTER TABLE animales ADD COLUMN padre_id TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN madre_id TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN abuelo_paterno_id TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN abuela_paterna_id TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN abuelo_materno_id TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN especie TEXT DEFAULT 'Ovino'")
	a.db.Exec("ALTER TABLE animales ADD COLUMN abuela_materna_id TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN tipo_parto TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN metodo_concepcion TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN destino TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN fecha_defuncion TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN motivo_defuncion TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN peso_150_dias REAL DEFAULT 0")
	a.db.Exec("ALTER TABLE animales ADD COLUMN fecha_destete TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN foto TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN tipo_nacimiento TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN es_referencia INTEGER DEFAULT 0")
	a.db.Exec("ALTER TABLE rancho_perfil ADD COLUMN precio_kg REAL DEFAULT 0")
	a.db.Exec("ALTER TABLE animales ADD COLUMN nombre TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN tatuaje_der TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN tatuaje_izq TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN tatuaje_cola TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN color TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN pureza REAL DEFAULT 0")
	a.db.Exec("ALTER TABLE animales ADD COLUMN grado_registro TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN registro TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN siniiga TEXT")
	a.db.Exec("ALTER TABLE animales ADD COLUMN id_electronica TEXT")
	a.db.Exec("ALTER TABLE tratamientos ADD COLUMN via_administracion TEXT")
	a.db.Exec("ALTER TABLE users ADD COLUMN rancho_id TEXT")

	a.normalizarCorralID()
}

// normalizarCorralID pasa a id los animales cuyo corral quedó guardado por
// nombre. Durante mucho tiempo el alta de animal escribía el nombre del corral
// y mover un animal escribía su id, así que la misma columna terminó con las
// dos formas; la ocupación del dashboard cruzaba solo por id y un rancho que
// daba de alta por el formulario veía 0% en todos sus corrales.
//
// Es idempotente: solo toca filas cuyo valor coincide EXACTO con el nombre de
// un corral del mismo rancho y que no sea ya el id de uno. Un valor que no
// empareje con nada se deja como está, para no perder lo que el ranchero
// escribió en la carga masiva.
func (a *App) normalizarCorralID() {
	res, err := a.db.Exec(a.q(`
		UPDATE animales
		SET corral_id = (
			SELECT c.id FROM corrales c
			WHERE c.user_id = animales.user_id AND c.nombre = animales.corral_id
		)
		WHERE corral_id IS NOT NULL AND corral_id <> ''
		  AND EXISTS (
			SELECT 1 FROM corrales c
			WHERE c.user_id = animales.user_id AND c.nombre = animales.corral_id
		  )
		  AND NOT EXISTS (
			SELECT 1 FROM corrales c
			WHERE c.user_id = animales.user_id AND c.id = animales.corral_id
		  )`))
	if err != nil {
		fmt.Printf("Aviso: no se pudo normalizar corral_id: %v\n", err)
		return
	}
	if n, err := res.RowsAffected(); err == nil && n > 0 {
		fmt.Printf("Migración: %d animal(es) tenían el corral guardado por nombre; ahora va por id.\n", n)
	}
}

// consultador es lo mínimo que corralIDPorNombre necesita: lo cumplen tanto
// *sql.DB como *sql.Tx. Existe para poder consultar DENTRO de la transacción
// del import; hacerlo contra a.db abría una segunda conexión y, con el pool
// limitado a una, el import se quedaba esperándose a sí mismo.
type consultador interface {
	QueryRow(query string, args ...interface{}) *sql.Row
}

// corralIDPorNombre traduce el nombre de un corral al id con el que se guarda
// en animales.corral_id. Compara sin distinguir mayúsculas ni espacios de
// sobra, porque viene escrito a mano en una hoja de Excel. Si no encuentra
// nada devuelve el texto original sin tocar.
func (a *App) corralIDPorNombre(q consultador, nombre string) string {
	limpio := strings.TrimSpace(nombre)
	if limpio == "" {
		return ""
	}
	var id string
	err := q.QueryRow(a.q(`
		SELECT id FROM corrales
		WHERE user_id = ? AND LOWER(TRIM(nombre)) = LOWER(?)
		LIMIT 1`), a.tenantID(), limpio).Scan(&id)
	if err != nil || id == "" {
		return limpio
	}
	return id
}

// createSchema crea todas las tablas si no existen. Se extrajo de initDB()
// para poder probarla de forma aislada (ver schema_offline_test.go).
func (a *App) createSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT UNIQUE,
		password TEXT,
		name TEXT,
		role TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS corrales (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		nombre TEXT NOT NULL,
		tipo TEXT,
		capacidad INTEGER DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS tipos_corral (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		nombre TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS animales (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		arete TEXT NOT NULL,
		raza TEXT,
		sexo TEXT,
		fecha_nacimiento TEXT,
		estatus TEXT DEFAULT 'Activo',
		estado_reproductivo TEXT DEFAULT 'Crecimiento',
		conteo_fetos INTEGER DEFAULT 0,
		corral_id TEXT,
		peso_nacer REAL DEFAULT 0,
		peso_destete REAL DEFAULT 0,
		padre_id TEXT,
		madre_id TEXT,
		abuelo_paterno_id TEXT,
		abuela_paterna_id TEXT,
		abuelo_materno_id TEXT,
		abuela_materna_id TEXT,
		tipo_parto TEXT,
		metodo_concepcion TEXT,
		destino TEXT,
		fecha_defuncion TEXT,
		motivo_defuncion TEXT,
		es_referencia INTEGER DEFAULT 0,
		nombre TEXT,
		tatuaje_der TEXT,
		tatuaje_izq TEXT,
		tatuaje_cola TEXT,
		color TEXT,
		pureza REAL DEFAULT 0,
		grado_registro TEXT,
		registro TEXT,
		siniiga TEXT,
		id_electronica TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, arete)
	);

	CREATE TABLE IF NOT EXISTS seguimientos_peso (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		animal_id TEXT,
		fecha TEXT,
		peso REAL,
		notas TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS eventos_reproductivos (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		animal_id TEXT,
		tipo TEXT,
		fecha_evento TEXT,
		fecha_fin_monta TEXT,
		id_macho TEXT,
		lote_semen TEXT,
		tecnico TEXT,
		protocolo TEXT,
		fecha_probable_parto TEXT,
		resultado TEXT DEFAULT 'Pendiente',
		conteo_fetos INTEGER DEFAULT 0,
		notas TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS movimientos (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		animal_id TEXT,
		corral_previo TEXT,
		corral_nuevo TEXT,
		fecha_movimiento TEXT,
		motivo TEXT
	);

	CREATE TABLE IF NOT EXISTS insumos (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		nombre TEXT NOT NULL,
		tipo TEXT,
		unidad TEXT,
		stock_actual REAL DEFAULT 0,
		stock_minimo REAL DEFAULT 0,
		costo_unitario REAL DEFAULT 0,
		dias_retiro INTEGER DEFAULT 0,
		lote TEXT,
		fecha_vencimiento TEXT,
		proveedor TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS movimientos_insumo (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		insumo_id TEXT,
		tipo TEXT,
		cantidad REAL,
		fecha TEXT,
		motivo TEXT,
		animal_id TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tratamientos (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		animal_id TEXT,
		insumo_id TEXT,
		dosis REAL,
		via_administracion TEXT,
		fecha TEXT,
		fecha_fin_retiro TEXT,
		tecnico TEXT,
		observaciones TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tareas (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		asignado_a TEXT,
		creado_por TEXT,
		titulo TEXT NOT NULL,
		descripcion TEXT,
		estatus TEXT DEFAULT 'Pendiente',
		fecha_vencimiento TEXT,
		animal_id TEXT,
		insumo_id TEXT,
		prioridad TEXT DEFAULT 'Media',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS diagnostico_gestacion (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		animal_id TEXT,
		fecha TEXT,
		condicion_corporal REAL,
		resultado INTEGER,
		conteo_fetos INTEGER,
		observaciones TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS partos (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		animal_id TEXT,
		fecha TEXT,
		cantidad_crias INTEGER,
		tipo_parto TEXT,
		observaciones TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS recetas_veterinarias (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		animal_id TEXT,
		mvz TEXT,
		productor TEXT,
		fecha TEXT,
		peso REAL,
		diagnostico TEXT,
		tratamiento TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS rancho_perfil (
		id TEXT PRIMARY KEY,
		rancho_id TEXT NOT NULL,
		nombre TEXT,
		criador_clave TEXT,
		criador_nombre TEXT,
		criador_centro TEXT,
		criador_municipio_estado TEXT,
		propietario_clave TEXT,
		propietario_nombre TEXT,
		propietario_centro TEXT,
		propietario_municipio_estado TEXT,
		logo TEXT,
		precio_kg REAL DEFAULT 0
	);
	CREATE TABLE IF NOT EXISTS leads (
		id TEXT PRIMARY KEY,
		nombre TEXT NOT NULL,
		rancho TEXT,
		telefono TEXT,
		correo TEXT,
		mensaje TEXT,
		quiere_demo INTEGER DEFAULT 0,
		horario_preferido TEXT,
		origen_ip TEXT,
		created_at TIMESTAMP NOT NULL,
		notified_at TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT
	);

	CREATE TABLE IF NOT EXISTS sessions (
		token TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		expires_at TIMESTAMP NOT NULL
	);

	CREATE TABLE IF NOT EXISTS cached_identity (
		email TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		name TEXT,
		role TEXT NOT NULL,
		rancho_id TEXT NOT NULL,
		password_hash TEXT NOT NULL,
		cached_at TIMESTAMP NOT NULL
	);

	CREATE TABLE IF NOT EXISTS sync_outbox (
		id TEXT PRIMARY KEY,
		operation TEXT NOT NULL,
		entity_type TEXT NOT NULL,
		entity_id TEXT NOT NULL,
		payload TEXT NOT NULL,
		rancho_id TEXT NOT NULL,
		created_at TIMESTAMP NOT NULL,
		last_error TEXT
	);
	`
	_, err := a.db.Exec(schema)
	return err
}

// q es un helper para formatear consultas según el motor (Postgres usa $1, $2... SQLite usa ?)
func (a *App) q(query string) string {
	if a.driverName != "postgres" {
		return query
	}

	parts := strings.Split(query, "?")
	if len(parts) == 1 {
		return query
	}

	var pb strings.Builder
	for i := 0; i < len(parts)-1; i++ {
		pb.WriteString(parts[i])
		pb.WriteString(fmt.Sprintf("$%d", i+1))
	}
	pb.WriteString(parts[len(parts)-1])
	return pb.String()
}

// ToggleDemoMode activa o desactiva el modo lectura
func (a *App) ToggleDemoMode(enabled bool) error {
	val := "false"
	if enabled {
		val = "true"
	}
	var err error
	if a.driverName == "postgres" {
		_, err = a.db.Exec(a.q("INSERT INTO settings (key, value) VALUES ('is_demo_mode', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"), val)
	} else {
		_, err = a.db.Exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('is_demo_mode', ?)", val)
	}
	if err != nil {
		return err
	}
	a.IsDemoMode = enabled
	return nil
}

// GetIsDemoMode obtiene el estado actual del modo lectura
func (a *App) GetIsDemoMode() bool {
	return a.IsDemoMode
}

// authenticate verifica credenciales contra la base de datos y devuelve el
// usuario correspondiente sin mutar el estado de la instancia (a diferencia
// de Login). La usa el servidor HTTP para emitir sesiones por-petición.
func (a *App) authenticate(email, password string) (*User, error) {
	var user User
	var dbPassword string
	err := a.db.QueryRow(a.q("SELECT id, email, password, role FROM users WHERE email = ?"), email).
		Scan(&user.ID, &user.Email, &dbPassword, &user.Role)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("usuario no encontrado")
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(dbPassword), []byte(password)); err != nil {
		return nil, fmt.Errorf("contraseña incorrecta")
	}

	if user.RanchoID == "" {
		user.RanchoID = user.ID
	}
	return &user, nil
}

// loadUserByID recupera un usuario por su ID (usado para resolver la sesión
// asociada a un token en cada petición HTTP). rancho_id puede ser NULL para
// cuentas creadas antes de que esa columna existiera, por eso se escanea
// como sql.NullString en vez de string.
func (a *App) loadUserByID(id string) (*User, error) {
	var user User
	var name, rancho sql.NullString
	err := a.db.QueryRow(a.q("SELECT id, email, name, role, rancho_id FROM users WHERE id = ?"), id).
		Scan(&user.ID, &user.Email, &name, &user.Role, &rancho)
	if err != nil {
		return nil, err
	}
	user.Name = name.String
	user.RanchoID = rancho.String
	if user.RanchoID == "" {
		user.RanchoID = user.ID
	}
	return &user, nil
}

// Login maneja la autenticación local usada por el binding de Wails
// (escritorio: un único usuario por proceso, por lo que mutar a.user aquí
// es correcto). El servidor HTTP multi-usuario usa authenticate() en su lugar.
func (a *App) Login(email, password string) error {
	user, err := a.authenticateForBuild(email, password)
	if err != nil {
		return err
	}
	a.user = user
	return nil
}

// authenticateForBuild es el único punto de entrada de autenticación:
// servidor → Postgres directo; escritorio → nube con respaldo en la
// identidad cacheada. Lo usan tanto Login() (Wails) como handleLogin (HTTP,
// modo móvil), para que ambos caminos acepten exactamente las mismas cuentas.
func (a *App) authenticateForBuild(email, password string) (*User, error) {
	if isServerBuild {
		return a.authenticate(email, password)
	}
	return a.loginDesktop(email, password)
}

func (a *App) tenantID() string {
	if a.user == nil {
		return ""
	}
	if a.user.RanchoID != "" {
		return a.user.RanchoID
	}
	return a.user.ID
}

// animalSelectColumns es la lista de columnas que scanAnimal espera, en orden.
const animalSelectColumns = `id, COALESCE(especie, 'Ovino'), COALESCE(arete, ''), COALESCE(raza, ''), COALESCE(sexo, ''), COALESCE(fecha_nacimiento, ''), 
		COALESCE(estatus, ''), COALESCE(estado_reproductivo, ''), conteo_fetos, COALESCE(corral_id, ''),
		peso_nacer, peso_destete, COALESCE(padre_id, ''), COALESCE(madre_id, ''), COALESCE(destino, ''),
		COALESCE(fecha_defuncion, ''), COALESCE(motivo_defuncion, ''),
		COALESCE(abuelo_paterno_id, ''), COALESCE(abuela_paterna_id, ''), COALESCE(abuelo_materno_id, ''), COALESCE(abuela_materna_id, ''),
		COALESCE(tipo_parto, ''), COALESCE(metodo_concepcion, ''),
		COALESCE(peso_150_dias, 0), COALESCE(fecha_destete, ''), COALESCE(foto, ''), COALESCE(tipo_nacimiento, ''),
		COALESCE(es_referencia, 0), COALESCE(nombre, ''), COALESCE(tatuaje_der, ''), COALESCE(tatuaje_izq, ''), COALESCE(tatuaje_cola, ''),
		COALESCE(color, ''), COALESCE(pureza, 0), COALESCE(grado_registro, ''), COALESCE(registro, ''), COALESCE(siniiga, ''), COALESCE(id_electronica, '')`

// scanAnimal lee una fila producida con animalSelectColumns.
func scanAnimal(rows interface{ Scan(dest ...interface{}) error }) (Animal, error) {
	var animal Animal
	var esRef int
	err := rows.Scan(&animal.ID, &animal.Especie, &animal.Arete, &animal.Raza, &animal.Sexo, &animal.FechaNacimiento, &animal.Estatus, &animal.EstadoRepro, &animal.ConteoFetos, &animal.CorralID,
		&animal.PesoNacer, &animal.PesoDestete, &animal.PadreID, &animal.MadreID, &animal.Destino, &animal.FechaDefuncion, &animal.MotivoDefuncion,
		&animal.AbueloPaternoID, &animal.AbuelaPaternaID, &animal.AbueloMaternoID, &animal.AbuelaMaternaID, &animal.TipoParto, &animal.MetodoConcepcion,
		&animal.Peso150Dias, &animal.FechaDestete, &animal.Foto, &animal.TipoNacimiento,
		&esRef, &animal.Nombre, &animal.TatuajeDer, &animal.TatuajeIzq, &animal.TatuajeCola,
		&animal.Color, &animal.Pureza, &animal.GradoRegistro, &animal.Registro, &animal.Siniiga, &animal.IDElectronica)
	animal.EsReferencia = esRef == 1
	return animal, err
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// GetAnimales obtiene el hato del usuario actual (sin animales de referencia,
// que solo existen para el árbol genealógico; ver GetAnimalesReferencia).
func (a *App) GetAnimales() ([]Animal, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}
	rows, err := a.db.Query(a.q(`SELECT `+animalSelectColumns+` FROM animales WHERE user_id = ? AND COALESCE(es_referencia, 0) = 0`), a.tenantID())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var animals []Animal
	for rows.Next() {
		animal, err := scanAnimal(rows)
		if err != nil {
			return nil, err
		}
		animals = append(animals, animal)
	}
	return animals, nil
}

// AddAnimal registra un nuevo animal
func (a *App) AddAnimal(animal Animal) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}
	if animal.ID == "" {
		animal.ID = uuid.New().String()
	}
	if animal.Especie == "" {
		animal.Especie = "Ovino"
	}

	_, err := a.db.Exec(a.q(`INSERT INTO animales 
		(id, user_id, especie, arete, raza, sexo, fecha_nacimiento, estatus, estado_reproductivo, conteo_fetos, corral_id, 
		 peso_nacer, peso_destete, padre_id, madre_id, destino, fecha_defuncion, motivo_defuncion,
		 abuelo_paterno_id, abuela_paterna_id, abuelo_materno_id, abuela_materna_id, tipo_parto, metodo_concepcion,
		 peso_150_dias, fecha_destete, foto, tipo_nacimiento,
		 es_referencia, nombre, tatuaje_der, tatuaje_izq, tatuaje_cola, color, pureza, grado_registro, registro, siniiga, id_electronica) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
		animal.ID, a.tenantID(), animal.Especie, animal.Arete, animal.Raza, animal.Sexo, 
		animal.FechaNacimiento, animal.Estatus, animal.EstadoRepro, 
		animal.ConteoFetos, animal.CorralID, animal.PesoNacer, animal.PesoDestete,
		animal.PadreID, animal.MadreID, animal.Destino, animal.FechaDefuncion, animal.MotivoDefuncion,
		animal.AbueloPaternoID, animal.AbuelaPaternaID, animal.AbueloMaternoID, animal.AbuelaMaternaID, animal.TipoParto, animal.MetodoConcepcion,
		animal.Peso150Dias, animal.FechaDestete, animal.Foto, animal.TipoNacimiento,
		boolToInt(animal.EsReferencia), animal.Nombre, animal.TatuajeDer, animal.TatuajeIzq, animal.TatuajeCola, animal.Color, animal.Pureza, animal.GradoRegistro, animal.Registro, animal.Siniiga, animal.IDElectronica)
	if err == nil {
		a.queueSync("insert", "animal", animal.ID, animalRow(animal))
	}
	return err
}

// animalRow devuelve el payload de sincronización de un animal: exactamente
// las columnas que AddAnimal/UpdateAnimal escriben en la tabla `animales`.
// No se manda el struct entero porque trae campos que no son columna
// (p. ej. condicion_corporal) y Postgres rechazaría el UPSERT completo.
func animalRow(animal Animal) map[string]interface{} {
	return map[string]interface{}{
		"id": animal.ID, "especie": animal.Especie, "arete": animal.Arete, "raza": animal.Raza, "sexo": animal.Sexo,
		"fecha_nacimiento": animal.FechaNacimiento, "estatus": animal.Estatus, "estado_reproductivo": animal.EstadoRepro,
		"conteo_fetos": animal.ConteoFetos, "corral_id": animal.CorralID,
		"peso_nacer": animal.PesoNacer, "peso_destete": animal.PesoDestete,
		"padre_id": animal.PadreID, "madre_id": animal.MadreID, "destino": animal.Destino,
		"fecha_defuncion": animal.FechaDefuncion, "motivo_defuncion": animal.MotivoDefuncion,
		"abuelo_paterno_id": animal.AbueloPaternoID, "abuela_paterna_id": animal.AbuelaPaternaID,
		"abuelo_materno_id": animal.AbueloMaternoID, "abuela_materna_id": animal.AbuelaMaternaID,
		"tipo_parto": animal.TipoParto, "metodo_concepcion": animal.MetodoConcepcion,
		"peso_150_dias": animal.Peso150Dias, "fecha_destete": animal.FechaDestete, "foto": animal.Foto,
		"tipo_nacimiento": animal.TipoNacimiento, "es_referencia": boolToInt(animal.EsReferencia),
		"nombre": animal.Nombre, "tatuaje_der": animal.TatuajeDer, "tatuaje_izq": animal.TatuajeIzq, "tatuaje_cola": animal.TatuajeCola,
		"color": animal.Color, "pureza": animal.Pureza, "grado_registro": animal.GradoRegistro, "registro": animal.Registro,
		"siniiga": animal.Siniiga, "id_electronica": animal.IDElectronica,
	}
}

// UpdateAnimal actualiza los datos de un animal
func (a *App) UpdateAnimal(animal Animal) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}
	if animal.Especie == "" {
		animal.Especie = "Ovino"
	}

	_, err := a.db.Exec(a.q(`UPDATE animales 
		SET especie = ?, arete = ?, raza = ?, sexo = ?, fecha_nacimiento = ?, estatus = ?, estado_reproductivo = ?, conteo_fetos = ?, corral_id = ?, 
		peso_nacer = ?, peso_destete = ?, padre_id = ?, madre_id = ?, 
		destino = ?, fecha_defuncion = ?, motivo_defuncion = ?,
		abuelo_paterno_id = ?, abuela_paterna_id = ?, abuelo_materno_id = ?, abuela_materna_id = ?,
		tipo_parto = ?, metodo_concepcion = ?, peso_150_dias = ?, fecha_destete = ?, foto = ?, tipo_nacimiento = ?,
		es_referencia = ?, nombre = ?, tatuaje_der = ?, tatuaje_izq = ?, tatuaje_cola = ?, color = ?, pureza = ?, grado_registro = ?, registro = ?, siniiga = ?, id_electronica = ?
		WHERE id = ? AND user_id = ?`),
		animal.Especie, animal.Arete, animal.Raza, animal.Sexo, 
		animal.FechaNacimiento, animal.Estatus, 
		animal.EstadoRepro, animal.ConteoFetos, animal.CorralID, 
		animal.PesoNacer, animal.PesoDestete, animal.PadreID, animal.MadreID,
		animal.Destino, animal.FechaDefuncion, animal.MotivoDefuncion,
		animal.AbueloPaternoID, animal.AbuelaPaternaID, animal.AbueloMaternoID, animal.AbuelaMaternaID,
		animal.TipoParto, animal.MetodoConcepcion, animal.Peso150Dias, animal.FechaDestete, animal.Foto, animal.TipoNacimiento,
		boolToInt(animal.EsReferencia), animal.Nombre, animal.TatuajeDer, animal.TatuajeIzq, animal.TatuajeCola, animal.Color, animal.Pureza, animal.GradoRegistro, animal.Registro, animal.Siniiga, animal.IDElectronica,
		animal.ID, a.tenantID())
	if err == nil {
		a.queueSync("update", "animal", animal.ID, animalRow(animal))
	}
	return err
}

// DeleteAnimal elimina un animal y su historial (cascada lógica en app)
func (a *App) DeleteAnimal(id string) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}

	tx, err := a.db.Begin()
	if err != nil {
		return err
	}

	// Eliminar de todas las tablas relacionadas para evitar huérfanos
	tables := []string{
		"tratamientos", "eventos_reproductivos", "tareas", "movimientos", 
		"diagnostico_gestacion", "partos", "recetas_veterinarias", 
		"seguimientos_peso", "movimientos_insumo",
	}
	for _, table := range tables {
		_, _ = tx.Exec(a.q(fmt.Sprintf("DELETE FROM %s WHERE animal_id = ?", table)), id)
	}

	// Limpiar referencias donde este animal sea padre, madre o semental
	_, _ = tx.Exec(a.q("UPDATE animales SET padre_id = '' WHERE padre_id = ?"), id)
	_, _ = tx.Exec(a.q("UPDATE animales SET madre_id = '' WHERE madre_id = ?"), id)
	_, _ = tx.Exec(a.q("UPDATE eventos_reproductivos SET id_macho = '' WHERE id_macho = ?"), id)

	_, err = tx.Exec(a.q("DELETE FROM animales WHERE id = ? AND user_id = ?"), id, a.tenantID())
	if err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	a.queueSync("delete", "animal", id, struct {
		ID string `json:"id"`
	}{id})
	return nil
}

// GetCorrales obtiene la lista de corrales
func (a *App) GetCorrales() ([]Corral, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	rows, err := a.db.Query(a.q("SELECT id, nombre, tipo, capacidad FROM corrales WHERE user_id = ? ORDER BY nombre ASC"), a.tenantID())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var corrales []Corral
	for rows.Next() {
		var c Corral
		err := rows.Scan(&c.ID, &c.Nombre, &c.Tipo, &c.Capacidad)
		if err != nil {
			return nil, err
		}
		corrales = append(corrales, c)
	}


	return corrales, nil
}

// AddCorral registra un nuevo corral
func (a *App) AddCorral(corral Corral) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}
	if corral.ID == "" {
		corral.ID = uuid.New().String()
	}

	_, err := a.db.Exec(a.q("INSERT INTO corrales (id, user_id, nombre, tipo, capacidad) VALUES (?, ?, ?, ?, ?)"),
		corral.ID, a.tenantID(), corral.Nombre, corral.Tipo, corral.Capacidad)
	if err == nil {
		a.queueSync("insert", "corral", corral.ID, corral)
	}
	return err
}

// DeleteCorral elimina un corral y quita su referencia de los animales
// ------------------------------------------------------------ tipos de corral

// tiposCorralBase son los tipos con los que arranca cualquier rancho. Antes
// eran las cuatro opciones fijas del formulario; ahora son solo el punto de
// partida y cada rancho las cambia a su gusto.
var tiposCorralBase = []string{"General", "Maternidad", "Engorda", "Cuarentena"}

// GetTiposCorral devuelve el catálogo del rancho. La primera vez (catálogo
// vacío) lo siembra con los tipos base MÁS los tipos que sus corrales ya
// usen, así un rancho con corrales previos ve sus tipos reales de inmediato
// y nada de lo que tenía queda fuera de la lista.
func (a *App) GetTiposCorral() ([]TipoCorral, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}
	var n int
	if err := a.db.QueryRow(a.q("SELECT COUNT(*) FROM tipos_corral WHERE user_id = ?"), a.tenantID()).Scan(&n); err != nil {
		return nil, err
	}
	if n == 0 {
		if err := a.sembrarTiposCorral(); err != nil {
			return nil, err
		}
	}
	rows, err := a.db.Query(a.q("SELECT id, nombre FROM tipos_corral WHERE user_id = ? ORDER BY nombre ASC"), a.tenantID())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tipos := []TipoCorral{}
	for rows.Next() {
		var t TipoCorral
		if err := rows.Scan(&t.ID, &t.Nombre); err != nil {
			return nil, err
		}
		tipos = append(tipos, t)
	}
	return tipos, rows.Err()
}

func (a *App) sembrarTiposCorral() error {
	nombres := append([]string{}, tiposCorralBase...)
	rows, err := a.db.Query(a.q("SELECT DISTINCT COALESCE(tipo, '') FROM corrales WHERE user_id = ?"), a.tenantID())
	if err != nil {
		return err
	}
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			rows.Close()
			return err
		}
		if strings.TrimSpace(t) != "" {
			nombres = append(nombres, strings.TrimSpace(t))
		}
	}
	rows.Close()
	vistos := map[string]bool{}
	for _, nombre := range nombres {
		clave := strings.ToLower(nombre)
		if vistos[clave] {
			continue
		}
		vistos[clave] = true
		if _, err := a.AddTipoCorral(nombre); err != nil {
			return err
		}
	}
	return nil
}

// AddTipoCorral agrega un tipo al catálogo del rancho. El nombre no puede ir
// vacío ni repetir uno existente (sin distinguir mayúsculas).
func (a *App) AddTipoCorral(nombre string) (TipoCorral, error) {
	if a.user == nil {
		return TipoCorral{}, fmt.Errorf("no autenticado")
	}
	nombre = strings.TrimSpace(nombre)
	if nombre == "" {
		return TipoCorral{}, fmt.Errorf("el nombre del tipo no puede ir vacío")
	}
	var repetidos int
	if err := a.db.QueryRow(a.q("SELECT COUNT(*) FROM tipos_corral WHERE user_id = ? AND LOWER(nombre) = LOWER(?)"), a.tenantID(), nombre).Scan(&repetidos); err != nil {
		return TipoCorral{}, err
	}
	if repetidos > 0 {
		return TipoCorral{}, fmt.Errorf("ya existe el tipo %q", nombre)
	}
	t := TipoCorral{ID: uuid.New().String(), Nombre: nombre}
	if _, err := a.db.Exec(a.q("INSERT INTO tipos_corral (id, user_id, nombre) VALUES (?, ?, ?)"), t.ID, a.tenantID(), t.Nombre); err != nil {
		return TipoCorral{}, err
	}
	a.queueSync("insert", "tipo_corral", t.ID, t)
	return t, nil
}

// DeleteTipoCorral quita un tipo del catálogo, salvo que algún corral del
// rancho lo esté usando: en ese caso lo rechaza y dice cuántos.
func (a *App) DeleteTipoCorral(id string) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}
	var nombre string
	err := a.db.QueryRow(a.q("SELECT nombre FROM tipos_corral WHERE id = ? AND user_id = ?"), id, a.tenantID()).Scan(&nombre)
	if err == sql.ErrNoRows {
		return fmt.Errorf("tipo no encontrado")
	}
	if err != nil {
		return err
	}
	var enUso int
	if err := a.db.QueryRow(a.q("SELECT COUNT(*) FROM corrales WHERE user_id = ? AND LOWER(COALESCE(tipo, '')) = LOWER(?)"), a.tenantID(), nombre).Scan(&enUso); err != nil {
		return err
	}
	if enUso > 0 {
		return fmt.Errorf("el tipo %q está en uso por %d corral(es); cámbialos de tipo antes de quitarlo", nombre, enUso)
	}
	if _, err := a.db.Exec(a.q("DELETE FROM tipos_corral WHERE id = ? AND user_id = ?"), id, a.tenantID()); err != nil {
		return err
	}
	a.queueSync("delete", "tipo_corral", id, struct {
		ID string `json:"id"`
	}{ID: id})
	return nil
}

func (a *App) DeleteCorral(id string) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}

	tx, err := a.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Remove corral_id from animals in this corral
	// Igual que la ocupación, el corral pudo quedar guardado por nombre o por
	// id. El paréntesis importa: sin él, AND se agrupa antes que OR y el
	// UPDATE alcanzaría animales de otros ranchos con ese mismo nombre.
	_, err = tx.Exec(a.q("UPDATE animales SET corral_id = '' WHERE (corral_id IN (SELECT nombre FROM corrales WHERE id = ?) OR corral_id = ?) AND user_id = ?"), id, id, a.tenantID())
	if err != nil {
		return err
	}

	// 2. Delete the corral
	_, err = tx.Exec(a.q("DELETE FROM corrales WHERE id = ? AND user_id = ?"), id, a.tenantID())
	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	a.queueSync("delete", "corral", id, struct {
		ID string `json:"id"`
	}{id})
	return nil
}

// RegistrarEventoReproductivo gestiona montas e IAs
func (a *App) RegistrarEventoReproductivo(event EventoReproductivo) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}
	if event.ID == "" {
		event.ID = uuid.New().String()
	}

	// Lógica de fechas
	parsedFecha, _ := time.Parse("2006-01-02", event.FechaEvento)
	event.FechaProbableParto = parsedFecha.AddDate(0, 0, 147).Format("2006-01-02")
	event.Resultado = "Pendiente"

	_, err := a.db.Exec(a.q(`INSERT INTO eventos_reproductivos 
		(id, user_id, animal_id, tipo, fecha_evento, id_macho, lote_semen, tecnico, protocolo, fecha_probable_parto, resultado)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
		event.ID, a.tenantID(), event.AnimalID, event.Tipo, 
		event.FechaEvento, event.IDMacho, event.LoteSemen, 
		event.Tecnico, event.Protocolo, event.FechaProbableParto, event.Resultado)
	
	if err != nil {
		return err
	}

	// Actualizar animal
	_, err = a.db.Exec(a.q("UPDATE animales SET estado_reproductivo = 'Gestación' WHERE id = ?"), event.AnimalID)
	if err != nil {
		return err
	}
	a.queueSync("insert", "evento_reproductivo", event.ID, event)
	a.queueSync("update", "animal", event.AnimalID, map[string]interface{}{
		"id": event.AnimalID, "estado_reproductivo": "Gestación",
	})
	return nil
}

// GetStats obtiene los KPIs del dashboard de forma local (Master Sheep Pro)
func (a *App) GetStats() (map[string]interface{}, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	// Los ancestros de pedigrí (es_referencia = 1) existen solo para dibujar el
	// árbol genealógico: no son cabezas del hato y GetAnimales tampoco los
	// lista, así que tampoco deben contarse aquí. Sin este filtro el dashboard
	// reportaba más animales de los que el inventario mostraba.
	const noReferencia = " AND COALESCE(es_referencia, 0) = 0"

	var total int
	a.db.QueryRow(a.q("SELECT COUNT(*) FROM animales WHERE user_id = ? AND estatus = 'Activo'"+noReferencia), a.tenantID()).Scan(&total)

	var engorda int
	a.db.QueryRow(a.q("SELECT COUNT(*) FROM animales WHERE user_id = ? AND destino = 'Engorda' AND estatus = 'Activo'"+noReferencia), a.tenantID()).Scan(&engorda)

	var cria int
	a.db.QueryRow(a.q("SELECT COUNT(*) FROM animales WHERE user_id = ? AND destino = 'Pie de Cría' AND estatus = 'Activo'"+noReferencia), a.tenantID()).Scan(&cria)

	var bajas int
	a.db.QueryRow(a.q("SELECT COUNT(*) FROM animales WHERE user_id = ? AND estatus = 'Baja'"+noReferencia), a.tenantID()).Scan(&bajas)

	// Corrales con ocupación.
	//
	// El cruce acepta el id y el nombre porque la app guarda las dos cosas en
	// animales.corral_id: el alta de animal escribe el nombre del corral
	// (AddAnimalModal) y mover un animal escribe el id (MoveAnimal). Cruzando
	// solo por id, un rancho que da de alta por el formulario veía 0% de
	// ocupación en todos sus corrales.
	rows, err := a.db.Query(a.q(`
		SELECT c.nombre, COUNT(a.id) as cantidad, c.capacidad 
		FROM corrales c 
		LEFT JOIN animales a ON a.corral_id IN (c.id, c.nombre) AND a.estatus = 'Activo'
		WHERE c.user_id = ? 
		GROUP BY c.id, c.nombre, c.capacidad
		ORDER BY c.nombre ASC`), a.tenantID())
	
	corralesData := []map[string]interface{}{}
	if err == nil {
		for rows.Next() {
			var nombre string
			var cantidad int
			var capacidad int
			rows.Scan(&nombre, &cantidad, &capacidad)
			var ocupacion float64 = 0
			if capacidad > 0 {
				ocupacion = float64(cantidad) / float64(capacidad) * 100
			}
			corralesData = append(corralesData, map[string]interface{}{
				"nombre":    nombre,
				"cantidad":  cantidad,
				"capacidad": capacidad,
				"ocupacion": ocupacion,
			})
		}
		rows.Close()
	}

	// ALERTAS DE VENTA (Semáforo)
	// Rojo: >= 4 meses o >= 42kg
	// Amarillo: 3 meses
	// Verde: 2 meses
	alertasVenta := []map[string]interface{}{}
	rowsV, err := a.db.Query(a.q(`
		SELECT arete, fecha_nacimiento, 
		(SELECT IFNULL(MAX(peso), 0) FROM seguimientos_peso WHERE animal_id = a.id) as peso_actual 
		FROM animales a 
		WHERE user_id = ? AND destino = 'Engorda' AND estatus = 'Activo'`), a.tenantID())
	
	if err == nil {
		now := time.Now()
		for rowsV.Next() {
			var arete, fechaNac string
			var pesoActual float64
			rowsV.Scan(&arete, &fechaNac, &pesoActual)
			
			// Cálculo de meses exacto por calendario
			birth, err := time.Parse("2006-01-02", fechaNac)
			months := 0
			if err == nil {
				years := now.Year() - birth.Year()
				months = years*12 + int(now.Month()) - int(birth.Month())
				if now.Day() < birth.Day() {
					months--
				}
			}

			if months < 0 { months = 0 }
			
			// Misma regla que el semáforo del hato: rojo = pasó la meta en peso Y edad
			// (desde 43 kg y 4 meses cumplidos); amarillo = ya cerca en alguno de los dos.
			color := "verde"
			if months >= 4 && pesoActual >= listoPesoVenta {
				color = "rojo"
			} else if months >= 3 || pesoActual >= 35 {
				color = "amarillo"
			} else if months <= 1 {
				continue // Muy jóvenes para alerta
			}

			alertasVenta = append(alertasVenta, map[string]interface{}{
				"arete": arete,
				"meses": months,
				"peso":  pesoActual,
				"color": color,
			})
		}
		rowsV.Close()
	}

	// ESTADÍSTICAS DE ENFERMEDADES POR TEMPORADA
	// Temporadas (Norte): Primavera (Mar-May), Verano (Jun-Ago), Otoño (Sep-Nov), Invierno (Dic-Feb)
	enfermedades := map[string]map[string]int{
		"Primavera": {}, "Verano": {}, "Otoño": {}, "Invierno": {},
	}
	rowsE, err := a.db.Query(a.q(`
		SELECT r.diagnostico, r.fecha 
		FROM recetas_veterinarias r 
		WHERE r.user_id = ?`), a.tenantID())
	
	if err == nil {
		for rowsE.Next() {
			var diag, fecha string
			rowsE.Scan(&diag, &fecha)
			t, _ := time.Parse("2006-01-02", fecha)
			season := "Invierno"
			month := t.Month()
			if month >= 3 && month <= 5 { season = "Primavera" }
			if month >= 6 && month <= 8 { season = "Verano" }
			if month >= 9 && month <= 11 { season = "Otoño" }
			
			if diag != "" {
				enfermedades[season][diag]++
			}
		}
		rowsE.Close()
	}

	var totalDiag int
	a.db.QueryRow(a.q("SELECT COUNT(*) FROM diagnostico_gestacion WHERE user_id = ?"), a.tenantID()).Scan(&totalDiag)
	var positivas int
	a.db.QueryRow(a.q("SELECT COUNT(*) FROM diagnostico_gestacion WHERE user_id = ? AND resultado = 1"), a.tenantID()).Scan(&positivas)
	porcentajeGestacion := float64(0)
	if totalDiag > 0 {
		porcentajeGestacion = float64(positivas) / float64(totalDiag) * 100
	}
	
	var partos int
	a.db.QueryRow(a.q("SELECT COUNT(DISTINCT animal_id) FROM partos WHERE user_id = ?"), a.tenantID()).Scan(&partos)
	porcentajeParicion := float64(0)
	if positivas > 0 {
		porcentajeParicion = float64(partos) / float64(positivas) * 100
	}

	stats := map[string]interface{}{
		"total_cabezas": total,
		"en_engorda":    engorda,
		"pie_de_cria":   cria,
		"bajas":         bajas,
		"corrales":      corralesData,
		"alertas_venta": alertasVenta,
		"enfermedades":  enfermedades,
		"porcentaje_gestacion": porcentajeGestacion,
		"porcentaje_paricion": porcentajeParicion,
	}
	return stats, nil
}

// ConfirmarUltrasonido registra resultados de escaneo
func (a *App) ConfirmarUltrasonido(animalID string, preñada bool, fetos int) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}

	estado := "Vacía"
	if preñada {
		estado = "Pregñada Confirmada"
	}

	_, err := a.db.Exec(a.q("UPDATE animales SET estado_reproductivo = ?, conteo_fetos = ? WHERE id = ?"),
		estado, fetos, animalID)
	if err != nil {
		return err
	}
	a.queueSync("update", "animal", animalID, map[string]interface{}{
		"id": animalID, "estado_reproductivo": estado, "conteo_fetos": fetos,
	})
	
	// Si es positivo, generar tarea de seguimiento
	if preñada {
		tarea := Tarea{
			ID:          uuid.New().String(),
			Titulo:      "REVISIÓN: Segundo Ultrasonido",
			Descripcion: "Verificar viabilidad fetal del animal " + animalID,
			FechaVenc:   time.Now().AddDate(0, 0, 45).Format("2006-01-02"),
			Estatus:     "Pendiente",
			Prioridad:   "Media",
		}
		if _, terr := a.db.Exec(a.q(`INSERT INTO tareas (id, user_id, titulo, descripcion, fecha_vencimiento, estatus, prioridad) 
			VALUES (?, ?, ?, ?, ?, ?, ?)`),
			tarea.ID, a.tenantID(), tarea.Titulo, tarea.Descripcion, tarea.FechaVenc, tarea.Estatus, tarea.Prioridad); terr == nil {
			a.queueSync("insert", "tarea", tarea.ID, tarea)
		}
	}
	
	return nil
}

// MoverAnimal registra cambio de corral
func (a *App) MoverAnimal(animalID string, toCorralID string, motivo string) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}

	// Obtener origen
	var fromCorralID string
	_ = a.db.QueryRow(a.q("SELECT corral_id FROM animales WHERE id = ?"), animalID).Scan(&fromCorralID)

	// Registrar movimiento
	movID := uuid.New().String()
	fechaMov := time.Now().Format("2006-01-02")
	_, err := a.db.Exec(a.q(`INSERT INTO movimientos 
		(id, user_id, animal_id, corral_previo, corral_nuevo, fecha_movimiento, motivo) 
		VALUES (?, ?, ?, ?, ?, ?, ?)`),
		movID, a.tenantID(), animalID, fromCorralID, toCorralID, fechaMov, motivo)
	
	if err != nil {
		return err
	}
	a.queueSync("insert", "movimiento", movID, map[string]interface{}{
		"id": movID, "animal_id": animalID, "corral_previo": fromCorralID, "corral_nuevo": toCorralID,
		"fecha_movimiento": fechaMov, "motivo": motivo,
	})

	// Actualizar animal
	_, err = a.db.Exec(a.q("UPDATE animales SET corral_id = ? WHERE id = ?"), toCorralID, animalID)
	if err == nil {
		a.queueSync("update", "animal", animalID, map[string]interface{}{"id": animalID, "corral_id": toCorralID})
	}
	return err
}

// GetInsumos obtiene lista de medicamentos y suministros
func (a *App) GetInsumos() ([]Insumo, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	rows, err := a.db.Query(a.q(`SELECT id, COALESCE(nombre, ''), COALESCE(tipo, ''), COALESCE(unidad, ''), stock_actual, stock_minimo, costo_unitario, dias_retiro, COALESCE(lote, ''), COALESCE(fecha_vencimiento, ''), COALESCE(proveedor, '') 
		FROM insumos WHERE user_id = ?`), a.tenantID())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var insumos []Insumo
	for rows.Next() {
		var i Insumo
		err := rows.Scan(&i.ID, &i.Nombre, &i.Tipo, &i.Unidad, &i.StockActual, &i.StockMinimo, &i.CostoUnitario, &i.DiasRetiro, &i.Lote, &i.FechaVencimiento, &i.Proveedor)
		if err == nil {
			insumos = append(insumos, i)
		}
	}
	return insumos, nil
}

// AddInsumo agrega un nuevo medicamento o suministro
func (a *App) AddInsumo(i Insumo) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}
	if i.ID == "" {
		i.ID = uuid.New().String()
	}

	_, err := a.db.Exec(a.q(`INSERT INTO insumos 
		(id, user_id, nombre, tipo, unidad, stock_actual, stock_minimo, costo_unitario, dias_retiro, lote, fecha_vencimiento, proveedor) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
		i.ID, a.tenantID(), i.Nombre, i.Tipo, i.Unidad, i.StockActual, i.StockMinimo, i.CostoUnitario, i.DiasRetiro, i.Lote, i.FechaVencimiento, i.Proveedor)
	if err == nil {
		a.queueSync("insert", "insumo", i.ID, i)
	}
	return err
}

// RegistrarTratamiento aplica medicamento a un animal y actualiza stock.
func (a *App) RegistrarTratamiento(t Tratamiento) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	
	// Obtener info del insumo para calcular retiro
	var diasRetiro int
	var nombreInsumo string
	err := a.db.QueryRow(a.q("SELECT dias_retiro, nombre FROM insumos WHERE id = ?"), t.InsumoID).Scan(&diasRetiro, &nombreInsumo)
	if err != nil {
		return fmt.Errorf("insumo no encontrado")
	}

	if t.Fecha == "" {
		t.Fecha = time.Now().Format("2006-01-02")
	}
	parsedFecha, _ := time.Parse("2006-01-02", t.Fecha)
	t.FechaFinRetiro = parsedFecha.AddDate(0, 0, diasRetiro).Format("2006-01-02")

	// Iniciar transacción
	tx, err := a.db.Begin()
	if err != nil {
		return err
	}

	// 1. Insertar tratamiento inicial
	_, err = tx.Exec(a.q(`INSERT INTO tratamientos 
		(id, user_id, animal_id, insumo_id, dosis, via_administracion, fecha, fecha_fin_retiro, tecnico, observaciones) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
		t.ID, a.tenantID(), t.AnimalID, t.InsumoID, t.Dosis, t.ViaAdministracion,
		t.Fecha, t.FechaFinRetiro, t.Tecnico, t.Observaciones)
	
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Descontar stock
	_, err = tx.Exec(a.q("UPDATE insumos SET stock_actual = stock_actual - ? WHERE id = ?"), t.Dosis, t.InsumoID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 3. Registrar movimiento de insumo
	movID := uuid.New().String()
	_, err = tx.Exec(a.q(`INSERT INTO movimientos_insumo 
		(id, user_id, insumo_id, tipo, cantidad, fecha, motivo, animal_id) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
		movID, a.tenantID(), t.InsumoID, "Salida", t.Dosis, t.Fecha, "Tratamiento Animal", t.AnimalID)
	
	if err != nil {
		tx.Rollback()
		return err
	}

	// 4. Generar Tareas Recordatorias para días subsecuentes
	var recordatorios []Tarea
	if t.DuracionDias > 1 {
		for i := 1; i < t.DuracionDias; i++ {
			taskID := uuid.New().String()
			fechaVenc := parsedFecha.AddDate(0, 0, i).Format("2006-01-02")
			titulo := fmt.Sprintf("REMINDER: Medicar %s - Animal %s", nombreInsumo, t.AnimalID)
			desc := fmt.Sprintf("APLICACIÓN REQUERIDA: Día %d de %d. Dosis: %.2f. Vía: %s. Obs: %s", i+1, t.DuracionDias, t.Dosis, t.ViaAdministracion, t.Observaciones)
			
			_, err = tx.Exec(a.q(`INSERT INTO tareas 
				(id, user_id, asignado_a, creado_por, titulo, descripcion, estatus, fecha_vencimiento, animal_id, insumo_id, prioridad) 
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
				taskID, a.tenantID(), "", a.tenantID(), titulo, desc, "Pendiente", 
				fechaVenc, t.AnimalID, t.InsumoID, "Alta")
			
			if err != nil {
				tx.Rollback()
				return err
			}
			recordatorios = append(recordatorios, Tarea{
				ID: taskID, AsignadoA: "", CreadoPor: a.tenantID(), Titulo: titulo, Descripcion: desc,
				Estatus: "Pendiente", FechaVenc: fechaVenc, AnimalID: t.AnimalID, InsumoID: t.InsumoID, Prioridad: "Alta",
			})
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	// Encolar para la nube exactamente lo que se escribió localmente.
	// El struct Tratamiento trae duracion_dias, que no es columna, así que
	// se arma el payload a mano con las columnas del INSERT.
	a.queueSync("insert", "tratamiento", t.ID, map[string]interface{}{
		"id": t.ID, "animal_id": t.AnimalID, "insumo_id": t.InsumoID, "dosis": t.Dosis,
		"via_administracion": t.ViaAdministracion, "fecha": t.Fecha, "fecha_fin_retiro": t.FechaFinRetiro,
		"tecnico": t.Tecnico, "observaciones": t.Observaciones,
	})
	var stockActual float64
	if qerr := a.db.QueryRow(a.q("SELECT stock_actual FROM insumos WHERE id = ?"), t.InsumoID).Scan(&stockActual); qerr == nil {
		a.queueSync("update", "insumo", t.InsumoID, map[string]interface{}{"id": t.InsumoID, "stock_actual": stockActual})
	}
	a.queueSync("insert", "movimiento_insumo", movID, map[string]interface{}{
		"id": movID, "insumo_id": t.InsumoID, "tipo": "Salida", "cantidad": t.Dosis,
		"fecha": t.Fecha, "motivo": "Tratamiento Animal", "animal_id": t.AnimalID,
	})
	for _, r := range recordatorios {
		a.queueSync("insert", "tarea", r.ID, r)
	}
	return nil
}

// RegistrarParto finaliza la gestación
func (a *App) RegistrarParto(p Parto) error {
	if a.user == nil {
		return fmt.Errorf("no autorizado")
	}
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	
	tx, err := a.db.Begin()
	if err != nil {
		return err
	}

	// 1. Insertar en tabla partos
	_, err = tx.Exec(a.q(`INSERT INTO partos (id, user_id, animal_id, fecha, cantidad_crias, tipo_parto, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)`),
		p.ID, a.tenantID(), p.AnimalID, p.Fecha, p.CantidadCrias, p.TipoParto, p.Observaciones)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Actualizar estado de la madre
	_, err = tx.Exec(a.q("UPDATE animales SET estado_reproductivo = 'Lactancia', conteo_fetos = 0 WHERE id = ?"), p.AnimalID)
	if err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	a.queueSync("insert", "parto", p.ID, p)
	a.queueSync("update", "animal", p.AnimalID, map[string]interface{}{
		"id": p.AnimalID, "estado_reproductivo": "Lactancia", "conteo_fetos": 0,
	})
	return nil
}

func (a *App) GetPartos(animalID string) ([]Parto, error) {
	query := "SELECT id, animal_id, COALESCE(fecha, ''), cantidad_crias, COALESCE(tipo_parto, ''), COALESCE(observaciones, '') FROM partos"
	var args []interface{}
	if animalID != "" {
		query += " WHERE animal_id = ?"
		args = append(args, animalID)
	}
	query += " ORDER BY fecha DESC"

	rows, err := a.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []Parto
	for rows.Next() {
		var p Parto
		var tipoParto string
		if err := rows.Scan(&p.ID, &p.AnimalID, &p.Fecha, &p.CantidadCrias, &tipoParto, &p.Observaciones); err == nil {
			p.TipoParto = tipoParto
			res = append(res, p)
		}
	}
	return res, nil
}

func (a *App) RegistrarDiagnosticoGestacion(dg DiagnosticoGestacion) error {
	if a.user == nil {
		return fmt.Errorf("no autorizado")
	}
	if dg.ID == "" {
		dg.ID = uuid.New().String()
	}
	_, err := a.db.Exec(a.q(`INSERT INTO diagnostico_gestacion (id, user_id, animal_id, fecha, condicion_corporal, resultado, conteo_fetos, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
		dg.ID, a.tenantID(), dg.AnimalID, dg.Fecha, dg.CondicionCorporal, dg.Resultado, dg.ConteoFetos, dg.Observaciones)
	if err == nil {
		a.queueSync("insert", "diagnostico_gestacion", dg.ID, dg)
	}
	return err
}

func (a *App) GetDiagnosticosGestacion(animalID string) ([]DiagnosticoGestacion, error) {
	rows, err := a.db.Query(a.q("SELECT id, animal_id, COALESCE(fecha, ''), condicion_corporal, resultado, conteo_fetos, COALESCE(observaciones, '') FROM diagnostico_gestacion WHERE animal_id = ? ORDER BY fecha DESC"), animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []DiagnosticoGestacion
	for rows.Next() {
		var dg DiagnosticoGestacion
		if err := rows.Scan(&dg.ID, &dg.AnimalID, &dg.Fecha, &dg.CondicionCorporal, &dg.Resultado, &dg.ConteoFetos, &dg.Observaciones); err == nil {
			res = append(res, dg)
		}
	}
	return res, nil
}

func (a *App) CrearRecetaVeterinaria(rv RecetaVeterinaria) error {
	if a.user == nil {
		return fmt.Errorf("no autorizado")
	}
	if rv.ID == "" {
		rv.ID = uuid.New().String()
	}
	rv.Fecha = time.Now().Format("2006-01-02")
	_, err := a.db.Exec(a.q(`INSERT INTO recetas_veterinarias (id, user_id, animal_id, mvz, productor, fecha, peso, diagnostico, tratamiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
		rv.ID, a.tenantID(), rv.AnimalID, rv.MVZ, rv.Productor, rv.Fecha, rv.Peso, rv.Diagnostico, rv.Tratamiento)
	if err == nil {
		a.queueSync("insert", "receta", rv.ID, rv)
	}
	return err
}

func (a *App) GetRecetas(animalID string) ([]RecetaVeterinaria, error) {
	rows, err := a.db.Query(a.q("SELECT id, animal_id, COALESCE(mvz, ''), COALESCE(productor, ''), COALESCE(fecha, ''), peso, COALESCE(diagnostico, ''), COALESCE(tratamiento, '') FROM recetas_veterinarias WHERE animal_id = ? ORDER BY fecha DESC"), animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []RecetaVeterinaria
	for rows.Next() {
		var rv RecetaVeterinaria
		if err := rows.Scan(&rv.ID, &rv.AnimalID, &rv.MVZ, &rv.Productor, &rv.Fecha, &rv.Peso, &rv.Diagnostico, &rv.Tratamiento); err == nil {
			res = append(res, rv)
		}
	}
	return res, nil
}

// GetTareas obtiene lista de recordatorios y tareas para el usuario
func (a *App) GetTareas() ([]Tarea, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	rows, err := a.db.Query(a.q(`SELECT id, COALESCE(asignado_a, ''), COALESCE(creado_por, ''), COALESCE(titulo, ''), COALESCE(descripcion, ''), COALESCE(estatus, ''), COALESCE(fecha_vencimiento, ''), COALESCE(animal_id, ''), COALESCE(insumo_id, ''), COALESCE(prioridad, '') 
		FROM tareas WHERE user_id = ? OR asignado_a = ? ORDER BY fecha_vencimiento ASC`), a.tenantID(), a.user.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tareas []Tarea
	for rows.Next() {
		var t Tarea
		err := rows.Scan(&t.ID, &t.AsignadoA, &t.CreadoPor, &t.Titulo, &t.Descripcion, &t.Estatus, &t.FechaVenc, &t.AnimalID, &t.InsumoID, &t.Prioridad)
		if err == nil {
			tareas = append(tareas, t)
		}
	}
	return tareas, nil
}

// AddTarea crea un nuevo recordatorio o tarea
func (a *App) AddTarea(t Tarea) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	if t.Estatus == "" {
		t.Estatus = "Pendiente"
	}
	t.CreadoPor = a.user.ID

	_, err := a.db.Exec(a.q(`INSERT INTO tareas 
		(id, user_id, asignado_a, creado_por, titulo, descripcion, estatus, fecha_vencimiento, animal_id, insumo_id, prioridad) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
		t.ID, a.tenantID(), t.AsignadoA, t.CreadoPor, t.Titulo, t.Descripcion, t.Estatus, 
		t.FechaVenc, t.AnimalID, t.InsumoID, t.Prioridad)
	if err == nil {
		a.queueSync("insert", "tarea", t.ID, t)
	}
	return err
}

// CompletarTarea marca una tarea como terminada
func (a *App) CompletarTarea(tareaID string) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}

	_, err := a.db.Exec(a.q("UPDATE tareas SET estatus = 'Completada' WHERE id = ?"), tareaID)
	if err == nil {
		a.queueSync("update", "tarea", tareaID, map[string]interface{}{"id": tareaID, "estatus": "Completada"})
	}
	return err
}

// GetHistorialClinico obtiene tratamientos de un animal (o de todos si animalID está vacío)
func (a *App) GetHistorialClinico(animalID string) ([]map[string]interface{}, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	var rows *sql.Rows
	var err error
	if animalID != "" {
		rows, err = a.db.Query(a.q(`
			SELECT t.fecha, i.nombre, t.dosis, i.unidad, t.tecnico, t.observaciones, t.fecha_fin_retiro, t.animal_id
			FROM tratamientos t
			JOIN insumos i ON t.insumo_id = i.id
			WHERE t.animal_id = ?
			ORDER BY t.fecha DESC`), animalID)
	} else {
		rows, err = a.db.Query(a.q(`
			SELECT t.fecha, i.nombre, t.dosis, i.unidad, t.tecnico, t.observaciones, t.fecha_fin_retiro, t.animal_id
			FROM tratamientos t
			JOIN insumos i ON t.insumo_id = i.id
			ORDER BY t.fecha DESC`))
	}
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var historial []map[string]interface{}
	for rows.Next() {
		var fecha, nombre, unidad, tecnico, observaciones, fechaRetiro, animalIDStr string
		var dosis float64
		rows.Scan(&fecha, &nombre, &dosis, &unidad, &tecnico, &observaciones, &fechaRetiro, &animalIDStr)
		historial = append(historial, map[string]interface{}{
			"fecha":             fecha,
			"insumo":            nombre,
			"dosis":             dosis,
			"unidad":            unidad,
			"tecnico":           tecnico,
			"observaciones":     observaciones,
			"fecha_fin_retiro":  fechaRetiro,
			"animal_id":         animalIDStr,
			"en_retiro":         time.Now().Before(parseDate(fechaRetiro)),
		})
	}
	return historial, nil
}

func parseDate(s string) time.Time {
	t, _ := time.Parse("2006-01-02", s)
	return t
}

// --- USER MANAGEMENT ---

// GetUsers obtiene todos los usuarios del sistema
func (a *App) GetUsers() ([]User, error) {
	if a.user == nil || (a.user.Role != "Admin" && a.user.Role != "SuperAdmin") {
		return nil, fmt.Errorf("no autorizado")
	}

	var rows *sql.Rows
	var err error
	if a.user.Role == "SuperAdmin" {
		rows, err = a.db.Query(a.q("SELECT id, email, name, role, created_at FROM users"))
	} else {
		rows, err = a.db.Query(a.q("SELECT id, email, name, role, created_at FROM users WHERE rancho_id = ? OR id = ?"), a.tenantID(), a.tenantID())
	}
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		var createdAt string
		err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &createdAt)
		if err == nil {
			u.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
			users = append(users, u)
		}
	}
	return users, nil
}

// AddUser registra un nuevo trabajador
func (a *App) AddUser(u User) error {
	if a.user == nil || (a.user.Role != "Admin" && a.user.Role != "SuperAdmin") {
		return fmt.Errorf("no autorizado")
	}

	if u.ID == "" {
		u.ID = uuid.New().String()
	}

	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = a.db.Exec(a.q("INSERT INTO users (id, email, password, name, role, rancho_id) VALUES (?, ?, ?, ?, ?, ?)"),
		u.ID, u.Email, string(hashedPwd), u.Name, u.Role, a.tenantID())
	return err
}

// UpdateUser actualiza datos de un usuario
func (a *App) UpdateUser(u User) error {
	if a.user == nil || (a.user.Role != "Admin" && a.user.Role != "SuperAdmin") {
		return fmt.Errorf("no autorizado")
	}

	_, err := a.db.Exec(a.q("UPDATE users SET email = ?, name = ?, role = ? WHERE id = ?"),
		u.Email, u.Name, u.Role, u.ID)
	return err
}

// DeleteUser elimina un usuario
func (a *App) DeleteUser(id string) error {
	if a.user == nil || (a.user.Role != "Admin" && a.user.Role != "SuperAdmin") {
		return fmt.Errorf("no autorizado")
	}

	if id == a.user.ID {
		return fmt.Errorf("no puedes eliminarte a ti mismo")
	}

	_, err := a.db.Exec(a.q("DELETE FROM users WHERE id = ?"), id)
	return err
}

// ChangePassword permite al usuario actual cambiar su contraseña
func (a *App) ChangePassword(oldPwd, newPwd string) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}

	var currentPwd string
	err := a.db.QueryRow(a.q("SELECT password FROM users WHERE id = ?"), a.user.ID).Scan(&currentPwd)
	if err != nil {
		return err
	}

	err = bcrypt.CompareHashAndPassword([]byte(currentPwd), []byte(oldPwd))
	if err != nil {
		return fmt.Errorf("la contraseña actual es incorrecta")
	}

	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(newPwd), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = a.db.Exec(a.q("UPDATE users SET password = ? WHERE id = ?"), string(hashedPwd), a.user.ID)
	return err
}

// GetCurrentUser devuelve la información del usuario en sesión
func (a *App) GetCurrentUser() (User, error) {
	if a.user == nil {
		return User{}, fmt.Errorf("no autenticado")
	}
	return *a.user, nil
}

// AddSeguimientoPeso registra un nuevo pesaje mensual
func (a *App) AddSeguimientoPeso(sp SeguimientoPeso) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}
	if sp.ID == "" {
		sp.ID = uuid.New().String()
	}
	if sp.Fecha == "" {
		sp.Fecha = time.Now().Format("2006-01-02")
	}

	_, err := a.db.Exec(a.q(`INSERT INTO seguimientos_peso (id, user_id, animal_id, fecha, peso, notas) VALUES (?, ?, ?, ?, ?, ?)`),
		sp.ID, a.tenantID(), sp.AnimalID, sp.Fecha, sp.Peso, sp.Notas)
	if err == nil {
		a.queueSync("insert", "seguimiento_peso", sp.ID, sp)
	}
	return err
}

// GetSeguimientosPeso obtiene el historial de pesajes de un animal (o de todos si animalID está vacío)
func (a *App) GetSeguimientosPeso(animalID string) ([]SeguimientoPeso, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	var rows *sql.Rows
	var err error
	if animalID != "" {
		rows, err = a.db.Query(a.q(`SELECT id, animal_id, fecha, peso, COALESCE(notas, '') FROM seguimientos_peso WHERE animal_id = ? ORDER BY fecha DESC`), animalID)
	} else {
		rows, err = a.db.Query(a.q(`SELECT id, animal_id, fecha, peso, COALESCE(notas, '') FROM seguimientos_peso ORDER BY fecha DESC`))
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var seguimientos []SeguimientoPeso
	for rows.Next() {
		var sp SeguimientoPeso
		err := rows.Scan(&sp.ID, &sp.AnimalID, &sp.Fecha, &sp.Peso, &sp.Notas)
		if err == nil {
			seguimientos = append(seguimientos, sp)
		}
	}
	return seguimientos, nil
}
// ImportAnimalsExcel importa animales desde un archivo .xlsx
// ImportAnimalsExcelData importa animales desde un buffer de bytes (para carga vía web)
func (a *App) ImportAnimalsExcelData(data []byte) (int, error) {
	if a.user == nil {
		return 0, fmt.Errorf("no autenticado")
	}
	if a.IsDemoMode {
		return 0, fmt.Errorf("Modo Lectura Activo: No se permiten importaciones.")
	}

	reader := bytes.NewReader(data)
	f, err := excelize.OpenReader(reader)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	return a.processExcel(f, a.tenantID())
}

// processExcel contiene la lógica común para procesar el archivo excelizado
func (a *App) processExcel(f *excelize.File, userID string) (int, error) {
	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return 0, err
	}

	if len(rows) < 2 {
		return 0, fmt.Errorf("El archivo está vacío o solo contiene encabezados.")
	}

	// Las columnas se reconocen por su encabezado (ver importColumns); si la
	// hoja no trae encabezados reconocibles, se usa el orden histórico.
	cols := resolveImportColumns(rows[0])

	tx, err := a.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	count := 0
	for i, row := range rows {
		if i == 0 {
			continue
		}
		cell := func(key string) string {
			idx, ok := cols[key]
			if !ok || idx < 0 || len(row) <= idx {
				return ""
			}
			return strings.TrimSpace(row[idx])
		}
		arete := cell("arete")
		if arete == "" {
			continue
		}

		id := uuid.New().String()
		raza := cell("raza")
		sexo := cell("sexo")
		if sexo == "" {
			sexo = "Hembra"
		}
		// En la carga masiva el ranchero escribe el NOMBRE del corral, nunca
		// un id. Se traduce a id para que quede como en el resto de la app; si
		// no empareja con ningún corral suyo, se conserva lo que escribió en
		// vez de descartarlo, y la UI lo sigue mostrando tal cual.
		corral := a.corralIDPorNombre(tx, cell("corral"))
		fechaNac := ""
		if val := cell("fecha_nacimiento"); val != "" {
			// Intentar diversos formatos de fecha comunes en Excel/Latam
			formats := []string{"2006-01-02", "02/01/2006", "02-01-2006", "1/2/06"}
			parsedDate := time.Time{}
			for _, f := range formats {
				t, err := time.Parse(f, val)
				if err == nil {
					parsedDate = t
					break
				}
			}
			if !parsedDate.IsZero() {
				fechaNac = parsedDate.Format("2006-01-02")
			} else {
				fechaNac = val // Fallback al original si no parsea
			}
		}
		pesoNacer := 0.0
		if val := cell("peso_nacer"); val != "" {
			fmt.Sscanf(strings.ReplaceAll(val, ",", "."), "%f", &pesoNacer)
		}
		padreId := cell("padre")
		madreId := cell("madre")
		destino := cell("destino")
		if destino == "" {
			destino = "Engorda"
		}
		especie := cell("especie")
		if especie == "" {
			especie = "Ovino"
		}
		tipoParto, metodoConcepcion, tipoNacimiento := cell("tipo_parto"), cell("metodo_concepcion"), cell("tipo_nacimiento")
		abueloPat, abuelaPat, abueloMat, abuelaMat := cell("abuelo_paterno"), cell("abuela_paterna"), cell("abuelo_materno"), cell("abuela_materna")
		pureza := 0.0
		if val := cell("pureza"); val != "" {
			fmt.Sscanf(strings.TrimSuffix(strings.ReplaceAll(val, ",", "."), "%"), "%f", &pureza)
		}
		esRef := 0
		switch strings.ToLower(cell("referencia")) {
		case "si", "sí", "1", "true", "x", "yes":
			esRef = 1
		}

		_, err = tx.Exec(a.q(`INSERT INTO animales (id, user_id, especie, arete, raza, sexo, corral_id, fecha_nacimiento, peso_nacer, padre_id, madre_id, destino, estatus, estado_reproductivo,
			tipo_parto, metodo_concepcion, tipo_nacimiento, abuelo_paterno_id, abuela_paterna_id, abuelo_materno_id, abuela_materna_id,
			es_referencia, nombre, tatuaje_der, tatuaje_izq, tatuaje_cola, color, pureza, grado_registro, registro, siniiga, id_electronica) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
			id, userID, especie, arete, raza, sexo, corral, fechaNac, pesoNacer, padreId, madreId, destino, "Activo", "Crecimiento",
			tipoParto, metodoConcepcion, tipoNacimiento, abueloPat, abuelaPat, abueloMat, abuelaMat,
			esRef, cell("nombre"), cell("tatuaje_der"), cell("tatuaje_izq"), cell("tatuaje_cola"), cell("color"), pureza, cell("grado_registro"), cell("registro"), cell("siniiga"), cell("id_electronica"))

		if err != nil {
			return count, fmt.Errorf("Error en fila %d: %v", i+1, err)
		}
		count++
	}

	err = tx.Commit()
	return count, err
}

// ImportAnimalsExcel importa animales desde una ruta de archivo (para escritorio)
func (a *App) ImportAnimalsExcel(path string) (int, error) {
	if a.user == nil {
		return 0, fmt.Errorf("no autenticado")
	}
	if a.IsDemoMode {
		return 0, fmt.Errorf("Modo Lectura Activo: No se permiten importaciones.")
	}

	f, err := excelize.OpenFile(path)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	return a.processExcel(f, a.tenantID())
}

// SyncToJarvis sincroniza los animales locales con el backend central en la nube de JARVIS.
func (a *App) SyncToJarvis() (string, error) {
	if a.user == nil {
		return "", fmt.Errorf("no autenticado")
	}
	
	animales, err := a.GetAnimales()
	if err != nil {
		return "", fmt.Errorf("error obteniendo animales: %v", err)
	}

	payload, err := json.Marshal(map[string]interface{}{
		"source": "master_sheep",
		"userId": a.user.ID,
		"animales": animales,
	})
	if err != nil {
		return "", fmt.Errorf("error serializando datos: %v", err)
	}

	// Post data to JARVIS
	jarvisURL := "http://localhost:3000/api/sync/master-sheep"
	resp, err := http.Post(jarvisURL, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return "", fmt.Errorf("error conectando con JARVIS en %s: %v", jarvisURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("JARVIS devolvió estado de error: %d", resp.StatusCode)
	}

	return fmt.Sprintf("Sincronización a JARVIS completada. %d animales enviados.", len(animales)), nil
}

// GetEventosReproductivos obtiene todo el historial de montas e IAs
func (a *App) GetEventosReproductivos() ([]EventoReproductivo, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	rows, err := a.db.Query(a.q(`SELECT id, animal_id, tipo, fecha_evento, COALESCE(fecha_fin_monta, ''), id_macho, COALESCE(lote_semen, ''), COALESCE(tecnico, ''), COALESCE(protocolo, ''), fecha_probable_parto, conteo_fetos, resultado, COALESCE(notas, '') FROM eventos_reproductivos ORDER BY fecha_evento DESC`))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []EventoReproductivo
	for rows.Next() {
		var ev EventoReproductivo
		err := rows.Scan(&ev.ID, &ev.AnimalID, &ev.Tipo, &ev.FechaEvento, &ev.FechaFinMonta, &ev.IDMacho, &ev.LoteSemen, &ev.Tecnico, &ev.Protocolo, &ev.FechaProbableParto, &ev.ConteoFetos, &ev.Resultado, &ev.Notas)
		if err == nil {
			events = append(events, ev)
		}
	}
	return events, nil
}
