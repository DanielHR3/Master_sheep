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

func TestAddCorralEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddCorral(Corral{ID: "c1", Nombre: "Corral 1", Capacidad: 20}); err != nil {
		t.Fatalf("AddCorral: %v", err)
	}
	if got := outboxRows(t, a); len(got) != 1 || got[0] != [2]string{"insert", "corral"} {
		t.Fatalf("outbox = %v, want [insert corral]", got)
	}
	if p := outboxPayload(t, a, "corral", "c1"); p["nombre"] != "Corral 1" {
		t.Errorf("payload = %v, want nombre Corral 1", p)
	}
}

func TestDeleteCorralEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddCorral(Corral{ID: "c1", Nombre: "Corral 1"}); err != nil {
		t.Fatalf("AddCorral: %v", err)
	}
	if err := a.DeleteCorral("c1"); err != nil {
		t.Fatalf("DeleteCorral: %v", err)
	}
	if got := outboxRows(t, a); len(got) != 2 || got[1] != [2]string{"delete", "corral"} {
		t.Fatalf("outbox = %v, want [... delete corral]", got)
	}
}

func TestAddInsumoEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddInsumo(Insumo{ID: "i1", Nombre: "Ivermectina", StockActual: 100}); err != nil {
		t.Fatalf("AddInsumo: %v", err)
	}
	if got := outboxRows(t, a); len(got) != 1 || got[0] != [2]string{"insert", "insumo"} {
		t.Fatalf("outbox = %v, want [insert insumo]", got)
	}
	if p := outboxPayload(t, a, "insumo", "i1"); p["stock_actual"] != float64(100) {
		t.Errorf("payload = %v, want stock_actual 100", p)
	}
}

// Grupo clínico / reproductivo. Varios de estos métodos tocan más de una
// tabla (p. ej. un tratamiento descuenta stock y crea recordatorios); cada
// efecto secundario también debe encolarse para que la nube no diverja.

func seedAnimalAndInsumo(t *testing.T, a *App) {
	t.Helper()
	if err := a.AddAnimal(Animal{ID: "a1", Arete: "SM-001", Sexo: "Hembra"}); err != nil {
		t.Fatalf("AddAnimal: %v", err)
	}
	if err := a.AddInsumo(Insumo{ID: "i1", Nombre: "Ivermectina", StockActual: 100, DiasRetiro: 5}); err != nil {
		t.Fatalf("AddInsumo: %v", err)
	}
	if _, err := a.db.Exec("DELETE FROM sync_outbox"); err != nil {
		t.Fatalf("clear outbox: %v", err)
	}
}

func TestRegistrarEventoReproductivoEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	seedAnimalAndInsumo(t, a)
	if err := a.RegistrarEventoReproductivo(EventoReproductivo{ID: "e1", AnimalID: "a1", Tipo: "Monta Natural", FechaEvento: "2026-09-01"}); err != nil {
		t.Fatalf("RegistrarEventoReproductivo: %v", err)
	}
	want := [][2]string{{"insert", "evento_reproductivo"}, {"update", "animal"}}
	if got := outboxRows(t, a); len(got) != 2 || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("outbox = %v, want %v", got, want)
	}
	if p := outboxPayload(t, a, "evento_reproductivo", "e1"); p["fecha_probable_parto"] != "2027-01-26" || p["resultado"] != "Pendiente" {
		t.Errorf("payload = %v, want computed fecha_probable_parto and resultado Pendiente", p)
	}
	if p := outboxPayload(t, a, "animal", "a1"); p["estado_reproductivo"] != "Gestación" {
		t.Errorf("animal payload = %v, want estado_reproductivo Gestación", p)
	}
}

func TestRegistrarTratamientoEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	seedAnimalAndInsumo(t, a)
	if err := a.RegistrarTratamiento(Tratamiento{ID: "t1", AnimalID: "a1", InsumoID: "i1", Dosis: 2.5, Fecha: "2026-09-01", DuracionDias: 3}); err != nil {
		t.Fatalf("RegistrarTratamiento: %v", err)
	}
	want := [][2]string{
		{"insert", "tratamiento"}, {"update", "insumo"}, {"insert", "movimiento_insumo"},
		{"insert", "tarea"}, {"insert", "tarea"},
	}
	got := outboxRows(t, a)
	if len(got) != len(want) {
		t.Fatalf("outbox = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("outbox[%d] = %v, want %v (full: %v)", i, got[i], want[i], got)
		}
	}
	p := outboxPayload(t, a, "tratamiento", "t1")
	if _, has := p["duracion_dias"]; has {
		t.Errorf("tratamiento payload must not include duracion_dias (not a column): %v", p)
	}
	if p["fecha_fin_retiro"] != "2026-09-06" {
		t.Errorf("tratamiento payload fecha_fin_retiro = %v, want 2026-09-06", p["fecha_fin_retiro"])
	}
	if p := outboxPayload(t, a, "insumo", "i1"); p["stock_actual"] != float64(97.5) {
		t.Errorf("insumo payload stock_actual = %v, want 97.5", p["stock_actual"])
	}
}

func TestRegistrarPartoEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	seedAnimalAndInsumo(t, a)
	if err := a.RegistrarParto(Parto{ID: "p1", AnimalID: "a1", CantidadCrias: 2, TipoParto: "Doble"}); err != nil {
		t.Fatalf("RegistrarParto: %v", err)
	}
	want := [][2]string{{"insert", "parto"}, {"update", "animal"}}
	if got := outboxRows(t, a); len(got) != 2 || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("outbox = %v, want %v", got, want)
	}
	if p := outboxPayload(t, a, "animal", "a1"); p["estado_reproductivo"] != "Lactancia" || p["conteo_fetos"] != float64(0) {
		t.Errorf("animal payload = %v, want Lactancia / conteo_fetos 0", p)
	}
}

func TestRegistrarDiagnosticoGestacionEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	seedAnimalAndInsumo(t, a)
	if err := a.RegistrarDiagnosticoGestacion(DiagnosticoGestacion{ID: "d1", AnimalID: "a1", Resultado: 1, ConteoFetos: 1}); err != nil {
		t.Fatalf("RegistrarDiagnosticoGestacion: %v", err)
	}
	if got := outboxRows(t, a); len(got) != 1 || got[0] != [2]string{"insert", "diagnostico_gestacion"} {
		t.Fatalf("outbox = %v, want [insert diagnostico_gestacion]", got)
	}
}

func TestCrearRecetaVeterinariaEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	seedAnimalAndInsumo(t, a)
	if err := a.CrearRecetaVeterinaria(RecetaVeterinaria{ID: "r1", AnimalID: "a1", MVZ: "Dr. X"}); err != nil {
		t.Fatalf("CrearRecetaVeterinaria: %v", err)
	}
	if got := outboxRows(t, a); len(got) != 1 || got[0] != [2]string{"insert", "receta"} {
		t.Fatalf("outbox = %v, want [insert receta]", got)
	}
	var fechaLocal string
	a.db.QueryRow("SELECT fecha FROM recetas_veterinarias WHERE id = 'r1'").Scan(&fechaLocal)
	if p := outboxPayload(t, a, "receta", "r1"); p["fecha"] != fechaLocal || fechaLocal == "" {
		t.Errorf("receta payload fecha = %v, want the persisted value %q", p["fecha"], fechaLocal)
	}
}

func TestAddSeguimientoPesoEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	seedAnimalAndInsumo(t, a)
	if err := a.AddSeguimientoPeso(SeguimientoPeso{ID: "s1", AnimalID: "a1", Peso: 32.5}); err != nil {
		t.Fatalf("AddSeguimientoPeso: %v", err)
	}
	if got := outboxRows(t, a); len(got) != 1 || got[0] != [2]string{"insert", "seguimiento_peso"} {
		t.Fatalf("outbox = %v, want [insert seguimiento_peso]", got)
	}
	if p := outboxPayload(t, a, "seguimiento_peso", "s1"); p["fecha"] == "" || p["fecha"] == nil {
		t.Errorf("seguimiento_peso payload should carry the defaulted fecha: %v", p)
	}
}

func TestConfirmarUltrasonidoEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	seedAnimalAndInsumo(t, a)
	if err := a.ConfirmarUltrasonido("a1", true, 2); err != nil {
		t.Fatalf("ConfirmarUltrasonido: %v", err)
	}
	want := [][2]string{{"update", "animal"}, {"insert", "tarea"}}
	if got := outboxRows(t, a); len(got) != 2 || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("outbox = %v, want %v", got, want)
	}
	if p := outboxPayload(t, a, "animal", "a1"); p["conteo_fetos"] != float64(2) || p["estado_reproductivo"] == nil {
		t.Errorf("animal payload = %v, want conteo_fetos 2 and an estado_reproductivo", p)
	}

	// Negativo: solo actualiza el animal, no crea tarea.
	a.db.Exec("DELETE FROM sync_outbox")
	if err := a.ConfirmarUltrasonido("a1", false, 0); err != nil {
		t.Fatalf("ConfirmarUltrasonido negativo: %v", err)
	}
	if got := outboxRows(t, a); len(got) != 1 || got[0] != [2]string{"update", "animal"} {
		t.Fatalf("outbox (negativo) = %v, want [update animal]", got)
	}
}

func TestMoverAnimalEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	seedAnimalAndInsumo(t, a)
	if err := a.MoverAnimal("a1", "Corral 2", "engorda"); err != nil {
		t.Fatalf("MoverAnimal: %v", err)
	}
	want := [][2]string{{"insert", "movimiento"}, {"update", "animal"}}
	if got := outboxRows(t, a); len(got) != 2 || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("outbox = %v, want %v", got, want)
	}
	if p := outboxPayload(t, a, "animal", "a1"); p["corral_id"] != "Corral 2" {
		t.Errorf("animal payload = %v, want corral_id Corral 2", p)
	}
}

func TestAddTareaEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddTarea(Tarea{ID: "k1", Titulo: "Vacunar", Prioridad: "Alta"}); err != nil {
		t.Fatalf("AddTarea: %v", err)
	}
	if got := outboxRows(t, a); len(got) != 1 || got[0] != [2]string{"insert", "tarea"} {
		t.Fatalf("outbox = %v, want [insert tarea]", got)
	}
	if p := outboxPayload(t, a, "tarea", "k1"); p["estatus"] != "Pendiente" || p["creado_por"] != "u1" {
		t.Errorf("payload = %v, want defaulted estatus Pendiente and creado_por u1", p)
	}
}

func TestCompletarTareaEnqueuesSync(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddTarea(Tarea{ID: "k1", Titulo: "Vacunar"}); err != nil {
		t.Fatalf("AddTarea: %v", err)
	}
	if err := a.CompletarTarea("k1"); err != nil {
		t.Fatalf("CompletarTarea: %v", err)
	}
	if got := outboxRows(t, a); len(got) != 2 || got[1] != [2]string{"update", "tarea"} {
		t.Fatalf("outbox = %v, want [... update tarea]", got)
	}
	if p := outboxPayload(t, a, "tarea", "k1"); p["estatus"] != "Completada" {
		t.Errorf("payload = %v, want estatus Completada", p)
	}
}
