package models

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// APIKey representa uma chave de API.
type APIKey struct {
	ID           uuid.UUID       `json:"id"`
	DeveloperID  uuid.UUID       `json:"developer_id"`
	KeyPrefix    string          `json:"key_prefix"`
	KeyHash      string          `json:"-"`
	Label        string          `json:"label"`
	IsActive     bool            `json:"is_active"`
	LastUsedAt   *time.Time      `json:"last_used_at,omitempty"`
	ExpiresAt    *time.Time      `json:"expires_at,omitempty"`
	RateLimitRPM int            `json:"rate_limit_rpm"`
	CreatedAt    time.Time       `json:"created_at"`
	Permissions  []KeyPermission `json:"permissions"`
}

// KeyPermission define o acesso de uma key a um plugin.
type KeyPermission struct {
	ID         uuid.UUID `json:"id"`
	APIKeyID   uuid.UUID `json:"api_key_id"`
	PluginSlug string    `json:"plugin_slug"`
	Scope      string    `json:"scope"`
}

// APIKeyStore gerencia operações de API Key no banco.
type APIKeyStore struct {
	DB *pgxpool.Pool
}

// GenerateResult contém a key gerada (valor visível apenas uma vez).
type GenerateResult struct {
	Key     *APIKey `json:"key"`
	RawKey  string  `json:"raw_key"` // Valor completo — mostrado apenas na criação
}

// Generate cria uma nova API Key com permissões.
func (s *APIKeyStore) Generate(ctx context.Context, devID uuid.UUID, label string, permissions []KeyPermission, expiresAt *time.Time, rateLimit int) (*GenerateResult, error) {
	// Gerar 32 bytes aleatórios
	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		return nil, fmt.Errorf("erro ao gerar key: %w", err)
	}

	// Montar key com prefixo
	rawKey := "crom_sk_live_" + hex.EncodeToString(rawBytes)
	prefix := rawKey[:20]

	// Hash SHA-256 do valor completo
	hashBytes := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(hashBytes[:])

	if rateLimit <= 0 {
		rateLimit = 60
	}

	// Inserir key
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro ao iniciar transação: %w", err)
	}
	defer tx.Rollback(ctx)

	key := &APIKey{}
	err = tx.QueryRow(ctx,
		`INSERT INTO api_keys (developer_id, key_prefix, key_hash, label, expires_at, rate_limit_rpm)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, developer_id, key_prefix, label, is_active, expires_at, rate_limit_rpm, created_at`,
		devID, prefix, keyHash, label, expiresAt, rateLimit,
	).Scan(&key.ID, &key.DeveloperID, &key.KeyPrefix, &key.Label, &key.IsActive, &key.ExpiresAt, &key.RateLimitRPM, &key.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("erro ao inserir key: %w", err)
	}

	// Inserir permissões
	for _, perm := range permissions {
		_, err := tx.Exec(ctx,
			`INSERT INTO key_permissions (api_key_id, plugin_slug, scope) VALUES ($1, $2, $3)`,
			key.ID, perm.PluginSlug, perm.Scope,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao inserir permissão: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("erro ao commitar: %w", err)
	}

	key.Permissions = permissions

	return &GenerateResult{Key: key, RawKey: rawKey}, nil
}

// FindByHash busca uma key ativa pelo hash SHA-256 + permissões.
func (s *APIKeyStore) FindByHash(ctx context.Context, keyHash string) (*APIKey, error) {
	key := &APIKey{}
	err := s.DB.QueryRow(ctx,
		`SELECT id, developer_id, key_prefix, key_hash, label, is_active, last_used_at, expires_at, rate_limit_rpm, created_at
		 FROM api_keys WHERE key_hash = $1`, keyHash,
	).Scan(&key.ID, &key.DeveloperID, &key.KeyPrefix, &key.KeyHash, &key.Label, &key.IsActive, &key.LastUsedAt, &key.ExpiresAt, &key.RateLimitRPM, &key.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("key não encontrada: %w", err)
	}

	// Carregar permissões
	rows, err := s.DB.Query(ctx,
		`SELECT id, api_key_id, plugin_slug, scope FROM key_permissions WHERE api_key_id = $1`, key.ID)
	if err != nil {
		return nil, fmt.Errorf("erro ao carregar permissões: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var perm KeyPermission
		rows.Scan(&perm.ID, &perm.APIKeyID, &perm.PluginSlug, &perm.Scope)
		key.Permissions = append(key.Permissions, perm)
	}

	return key, nil
}

// ListByDeveloper lista as keys de um desenvolvedor (sem valores).
func (s *APIKeyStore) ListByDeveloper(ctx context.Context, devID uuid.UUID) ([]APIKey, error) {
	rows, err := s.DB.Query(ctx,
		`SELECT id, developer_id, key_prefix, label, is_active, last_used_at, expires_at, rate_limit_rpm, created_at
		 FROM api_keys WHERE developer_id = $1 ORDER BY created_at DESC`, devID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []APIKey
	for rows.Next() {
		var k APIKey
		rows.Scan(&k.ID, &k.DeveloperID, &k.KeyPrefix, &k.Label, &k.IsActive, &k.LastUsedAt, &k.ExpiresAt, &k.RateLimitRPM, &k.CreatedAt)

		// Carregar permissões para cada key
		permRows, _ := s.DB.Query(ctx,
			`SELECT id, api_key_id, plugin_slug, scope FROM key_permissions WHERE api_key_id = $1`, k.ID)
		for permRows.Next() {
			var perm KeyPermission
			permRows.Scan(&perm.ID, &perm.APIKeyID, &perm.PluginSlug, &perm.Scope)
			k.Permissions = append(k.Permissions, perm)
		}
		permRows.Close()

		keys = append(keys, k)
	}
	return keys, nil
}

// Revoke desativa uma API Key.
func (s *APIKeyStore) Revoke(ctx context.Context, keyID, devID uuid.UUID) error {
	tag, err := s.DB.Exec(ctx,
		`UPDATE api_keys SET is_active = false WHERE id = $1 AND developer_id = $2`, keyID, devID)
	if err != nil {
		return fmt.Errorf("erro ao revogar key: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("key não encontrada ou não pertence ao desenvolvedor")
	}
	return nil
}

// UpdateLastUsed atualiza o timestamp de último uso.
func (s *APIKeyStore) UpdateLastUsed(ctx context.Context, keyID uuid.UUID) {
	s.DB.Exec(ctx, `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, keyID)
}

// HashKey calcula o SHA-256 de uma raw key.
func HashKey(rawKey string) string {
	h := sha256.Sum256([]byte(rawKey))
	return hex.EncodeToString(h[:])
}
