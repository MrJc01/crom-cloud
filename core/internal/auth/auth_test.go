package auth_test

import (
	"testing"

	"github.com/crom/crom-cloud/core/internal/auth"
	"github.com/crom/crom-cloud/core/internal/models"
)

func TestHasPermission(t *testing.T) {
	perms := []models.KeyPermission{
		{PluginSlug: "echo", Scope: "write"},
		{PluginSlug: "dns", Scope: "read"},
		{PluginSlug: "*", Scope: "read"},
	}

	tests := []struct {
		name     string
		slug     string
		scope    string
		expected bool
	}{
		// echo tem write → read e write permitidos
		{"echo read", "echo", "read", true},
		{"echo write", "echo", "write", true},
		{"echo admin", "echo", "admin", false},

		// dns tem read → somente read
		{"dns read", "dns", "read", true},
		{"dns write", "dns", "write", false},

		// wildcard * tem read → qualquer plugin com read
		{"storage read via wildcard", "storage", "read", true},
		{"storage write via wildcard", "storage", "write", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := auth.HasPermission(perms, tt.slug, tt.scope)
			if result != tt.expected {
				t.Errorf("HasPermission(perms, %q, %q) = %v, want %v", tt.slug, tt.scope, result, tt.expected)
			}
		})
	}
}

func TestHasPermissionEmpty(t *testing.T) {
	result := auth.HasPermission(nil, "echo", "read")
	if result {
		t.Error("HasPermission com perms nil deveria retornar false")
	}

	result = auth.HasPermission([]models.KeyPermission{}, "echo", "read")
	if result {
		t.Error("HasPermission com perms vazio deveria retornar false")
	}
}

func TestHasPermissionAdminScope(t *testing.T) {
	perms := []models.KeyPermission{
		{PluginSlug: "echo", Scope: "admin"},
	}

	// admin >= tudo
	if !auth.HasPermission(perms, "echo", "read") {
		t.Error("admin deveria permitir read")
	}
	if !auth.HasPermission(perms, "echo", "write") {
		t.Error("admin deveria permitir write")
	}
	if !auth.HasPermission(perms, "echo", "admin") {
		t.Error("admin deveria permitir admin")
	}
}
