package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/crom/crom-cloud/core/internal/auth"
	"github.com/crom/crom-cloud/core/internal/models"
	"github.com/crom/crom-cloud/core/internal/server"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AccountHandler gerencia registro, login e perfil.
type AccountHandler struct {
	DevStore  *models.DeveloperStore
	JWTSecret string
}

// NewAccountHandler cria o handler de conta.
func NewAccountHandler(db *pgxpool.Pool, jwtSecret string) *AccountHandler {
	return &AccountHandler{
		DevStore:  &models.DeveloperStore{DB: db},
		JWTSecret: jwtSecret,
	}
}

// Register cria uma nova conta de desenvolvedor.
func (h *AccountHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Name     string `json:"name"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		server.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	// Sanitização de input
	email, validEmail := server.SanitizeEmail(req.Email)
	if !validEmail {
		server.WriteError(w, http.StatusBadRequest, "INVALID_EMAIL", "Formato de email inválido")
		return
	}
	name := server.SanitizeName(req.Name)
	if name == "" {
		server.WriteError(w, http.StatusBadRequest, "MISSING_FIELDS", "name é obrigatório")
		return
	}
	if len(req.Password) < 6 || len(req.Password) > 128 {
		server.WriteError(w, http.StatusBadRequest, "INVALID_PASSWORD", "Senha deve ter entre 6 e 128 caracteres")
		return
	}

	dev, err := h.DevStore.Create(r.Context(), email, name, req.Password)
	if err != nil {
		server.WriteError(w, http.StatusConflict, "REGISTRATION_FAILED", err.Error())
		return
	}

	server.WriteJSON(w, http.StatusCreated, server.APIResponse{
		Success: true,
		Data:    dev,
	})
}

// Login autentica e retorna um JWT.
func (h *AccountHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		server.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	dev, err := h.DevStore.FindByEmail(r.Context(), req.Email)
	if err != nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Email ou senha inválidos")
		return
	}

	if !dev.CheckPassword(req.Password) {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Email ou senha inválidos")
		return
	}

	token, err := auth.GenerateJWT(dev.ID, dev.Email, h.JWTSecret)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Erro ao gerar token")
		return
	}

	server.WriteSuccess(w, map[string]interface{}{
		"token":     token,
		"developer": dev,
	})
}

// Me retorna o perfil do desenvolvedor autenticado.
func (h *AccountHandler) Me(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	dev, err := h.DevStore.FindByID(r.Context(), authCtx.DeveloperID)
	if err != nil {
		server.WriteError(w, http.StatusNotFound, "NOT_FOUND", "Desenvolvedor não encontrado")
		return
	}

	server.WriteSuccess(w, dev)
}

// TogglePlugin ativa ou desativa um plugin para a conta do desenvolvedor.
func (h *AccountHandler) TogglePlugin(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	slug := chi.URLParam(r, "slug")
	if slug == "" {
		server.WriteError(w, http.StatusBadRequest, "INVALID_SLUG", "Slug do plugin não informado")
		return
	}

	var req struct {
		Action string `json:"action"` // "enable" ou "disable"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		server.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	var err error
	if req.Action == "enable" {
		err = h.DevStore.EnablePlugin(r.Context(), authCtx.DeveloperID, slug)
	} else if req.Action == "disable" {
		err = h.DevStore.DisablePlugin(r.Context(), authCtx.DeveloperID, slug)
	} else {
		server.WriteError(w, http.StatusBadRequest, "INVALID_ACTION", "Ação deve ser 'enable' ou 'disable'")
		return
	}

	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Erro ao processar ativação: "+err.Error())
		return
	}

	server.WriteSuccess(w, map[string]string{
		"slug":   slug,
		"status": req.Action + "d", // "enabled" / "disabled"
	})
}

// ListEnabledPlugins lista os plugins habilitados para a conta atual.
func (h *AccountHandler) ListEnabledPlugins(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	slugs, err := h.DevStore.ListEnabledPlugins(r.Context(), authCtx.DeveloperID)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Erro ao listar plugins")
		return
	}

	if slugs == nil {
		slugs = []string{}
	}

	server.WriteSuccess(w, map[string]interface{}{
		"enabled_plugins": slugs,
	})
}
