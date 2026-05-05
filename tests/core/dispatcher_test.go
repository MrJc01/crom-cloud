package core_test

import (
	"net/http"
	"testing"
)

// =============================================================================
// TESTES: HTTP Dispatcher (Router Dinâmico)
// =============================================================================

// TestRouteExtraction verifica extração de slug e action da URL
func TestRouteExtraction(t *testing.T) {
	tests := []struct {
		name       string
		path       string
		wantSlug   string
		wantAction string
		wantErr    bool
	}{
		{
			name:       "rota simples",
			path:       "/v1/dns/zones",
			wantSlug:   "dns",
			wantAction: "zones",
		},
		{
			name:       "rota com sub-path",
			path:       "/v1/ai/generate",
			wantSlug:   "ai",
			wantAction: "generate",
		},
		{
			name:       "rota de sistema (account)",
			path:       "/v1/account/credits",
			wantSlug:   "account",
			wantAction: "credits",
		},
		{
			name:    "rota inválida (só /v1/)",
			path:    "/v1/",
			wantErr: true,
		},
		{
			name:    "rota sem versão",
			path:    "/dns/zones",
			wantErr: true,
		},
		{
			name:       "rota com path longo",
			path:       "/v1/storage/buckets/my-bucket/files",
			wantSlug:   "storage",
			wantAction: "buckets/my-bucket/files",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			slug, action, err := extractRoute(tt.path)
			if tt.wantErr {
				if err == nil {
					t.Error("esperava erro, mas não ocorreu")
				}
				return
			}
			if err != nil {
				t.Fatalf("erro inesperado: %v", err)
			}
			if slug != tt.wantSlug {
				t.Errorf("slug = %q, want %q", slug, tt.wantSlug)
			}
			if action != tt.wantAction {
				t.Errorf("action = %q, want %q", action, tt.wantAction)
			}
		})
	}
}

// TestHTTPMethodMapping verifica mapeamento de métodos HTTP para scopes
func TestHTTPMethodMapping(t *testing.T) {
	tests := []struct {
		method    string
		wantScope string
	}{
		{"GET", "read"},
		{"HEAD", "read"},
		{"OPTIONS", "read"},
		{"POST", "write"},
		{"PUT", "write"},
		{"PATCH", "write"},
		{"DELETE", "admin"},
	}

	for _, tt := range tests {
		t.Run(tt.method, func(t *testing.T) {
			scope := methodToScope(tt.method)
			if scope != tt.wantScope {
				t.Errorf("scope de %s = %q, want %q", tt.method, scope, tt.wantScope)
			}
		})
	}
}

// TestStandardResponseFormat verifica formato padrão de resposta
func TestStandardResponseFormat(t *testing.T) {
	// Resposta de sucesso
	resp := StandardResponse{
		Success: true,
		Data:    map[string]string{"message": "ok"},
		Meta: ResponseMeta{
			Plugin:           "dns",
			CreditsConsumed:  1,
			CreditsRemaining: 99,
			RequestID:        "req_123",
			LatencyMs:        45,
		},
	}

	if !resp.Success {
		t.Error("success deveria ser true")
	}
	if resp.Meta.Plugin != "dns" {
		t.Errorf("plugin = %q, want %q", resp.Meta.Plugin, "dns")
	}
	if resp.Meta.RequestID == "" {
		t.Error("request_id não pode ser vazio")
	}

	// Resposta de erro
	errResp := StandardResponse{
		Success: false,
		Error: &ResponseError{
			Code:    "INSUFFICIENT_CREDITS",
			Message: "Saldo insuficiente",
			Plugin:  "ai",
		},
		Meta: ResponseMeta{
			CreditsRemaining: 12,
			RequestID:        "req_456",
		},
	}

	if errResp.Success {
		t.Error("success deveria ser false para erro")
	}
	if errResp.Error == nil {
		t.Error("error não pode ser nil em resposta de erro")
	}
	if errResp.Error.Code != "INSUFFICIENT_CREDITS" {
		t.Errorf("error.code = %q, want %q", errResp.Error.Code, "INSUFFICIENT_CREDITS")
	}
}

// TestStatusCodeMapping verifica mapeamento de erros para HTTP status
func TestStatusCodeMapping(t *testing.T) {
	tests := []struct {
		errorCode  string
		wantStatus int
	}{
		{"UNAUTHORIZED", http.StatusUnauthorized},
		{"FORBIDDEN", http.StatusForbidden},
		{"INSUFFICIENT_CREDITS", http.StatusPaymentRequired},
		{"PLUGIN_NOT_FOUND", http.StatusNotFound},
		{"RATE_LIMITED", http.StatusTooManyRequests},
		{"INTERNAL_ERROR", http.StatusInternalServerError},
		{"PLUGIN_ERROR", http.StatusBadGateway},
		{"PLUGIN_UNAVAILABLE", http.StatusServiceUnavailable},
		{"UNKNOWN_CODE", http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.errorCode, func(t *testing.T) {
			status := errorCodeToStatus(tt.errorCode)
			if status != tt.wantStatus {
				t.Errorf("status de %q = %d, want %d", tt.errorCode, status, tt.wantStatus)
			}
		})
	}
}

// =============================================================================
// HELPERS
// =============================================================================

type StandardResponse struct {
	Success bool           `json:"success"`
	Data    interface{}    `json:"data,omitempty"`
	Error   *ResponseError `json:"error,omitempty"`
	Meta    ResponseMeta   `json:"meta"`
}

type ResponseError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Plugin  string `json:"plugin,omitempty"`
}

type ResponseMeta struct {
	Plugin           string `json:"plugin,omitempty"`
	CreditsConsumed  int    `json:"credits_consumed,omitempty"`
	CreditsRemaining int    `json:"credits_remaining"`
	RequestID        string `json:"request_id"`
	LatencyMs        int    `json:"latency_ms,omitempty"`
}

func extractRoute(path string) (string, string, error) {
	// Espera formato: /v1/{slug}/{action...}
	if len(path) < 5 || path[:4] != "/v1/" {
		return "", "", &ValidationError{"rota deve começar com /v1/"}
	}

	rest := path[4:] // Remove /v1/
	if rest == "" {
		return "", "", &ValidationError{"slug é obrigatório"}
	}

	// Encontra o primeiro / após o slug
	slashIdx := -1
	for i, c := range rest {
		if c == '/' {
			slashIdx = i
			break
		}
	}

	if slashIdx == -1 {
		return "", "", &ValidationError{"action é obrigatória"}
	}

	slug := rest[:slashIdx]
	action := rest[slashIdx+1:]

	if slug == "" || action == "" {
		return "", "", &ValidationError{"slug e action são obrigatórios"}
	}

	return slug, action, nil
}

func methodToScope(method string) string {
	switch method {
	case "GET", "HEAD", "OPTIONS":
		return "read"
	case "POST", "PUT", "PATCH":
		return "write"
	case "DELETE":
		return "admin"
	default:
		return "read"
	}
}

func errorCodeToStatus(code string) int {
	switch code {
	case "UNAUTHORIZED":
		return http.StatusUnauthorized
	case "FORBIDDEN":
		return http.StatusForbidden
	case "INSUFFICIENT_CREDITS":
		return http.StatusPaymentRequired
	case "PLUGIN_NOT_FOUND":
		return http.StatusNotFound
	case "RATE_LIMITED":
		return http.StatusTooManyRequests
	case "PLUGIN_ERROR":
		return http.StatusBadGateway
	case "PLUGIN_UNAVAILABLE":
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}
