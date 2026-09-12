package main

import (
	"strings"
	"testing"
)

func TestLeadsTableExists(t *testing.T) {
	a := newTestApp(t)
	if !tableExists(t, a, "leads") {
		t.Fatal("expected leads table to exist")
	}
}

func TestContactRequestValidate(t *testing.T) {
	ok := ContactRequest{Nombre: "Juan Pérez", Correo: "juan@rancho.mx"}
	if err := ok.validate(); err != nil {
		t.Fatalf("valid request rejected: %v", err)
	}
	okPhone := ContactRequest{Nombre: "Juan", Telefono: "33 1234 5678"}
	if err := okPhone.validate(); err != nil {
		t.Fatalf("phone-only request rejected: %v", err)
	}
	cases := map[string]ContactRequest{
		"sin nombre":        {Correo: "a@b.mx"},
		"sin correo ni tel": {Nombre: "Juan"},
		"correo inválido":   {Nombre: "Juan", Correo: "no-es-correo"},
		"nombre muy largo":  {Nombre: strings.Repeat("a", 121), Correo: "a@b.mx"},
		"mensaje muy largo": {Nombre: "Juan", Correo: "a@b.mx", Mensaje: strings.Repeat("x", 2001)},
		"horario muy largo": {Nombre: "Juan", Correo: "a@b.mx", QuiereDemo: true, HorarioPreferido: strings.Repeat("h", 201)},
	}
	for name, c := range cases {
		if err := c.validate(); err == nil {
			t.Errorf("%s: expected validation error", name)
		}
	}
}

func TestSaveLeadPersistsRow(t *testing.T) {
	a := newTestApp(t)
	id, err := a.saveLead(ContactRequest{
		Nombre: "Juan Pérez", Rancho: "El Roble", Telefono: "33 1234 5678", Correo: "juan@rancho.mx",
		Mensaje: "Quiero saber más", QuiereDemo: true, HorarioPreferido: "martes por la tarde",
	}, "203.0.113.5")
	if err != nil {
		t.Fatalf("saveLead: %v", err)
	}
	if id == "" {
		t.Fatal("expected a lead id")
	}
	var nombre, ip, horario string
	var demo int
	var notified interface{}
	err = a.db.QueryRow("SELECT nombre, origen_ip, quiere_demo, horario_preferido, notified_at FROM leads WHERE id = ?", id).
		Scan(&nombre, &ip, &demo, &horario, &notified)
	if err != nil {
		t.Fatalf("query lead: %v", err)
	}
	if nombre != "Juan Pérez" || ip != "203.0.113.5" || demo != 1 || horario != "martes por la tarde" {
		t.Errorf("row = %q %q %d %q", nombre, ip, demo, horario)
	}
	if notified != nil {
		t.Errorf("notified_at should be NULL before sending, got %v", notified)
	}

	if err := a.markLeadNotified(id); err != nil {
		t.Fatalf("markLeadNotified: %v", err)
	}
	a.db.QueryRow("SELECT notified_at FROM leads WHERE id = ?", id).Scan(&notified)
	if notified == nil {
		t.Error("notified_at should be set after markLeadNotified")
	}
}
