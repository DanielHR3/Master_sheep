package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
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

func postContact(t *testing.T, a *App, body map[string]interface{}, ip string) *httptest.ResponseRecorder {
	t.Helper()
	raw, _ := json.Marshal(body)
	r := httptest.NewRequest(http.MethodPost, "/api/contact", bytes.NewReader(raw))
	r.Header.Set("Content-Type", "application/json")
	r.RemoteAddr = ip + ":1234"
	rec := httptest.NewRecorder()
	a.handleContact(rec, r)
	return rec
}

func countLeads(t *testing.T, a *App) int {
	t.Helper()
	var n int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM leads").Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestHandleContactSavesAndNotifies(t *testing.T) {
	a := newTestApp(t)
	fm := &fakeMailer{}
	a.mailer = fm
	contactAttempts.clear("198.51.100.1")

	rec := postContact(t, a, map[string]interface{}{
		"nombre": "Juan", "rancho": "El Roble", "correo": "juan@rancho.mx", "mensaje": "Hola", "quiere_demo": true, "horario_preferido": "lunes",
	}, "198.51.100.1")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body %s", rec.Code, rec.Body.String())
	}
	var resp map[string]bool
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if !resp["ok"] {
		t.Fatalf("expected ok:true, got %s", rec.Body.String())
	}
	if countLeads(t, a) != 1 {
		t.Fatalf("expected 1 lead, got %d", countLeads(t, a))
	}
	// el correo sale en goroutine: esperar brevemente
	deadline := time.Now().Add(2 * time.Second)
	for len(fm.subjects) == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if len(fm.subjects) != 1 || fm.subjects[0] != "Solicitud de DEMO SheepMaster: Juan (El Roble)" {
		t.Fatalf("mail subjects = %v", fm.subjects)
	}
	var notified interface{}
	deadline = time.Now().Add(2 * time.Second)
	for notified == nil && time.Now().Before(deadline) {
		a.db.QueryRow("SELECT notified_at FROM leads").Scan(&notified)
		time.Sleep(10 * time.Millisecond)
	}
	if notified == nil {
		t.Error("notified_at should be set after a successful send")
	}
}

func TestHandleContactHoneypotIsSilentlyDropped(t *testing.T) {
	a := newTestApp(t)
	fm := &fakeMailer{}
	a.mailer = fm
	contactAttempts.clear("198.51.100.2")
	rec := postContact(t, a, map[string]interface{}{"nombre": "Bot", "correo": "bot@x.mx", "website": "http://spam"}, "198.51.100.2")
	if rec.Code != http.StatusOK {
		t.Fatalf("honeypot must answer 200, got %d", rec.Code)
	}
	if countLeads(t, a) != 0 || len(fm.subjects) != 0 {
		t.Fatal("honeypot submissions must not be saved nor mailed")
	}
}

func TestHandleContactValidationError(t *testing.T) {
	a := newTestApp(t)
	contactAttempts.clear("198.51.100.3")
	rec := postContact(t, a, map[string]interface{}{"nombre": "", "correo": "x@y.mx"}, "198.51.100.3")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d", rec.Code)
	}
	if countLeads(t, a) != 0 {
		t.Fatal("invalid request must not be saved")
	}
}

func TestHandleContactRateLimitedByIP(t *testing.T) {
	a := newTestApp(t)
	a.mailer = &fakeMailer{}
	contactAttempts.clear("198.51.100.4")
	for i := 0; i < 5; i++ {
		if rec := postContact(t, a, map[string]interface{}{"nombre": "J", "correo": "j@x.mx"}, "198.51.100.4"); rec.Code != http.StatusOK {
			t.Fatalf("attempt %d: status %d", i+1, rec.Code)
		}
	}
	rec := postContact(t, a, map[string]interface{}{"nombre": "J", "correo": "j@x.mx"}, "198.51.100.4")
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("6th attempt: status = %d, want 429", rec.Code)
	}
	if countLeads(t, a) != 5 {
		t.Fatalf("leads = %d, want 5", countLeads(t, a))
	}
}

func TestHandleContactMailFailureStillOk(t *testing.T) {
	a := newTestApp(t)
	a.mailer = &fakeMailer{err: errors.New("smtp down")}
	contactAttempts.clear("198.51.100.5")
	rec := postContact(t, a, map[string]interface{}{"nombre": "J", "correo": "j@x.mx"}, "198.51.100.5")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	if countLeads(t, a) != 1 {
		t.Fatal("lead must be saved even if mail fails")
	}
	time.Sleep(50 * time.Millisecond)
	var notified interface{}
	a.db.QueryRow("SELECT notified_at FROM leads").Scan(&notified)
	if notified != nil {
		t.Error("notified_at must stay NULL when the mail failed")
	}
}

func TestHandleContactWithoutMailerSavesOnly(t *testing.T) {
	a := newTestApp(t)
	a.mailer = nil
	contactAttempts.clear("198.51.100.6")
	rec := postContact(t, a, map[string]interface{}{"nombre": "J", "telefono": "33 1234"}, "198.51.100.6")
	if rec.Code != http.StatusOK || countLeads(t, a) != 1 {
		t.Fatalf("status %d, leads %d", rec.Code, countLeads(t, a))
	}
}

func TestHandleContactRejectsGet(t *testing.T) {
	a := newTestApp(t)
	rec := httptest.NewRecorder()
	a.handleContact(rec, httptest.NewRequest(http.MethodGet, "/api/contact", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d", rec.Code)
	}
}

func TestHandleLandingConfig(t *testing.T) {
	a := newTestApp(t)
	t.Setenv("DEMO_BOOKING_URL", "")
	rec := httptest.NewRecorder()
	a.handleLandingConfig(rec, httptest.NewRequest(http.MethodGet, "/api/landing-config", nil))
	var cfg map[string]string
	json.Unmarshal(rec.Body.Bytes(), &cfg)
	if rec.Code != 200 || cfg["bookingUrl"] != "" {
		t.Fatalf("status %d cfg %v", rec.Code, cfg)
	}
	t.Setenv("DEMO_BOOKING_URL", "https://calendar.app.google/abc")
	rec = httptest.NewRecorder()
	a.handleLandingConfig(rec, httptest.NewRequest(http.MethodGet, "/api/landing-config", nil))
	json.Unmarshal(rec.Body.Bytes(), &cfg)
	if cfg["bookingUrl"] != "https://calendar.app.google/abc" {
		t.Fatalf("cfg = %v", cfg)
	}
}
