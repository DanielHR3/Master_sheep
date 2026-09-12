package main

import (
	"database/sql"
	"encoding/json"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

func newLocalOutboxDB(t *testing.T) *sql.DB {
	t.Helper()
	local, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open local: %v", err)
	}
	if _, err := local.Exec(`CREATE TABLE sync_outbox (
		id TEXT PRIMARY KEY, operation TEXT, entity_type TEXT, entity_id TEXT,
		payload TEXT, rancho_id TEXT, created_at TIMESTAMP, last_error TEXT
	)`); err != nil {
		t.Fatalf("create sync_outbox: %v", err)
	}
	return local
}

func seedOutbox(t *testing.T, local *sql.DB, rowID, op, entityType, entityID string, payload map[string]interface{}) {
	t.Helper()
	data, _ := json.Marshal(payload)
	_, err := local.Exec(
		`INSERT INTO sync_outbox (id, operation, entity_type, entity_id, payload, rancho_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		rowID, op, entityType, entityID, string(data), "rancho-1", time.Now(),
	)
	if err != nil {
		t.Fatalf("seed outbox: %v", err)
	}
}

func TestSyncDataDrainsOutboxOnSuccess(t *testing.T) {
	local := newLocalOutboxDB(t)
	seedOutbox(t, local, "row1", "insert", "animal", "a1", map[string]interface{}{"id": "a1", "arete": "SM-020"})

	cloud := newFakeCloudDB(t) // reuses the helper from sync_outbox_apply_test.go

	o := NewOfflineManager(local, cloud)
	if err := o.syncData(); err != nil {
		t.Fatalf("syncData: %v", err)
	}

	var remaining int
	local.QueryRow("SELECT COUNT(*) FROM sync_outbox").Scan(&remaining)
	if remaining != 0 {
		t.Errorf("got %d rows still in outbox, want 0", remaining)
	}

	var arete string
	if err := cloud.QueryRow("SELECT arete FROM animales WHERE id = ?", "a1").Scan(&arete); err != nil {
		t.Fatalf("expected row to land in cloud db: %v", err)
	}
	if arete != "SM-020" {
		t.Errorf("got arete %q, want SM-020", arete)
	}

	pending, last := o.GetSyncStatus()
	if pending != 0 || last == "PENDING" || last == "SYNCING" {
		t.Errorf("GetSyncStatus = (%d, %q), want (0, a timestamp)", pending, last)
	}
}

func TestSyncDataContinuesAfterOneRowFails(t *testing.T) {
	local := newLocalOutboxDB(t)
	seedOutbox(t, local, "row-bad", "insert", "tipo_inexistente", "bad", map[string]interface{}{"id": "bad"})
	seedOutbox(t, local, "row-good", "insert", "animal", "a2", map[string]interface{}{"id": "a2", "arete": "SM-030"})

	cloud := newFakeCloudDB(t)
	o := NewOfflineManager(local, cloud)
	if err := o.syncData(); err != nil {
		t.Fatalf("syncData: %v", err)
	}

	var arete string
	if err := cloud.QueryRow("SELECT arete FROM animales WHERE id = ?", "a2").Scan(&arete); err != nil {
		t.Fatalf("expected the good row to sync despite the bad one: %v", err)
	}

	var remaining int
	local.QueryRow("SELECT COUNT(*) FROM sync_outbox").Scan(&remaining)
	if remaining != 1 {
		t.Fatalf("got %d rows remaining, want 1 (the bad one, kept for retry)", remaining)
	}
	var lastErr string
	local.QueryRow("SELECT COALESCE(last_error, '') FROM sync_outbox WHERE id = 'row-bad'").Scan(&lastErr)
	if lastErr == "" {
		t.Error("expected last_error to be recorded on the failed row")
	}
}

// Las filas se aplican en el orden en que se encolaron: un insert seguido
// de un update parcial debe dejar el estado final del update.
func TestSyncDataAppliesRowsInOrder(t *testing.T) {
	local := newLocalOutboxDB(t)
	seedOutbox(t, local, "r1", "insert", "animal", "a1", map[string]interface{}{"id": "a1", "arete": "SM-1", "raza": "Dorper"})
	seedOutbox(t, local, "r2", "update", "animal", "a1", map[string]interface{}{"id": "a1", "raza": "Katahdin"})
	seedOutbox(t, local, "r3", "delete", "animal", "a1", map[string]interface{}{"id": "a1"})
	seedOutbox(t, local, "r4", "insert", "animal", "a1", map[string]interface{}{"id": "a1", "arete": "SM-1", "raza": "Pelibuey"})

	cloud := newFakeCloudDB(t)
	if err := NewOfflineManager(local, cloud).syncData(); err != nil {
		t.Fatalf("syncData: %v", err)
	}
	var raza string
	if err := cloud.QueryRow("SELECT raza FROM animales WHERE id = 'a1'").Scan(&raza); err != nil {
		t.Fatalf("row missing after ordered replay: %v", err)
	}
	if raza != "Pelibuey" {
		t.Errorf("raza = %q, want Pelibuey (last write wins, in order)", raza)
	}
}

func TestSyncDataWithoutCloudIsNoOp(t *testing.T) {
	local := newLocalOutboxDB(t)
	seedOutbox(t, local, "r1", "insert", "animal", "a1", map[string]interface{}{"id": "a1"})
	o := NewOfflineManager(local, nil)
	if err := o.syncData(); err != nil {
		t.Fatalf("syncData with nil cloud should not error: %v", err)
	}
	pending, last := o.GetSyncStatus()
	if pending != 1 || last != "PENDING" {
		t.Errorf("GetSyncStatus = (%d, %q), want (1, PENDING)", pending, last)
	}
}
