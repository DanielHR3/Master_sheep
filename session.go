package main

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

// sessionTTL define cuánto dura una sesión sin actividad de login.
const sessionTTL = 24 * time.Hour

type sessionRecord struct {
	UserID    string
	ExpiresAt time.Time
}

// sessionStore mantiene las sesiones del servidor HTTP en memoria. Al ser un
// único proceso (Railway/nixpacks, sin escalado horizontal) esto evita
// depender de infraestructura extra y permite revocar sesiones al instante
// (ej. al cambiar contraseña), algo que un JWT no puede hacer sin una lista
// de revocación aparte.
type sessionStore struct {
	mu   sync.RWMutex
	data map[string]sessionRecord
}

var sessions = &sessionStore{data: make(map[string]sessionRecord)}

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
	s.mu.Lock()
	s.data[token] = sessionRecord{UserID: userID, ExpiresAt: time.Now().Add(sessionTTL)}
	s.mu.Unlock()
	return token, nil
}

// get resuelve un token a su userID, o false si no existe/expiró.
func (s *sessionStore) get(token string) (string, bool) {
	s.mu.RLock()
	rec, ok := s.data[token]
	s.mu.RUnlock()
	if !ok || time.Now().After(rec.ExpiresAt) {
		return "", false
	}
	return rec.UserID, true
}

// delete revoca un único token (logout).
func (s *sessionStore) delete(token string) {
	s.mu.Lock()
	delete(s.data, token)
	s.mu.Unlock()
}

// deleteAllForUser revoca todas las sesiones de un usuario (ej. al cambiar
// contraseña, para forzar re-login en otros dispositivos).
func (s *sessionStore) deleteAllForUser(userID string) {
	s.mu.Lock()
	for token, rec := range s.data {
		if rec.UserID == userID {
			delete(s.data, token)
		}
	}
	s.mu.Unlock()
}

// startCleanup lanza un goroutine que purga periódicamente sesiones
// expiradas, siguiendo el mismo patrón que OfflineManager.
func (s *sessionStore) startCleanup() {
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now()
			s.mu.Lock()
			for token, rec := range s.data {
				if now.After(rec.ExpiresAt) {
					delete(s.data, token)
				}
			}
			s.mu.Unlock()
		}
	}()
}
