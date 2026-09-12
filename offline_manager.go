package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"sync"
	"sync/atomic"
	"time"
)

// OfflineManager sincroniza en segundo plano los cambios locales
// (sync_outbox, en SQLite) hacia Supabase (Postgres), en un solo sentido
// (local → nube). Solo existe en el build de escritorio; en el servidor los
// datos ya viven directo en Postgres.
type OfflineManager struct {
	localDB    *sql.DB
	cloudDB    *sql.DB
	isSynching atomic.Bool

	mu           sync.Mutex
	lastSyncTime time.Time
}

func NewOfflineManager(localDB, cloudDB *sql.DB) *OfflineManager {
	return &OfflineManager{localDB: localDB, cloudDB: cloudDB}
}

// StartSyncLoop lanza el ciclo periódico. No hace nada si cloudDB es nil
// (no hay DATABASE_URL configurado en esta instalación de escritorio).
// Hace un primer intento de inmediato y luego cada `interval`.
func (o *OfflineManager) StartSyncLoop(ctx context.Context, interval time.Duration) {
	if o.cloudDB == nil {
		return
	}
	go func() {
		o.trySync()
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				o.trySync()
			}
		}
	}()
}

func (o *OfflineManager) trySync() {
	if o.isSynching.Load() {
		return
	}
	if err := o.syncData(); err != nil {
		log.Printf("[OfflineManager] error de sincronización: %v", err)
	}
}

type outboxRow struct {
	id         string
	operation  string
	entityType string
	entityID   string
	payload    string
}

// syncData drena sync_outbox hacia cloudDB, en orden de creación. Un error
// en una fila no detiene a las demás; se anota en last_error y esa fila se
// reintenta en el próximo ciclo. Sin conexión no es un error: simplemente
// no hay nada que hacer todavía.
func (o *OfflineManager) syncData() error {
	if o.cloudDB == nil {
		return nil
	}
	if !o.isSynching.CompareAndSwap(false, true) {
		return nil // ya hay un ciclo en curso
	}
	defer o.isSynching.Store(false)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := o.cloudDB.PingContext(ctx); err != nil {
		return nil
	}

	rows, err := o.localDB.Query(`SELECT id, operation, entity_type, entity_id, payload FROM sync_outbox ORDER BY created_at ASC, rowid ASC`)
	if err != nil {
		return err
	}
	var pending []outboxRow
	for rows.Next() {
		var r outboxRow
		if err := rows.Scan(&r.id, &r.operation, &r.entityType, &r.entityID, &r.payload); err != nil {
			rows.Close()
			return err
		}
		pending = append(pending, r)
	}
	rows.Close()

	for _, r := range pending {
		if applyErr := o.applyRow(r); applyErr != nil {
			o.markError(r.id, applyErr.Error())
			continue
		}
		if _, err := o.localDB.Exec("DELETE FROM sync_outbox WHERE id = ?", r.id); err != nil {
			log.Printf("[OfflineManager] fila %s aplicada en nube pero no se pudo quitar de la cola: %v", r.id, err)
		}
	}

	o.mu.Lock()
	o.lastSyncTime = time.Now()
	o.mu.Unlock()
	return nil
}

func (o *OfflineManager) applyRow(r outboxRow) error {
	table, ok := entityTable[r.entityType]
	if !ok {
		return errUnknownEntity(r.entityType)
	}
	if r.operation == "delete" {
		return applyDelete(o.cloudDB, table, r.entityID)
	}
	var row map[string]interface{}
	if err := json.Unmarshal([]byte(r.payload), &row); err != nil {
		return errInvalidPayload(err)
	}
	return applyUpsert(o.cloudDB, table, row)
}

type syncRowError string

func (e syncRowError) Error() string { return string(e) }

func errUnknownEntity(t string) error   { return syncRowError("tipo de entidad desconocido: " + t) }
func errInvalidPayload(err error) error { return syncRowError("payload inválido: " + err.Error()) }

func (o *OfflineManager) markError(rowID, message string) {
	if _, err := o.localDB.Exec("UPDATE sync_outbox SET last_error = ? WHERE id = ?", message, rowID); err != nil {
		log.Printf("[OfflineManager] no se pudo anotar el error de la fila %s: %v", rowID, err)
	}
}

// GetSyncStatus devuelve cuántos cambios siguen pendientes y cuándo fue la
// última sincronización exitosa (o "PENDING" si nunca ha corrido, o
// "SYNCING" si hay un ciclo en curso ahora mismo).
func (o *OfflineManager) GetSyncStatus() (pending int, lastSync string) {
	o.localDB.QueryRow("SELECT COUNT(*) FROM sync_outbox").Scan(&pending)
	if o.isSynching.Load() {
		return pending, "SYNCING"
	}
	o.mu.Lock()
	last := o.lastSyncTime
	o.mu.Unlock()
	if last.IsZero() {
		return pending, "PENDING"
	}
	return pending, last.Format("15:04:05")
}
