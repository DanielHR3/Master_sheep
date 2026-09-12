package main

import (
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
