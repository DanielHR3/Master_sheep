package main

import "testing"

// countRows es un helper de prueba para verificar que un INSERT realmente
// dejó una fila en la tabla indicada.
func countRows(t *testing.T, a *App, table string) int {
	t.Helper()
	var n int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM " + table).Scan(&n); err != nil {
		t.Fatalf("count %s: %v", table, err)
	}
	return n
}

// Regresión: desde el commit d304924 todos los INSERT de escritura tenían un
// placeholder "?" de más (y AddAnimal un argumento duplicado), por lo que
// SQLite respondía "N values for N-1 columns" y Postgres "INSERT has more
// expressions than target columns". Esta prueba ejercita cada método de
// escritura de punta a punta contra el esquema real (tablas + migraciones).
func TestWriteMethodsPersistRows(t *testing.T) {
	a := newTestApp(t)
	a.user = &User{ID: "u1", RanchoID: "rancho-1", Role: "Admin"}

	if err := a.AddAnimal(Animal{ID: "a1", Arete: "SM-100", Sexo: "Hembra"}); err != nil {
		t.Fatalf("AddAnimal: %v", err)
	}
	if err := a.UpdateAnimal(Animal{ID: "a1", Arete: "SM-100", Raza: "Dorper"}); err != nil {
		t.Fatalf("UpdateAnimal: %v", err)
	}
	if err := a.AddCorral(Corral{ID: "c1", Nombre: "Corral 1"}); err != nil {
		t.Fatalf("AddCorral: %v", err)
	}
	if err := a.AddInsumo(Insumo{ID: "i1", Nombre: "Ivermectina", DiasRetiro: 5}); err != nil {
		t.Fatalf("AddInsumo: %v", err)
	}
	if err := a.RegistrarTratamiento(Tratamiento{ID: "t1", AnimalID: "a1", InsumoID: "i1", Dosis: 1}); err != nil {
		t.Fatalf("RegistrarTratamiento: %v", err)
	}
	if err := a.RegistrarEventoReproductivo(EventoReproductivo{ID: "e1", AnimalID: "a1", Tipo: "Monta Natural", FechaEvento: "2026-09-01"}); err != nil {
		t.Fatalf("RegistrarEventoReproductivo: %v", err)
	}
	if err := a.RegistrarDiagnosticoGestacion(DiagnosticoGestacion{ID: "d1", AnimalID: "a1", Resultado: 1}); err != nil {
		t.Fatalf("RegistrarDiagnosticoGestacion: %v", err)
	}
	if err := a.ConfirmarUltrasonido("a1", true, 2); err != nil {
		t.Fatalf("ConfirmarUltrasonido: %v", err)
	}
	if err := a.RegistrarParto(Parto{ID: "p1", AnimalID: "a1", CantidadCrias: 2}); err != nil {
		t.Fatalf("RegistrarParto: %v", err)
	}
	if err := a.CrearRecetaVeterinaria(RecetaVeterinaria{ID: "r1", AnimalID: "a1"}); err != nil {
		t.Fatalf("CrearRecetaVeterinaria: %v", err)
	}
	if err := a.AddSeguimientoPeso(SeguimientoPeso{ID: "s1", AnimalID: "a1", Peso: 30}); err != nil {
		t.Fatalf("AddSeguimientoPeso: %v", err)
	}
	if err := a.MoverAnimal("a1", "c1", "engorda"); err != nil {
		t.Fatalf("MoverAnimal: %v", err)
	}
	if err := a.AddTarea(Tarea{ID: "k1", Titulo: "Vacunar"}); err != nil {
		t.Fatalf("AddTarea: %v", err)
	}
	if err := a.CompletarTarea("k1"); err != nil {
		t.Fatalf("CompletarTarea: %v", err)
	}
	if err := a.AddUser(User{ID: "u2", Email: "x@y.z", Password: "secret", Name: "X", Role: "Operador"}); err != nil {
		t.Fatalf("AddUser: %v", err)
	}

	want := map[string]int{
		"animales": 1, "corrales": 1, "insumos": 1, "tratamientos": 1,
		"movimientos_insumo": 1, "eventos_reproductivos": 1, "diagnostico_gestacion": 1,
		"partos": 1, "recetas_veterinarias": 1, "seguimientos_peso": 1, "movimientos": 1,
	}
	for table, n := range want {
		if got := countRows(t, a, table); got != n {
			t.Errorf("%s: got %d rows, want %d", table, got, n)
		}
	}
	// ConfirmarUltrasonido (positivo) genera una tarea de seguimiento además de la de AddTarea
	if got := countRows(t, a, "tareas"); got < 2 {
		t.Errorf("tareas: got %d rows, want at least 2", got)
	}
	var estatus string
	a.db.QueryRow("SELECT estatus FROM tareas WHERE id = 'k1'").Scan(&estatus)
	if estatus != "Completada" {
		t.Errorf("CompletarTarea: estatus %q, want Completada", estatus)
	}

	if err := a.DeleteCorral("c1"); err != nil {
		t.Fatalf("DeleteCorral: %v", err)
	}
	if err := a.DeleteAnimal("a1"); err != nil {
		t.Fatalf("DeleteAnimal: %v", err)
	}
	if got := countRows(t, a, "animales"); got != 0 {
		t.Errorf("animales after delete: got %d, want 0", got)
	}
}

// Regresión: RegistrarTratamiento no generaba id cuando llegaba vacío, así
// que el segundo tratamiento chocaba con la clave primaria (id "").
func TestRegistrarTratamientoGeneratesID(t *testing.T) {
	a := newTestApp(t)
	a.user = &User{ID: "u1", RanchoID: "rancho-1", Role: "Admin"}
	if err := a.AddInsumo(Insumo{ID: "i1", Nombre: "Ivermectina", StockActual: 10, DiasRetiro: 3}); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if err := a.RegistrarTratamiento(Tratamiento{AnimalID: "a1", InsumoID: "i1", Dosis: 1}); err != nil {
			t.Fatalf("tratamiento %d sin id: %v", i+1, err)
		}
	}
	var n int
	a.db.QueryRow("SELECT COUNT(*) FROM tratamientos WHERE id <> ''").Scan(&n)
	if n != 2 {
		t.Fatalf("tratamientos con id: %d, want 2", n)
	}
}
