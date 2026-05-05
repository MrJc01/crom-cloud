package server_test

import (
	"testing"

	"github.com/crom/crom-cloud/core/internal/server"
)

func TestSanitizeEmail(t *testing.T) {
	tests := []struct {
		input    string
		expected string
		valid    bool
	}{
		{"Dev@Example.COM", "dev@example.com", true},
		{"  user@test.io  ", "user@test.io", true},
		{"invalid", "", false},
		{"@missing.com", "@missing.com", true}, // tem @ e .
		{"user@", "", false},                     // sem .
		{"", "", false},
		{"user@domain.com", "user@domain.com", true},
	}
	for _, tt := range tests {
		result, ok := server.SanitizeEmail(tt.input)
		if ok != tt.valid {
			t.Errorf("SanitizeEmail(%q): valid=%v, want %v", tt.input, ok, tt.valid)
		}
		if result != tt.expected {
			t.Errorf("SanitizeEmail(%q): got %q, want %q", tt.input, result, tt.expected)
		}
	}
}

func TestIsValidSlug(t *testing.T) {
	tests := []struct {
		input string
		valid bool
	}{
		{"my-plugin", true},
		{"echo", true},
		{"dns-manager", true},
		{"ab", true},
		{"a", false},  // too short
		{"", false},
		{"UPPER", false},       // uppercase
		{"invalid slug!", false}, // special chars
		{"test_plugin", true},   // underscore ok
	}
	for _, tt := range tests {
		result := server.IsValidSlug(tt.input)
		if result != tt.valid {
			t.Errorf("IsValidSlug(%q): got %v, want %v", tt.input, result, tt.valid)
		}
	}
}

func TestSanitizeName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"João Dev", "João Dev"},
		{"  Alice  ", "Alice"},
		{"", ""},
		{"Valid Name 123", "Valid Name 123"},
		{"Has\x00Control\x1FChars", "HasControlChars"}, // control chars removed
	}
	for _, tt := range tests {
		result := server.SanitizeName(tt.input)
		if result != tt.expected {
			t.Errorf("SanitizeName(%q): got %q, want %q", tt.input, result, tt.expected)
		}
	}
}

func TestIsValidLabel(t *testing.T) {
	tests := []struct {
		input string
		valid bool
	}{
		{"Backend Produção", true},
		{"My Key", true},
		{"", false},
		{"simple", true},
		{"key-with-dash_underscore", true},
	}
	for _, tt := range tests {
		result := server.IsValidLabel(tt.input)
		if result != tt.valid {
			t.Errorf("IsValidLabel(%q): got %v, want %v", tt.input, result, tt.valid)
		}
	}
}

func TestIsValidUUID(t *testing.T) {
	tests := []struct {
		input string
		valid bool
	}{
		{"550e8400-e29b-41d4-a716-446655440000", true},
		{"invalid-uuid", false},
		{"", false},
		{"550E8400-E29B-41D4-A716-446655440000", true}, // uppercase ok
	}
	for _, tt := range tests {
		result := server.IsValidUUID(tt.input)
		if result != tt.valid {
			t.Errorf("IsValidUUID(%q): got %v, want %v", tt.input, result, tt.valid)
		}
	}
}

func TestSanitizeString(t *testing.T) {
	result := server.SanitizeString("  hello world  ", 5)
	if result != "hello" {
		t.Errorf("SanitizeString: got %q, want %q", result, "hello")
	}

	result = server.SanitizeString("abc", 100)
	if result != "abc" {
		t.Errorf("SanitizeString: got %q, want %q", result, "abc")
	}
}
