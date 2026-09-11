package main

import (
	"encoding/json"
	"log"
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
		row["user_id"] = a.tenantID()
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
