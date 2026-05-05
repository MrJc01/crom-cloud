package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/crom/crom-cloud/core/internal/models"
	"github.com/crom/crom-cloud/core/internal/server"
)

// JWTMiddleware valida JWT do dashboard e injeta AuthContext.
func JWTMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Header Authorization ausente")
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			if tokenStr == authHeader {
				server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Formato inválido. Use: Bearer <token>")
				return
			}

			claims, err := ValidateJWT(tokenStr, jwtSecret)
			if err != nil {
				server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Token inválido: "+err.Error())
				return
			}

			devID, err := uuid.Parse(claims.DeveloperID)
			if err != nil {
				server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Developer ID inválido no token")
				return
			}

			authCtx := &AuthContext{
				DeveloperID: devID,
				Permissions: []models.KeyPermission{
					{PluginSlug: "*", Scope: "admin"}, // Permissão curinga para o dashboard/playground
				},
			}

			ctx := context.WithValue(r.Context(), authContextKey, authCtx)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
