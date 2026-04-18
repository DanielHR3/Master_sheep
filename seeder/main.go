package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

func main() {
	home, _ := os.UserHomeDir()
	dbPath := filepath.Join(home, "Documents", "SheepMaster", "sheepmaster.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 0. Asegurar esquema (Actualizado para DON PABLITO)
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
		peso REAL,
		fecha TEXT,
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
	`
	_, err = db.Exec(schema)
	if err != nil {
		log.Fatal("Error creando esquema: ", err)
	}

	// 1. Limpiar datos
	_, _ = db.Exec("DELETE FROM seguimientos_peso")
	_, _ = db.Exec("DELETE FROM eventos_reproductivos")
	_, _ = db.Exec("DELETE FROM animales")
	_, _ = db.Exec("DELETE FROM corrales")
	_, _ = db.Exec("DELETE FROM users")

	userId := uuid.New().String()
	hashedPwd, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	
	_, err = db.Exec(`INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)`,
		userId, "admin@sheepmaster.com", string(hashedPwd), "Admin SheepMaster", "Administrador")
	if err != nil {
		log.Fatal(err)
	}

	// 2. Corrales (12 Corrales de Piso Elevado)
	for i := 1; i <= 12; i++ {
		nombre := fmt.Sprintf("Corral %d (Elevado)", i)
		_, err = db.Exec(`INSERT INTO corrales (id, user_id, nombre, tipo, capacidad) VALUES (?, ?, ?, ?, ?)`,
			uuid.New().String(), userId, nombre, "Engorda", 10)
		if err != nil {
			log.Fatal(err)
		}
	}

	// 3. Animales (Semental y Madre para genealogía)
	sementalId := uuid.New().String()
	madreId := uuid.New().String()
	
	_, _ = db.Exec(`INSERT INTO animales (id, user_id, arete, raza, sexo, estatus, estado_reproductivo, destino) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		sementalId, userId, "PABLITO-S01", "Dorper", "Macho", "Activo", "Mantenimiento", "Pie de Cría")
	
	_, _ = db.Exec(`INSERT INTO animales (id, user_id, arete, raza, sexo, estatus, estado_reproductivo, destino) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		madreId, userId, "PABLITO-M01", "Dorper", "Hembra", "Activo", "Mantenimiento", "Pie de Cría")

	// Corderos en engorda
	for i := 1; i <= 5; i++ {
		id := uuid.New().String()
		arete := fmt.Sprintf("ENG-%03d", i)
		
		var corralId string
		_ = db.QueryRow("SELECT id FROM corrales LIMIT 1 OFFSET ?", i-1).Scan(&corralId)

		_, err = db.Exec(`INSERT INTO animales (id, user_id, arete, raza, sexo, estatus, estado_reproductivo, corral_id, padre_id, madre_id, destino, fecha_nacimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			id, userId, arete, "Dorper", "Macho", "Activo", "Crecimiento", corralId, sementalId, madreId, "Engorda", "2024-01-15")

		// Pesajes mensuales
		pesos := []float64{4.5, 12.0, 22.5, 35.0} // Nacimiento, Destete, Mes 1, Mes 2
		for j, p := range pesos {
			fecha := time.Now().AddDate(0, -3+j, 0).Format("2006-01-02")
			_, _ = db.Exec(`INSERT INTO seguimientos_peso (id, user_id, animal_id, peso, fecha, notas) VALUES (?, ?, ?, ?, ?, ?)`,
				uuid.New().String(), userId, id, p, fecha, fmt.Sprintf("Control Pesaje %d", j))
		}
	}

	fmt.Println("¡Base de datos de SHEEPMASTER sembrada con éxito!")
}
