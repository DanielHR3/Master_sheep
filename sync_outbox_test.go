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

// outboxRows devuelve (operation, entity_type) de cada fila pendiente, en orden.
func outboxRows(t *testing.T, a *App) [][2]string {
	t.Helper()
	rows, err := a.db.Query("SELECT operation, entity_type FROM sync_outbox ORDER BY created_at, rowid")
	if err != nil {
		t.Fatalf("query outbox: %v", err)
	}
	defer rows.Close()
	var out [][2]string
	for rows.Next() {
		var op, et string
		if err := rows.Scan(&op, &et); err != nil {
			t.Fatalf("scan outbox: %v", err)
		}
		out = append(out, [2]string{op, et})
	}
	return out
}

func outboxPayload(t *testing.T, a *App, entityType, entityID string) map[string]interface{} {
	t.Helper()
	var raw string
	err := a.db.QueryRow("SELECT payload FROM sync_outbox WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT 1", entityType, entityID).Scan(&raw)
	if err != nil {
		t.Fatalf("query payload %s/%s: %v", entityType, entityID, err)
	}
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	return m
}

func newLoggedInTestApp(t *testing.T) *App {
	t.Helper()
	a := newTestApp(t)
	a.user = &User{ID: "u1", RanchoID: "rancho-1", Role: "Admin"}
	return a
}

// El payload debe llevar la columna de tenant (user_id) para que el UPSERT
// en la nube deje la fila en el rancho correcto; los structs no la incluyen.
func TestEnqueueSyncInjectsTenantColumn(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.enqueueSync("insert", "corral", "c1", Corral{ID: "c1", Nombre: "X"}); err != nil {
		t.Fatalf("enqueueSync: %v", err)
	}
	p := outboxPayload(t, a, "corral", "c1")
	if p["user_id"] != "rancho-1" {
		t.Errorf("payload user_id = %v, want rancho-1", p["user_id"])
	}
	if p["nombre"] != "X" {
		t.Errorf("payload nombre = %v, want X", p["nombre"])
	}
}

func TestAddAnimalEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "a1", Arete: "SM-002", Sexo: "Hembra"}); err != nil {
		t.Fatalf("AddAnimal: %v", err)
	}
	got := outboxRows(t, a)
	if len(got) != 1 || got[0] != [2]string{"insert", "animal"} {
		t.Fatalf("outbox = %v, want [insert animal]", got)
	}
	p := outboxPayload(t, a, "animal", "a1")
	if p["arete"] != "SM-002" || p["especie"] != "Ovino" {
		t.Errorf("payload = %v, want arete SM-002 and default especie Ovino", p)
	}
}

func TestUpdateAnimalEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "a1", Arete: "SM-002"}); err != nil {
		t.Fatalf("AddAnimal: %v", err)
	}
	if err := a.UpdateAnimal(Animal{ID: "a1", Arete: "SM-002", Raza: "Katahdin"}); err != nil {
		t.Fatalf("UpdateAnimal: %v", err)
	}
	got := outboxRows(t, a)
	if len(got) != 2 || got[1] != [2]string{"update", "animal"} {
		t.Fatalf("outbox = %v, want [... update animal]", got)
	}
}

func TestDeleteAnimalEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "a1", Arete: "SM-002"}); err != nil {
		t.Fatalf("AddAnimal: %v", err)
	}
	if err := a.DeleteAnimal("a1"); err != nil {
		t.Fatalf("DeleteAnimal: %v", err)
	}
	got := outboxRows(t, a)
	if len(got) != 2 || got[1] != [2]string{"delete", "animal"} {
		t.Fatalf("outbox = %v, want [... delete animal]", got)
	}
}
