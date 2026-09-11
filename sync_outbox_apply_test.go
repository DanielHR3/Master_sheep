package main

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

// newFakeCloudDB stands in for the Postgres cloudDB connection in tests.
// It is safe to test the production applyUpsert/applyDelete against it
// because modernc.org/sqlite accepts the same "$1, $2..." positional
// placeholders and "ON CONFLICT (id) DO UPDATE SET col = excluded.col"
// syntax that lib/pq does.
func newFakeCloudDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open fake cloud db: %v", err)
	}
	stmts := []string{
		`CREATE TABLE animales (id TEXT PRIMARY KEY, user_id TEXT, arete TEXT, raza TEXT, corral_id TEXT, padre_id TEXT, madre_id TEXT)`,
		`CREATE TABLE corrales (id TEXT PRIMARY KEY, user_id TEXT, nombre TEXT)`,
		`CREATE TABLE tratamientos (id TEXT PRIMARY KEY, animal_id TEXT)`,
		`CREATE TABLE eventos_reproductivos (id TEXT PRIMARY KEY, animal_id TEXT, id_macho TEXT)`,
		`CREATE TABLE tareas (id TEXT PRIMARY KEY, animal_id TEXT)`,
		`CREATE TABLE movimientos (id TEXT PRIMARY KEY, animal_id TEXT)`,
		`CREATE TABLE diagnostico_gestacion (id TEXT PRIMARY KEY, animal_id TEXT)`,
		`CREATE TABLE partos (id TEXT PRIMARY KEY, animal_id TEXT)`,
		`CREATE TABLE recetas_veterinarias (id TEXT PRIMARY KEY, animal_id TEXT)`,
		`CREATE TABLE seguimientos_peso (id TEXT PRIMARY KEY, animal_id TEXT)`,
		`CREATE TABLE movimientos_insumo (id TEXT PRIMARY KEY, animal_id TEXT)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("create fake table: %v", err)
		}
	}
	return db
}

func TestApplyUpsertInsertsThenUpdates(t *testing.T) {
	cloud := newFakeCloudDB(t)

	row := map[string]interface{}{"id": "a1", "arete": "SM-010", "raza": "Dorper"}
	if err := applyUpsert(cloud, "animales", row); err != nil {
		t.Fatalf("applyUpsert insert: %v", err)
	}

	var raza string
	if err := cloud.QueryRow("SELECT raza FROM animales WHERE id = $1", "a1").Scan(&raza); err != nil {
		t.Fatalf("query after insert: %v", err)
	}
	if raza != "Dorper" {
		t.Fatalf("got raza %q, want Dorper", raza)
	}

	row["raza"] = "Katahdin"
	if err := applyUpsert(cloud, "animales", row); err != nil {
		t.Fatalf("applyUpsert update: %v", err)
	}
	if err := cloud.QueryRow("SELECT raza FROM animales WHERE id = $1", "a1").Scan(&raza); err != nil {
		t.Fatalf("query after update: %v", err)
	}
	if raza != "Katahdin" {
		t.Fatalf("got raza %q after update, want Katahdin", raza)
	}
}

// Un "update" parcial (solo id + columnas cambiadas) no debe borrar las
// columnas que no vienen en el payload.
func TestApplyUpsertPartialUpdateKeepsOtherColumns(t *testing.T) {
	cloud := newFakeCloudDB(t)
	if err := applyUpsert(cloud, "animales", map[string]interface{}{"id": "a1", "arete": "SM-010", "raza": "Dorper"}); err != nil {
		t.Fatalf("seed: %v", err)
	}
	if err := applyUpsert(cloud, "animales", map[string]interface{}{"id": "a1", "corral_id": "C2"}); err != nil {
		t.Fatalf("partial update: %v", err)
	}
	var raza, corral string
	if err := cloud.QueryRow("SELECT raza, corral_id FROM animales WHERE id = $1", "a1").Scan(&raza, &corral); err != nil {
		t.Fatalf("query: %v", err)
	}
	if raza != "Dorper" || corral != "C2" {
		t.Fatalf("got raza=%q corral=%q, want Dorper / C2", raza, corral)
	}
}

func TestApplyUpsertRejectsUnsafeIdentifiers(t *testing.T) {
	cloud := newFakeCloudDB(t)
	if err := applyUpsert(cloud, "animales", map[string]interface{}{"id": "a1", "arete; DROP TABLE animales": "x"}); err == nil {
		t.Fatal("expected an error for an unsafe column name")
	}
	if err := applyUpsert(cloud, "animales", map[string]interface{}{"arete": "no-id"}); err == nil {
		t.Fatal("expected an error when the payload has no id")
	}
}

func TestApplyDeleteRemovesRow(t *testing.T) {
	cloud := newFakeCloudDB(t)
	if _, err := cloud.Exec("INSERT INTO animales (id, arete, raza) VALUES ('a1', 'SM-010', 'Dorper')"); err != nil {
		t.Fatalf("seed row: %v", err)
	}
	if err := applyDelete(cloud, "animales", "a1"); err != nil {
		t.Fatalf("applyDelete: %v", err)
	}
	var count int
	cloud.QueryRow("SELECT COUNT(*) FROM animales").Scan(&count)
	if count != 0 {
		t.Fatalf("got %d rows after delete, want 0", count)
	}
}

// Borrar un animal localmente borra en cascada su historial (DeleteAnimal);
// en la nube se replica esa cascada para no dejar huérfanos.
func TestApplyDeleteAnimalCascades(t *testing.T) {
	cloud := newFakeCloudDB(t)
	cloud.Exec("INSERT INTO animales (id, arete, padre_id) VALUES ('a1', 'SM-010', ''), ('a2', 'SM-011', 'a1')")
	cloud.Exec("INSERT INTO tratamientos (id, animal_id) VALUES ('t1', 'a1'), ('t2', 'a2')")
	cloud.Exec("INSERT INTO seguimientos_peso (id, animal_id) VALUES ('s1', 'a1')")
	cloud.Exec("INSERT INTO eventos_reproductivos (id, animal_id, id_macho) VALUES ('e1', 'a2', 'a1')")

	if err := applyDelete(cloud, "animales", "a1"); err != nil {
		t.Fatalf("applyDelete: %v", err)
	}
	var n int
	cloud.QueryRow("SELECT COUNT(*) FROM tratamientos WHERE animal_id = 'a1'").Scan(&n)
	if n != 0 {
		t.Errorf("tratamientos of a1 remaining: %d, want 0", n)
	}
	cloud.QueryRow("SELECT COUNT(*) FROM tratamientos").Scan(&n)
	if n != 1 {
		t.Errorf("tratamientos total: %d, want 1 (a2's must survive)", n)
	}
	cloud.QueryRow("SELECT COUNT(*) FROM seguimientos_peso").Scan(&n)
	if n != 0 {
		t.Errorf("seguimientos_peso remaining: %d, want 0", n)
	}
	var padre, macho string
	cloud.QueryRow("SELECT padre_id FROM animales WHERE id = 'a2'").Scan(&padre)
	cloud.QueryRow("SELECT id_macho FROM eventos_reproductivos WHERE id = 'e1'").Scan(&macho)
	if padre != "" || macho != "" {
		t.Errorf("references to a1 not cleared: padre_id=%q id_macho=%q", padre, macho)
	}
}

// Borrar un corral localmente desasigna a sus animales (DeleteCorral);
// en la nube se replica ese paso antes de borrar la fila.
func TestApplyDeleteCorralUnassignsAnimals(t *testing.T) {
	cloud := newFakeCloudDB(t)
	cloud.Exec("INSERT INTO corrales (id, nombre) VALUES ('c1', 'Norte')")
	cloud.Exec("INSERT INTO animales (id, arete, corral_id) VALUES ('a1', 'SM-010', 'Norte'), ('a2', 'SM-011', 'Sur')")

	if err := applyDelete(cloud, "corrales", "c1"); err != nil {
		t.Fatalf("applyDelete: %v", err)
	}
	var c1, c2 string
	cloud.QueryRow("SELECT corral_id FROM animales WHERE id = 'a1'").Scan(&c1)
	cloud.QueryRow("SELECT corral_id FROM animales WHERE id = 'a2'").Scan(&c2)
	if c1 != "" || c2 != "Sur" {
		t.Errorf("corral_id after delete: a1=%q (want empty) a2=%q (want Sur)", c1, c2)
	}
	var n int
	cloud.QueryRow("SELECT COUNT(*) FROM corrales").Scan(&n)
	if n != 0 {
		t.Errorf("corrales remaining: %d, want 0", n)
	}
}

func TestEntityTableCoversEveryQueuedEntityType(t *testing.T) {
	for _, et := range []string{
		"animal", "corral", "insumo", "tratamiento", "evento_reproductivo", "parto",
		"diagnostico_gestacion", "receta", "seguimiento_peso", "tarea", "movimiento", "movimiento_insumo",
	} {
		if _, ok := entityTable[et]; !ok {
			t.Errorf("entityTable missing %q", et)
		}
	}
}
