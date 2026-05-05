package core_test

import (
	"testing"
)

// =============================================================================
// TESTES: Sistema de Créditos e Billing
// =============================================================================

// TestCreditDebit verifica débito correto de créditos
func TestCreditDebit(t *testing.T) {
	tests := []struct {
		name          string
		initialBalance float64
		cost          float64
		wantBalance   float64
		wantErr       bool
		wantErrCode   string
	}{
		{
			name:           "débito normal",
			initialBalance: 100.00,
			cost:           10.00,
			wantBalance:    90.00,
			wantErr:        false,
		},
		{
			name:           "débito exato (zera saldo)",
			initialBalance: 50.00,
			cost:           50.00,
			wantBalance:    0.00,
			wantErr:        false,
		},
		{
			name:           "saldo insuficiente",
			initialBalance: 5.00,
			cost:           10.00,
			wantBalance:    5.00,
			wantErr:        true,
			wantErrCode:    "INSUFFICIENT_CREDITS",
		},
		{
			name:           "saldo zero",
			initialBalance: 0.00,
			cost:           1.00,
			wantBalance:    0.00,
			wantErr:        true,
			wantErrCode:    "INSUFFICIENT_CREDITS",
		},
		{
			name:           "custo zero (plugin gratuito)",
			initialBalance: 100.00,
			cost:           0.00,
			wantBalance:    100.00,
			wantErr:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			balance := tt.initialBalance
			err := debitCredits(&balance, tt.cost)

			if tt.wantErr && err == nil {
				t.Error("esperava erro, mas não ocorreu")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("erro inesperado: %v", err)
			}
			if balance != tt.wantBalance {
				t.Errorf("saldo = %.2f, want %.2f", balance, tt.wantBalance)
			}
		})
	}
}

// TestCreditRefund verifica reembolso em caso de erro do plugin
func TestCreditRefund(t *testing.T) {
	tests := []struct {
		name           string
		balance        float64
		refundAmount   float64
		wantBalance    float64
	}{
		{
			name:         "reembolso normal",
			balance:      90.00,
			refundAmount: 10.00,
			wantBalance:  100.00,
		},
		{
			name:         "reembolso com saldo zero",
			balance:      0.00,
			refundAmount: 50.00,
			wantBalance:  50.00,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			balance := tt.balance
			refundCredits(&balance, tt.refundAmount)

			if balance != tt.wantBalance {
				t.Errorf("saldo após reembolso = %.2f, want %.2f", balance, tt.wantBalance)
			}
		})
	}
}

// TestPricingFromManifest verifica leitura de custos do manifest
func TestPricingFromManifest(t *testing.T) {
	manifest := ManifestBilling{
		Model:      "per_call",
		CreditCost: 50,
		PremiumActions: map[string]int{
			"generate_image": 200,
			"fine_tune":      1000,
		},
	}

	tests := []struct {
		name     string
		action   string
		wantCost int
	}{
		{"ação padrão", "generate", 50},
		{"ação premium", "generate_image", 200},
		{"ação premium cara", "fine_tune", 1000},
		{"ação desconhecida (usa padrão)", "unknown_action", 50},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cost := getActionCost(manifest, tt.action)
			if cost != tt.wantCost {
				t.Errorf("custo de %q = %d, want %d", tt.action, cost, tt.wantCost)
			}
		})
	}
}

// TestUsageLogCreation verifica criação de log de uso
func TestUsageLogCreation(t *testing.T) {
	log := UsageLog{
		PluginSlug:      "ai-proxy",
		Action:          "generate",
		CreditsConsumed: 50,
		ResponseStatus:  200,
		ResponseTimeMs:  342,
		RequestID:       "req_abc123",
	}

	if log.PluginSlug == "" {
		t.Error("plugin_slug não pode ser vazio")
	}
	if log.CreditsConsumed < 0 {
		t.Error("credits_consumed não pode ser negativo")
	}
	if log.RequestID == "" {
		t.Error("request_id não pode ser vazio")
	}
}

// =============================================================================
// HELPERS
// =============================================================================

type ManifestBilling struct {
	Model          string
	CreditCost     int
	PremiumActions map[string]int
}

type UsageLog struct {
	PluginSlug      string
	Action          string
	CreditsConsumed int
	ResponseStatus  int
	ResponseTimeMs  int
	RequestID       string
}

func debitCredits(balance *float64, cost float64) error {
	if cost == 0 {
		return nil
	}
	if *balance < cost {
		return &BillingError{Code: "INSUFFICIENT_CREDITS", Message: "Saldo insuficiente"}
	}
	*balance -= cost
	return nil
}

func refundCredits(balance *float64, amount float64) {
	*balance += amount
}

func getActionCost(manifest ManifestBilling, action string) int {
	if cost, ok := manifest.PremiumActions[action]; ok {
		return cost
	}
	return manifest.CreditCost
}

type BillingError struct {
	Code    string
	Message string
}

func (e *BillingError) Error() string {
	return e.Message
}
