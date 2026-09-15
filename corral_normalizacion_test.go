package main

import "testing"

// La columna animales.corral_id acabó con dos formas mezcladas: el alta de
// animal guardaba el NOMBRE del corral y mover un animal guardaba su ID. La
// ocupación del dashboard cruzaba solo por id, así que un rancho que daba de
// alta por el formulario veía 0% en todos sus corrales.
//
// Estas pruebas fijan el arreglo: la migración normaliza a id, no se lleva
// por delante lo que no le corresponde, y la ocupación sale bien en cualquier
// caso.

// sembrarCorral inserta un corral del rancho de prueba.
func sembrarCorral(t *testing.T, a *App, id, nombre string, capacidad int) {
	t.Helper()
	_, err := a.db.Exec(
		"INSERT INTO corrales (id, user_id, nombre, tipo, capacidad) VALUES (?, ?, ?, 'Engorda', ?)",
		id, a.tenantID(), nombre, capacidad,
	)
	if err != nil {
		t.Fatalf("sembrar corral %s: %v", nombre, err)
	}
}

// sembrarAnimalEnCorral inserta un animal activo con el corral tal cual se
// indique, para poder recrear las dos formas de guardado.
func sembrarAnimalEnCorral(t *testing.T, a *App, id, arete, corral string) {
	t.Helper()
	_, err := a.db.Exec(
		`INSERT INTO animales (id, user_id, arete, sexo, estatus, destino, corral_id)
		 VALUES (?, ?, ?, 'Hembra', 'Activo', 'Engorda', ?)`,
		id, a.tenantID(), arete, corral,
	)
	if err != nil {
		t.Fatalf("sembrar animal %s: %v", arete, err)
	}
}

func corralDe(t *testing.T, a *App, animalID string) string {
	t.Helper()
	var v string
	if err := a.db.QueryRow("SELECT COALESCE(corral_id, '') FROM animales WHERE id = ?", animalID).Scan(&v); err != nil {
		t.Fatalf("leer corral de %s: %v", animalID, err)
	}
	return v
}

func TestNormalizarCorralIDPasaNombresAID(t *testing.T) {
	a := newTestApp(t)
	a.user = &User{ID: "u1", RanchoID: "rancho-1", Role: "Admin"}

	sembrarCorral(t, a, "corral-norte", "Engorda Norte", 30)
	sembrarCorral(t, a, "corral-sur", "Engorda Sur", 30)

	sembrarAnimalEnCorral(t, a, "a1", "SM-101", "Engorda Norte") // guardado por nombre
	sembrarAnimalEnCorral(t, a, "a2", "SM-102", "corral-sur")    // ya por id
	sembrarAnimalEnCorral(t, a, "a3", "SM-103", "")              // sin corral
	sembrarAnimalEnCorral(t, a, "a4", "SM-104", "Corral Viejo")  // nombre que ya no existe

	a.normalizarCorralID()

	if got := corralDe(t, a, "a1"); got != "corral-norte" {
		t.Errorf("el guardado por nombre debía pasar a id: got %q, want %q", got, "corral-norte")
	}
	if got := corralDe(t, a, "a2"); got != "corral-sur" {
		t.Errorf("el que ya estaba por id no debía cambiar: got %q", got)
	}
	if got := corralDe(t, a, "a3"); got != "" {
		t.Errorf("el que no tenía corral debía quedarse vacío: got %q", got)
	}
	// Un nombre que no empareja se conserva: vale más dejar lo que el ranchero
	// escribió en la carga masiva que borrarlo.
	if got := corralDe(t, a, "a4"); got != "Corral Viejo" {
		t.Errorf("un nombre sin corral debía conservarse: got %q", got)
	}
}

func TestNormalizarCorralIDEsIdempotente(t *testing.T) {
	a := newTestApp(t)
	a.user = &User{ID: "u1", RanchoID: "rancho-1", Role: "Admin"}

	sembrarCorral(t, a, "corral-norte", "Engorda Norte", 30)
	sembrarAnimalEnCorral(t, a, "a1", "SM-101", "Engorda Norte")

	a.normalizarCorralID()
	primera := corralDe(t, a, "a1")
	a.normalizarCorralID()
	a.normalizarCorralID()

	if segunda := corralDe(t, a, "a1"); segunda != primera {
		t.Errorf("correrla de nuevo cambió el valor: %q -> %q", primera, segunda)
	}
}

// El arreglo no debe cruzar ranchos: dos clientes pueden tener un corral con
// el mismo nombre y cada animal tiene que quedarse con el suyo.
func TestNormalizarCorralIDNoCruzaRanchos(t *testing.T) {
	a := newTestApp(t)

	a.user = &User{ID: "u1", RanchoID: "rancho-1", Role: "Admin"}
	sembrarCorral(t, a, "norte-r1", "Engorda Norte", 30)
	sembrarAnimalEnCorral(t, a, "a1", "SM-101", "Engorda Norte")

	a.user = &User{ID: "u2", RanchoID: "rancho-2", Role: "Admin"}
	sembrarCorral(t, a, "norte-r2", "Engorda Norte", 30)
	sembrarAnimalEnCorral(t, a, "b1", "SM-201", "Engorda Norte")

	a.normalizarCorralID()

	if got := corralDe(t, a, "a1"); got != "norte-r1" {
		t.Errorf("animal del rancho 1 quedó con %q, want %q", got, "norte-r1")
	}
	if got := corralDe(t, a, "b1"); got != "norte-r2" {
		t.Errorf("animal del rancho 2 quedó con %q, want %q", got, "norte-r2")
	}
}

// La ocupación tiene que salir bien tanto con datos ya normalizados como con
// datos viejos guardados por nombre: la lectura tolera ambos.
func TestOcupacionCorralesConAmbasFormas(t *testing.T) {
	for _, caso := range []struct {
		nombre string
		corral string
	}{
		{"guardado por id", "corral-norte"},
		{"guardado por nombre", "Engorda Norte"},
	} {
		t.Run(caso.nombre, func(t *testing.T) {
			a := newTestApp(t)
			a.user = &User{ID: "u1", RanchoID: "rancho-1", Role: "Admin"}

			sembrarCorral(t, a, "corral-norte", "Engorda Norte", 10)
			for _, id := range []string{"a1", "a2", "a3"} {
				sembrarAnimalEnCorral(t, a, id, "SM-"+id, caso.corral)
			}

			stats, err := a.GetStats()
			if err != nil {
				t.Fatalf("GetStats: %v", err)
			}
			corrales, ok := stats["corrales"].([]map[string]interface{})
			if !ok || len(corrales) != 1 {
				t.Fatalf("se esperaba un corral en stats, got %#v", stats["corrales"])
			}
			// 3 de 10 lugares = 30%.
			if got := corrales[0]["ocupacion"]; got != 30.0 {
				t.Errorf("ocupación = %v, want 30", got)
			}
		})
	}
}
