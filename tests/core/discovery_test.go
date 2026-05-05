package core_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// =============================================================================
// TESTES: Plugin Discovery
// =============================================================================

// TestManifestParsing verifica parsing correto do manifest.json
func TestManifestParsing(t *testing.T) {
	manifestJSON := `{
		"slug": "dns-manager",
		"name": "DNS Manager",
		"version": "1.0.0",
		"description": "Gerencia zonas e registros DNS",
		"icon": "globe",
		"status": "active",
		"runtime": {
			"binary": "./dns-manager.bin",
			"language": "go",
			"health_check_interval": "30s"
		},
		"billing": {
			"model": "per_call",
			"credit_cost": 1,
			"premium_actions": {}
		},
		"required_secrets": [
			{
				"key": "cloudflare_api_key",
				"label": "Chave da API Cloudflare",
				"required": true
			}
		],
		"api_routes": [
			{"method": "GET", "path": "/zones", "description": "Lista zonas", "scope": "read"},
			{"method": "POST", "path": "/records", "description": "Cria registro", "scope": "write"}
		]
	}`

	var manifest PluginManifest
	err := json.Unmarshal([]byte(manifestJSON), &manifest)
	if err != nil {
		t.Fatalf("erro ao parsear manifest: %v", err)
	}

	// Valida campos obrigatórios
	if manifest.Slug == "" {
		t.Error("slug não pode ser vazio")
	}
	if manifest.Name == "" {
		t.Error("name não pode ser vazio")
	}
	if manifest.Version == "" {
		t.Error("version não pode ser vazia")
	}
	if manifest.Runtime.Binary == "" {
		t.Error("runtime.binary não pode ser vazio")
	}
	if manifest.Billing.CreditCost < 0 {
		t.Error("billing.credit_cost não pode ser negativo")
	}
	if len(manifest.APIRoutes) == 0 {
		t.Error("api_routes não pode ser vazio")
	}

	// Valida valores específicos
	if manifest.Slug != "dns-manager" {
		t.Errorf("slug = %q, want %q", manifest.Slug, "dns-manager")
	}
	if manifest.Billing.CreditCost != 1 {
		t.Errorf("credit_cost = %d, want %d", manifest.Billing.CreditCost, 1)
	}
	if len(manifest.RequiredSecrets) != 1 {
		t.Errorf("required_secrets count = %d, want %d", len(manifest.RequiredSecrets), 1)
	}
}

// TestManifestValidation verifica validação de manifests inválidos
func TestManifestValidation(t *testing.T) {
	tests := []struct {
		name    string
		json    string
		wantErr string
	}{
		{
			name:    "slug vazio",
			json:    `{"slug":"","name":"Test","version":"1.0.0","runtime":{"binary":"./test.bin"},"billing":{"credit_cost":1},"api_routes":[{"method":"GET","path":"/test","scope":"read"}]}`,
			wantErr: "slug é obrigatório",
		},
		{
			name:    "sem runtime.binary",
			json:    `{"slug":"test","name":"Test","version":"1.0.0","runtime":{"binary":""},"billing":{"credit_cost":1},"api_routes":[{"method":"GET","path":"/test","scope":"read"}]}`,
			wantErr: "runtime.binary é obrigatório",
		},
		{
			name:    "custo negativo",
			json:    `{"slug":"test","name":"Test","version":"1.0.0","runtime":{"binary":"./test.bin"},"billing":{"credit_cost":-5},"api_routes":[{"method":"GET","path":"/test","scope":"read"}]}`,
			wantErr: "billing.credit_cost não pode ser negativo",
		},
		{
			name:    "sem rotas",
			json:    `{"slug":"test","name":"Test","version":"1.0.0","runtime":{"binary":"./test.bin"},"billing":{"credit_cost":1},"api_routes":[]}`,
			wantErr: "api_routes não pode ser vazio",
		},
		{
			name:    "manifest válido",
			json:    `{"slug":"test","name":"Test","version":"1.0.0","runtime":{"binary":"./test.bin","language":"go"},"billing":{"credit_cost":1},"api_routes":[{"method":"GET","path":"/test","scope":"read"}]}`,
			wantErr: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var manifest PluginManifest
			json.Unmarshal([]byte(tt.json), &manifest)

			err := validateManifest(manifest)
			if tt.wantErr == "" && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if tt.wantErr != "" && (err == nil || err.Error() != tt.wantErr) {
				t.Errorf("error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}

// TestDiscoverPlugins verifica a descoberta de plugins na pasta /plugins/
func TestDiscoverPlugins(t *testing.T) {
	// Cria estrutura temporária de plugins
	tmpDir := t.TempDir()

	// Plugin válido
	validDir := filepath.Join(tmpDir, "dns-manager")
	os.MkdirAll(validDir, 0755)
	manifest := `{"slug":"dns","name":"DNS","version":"1.0.0","runtime":{"binary":"./dns.bin","language":"go"},"billing":{"credit_cost":1},"api_routes":[{"method":"GET","path":"/zones","scope":"read"}]}`
	os.WriteFile(filepath.Join(validDir, "manifest.json"), []byte(manifest), 0644)

	// Plugin sem manifest (deve ser ignorado)
	invalidDir := filepath.Join(tmpDir, "broken-plugin")
	os.MkdirAll(invalidDir, 0755)

	// Plugin com manifest inválido
	badDir := filepath.Join(tmpDir, "bad-plugin")
	os.MkdirAll(badDir, 0755)
	os.WriteFile(filepath.Join(badDir, "manifest.json"), []byte(`{invalid json`), 0644)

	// Executa discovery
	plugins, errors := discoverPlugins(tmpDir)

	if len(plugins) != 1 {
		t.Errorf("plugins encontrados = %d, want %d", len(plugins), 1)
	}
	if len(errors) != 1 {
		t.Errorf("erros de discovery = %d, want %d (manifest inválido)", len(errors), 1)
	}
	if len(plugins) > 0 && plugins[0].Slug != "dns" {
		t.Errorf("plugin slug = %q, want %q", plugins[0].Slug, "dns")
	}
}

// =============================================================================
// HELPERS
// =============================================================================

type PluginManifest struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Status      string `json:"status"`
	Runtime     struct {
		Binary              string `json:"binary"`
		Language            string `json:"language"`
		ScriptEntry         string `json:"script_entry"`
		HealthCheckInterval string `json:"health_check_interval"`
	} `json:"runtime"`
	Billing struct {
		Model          string         `json:"model"`
		CreditCost     int            `json:"credit_cost"`
		PremiumActions map[string]int `json:"premium_actions"`
	} `json:"billing"`
	RequiredSecrets []struct {
		Key      string `json:"key"`
		Label    string `json:"label"`
		Required bool   `json:"required"`
	} `json:"required_secrets"`
	APIRoutes []struct {
		Method      string `json:"method"`
		Path        string `json:"path"`
		Description string `json:"description"`
		Scope       string `json:"scope"`
	} `json:"api_routes"`
}

func validateManifest(m PluginManifest) error {
	if m.Slug == "" {
		return &ValidationError{"slug é obrigatório"}
	}
	if m.Runtime.Binary == "" {
		return &ValidationError{"runtime.binary é obrigatório"}
	}
	if m.Billing.CreditCost < 0 {
		return &ValidationError{"billing.credit_cost não pode ser negativo"}
	}
	if len(m.APIRoutes) == 0 {
		return &ValidationError{"api_routes não pode ser vazio"}
	}
	return nil
}

func discoverPlugins(pluginsDir string) ([]PluginManifest, []error) {
	var plugins []PluginManifest
	var errors []error

	entries, err := os.ReadDir(pluginsDir)
	if err != nil {
		return nil, []error{err}
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		manifestPath := filepath.Join(pluginsDir, entry.Name(), "manifest.json")
		data, err := os.ReadFile(manifestPath)
		if err != nil {
			continue // Sem manifest = ignorar silenciosamente
		}

		var manifest PluginManifest
		if err := json.Unmarshal(data, &manifest); err != nil {
			errors = append(errors, err)
			continue
		}

		if err := validateManifest(manifest); err != nil {
			errors = append(errors, err)
			continue
		}

		plugins = append(plugins, manifest)
	}

	return plugins, errors
}
