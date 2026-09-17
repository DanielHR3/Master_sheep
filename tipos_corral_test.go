package main

import (
	"strings"
	"testing"
)

// El catálogo de tipos de corral es por rancho y editable. Estas pruebas
// fijan las reglas: arranca con los tipos base más los que ya usan los
// corrales, no admite repetidos, no deja quitar un tipo en uso y nunca cruza
// ranchos.

func nombresDe(ts []TipoCorral) []string {
	out := make([]string, 0, len(ts))
	for _, t := range ts {
		out = append(out, t.Nombre)
	}
	return out
}

func TestTiposCorralSeSiembranConBaseYLosEnUso(t *testing.T) {
	a := newTestApp(t)
	a.user = &User{ID: "u1", RanchoID: "rancho-1", Role: "Admin"}
	if err := a.AddCorral(Corral{ID: "c1", Nombre: "Sementales 1", Tipo: "Sementales", Capacidad: 10}); err != nil {
		t.Fatalf("AddCorral: %v", err)
	}

	tipos, err := a.GetTiposCorral()
	if err != nil {
		t.Fatalf("GetTiposCorral: %v", err)
	}
	got := strings.Join(nombresDe(tipos), ",")
	// Orden alfabético: los cuatro base + "Sementales", que ya estaba en uso.
	want := "Cuarentena,Engorda,General,Maternidad,Sementales"
	if got != want {
		t.Errorf("catálogo inicial = %q, want %q", got, want)
	}

	// Pedirlo otra vez no lo vuelve a sembrar.
	tipos2, _ := a.GetTiposCorral()
	if len(tipos2) != len(tipos) {
		t.Errorf("segunda lectura sembró de nuevo: %d -> %d", len(tipos), len(tipos2))
	}
}

func TestAddTipoCorralRechazaVaciosYRepetidos(t *testing.T) {
	a := newTestApp(t)
	a.user = &User{ID: "u1", RanchoID: "rancho-1", Role: "Admin"}
	if _, err := a.GetTiposCorral(); err != nil {
		t.Fatalf("GetTiposCorral: %v", err)
	}

	if _, err := a.AddTipoCorral("   "); err == nil {
		t.Error("un nombre vacío debía rechazarse")
	}
	if _, err := a.AddTipoCorral("Destete"); err != nil {
		t.Fatalf("AddTipoCorral: %v", err)
	}
	if _, err := a.AddTipoCorral("destete"); err == nil {
		t.Error("el repetido (sin distinguir mayúsculas) debía rechazarse")
	}
	tipos, _ := a.GetTiposCorral()
	if len(tipos) != 5 {
		t.Errorf("se esperaban 5 tipos, hay %d: %v", len(tipos), nombresDe(tipos))
	}
}

func TestDeleteTipoCorralRespetaLosEnUso(t *testing.T) {
	a := newTestApp(t)
	a.user = &User{ID: "u1", RanchoID: "rancho-1", Role: "Admin"}
	tipos, err := a.GetTiposCorral()
	if err != nil {
		t.Fatalf("GetTiposCorral: %v", err)
	}
	var engorda, cuarentena string
	for _, tp := range tipos {
		switch tp.Nombre {
		case "Engorda":
			engorda = tp.ID
		case "Cuarentena":
			cuarentena = tp.ID
		}
	}
	if err := a.AddCorral(Corral{ID: "c1", Nombre: "Engorda Norte", Tipo: "Engorda", Capacidad: 30}); err != nil {
		t.Fatalf("AddCorral: %v", err)
	}

	err = a.DeleteTipoCorral(engorda)
	if err == nil || !strings.Contains(err.Error(), "en uso") {
		t.Errorf("quitar un tipo en uso debía rechazarse con 'en uso', got %v", err)
	}
	if err := a.DeleteTipoCorral(cuarentena); err != nil {
		t.Errorf("quitar un tipo sin uso debía funcionar: %v", err)
	}
	tipos, _ = a.GetTiposCorral()
	if got := strings.Join(nombresDe(tipos), ","); got != "Engorda,General,Maternidad" {
		t.Errorf("catálogo tras borrar = %q", got)
	}
}

func TestTiposCorralNoCruzanRanchos(t *testing.T) {
	a := newTestApp(t)

	a.user = &User{ID: "u1", RanchoID: "rancho-1", Role: "Admin"}
	if _, err := a.AddTipoCorral("Solo del rancho 1"); err != nil {
		t.Fatalf("AddTipoCorral: %v", err)
	}

	a.user = &User{ID: "u2", RanchoID: "rancho-2", Role: "Admin"}
	tipos, err := a.GetTiposCorral()
	if err != nil {
		t.Fatalf("GetTiposCorral: %v", err)
	}
	for _, tp := range tipos {
		if tp.Nombre == "Solo del rancho 1" {
			t.Fatalf("el rancho 2 ve un tipo del rancho 1: %v", nombresDe(tipos))
		}
	}
	if len(tipos) != 4 {
		t.Errorf("el rancho 2 debía arrancar con los 4 base, tiene %d", len(tipos))
	}
}
