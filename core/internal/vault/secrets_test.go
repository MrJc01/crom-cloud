package vault_test

import (
	"encoding/hex"
	"testing"

	"github.com/crom/crom-cloud/core/internal/vault"
)

func newTestVault(t *testing.T) *vault.SecretStore {
	t.Helper()
	key, _ := hex.DecodeString("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
	v, err := vault.NewSecretStore(nil, key) // DB nil — só testa cripto
	if err != nil {
		t.Fatalf("NewSecretStore falhou: %v", err)
	}
	return v
}

func TestEncryptDecrypt(t *testing.T) {
	v := newTestVault(t)

	tests := []struct {
		name      string
		plaintext string
	}{
		{"string simples", "sk-proj-abc123"},
		{"string vazia", ""},
		{"string longa", "Esta é uma chave de API muito longa com caracteres especiais: !@#$%^&*()"},
		{"unicode", "chave-com-acentuação-ñ-ü-ê"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			encrypted, err := v.Encrypt(tt.plaintext)
			if err != nil {
				t.Fatalf("Encrypt falhou: %v", err)
			}

			if string(encrypted) == tt.plaintext && tt.plaintext != "" {
				t.Error("Encrypt retornou texto plain — não criptografou!")
			}

			decrypted, err := v.Decrypt(encrypted)
			if err != nil {
				t.Fatalf("Decrypt falhou: %v", err)
			}

			if decrypted != tt.plaintext {
				t.Errorf("Decrypt: got %q, want %q", decrypted, tt.plaintext)
			}
		})
	}
}

func TestEncryptProducesDifferentCiphertexts(t *testing.T) {
	v := newTestVault(t)

	plain := "same-secret"
	enc1, _ := v.Encrypt(plain)
	enc2, _ := v.Encrypt(plain)

	if string(enc1) == string(enc2) {
		t.Error("Duas criptografias do mesmo texto produziram resultado idêntico — nonce não está sendo randomizado!")
	}
}

func TestNewSecretStoreInvalidKey(t *testing.T) {
	_, err := vault.NewSecretStore(nil, []byte("short"))
	if err == nil {
		t.Error("NewSecretStore deveria rejeitar chave curta")
	}
}
