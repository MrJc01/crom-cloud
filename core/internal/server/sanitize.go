package server

import (
	"net/mail"
	"regexp"
	"strings"
	"unicode/utf8"
)

var (
	// slugRegex aceita apenas caracteres alfanuméricos, hífens e underscores
	slugRegex  = regexp.MustCompile(`^[a-z0-9][a-z0-9\-_]{0,98}[a-z0-9]$`)
	labelRegex = regexp.MustCompile(`^[\p{L}\p{N}\s\-_.,!?@#&()]{1,100}$`)
	uuidRegex  = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
)

// SanitizeEmail valida e normaliza um endereço de email.
func SanitizeEmail(email string) (string, bool) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return "", false
	}
	_, err := net.ParseAddress(email)
	if err != nil {
		// Fallback: verificação básica
		if !strings.Contains(email, "@") || !strings.Contains(email, ".") {
			return "", false
		}
	}
	if len(email) > 254 {
		return "", false
	}
	return email, true
}

// SanitizeString limpa uma string genérica: trim + limite de tamanho.
func SanitizeString(s string, maxLen int) string {
	s = strings.TrimSpace(s)
	if utf8.RuneCountInString(s) > maxLen {
		runes := []rune(s)
		s = string(runes[:maxLen])
	}
	return s
}

// IsValidSlug verifica se um slug é válido (kebab-case alfanumérico).
func IsValidSlug(slug string) bool {
	if slug == "" || len(slug) < 2 || len(slug) > 100 {
		return false
	}
	return slugRegex.MatchString(slug)
}

// IsValidLabel verifica se um label é válido (caracteres seguros).
func IsValidLabel(label string) bool {
	label = strings.TrimSpace(label)
	if label == "" {
		return false
	}
	return labelRegex.MatchString(label)
}

// IsValidUUID verifica se uma string é um UUID válido.
func IsValidUUID(id string) bool {
	return uuidRegex.MatchString(id)
}

// SanitizeName limpa um nome de usuário.
func SanitizeName(name string) string {
	name = strings.TrimSpace(name)
	// Remover caracteres de controle
	name = strings.Map(func(r rune) rune {
		if r < 32 || r == 127 {
			return -1
		}
		return r
	}, name)
	if utf8.RuneCountInString(name) > 100 {
		runes := []rune(name)
		name = string(runes[:100])
	}
	return name
}
