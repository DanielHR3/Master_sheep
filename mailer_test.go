package main

import (
	"strings"
	"testing"
)

// fakeMailer sustituye al SMTP real en pruebas (Tasks 2 y 4).
type fakeMailer struct {
	subjects, bodies []string
	err              error
}

func (f *fakeMailer) Send(subject, body string) error {
	if f.err != nil {
		return f.err
	}
	f.subjects = append(f.subjects, subject)
	f.bodies = append(f.bodies, body)
	return nil
}

func TestFormatLeadEmailContact(t *testing.T) {
	subject, body := formatLeadEmail(ContactRequest{
		Nombre: "Juan Pérez", Rancho: "El Roble", Telefono: "33 1234 5678", Correo: "juan@rancho.mx", Mensaje: "Hola",
	}, "203.0.113.5")
	if subject != "Nuevo contacto SheepMaster: Juan Pérez (El Roble)" {
		t.Errorf("subject = %q", subject)
	}
	for _, want := range []string{"Juan Pérez", "El Roble", "33 1234 5678", "juan@rancho.mx", "Hola", "203.0.113.5"} {
		if !strings.Contains(body, want) {
			t.Errorf("body missing %q:\n%s", want, body)
		}
	}
}

func TestFormatLeadEmailDemoRequest(t *testing.T) {
	subject, body := formatLeadEmail(ContactRequest{
		Nombre: "Ana", Rancho: "Las Palmas", Correo: "ana@x.mx", QuiereDemo: true, HorarioPreferido: "jueves 10am",
	}, "")
	if subject != "Solicitud de DEMO SheepMaster: Ana (Las Palmas)" {
		t.Errorf("subject = %q", subject)
	}
	if idx := strings.Index(body, "jueves 10am"); idx < 0 || idx > 120 {
		t.Errorf("preferred schedule must appear at the top of the body, index %d:\n%s", idx, body)
	}
}

func TestNewMailerFromEnvWithoutPasswordIsNil(t *testing.T) {
	t.Setenv("SMTP_PASSWORD", "")
	if m := newMailerFromEnv(); m != nil {
		t.Fatalf("expected nil mailer without SMTP_PASSWORD, got %T", m)
	}
}

func TestNewMailerFromEnvUsesDefaults(t *testing.T) {
	t.Setenv("SMTP_PASSWORD", "app-password")
	t.Setenv("SMTP_USER", "")
	t.Setenv("CONTACT_TO", "")
	m, ok := newMailerFromEnv().(*smtpSender)
	if !ok {
		t.Fatal("expected *smtpSender")
	}
	if m.user != "danielhrubio3@gmail.com" || m.to != "danielhrubio3@gmail.com" || m.host != "smtp.gmail.com" || m.port != "587" {
		t.Errorf("unexpected defaults: %+v", *m)
	}
}
