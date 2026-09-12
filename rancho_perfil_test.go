package main

import "testing"

func TestRanchoPerfilSaveAndGet(t *testing.T) {
	a := newLoggedInTestApp(t)
	empty, err := a.GetRanchoPerfil()
	if err != nil || empty.RanchoID != "rancho-1" || empty.CriadorNombre != "" {
		t.Fatalf("empty perfil = %+v (%v)", empty, err)
	}
	p := RanchoPerfil{Nombre: "Rancho Las Bugambilias",
		CriadorClave: "OGN04-68", CriadorNombre: "FN10-2598 Ricardo Gálvez", CriadorCentro: "CN10-2227 Las Bugambilias", CriadorMunicipioEstado: "Tulancingo // Hidalgo",
		PropietarioClave: "OGN04-68", PropietarioNombre: "Ricardo Gálvez", PropietarioCentro: "Las Bugambilias", PropietarioMunicipioEstado: "Tulancingo // Hidalgo"}
	if err := a.SaveRanchoPerfil(p); err != nil {
		t.Fatal(err)
	}
	got, err := a.GetRanchoPerfil()
	if err != nil || got.RanchoID != "rancho-1" || got.CriadorNombre != "FN10-2598 Ricardo Gálvez" || got.PropietarioMunicipioEstado != "Tulancingo // Hidalgo" {
		t.Fatalf("got = %+v (%v)", got, err)
	}
	p.CriadorCentro = "Otro centro"
	if err := a.SaveRanchoPerfil(p); err != nil {
		t.Fatal(err)
	}
	got, _ = a.GetRanchoPerfil()
	if got.CriadorCentro != "Otro centro" {
		t.Fatalf("upsert failed: %+v", got)
	}
	var n int
	a.db.QueryRow("SELECT COUNT(*) FROM rancho_perfil").Scan(&n)
	if n != 1 {
		t.Fatalf("rows = %d, want 1", n)
	}
	// sincronización
	pl := outboxPayload(t, a, "rancho_perfil", "rancho-1")
	if pl["criador_centro"] != "Otro centro" || pl["id"] != "rancho-1" {
		t.Fatalf("sync payload = %v", pl)
	}
	if _, ok := entityTable["rancho_perfil"]; !ok {
		t.Fatal("entityTable missing rancho_perfil")
	}
}

func TestRanchoPerfilRequiresAdmin(t *testing.T) {
	a := newLoggedInTestApp(t)
	a.user.Role = "Trabajador"
	if err := a.SaveRanchoPerfil(RanchoPerfil{Nombre: "x"}); err == nil {
		t.Fatal("expected authorization error")
	}
	if _, err := a.GetRanchoPerfil(); err != nil {
		t.Fatalf("read must be allowed: %v", err)
	}
}
