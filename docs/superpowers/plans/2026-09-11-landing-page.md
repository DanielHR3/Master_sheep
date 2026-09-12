# Landing Page Pública Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Servir en `/` una página pública de ventas de SheepMaster con formulario de contacto (guardado en Supabase y enviado por correo) y solicitud de demo, con material visual real de la app, sin romper el flujo actual de login/panel.

**Architecture:** El servidor Go gana dos endpoints públicos (`POST /api/contact`, `GET /api/landing-config`) y una tabla `leads`; el envío de correo es una interfaz (`mailSender`) con implementación SMTP y una falsa para pruebas. El frontend decide entre landing, login y panel a partir del `pathname` y una marca en `localStorage`, sin enrutador. La landing es un conjunto de componentes React con Tailwind v4 que consumen media estática en `frontend/public/landing/`, producida con un script de datos de demostración y un script de grabación Playwright.

**Tech Stack:** Go 1.26 (`net/http`, `net/smtp`, `database/sql`), SQLite/Postgres vía `a.q()`, React 18 + TypeScript + Tailwind v4 + lucide-react, Playwright (Node, ya en `node_modules` de la raíz), `ffmpeg` (instalado vía Homebrew).

**Spec:** `docs/superpowers/specs/2026-09-11-landing-page-design.md`

## Global Constraints

- Sin dependencias nuevas en Go ni en npm.
- Todo endpoint nuevo es público pero pasa por `corsWrapper` y por el middleware `securityHeaders` ya existente; la CSP vigente es solo mismo origen, así que ningún recurso de la landing puede ser externo (fuentes, imágenes, videos, scripts).
- Vocabulario de la landing: nada de "JARVIS", "Terminal Táctica" ni "Hernia Protect". Borregos, corrales, pesos, ventas, partos.
- Marca visible: **SheepMaster**. "agrotech" solo en minúsculas como descriptor. No se usa `agrotech_banner.jpg` ni imágenes de terceros.
- Paleta: `slate-950` (oscuro), `slate-50`/blanco (claro), `emerald-500` único color de acción, cian solo acentos.
- Longitudes máximas del formulario: nombre 120, rancho 120, teléfono 30, correo 160, mensaje 2000, horario_preferido 200. Límite: 5 envíos por IP por hora.
- Remitente y destinatario de correo: `danielhrubio3@gmail.com` (configurable por `SMTP_USER` y `CONTACT_TO`). Sin `SMTP_PASSWORD` se guarda y no se envía.
- Página inicial < 1.5 MB sin videos; cada video ≤ 2 MB, 8-12 s, MP4 H.264 sin audio, con póster.
- Toda función Go nueva tiene prueba en `_test.go` con SQLite en memoria (`newTestApp(t)` en `schema_offline_test.go`) y `httptest`; ninguna prueba toca red.
- Cada tarea termina con `go test ./... && go vet . && go build -tags server -o /tmp/lp_server . && go build -o /tmp/lp_desktop .` (para tareas Go) o `cd frontend && npx tsc --noEmit && npm run build` (para tareas frontend) en verde, y un commit.

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `ratelimit.go` (modificar) | Generalizar `loginLimiter` a `attemptLimiter` con máximo y ventana configurables; añadir `contactAttempts` y `clientIP(r)` |
| `contact.go` (nuevo) | Tipos `ContactRequest`/`Lead`, validación, `saveLead`, `markLeadNotified`, `formatLeadEmail`, handlers `handleContact` y `handleLandingConfig` |
| `mailer.go` (nuevo) | Interfaz `mailSender`, `smtpSender` (Gmail STARTTLS), `newMailerFromEnv()` |
| `app.go` (modificar) | Tabla `leads` en `createSchema()`; campo `mailer mailSender` en `App` |
| `api_server.go` (modificar) | Registrar `/api/contact` y `/api/landing-config`; aviso al arrancar si no hay `SMTP_PASSWORD` |
| `contact_test.go`, `mailer_test.go`, `ratelimit_test.go` (nuevos) | Pruebas de lo anterior |
| `frontend/src/lib/publicRoute.ts` (nuevo) | `getPublicView`, `markAppSeen`, `navigateTo`, hook `usePublicView` |
| `frontend/src/App.tsx` (modificar) | Mostrar `Landing` cuando corresponde |
| `frontend/src/hooks/useAppLogic.ts` (modificar) | `markAppSeen()` tras login exitoso |
| `frontend/src/services/api.ts` (modificar) | `SendContact`, `GetLandingConfig` |
| `frontend/src/landing/Landing.tsx` (nuevo) | Página completa: barra, secciones, pie |
| `frontend/src/landing/HeroBanner.tsx` (nuevo) | Banner SVG original |
| `frontend/src/landing/sections/*.tsx` (nuevos) | `Hero`, `Tailored`, `Features`, `About`, `Steps`, `Contact` |
| `frontend/src/landing/content.ts` (nuevo) | Todo el texto de la página en un solo lugar (misión, visión, valores, beneficios) |
| `frontend/index.html` (modificar) | Título, descripción, Open Graph |
| `frontend/public/landing/` (nuevo) | `hero.mp4`, `semaforo.mp4`, sus pósters, capturas `.png`, `og.png` |
| `scratch/demo_data/main.go` (nuevo, no se despliega) | Llena una base local con un hato de demostración vía la API HTTP |
| `scratch/landing_media/record.js` (nuevo, no se despliega) | Graba videos y capturas con Playwright |
| `scratch/landing_media/convert.sh` (nuevo) | `ffmpeg`: MP4 ligeros y pósters |
| `docs/README.md` (modificar) | Variables de entorno nuevas y cómo regenerar la media |

---

### Task 1: Tabla `leads`, validación y guardado

**Files:**
- Modify: `app.go` (dentro del string `schema` de `createSchema()`, antes de `CREATE TABLE IF NOT EXISTS settings`)
- Create: `contact.go`
- Test: `contact_test.go`

**Interfaces:**
- Consumes: `a.db`, `a.q()`, `newTestApp(t)`, `tableExists(t, a, name)` (ambos en `schema_offline_test.go`)
- Produces:
  - `type ContactRequest struct { Nombre, Rancho, Telefono, Correo, Mensaje string; QuiereDemo bool; HorarioPreferido string; Website string }` (tags json en snake_case: `nombre`, `rancho`, `telefono`, `correo`, `mensaje`, `quiere_demo`, `horario_preferido`, `website`)
  - `func (c ContactRequest) validate() error`
  - `func (a *App) saveLead(c ContactRequest, ip string) (leadID string, err error)`
  - `func (a *App) markLeadNotified(leadID string) error`

- [ ] **Step 1: Write the failing test**

```go
// contact_test.go
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
		"sin nombre":          {Correo: "a@b.mx"},
		"sin correo ni tel":   {Nombre: "Juan"},
		"correo inválido":     {Nombre: "Juan", Correo: "no-es-correo"},
		"nombre muy largo":    {Nombre: strings.Repeat("a", 121), Correo: "a@b.mx"},
		"mensaje muy largo":   {Nombre: "Juan", Correo: "a@b.mx", Mensaje: strings.Repeat("x", 2001)},
		"horario muy largo":   {Nombre: "Juan", Correo: "a@b.mx", QuiereDemo: true, HorarioPreferido: strings.Repeat("h", 201)},
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run 'TestLeadsTableExists|TestContactRequestValidate|TestSaveLeadPersistsRow' .`
Expected: FAIL — `undefined: ContactRequest`, `a.saveLead undefined`

- [ ] **Step 3: Add the table and write the implementation**

In `app.go`, inside the `schema` string of `createSchema()`, right before `CREATE TABLE IF NOT EXISTS settings (`, add:

```sql
	CREATE TABLE IF NOT EXISTS leads (
		id TEXT PRIMARY KEY,
		nombre TEXT NOT NULL,
		rancho TEXT,
		telefono TEXT,
		correo TEXT,
		mensaje TEXT,
		quiere_demo INTEGER DEFAULT 0,
		horario_preferido TEXT,
		origen_ip TEXT,
		created_at TIMESTAMP NOT NULL,
		notified_at TIMESTAMP
	);
```

Create `contact.go`:

```go
package main

import (
	"fmt"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

// ContactRequest es lo que manda el formulario público de la landing.
// Website es un campo trampa invisible: un humano nunca lo llena.
type ContactRequest struct {
	Nombre           string `json:"nombre"`
	Rancho           string `json:"rancho"`
	Telefono         string `json:"telefono"`
	Correo           string `json:"correo"`
	Mensaje          string `json:"mensaje"`
	QuiereDemo       bool   `json:"quiere_demo"`
	HorarioPreferido string `json:"horario_preferido"`
	Website          string `json:"website"`
}

const (
	maxNombre   = 120
	maxRancho   = 120
	maxTelefono = 30
	maxCorreo   = 160
	maxMensaje  = 2000
	maxHorario  = 200
)

func tooLong(s string, max int) bool { return utf8.RuneCountInString(s) > max }

// validate aplica las reglas del spec: nombre obligatorio, correo o teléfono
// obligatorio, correo con formato válido si viene, y longitudes máximas.
func (c ContactRequest) validate() error {
	if strings.TrimSpace(c.Nombre) == "" {
		return fmt.Errorf("el nombre es obligatorio")
	}
	if strings.TrimSpace(c.Correo) == "" && strings.TrimSpace(c.Telefono) == "" {
		return fmt.Errorf("deja un correo o un teléfono para contactarte")
	}
	if c.Correo != "" {
		if _, err := mail.ParseAddress(c.Correo); err != nil {
			return fmt.Errorf("el correo no parece válido")
		}
	}
	switch {
	case tooLong(c.Nombre, maxNombre), tooLong(c.Rancho, maxRancho), tooLong(c.Telefono, maxTelefono),
		tooLong(c.Correo, maxCorreo), tooLong(c.Mensaje, maxMensaje), tooLong(c.HorarioPreferido, maxHorario):
		return fmt.Errorf("alguno de los campos es demasiado largo")
	}
	return nil
}

// saveLead guarda el contacto ANTES de intentar cualquier correo, para que
// nunca se pierda uno. Devuelve el id de la fila.
func (a *App) saveLead(c ContactRequest, ip string) (string, error) {
	id := uuid.New().String()
	demo := 0
	if c.QuiereDemo {
		demo = 1
	}
	_, err := a.db.Exec(a.q(`
		INSERT INTO leads (id, nombre, rancho, telefono, correo, mensaje, quiere_demo, horario_preferido, origen_ip, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`), id, strings.TrimSpace(c.Nombre), strings.TrimSpace(c.Rancho), strings.TrimSpace(c.Telefono),
		strings.TrimSpace(c.Correo), strings.TrimSpace(c.Mensaje), demo, strings.TrimSpace(c.HorarioPreferido), ip, time.Now())
	if err != nil {
		return "", err
	}
	return id, nil
}

// markLeadNotified anota que el correo de aviso salió bien.
func (a *App) markLeadNotified(id string) error {
	_, err := a.db.Exec(a.q("UPDATE leads SET notified_at = ? WHERE id = ?"), time.Now(), id)
	return err
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -run 'TestLeadsTableExists|TestContactRequestValidate|TestSaveLeadPersistsRow' .`
Expected: PASS

- [ ] **Step 5: Full suite + builds**

Run: `go test ./... && go vet . && go build -tags server -o /tmp/lp_server . && go build -o /tmp/lp_desktop .`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add app.go contact.go contact_test.go
git commit -m "feat(landing): leads table, contact validation and persistence"
```

---

### Task 2: Envío de correo (`mailer.go`)

**Files:**
- Create: `mailer.go`
- Modify: `contact.go` (añadir `formatLeadEmail`)
- Modify: `app.go` (campo `mailer mailSender` en `App`)
- Test: `mailer_test.go`

**Interfaces:**
- Consumes: `ContactRequest` (Task 1)
- Produces:
  - `type mailSender interface { Send(subject, body string) error }`
  - `type fakeMailer struct { subjects, bodies []string; err error }` con `Send` (solo en `mailer_test.go`, reutilizada por Task 4)
  - `func newMailerFromEnv() mailSender` (nil si no hay `SMTP_PASSWORD`)
  - `func formatLeadEmail(c ContactRequest, ip string) (subject, body string)`

- [ ] **Step 1: Write the failing test**

```go
// mailer_test.go
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run 'TestFormatLeadEmail|TestNewMailerFromEnv' .`
Expected: FAIL — `undefined: formatLeadEmail`, `undefined: newMailerFromEnv`

- [ ] **Step 3: Write the implementation**

Create `mailer.go`:

```go
package main

import (
	"fmt"
	"mime"
	"net/smtp"
	"os"
	"strings"
)

// mailSender es lo único que el handler de contacto sabe del correo. En
// producción es smtpSender; en pruebas, fakeMailer (mailer_test.go).
type mailSender interface {
	Send(subject, body string) error
}

const (
	defaultContactAddress = "danielhrubio3@gmail.com"
	defaultSMTPHost       = "smtp.gmail.com"
	defaultSMTPPort       = "587"
)

// smtpSender manda correo por SMTP con STARTTLS (Gmail con contraseña de
// aplicación). smtp.SendMail negocia STARTTLS solo si el servidor lo ofrece.
type smtpSender struct {
	host, port, user, password, to string
}

func (s *smtpSender) Send(subject, body string) error {
	msg := strings.Join([]string{
		"From: SheepMaster <" + s.user + ">",
		"To: " + s.to,
		"Subject: " + mime.QEncoding.Encode("utf-8", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=utf-8",
		"",
		body,
	}, "\r\n")
	auth := smtp.PlainAuth("", s.user, s.password, s.host)
	return smtp.SendMail(s.host+":"+s.port, auth, s.user, []string{s.to}, []byte(msg))
}

// newMailerFromEnv devuelve nil cuando no hay SMTP_PASSWORD: el endpoint
// entonces guarda el lead y no envía (el aviso se imprime al arrancar).
func newMailerFromEnv() mailSender {
	password := os.Getenv("SMTP_PASSWORD")
	if password == "" {
		return nil
	}
	user := os.Getenv("SMTP_USER")
	if user == "" {
		user = defaultContactAddress
	}
	to := os.Getenv("CONTACT_TO")
	if to == "" {
		to = defaultContactAddress
	}
	return &smtpSender{host: defaultSMTPHost, port: defaultSMTPPort, user: user, password: password, to: to}
}

var _ = fmt.Sprintf // mantiene fmt disponible para futuras plantillas
```

(Elimina la última línea `var _ = fmt.Sprintf` y el import de `fmt` si `go vet` los marca como innecesarios; están solo para evitar un import sin uso si decides no usar `fmt` aquí.)

Append to `contact.go`:

```go
// formatLeadEmail arma asunto y cuerpo en texto plano. Si el visitante pidió
// demo, el asunto lo dice y el horario preferido va al inicio del cuerpo.
func formatLeadEmail(c ContactRequest, ip string) (subject, body string) {
	rancho := strings.TrimSpace(c.Rancho)
	if rancho == "" {
		rancho = "sin rancho"
	}
	var b strings.Builder
	if c.QuiereDemo {
		subject = fmt.Sprintf("Solicitud de DEMO SheepMaster: %s (%s)", strings.TrimSpace(c.Nombre), rancho)
		fmt.Fprintf(&b, "SOLICITUD DE DEMO\nHorario que le acomoda: %s\n\n", strings.TrimSpace(c.HorarioPreferido))
	} else {
		subject = fmt.Sprintf("Nuevo contacto SheepMaster: %s (%s)", strings.TrimSpace(c.Nombre), rancho)
	}
	fmt.Fprintf(&b, "Nombre:   %s\n", c.Nombre)
	fmt.Fprintf(&b, "Rancho:   %s\n", c.Rancho)
	fmt.Fprintf(&b, "Teléfono: %s\n", c.Telefono)
	fmt.Fprintf(&b, "Correo:   %s\n", c.Correo)
	fmt.Fprintf(&b, "\nMensaje:\n%s\n", c.Mensaje)
	fmt.Fprintf(&b, "\n--\nRecibido el %s desde la IP %s\n", time.Now().Format("2006-01-02 15:04"), ip)
	return subject, b.String()
}
```

In `app.go`, add to the `App` struct (after `offlineManager`):

```go
	mailer mailSender // correo de avisos del formulario público; nil si no hay SMTP_PASSWORD
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -run 'TestFormatLeadEmail|TestNewMailerFromEnv' .`
Expected: PASS

- [ ] **Step 5: Full suite + builds**

Run: `go test ./... && go vet . && go build -tags server -o /tmp/lp_server . && go build -o /tmp/lp_desktop .`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add mailer.go mailer_test.go contact.go app.go
git commit -m "feat(landing): SMTP mailer interface and lead email formatting"
```

---

### Task 3: Limitador por IP reutilizable

**Files:**
- Modify: `ratelimit.go` (todo el archivo)
- Modify: `api_server.go:handleLogin` (renombrar `recordFailure` → `record`)
- Test: `ratelimit_test.go`

**Interfaces:**
- Produces:
  - `type attemptLimiter struct{...}`; `func newAttemptLimiter(max int, window time.Duration) *attemptLimiter`
  - métodos `allowed(key string) bool`, `record(key string)`, `clear(key string)`
  - `var loginAttempts = newAttemptLimiter(5, 15*time.Minute)`; `var contactAttempts = newAttemptLimiter(5, time.Hour)`
  - `func clientIP(r *http.Request) string`

- [ ] **Step 1: Write the failing test**

```go
// ratelimit_test.go
package main

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestAttemptLimiterBlocksAfterMax(t *testing.T) {
	l := newAttemptLimiter(2, time.Hour)
	if !l.allowed("k") {
		t.Fatal("first attempt should be allowed")
	}
	l.record("k")
	l.record("k")
	if l.allowed("k") {
		t.Fatal("third attempt should be blocked")
	}
	if !l.allowed("other") {
		t.Fatal("other key must be independent")
	}
	l.clear("k")
	if !l.allowed("k") {
		t.Fatal("clear should reset the key")
	}
}

func TestAttemptLimiterForgetsOldAttempts(t *testing.T) {
	l := newAttemptLimiter(1, time.Millisecond)
	l.record("k")
	time.Sleep(5 * time.Millisecond)
	if !l.allowed("k") {
		t.Fatal("attempts outside the window must not count")
	}
}

func TestClientIPPrefersForwardedFor(t *testing.T) {
	r := httptest.NewRequest("POST", "/api/contact", nil)
	r.RemoteAddr = "10.0.0.1:5555"
	if got := clientIP(r); got != "10.0.0.1" {
		t.Errorf("RemoteAddr host = %q", got)
	}
	r.Header.Set("X-Forwarded-For", "203.0.113.9, 10.0.0.2")
	if got := clientIP(r); got != "203.0.113.9" {
		t.Errorf("first X-Forwarded-For = %q", got)
	}
}

func TestContactAttemptsLimit(t *testing.T) {
	if contactAttempts.max != 5 || contactAttempts.window != time.Hour {
		t.Errorf("contactAttempts = %d/%v, want 5/1h", contactAttempts.max, contactAttempts.window)
	}
	if loginAttempts.max != 5 || loginAttempts.window != 15*time.Minute {
		t.Errorf("loginAttempts = %d/%v, want 5/15m", loginAttempts.max, loginAttempts.window)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run 'TestAttemptLimiter|TestClientIP|TestContactAttemptsLimit' .`
Expected: FAIL — `undefined: newAttemptLimiter`, `undefined: clientIP`

- [ ] **Step 3: Rewrite `ratelimit.go`**

```go
package main

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// attemptLimiter aplica un límite simple de intentos por llave en una
// ventana de tiempo. Es en memoria a propósito: una imprecisión entre
// instancias de Cloud Run solo relaja el límite, no lo rompe, y evita que
// un ataque también inunde la base de datos con una consulta por intento.
type attemptLimiter struct {
	mu       sync.Mutex
	max      int
	window   time.Duration
	attempts map[string][]time.Time
}

func newAttemptLimiter(max int, window time.Duration) *attemptLimiter {
	return &attemptLimiter{max: max, window: window, attempts: make(map[string][]time.Time)}
}

// loginAttempts frena fuerza bruta contra /api/login (llave: email).
var loginAttempts = newAttemptLimiter(5, 15*time.Minute)

// contactAttempts frena spam en /api/contact (llave: IP del visitante).
var contactAttempts = newAttemptLimiter(5, time.Hour)

// allowed indica si `key` puede intentar ahora mismo.
func (l *attemptLimiter) allowed(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	cutoff := time.Now().Add(-l.window)
	recent := make([]time.Time, 0, len(l.attempts[key]))
	for _, t := range l.attempts[key] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}
	l.attempts[key] = recent
	return len(recent) < l.max
}

// record registra un intento para `key`.
func (l *attemptLimiter) record(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.attempts[key] = append(l.attempts[key], time.Now())
}

// clear borra el historial de `key` (p. ej. tras un login exitoso).
func (l *attemptLimiter) clear(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, key)
}

// clientIP devuelve la IP del visitante: la primera de X-Forwarded-For
// (Cloud Run la pone) o, si no viene, el host de RemoteAddr.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if first := strings.TrimSpace(strings.Split(xff, ",")[0]); first != "" {
			return first
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
```

In `api_server.go` `handleLogin`, change the single call `loginAttempts.recordFailure(creds.Email)` to `loginAttempts.record(creds.Email)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -run 'TestAttemptLimiter|TestClientIP|TestContactAttemptsLimit' .`
Expected: PASS

- [ ] **Step 5: Full suite + builds**

Run: `go test ./... && go vet . && go build -tags server -o /tmp/lp_server . && go build -o /tmp/lp_desktop .`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add ratelimit.go ratelimit_test.go api_server.go
git commit -m "refactor(security): generic attemptLimiter, contact limiter and clientIP"
```

---

### Task 4: Endpoints `POST /api/contact` y `GET /api/landing-config`

**Files:**
- Modify: `contact.go` (añadir handlers)
- Modify: `api_server.go` (registrar rutas; aviso al arrancar)
- Modify: `app.go:initDB` (inicializar `a.mailer`)
- Test: `contact_test.go` (añadir pruebas de handler)

**Interfaces:**
- Consumes: `saveLead`, `markLeadNotified`, `formatLeadEmail` (Tasks 1-2), `contactAttempts`, `clientIP` (Task 3), `fakeMailer` (Task 2 tests), `corsWrapper` (existente)
- Produces:
  - `func (a *App) handleContact(w http.ResponseWriter, r *http.Request)`
  - `func (a *App) handleLandingConfig(w http.ResponseWriter, r *http.Request)` → `{"bookingUrl": string}` (vacío si no hay `DEMO_BOOKING_URL`)
  - `func (a *App) notifyLead(id string, c ContactRequest, ip string)` (síncrona; el handler la llama en goroutine)

- [ ] **Step 1: Write the failing tests**

Append to `contact_test.go`:

```go
import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"time"
)

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
	a.db.QueryRow("SELECT notified_at FROM leads").Scan(&notified)
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

var _ sync.Mutex // evita import sin uso si no se necesita sync arriba
```

(Fusiona los imports con los que ya tiene `contact_test.go`: `bytes`, `encoding/json`, `errors`, `net/http`, `net/http/httptest`, `strings`, `sync`, `testing`, `time`. Borra la línea `var _ sync.Mutex` y el import de `sync` si no se usan.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test -run 'TestHandleContact|TestHandleLandingConfig' .`
Expected: FAIL — `a.handleContact undefined`, `a.handleLandingConfig undefined`

- [ ] **Step 3: Write the handlers**

Append to `contact.go` (añade `"encoding/json"`, `"log"`, `"net/http"`, `"os"` a los imports):

```go
// handleContact recibe el formulario público. Orden: método → límite por
// IP → JSON → campo trampa → validación → guardar → responder → correo en
// segundo plano. El visitante siempre recibe "ok" si el lead quedó guardado.
func (a *App) handleContact(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	ip := clientIP(r)
	if !contactAttempts.allowed(ip) {
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(map[string]string{"error": "demasiados envíos, intenta más tarde"})
		return
	}
	var c ContactRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024)).Decode(&c); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	contactAttempts.record(ip)
	if strings.TrimSpace(c.Website) != "" {
		// Campo trampa lleno: es un bot. Responder como si todo hubiera ido bien.
		json.NewEncoder(w).Encode(map[string]bool{"ok": true})
		return
	}
	if err := c.validate(); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	id, err := a.saveLead(c, ip)
	if err != nil {
		log.Printf("[contact] no se pudo guardar el lead: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "no se pudo guardar tu mensaje, intenta de nuevo"})
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	go a.notifyLead(id, c, ip)
}

// notifyLead manda el aviso por correo y marca el lead. Un fallo solo se
// registra en el log: el lead ya está guardado.
func (a *App) notifyLead(id string, c ContactRequest, ip string) {
	if a.mailer == nil {
		return
	}
	subject, body := formatLeadEmail(c, ip)
	if err := a.mailer.Send(subject, body); err != nil {
		log.Printf("[contact] lead %s guardado pero el correo falló: %v", id, err)
		return
	}
	if err := a.markLeadNotified(id); err != nil {
		log.Printf("[contact] correo enviado pero no se pudo marcar el lead %s: %v", id, err)
	}
}

// handleLandingConfig expone configuración pública de la landing. Hoy solo
// la URL de reservas de Google Calendar (vacía si no está configurada).
func (a *App) handleLandingConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"bookingUrl": os.Getenv("DEMO_BOOKING_URL")})
}
```

In `api_server.go`, right after the `/api/health` route registration, add:

```go
	// Landing pública: contacto y configuración (sin sesión)
	mux.HandleFunc("/api/contact", corsWrapper(a.handleContact))
	mux.HandleFunc("/api/landing-config", corsWrapper(a.handleLandingConfig))
```

and right after the `origins == nil` warning block in `StartAPIServer`, add:

```go
	if a.mailer == nil {
		fmt.Println("AVISO: SMTP_PASSWORD no configurada — los contactos de la landing se guardan en la tabla leads pero no se envían por correo.")
	}
```

In `app.go` `initDB()`, immediately after `a.db = db`, add:

```go
	a.mailer = newMailerFromEnv()
```

Note: `main.go` (desktop) calls `StartAPIServer` before `startup()`/`initDB()`, so the warning may print before `a.mailer` is set; that only affects the log line, not behaviour (`handleContact` reads `a.mailer` at request time). `server_main.go` calls `initDB()` first, so the warning is accurate in production.

- [ ] **Step 4: Run tests to verify they pass**

Run: `go test -run 'TestHandleContact|TestHandleLandingConfig' .`
Expected: PASS

- [ ] **Step 5: Full suite + builds + manual smoke**

Run: `go test ./... && go vet . && go build -tags server -o /tmp/lp_server . && go build -o /tmp/lp_desktop .`
Expected: all green.

Smoke (server build, SQLite, temp HOME):
```bash
HOME=$(mktemp -d) PORT=8091 /tmp/lp_server & sleep 2
curl -s -X POST localhost:8091/api/contact -H 'Content-Type: application/json' \
  -d '{"nombre":"Prueba","correo":"p@x.mx","mensaje":"hola"}'      # → {"ok":true}
curl -s localhost:8091/api/landing-config                           # → {"bookingUrl":""}
kill %1
```

- [ ] **Step 6: Commit**

```bash
git add contact.go contact_test.go api_server.go app.go
git commit -m "feat(landing): public contact and landing-config endpoints"
```

---

### Task 5: Enrutado público en el frontend (landing / login / panel)

**Files:**
- Create: `frontend/src/lib/publicRoute.ts`
- Create: `frontend/src/landing/Landing.tsx` (versión mínima; Task 8 la completa)
- Modify: `frontend/src/App.tsx:57-70`
- Modify: `frontend/src/hooks/useAppLogic.ts:167-175` (`handleLogin`)

**Interfaces:**
- Produces:
  - `export type PublicView = 'landing' | 'login'`
  - `export function getPublicView(): PublicView`
  - `export function markAppSeen(): void`
  - `export function navigateTo(path: '/' | '/login'): void`
  - `export function usePublicView(): PublicView`
  - `Landing` component: `React.FC<{ onLoginClick: () => void }>`

- [ ] **Step 1: Write `publicRoute.ts`**

```ts
// frontend/src/lib/publicRoute.ts
import { useEffect, useState } from 'react';

export type PublicView = 'landing' | 'login';

const SEEN_KEY = 'sheepmaster_seen_app';

// En la app de escritorio (Wails) nunca hay landing: es una herramienta de
// trabajo, no una página de ventas.
const isWails = () => !!(window as any).go;

// Regla del spec §2: visitante nuevo en "/" → landing; quien ya usó la app
// en este navegador, o quien entra a "/login", → login.
export function getPublicView(): PublicView {
  if (isWails()) return 'login';
  if (window.location.pathname.endsWith('/login')) return 'login';
  try {
    if (localStorage.getItem(SEEN_KEY)) return 'login';
  } catch {
    /* localStorage bloqueado: tratar como visitante nuevo */
  }
  return 'landing';
}

export function markAppSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* sin localStorage no hay marca; la landing volverá a mostrarse */
  }
}

// Navegación sin recarga: pushState + evento popstate para que el hook
// se entere. Rutas relativas para no romper el base "./" de Vite.
export function navigateTo(path: '/' | '/login'): void {
  const target = path === '/login' ? './login' : './';
  window.history.pushState({}, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function usePublicView(): PublicView {
  const [view, setView] = useState<PublicView>(getPublicView);
  useEffect(() => {
    const onChange = () => setView(getPublicView());
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return view;
}
```

- [ ] **Step 2: Write the minimal `Landing.tsx`**

```tsx
// frontend/src/landing/Landing.tsx
import React from 'react';

interface LandingProps {
  onLoginClick: () => void;
}

const Landing: React.FC<LandingProps> = ({ onLoginClick }) => (
  <div className="min-h-screen bg-slate-950 text-white font-sans">
    <header className="flex items-center justify-between px-6 py-4">
      <span className="font-display font-black text-xl">SheepMaster</span>
      <button onClick={onLoginClick} className="text-sm font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 cursor-pointer">
        Iniciar sesión
      </button>
    </header>
    <main className="px-6 py-24 text-center">
      <h1 className="font-display text-4xl font-black">Registra en el corral sin señal.</h1>
    </main>
  </div>
);

export default Landing;
```

- [ ] **Step 3: Wire it into `App.tsx`**

Add imports at the top of `App.tsx`:

```tsx
import Landing from './landing/Landing';
import { usePublicView, navigateTo } from './lib/publicRoute';
```

Inside `function App()`, right after `const [isSidebarCollapsed, ...]`, add:

```tsx
  const publicView = usePublicView();
```

Replace the existing block

```tsx
  if (!store.isLoggedIn) {
    return (
      <>
        <Snackbar />
        <Login
```

with

```tsx
  if (!store.isLoggedIn) {
    if (publicView === 'landing') {
      return <Landing onLoginClick={() => navigateTo('/login')} />;
    }
    return (
      <>
        <Snackbar />
        <Login
```

(the rest of the Login JSX stays unchanged).

- [ ] **Step 4: Mark the app as seen on successful login**

In `frontend/src/hooks/useAppLogic.ts`, add the import `import { markAppSeen } from '../lib/publicRoute';` and, in `handleLogin`, right after `await Login(email, password);`, add `markAppSeen();`.

- [ ] **Step 5: Type-check, build, manual check**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: 0 errors, build ok.

Manual (server build, SQLite, temp HOME, seeded account):
```bash
cd .. && go build -tags server -o /tmp/lp_server . && HOME=$(mktemp -d) PORT=8091 SEED_ADMIN_PASSWORD=demo123 /tmp/lp_server &
```
Open `http://localhost:8091/` in a fresh incognito window → landing mínima con "Iniciar sesión". Click → formulario de login sin recarga (URL `/login`). Log in with `admin@donpablito.com` / `demo123` → panel. Log out → login (no landing, porque ya hay marca). Open `http://localhost:8091/login` directly → login. Clear site data → `/` shows landing again. `kill %1`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/publicRoute.ts frontend/src/landing/Landing.tsx frontend/src/App.tsx frontend/src/hooks/useAppLogic.ts
git commit -m "feat(landing): public route logic (landing / login / panel) without a router"
```

---

### Task 6: Datos de demostración para el material visual

**Files:**
- Create: `scratch/demo_data/main.go` (herramienta local; se compila y se usa, no se despliega)

**Interfaces:**
- Consumes: la API HTTP existente (`/api/login`, `/api/corrales`, `/api/animals`, `/api/insumos`, `/api/weights`, `/api/treatments`, `/api/reproduction`, `/api/births`, `/api/tasks`, `/api/confirm-ultrasound`) con los tipos JSON de `types.go`
- Produces: una base SQLite local poblada (en el `HOME` temporal del servidor de demostración) con ~60 animales, 6 corrales, insumos, pesajes, tratamientos, eventos reproductivos, partos y tareas

- [ ] **Step 1: Write the tool**

```go
// scratch/demo_data/main.go
// Llena un SheepMaster local con un hato de demostración realista vía la
// API HTTP. Uso:
//   HOME=$(mktemp -d) PORT=8091 SEED_ADMIN_PASSWORD=demo123 /tmp/lp_server &
//   go run ./scratch/demo_data http://localhost:8091 admin@donpablito.com demo123
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"time"
)

var (
	base  string
	token string
	rnd   = rand.New(rand.NewSource(42)) // determinista: mismas capturas cada vez
)

func call(method, path string, body interface{}) {
	var buf bytes.Buffer
	if body != nil {
		json.NewEncoder(&buf).Encode(body)
	}
	req, _ := http.NewRequest(method, base+path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("ERROR", method, path, err)
		os.Exit(1)
	}
	res.Body.Close()
	if res.StatusCode >= 300 {
		fmt.Println("ERROR", method, path, res.Status)
		os.Exit(1)
	}
}

func date(daysAgo int) string { return time.Now().AddDate(0, 0, -daysAgo).Format("2006-01-02") }

func main() {
	if len(os.Args) != 4 {
		fmt.Println("uso: demo_data <base-url> <email> <password>")
		os.Exit(2)
	}
	base = os.Args[1]
	var buf bytes.Buffer
	json.NewEncoder(&buf).Encode(map[string]string{"email": os.Args[2], "password": os.Args[3]})
	res, err := http.Post(base+"/api/login", "application/json", &buf)
	if err != nil {
		fmt.Println("login:", err)
		os.Exit(1)
	}
	var login struct{ Token string `json:"token"` }
	json.NewDecoder(res.Body).Decode(&login)
	token = login.Token
	if token == "" {
		fmt.Println("login falló")
		os.Exit(1)
	}

	corrales := []string{"Engorda Norte", "Engorda Sur", "Hembras Gestantes", "Maternidad", "Destete", "Sementales"}
	for i, c := range corrales {
		call("POST", "/api/corrales", map[string]interface{}{"id": fmt.Sprintf("demo-c%d", i), "nombre": c, "tipo": "Corral", "capacidad": 20})
	}
	insumos := []map[string]interface{}{
		{"id": "demo-i1", "nombre": "Ivermectina 1%", "tipo": "Medicina", "unidad": "ml", "stock_actual": 250, "stock_minimo": 50, "costo_unitario": 4.5, "dias_retiro": 28},
		{"id": "demo-i2", "nombre": "Vacuna Clostridial", "tipo": "Vacuna", "unidad": "dosis", "stock_actual": 120, "stock_minimo": 30, "costo_unitario": 12, "dias_retiro": 21},
		{"id": "demo-i3", "nombre": "Vitamina ADE", "tipo": "Medicina", "unidad": "ml", "stock_actual": 80, "stock_minimo": 20, "costo_unitario": 6, "dias_retiro": 0},
	}
	for _, i := range insumos {
		call("POST", "/api/insumos", i)
	}

	razas := []string{"Dorper", "Katahdin", "Pelibuey"}
	// Sementales y madres fundadoras (generación 1)
	for i := 0; i < 3; i++ {
		call("POST", "/api/animals", map[string]interface{}{"id": fmt.Sprintf("demo-s%d", i), "arete": fmt.Sprintf("SEM-%02d", i+1), "raza": razas[i], "sexo": "Macho",
			"fecha_nacimiento": date(1100 + i*90), "estatus": "Activo", "estado_reproductivo": "Semental", "corral_id": "Sementales", "destino": "Pie de Cría", "peso_nacer": 4.2})
	}
	for i := 0; i < 12; i++ {
		call("POST", "/api/animals", map[string]interface{}{"id": fmt.Sprintf("demo-m%d", i), "arete": fmt.Sprintf("MAD-%02d", i+1), "raza": razas[i%3], "sexo": "Hembra",
			"fecha_nacimiento": date(800 + i*30), "estatus": "Activo", "estado_reproductivo": "Vacía", "corral_id": "Hembras Gestantes", "destino": "Pie de Cría",
			"padre_id": fmt.Sprintf("demo-s%d", i%3), "peso_nacer": 3.8})
	}
	// Corderos de engorda (generación 2) con edades entre 2 y 7 meses
	for i := 0; i < 45; i++ {
		edad := 60 + rnd.Intn(150)
		sexo := "Macho"
		if i%2 == 0 {
			sexo = "Hembra"
		}
		corral := "Engorda Norte"
		if i%3 == 1 {
			corral = "Engorda Sur"
		} else if edad < 100 {
			corral = "Destete"
		}
		id := fmt.Sprintf("demo-a%02d", i)
		call("POST", "/api/animals", map[string]interface{}{"id": id, "arete": fmt.Sprintf("SM-%03d", 100+i), "raza": razas[i%3], "sexo": sexo,
			"fecha_nacimiento": date(edad), "estatus": "Activo", "estado_reproductivo": "Crecimiento", "corral_id": corral, "destino": "Engorda",
			"padre_id": fmt.Sprintf("demo-s%d", i%3), "madre_id": fmt.Sprintf("demo-m%d", i%12), "peso_nacer": 3.5 + rnd.Float64()})
		// pesajes mensuales: ~0.25 kg/día → varios ya pasan de 42 kg con > 4 meses
		peso := 4.0
		for d := edad - 5; d > 0; d -= 30 {
			peso += 0.25 * 30 * (0.8 + rnd.Float64()*0.4)
			call("POST", "/api/weights", map[string]interface{}{"animal_id": id, "fecha": date(d), "peso": float64(int(peso*10)) / 10, "notas": ""})
		}
	}
	// Tratamientos recientes (periodo de retiro activo en algunos)
	for i := 0; i < 8; i++ {
		call("POST", "/api/treatments", map[string]interface{}{"animal_id": fmt.Sprintf("demo-a%02d", i*5), "insumo_id": "demo-i1", "dosis": 1.5,
			"via_administracion": "Subcutánea", "duracion_dias": 1, "fecha": date(rnd.Intn(20)), "tecnico": "MVZ Ramírez", "observaciones": "Desparasitación"})
	}
	// Montas, ultrasonidos y partos
	for i := 0; i < 12; i++ {
		madre := fmt.Sprintf("demo-m%d", i)
		call("POST", "/api/reproduction", map[string]interface{}{"animal_id": madre, "tipo": "Monta Natural", "fecha_evento": date(30 + i*10), "id_macho": fmt.Sprintf("demo-s%d", i%3), "tecnico": "Encargado"})
		if i < 6 {
			call("POST", "/api/confirm-ultrasound", map[string]interface{}{"animal_id": madre, "preñada": true, "fetos": 1 + i%2})
		}
		if i >= 9 {
			call("POST", "/api/births", map[string]interface{}{"animal_id": madre, "fecha": date(i - 8), "cantidad_crias": 1 + i%2, "tipo_parto": "Simple", "observaciones": "Sin complicaciones"})
		}
	}
	// Tareas de la semana
	for i, t := range []string{"Vacunar lote Engorda Norte", "Pesar corderos de Destete", "Revisar cerca del corral Sur", "Pedir alimento (quedan 3 días)"} {
		call("POST", "/api/tasks", map[string]interface{}{"titulo": t, "descripcion": "", "estatus": "Pendiente", "fecha_vencimiento": date(-i), "prioridad": []string{"Alta", "Media", "Baja", "Alta"}[i]})
	}
	fmt.Println("hato de demostración cargado")
}
```

(The `/api/confirm-ultrasound` handler decodes `animal_id`, `preñada`, `fetos` — confirm the exact JSON tags by reading `handleConfirmUltrasound` in `api_server.go` before running; adjust the keys if they differ.)

- [ ] **Step 2: Run it and eyeball the result**

```bash
go build -tags server -o /tmp/lp_server . && rm -rf /tmp/lp_home && mkdir -p /tmp/lp_home
HOME=/tmp/lp_home PORT=8091 SEED_ADMIN_PASSWORD=demo123 /tmp/lp_server > /tmp/lp_server.log 2>&1 &
sleep 2 && go run ./scratch/demo_data http://localhost:8091 admin@donpablito.com demo123
```
Expected: `hato de demostración cargado`. Open `http://localhost:8091/`, log in, and check the Dashboard shows a non-empty sale semaphore, the Inventory lists ~60 animals, and Clinical shows treatments. Leave the server running for Task 7.

- [ ] **Step 3: Commit**

```bash
git add scratch/demo_data/main.go
git commit -m "chore(landing): demo herd generator for marketing media"
```

---

### Task 7: Grabación de videos y capturas (Playwright + ffmpeg)

**Files:**
- Create: `scratch/landing_media/record.js`
- Create: `scratch/landing_media/convert.sh`
- Create (output): `frontend/public/landing/{hero.mp4,hero.jpg,semaforo.mp4,semaforo.jpg,engorda.png,cria.png,agenda.png,genealogia.png,movil-inventario.png}`

**Interfaces:**
- Consumes: el servidor de demostración de Task 6 en `http://localhost:8091` con `admin@donpablito.com` / `demo123`; `playwright` de `node_modules` en la raíz del repo (ya instalado, ver `take_screenshots.js`); `ffmpeg` en PATH
- Produces: los archivos listados arriba, con esos nombres exactos (Task 8 los referencia)

Nota sobre el video del hero: el servidor de demostración es el build de servidor (sin cola de sincronización), así que el flujo "sin conexión → sincroniza" se graba con el **build de escritorio** en modo headless contra un Postgres en Docker, exactamente como se hizo en la verificación de sincronización del 2026-09-11. Los pasos están abajo.

- [ ] **Step 1: Write `record.js`**

```js
// scratch/landing_media/record.js
// Uso: node scratch/landing_media/record.js <base-url> <email> <password> <outdir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const [base, email, password, outDir] = process.argv.slice(2);
if (!outDir) { console.error('uso: record.js <base-url> <email> <password> <outdir>'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

async function login(page) {
  await page.goto(base + '/login');
  await page.getByRole('textbox', { name: 'Correo Corporativo' }).fill(email);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(password);
  await page.getByRole('button', { name: 'Entrar al Sistema' }).click();
  await page.getByText('SYNC CLOUD').first().waitFor();
  await page.waitForTimeout(1200);
}

async function withContext(browser, opts, fn) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  await fn(page);
  await context.close();
}

(async () => {
  const browser = await chromium.launch();
  const desktop = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 };

  // --- Capturas de escritorio ---
  await withContext(browser, desktop, async (page) => {
    await login(page);
    await page.screenshot({ path: path.join(outDir, 'engorda.png') });          // dashboard con semáforo
    await page.getByRole('button', { name: 'Control Clínico' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'agenda.png') });
    await page.getByRole('button', { name: 'Inventario Hato' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Genética' }).first().click();       // árbol genealógico
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'genealogia.png') });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Reproducción' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'cria.png') });
  });

  // --- Captura móvil ---
  await withContext(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true }, async (page) => {
    await login(page);
    await page.getByText('Inventario').first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'movil-inventario.png') });
  });

  // --- Video: semáforo de venta (scroll suave por el dashboard) ---
  await withContext(browser, { ...desktop, recordVideo: { dir: path.join(outDir, 'raw'), size: { width: 1280, height: 800 } } }, async (page) => {
    await login(page);
    await page.waitForTimeout(1500);
    for (let y = 0; y <= 900; y += 30) { await page.mouse.wheel(0, 30); await page.waitForTimeout(40); }
    await page.waitForTimeout(2500);
    const video = await page.video().path();
    fs.renameSync(video, path.join(outDir, 'raw', 'semaforo.webm'));
  });

  // --- Video: pesaje sin conexión → sincroniza (solo si se pasa OFFLINE=1) ---
  // Requiere el build de escritorio en modo headless con DATABASE_URL a un Postgres
  // en Docker (ver convert.sh). Entre pasos se apaga/enciende el contenedor.
  if (process.env.OFFLINE === '1') {
    const { execSync } = require('child_process');
    await withContext(browser, { ...desktop, recordVideo: { dir: path.join(outDir, 'raw'), size: { width: 1280, height: 800 } } }, async (page) => {
      await login(page);
      execSync('docker stop lp-pg');                                   // "sin señal"
      await page.getByRole('button', { name: 'Inventario Hato' }).click();
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: 'Peso' }).first().click();
      await page.waitForTimeout(600);
      await page.getByRole('spinbutton').first().fill('43.5');
      await page.getByRole('button', { name: /Registrar|Guardar/ }).click();
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: 'Dashboard' }).click();
      await page.getByRole('button', { name: 'SYNC CLOUD' }).click();  // → "1 cambio pendiente (sin conexión)"
      await page.waitForTimeout(2500);
      execSync('docker start lp-pg');
      await page.waitForTimeout(3000);
      await page.getByRole('button', { name: 'SYNC CLOUD' }).click();  // → "Todo sincronizado"
      await page.waitForTimeout(3000);
      const video = await page.video().path();
      fs.renameSync(video, path.join(outDir, 'raw', 'hero.webm'));
    });
  }

  await browser.close();
  console.log('media grabada en', outDir);
})();
```

(Before running, open the Inventory page once by hand and confirm the weight modal's number input and confirm-button label; adjust the two selectors `getByRole('spinbutton')` and `/Registrar|Guardar/` if they differ.)

- [ ] **Step 2: Write `convert.sh`**

```bash
#!/bin/bash
# scratch/landing_media/convert.sh <outdir>
# WebM crudo → MP4 H.264 ligero sin audio + póster JPG. Recorta a 10 s como máximo.
set -euo pipefail
OUT="$1"
for name in hero semaforo; do
  src="$OUT/raw/$name.webm"
  [ -f "$src" ] || { echo "falta $src (hero requiere OFFLINE=1)"; continue; }
  ffmpeg -y -loglevel error -i "$src" -t 10 -an -vf "scale=1280:-2,fps=30" \
    -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart "$OUT/$name.mp4"
  ffmpeg -y -loglevel error -ss 2 -i "$OUT/$name.mp4" -frames:v 1 -q:v 3 "$OUT/$name.jpg"
  ls -la "$OUT/$name.mp4" | awk '{print $5, $9}'
done
rm -rf "$OUT/raw"
```

- [ ] **Step 3: Record with the demo server (Task 6 still running on 8091)**

```bash
node scratch/landing_media/record.js http://localhost:8091 admin@donpablito.com demo123 frontend/public/landing
bash scratch/landing_media/convert.sh frontend/public/landing
```
Expected: `semaforo.mp4` ≤ 2 MB, five PNGs present. Open each PNG and check it shows real data (not empty states).

- [ ] **Step 4: Record the hero (offline → sync) with the desktop build**

```bash
docker run -d --rm --name lp-pg -e POSTGRES_PASSWORD=lp -e POSTGRES_DB=sheepmaster -p 55434:5432 postgres:16
PG="postgres://postgres:lp@localhost:55434/sheepmaster?sslmode=disable"
# 1) esquema + cuenta semilla en Postgres con el build de servidor
DATABASE_URL="$PG" PORT=8092 SEED_ADMIN_PASSWORD=demo123 /tmp/lp_server & sleep 3; kill %1
# 2) escritorio headless: SQLite local + cloudDB
kill %1 2>/dev/null; rm -rf /tmp/lp_home2 && mkdir -p /tmp/lp_home2/Documents/SheepMaster
printf 'DATABASE_URL=%s\n' "$PG" > /tmp/lp_home2/Documents/SheepMaster/config.env
HOME=/tmp/lp_home2 SERVER_ONLY=true SHEEPMASTER_SYNC_INTERVAL=1h /tmp/lp_desktop > /tmp/lp_desktop.log 2>&1 &
sleep 2 && go run ./scratch/demo_data http://localhost:8080 admin@donpablito.com demo123
OFFLINE=1 node scratch/landing_media/record.js http://localhost:8080 admin@donpablito.com demo123 frontend/public/landing
bash scratch/landing_media/convert.sh frontend/public/landing
kill %1; docker stop lp-pg
```
Expected: `hero.mp4` ≤ 2 MB showing the weight being saved, the "pendiente (sin conexión)" notice, then "Todo sincronizado". (The desktop binary listens on 8080; make sure nothing else uses it.)

- [ ] **Step 5: Commit the media and the tools**

```bash
git add scratch/landing_media frontend/public/landing
git commit -m "feat(landing): real app recordings and screenshots for the landing page"
```

---

### Task 8: La landing completa

**Files:**
- Create: `frontend/src/landing/content.ts`
- Create: `frontend/src/landing/HeroBanner.tsx`
- Create: `frontend/src/landing/sections/Hero.tsx`, `Tailored.tsx`, `Features.tsx`, `About.tsx`, `Steps.tsx`, `Contact.tsx`
- Modify: `frontend/src/landing/Landing.tsx` (reemplazar la versión mínima)
- Modify: `frontend/src/services/api.ts` (añadir `SendContact`, `GetLandingConfig`)

**Interfaces:**
- Consumes: `POST /api/contact` y `GET /api/landing-config` (Task 4), media de Task 7, `getApiBaseUrl()` (existente en `api.ts`), `navigateTo` (Task 5)
- Produces:
  - `api.ts`: `export interface ContactPayload { nombre: string; rancho: string; telefono: string; correo: string; mensaje: string; quiere_demo: boolean; horario_preferido: string; website: string }`, `export const SendContact = async (p: ContactPayload): Promise<void>`, `export const GetLandingConfig = async (): Promise<{ bookingUrl: string }>`
  - `Landing` sigue siendo `React.FC<{ onLoginClick: () => void }>`

- [ ] **Step 1: API client**

Append to `frontend/src/services/api.ts`:

```ts
// --- Landing pública (sin sesión) ---
export interface ContactPayload {
  nombre: string;
  rancho: string;
  telefono: string;
  correo: string;
  mensaje: string;
  quiere_demo: boolean;
  horario_preferido: string;
  website: string; // campo trampa: siempre vacío para humanos
}

export const SendContact = async (payload: ContactPayload): Promise<void> => {
  const res = await fetch(`${getApiBaseUrl()}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = 'No se pudo enviar tu mensaje.';
    try { msg = (await res.json()).error || msg; } catch { /* sin cuerpo */ }
    throw new Error(msg);
  }
};

export const GetLandingConfig = async (): Promise<{ bookingUrl: string }> => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/landing-config`);
    if (!res.ok) return { bookingUrl: '' };
    return await res.json();
  } catch {
    return { bookingUrl: '' };
  }
};
```

- [ ] **Step 2: Content in one place**

```ts
// frontend/src/landing/content.ts
export const CONTACT_EMAIL = 'danielhrubio3@gmail.com';

export const hero = {
  eyebrow: 'Gestión ovina para el corral, no para la oficina',
  title: 'Registra en el corral sin señal.',
  titleAccent: 'Se respalda solo al llegar a casa.',
  subtitle:
    'Pesajes, tratamientos, reproducción y genealogía de tu hato ovino en tu celular y tu computadora. Hecho a la medida de cómo trabaja tu rancho.',
  primary: 'Agenda una demo',
  secondary: 'Ver cómo funciona',
};

export const tailored = {
  title: 'A la medida de tu rancho',
  subtitle: 'El mismo sistema ya trabaja con dos modelos de negocio distintos. Tú decides qué pantallas y reglas necesitas.',
  cards: [
    {
      tag: 'Engorda',
      example: 'Como en un rancho de engorda en Jalisco',
      image: '/landing/engorda.png',
      points: [
        'Sabes qué borregos ya dan el peso y la edad de venta, hoy.',
        'No gastas alimento en animales que ya deberían salir.',
        'Ocupación de corrales de un vistazo para evitar hacinamiento.',
      ],
    },
    {
      tag: 'Pie de cría',
      example: 'Como en un rancho de pie de cría',
      image: '/landing/cria.png',
      points: [
        'Padres, abuelos y método de concepción de cada animal.',
        'Alertas de destete y de pesaje a los 150 días.',
        'Diagnóstico de gestación y partos con todo el historial.',
      ],
    },
  ],
};

export const features = {
  title: 'Lo que ves cada mañana',
  items: [
    {
      title: 'Semáforo de venta',
      text: 'Rojo: ya alcanzó peso y edad, sácalo. Amarillo: prepara el transporte. Verde: sigue creciendo. Sin calculadora ni libreta.',
      video: '/landing/semaforo.mp4',
      poster: '/landing/semaforo.jpg',
    },
    {
      title: 'Agenda sanitaria con periodo de retiro',
      text: 'Cada tratamiento marca hasta cuándo el animal no puede venderse. Los recordatorios de dosis se generan solos.',
      image: '/landing/agenda.png',
    },
    {
      title: 'Árbol genealógico con fotos',
      text: 'Toca un animal y ve a sus padres y abuelos con foto. Para decidir cruzas y vender pie de cría con respaldo.',
      image: '/landing/genealogia.png',
    },
  ],
};

export const about = {
  title: 'Quiénes somos',
  line: 'Plataforma agrotech desarrollada en México para ranchos ovinos.',
  mission: {
    title: 'Misión',
    text: 'Poner en manos de los ranchos ovinos de México una herramienta que funcione donde están los animales, sin internet ni complicaciones, para que cada decisión de venta, salud y cría se tome con datos y no de memoria.',
  },
  vision: {
    title: 'Visión',
    text: 'Ser la plataforma de referencia para la ganadería ovina en Latinoamérica: un sistema que se adapta a cada rancho, crece con él y convierte la libreta del corral en la base de un negocio rentable.',
  },
  objective: {
    title: 'Objetivo',
    text: 'Que ningún borrego listo para venta se quede en el corral, que ningún tratamiento se olvide y que cada animal tenga su historia completa, desde sus abuelos hasta su último pesaje.',
  },
  values: [
    { title: 'Sencillez', text: 'Si no se entiende con guantes puestos y sol de frente, no sirve.' },
    { title: 'A la medida', text: 'Cada rancho trabaja distinto; el sistema se ajusta al rancho, no al revés.' },
    { title: 'Confiabilidad', text: 'Los datos se guardan primero en tu equipo y se respaldan solos; nunca dependes de la señal.' },
    { title: 'Cercanía', text: 'Te capacitamos en persona y respondemos cuando lo necesitas.' },
  ],
};

export const steps = {
  title: 'Cómo empezamos',
  items: [
    { n: '1', title: 'Ajustamos el sistema', text: 'Lo configuramos a la forma de trabajar de tu rancho: engorda, pie de cría o ambos.' },
    { n: '2', title: 'Pasamos tu información', text: 'Tu libreta o tu Excel entran al sistema; no empiezas de cero.' },
    { n: '3', title: 'Capacitamos a tu equipo', text: 'En menos de una hora tu gente registra desde el corral.' },
  ],
};

export const contact = {
  title: 'Platiquemos de tu rancho',
  subtitle: 'Cuéntanos cuántos animales manejas y qué te quita el sueño. Te escribimos en menos de 24 horas.',
  demoCard: {
    title: '¿Prefieres verlo en vivo?',
    text: 'Agendamos una demo de 30 minutos por videollamada, con tus preguntas y tu tipo de rancho.',
    button: 'Agenda una demo',
  },
  success: 'Recibido. Te escribimos en menos de 24 horas.',
};
```

- [ ] **Step 3: Original SVG banner**

```tsx
// frontend/src/landing/HeroBanner.tsx
import React from 'react';

// Banner de fondo original: degradado oscuro con lomas y un cielo con puntos
// sutiles. Sin imágenes de terceros. Se coloca absoluto detrás del hero.
const HeroBanner: React.FC = () => (
  <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 1440 700" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#020617" />
        <stop offset="1" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#064e3b" />
        <stop offset="1" stopColor="#022c22" />
      </linearGradient>
      <linearGradient id="hill2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#065f46" />
        <stop offset="1" stopColor="#064e3b" />
      </linearGradient>
      <radialGradient id="glow" cx="0.8" cy="0.2" r="0.5">
        <stop offset="0" stopColor="#06b6d4" stopOpacity="0.25" />
        <stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="1440" height="700" fill="url(#sky)" />
    <rect width="1440" height="700" fill="url(#glow)" />
    <g fill="#e2e8f0" opacity="0.35">
      {[80, 220, 410, 640, 900, 1120, 1330].map((x, i) => (
        <circle key={x} cx={x} cy={60 + (i * 37) % 160} r={i % 2 ? 1.2 : 1.8} />
      ))}
    </g>
    <path d="M0 520 C 240 440, 420 470, 640 500 S 1060 560, 1440 470 L1440 700 L0 700 Z" fill="url(#hill2)" opacity="0.9" />
    <path d="M0 600 C 300 540, 560 580, 820 560 S 1200 520, 1440 580 L1440 700 L0 700 Z" fill="url(#hill1)" />
  </svg>
);

export default HeroBanner;
```

- [ ] **Step 4: Sections**

```tsx
// frontend/src/landing/sections/Hero.tsx
import React from 'react';
import { PlayCircle, CalendarCheck } from 'lucide-react';
import HeroBanner from '../HeroBanner';
import { hero } from '../content';

interface Props { onDemo: () => void }

const Hero: React.FC<Props> = ({ onDemo }) => (
  <section className="relative overflow-hidden bg-slate-950 text-white">
    <HeroBanner />
    <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-28 md:grid-cols-2 md:items-center md:pt-36">
      <div>
        <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-cyan-400">{hero.eyebrow}</p>
        <h1 className="font-display text-4xl font-black leading-tight md:text-6xl">
          {hero.title} <span className="text-emerald-400">{hero.titleAccent}</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-300">{hero.subtitle}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={onDemo} className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-950/50 transition hover:bg-emerald-400 active:scale-95 cursor-pointer">
            <CalendarCheck size={18} /> {hero.primary}
          </button>
          <a href="#funciones" className="flex items-center gap-2 rounded-2xl border border-slate-700 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-slate-200 transition hover:border-slate-500">
            <PlayCircle size={18} /> {hero.secondary}
          </a>
        </div>
      </div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-2 shadow-2xl shadow-black/50 backdrop-blur">
        <video className="w-full rounded-2xl" src="/landing/hero.mp4" poster="/landing/hero.jpg" autoPlay muted loop playsInline preload="metadata" />
        <p className="px-3 py-2 text-xs text-slate-400">Pesaje registrado sin señal y sincronizado al recuperar internet. Grabación real de la app.</p>
      </div>
    </div>
  </section>
);

export default Hero;
```

```tsx
// frontend/src/landing/sections/Tailored.tsx
import React from 'react';
import { Check } from 'lucide-react';
import { tailored } from '../content';

const Tailored: React.FC = () => (
  <section className="bg-slate-50 py-20 text-slate-900">
    <div className="mx-auto max-w-6xl px-6">
      <h2 className="font-display text-3xl font-black md:text-4xl">{tailored.title}</h2>
      <p className="mt-3 max-w-2xl text-slate-600">{tailored.subtitle}</p>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {tailored.cards.map((c) => (
          <article key={c.tag} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <img src={c.image} alt={`Pantalla de SheepMaster para ${c.tag}`} loading="lazy" className="aspect-[16/10] w-full object-cover object-top" />
            <div className="p-6">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700">{c.tag}</span>
              <p className="mt-3 text-sm font-semibold text-slate-500">{c.example}</p>
              <ul className="mt-4 space-y-2">
                {c.points.map((p) => (
                  <li key={p} className="flex gap-2 text-slate-700"><Check size={18} className="mt-0.5 shrink-0 text-emerald-500" /> {p}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default Tailored;
```

```tsx
// frontend/src/landing/sections/Features.tsx
import React from 'react';
import { features } from '../content';

const Features: React.FC = () => (
  <section id="funciones" className="bg-white py-20 text-slate-900">
    <div className="mx-auto max-w-6xl px-6">
      <h2 className="font-display text-3xl font-black md:text-4xl">{features.title}</h2>
      <div className="mt-12 space-y-16">
        {features.items.map((f, i) => (
          <div key={f.title} className={`grid items-center gap-8 md:grid-cols-2 ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}>
            <div>
              <h3 className="font-display text-2xl font-black">{f.title}</h3>
              <p className="mt-3 text-slate-600">{f.text}</p>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-lg">
              {'video' in f && f.video ? (
                <video className="w-full" src={f.video} poster={f.poster} autoPlay muted loop playsInline preload="metadata" />
              ) : (
                <img src={f.image} alt={f.title} loading="lazy" className="w-full" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
```

```tsx
// frontend/src/landing/sections/About.tsx
import React from 'react';
import { about } from '../content';

const About: React.FC = () => (
  <section className="bg-slate-950 py-20 text-white">
    <div className="mx-auto max-w-6xl px-6">
      <h2 className="font-display text-3xl font-black md:text-4xl">{about.title}</h2>
      <p className="mt-2 text-sm font-bold uppercase tracking-widest text-cyan-400">{about.line}</p>
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {[about.mission, about.vision, about.objective].map((b) => (
          <div key={b.title} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="font-display text-xl font-black text-emerald-400">{b.title}</h3>
            <p className="mt-3 text-slate-300">{b.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {about.values.map((v) => (
          <div key={v.title} className="rounded-2xl border border-slate-800 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Valor</p>
            <h4 className="mt-1 font-display text-lg font-black">{v.title}</h4>
            <p className="mt-2 text-sm text-slate-300">{v.text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default About;
```

```tsx
// frontend/src/landing/sections/Steps.tsx
import React from 'react';
import { steps } from '../content';

const Steps: React.FC = () => (
  <section className="bg-slate-50 py-20 text-slate-900">
    <div className="mx-auto max-w-6xl px-6">
      <h2 className="font-display text-3xl font-black md:text-4xl">{steps.title}</h2>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.items.map((s) => (
          <li key={s.n} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-display text-lg font-black text-white">{s.n}</span>
            <h3 className="mt-4 font-display text-xl font-black">{s.title}</h3>
            <p className="mt-2 text-slate-600">{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default Steps;
```

```tsx
// frontend/src/landing/sections/Contact.tsx
import React, { useEffect, useRef, useState } from 'react';
import { CalendarCheck, Send } from 'lucide-react';
import { SendContact, GetLandingConfig } from '../../services/api';
import { contact } from '../content';

export interface ContactHandle { requestDemo: () => void }

const inputClass = 'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200';

const Contact = React.forwardRef<ContactHandle>((_, ref) => {
  const [form, setForm] = useState({ nombre: '', rancho: '', telefono: '', correo: '', mensaje: '', quiere_demo: false, horario_preferido: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const horarioRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => { GetLandingConfig().then((c) => setBookingUrl(c.bookingUrl || '')); }, []);

  React.useImperativeHandle(ref, () => ({
    requestDemo: () => {
      if (bookingUrl) { window.open(bookingUrl, '_blank', 'noopener'); return; }
      setForm((f) => ({ ...f, quiere_demo: true }));
      sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => horarioRef.current?.focus(), 500);
    },
  }), [bookingUrl]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending'); setError('');
    try {
      await SendContact(form);
      setStatus('ok');
    } catch (err: any) {
      setStatus('error'); setError(err?.message || 'No se pudo enviar.');
    }
  };

  return (
    <section id="contacto" ref={sectionRef} className="bg-white py-20 text-slate-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-[3fr_2fr]">
        <div>
          <h2 className="font-display text-3xl font-black md:text-4xl">{contact.title}</h2>
          <p className="mt-3 text-slate-600">{contact.subtitle}</p>
          {status === 'ok' ? (
            <p className="mt-8 rounded-2xl bg-emerald-50 p-6 font-bold text-emerald-700">{contact.success}</p>
          ) : (
            <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">Nombre<input required maxLength={120} className={inputClass} value={form.nombre} onChange={set('nombre')} /></label>
              <label className="text-sm font-bold">Rancho<input maxLength={120} className={inputClass} value={form.rancho} onChange={set('rancho')} /></label>
              <label className="text-sm font-bold">Teléfono<input maxLength={30} className={inputClass} value={form.telefono} onChange={set('telefono')} /></label>
              <label className="text-sm font-bold">Correo<input type="email" maxLength={160} className={inputClass} value={form.correo} onChange={set('correo')} /></label>
              <label className="text-sm font-bold sm:col-span-2">Mensaje<textarea maxLength={2000} rows={4} className={inputClass} value={form.mensaje} onChange={set('mensaje')} /></label>
              <label className="flex items-center gap-3 text-sm font-bold sm:col-span-2">
                <input type="checkbox" className="h-5 w-5 accent-emerald-500" checked={form.quiere_demo} onChange={set('quiere_demo')} /> Quiero una demo en vivo
              </label>
              {form.quiere_demo && (
                <label className="text-sm font-bold sm:col-span-2">Fecha y horario que te acomoda
                  <input ref={horarioRef} maxLength={200} placeholder="Ej. martes o jueves después de las 4 pm" className={inputClass} value={form.horario_preferido} onChange={set('horario_preferido')} />
                </label>
              )}
              {/* Campo trampa para bots: invisible y sin autocompletar */}
              <input tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" value={form.website} onChange={set('website')} />
              {status === 'error' && <p className="text-sm font-bold text-rose-600 sm:col-span-2">{error}</p>}
              <button type="submit" disabled={status === 'sending'} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white transition hover:bg-emerald-400 disabled:opacity-60 sm:col-span-2 cursor-pointer">
                <Send size={18} /> {status === 'sending' ? 'Enviando…' : 'Enviar'}
              </button>
            </form>
          )}
        </div>
        <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="font-display text-xl font-black">{contact.demoCard.title}</h3>
          <p className="mt-2 text-slate-600">{contact.demoCard.text}</p>
          <button onClick={() => (ref as React.RefObject<ContactHandle>)?.current?.requestDemo()} className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-emerald-400 cursor-pointer">
            <CalendarCheck size={18} /> {contact.demoCard.button}
          </button>
        </aside>
      </div>
    </section>
  );
});

export default Contact;
```

- [ ] **Step 5: Assemble `Landing.tsx`** (replace the minimal version)

```tsx
// frontend/src/landing/Landing.tsx
import React, { useRef } from 'react';
import { LogIn } from 'lucide-react';
import Hero from './sections/Hero';
import Tailored from './sections/Tailored';
import Features from './sections/Features';
import About from './sections/About';
import Steps from './sections/Steps';
import Contact, { ContactHandle } from './sections/Contact';
import { CONTACT_EMAIL } from './content';

interface LandingProps {
  onLoginClick: () => void;
}

const Landing: React.FC<LandingProps> = ({ onLoginClick }) => {
  const contactRef = useRef<ContactHandle>(null);
  const requestDemo = () => contactRef.current?.requestDemo();

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="./" className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-display text-lg font-black">Sheep<span className="text-emerald-400">Master</span></span>
          </a>
          <nav className="flex items-center gap-3">
            <button onClick={onLoginClick} className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-200 hover:text-white cursor-pointer">
              <LogIn size={16} /> <span className="hidden sm:inline">Iniciar sesión</span>
            </button>
            <button onClick={requestDemo} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-400 cursor-pointer">
              Agenda una demo
            </button>
          </nav>
        </div>
      </header>

      <Hero onDemo={requestDemo} />
      <Tailored />
      <Features />
      <About />
      <Steps />
      <Contact ref={contactRef} />

      <footer className="bg-slate-950 py-10 text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm">
          <span className="font-display font-black text-white">SheepMaster</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">{CONTACT_EMAIL}</a>
          <button onClick={onLoginClick} className="hover:text-white cursor-pointer">Iniciar sesión</button>
          <span>© {new Date().getFullYear()} SheepMaster</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
```

- [ ] **Step 6: Type-check, build, manual review**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: 0 errors.

Manual with the demo server from Task 6 (`http://localhost:8091/`, incognito): all sections render with real media; "Agenda una demo" (barra, hero y tarjeta) marca la casilla y enfoca el horario; enviar el formulario muestra "Recibido…"; en el log del servidor aparece el aviso de SMTP no configurado; `sqlite3 /tmp/lp_home/Documents/SheepMaster/sheepmaster.db "SELECT nombre, quiere_demo FROM leads"` muestra la fila. Revisar a 390 px de ancho (DevTools) que nada desborda horizontalmente.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/landing frontend/src/services/api.ts
git commit -m "feat(landing): full public landing page with contact form and demo request"
```

---

### Task 9: SEO, Open Graph e imagen de vista previa

**Files:**
- Modify: `frontend/index.html`
- Create: `frontend/public/landing/og.png` (1200×630)
- Modify: `scratch/landing_media/record.js` (añadir la captura OG)

- [ ] **Step 1: Meta tags**

Replace the `<head>` of `frontend/index.html` with:

```html
<head>
    <meta charset="UTF-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>SheepMaster · Gestión de ranchos ovinos que funciona sin internet</title>
    <meta name="description" content="Registra pesajes, tratamientos, reproducción y genealogía de tu hato ovino desde el corral, sin señal. Se respalda solo al llegar a casa. Hecho a la medida de tu rancho."/>
    <meta property="og:type" content="website"/>
    <meta property="og:title" content="SheepMaster · Registra en el corral sin señal"/>
    <meta property="og:description" content="Control de pesajes, ventas, salud y cría de tu hato ovino. Funciona sin internet y se ajusta a tu rancho."/>
    <meta property="og:image" content="/landing/og.png"/>
    <meta property="og:locale" content="es_MX"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="theme-color" content="#020617"/>
    <link rel="icon" type="image/png" href="/appicon_v2.png" />
    <link rel="apple-touch-icon" href="/appicon_v2.png" />
</head>
```

(`og:image` must be absolute for WhatsApp; the server has no domain yet, so leave the root-relative path now and switch to the full Cloud Run URL in Task 11.)

- [ ] **Step 2: OG capture**

Append to `record.js` before `await browser.close();`:

```js
  // --- Imagen Open Graph 1200x630: hero de la landing ---
  await withContext(browser, { viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 }, async (page) => {
    await page.context().clearCookies();
    await page.goto(base + '/');
    await page.evaluate(() => localStorage.removeItem('sheepmaster_seen_app'));
    await page.goto(base + '/');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, 'og.png') });
  });
```

Run: `node scratch/landing_media/record.js http://localhost:8091 admin@donpablito.com demo123 frontend/public/landing` (the other captures are regenerated too; that is fine).

- [ ] **Step 3: Build + commit**

Run: `cd frontend && npm run build` → ok.

```bash
git add frontend/index.html frontend/public/landing/og.png scratch/landing_media/record.js
git commit -m "feat(landing): SEO metadata and Open Graph preview image"
```

---

### Task 10: Documentación

**Files:**
- Modify: `docs/README.md`
- Modify: `.env.example`

- [ ] **Step 1: README**

Add a section after "🔐 Primer acceso":

```markdown
## 📣 Landing pública y contacto
La raíz del sitio (`/`) muestra una página de ventas a los visitantes nuevos; el
login vive en `/login` (quien ya usó la app en ese navegador entra directo).
El formulario de contacto guarda cada mensaje en la tabla `leads` y lo envía por
correo si el servidor tiene configurado SMTP:

| Variable | Uso |
|---|---|
| `SMTP_PASSWORD` | Contraseña de aplicación de Google (Secret Manager `sheepmaster-smtp-password`). Sin ella solo se guarda. |
| `SMTP_USER` | Cuenta remitente (por defecto `danielhrubio3@gmail.com`). |
| `CONTACT_TO` | Destinatario de los avisos (por defecto el mismo). |
| `DEMO_BOOKING_URL` | Opcional: página de reservas de Google Calendar. Si existe, "Agenda una demo" la abre; si no, marca la solicitud en el formulario. |

Para regenerar el material visual de la landing (`frontend/public/landing/`):
`scratch/demo_data` llena una base local de demostración y
`scratch/landing_media/record.js` + `convert.sh` graban y comprimen los videos y
capturas (ver comentarios de cabecera en cada archivo).
```

- [ ] **Step 2: `.env.example`**

Append:

```
# Landing pública (opcional)
SMTP_PASSWORD=
SMTP_USER=danielhrubio3@gmail.com
CONTACT_TO=danielhrubio3@gmail.com
DEMO_BOOKING_URL=
```

- [ ] **Step 3: Commit**

```bash
git add docs/README.md .env.example
git commit -m "docs: landing page, contact form variables and media regeneration"
```

---

### Task 11: Despliegue y verificación en producción

**Files:** none (verificación)

- [ ] **Step 1: Final local gate**

Run: `go test ./... && go vet . && ~/go/bin/govulncheck . && go build -tags server -o /tmp/lp_server . && go build -o /tmp/lp_desktop . && cd frontend && npx tsc --noEmit && npm run build && du -sh dist`
Expected: all green; `dist` (sin `landing/*.mp4`) por debajo de 1.5 MB de página inicial (revisa `dist/assets/*.js` + css + fuentes).

- [ ] **Step 2: Absolute OG image URL**

In `frontend/index.html` set `og:image` to `https://sheepmaster-43798205241.us-central1.run.app/landing/og.png`, rebuild, commit:

```bash
git add frontend/index.html
git commit -m "chore(landing): absolute og:image for the Cloud Run URL"
```

- [ ] **Step 3: Push and deploy** (el despliegue lo ejecuta el usuario o Claude con su autorización explícita)

```bash
git push origin main
gcloud run deploy sheepmaster --source . --region us-central1 --project master-sheep-prod \
  --allow-unauthenticated --set-secrets DATABASE_URL=sheepmaster-db-url:latest --quiet
```
(No se configura `SMTP_PASSWORD` todavía: el usuario la generará después; hasta entonces los contactos quedan en `leads`.)

- [ ] **Step 4: Verify in production**

1. `curl -sI https://sheepmaster-43798205241.us-central1.run.app/ | grep -i content-security` → CSP presente.
2. Ventana de incógnito → `/` muestra la landing con videos reproduciéndose (CSP `'self'` los permite); consola sin "Refused to load".
3. "Iniciar sesión" → `/login` sin recarga; entrar con una cuenta real → panel; cerrar sesión → login (sin landing); `/login` directo → login.
4. Enviar el formulario con `quiere_demo` marcado → "Recibido…". Confirmar la fila con la herramienta local de consulta (`PGURL` de `~/Documents/SheepMaster/config.env`): `SELECT nombre, quiere_demo, notified_at FROM leads ORDER BY created_at DESC LIMIT 1` → fila presente, `notified_at` NULL (sin SMTP aún).
5. Compartir la URL en un chat de WhatsApp contigo mismo → la vista previa muestra `og.png` y el título.
6. Lighthouse móvil (DevTools) sobre `/`: Performance ≥ 80, Accessibility ≥ 90; corregir contraste o etiquetas si baja.

- [ ] **Step 5: Bitácora**

Añadir a la bitácora del día en el vault (`Bitacora/<fecha>.md`) el resumen: qué se desplegó, revisión de Cloud Run, pendientes (`SMTP_PASSWORD`, `DEMO_BOOKING_URL`, dominio, foto real de rancho, registro de marca en MARCANET).

---

## Self-review

- **Spec coverage.** §2 enrutado → Task 5. §3 estructura (8 secciones) → Task 8 (barra, hero, a la medida, funciones, quiénes somos, cómo empezamos, contacto, pie). §4 identidad (paleta, banner SVG original, marca, OG) → Tasks 8 y 9. §5 formulario (validación, límite por IP, `leads` primero, correo después en goroutine, variables, respuesta) → Tasks 1-4. §6 demo por correo + `landing-config` opcional → Tasks 4 y 8 (`requestDemo`). §7 material visual (datos demo, grabación, ffmpeg, ubicación) → Tasks 6-7. §8 textos de misión/visión/valores → `content.ts` en Task 8. §9 fuera de alcance respetado. §10 pruebas y verificación → Tasks 1-4 (unitarias), 5 y 8 (manual), 11 (producción, Lighthouse).
- **Placeholders.** Ninguno; los dos puntos marcados "confirmar antes de correr" (llaves JSON de `confirm-ultrasound`, selectores del modal de peso) son verificaciones contra código existente, no trabajo pendiente.
- **Consistencia de tipos.** `ContactRequest` (Go) ↔ `ContactPayload` (TS) comparten llaves `nombre, rancho, telefono, correo, mensaje, quiere_demo, horario_preferido, website`. `attemptLimiter.record` reemplaza a `recordFailure` en `handleLogin` (Task 3). `fakeMailer` se define una sola vez (`mailer_test.go`) y la usa `contact_test.go` (mismo paquete). `Landing` conserva la prop `onLoginClick` entre Task 5 y Task 8. Nombres de archivos de media idénticos entre Task 7 (producción) y `content.ts` (consumo).
