package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSecurityHeadersAreSetOnEveryResponse(t *testing.T) {
	h := securityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) }))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/health", nil))
	for header, want := range map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":        "DENY",
		"Referrer-Policy":        "strict-origin-when-cross-origin",
	} {
		if got := rec.Header().Get(header); got != want {
			t.Errorf("%s = %q, want %q", header, got, want)
		}
	}
	csp := rec.Header().Get("Content-Security-Policy")
	if csp == "" || !contains(csp, "frame-ancestors 'none'") || !contains(csp, "script-src 'self'") {
		t.Errorf("CSP missing or too weak: %q", csp)
	}
	if rec.Header().Get("Strict-Transport-Security") != "" {
		t.Error("HSTS must not be sent on a plain HTTP request")
	}

	rec = httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	h.ServeHTTP(rec, req)
	if got := rec.Header().Get("Strict-Transport-Security"); got == "" {
		t.Error("HSTS must be sent when the proxy reports https")
	}
}

func contains(s, sub string) bool {
	return len(sub) == 0 || (len(s) >= len(sub) && indexOf(s, sub) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
