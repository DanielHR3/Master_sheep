package main

import (
	"bytes"
	"testing"

	"github.com/xuri/excelize/v2"
)

// Pie de cría (Las Bugambilias): por cada animal debe poder saberse el tipo
// de parto, el método de concepción y si el parto fue natural o inducido.
func TestAnimalTipoNacimientoRoundTrip(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "a1", Arete: "SM-1", TipoParto: "Doble", MetodoConcepcion: "Inseminación Artificial", TipoNacimiento: "Inducido"}); err != nil {
		t.Fatal(err)
	}
	animals, err := a.GetAnimales()
	if err != nil || len(animals) != 1 {
		t.Fatalf("GetAnimales: %v (%d)", err, len(animals))
	}
	got := animals[0]
	if got.TipoNacimiento != "Inducido" || got.TipoParto != "Doble" || got.MetodoConcepcion != "Inseminación Artificial" {
		t.Fatalf("round trip = %q %q %q", got.TipoNacimiento, got.TipoParto, got.MetodoConcepcion)
	}
	got.TipoNacimiento = "Natural"
	if err := a.UpdateAnimal(got); err != nil {
		t.Fatal(err)
	}
	animals, _ = a.GetAnimales()
	if animals[0].TipoNacimiento != "Natural" {
		t.Fatalf("after update = %q", animals[0].TipoNacimiento)
	}
	p := outboxPayload(t, a, "animal", "a1")
	if p["tipo_nacimiento"] != "Natural" {
		t.Fatalf("sync payload tipo_nacimiento = %v", p["tipo_nacimiento"])
	}
}

// La carga masiva debe aceptar las columnas de pie de cría: especie, tipo de
// parto, concepción, nacimiento y los cuatro abuelos (columnas J..Q).
func TestProcessExcelImportsGeneticsColumns(t *testing.T) {
	a := newLoggedInTestApp(t)
	f := excelize.NewFile()
	sheet := f.GetSheetName(0)
	headers := []string{"Arete", "Raza", "Sexo", "Corral", "Fecha Nacimiento", "Peso Nacer", "Padre", "Madre", "Destino",
		"Especie", "Tipo Parto", "Metodo Concepcion", "Tipo Nacimiento", "Abuelo Paterno", "Abuela Paterna", "Abuelo Materno", "Abuela Materna"}
	row := []string{"BG-001", "Dorper", "Hembra", "Maternidad", "2026-01-15", "3.9", "SEM-01", "MAD-01", "Pie de Cría",
		"Ovino", "Sencillo", "Monta Natural", "Natural", "SEM-91", "MAD-91", "SEM-02", "MAD-92"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
		cell, _ = excelize.CoordinatesToCellName(i+1, 2)
		f.SetCellValue(sheet, cell, row[i])
	}
	n, err := a.processExcel(f, a.tenantID())
	if err != nil || n != 1 {
		t.Fatalf("processExcel: %v (n=%d)", err, n)
	}
	animals, _ := a.GetAnimales()
	if len(animals) != 1 {
		t.Fatalf("animals = %d", len(animals))
	}
	g := animals[0]
	if g.Arete != "BG-001" || g.PadreID != "SEM-01" || g.MadreID != "MAD-01" || g.Destino != "Pie de Cría" ||
		g.TipoParto != "Sencillo" || g.MetodoConcepcion != "Monta Natural" || g.TipoNacimiento != "Natural" ||
		g.AbueloPaternoID != "SEM-91" || g.AbuelaPaternaID != "MAD-91" || g.AbueloMaternoID != "SEM-02" || g.AbuelaMaternaID != "MAD-92" {
		t.Fatalf("imported animal = %+v", g)
	}
}

func excelWith(t *testing.T, headers, row []string) *excelize.File {
	t.Helper()
	f := excelize.NewFile()
	sheet := f.GetSheetName(0)
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
		cell, _ = excelize.CoordinatesToCellName(i+1, 2)
		f.SetCellValue(sheet, cell, row[i])
	}
	return f
}

// Las columnas se reconocen por su encabezado (con o sin acentos, en
// cualquier orden), no por su posición.
func TestProcessExcelMapsColumnsByHeader(t *testing.T) {
	a := newLoggedInTestApp(t)
	f := excelWith(t,
		[]string{"Madre", "Número de arete", "Tipo de nacimiento", "Sexo", "Padre", "Método de concepción", "Raza", "Abuela materna"},
		[]string{"MAD-03", "BG-777", "Inducido", "Macho", "SEM-02", "Inseminación Artificial", "Katahdin", "MAD-92"})
	if n, err := a.processExcel(f, a.tenantID()); err != nil || n != 1 {
		t.Fatalf("processExcel: %v (n=%d)", err, n)
	}
	animals, _ := a.GetAnimales()
	g := animals[0]
	if g.Arete != "BG-777" || g.MadreID != "MAD-03" || g.PadreID != "SEM-02" || g.Sexo != "Macho" || g.Raza != "Katahdin" ||
		g.TipoNacimiento != "Inducido" || g.MetodoConcepcion != "Inseminación Artificial" || g.AbuelaMaternaID != "MAD-92" || g.Especie != "Ovino" {
		t.Fatalf("imported = %+v", g)
	}
}

// Sin encabezados reconocibles se conserva el orden posicional histórico.
func TestProcessExcelPositionalFallback(t *testing.T) {
	a := newLoggedInTestApp(t)
	f := excelWith(t,
		[]string{"col1", "col2", "col3", "col4", "col5", "col6", "col7", "col8", "col9"},
		[]string{"BG-1", "Dorper", "Hembra", "Norte", "2026-02-01", "4.1", "SEM-01", "MAD-01", "Engorda"})
	if n, err := a.processExcel(f, a.tenantID()); err != nil || n != 1 {
		t.Fatalf("processExcel: %v (n=%d)", err, n)
	}
	animals, _ := a.GetAnimales()
	if g := animals[0]; g.Arete != "BG-1" || g.Raza != "Dorper" || g.CorralID != "Norte" || g.PadreID != "SEM-01" || g.Destino != "Engorda" {
		t.Fatalf("imported = %+v", g)
	}
}

// La plantilla descargable trae exactamente los encabezados que el
// importador reconoce, más una fila de ejemplo.
func TestBuildImportTemplateRoundTrips(t *testing.T) {
	data, err := buildImportTemplate()
	if err != nil {
		t.Fatal(err)
	}
	f, err := excelize.OpenReader(bytesReader(data))
	if err != nil {
		t.Fatal(err)
	}
	rows, _ := f.GetRows(f.GetSheetName(0))
	if len(rows) < 2 || len(rows[0]) != len(importColumns) {
		t.Fatalf("template rows=%d headers=%d want %d", len(rows), len(rows[0]), len(importColumns))
	}
	a := newLoggedInTestApp(t)
	if n, err := a.processExcel(f, a.tenantID()); err != nil || n != 1 {
		t.Fatalf("template example row must import: %v (n=%d)", err, n)
	}
}

func bytesReader(b []byte) *bytes.Reader { return bytes.NewReader(b) }

// Campos del certificado UNO (encabezado) en cada animal.
func TestAnimalCertificateFieldsRoundTrip(t *testing.T) {
	a := newLoggedInTestApp(t)
	in := Animal{ID: "a1", Arete: "CSL-5105-N", Nombre: "Campeón", TatuajeDer: "CSL", TatuajeIzq: "5105N", TatuajeCola: "",
		Color: "Carac. raza", Pureza: 100, GradoRegistro: "RP", Registro: "UNO:272991MN-RP", Siniiga: "484011300505105", IDElectronica: "982000123"}
	if err := a.AddAnimal(in); err != nil {
		t.Fatal(err)
	}
	animals, err := a.GetAnimales()
	if err != nil || len(animals) != 1 {
		t.Fatalf("GetAnimales: %v (%d)", err, len(animals))
	}
	g := animals[0]
	if g.Nombre != "Campeón" || g.TatuajeDer != "CSL" || g.TatuajeIzq != "5105N" || g.Color != "Carac. raza" || g.Pureza != 100 ||
		g.GradoRegistro != "RP" || g.Registro != "UNO:272991MN-RP" || g.Siniiga != "484011300505105" || g.IDElectronica != "982000123" {
		t.Fatalf("round trip = %+v", g)
	}
	g.Registro = "UNO:999999XX-RP"
	if err := a.UpdateAnimal(g); err != nil {
		t.Fatal(err)
	}
	animals, _ = a.GetAnimales()
	if animals[0].Registro != "UNO:999999XX-RP" {
		t.Fatalf("after update registro = %q", animals[0].Registro)
	}
	p := outboxPayload(t, a, "animal", "a1")
	if p["registro"] != "UNO:999999XX-RP" || p["pureza"] != float64(100) || p["es_referencia"] != float64(0) {
		t.Fatalf("sync payload = %v", p)
	}
}

// Los animales de referencia (ancestros que no viven en el rancho) no
// aparecen en el inventario.
func TestReferenceAnimalsHiddenFromInventory(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "ref1", Arete: "PHIL-3543-F", EsReferencia: true, Registro: "UNO:220916MF-RP"}); err != nil {
		t.Fatal(err)
	}
	if err := a.AddAnimal(Animal{ID: "a1", Arete: "SM-1"}); err != nil {
		t.Fatal(err)
	}
	animals, _ := a.GetAnimales()
	if len(animals) != 1 || animals[0].ID != "a1" {
		t.Fatalf("inventory = %+v", animals)
	}
	p := outboxPayload(t, a, "animal", "ref1")
	if p["es_referencia"] != float64(1) {
		t.Fatalf("reference sync payload = %v", p)
	}
}
