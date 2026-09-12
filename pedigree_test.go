package main

import "testing"

func addRef(t *testing.T, a *App, arete, padre, madre string) {
	t.Helper()
	if err := a.AddAnimal(Animal{ID: arete, Arete: arete, EsReferencia: true, Registro: "UNO:" + arete, GradoRegistro: "SI", Raza: "DOR", Pureza: 100, PadreID: padre, MadreID: madre}); err != nil {
		t.Fatalf("addRef %s: %v", arete, err)
	}
}

// Cuatro generaciones enlazadas por padre_id/madre_id (arete) se resuelven
// completas, con los datos de cada ancestro.
func TestBuildPedigreeFollowsLinksFourGenerations(t *testing.T) {
	a := newLoggedInTestApp(t)
	// tatarabuelos → bisabuelos → abuelos → padres → sujeto
	addRef(t, a, "TT1", "", "")
	addRef(t, a, "TT2", "", "")
	addRef(t, a, "BIS1", "TT1", "TT2")
	addRef(t, a, "BIS2", "", "")
	addRef(t, a, "AB1", "BIS1", "BIS2")
	addRef(t, a, "AB2", "", "")
	addRef(t, a, "PADRE", "AB1", "AB2")
	if err := a.AddAnimal(Animal{ID: "MADRE", Arete: "MADRE", Sexo: "Hembra"}); err != nil {
		t.Fatal(err)
	}
	if err := a.AddAnimal(Animal{ID: "CRIA", Arete: "CRIA", PadreID: "PADRE", MadreID: "MADRE"}); err != nil {
		t.Fatal(err)
	}
	tree, err := a.BuildPedigree("CRIA", 4)
	if err != nil {
		t.Fatal(err)
	}
	if tree.Arete != "CRIA" || !tree.Existe {
		t.Fatalf("root = %+v", tree)
	}
	p := tree.Padre
	if p == nil || p.Arete != "PADRE" || !p.EsReferencia || p.Registro != "UNO:PADRE" || p.GradoRegistro != "SI" || p.Pureza != 100 {
		t.Fatalf("padre = %+v", p)
	}
	if tree.Madre == nil || tree.Madre.Arete != "MADRE" || tree.Madre.EsReferencia {
		t.Fatalf("madre = %+v", tree.Madre)
	}
	if p.Padre == nil || p.Padre.Arete != "AB1" || p.Padre.Padre == nil || p.Padre.Padre.Arete != "BIS1" ||
		p.Padre.Padre.Padre == nil || p.Padre.Padre.Padre.Arete != "TT1" || p.Padre.Padre.Madre.Arete != "TT2" {
		t.Fatalf("paternal line broken: %+v", p.Padre)
	}
	// Profundidad 4: los tatarabuelos no tienen padres resueltos
	if p.Padre.Padre.Padre.Padre != nil {
		t.Fatal("depth must stop at 4 generations")
	}
	// Madre sin padres: nodos vacíos (nil)
	if tree.Madre.Padre != nil || tree.Madre.Madre != nil {
		t.Fatalf("madre without parents must have nil parents: %+v", tree.Madre)
	}
}

// Padre como texto suelto (no es un registro): el nodo se muestra con ese
// texto y Existe=false, y los abuelos salen de los campos abuelo_* del hijo.
func TestBuildPedigreeFallsBackToLooseTextAndGrandparentFields(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "a1", Arete: "SM-1", PadreID: "SEM-EXTERNO", MadreID: "",
		AbueloPaternoID: "UNO:111", AbuelaPaternaID: "UNO:222", AbueloMaternoID: "UNO:333"}); err != nil {
		t.Fatal(err)
	}
	tree, err := a.BuildPedigree("a1", 4)
	if err != nil {
		t.Fatal(err)
	}
	if tree.Padre == nil || tree.Padre.Existe || tree.Padre.Arete != "SEM-EXTERNO" {
		t.Fatalf("padre = %+v", tree.Padre)
	}
	if tree.Padre.Padre == nil || tree.Padre.Padre.Arete != "UNO:111" || tree.Padre.Madre == nil || tree.Padre.Madre.Arete != "UNO:222" {
		t.Fatalf("paternal grandparents from abuelo_* fields: %+v", tree.Padre)
	}
	// Madre vacía pero con abuelo materno capturado: se muestra un nodo madre sin datos con su padre
	if tree.Madre == nil || tree.Madre.Existe || tree.Madre.Padre == nil || tree.Madre.Padre.Arete != "UNO:333" {
		t.Fatalf("maternal side = %+v", tree.Madre)
	}
}

// Un ciclo (animal que se apunta a sí mismo) no cuelga: corta por profundidad.
func TestBuildPedigreeStopsOnCycle(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "loop", Arete: "LOOP", PadreID: "LOOP", MadreID: "LOOP"}); err != nil {
		t.Fatal(err)
	}
	tree, err := a.BuildPedigree("loop", 4)
	if err != nil {
		t.Fatal(err)
	}
	n := tree
	for i := 0; i < 4 && n != nil; i++ {
		n = n.Padre
	}
	if n != nil && n.Padre != nil {
		t.Fatal("cycle must stop at depth 4")
	}
}

func TestGetAnimalesReferenciaOnlyReferences(t *testing.T) {
	a := newLoggedInTestApp(t)
	addRef(t, a, "R1", "", "")
	if err := a.AddAnimal(Animal{ID: "a1", Arete: "SM-1"}); err != nil {
		t.Fatal(err)
	}
	refs, err := a.GetAnimalesReferencia()
	if err != nil || len(refs) != 1 || refs[0].Arete != "R1" {
		t.Fatalf("refs = %+v (%v)", refs, err)
	}
}

func TestBuildPedigreeOtherTenantRejected(t *testing.T) {
	a := newLoggedInTestApp(t)
	if err := a.AddAnimal(Animal{ID: "a1", Arete: "SM-1"}); err != nil {
		t.Fatal(err)
	}
	a.user = &User{ID: "u2", RanchoID: "rancho-2", Role: "Admin"}
	if _, err := a.BuildPedigree("a1", 4); err == nil {
		t.Fatal("expected error for another tenant's animal")
	}
}
