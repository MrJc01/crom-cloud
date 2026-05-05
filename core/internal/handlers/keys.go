package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/crom/crom-cloud/core/internal/auth"
	"github.com/crom/crom-cloud/core/internal/models"
	"github.com/crom/crom-cloud/core/internal/server"
	"github.com/jackc/pgx/v5/pgxpool"
)

// KeysHandler gerencia CRUD de API Keys.
type KeysHandler struct {
	KeyStore *models.APIKeyStore
}

// NewKeysHandler cria o handler de API Keys.
func NewKeysHandler(db *pgxpool.Pool) *KeysHandler {
	return &KeysHandler{
		KeyStore: &models.APIKeyStore{DB: db},
	}
}

// Create gera uma nova API Key com permissões.
func (h *KeysHandler) Create(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	var req struct {
		Label       string `json:"label"`
		Permissions []struct {
			PluginSlug string `json:"plugin_slug"`
			Plugin     string `json:"plugin"` // fallback
			Scope      string `json:"scope"`
		} `json:"permissions"`
		RateLimit int `json:"rate_limit,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		server.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	if req.Label == "" {
		server.WriteError(w, http.StatusBadRequest, "MISSING_FIELDS", "label é obrigatório")
		return
	}

	var perms []models.KeyPermission
	for _, p := range req.Permissions {
		slug := p.PluginSlug
		if slug == "" {
			slug = p.Plugin // fallback
		}
		scope := p.Scope
		if scope == "" {
			scope = "read"
		}
		perms = append(perms, models.KeyPermission{
			PluginSlug: slug,
			Scope:      scope,
		})
	}

	result, err := h.KeyStore.Generate(r.Context(), authCtx.DeveloperID, req.Label, perms, nil, req.RateLimit)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	server.WriteJSON(w, http.StatusCreated, server.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"key":      result.RawKey,
			"key_info": result.Key,
			"warning":  "Guarde esta chave em local seguro. Ela não será mostrada novamente.",
		},
	})
}

// List retorna as keys do desenvolvedor autenticado.
func (h *KeysHandler) List(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	keys, err := h.KeyStore.ListByDeveloper(r.Context(), authCtx.DeveloperID)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	if keys == nil {
		keys = []models.APIKey{}
	}

	server.WriteSuccess(w, keys)
}

// Revoke desativa uma API Key.
func (h *KeysHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	keyIDStr := chi.URLParam(r, "id")
	keyID, err := uuid.Parse(keyIDStr)
	if err != nil {
		server.WriteError(w, http.StatusBadRequest, "INVALID_ID", "ID inválido")
		return
	}

	if err := h.KeyStore.Revoke(r.Context(), keyID, authCtx.DeveloperID); err != nil {
		server.WriteError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	server.WriteSuccess(w, map[string]string{"message": "Key revogada com sucesso"})
}

// Update altera as permissões (e opcionalmente o label) de uma API Key.
func (h *KeysHandler) Update(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	keyIDStr := chi.URLParam(r, "id")
	keyID, err := uuid.Parse(keyIDStr)
	if err != nil {
		server.WriteError(w, http.StatusBadRequest, "INVALID_ID", "ID inválido")
		return
	}

	var req struct {
		Label       string `json:"label,omitempty"`
		Permissions []struct {
			PluginSlug string `json:"plugin_slug"`
			Scope      string `json:"scope"`
		} `json:"permissions"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		server.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	if len(req.Permissions) == 0 {
		server.WriteError(w, http.StatusBadRequest, "MISSING_PERMISSIONS", "A key deve ter pelo menos uma permissão")
		return
	}

	var perms []models.KeyPermission
	for _, p := range req.Permissions {
		scope := p.Scope
		if scope == "" {
			scope = "read"
		}
		perms = append(perms, models.KeyPermission{
			PluginSlug: p.PluginSlug,
			Scope:      scope,
		})
	}

	if err := h.KeyStore.UpdateKey(r.Context(), keyID, authCtx.DeveloperID, req.Label, perms); err != nil {
		server.WriteError(w, http.StatusInternalServerError, "UPDATE_ERROR", err.Error())
		return
	}

	server.WriteSuccess(w, map[string]string{"message": "Key atualizada com sucesso"})
}
