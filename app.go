package main

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

// App struct
type App struct {
	ctx        context.Context
	db         *sql.DB
	user       *User // Usuario actualmente autenticado
	IsDemoMode bool  // Modo Lectura (Bloquea mutaciones)
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

// initDB inicializa la base de datos SQLite local
func (a *App) initDB() error {
	// Determinar ruta de la base de datos (Carpeta de Documentos del usuario)
	home, _ := os.UserHomeDir()
	dbDir := filepath.Join(home, "Documents", "MasterSheepPro")
	_ = os.MkdirAll(dbDir, 0755)
	dbPath := filepath.Join(dbDir, "master_sheep.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return err
	}
	a.db = db

	// Crear tablas si no existen
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT UNIQUE,
		password TEXT,
		name TEXT,
		role TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS corrales (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		nombre TEXT NOT NULL,
		tipo TEXT,
		capacidad INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
		destino TEXT,
		fecha_defuncion TEXT,
		motivo_defuncion TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, arete)
	);

	CREATE TABLE IF NOT EXISTS seguimientos_peso (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		animal_id TEXT,
		fecha TEXT,
		peso REAL,
		notas TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS partos (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		animal_id TEXT,
		fecha TEXT,
		cantidad_crias INTEGER,
		tipo_parto TEXT,
		observaciones TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT
	);
	`
	_, err = a.db.Exec(schema)
	if err != nil {
		return err
	}

	// Migraciones
	_, _ = a.db.Exec("ALTER TABLE animales ADD COLUMN peso_nacer REAL DEFAULT 0")
	_, _ = a.db.Exec("ALTER TABLE animales ADD COLUMN peso_destete REAL DEFAULT 0")
	_, _ = a.db.Exec("ALTER TABLE animales ADD COLUMN padre_id TEXT")
	_, _ = a.db.Exec("ALTER TABLE animales ADD COLUMN madre_id TEXT")
	_, _ = a.db.Exec("ALTER TABLE animales ADD COLUMN destino TEXT")
	_, _ = a.db.Exec("ALTER TABLE animales ADD COLUMN fecha_defuncion TEXT")
	_, _ = a.db.Exec("ALTER TABLE animales ADD COLUMN motivo_defuncion TEXT")
	_, _ = a.db.Exec("ALTER TABLE tratamientos ADD COLUMN via_administracion TEXT")

	// Insertar usuario administrador por defecto si no existe
	adminID := uuid.New().String()
	hashedPwd, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	// Primero borrar si existe (para reiniciar)
	_, _ = a.db.Exec("DELETE FROM users WHERE email = ?", "admin@mastersheep-pro.com")
	_, err = a.db.Exec("INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)", 
		adminID, "admin@mastersheep-pro.com", string(hashedPwd), "Administrador de Master Sheep Pro", "Admin")
	if err != nil {
		fmt.Printf("Error creando admin: %v\n", err)
	}

	// Cargar configuración de Modo Demo
	var demoVal string
	err = a.db.QueryRow("SELECT value FROM settings WHERE key = 'is_demo_mode'").Scan(&demoVal)
	if err == nil {
		a.IsDemoMode = (demoVal == "true")
	} else {
		// Valor por defecto si no existe
		_, _ = a.db.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('is_demo_mode', 'false')")
		a.IsDemoMode = false
	}

	return nil
}

// ToggleDemoMode activa o desactiva el modo lectura
func (a *App) ToggleDemoMode(enabled bool) error {
	val := "false"
	if enabled {
		val = "true"
	}
	_, err := a.db.Exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('is_demo_mode', ?)", val)
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

// Login maneja la autenticación local
func (a *App) Login(email, password string) error {
	var user User
	var dbPassword string
	fmt.Printf("Intentando login con: %s\n", email)
	err := a.db.QueryRow("SELECT id, email, password, role FROM users WHERE email = ?", email).
		Scan(&user.ID, &user.Email, &dbPassword, &user.Role)
	
	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Printf("Usuario no encontrado: %s\n", email)
			return fmt.Errorf("usuario no encontrado")
		}
		fmt.Printf("Error en query: %v\n", err)
		return err
	}

	fmt.Printf("Usuario encontrado: %s, validando contraseña...\n", user.Email)
	err = bcrypt.CompareHashAndPassword([]byte(dbPassword), []byte(password))
	if err != nil {
		fmt.Printf("Contraseña incorrecta para %s\n", email)
		return fmt.Errorf("contraseña incorrecta")
	}

	fmt.Printf("Login exitoso para %s\n", user.Email)
	a.user = &user
	return nil
}

// GetAnimales obtiene la lista de animales para el usuario actual
func (a *App) GetAnimales() ([]Animal, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	rows, err := a.db.Query(`SELECT id, COALESCE(arete, ''), COALESCE(raza, ''), COALESCE(sexo, ''), COALESCE(fecha_nacimiento, ''), 
		COALESCE(estatus, ''), COALESCE(estado_reproductivo, ''), conteo_fetos, COALESCE(corral_id, ''),
		peso_nacer, peso_destete, COALESCE(padre_id, ''), COALESCE(madre_id, ''), COALESCE(destino, ''),
		COALESCE(fecha_defuncion, ''), COALESCE(motivo_defuncion, '')
		FROM animales WHERE user_id = ?`, a.user.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var animals []Animal
	for rows.Next() {
		var animal Animal
		var arete, raza, sexo, fecha, estatus, repro, corral, padre, madre, destino, fDef, mDef sql.NullString
		err := rows.Scan(&animal.ID, &arete, &raza, &sexo, &fecha, &estatus, &repro, &animal.ConteoFetos, &corral,
			&animal.PesoNacer, &animal.PesoDestete, &padre, &madre, &destino, &fDef, &mDef)
		if err != nil {
			return nil, err
		}
		animal.Arete = arete.String
		animal.Raza = raza.String
		animal.Sexo = sexo.String
		animal.FechaNacimiento = fecha.String
		animal.Estatus = estatus.String
		animal.EstadoRepro = repro.String
		animal.CorralID = corral.String
		animal.PadreID = padre.String
		animal.MadreID = madre.String
		animal.Destino = destino.String
		animal.FechaDefuncion = fDef.String
		animal.MotivoDefuncion = mDef.String
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

	_, err := a.db.Exec(`INSERT INTO animales 
		(id, user_id, arete, raza, sexo, fecha_nacimiento, estatus, estado_reproductivo, conteo_fetos, corral_id, 
		 peso_nacer, peso_destete, padre_id, madre_id, destino, fecha_defuncion, motivo_defuncion) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		animal.ID, a.user.ID, animal.Arete, animal.Raza, animal.Sexo, 
		animal.FechaNacimiento, animal.Estatus, animal.EstadoRepro, 
		animal.ConteoFetos, animal.CorralID, animal.PesoNacer, animal.PesoDestete,
		animal.PadreID, animal.MadreID, animal.Destino, animal.FechaDefuncion, animal.MotivoDefuncion)
	return err
}

// UpdateAnimal actualiza los datos de un animal existente
func (a *App) UpdateAnimal(animal Animal) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}
	_, err := a.db.Exec(`UPDATE animales SET 
		arete = ?, raza = ?, sexo = ?, fecha_nacimiento = ?, estatus = ?, 
		estado_reproductivo = ?, conteo_fetos = ?, corral_id = ?,
		peso_nacer = ?, peso_destete = ?, padre_id = ?, madre_id = ?, 
		destino = ?, fecha_defuncion = ?, motivo_defuncion = ?
		WHERE id = ? AND user_id = ?`,
		animal.Arete, animal.Raza, animal.Sexo, 
		animal.FechaNacimiento, animal.Estatus, 
		animal.EstadoRepro, animal.ConteoFetos, animal.CorralID, 
		animal.PesoNacer, animal.PesoDestete, animal.PadreID, animal.MadreID,
		animal.Destino, animal.FechaDefuncion, animal.MotivoDefuncion,
		animal.ID, a.user.ID)
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
	tables := []string{"tratamientos", "eventos_reproductivos", "tareas", "movimientos", "diagnostico_gestacion", "partos", "recetas_veterinarias"}
	for _, table := range tables {
		_, _ = tx.Exec(fmt.Sprintf("DELETE FROM %s WHERE animal_id = ?", table), id)
	}

	_, err = tx.Exec("DELETE FROM animales WHERE id = ? AND user_id = ?", id, a.user.ID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

// GetCorrales obtiene la lista de corrales
func (a *App) GetCorrales() ([]Corral, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	rows, err := a.db.Query("SELECT id, nombre, tipo, capacidad FROM corrales WHERE user_id = ? ORDER BY nombre ASC", a.user.ID)
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

	// Si está vacío, agregar los 12 corrales de piso elevado para MASTER SHEEP PRO
	if len(corrales) == 0 {
		var initialCorrales []Corral
		for i := 1; i <= 12; i++ {
			c := Corral{
				ID:        uuid.New().String(),
				Nombre:    fmt.Sprintf("Corral %d (Elevado)", i),
				Tipo:      "Engorda - Piso Elevado",
				Capacidad: 10,
			}
			_ = a.AddCorral(c)
			initialCorrales = append(initialCorrales, c)
		}
		return initialCorrales, nil
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

	_, err := a.db.Exec("INSERT INTO corrales (id, user_id, nombre, tipo, capacidad) VALUES (?, ?, ?, ?, ?)",
		corral.ID, a.user.ID, corral.Nombre, corral.Tipo, corral.Capacidad)
	return err
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

	_, err := a.db.Exec(`INSERT INTO eventos_reproductivos 
		(id, user_id, animal_id, tipo, fecha_evento, id_macho, lote_semen, tecnico, protocolo, fecha_probable_parto, resultado)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		event.ID, a.user.ID, event.AnimalID, event.Tipo, 
		event.FechaEvento, event.IDMacho, event.LoteSemen, 
		event.Tecnico, event.Protocolo, event.FechaProbableParto, event.Resultado)
	
	if err != nil {
		return err
	}

	// Actualizar animal
	_, err = a.db.Exec("UPDATE animales SET estado_reproductivo = 'Gestación' WHERE id = ?", event.AnimalID)
	return err
}

// GetStats obtiene los KPIs del dashboard de forma local (Master Sheep Pro)
func (a *App) GetStats() (map[string]interface{}, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	var total int
	a.db.QueryRow("SELECT COUNT(*) FROM animales WHERE user_id = ? AND estatus = 'Activo'", a.user.ID).Scan(&total)

	var engorda int
	a.db.QueryRow("SELECT COUNT(*) FROM animales WHERE user_id = ? AND destino = 'Engorda' AND estatus = 'Activo'", a.user.ID).Scan(&engorda)

	var cria int
	a.db.QueryRow("SELECT COUNT(*) FROM animales WHERE user_id = ? AND destino = 'Pie de Cría' AND estatus = 'Activo'", a.user.ID).Scan(&cria)

	var bajas int
	a.db.QueryRow("SELECT COUNT(*) FROM animales WHERE user_id = ? AND estatus = 'Baja'", a.user.ID).Scan(&bajas)

	// Corrales con ocupación (enfocado en los 12 elevados)
	rows, err := a.db.Query(`
		SELECT c.nombre, COUNT(a.id) as cantidad, c.capacidad 
		FROM corrales c 
		LEFT JOIN animales a ON c.id = a.corral_id AND a.estatus = 'Activo'
		WHERE c.user_id = ? 
		GROUP BY c.id
		ORDER BY c.nombre ASC`, a.user.ID)
	
	corralesData := []map[string]interface{}{}
	if err == nil {
		for rows.Next() {
			var nombre string
			var cantidad int
			var capacidad int
			rows.Scan(&nombre, &cantidad, &capacidad)
			corralesData = append(corralesData, map[string]interface{}{
				"nombre":    nombre,
				"cantidad":  cantidad,
				"capacidad": capacidad,
				"ocupacion": float64(cantidad) / float64(capacidad) * 100,
			})
		}
		rows.Close()
	}

	stats := map[string]interface{}{
		"total_cabezas": total,
		"en_engorda":    engorda,
		"pie_de_cria":   cria,
		"bajas":         bajas,
		"corrales":      corralesData,
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

	_, err := a.db.Exec("UPDATE animales SET estado_reproductivo = ?, conteo_fetos = ? WHERE id = ?",
		estado, fetos, animalID)
	
	// Si es positivo, generar tarea de seguimiento
	if preñada {
		taskID := uuid.New().String()
		vencimiento := time.Now().AddDate(0, 0, 45).Format("2006-01-02")
		a.db.Exec(`INSERT INTO tareas (id, user_id, titulo, descripcion, fecha_vencimiento, estatus, prioridad) 
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			taskID, a.user.ID, "REVISIÓN: Segundo Ultrasonido", "Verificar viabilidad fetal del animal "+animalID, vencimiento, "Pendiente", "Media")
	}
	
	return err
}

// MoverAnimal registra cambio de corral
func (a *App) MoverAnimal(animalID string, toCorralID string, motivo string) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}

	// Obtener origen
	var fromCorralID string
	_ = a.db.QueryRow("SELECT corral_id FROM animales WHERE id = ?", animalID).Scan(&fromCorralID)

	// Registrar movimiento
	movID := uuid.New().String()
	_, err := a.db.Exec(`INSERT INTO movimientos 
		(id, user_id, animal_id, corral_previo, corral_nuevo, fecha_movimiento, motivo) 
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		movID, a.user.ID, animalID, fromCorralID, toCorralID, time.Now().Format("2006-01-02"), motivo)
	
	if err != nil {
		return err
	}

	// Actualizar animal
	_, err = a.db.Exec("UPDATE animales SET corral_id = ? WHERE id = ?", toCorralID, animalID)
	return err
}

// GetInsumos obtiene lista de medicamentos y suministros
func (a *App) GetInsumos() ([]Insumo, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	rows, err := a.db.Query(`SELECT id, COALESCE(nombre, ''), COALESCE(tipo, ''), COALESCE(unidad, ''), stock_actual, stock_minimo, costo_unitario, dias_retiro, COALESCE(lote, ''), COALESCE(fecha_vencimiento, ''), COALESCE(proveedor, '') 
		FROM insumos WHERE user_id = ?`, a.user.ID)
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

	_, err := a.db.Exec(`INSERT INTO insumos 
		(id, user_id, nombre, tipo, unidad, stock_actual, stock_minimo, costo_unitario, dias_retiro, lote, fecha_vencimiento, proveedor) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		i.ID, a.user.ID, i.Nombre, i.Tipo, i.Unidad, i.StockActual, i.StockMinimo, i.CostoUnitario, i.DiasRetiro, i.Lote, i.FechaVencimiento, i.Proveedor)
	return err
}

// RegistrarTratamiento aplica medicamento a un animal y actualiza stock.
func (a *App) RegistrarTratamiento(t Tratamiento) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}
	
	// Obtener info del insumo para calcular retiro
	var diasRetiro int
	var nombreInsumo string
	err := a.db.QueryRow("SELECT dias_retiro, nombre FROM insumos WHERE id = ?", t.InsumoID).Scan(&diasRetiro, &nombreInsumo)
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
	_, err = tx.Exec(`INSERT INTO tratamientos 
		(id, user_id, animal_id, insumo_id, dosis, via_administracion, fecha, fecha_fin_retiro, tecnico, observaciones) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.ID, a.user.ID, t.AnimalID, t.InsumoID, t.Dosis, t.ViaAdministracion,
		t.Fecha, t.FechaFinRetiro, t.Tecnico, t.Observaciones)
	
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Descontar stock
	_, err = tx.Exec("UPDATE insumos SET stock_actual = stock_actual - ? WHERE id = ?", t.Dosis, t.InsumoID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 3. Registrar movimiento de insumo
	movID := uuid.New().String()
	_, err = tx.Exec(`INSERT INTO movimientos_insumo 
		(id, user_id, insumo_id, tipo, cantidad, fecha, motivo, animal_id) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		movID, a.user.ID, t.InsumoID, "Salida", t.Dosis, t.Fecha, "Tratamiento Animal", t.AnimalID)
	
	if err != nil {
		tx.Rollback()
		return err
	}

	// 4. Generar Tareas Recordatorias para días subsecuentes
	if t.DuracionDias > 1 {
		for i := 1; i < t.DuracionDias; i++ {
			taskID := uuid.New().String()
			fechaVenc := parsedFecha.AddDate(0, 0, i).Format("2006-01-02")
			titulo := fmt.Sprintf("REMINDER: Medicar %s - Animal %s", nombreInsumo, t.AnimalID)
			desc := fmt.Sprintf("APLICACIÓN REQUERIDA: Día %d de %d. Dosis: %.2f. Vía: %s. Obs: %s", i+1, t.DuracionDias, t.Dosis, t.ViaAdministracion, t.Observaciones)
			
			_, err = tx.Exec(`INSERT INTO tareas 
				(id, user_id, asignado_a, creado_por, titulo, descripcion, estatus, fecha_vencimiento, animal_id, insumo_id, prioridad) 
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				taskID, a.user.ID, "", a.user.ID, titulo, desc, "Pendiente", 
				fechaVenc, t.AnimalID, t.InsumoID, "Alta")
			
			if err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit()
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
	_, err = tx.Exec(`INSERT INTO partos (id, user_id, animal_id, fecha, cantidad_crias, tipo_parto, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		p.ID, a.user.ID, p.AnimalID, p.Fecha, p.CantidadCrias, p.TipoParto, p.Observaciones)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Actualizar estado de la madre
	_, err = tx.Exec("UPDATE animales SET estado_reproductivo = 'Lactancia', conteo_fetos = 0 WHERE id = ?", p.AnimalID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
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
	_, err := a.db.Exec(`INSERT INTO diagnostico_gestacion (id, user_id, animal_id, fecha, condicion_corporal, resultado, conteo_fetos, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		dg.ID, a.user.ID, dg.AnimalID, dg.Fecha, dg.CondicionCorporal, dg.Resultado, dg.ConteoFetos, dg.Observaciones)
	return err
}

func (a *App) GetDiagnosticosGestacion(animalID string) ([]DiagnosticoGestacion, error) {
	rows, err := a.db.Query("SELECT id, animal_id, COALESCE(fecha, ''), condicion_corporal, resultado, conteo_fetos, COALESCE(observaciones, '') FROM diagnostico_gestacion WHERE animal_id = ? ORDER BY fecha DESC", animalID)
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
	_, err := a.db.Exec(`INSERT INTO recetas_veterinarias (id, user_id, animal_id, mvz, productor, fecha, peso, diagnostico, tratamiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		rv.ID, a.user.ID, rv.AnimalID, rv.MVZ, rv.Productor, time.Now().Format("2006-01-02"), rv.Peso, rv.Diagnostico, rv.Tratamiento)
	return err
}

func (a *App) GetRecetas(animalID string) ([]RecetaVeterinaria, error) {
	rows, err := a.db.Query("SELECT id, animal_id, COALESCE(mvz, ''), COALESCE(productor, ''), COALESCE(fecha, ''), peso, COALESCE(diagnostico, ''), COALESCE(tratamiento, '') FROM recetas_veterinarias WHERE animal_id = ? ORDER BY fecha DESC", animalID)
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

	rows, err := a.db.Query(`SELECT id, COALESCE(asignado_a, ''), COALESCE(creado_por, ''), COALESCE(titulo, ''), COALESCE(descripcion, ''), COALESCE(estatus, ''), COALESCE(fecha_vencimiento, ''), COALESCE(animal_id, ''), COALESCE(insumo_id, ''), COALESCE(prioridad, '') 
		FROM tareas WHERE user_id = ? OR asignado_a = ? ORDER BY fecha_vencimiento ASC`, a.user.ID, a.user.ID)
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

	_, err := a.db.Exec(`INSERT INTO tareas 
		(id, user_id, asignado_a, creado_por, titulo, descripcion, estatus, fecha_vencimiento, animal_id, insumo_id, prioridad) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.ID, a.user.ID, t.AsignadoA, t.CreadoPor, t.Titulo, t.Descripcion, t.Estatus, 
		t.FechaVenc, t.AnimalID, t.InsumoID, t.Prioridad)
	return err
}

// CompletarTarea marca una tarea como terminada
func (a *App) CompletarTarea(tareaID string) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}

	_, err := a.db.Exec("UPDATE tareas SET estatus = 'Completada' WHERE id = ?", tareaID)
	return err
}

// GetHistorialClinico obtiene tratamientos de un animal
func (a *App) GetHistorialClinico(animalID string) ([]map[string]interface{}, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	rows, err := a.db.Query(`
		SELECT t.fecha, i.nombre, t.dosis, i.unidad, t.tecnico, t.observaciones, t.fecha_fin_retiro
		FROM tratamientos t
		JOIN insumos i ON t.insumo_id = i.id
		WHERE t.animal_id = ?
		ORDER BY t.fecha DESC`, animalID)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var historial []map[string]interface{}
	for rows.Next() {
		var fecha, nombre, unidad, tecnico, observaciones, fechaRetiro string
		var dosis float64
		rows.Scan(&fecha, &nombre, &dosis, &unidad, &tecnico, &observaciones, &fechaRetiro)
		historial = append(historial, map[string]interface{}{
			"fecha":             fecha,
			"insumo":            nombre,
			"dosis":             dosis,
			"unidad":            unidad,
			"tecnico":           tecnico,
			"observaciones":     observaciones,
			"fecha_fin_retiro":  fechaRetiro,
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
	if a.user == nil || a.user.Role != "Admin" {
		return nil, fmt.Errorf("no autorizado")
	}

	rows, err := a.db.Query("SELECT id, email, name, role, created_at FROM users")
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
	if a.user == nil || a.user.Role != "Admin" {
		return fmt.Errorf("no autorizado")
	}

	if u.ID == "" {
		u.ID = uuid.New().String()
	}

	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = a.db.Exec("INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)",
		u.ID, u.Email, string(hashedPwd), u.Name, u.Role)
	return err
}

// UpdateUser actualiza datos de un usuario
func (a *App) UpdateUser(u User) error {
	if a.user == nil || a.user.Role != "Admin" {
		return fmt.Errorf("no autorizado")
	}

	_, err := a.db.Exec("UPDATE users SET email = ?, name = ?, role = ? WHERE id = ?",
		u.Email, u.Name, u.Role, u.ID)
	return err
}

// DeleteUser elimina un usuario
func (a *App) DeleteUser(id string) error {
	if a.user == nil || a.user.Role != "Admin" {
		return fmt.Errorf("no autorizado")
	}

	if id == a.user.ID {
		return fmt.Errorf("no puedes eliminarte a ti mismo")
	}

	_, err := a.db.Exec("DELETE FROM users WHERE id = ?", id)
	return err
}

// ChangePassword permite al usuario actual cambiar su contraseña
func (a *App) ChangePassword(oldPwd, newPwd string) error {
	if a.user == nil {
		return fmt.Errorf("no autenticado")
	}

	var currentPwd string
	err := a.db.QueryRow("SELECT password FROM users WHERE id = ?", a.user.ID).Scan(&currentPwd)
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

	_, err = a.db.Exec("UPDATE users SET password = ? WHERE id = ?", string(hashedPwd), a.user.ID)
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

	_, err := a.db.Exec(`INSERT INTO seguimientos_peso (id, user_id, animal_id, fecha, peso, notas) VALUES (?, ?, ?, ?, ?, ?)`,
		sp.ID, a.user.ID, sp.AnimalID, sp.Fecha, sp.Peso, sp.Notas)
	return err
}

// GetSeguimientosPeso obtiene el historial de pesajes de un animal
func (a *App) GetSeguimientosPeso(animalID string) ([]SeguimientoPeso, error) {
	if a.user == nil {
		return nil, fmt.Errorf("no autenticado")
	}

	rows, err := a.db.Query(`SELECT id, animal_id, fecha, peso, COALESCE(notas, '') FROM seguimientos_peso WHERE animal_id = ? ORDER BY fecha ASC`, animalID)
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
	if a.IsDemoMode {
		return 0, fmt.Errorf("Modo Lectura Activo: No se permiten importaciones.")
	}

	reader := bytes.NewReader(data)
	f, err := excelize.OpenReader(reader)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	return a.processExcel(f)
}

// processExcel contiene la lógica común para procesar el archivo excelizado
func (a *App) processExcel(f *excelize.File) (int, error) {
	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return 0, err
	}

	if len(rows) < 2 {
		return 0, fmt.Errorf("El archivo está vacío o solo contiene encabezados.")
	}

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
		if len(row) < 1 || row[0] == "" {
			continue
		}

		id := uuid.New().String()
		arete := row[0]
		raza := ""
		if len(row) > 1 { raza = row[1] }
		sexo := "Hembra"
		if len(row) > 2 { sexo = row[2] }
		corral := ""
		if len(row) > 3 { corral = row[3] }
		fechaNac := ""
		if len(row) > 4 { fechaNac = row[4] }
		pesoNacer := 0.0
		if len(row) > 5 { 
			fmt.Sscanf(row[5], "%f", &pesoNacer) 
		}
		padreId := ""
		if len(row) > 6 { padreId = row[6] }
		madreId := ""
		if len(row) > 7 { madreId = row[7] }
		destino := "Engorda"
		if len(row) > 8 { destino = row[8] }

		_, err = tx.Exec(`INSERT INTO animales (id, arete, raza, sexo, corral_id, fecha_nacimiento, peso_nacer, padre_id, madre_id, destino, estatus, estado_reproductivo) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			id, arete, raza, sexo, corral, fechaNac, pesoNacer, padreId, madreId, destino, "Activo", "Crecimiento")
		
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
	if a.IsDemoMode {
		return 0, fmt.Errorf("Modo Lectura Activo: No se permiten importaciones.")
	}

	f, err := excelize.OpenFile(path)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	return a.processExcel(f)
}
