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
		Plugin     string `json:"plugin"`
		PluginSlug string `json:"plugin_slug"` // alias
		Key        string `json:"key"`
		SecretName string `json:"secret_name"` // alias
		Value      string `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		server.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}
	plugin := req.Plugin
	if plugin == "" {
		plugin = req.PluginSlug
	}
	key := req.Key
	if key == "" {
		key = req.SecretName
	}
	if plugin == "" || key == "" || req.Value == "" {
		server.WriteError(w, http.StatusBadRequest, "MISSING_FIELDS", "plugin, key e value são obrigatórios")
		return
	}

	if err := h.Vault.SetSecret(r.Context(), authCtx.DeveloperID, plugin, key, req.Value); err != nil {
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

// GetCredits retorna o saldo de créditos com informações detalhadas.
func (h *BillingHandler) GetCredits(w http.ResponseWriter, r *http.Request) {
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

	server.WriteSuccess(w, map[string]interface{}{
		"balance":  balance,
		"currency": "credits",
	})
}

// GetCreditHistory retorna o histórico de transações de créditos.
// Query params: ?type=debit|credit|refund&limit=50&offset=0
func (h *BillingHandler) GetCreditHistory(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	txType := r.URL.Query().Get("type")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	history, err := h.Credits.GetCreditHistory(r.Context(), authCtx.DeveloperID, txType, limit, offset)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	server.WriteSuccess(w, map[string]interface{}{
		"transactions": history,
		"limit":        limit,
		"offset":       offset,
	})
}

// GetUsage retorna os logs de uso da API.
// Query params: ?plugin=echo&from=2026-05-01&to=2026-05-05&limit=50&offset=0
func (h *BillingHandler) GetUsage(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	pluginSlug := r.URL.Query().Get("plugin")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	var from, to *time.Time
	if fromStr := r.URL.Query().Get("from"); fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = &t
		}
	}
	if toStr := r.URL.Query().Get("to"); toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			endOfDay := t.Add(24*time.Hour - time.Second)
			to = &endOfDay
		}
	}

	logs, total, err := h.Credits.GetUsageLogs(r.Context(), authCtx.DeveloperID, pluginSlug, from, to, limit, offset)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	// Calcular totais
	var totalCredits float64
	for _, l := range logs {
		totalCredits += l.CreditsCharged
	}

	server.WriteSuccess(w, map[string]interface{}{
		"logs":           logs,
		"total_records":  total,
		"total_credits":  totalCredits,
		"limit":          limit,
		"offset":         offset,
	})
}

// GetUsageSummary retorna o resumo mensal de uso agregado por plugin.
func (h *BillingHandler) GetUsageSummary(w http.ResponseWriter, r *http.Request) {
	authCtx := auth.GetAuthContext(r)
	if authCtx == nil {
		server.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Não autenticado")
		return
	}

	// Default: mês corrente
	now := time.Now()
	from := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	to := from.AddDate(0, 1, 0).Add(-time.Second)

	// Override com query params
	if fromStr := r.URL.Query().Get("from"); fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}
	if toStr := r.URL.Query().Get("to"); toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t.Add(24*time.Hour - time.Second)
		}
	}

	summary, err := h.Credits.GetUsageSummary(r.Context(), authCtx.DeveloperID, from, to)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	var totalCalls int
	var totalCredits float64
	for _, s := range summary {
		totalCalls += s.TotalCalls
		totalCredits += s.TotalCredits
	}

	server.WriteSuccess(w, map[string]interface{}{
		"period": map[string]string{
			"from": from.Format("2006-01-02"),
			"to":   to.Format("2006-01-02"),
		},
		"total_calls":   totalCalls,
		"total_credits": totalCredits,
		"by_plugin":     summary,
	})
}
