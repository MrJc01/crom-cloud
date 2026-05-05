package gateway

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// PluginManifest representa o manifest.json de um plugin.
type PluginManifest struct {
	Slug            string          `json:"slug"`
	Name            string          `json:"name"`
	Version         string          `json:"version"`
	Description     string          `json:"description"`
	Icon            string          `json:"icon"`
	Status          string          `json:"status"`
	Runtime         RuntimeConfig   `json:"runtime"`
	Billing         BillingConfig   `json:"billing"`
	RequiredSecrets []SecretSpec    `json:"required_secrets"`
	Documentation   PluginDoc       `json:"documentation"`
	APIRoutes       []RouteSpec     `json:"api_routes"`
}

// PluginDoc define a documentação detalhada do plugin.
type PluginDoc struct {
	Overview       string   `json:"overview"`
	UseCases       []string `json:"use_cases"`
	GettingStarted string   `json:"getting_started"`
}

// RuntimeConfig define como o plugin é executado.
type RuntimeConfig struct {
	Binary              string `json:"binary"`
	Language            string `json:"language"`
	ScriptEntry         string `json:"script_entry"`
	HealthCheckInterval string `json:"health_check_interval"`
}

// BillingConfig define os custos do plugin.
type BillingConfig struct {
	Model          string         `json:"model"`
	CreditCost     int            `json:"credit_cost"`
	PremiumActions map[string]int `json:"premium_actions"`
}

// SecretSpec define um secret que o plugin precisa.
type SecretSpec struct {
	Key      string `json:"key"`
	Label    string `json:"label"`
	Required bool   `json:"required"`
}

// RouteSpec define uma rota exposta pelo plugin.
type RouteSpec struct {
	Method        string   `json:"method"`
	Path          string   `json:"path"`
	Description   string   `json:"description"`
	Scope         string   `json:"scope"`
	Documentation RouteDoc `json:"documentation"`
}

// RouteDoc define a documentação detalhada de um endpoint.
type RouteDoc struct {
	Summary         string       `json:"summary"`
	RequestBody     interface{}  `json:"request_body"`
	ResponseExample interface{}  `json:"response_example"`
	Errors          []RouteError `json:"errors"`
}

// RouteError define um erro retornado pelo endpoint.
type RouteError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// LoadManifest carrega e parseia um manifest.json.
func LoadManifest(path string) (*PluginManifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("erro ao ler manifest %s: %w", path, err)
	}

	var m PluginManifest
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, fmt.Errorf("erro ao parsear manifest %s: %w", path, err)
	}

	if err := ValidateManifest(&m); err != nil {
		return nil, fmt.Errorf("manifest inválido %s: %w", path, err)
	}

	// Defaults
	if m.Status == "" {
		m.Status = "active"
	}
	if m.Runtime.Language == "" {
		m.Runtime.Language = "go"
	}

	return &m, nil
}

// ValidateManifest verifica campos obrigatórios do manifest.
func ValidateManifest(m *PluginManifest) error {
	if m.Slug == "" {
		return fmt.Errorf("slug é obrigatório")
	}
	if m.Name == "" {
		return fmt.Errorf("name é obrigatório")
	}
	if m.Runtime.Binary == "" {
		return fmt.Errorf("runtime.binary é obrigatório")
	}
	if m.Billing.CreditCost < 0 {
		return fmt.Errorf("billing.credit_cost não pode ser negativo")
	}
	if len(m.APIRoutes) == 0 {
		return fmt.Errorf("api_routes não pode ser vazio")
	}
	return nil
}

// DiscoverManifests escaneia um diretório procurando manifest.json em subpastas.
func DiscoverManifests(pluginsDir string) ([]*PluginManifest, []error) {
	var manifests []*PluginManifest
	var errors []error

	entries, err := os.ReadDir(pluginsDir)
	if err != nil {
		return nil, []error{fmt.Errorf("erro ao ler diretório de plugins %s: %w", pluginsDir, err)}
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		manifestPath := filepath.Join(pluginsDir, entry.Name(), "manifest.json")
		if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
			continue // Pasta sem manifest = ignorar silenciosamente
		}

		m, err := LoadManifest(manifestPath)
		if err != nil {
			errors = append(errors, err)
			continue
		}

		if m.Status == "disabled" {
			// Não ignorar, apenas manter na lista para o dashboard poder visualizar
		}

		manifests = append(manifests, m)
	}

	return manifests, errors
}
