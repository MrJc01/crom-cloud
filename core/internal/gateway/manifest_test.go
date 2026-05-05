package gateway_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/crom/crom-cloud/core/internal/gateway"
)

func TestLoadManifest(t *testing.T) {
	// Criar manifest temporário
	dir := t.TempDir()
	manifest := map[string]interface{}{
		"slug":    "test-plugin",
		"name":    "Test Plugin",
		"version": "1.0.0",
		"icon":    "🧪",
		"status":  "active",
		"runtime": map[string]interface{}{
			"binary":   "test-plugin",
			"language": "go",
		},
		"billing": map[string]interface{}{
			"model":       "per_call",
			"credit_cost": 1,
		},
		"api_routes": []map[string]string{
			{"method": "GET", "path": "/ping", "scope": "read"},
		},
	}

	data, _ := json.MarshalIndent(manifest, "", "  ")
	manifestPath := filepath.Join(dir, "manifest.json")
	os.WriteFile(manifestPath, data, 0644)

	m, err := gateway.LoadManifest(manifestPath)
	if err != nil {
		t.Fatalf("LoadManifest falhou: %v", err)
	}

	if m.Slug != "test-plugin" {
		t.Errorf("Slug: got %q, want %q", m.Slug, "test-plugin")
	}
	if m.Name != "Test Plugin" {
		t.Errorf("Name: got %q, want %q", m.Name, "Test Plugin")
	}
	if m.Version != "1.0.0" {
		t.Errorf("Version: got %q, want %q", m.Version, "1.0.0")
	}
	if len(m.APIRoutes) != 1 {
		t.Errorf("APIRoutes: got %d, want 1", len(m.APIRoutes))
	}
}

func TestLoadManifestInvalidJSON(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "manifest.json")
	os.WriteFile(path, []byte("{invalid json"), 0644)

	_, err := gateway.LoadManifest(path)
	if err == nil {
		t.Error("LoadManifest deveria falhar com JSON inválido")
	}
}

func TestLoadManifestNotFound(t *testing.T) {
	_, err := gateway.LoadManifest("/tmp/nonexistent/manifest.json")
	if err == nil {
		t.Error("LoadManifest deveria falhar com arquivo inexistente")
	}
}
