package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/crom/crom-cloud/core/internal/models"
	"github.com/crom/crom-cloud/core/internal/server"
)

// contextKey é o tipo para chaves de contexto.
type contextKey string

const authContextKey contextKey = "auth_context"

// AuthContext contém os dados do desenvolvedor autenticado.
type AuthContext struct {
	DeveloperID uuid.UUID
	KeyID       uuid.UUID
	Permissions []models.KeyPermission
}

// GetAuthContext extrai o contexto de autenticação do request.
func GetAuthContext(r *http.Request) *AuthContext {
	ctx, ok := r.Context().Value(authContextKey).(*AuthContext)
	if !ok {
		return nil
	}
	return ctx
}

// securityLog registra eventos de segurança com contexto da requisição.
func securityLog(r *http.Request, event, detail string) {
	ip := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ip = forwarded
	}
	slog.Warn("security_event",
		"event", event,
		"detail", detail,
		"ip", ip,
		"user_agent", r.UserAgent(),
		"path", r.URL.Path,
		"method", r.Method,
		"request_id", r.Header.Get("X-Request-ID"),
	)
}

// APIKeyMiddleware valida a API Key e injeta AuthContext no request.
func APIKeyMiddleware(db *pgxpool.Pool) func(http.Handler) http.Handler {
	keyStore := &models.APIKeyStore{DB: db}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extrair token do header Authorization
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				securityLog(r, "auth_missing", "Header Authorization ausente")
				server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Header Authorization ausente")
				return
			}

			rawKey := strings.TrimPrefix(authHeader, "Bearer ")
			if rawKey == authHeader {
				securityLog(r, "auth_format_invalid", "Formato de Authorization inválido")
				server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Formato inválido. Use: Bearer <key>")
				return
			}

			// Hash SHA-256
			hashBytes := sha256.Sum256([]byte(rawKey))
			keyHash := hex.EncodeToString(hashBytes[:])

			// Buscar no banco
			key, err := keyStore.FindByHash(r.Context(), keyHash)
			if err != nil {
				securityLog(r, "auth_key_invalid", "API Key não encontrada no banco")
				server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API Key inválida")
				return
			}

			// Verificar se está ativa
			if !key.IsActive {
				securityLog(r, "auth_key_revoked", "API Key revogada: "+key.KeyPrefix+"...")
				server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API Key foi revogada")
				return
			}

			// Verificar expiração
			if key.ExpiresAt != nil && key.ExpiresAt.Before(time.Now()) {
				securityLog(r, "auth_key_expired", "API Key expirada: "+key.KeyPrefix+"...")
				server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API Key expirada")
				return
			}

			// Atualizar last_used_at (assíncrono)
			go keyStore.UpdateLastUsed(context.Background(), key.ID)

			// Injetar AuthContext
			authCtx := &AuthContext{
				DeveloperID: key.DeveloperID,
				KeyID:       key.ID,
				Permissions: key.Permissions,
			}

			ctx := context.WithValue(r.Context(), authContextKey, authCtx)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// HasPermission verifica se o AuthContext tem permissão para acessar um plugin com um scope.
func HasPermission(perms []models.KeyPermission, pluginSlug, requiredScope string) bool {
	scopeLevel := map[string]int{"read": 1, "write": 2, "admin": 3}

	requiredLevel, ok := scopeLevel[requiredScope]
	if !ok {
		requiredLevel = 1
	}

	for _, p := range perms {
		if p.PluginSlug == pluginSlug || p.PluginSlug == "*" {
			permLevel, ok := scopeLevel[p.Scope]
			if !ok {
				permLevel = 1
			}
			if permLevel >= requiredLevel {
				return true
			}
		}
	}
	return false
}
