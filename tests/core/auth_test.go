package core_test

import (
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

// =============================================================================
// TESTES: Validação de API Key
// =============================================================================

// TestAPIKeyHashGeneration verifica que o hash SHA-256 é gerado corretamente
func TestAPIKeyHashGeneration(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		wantLen  int
	}{
		{
			name:    "chave de produção",
			apiKey:  "crom_sk_live_7f3a8b2c4d5e6f7g8h9i0j",
			wantLen: 64, // SHA-256 hex = 64 chars
		},
		{
			name:    "chave de teste",
			apiKey:  "crom_sk_test_a1b2c3d4e5f6g7h8i9j0k",
			wantLen: 64,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash := sha256.Sum256([]byte(tt.apiKey))
			hexHash := hex.EncodeToString(hash[:])

			if len(hexHash) != tt.wantLen {
				t.Errorf("hash length = %d, want %d", len(hexHash), tt.wantLen)
			}

			// Hash deve ser determinístico
			hash2 := sha256.Sum256([]byte(tt.apiKey))
			hexHash2 := hex.EncodeToString(hash2[:])
			if hexHash != hexHash2 {
				t.Error("hash não é determinístico")
			}
		})
	}
}

// TestAPIKeyPrefixExtraction verifica extração do prefixo visível
func TestAPIKeyPrefixExtraction(t *testing.T) {
	tests := []struct {
		name       string
		apiKey     string
		wantPrefix string
	}{
		{
			name:       "chave live",
			apiKey:     "crom_sk_live_7f3a8b2c4d5e",
			wantPrefix: "crom_sk_live_7f3a",
		},
		{
			name:       "chave test",
			apiKey:     "crom_sk_test_a1b2c3d4e5f6",
			wantPrefix: "crom_sk_test_a1b2",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Extrai prefixo: tipo + primeiros 4 chars do identificador
			prefix := extractPrefix(tt.apiKey)
			if prefix != tt.wantPrefix {
				t.Errorf("prefix = %q, want %q", prefix, tt.wantPrefix)
			}
		})
	}
}

// TestAPIKeyValidation verifica cenários de validação
func TestAPIKeyValidation(t *testing.T) {
	tests := []struct {
		name    string
		apiKey  string
		wantErr string
	}{
		{
			name:    "key vazia",
			apiKey:  "",
			wantErr: "API key é obrigatória",
		},
		{
			name:    "key sem prefixo válido",
			apiKey:  "invalid_key_123",
			wantErr: "formato de API key inválido",
		},
		{
			name:    "key muito curta",
			apiKey:  "crom_sk_live_",
			wantErr: "API key muito curta",
		},
		{
			name:    "key válida live",
			apiKey:  "crom_sk_live_7f3a8b2c4d5e6f7g8h9i0j1k2l3m4n",
			wantErr: "",
		},
		{
			name:    "key válida test",
			apiKey:  "crom_sk_test_7f3a8b2c4d5e6f7g8h9i0j1k2l3m4n",
			wantErr: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateAPIKeyFormat(tt.apiKey)
			if tt.wantErr == "" && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if tt.wantErr != "" && (err == nil || err.Error() != tt.wantErr) {
				t.Errorf("error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}

// TestPermissionCheck verifica se a key tem scope para o plugin
func TestPermissionCheck(t *testing.T) {
	// Simula permissões de uma key
	permissions := []Permission{
		{PluginSlug: "dns", Scope: "write"},
		{PluginSlug: "storage", Scope: "read"},
		{PluginSlug: "ai", Scope: "write"},
	}

	tests := []struct {
		name       string
		plugin     string
		scope      string
		wantAccess bool
	}{
		{"dns write permitido", "dns", "write", true},
		{"dns read permitido (write inclui read)", "dns", "read", true},
		{"storage read permitido", "storage", "read", true},
		{"storage write negado", "storage", "write", false},
		{"ai write permitido", "ai", "write", true},
		{"deploy negado (sem permissão)", "deploy", "read", false},
		{"plugin inexistente", "xyz", "read", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := hasPermission(permissions, tt.plugin, tt.scope)
			if got != tt.wantAccess {
				t.Errorf("hasPermission(%q, %q) = %v, want %v",
					tt.plugin, tt.scope, got, tt.wantAccess)
			}
		})
	}
}

// =============================================================================
// HELPERS (serão movidos para o pacote real depois)
// =============================================================================

type Permission struct {
	PluginSlug string
	Scope      string
}

func extractPrefix(key string) string {
	// Encontra o terceiro underscore e pega +4 chars
	count := 0
	for i, c := range key {
		if c == '_' {
			count++
			if count == 3 {
				end := i + 5
				if end > len(key) {
					end = len(key)
				}
				return key[:end]
			}
		}
	}
	return key
}

func validateAPIKeyFormat(key string) error {
	if key == "" {
		return &ValidationError{"API key é obrigatória"}
	}
	if len(key) < 20 {
		if len(key) > 13 && (key[:13] == "crom_sk_live_" || key[:13] == "crom_sk_test_") {
			return &ValidationError{"API key muito curta"}
		}
		return &ValidationError{"formato de API key inválido"}
	}
	if key[:13] != "crom_sk_live_" && key[:13] != "crom_sk_test_" {
		return &ValidationError{"formato de API key inválido"}
	}
	return nil
}

func hasPermission(perms []Permission, plugin, scope string) bool {
	for _, p := range perms {
		if p.PluginSlug == plugin {
			if p.Scope == "admin" {
				return true
			}
			if p.Scope == "write" && (scope == "write" || scope == "read") {
				return true
			}
			if p.Scope == scope {
				return true
			}
		}
	}
	return false
}

type ValidationError struct {
	msg string
}

func (e *ValidationError) Error() string {
	return e.msg
}
