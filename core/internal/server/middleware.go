package server

import (
	"net/http"
)

// SecurityHeadersMiddleware adiciona headers de segurança em todas as respostas.
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Previne clickjacking
		w.Header().Set("X-Frame-Options", "DENY")

		// Previne MIME-type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// XSS protection (legacy, mas ainda útil)
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Referrer policy restritiva
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions policy — desabilita features desnecessárias
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		// HSTS — força HTTPS (em produção)
		// Só adiciona se a requisição veio via HTTPS ou há um proxy
		if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		// CSP — permite 'self' + CDNs para TailwindCSS, Lucide, fontes
		w.Header().Set("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; "+
				"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "+
				"font-src 'self' https://fonts.gstatic.com; "+
				"img-src 'self' data:; "+
				"connect-src 'self' https://cdn.jsdelivr.net https://unpkg.com")

		next.ServeHTTP(w, r)
	})
}

// MaxBodySizeMiddleware limita o tamanho do body de requisições.
func MaxBodySizeMiddleware(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			}
			next.ServeHTTP(w, r)
		})
	}
}
