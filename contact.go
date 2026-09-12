package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"os"
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
