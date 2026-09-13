package main

import (
	"testing"
	"time"
)

func daysAgo(n int) string { return time.Now().AddDate(0, 0, -n).Format("2006-01-02") }

func addWeights(t *testing.T, a *App, id string, pts ...[2]float64) { // [díasAtrás, peso]
	t.Helper()
	for i, p := range pts {
		if err := a.AddSeguimientoPeso(SeguimientoPeso{ID: id + "-w" + string(rune('a'+i)), AnimalID: id, Fecha: daysAgo(int(p[0])), Peso: p[1]}); err != nil {
			t.Fatal(err)
		}
	}
}

func semaforoOf(t *testing.T, a *App, id string) SemaforoAnimal {
	t.Helper()
	all, err := a.GetSemaforoHato()
	if err != nil {
		t.Fatal(err)
	}
	for _, s := range all {
		if s.AnimalID == id {
			return s
		}
	}
	t.Fatalf("no semaforo for %s in %+v", id, all)
	return SemaforoAnimal{}
}

func TestSemaforoListoParaVenta(t *testing.T) {
	a := newLoggedInTestApp(t)
	a.SaveRanchoPerfil(RanchoPerfil{PrecioKg: 75})
	if err := a.AddAnimal(Animal{ID: "v1", Arete: "V-1", Destino: "Engorda", Estatus: "Activo", FechaNacimiento: daysAgo(150), PesoNacer: 4}); err != nil {
		t.Fatal(err)
	}
	addWeights(t, a, "v1", [2]float64{40, 34}, [2]float64{5, 43.2})
	s := semaforoOf(t, a, "v1")
	if s.Venta.Color != "rojo" || s.Color != "rojo" {
		t.Fatalf("venta = %+v global=%s", s.Venta, s.Color)
	}
	if s.ValorEstimado < 3000 || s.ValorEstimado > 3300 {
		t.Fatalf("valor = %v", s.ValorEstimado)
	}
	if s.Titulo == "" || !containsAny(s.Titulo, "venta") {
		t.Fatalf("titulo = %q", s.Titulo)
	}
}

func TestSemaforoVentaProyectada(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "p1", Arete: "P-1", Destino: "Engorda", Estatus: "Activo", FechaNacimiento: daysAgo(130), PesoNacer: 4}); err != nil {
		t.Fatal(err)
	}
	// 0.3 kg/día: de 30 a 39 kg en 30 días → faltan 4 kg para el rojo (43) → ~14 días
	addWeights(t, a, "p1", [2]float64{31, 30}, [2]float64{1, 39})
	s := semaforoOf(t, a, "p1")
	if s.Venta.Color != "amarillo" || s.Venta.DiasEstimados < 12 || s.Venta.DiasEstimados > 16 || s.Venta.FechaEstimada == "" {
		t.Fatalf("venta = %+v", s.Venta)
	}
	if s.Crecimiento.GDP < 0.29 || s.Crecimiento.GDP > 0.31 {
		t.Fatalf("gdp = %v", s.Crecimiento.GDP)
	}
}

func TestSemaforoRiesgoPesoEstancadoYTratamientos(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "r1", Arete: "R-1", Destino: "Engorda", Estatus: "Activo", FechaNacimiento: daysAgo(100), PesoNacer: 4}); err != nil {
		t.Fatal(err)
	}
	addWeights(t, a, "r1", [2]float64{40, 25}, [2]float64{2, 24.5})
	s := semaforoOf(t, a, "r1")
	if s.Riesgo.Color != "rojo" || s.Color != "rojo" || !containsAny(s.Titulo, "peso", "estanc", "baj") {
		t.Fatalf("riesgo = %+v titulo=%q", s.Riesgo, s.Titulo)
	}

	if err := a.AddAnimal(Animal{ID: "r2", Arete: "R-2", Destino: "Engorda", Estatus: "Activo", FechaNacimiento: daysAgo(100), PesoNacer: 4}); err != nil {
		t.Fatal(err)
	}
	addWeights(t, a, "r2", [2]float64{40, 25}, [2]float64{2, 33})
	a.AddInsumo(Insumo{ID: "i1", Nombre: "Med", StockActual: 100})
	for i := 0; i < 3; i++ {
		if err := a.RegistrarTratamiento(Tratamiento{AnimalID: "r2", InsumoID: "i1", Dosis: 1, Fecha: daysAgo(5 * (i + 1))}); err != nil {
			t.Fatal(err)
		}
	}
	s = semaforoOf(t, a, "r2")
	if s.Riesgo.Color != "rojo" || !containsAny(s.Titulo, "tratamiento") {
		t.Fatalf("riesgo tratamientos = %+v titulo=%q", s.Riesgo, s.Titulo)
	}
}

func TestSemaforoCrecimientoVsLote(t *testing.T) {
	a := newLoggedInTestApp(t)
	for i, gdp := range []float64{0.30, 0.28, 0.32, 0.29} { // lote sano
		id := "l" + string(rune('1'+i))
		if err := a.AddAnimal(Animal{ID: id, Arete: id, Destino: "Engorda", Estatus: "Activo", FechaNacimiento: daysAgo(90), PesoNacer: 4}); err != nil {
			t.Fatal(err)
		}
		addWeights(t, a, id, [2]float64{31, 20}, [2]float64{1, 20 + gdp*30})
	}
	if err := a.AddAnimal(Animal{ID: "lento", Arete: "LENTO", Destino: "Engorda", Estatus: "Activo", FechaNacimiento: daysAgo(95), PesoNacer: 4}); err != nil {
		t.Fatal(err)
	}
	addWeights(t, a, "lento", [2]float64{31, 20}, [2]float64{1, 23}) // 0.10 kg/día → ~34 % del lote
	s := semaforoOf(t, a, "lento")
	if s.Crecimiento.Color != "rojo" || s.Crecimiento.Porcentaje > 45 || s.Crecimiento.GDPLote < 0.28 {
		t.Fatalf("crecimiento = %+v", s.Crecimiento)
	}
	if !containsAny(s.Titulo, "lote") {
		t.Fatalf("titulo = %q", s.Titulo)
	}
	if ok := semaforoOf(t, a, "l1"); ok.Crecimiento.Color != "verde" {
		t.Fatalf("lote member = %+v", ok.Crecimiento)
	}
}

func TestSemaforoSinPesajesEsGris(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "g1", Arete: "G-1", Destino: "Pie de Cría", Estatus: "Activo", FechaNacimiento: daysAgo(400)}); err != nil {
		t.Fatal(err)
	}
	s := semaforoOf(t, a, "g1")
	if s.Color != "gris" || !containsAny(s.Titulo, "pesaje") {
		t.Fatalf("gris = %+v", s)
	}
	// animales de referencia y no activos no aparecen
	a.AddAnimal(Animal{ID: "ref", Arete: "REF", EsReferencia: true})
	a.AddAnimal(Animal{ID: "vend", Arete: "VEND", Estatus: "Vendido"})
	all, _ := a.GetSemaforoHato()
	if len(all) != 1 {
		t.Fatalf("expected only active real animals, got %d", len(all))
	}
}

func TestSemaforoSinPesajeReciente(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "s1", Arete: "S-1", Destino: "Engorda", Estatus: "Activo", FechaNacimiento: daysAgo(200), PesoNacer: 4}); err != nil {
		t.Fatal(err)
	}
	addWeights(t, a, "s1", [2]float64{80, 20}, [2]float64{45, 28})
	s := semaforoOf(t, a, "s1")
	if s.DiasSinPesaje < 44 || s.Riesgo.Color == "verde" || !containsAny(s.Titulo, "pesaje", "venta") {
		t.Fatalf("sin pesaje = %+v", s)
	}
}

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		if len(sub) > 0 && indexOf(lower(s), lower(sub)) >= 0 {
			return true
		}
	}
	return false
}

func lower(s string) string {
	b := []rune(s)
	for i, r := range b {
		if r >= 'A' && r <= 'Z' {
			b[i] = r + 32
		}
	}
	return string(b)
}

// El rojo entra "uno arriba" de la meta: 42.0 kg / 120 días aún no es rojo.
func TestSemaforoRojoUnoArribaDeLaMeta(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "b1", Arete: "B-1", Destino: "Engorda", Estatus: "Activo", FechaNacimiento: daysAgo(120), PesoNacer: 4}); err != nil {
		t.Fatal(err)
	}
	addWeights(t, a, "b1", [2]float64{30, 36}, [2]float64{0, 42.0})
	if s := semaforoOf(t, a, "b1"); s.Venta.Color == "rojo" {
		t.Fatalf("42.0 kg / 120 días no debe ser rojo: %+v", s.Venta)
	}
	if err := a.AddAnimal(Animal{ID: "b2", Arete: "B-2", Destino: "Engorda", Estatus: "Activo", FechaNacimiento: daysAgo(121), PesoNacer: 4}); err != nil {
		t.Fatal(err)
	}
	addWeights(t, a, "b2", [2]float64{30, 37}, [2]float64{0, 43.0})
	if s := semaforoOf(t, a, "b2"); s.Venta.Color != "rojo" {
		t.Fatalf("43 kg / 121 días debe ser rojo: %+v", s.Venta)
	}
}
