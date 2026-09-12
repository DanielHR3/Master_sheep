package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
)

// enqueueSync anota un cambio local para subirlo a Supabase más tarde.
// No hace nada en modo servidor: ahí el dato ya vive directo en Postgres.
//
// El payload se guarda como un objeto JSON cuyas llaves son nombres de
// columna de la tabla destino (el bucle de sync lo aplica con un UPSERT
// genérico). Como los structs de dominio no llevan la columna de tenant,
// aquí se inyecta "user_id" = tenantID() si el payload no la trae ya.
func (a *App) enqueueSync(operation, entityType, entityID string, payload interface{}) error {
	if isServerBuild {
		return nil
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	var row map[string]interface{}
	if err := json.Unmarshal(data, &row); err != nil {
		return err
	}
	if _, ok := row["user_id"]; !ok {
		if _, hasRancho := row["rancho_id"]; !hasRancho { // tablas por rancho (rancho_perfil) no tienen user_id
			row["user_id"] = a.tenantID()
		}
	}
	if data, err = json.Marshal(row); err != nil {
		return err
	}
	_, err = a.db.Exec(a.q(`
		INSERT INTO sync_outbox (id, operation, entity_type, entity_id, payload, rancho_id, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`), uuid.New().String(), operation, entityType, entityID, string(data), a.tenantID(), time.Now())
	return err
}

// queueSync es enqueueSync para usarse desde los métodos de negocio: un
// fallo al encolar nunca debe hacer fallar la escritura local (que ya se
// hizo), pero tampoco debe pasar en silencio.
func (a *App) queueSync(operation, entityType, entityID string, payload interface{}) {
	if err := a.enqueueSync(operation, entityType, entityID, payload); err != nil {
		log.Printf("[sync_outbox] no se pudo encolar %s %s/%s: %v", operation, entityType, entityID, err)
	}
}

// pendingSyncCount devuelve cuántos cambios están esperando sincronizarse.
func (a *App) pendingSyncCount() (int, error) {
	var count int
	err := a.db.QueryRow("SELECT COUNT(*) FROM sync_outbox").Scan(&count)
	return count, err
}

// entityTable mapea entity_type (usado en sync_outbox) al nombre real de
// la tabla en Postgres.
var entityTable = map[string]string{
	"animal":                "animales",
	"corral":                "corrales",
	"insumo":                "insumos",
	"tratamiento":           "tratamientos",
	"evento_reproductivo":   "eventos_reproductivos",
	"parto":                 "partos",
	"diagnostico_gestacion": "diagnostico_gestacion",
	"receta":                "recetas_veterinarias",
	"seguimiento_peso":      "seguimientos_peso",
	"tarea":                 "tareas",
	"movimiento":            "movimientos",
	"movimiento_insumo":     "movimientos_insumo",
	"rancho_perfil":         "rancho_perfil",
}

// safeIdent acepta solo identificadores SQL simples (letras, dígitos y
// guion bajo). Las llaves del payload se interpolan como nombres de columna,
// así que esto es lo que impide que un payload corrupto se vuelva SQL.
var safeIdent = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

// applyUpsert construye un INSERT ... ON CONFLICT (id) DO UPDATE genérico
// a partir de las columnas presentes en `row`, contra Postgres (cloudDB).
// Solo se tocan las columnas que vienen en el payload, así que un "update"
// parcial (id + columnas cambiadas) conserva el resto de la fila.
// Usa placeholders "$1, $2..." — funciona igual contra el cloudDB real
// (Postgres) y, en pruebas, contra SQLite (ver newFakeCloudDB).
func applyUpsert(db *sql.DB, table string, row map[string]interface{}) error {
	if !safeIdent.MatchString(table) {
		return fmt.Errorf("nombre de tabla inválido: %q", table)
	}
	if _, ok := row["id"]; !ok {
		return fmt.Errorf("payload sin id para %s", table)
	}
	cols := make([]string, 0, len(row))
	for col := range row {
		if !safeIdent.MatchString(col) {
			return fmt.Errorf("nombre de columna inválido: %q", col)
		}
		cols = append(cols, col)
	}
	sort.Strings(cols) // orden determinista: facilita leer logs y depurar

	placeholders := make([]string, 0, len(cols))
	updates := make([]string, 0, len(cols))
	args := make([]interface{}, 0, len(cols))
	for i, col := range cols {
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
		if col != "id" {
			updates = append(updates, fmt.Sprintf("%s = excluded.%s", col, col))
		}
		args = append(args, row[col])
	}
	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", table, strings.Join(cols, ", "), strings.Join(placeholders, ", "))
	if len(updates) == 0 {
		query += " ON CONFLICT (id) DO NOTHING"
	} else {
		query += " ON CONFLICT (id) DO UPDATE SET " + strings.Join(updates, ", ")
	}
	_, err := db.Exec(query, args...)
	return err
}

// applyDelete borra una fila por id (cloudDB real o, en pruebas, el
// SQLite de newFakeCloudDB). Para animales y corrales replica la misma
// cascada que hacen DeleteAnimal y DeleteCorral localmente, para no dejar
// historial huérfano ni referencias colgadas en la nube.
func applyDelete(db *sql.DB, table, id string) error {
	if !safeIdent.MatchString(table) {
		return fmt.Errorf("nombre de tabla inválido: %q", table)
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	switch table {
	case "animales":
		for _, t := range []string{
			"tratamientos", "eventos_reproductivos", "tareas", "movimientos",
			"diagnostico_gestacion", "partos", "recetas_veterinarias",
			"seguimientos_peso", "movimientos_insumo",
		} {
			if _, err := tx.Exec(fmt.Sprintf("DELETE FROM %s WHERE animal_id = $1", t), id); err != nil {
				return err
			}
		}
		for _, q := range []string{
			"UPDATE animales SET padre_id = '' WHERE padre_id = $1",
			"UPDATE animales SET madre_id = '' WHERE madre_id = $1",
			"UPDATE eventos_reproductivos SET id_macho = '' WHERE id_macho = $1",
		} {
			if _, err := tx.Exec(q, id); err != nil {
				return err
			}
		}
	case "corrales":
		if _, err := tx.Exec("UPDATE animales SET corral_id = '' WHERE corral_id = (SELECT nombre FROM corrales WHERE id = $1)", id); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(fmt.Sprintf("DELETE FROM %s WHERE id = $1", table), id); err != nil {
		return err
	}
	return tx.Commit()
}

// applyUpdate aplica un "update" de la cola como UPDATE real (solo las
// columnas del payload) y, si la fila aún no existe en la nube, la inserta.
// No se usa INSERT ... ON CONFLICT para actualizar porque Postgres valida
// las columnas NOT NULL de la fila propuesta ANTES de detectar el conflicto:
// un payload parcial sin `arete` fallaría aunque la fila exista.
func applyUpdate(db *sql.DB, table string, row map[string]interface{}) error {
	if !safeIdent.MatchString(table) {
		return fmt.Errorf("nombre de tabla inválido: %q", table)
	}
	id, ok := row["id"]
	if !ok {
		return fmt.Errorf("payload sin id para %s", table)
	}
	cols := make([]string, 0, len(row))
	for col := range row {
		if !safeIdent.MatchString(col) {
			return fmt.Errorf("nombre de columna inválido: %q", col)
		}
		if col != "id" {
			cols = append(cols, col)
		}
	}
	if len(cols) == 0 {
		return nil // solo id: nada que actualizar
	}
	sort.Strings(cols)
	sets := make([]string, 0, len(cols))
	args := make([]interface{}, 0, len(cols)+1)
	for i, col := range cols {
		sets = append(sets, fmt.Sprintf("%s = $%d", col, i+1))
		args = append(args, row[col])
	}
	args = append(args, id)
	res, err := db.Exec(fmt.Sprintf("UPDATE %s SET %s WHERE id = $%d", table, strings.Join(sets, ", "), len(args)), args...)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return applyUpsert(db, table, row) // la fila no existía en la nube todavía
	}
	return nil
}
