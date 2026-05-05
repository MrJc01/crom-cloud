package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/crom/crom-cloud/core/internal/auth"
	"github.com/crom/crom-cloud/core/internal/billing"
	"github.com/crom/crom-cloud/core/internal/server"
	"github.com/crom/crom-cloud/core/internal/vault"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BillingHandler gerencia créditos e secrets.
type BillingHandler struct {
	Credits *billing.CreditStore
	Vault   *vault.SecretStore
}

// NewBillingHandler cria o handler de billing.
func NewBillingHandler(db *pgxpool.Pool, vaultStore *vault.SecretStore) *BillingHandler {
	return &BillingHandler{
		Credits: &billing.CreditStore{DB: db},
		Vault:   vaultStore,
	}
}

// GetBalance retorna o saldo de créditos.
func (h *BillingHandler) GetBalance(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	balance, err := h.Credits.GetBalance(r.Context(), authCtx.DeveloperID)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	server.WriteSuccess(w, map[string]float64{"balance": balance})
}

// AddCredits adiciona créditos ao saldo.
func (h *BillingHandler) AddCredits(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	var req struct {
		Amount float64 `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Amount <= 0 {
		server.WriteError(w, http.StatusBadRequest, "INVALID_INPUT", "amount deve ser > 0")
		return
	}

	if err := h.Credits.AddCredits(r.Context(), authCtx.DeveloperID, req.Amount, "purchase", "Compra manual"); err != nil {
		server.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	balance, _ := h.Credits.GetBalance(r.Context(), authCtx.DeveloperID)
	server.WriteSuccess(w, map[string]interface{}{"message": "Créditos adicionados", "balance": balance})
}

// SetSecret armazena um secret criptografado.
func (h *BillingHandler) SetSecret(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	var req struct {
		Plugin string `json:"plugin"`
		Key    string `json:"key"`
		Value  string `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		server.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}
	if req.Plugin == "" || req.Key == "" || req.Value == "" {
		server.WriteError(w, http.StatusBadRequest, "MISSING_FIELDS", "plugin, key e value são obrigatórios")
		return
	}

	if err := h.Vault.SetSecret(r.Context(), authCtx.DeveloperID, req.Plugin, req.Key, req.Value); err != nil {
		server.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	server.WriteSuccess(w, map[string]string{"message": "Secret armazenado com segurança"})
}

// ListSecrets lista os secrets (sem valores).
func (h *BillingHandler) ListSecrets(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	secrets, err := h.Vault.ListSecrets(r.Context(), authCtx.DeveloperID)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if secrets == nil {
		secrets = []vault.SecretInfo{}
	}

	server.WriteSuccess(w, secrets)
}

// DeleteSecret remove um secret do vault.
func (h *BillingHandler) DeleteSecret(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	pluginSlug := chi.URLParam(r, "plugin")
	secretKey := chi.URLParam(r, "key")

	if pluginSlug == "" || secretKey == "" {
		server.WriteError(w, http.StatusBadRequest, "MISSING_PARAMS", "plugin e key são obrigatórios na URL")
		return
	}

	if err := h.Vault.DeleteSecret(r.Context(), authCtx.DeveloperID, pluginSlug, secretKey); err != nil {
		server.WriteError(w, http.StatusNotFound, "NOT_FOUND", "Secret não encontrado: "+err.Error())
		return
	}

	server.WriteSuccess(w, map[string]string{"message": "Secret removido com sucesso"})
}
