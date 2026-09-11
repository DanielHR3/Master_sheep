package main

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// enqueueSync anota un cambio local para subirlo a Supabase más tarde.
// No hace nada en modo servidor: ahí el dato ya vive directo en Postgres.
func (a *App) enqueueSync(operation, entityType, entityID string, payload interface{}) error {
	if isServerBuild {
		return nil
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = a.db.Exec(a.q(`
		INSERT INTO sync_outbox (id, operation, entity_type, entity_id, payload, rancho_id, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`), uuid.New().String(), operation, entityType, entityID, string(data), a.tenantID(), time.Now())
	return err
}

// pendingSyncCount devuelve cuántos cambios están esperando sincronizarse.
func (a *App) pendingSyncCount() (int, error) {
	var count int
	err := a.db.QueryRow("SELECT COUNT(*) FROM sync_outbox").Scan(&count)
	return count, err
}
