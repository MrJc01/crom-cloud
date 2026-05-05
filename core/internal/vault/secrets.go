package vault

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SecretStore gerencia secrets criptografados dos desenvolvedores.
type SecretStore struct {
	DB      *pgxpool.Pool
	aesKey  []byte // 32 bytes para AES-256
	gcm     cipher.AEAD
}

// NewSecretStore cria um vault com a chave mestra.
func NewSecretStore(db *pgxpool.Pool, key []byte) (*SecretStore, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar cipher AES: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar GCM: %w", err)
	}

	return &SecretStore{DB: db, aesKey: key, gcm: gcm}, nil
}

// Encrypt criptografa um valor com AES-256-GCM.
func (s *SecretStore) Encrypt(plaintext string) ([]byte, error) {
	nonce := make([]byte, s.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("erro ao gerar nonce: %w", err)
	}
	return s.gcm.Seal(nonce, nonce, []byte(plaintext), nil), nil
}

// Decrypt descriptografa um valor AES-256-GCM.
func (s *SecretStore) Decrypt(ciphertext []byte) (string, error) {
	nonceSize := s.gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", fmt.Errorf("ciphertext muito curto")
	}

	nonce, encrypted := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := s.gcm.Open(nil, nonce, encrypted, nil)
	if err != nil {
		return "", fmt.Errorf("erro ao decriptar: %w", err)
	}
	return string(plaintext), nil
}

// SetSecret armazena um secret criptografado para um developer/plugin.
func (s *SecretStore) SetSecret(ctx context.Context, devID uuid.UUID, pluginSlug, key, value string) error {
	encrypted, err := s.Encrypt(value)
	if err != nil {
		return err
	}

	_, err = s.DB.Exec(ctx,
		`INSERT INTO developer_secrets (developer_id, plugin_slug, secret_key, encrypted_value, updated_at)
		 VALUES ($1, $2, $3, $4, NOW())
		 ON CONFLICT (developer_id, plugin_slug, secret_key) 
		 DO UPDATE SET encrypted_value = $4, updated_at = NOW()`,
		devID, pluginSlug, key, encrypted,
	)
	return err
}

// GetSecret busca e decripta um secret.
func (s *SecretStore) GetSecret(ctx context.Context, devID uuid.UUID, pluginSlug, key string) (string, error) {
	var encrypted []byte
	err := s.DB.QueryRow(ctx,
		`SELECT encrypted_value FROM developer_secrets WHERE developer_id = $1 AND plugin_slug = $2 AND secret_key = $3`,
		devID, pluginSlug, key,
	).Scan(&encrypted)
	if err != nil {
		return "", fmt.Errorf("secret não encontrado: %w", err)
	}

	return s.Decrypt(encrypted)
}

// GetSecretsForPlugin busca todos os secrets de um developer para um plugin.
func (s *SecretStore) GetSecretsForPlugin(ctx context.Context, devID uuid.UUID, pluginSlug string) (map[string]string, error) {
	rows, err := s.DB.Query(ctx,
		`SELECT secret_key, encrypted_value FROM developer_secrets WHERE developer_id = $1 AND plugin_slug = $2`,
		devID, pluginSlug,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	secrets := make(map[string]string)
	for rows.Next() {
		var key string
		var encrypted []byte
		if err := rows.Scan(&key, &encrypted); err != nil {
			continue
		}
		if val, err := s.Decrypt(encrypted); err == nil {
			secrets[key] = val
		}
	}
	return secrets, nil
}

// SecretInfo representa metadados de um secret (sem o valor).
type SecretInfo struct {
	Key       string    `json:"key"`
	Plugin    string    `json:"plugin"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ListSecrets lista os secrets de um developer (sem valores).
func (s *SecretStore) ListSecrets(ctx context.Context, devID uuid.UUID) ([]SecretInfo, error) {
	rows, err := s.DB.Query(ctx,
		`SELECT secret_key, plugin_slug, updated_at FROM developer_secrets WHERE developer_id = $1 ORDER BY plugin_slug, secret_key`,
		devID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []SecretInfo
	for rows.Next() {
		var info SecretInfo
		rows.Scan(&info.Key, &info.Plugin, &info.UpdatedAt)
		list = append(list, info)
	}
	return list, nil
}

// DeleteSecret remove um secret.
func (s *SecretStore) DeleteSecret(ctx context.Context, devID uuid.UUID, pluginSlug, key string) error {
	tag, err := s.DB.Exec(ctx,
		`DELETE FROM developer_secrets WHERE developer_id = $1 AND plugin_slug = $2 AND secret_key = $3`,
		devID, pluginSlug, key,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("secret não encontrado")
	}
	return nil
}
