package main

import "net/http"

// contentSecurityPolicy describe lo único que el navegador puede cargar
// desde la app: todo del mismo origen. 'unsafe-inline' en estilos es
// necesario por Recharts/Tailwind (estilos en línea); img-src admite https:
// porque la foto de un animal puede ser una URL externa.
const contentSecurityPolicy = "default-src 'self'; " +
	"script-src 'self'; " +
	"style-src 'self' 'unsafe-inline'; " +
	"img-src 'self' data: blob: https:; " +
	"font-src 'self' data:; " +
	"connect-src 'self'; " +
	"worker-src 'self'; " +
	"manifest-src 'self'; " +
	"frame-ancestors 'none'; " +
	"base-uri 'self'; " +
	"form-action 'self'; " +
	"object-src 'none'"

// securityHeaders agrega las cabeceras de endurecimiento a toda respuesta
// (API y archivos estáticos). HSTS solo se manda cuando la petición llegó
// por HTTPS (directo o vía el proxy de Cloud Run), porque en el modo móvil
// local (http://IP:8080) el navegador la ignoraría o estorbaría.
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Security-Policy", contentSecurityPolicy)
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "geolocation=(), microphone=(), payment=()")
		if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		next.ServeHTTP(w, r)
	})
}
