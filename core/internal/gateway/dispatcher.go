package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/crom/crom-cloud/core/internal/auth"
	"github.com/crom/crom-cloud/core/internal/billing"
	"github.com/crom/crom-cloud/core/internal/models"
	"github.com/crom/crom-cloud/core/internal/server"
	"github.com/crom/crom-cloud/core/internal/vault"
	pb "github.com/crom/crom-cloud/core/proto"
)

// Dispatcher encaminha requisições HTTP para os plugins via gRPC.
type Dispatcher struct {
	Manager *PluginManager
	Vault   *vault.SecretStore   // Cofre de secrets para injeção nos plugins
	Credits *billing.CreditStore // Sistema de créditos para billing
	Health  *HealthMonitor       // Monitor de saúde dos plugins
	Store   *models.PluginStore  // Store de plugins no DB
	DevStore *models.DeveloperStore
}

// NewDispatcher cria um novo dispatcher com todas as dependências.
func NewDispatcher(manager *PluginManager, vaultStore *vault.SecretStore, creditStore *billing.CreditStore, healthMonitor *HealthMonitor, store *models.PluginStore, devStore *models.DeveloperStore) *Dispatcher {
	return &Dispatcher{
		Manager:  manager,
		Vault:    vaultStore,
		Credits:  creditStore,
		Health:   healthMonitor,
		Store:    store,
		DevStore: devStore,
	}
}

// NewSystemDispatcher cria um dispatcher leve apenas para rotas de sistema (sem billing/vault).
func NewSystemDispatcher(manager *PluginManager) *Dispatcher {
	return &Dispatcher{Manager: manager}
}

// RegisterRoutes registra as rotas dinâmicas de plugin no router.
func (d *Dispatcher) RegisterRoutes(r chi.Router) {
	// Rota catch-all para plugins: /v1/{slug}/{action...}
	r.HandleFunc("/v1/{slug}/*", d.HandlePluginRequest)
	r.HandleFunc("/v1/{slug}", d.HandlePluginRequest)
}

// HandlePluginRequest recebe uma requisição HTTP e despacha para o plugin correto.
// Pipeline completo: Auth → Permission → Billing → Dispatch → Usage Log
func (d *Dispatcher) HandlePluginRequest(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	requestID := "req_" + uuid.New().String()[:8]

	// Extrair slug e action do path
	slug := chi.URLParam(r, "slug")
	action := chi.URLParam(r, "*")
	if action == "" {
		action = "index"
	}

	// Buscar plugin
	plugin, ok := d.Manager.GetPlugin(slug)
	if !ok {
		server.WriteError(w, http.StatusNotFound, "PLUGIN_NOT_FOUND",
			"Plugin '"+slug+"' não encontrado ou não está ativo")
		return
	}

	// Verificar se plugin está em manutenção
	if plugin.Manifest.Status == "maintenance" {
		server.WriteError(w, http.StatusServiceUnavailable, "PLUGIN_UNAVAILABLE",
			"Plugin '"+slug+"' está em manutenção")
		return
	}

	// Verificar se plugin está marcado como unavailable pelo health monitor
	if d.Health != nil && !d.Health.IsAvailable(slug) {
		server.WriteError(w, http.StatusServiceUnavailable, "PLUGIN_UNAVAILABLE",
			"Plugin '"+slug+"' não está respondendo (health check falhou)")
		return
	}

	// === Extrair AuthContext (injetado pelo APIKeyMiddleware) ===
	authCtx := auth.GetAuthContext(r)
	developerID := ""
	var devUUID uuid.UUID
	var keyUUID uuid.UUID
	if authCtx != nil {
		developerID = authCtx.DeveloperID.String()
		devUUID = authCtx.DeveloperID
		keyUUID = authCtx.KeyID

		// === Verificar permissão ===
		if !auth.HasPermission(authCtx.Permissions, slug, "read") {
			server.WriteError(w, http.StatusForbidden, "FORBIDDEN",
				fmt.Sprintf("API Key não tem permissão para o plugin '%s'", slug))
			return
		}

		// === Verificar se o plugin está habilitado para o Workspace ===
		if d.DevStore != nil {
			enabledSlugs, err := d.DevStore.ListEnabledPlugins(r.Context(), devUUID)
			if err != nil {
				slog.Error("erro ao checar plugins habilitados", "developer", devUUID, "error", err)
				server.WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Erro ao verificar acesso ao plugin")
				return
			}

			isEnabled := false
			for _, s := range enabledSlugs {
				if s == slug {
					isEnabled = true
					break
				}
			}

			if !isEnabled {
				server.WriteError(w, http.StatusForbidden, "PLUGIN_NOT_ENABLED",
					"Este plugin não está habilitado no seu Workspace. Habilite-o na página do plugin.")
				return
			}
		}
	}

	// === Determinar custo da operação ===
	creditCost := float64(plugin.Manifest.Billing.CreditCost)
	if premiumCost, exists := plugin.Manifest.Billing.PremiumActions[action]; exists {
		creditCost = float64(premiumCost)
	}

	// === Debitar créditos ANTES do despacho (transação atômica) ===
	if d.Credits != nil && authCtx != nil && creditCost > 0 {
		description := fmt.Sprintf("%s: %s", slug, action)
		if err := d.Credits.DebitCredits(r.Context(), devUUID, creditCost, slug, description); err != nil {
			if strings.Contains(err.Error(), "INSUFFICIENT_CREDITS") {
				balance, _ := d.Credits.GetBalance(r.Context(), devUUID)
				server.WriteJSON(w, http.StatusPaymentRequired, server.APIResponse{
					Success: false,
					Error: &server.APIError{
						Code:    "INSUFFICIENT_CREDITS",
						Message: fmt.Sprintf("Saldo insuficiente. Necessário: %.0f. Saldo atual: %.2f", creditCost, balance),
						Plugin:  slug,
					},
					Meta: &server.ResponseMeta{
						Plugin:           slug,
						CreditsRemaining: int(balance),
						RequestID:        requestID,
					},
				})
				return
			}
			slog.Error("erro ao debitar créditos", "developer_id", developerID, "error", err)
			server.WriteError(w, http.StatusInternalServerError, "BILLING_ERROR", "Erro ao processar billing")
			return
		}
	}

	// === Injetar secrets do Vault ===
	secrets := make(map[string]string)
	if d.Vault != nil && authCtx != nil {
		var err error
		secrets, err = d.Vault.GetSecretsForPlugin(r.Context(), devUUID, slug)
		if err != nil {
			slog.Warn("erro ao carregar secrets para plugin", "slug", slug, "developer_id", developerID, "error", err)
			// Não bloqueia — plugin pode funcionar sem secrets
			secrets = make(map[string]string)
		}
	}

	// Ler body
	var payload []byte
	if r.Body != nil {
		payload, _ = io.ReadAll(r.Body)
	}

	// Coletar query params
	queryParams := make(map[string]string)
	for k, v := range r.URL.Query() {
		if len(v) > 0 {
			queryParams[k] = v[0]
		}
	}

	// Extrair restrições granulares da API Key
	permissionsMetadata := make(map[string]string)
	if authCtx != nil {
		for _, p := range authCtx.Permissions {
			if p.PluginSlug == slug || p.PluginSlug == "*" {
				if p.ResourceID != nil {
					// Guardar recursos permitidos mapeados pelo scope (read, write)
					if existing := permissionsMetadata[p.Scope]; existing != "" {
						permissionsMetadata[p.Scope] = existing + "," + *p.ResourceID
					} else {
						permissionsMetadata[p.Scope] = *p.ResourceID
					}
				}
			}
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Roteamento para UI (Apenas leitura/renderização de interface)
	if strings.HasPrefix(action, "ui/") || action == "ui" {
		uiReq := &pb.UIRequest{
			Path:        strings.TrimPrefix(action, "ui/"),
			DeveloperId: developerID,
		}
		uiResp, err := plugin.Service.GetUI(ctx, uiReq)
		if err != nil {
			slog.Error("erro ao chamar GetUI do plugin", "slug", slug, "error", err)
			server.WriteError(w, http.StatusBadGateway, "UI_ERROR", "Erro ao carregar interface do plugin: "+err.Error())
			return
		}
		if uiResp.StatusCode != 0 && uiResp.StatusCode >= 400 {
			server.WriteError(w, int(uiResp.StatusCode), "UI_NOT_FOUND", "Página/Schema não encontrado no plugin")
			return
		}
		
		w.Header().Set("Content-Type", uiResp.ContentType)
		w.WriteHeader(http.StatusOK)
		w.Write(uiResp.Content)
		return
	}

	// Montar ActionRequest com TODOS os campos preenchidos
	req := &pb.ActionRequest{
		Action:              action,
		Method:              r.Method,
		Payload:             payload,
		Headers:             extractHeaders(r),
		Secrets:             secrets,
		DeveloperId:         developerID,
		QueryParams:         queryParams,
		PermissionsMetadata: permissionsMetadata,
	}

	// Chamar plugin via gRPC

	resp, err := plugin.Service.ExecuteAction(ctx, req)
	if err != nil {
		slog.Error("erro ao chamar plugin", "slug", slug, "action", action, "error", err)

		// === Reembolso automático em caso de falha de comunicação ===
		if d.Credits != nil && authCtx != nil && creditCost > 0 {
			refundErr := d.Credits.RefundCredits(r.Context(), devUUID, creditCost, slug,
				fmt.Sprintf("Reembolso: falha de comunicação com plugin %s", slug))
			if refundErr != nil {
				slog.Error("falha ao reembolsar créditos", "developer_id", developerID, "error", refundErr)
			} else {
				slog.Info("créditos reembolsados (falha gRPC)", "developer_id", developerID, "amount", creditCost)
			}
		}

		server.WriteError(w, http.StatusBadGateway, "PLUGIN_ERROR",
			"Erro ao comunicar com o plugin: "+err.Error())
		return
	}

	latency := time.Since(start).Milliseconds()

	// === Reembolso automático em erro 5xx do plugin ===
	creditsRefunded := false
	if resp.StatusCode >= 500 && d.Credits != nil && authCtx != nil && creditCost > 0 {
		refundErr := d.Credits.RefundCredits(r.Context(), devUUID, creditCost, slug,
			fmt.Sprintf("Reembolso: plugin %s retornou erro %d", slug, resp.StatusCode))
		if refundErr != nil {
			slog.Error("falha ao reembolsar créditos (5xx)", "developer_id", developerID, "error", refundErr)
		} else {
			creditsRefunded = true
			slog.Info("créditos reembolsados (5xx)", "developer_id", developerID, "amount", creditCost, "plugin_status", resp.StatusCode)
		}
	}

	// === Registrar no usage_log ===
	if d.Credits != nil && authCtx != nil {
		go d.Credits.LogUsage(
			context.Background(), devUUID, keyUUID,
			slug, action, r.Method, requestID,
			int(resp.StatusCode), creditCost, int(latency),
		)
	}

	// === Obter saldo atualizado para o meta ===
	var creditsRemaining int
	if d.Credits != nil && authCtx != nil {
		balance, _ := d.Credits.GetBalance(r.Context(), devUUID)
		creditsRemaining = int(balance)
	}

	// Montar resposta
	if resp.ErrorMessage != "" {
		server.WriteJSON(w, int(resp.StatusCode), server.APIResponse{
			Success: false,
			Error: &server.APIError{
				Code:    "PLUGIN_ERROR",
				Message: resp.ErrorMessage,
				Plugin:  slug,
			},
			Meta: &server.ResponseMeta{
				Plugin:           slug,
				CreditsConsumed:  int(creditCost),
				CreditsRemaining: creditsRemaining,
				RequestID:        requestID,
				LatencyMs:        latency,
			},
		})
		return
	}

	// Parse data do plugin
	var data interface{}
	if len(resp.Data) > 0 {
		json.Unmarshal(resp.Data, &data)
	}

	// Montar meta com informações de billing
	meta := &server.ResponseMeta{
		Plugin:           slug,
		CreditsConsumed:  int(creditCost),
		CreditsRemaining: creditsRemaining,
		RequestID:        requestID,
		LatencyMs:        latency,
	}

	responseData := map[string]interface{}{
		"result": data,
	}
	if creditsRefunded {
		responseData["credits_refunded"] = true
	}

	// Se não houve refund, retornar data diretamente
	if !creditsRefunded {
		server.WriteJSON(w, int(resp.StatusCode), server.APIResponse{
			Success: true,
			Data:    data,
			Meta:    meta,
		})
		return
	}

	// Se houve refund, incluir flag
	server.WriteJSON(w, int(resp.StatusCode), server.APIResponse{
		Success: true,
		Data:    responseData,
		Meta:    meta,
	})
}

// HandleListPlugins retorna a lista de plugins ativos.
func (d *Dispatcher) HandleListPlugins(w http.ResponseWriter, r *http.Request) {
	manifests := d.Manager.ListPlugins()

	type PluginInfo struct {
		Slug            string       `json:"slug"`
		Name            string       `json:"name"`
		Version         string       `json:"version"`
		Description     string       `json:"description"`
		Icon            string       `json:"icon"`
		Status          string       `json:"status"`
		UIType          string       `json:"ui_type"`
		CreditCost      int          `json:"credit_cost"`
		RequiredSecrets []SecretSpec `json:"required_secrets"`
		Documentation   PluginDoc    `json:"documentation"`
		Routes          []RouteSpec  `json:"routes"`
	}

	var list []PluginInfo
	for _, m := range manifests {
		list = append(list, PluginInfo{
			Slug:            m.Slug,
			Name:            m.Name,
			Version:         m.Version,
			Description:     m.Description,
			Icon:            m.Icon,
			Status:          m.Status,
			UIType:          m.UIType,
			CreditCost:      m.Billing.CreditCost,
			RequiredSecrets: m.RequiredSecrets,
			Documentation:   m.Documentation,
			Routes:          m.APIRoutes,
		})
	}

	server.WriteSuccess(w, list)
}

// extractHeaders extrai headers relevantes da requisição HTTP.
func extractHeaders(r *http.Request) map[string]string {
	headers := make(map[string]string)
	for _, key := range []string{"Content-Type", "Accept", "User-Agent", "X-Request-ID"} {
		if v := r.Header.Get(key); v != "" {
			headers[key] = v
		}
	}
	return headers
}
