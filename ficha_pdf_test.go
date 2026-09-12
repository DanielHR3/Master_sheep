package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func seedFichaHerd(t *testing.T, a *App) {
	t.Helper()
	addRef(t, a, "SEM-91", "", "")
	addRef(t, a, "MAD-91", "", "")
	addRef(t, a, "SEM-01", "SEM-91", "MAD-91")
	if err := a.AddAnimal(Animal{ID: "MAD-01", Arete: "MAD-01", Sexo: "Hembra", Raza: "Dorper", Pureza: 100}); err != nil {
		t.Fatal(err)
	}
	if err := a.AddAnimal(Animal{ID: "CRIA-1", Arete: "CRIA-1", Nombre: "Relámpago", Sexo: "Macho", Raza: "Dorper", Pureza: 100,
		Registro: "UNO:300000AA-RP", GradoRegistro: "RP", TatuajeDer: "CRI", TatuajeIzq: "0001N", Color: "Carac. raza",
		FechaNacimiento: "2026-02-25", TipoParto: "Sencillo", MetodoConcepcion: "Inseminación Artificial", TipoNacimiento: "Natural",
		Siniiga: "484011300500001", PadreID: "SEM-01", MadreID: "MAD-01"}); err != nil {
		t.Fatal(err)
	}
}

func TestRenderFichaPDFContainsAnimalAndLegend(t *testing.T) {
	a := newLoggedInTestApp(t)
	a.user.Email = "admin@bugambilias.com"
	seedFichaHerd(t, a)
	if err := a.SaveRanchoPerfil(RanchoPerfil{CriadorClave: "OGN04-68", CriadorNombre: "FN10-2598 Ricardo Gálvez", CriadorCentro: "CN10-2227 Las Bugambilias", CriadorMunicipioEstado: "Tulancingo // Hidalgo"}); err != nil {
		t.Fatal(err)
	}
	data, err := a.buildFicha("CRIA-1")
	if err != nil {
		t.Fatal(err)
	}
	if data.RanchoNombre != "Rancho Las Bugambilias" || len(data.Logo) == 0 || data.Tree == nil || data.Tree.Padre == nil || data.Tree.Padre.Padre == nil {
		t.Fatalf("ficha data = nombre %q logo %d tree %+v", data.RanchoNombre, len(data.Logo), data.Tree)
	}
	pdf, err := renderFichaPDF(data, false)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(pdf, []byte("%PDF")) || len(pdf) < 2000 {
		t.Fatalf("not a pdf (%d bytes)", len(pdf))
	}
	for _, want := range []string{"CRIA-1", "UNO:300000AA-RP", "REGISTRO GENEAL", "SEM-91", "MAD-01", "OGN04-68", "No sustituye", "484011300500001"} {
		if !bytes.Contains(pdf, []byte(want)) {
			t.Errorf("pdf missing %q", want)
		}
	}
	for _, forbidden := range []string{"Organismo de la Unidad", "REGISTRO DE PUREZA", "CONSEJO DIRECTIVO"} {
		if bytes.Contains(pdf, []byte(forbidden)) {
			t.Errorf("pdf must not reproduce UNO certificate text %q", forbidden)
		}
	}
	// compresión activada también produce un PDF válido
	if c, err := renderFichaPDF(data, true); err != nil || !bytes.HasPrefix(c, []byte("%PDF")) {
		t.Fatalf("compressed: %v", err)
	}
}

func TestBuildFichaRejectsBovineAndOtherTenant(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "vaca", Arete: "VACA-1", Especie: "Bovino"}); err != nil {
		t.Fatal(err)
	}
	if _, err := a.buildFicha("vaca"); err == nil {
		t.Fatal("expected error for bovine")
	}
	if err := a.AddAnimal(Animal{ID: "ov", Arete: "OV-1"}); err != nil {
		t.Fatal(err)
	}
	a.user = &User{ID: "u2", RanchoID: "rancho-2", Role: "Admin"}
	if _, err := a.buildFicha("ov"); err == nil {
		t.Fatal("expected error for another tenant")
	}
}

func TestHandleFichaPDF(t *testing.T) {
	a := newLoggedInTestApp(t)
	seedFichaHerd(t, a)
	req := httptest.NewRequest(http.MethodGet, "/api/animals/CRIA-1/ficha", nil)
	req.SetPathValue("id", "CRIA-1")
	rec := httptest.NewRecorder()
	a.handleFichaPDF(rec, req)
	if rec.Code != 200 || rec.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(rec.Body.Bytes(), []byte("%PDF")) {
		t.Fatalf("status %d type %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	if cd := rec.Header().Get("Content-Disposition"); cd != `attachment; filename="ficha_CRIA-1.pdf"` {
		t.Fatalf("disposition = %q", cd)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/animals/nope/ficha", nil)
	req.SetPathValue("id", "nope")
	rec = httptest.NewRecorder()
	a.handleFichaPDF(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing animal status = %d", rec.Code)
	}
}

func TestRanchoBranding(t *testing.T) {
	n, logo, typ := ranchoBranding("admin@donpablito.com", "")
	if n != "Rancho Don Pablito" || len(logo) == 0 || typ != "PNG" {
		t.Fatalf("pablito = %q %d %q", n, len(logo), typ)
	}
	n, _, _ = ranchoBranding("x@y.com", "Mi Rancho")
	if n != "Mi Rancho" {
		t.Fatalf("perfil name must win: %q", n)
	}
	n, logo, typ = ranchoBranding("x@y.com", "")
	if n != "SheepMaster" || len(logo) == 0 || typ != "PNG" {
		t.Fatalf("default = %q %d %q", n, len(logo), typ)
	}
	_ = time.Now
}
