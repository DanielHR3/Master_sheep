package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

// sessionTTL define cuánto dura una sesión sin actividad de login.
const sessionTTL = 24 * time.Hour

// sessionStore mantiene las sesiones del servidor HTTP en la base de datos
// (tabla `sessions`), en vez de en memoria del proceso. Esto es necesario
// porque plataformas como Cloud Run pueden atender peticiones concurrentes
// con múltiples instancias del contenedor — un mapa en memoria por proceso
// haría que el token emitido por una instancia fuera invisible para las
// demás, causando 401 aleatorios justo después de iniciar sesión.
type sessionStore struct {
	db         *sql.DB
	driverName string
}

var sessions = &sessionStore{}

// init conecta el store a la base de datos ya inicializada por initDB().
func (s *sessionStore) init(db *sql.DB, driverName string) {
	s.db = db
	s.driverName = driverName
}

// q adapta placeholders "?" a "$1, $2..." para Postgres, igual que App.q().
func (s *sessionStore) q(query string) string {
	if s.driverName != "postgres" {
		return query
	}
	parts := strings.Split(query, "?")
	if len(parts) == 1 {
		return query
	}
	var pb strings.Builder
	for i := 0; i < len(parts)-1; i++ {
		pb.WriteString(parts[i])
		pb.WriteString(fmt.Sprintf("$%d", i+1))
	}
	pb.WriteString(parts[len(parts)-1])
	return pb.String()
}

func newSessionToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// create emite un nuevo token de sesión para el usuario dado.
func (s *sessionStore) create(userID string) (string, error) {
	token, err := newSessionToken()
	if err != nil {
		return "", err
	}
	_, err = s.db.Exec(s.q("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"),
		token, userID, time.Now().Add(sessionTTL))
	if err != nil {
		return "", err
	}
	return token, nil
}

// get resuelve un token a su userID, o false si no existe/expiró.
func (s *sessionStore) get(token string) (string, bool) {
	var userID string
	var expiresAt time.Time
	err := s.db.QueryRow(s.q("SELECT user_id, expires_at FROM sessions WHERE token = ?"), token).
		Scan(&userID, &expiresAt)
	if err != nil || time.Now().After(expiresAt) {
		return "", false
	}
	return userID, true
}

// delete revoca un único token (logout).
func (s *sessionStore) delete(token string) {
	s.db.Exec(s.q("DELETE FROM sessions WHERE token = ?"), token)
}

// deleteAllForUser revoca todas las sesiones de un usuario (ej. al cambiar
// contraseña, para forzar re-login en otros dispositivos).
func (s *sessionStore) deleteAllForUser(userID string) {
	s.db.Exec(s.q("DELETE FROM sessions WHERE user_id = ?"), userID)
}

// startCleanup lanza un goroutine que purga periódicamente sesiones
// expiradas, siguiendo el mismo patrón que OfflineManager.
func (s *sessionStore) startCleanup() {
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			s.db.Exec(s.q("DELETE FROM sessions WHERE expires_at < ?"), time.Now())
		}
	}()
}
