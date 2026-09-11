package main

import (
	"encoding/json"
	"testing"
)

func TestEnqueueSyncWritesRow(t *testing.T) {
	a := newTestApp(t)
	animal := Animal{ID: "a1", Arete: "SM-001", Raza: "Dorper"}

	if err := a.enqueueSync("insert", "animal", animal.ID, animal); err != nil {
		t.Fatalf("enqueueSync: %v", err)
	}

	count, err := a.pendingSyncCount()
	if err != nil {
		t.Fatalf("pendingSyncCount: %v", err)
	}
	if count != 1 {
		t.Fatalf("got %d pending, want 1", count)
	}

	var payload string
	err = a.db.QueryRow("SELECT payload FROM sync_outbox WHERE entity_id = ?", "a1").Scan(&payload)
	if err != nil {
		t.Fatalf("query payload: %v", err)
	}
	var got Animal
	if err := json.Unmarshal([]byte(payload), &got); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if got.Arete != "SM-001" {
		t.Errorf("got Arete %q, want SM-001", got.Arete)
	}
}

func TestEnqueueSyncNoOpInServerBuild(t *testing.T) {
	if !isServerBuild {
		t.Skip("only meaningful when run with `go test -tags server .`")
	}
	a := newTestApp(t)
	if err := a.enqueueSync("insert", "animal", "x", Animal{ID: "x"}); err != nil {
		t.Fatalf("enqueueSync: %v", err)
	}
	count, _ := a.pendingSyncCount()
	if count != 0 {
		t.Errorf("expected no-op in server build, got %d queued", count)
	}
}
