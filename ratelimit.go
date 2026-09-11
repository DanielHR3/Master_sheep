package main

import (
	"sync"
	"time"
)

// loginLimiter aplica un bloqueo simple por email para frenar fuerza bruta
// contra /api/login. Es en memoria a propósito (a diferencia de sessions):
// una imprecisión entre instancias de Cloud Run solo relaja el límite, no
// lo rompe, y evita que un ataque de fuerza bruta también inunde la base
// de datos con una consulta por intento.
type loginLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
}

var loginAttempts = &loginLimiter{attempts: make(map[string][]time.Time)}

const (
	maxLoginAttempts = 5
	loginWindow      = 15 * time.Minute
)

// allowed indica si `email` puede intentar iniciar sesión ahora mismo.
func (l *loginLimiter) allowed(email string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	cutoff := time.Now().Add(-loginWindow)
	recent := make([]time.Time, 0, len(l.attempts[email]))
	for _, t := range l.attempts[email] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}
	l.attempts[email] = recent
	return len(recent) < maxLoginAttempts
}

// recordFailure registra un intento fallido para `email`.
func (l *loginLimiter) recordFailure(email string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.attempts[email] = append(l.attempts[email], time.Now())
}

// clear borra el historial de intentos tras un login exitoso.
func (l *loginLimiter) clear(email string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, email)
}
