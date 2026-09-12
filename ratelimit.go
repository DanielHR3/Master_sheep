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
