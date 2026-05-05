package models

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Plugin representa um plugin registrado no banco de dados.
type Plugin struct {
	Slug              string          `json:"slug"`
	Name              string          `json:"name"`
	Description       string          `json:"description"`
	Version           string          `json:"version"`
	Icon              string          `json:"icon"`
	DefaultCreditCost float64         `json:"default_credit_cost"`
	Status            string          `json:"status"`
	RequiredSecrets   json.RawMessage `json:"required_secrets,omitempty"`
	Config            json.RawMessage `json:"config,omitempty"`
	RegisteredAt      time.Time       `json:"registered_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

// PluginStore gerencia operações CRUD de plugins no banco.
type PluginStore struct {
	DB *pgxpool.Pool
}

// Register cria ou atualiza um plugin no registry.
func (s *PluginStore) Register(ctx context.Context, p *Plugin) error {
	_, err := s.DB.Exec(ctx,
		`INSERT INTO plugin_registry (slug, name, description, version, icon, default_credit_cost, status, required_secrets, config)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (slug) DO UPDATE SET
		   name = EXCLUDED.name,
		   description = EXCLUDED.description,
		   version = EXCLUDED.version,
		   icon = EXCLUDED.icon,
		   default_credit_cost = EXCLUDED.default_credit_cost,
		   status = EXCLUDED.status,
		   required_secrets = EXCLUDED.required_secrets,
		   config = EXCLUDED.config,
		   updated_at = NOW()`,
		p.Slug, p.Name, p.Description, p.Version, p.Icon, p.DefaultCreditCost, p.Status, p.RequiredSecrets, p.Config,
	)
	return err
}

// GetBySlug busca um plugin pelo slug.
func (s *PluginStore) GetBySlug(ctx context.Context, slug string) (*Plugin, error) {
	var p Plugin
	err := s.DB.QueryRow(ctx,
		`SELECT slug, name, description, version, icon, default_credit_cost, status, required_secrets, config, registered_at, updated_at
		 FROM plugin_registry WHERE slug = $1`, slug,
	).Scan(&p.Slug, &p.Name, &p.Description, &p.Version, &p.Icon, &p.DefaultCreditCost, &p.Status, &p.RequiredSecrets, &p.Config, &p.RegisteredAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("plugin '%s' não encontrado: %w", slug, err)
	}
	return &p, nil
}

// List retorna todos os plugins registrados.
func (s *PluginStore) List(ctx context.Context) ([]Plugin, error) {
	rows, err := s.DB.Query(ctx,
		`SELECT slug, name, description, version, icon, default_credit_cost, status, required_secrets, config, registered_at, updated_at
		 FROM plugin_registry ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plugins []Plugin
	for rows.Next() {
		var p Plugin
		if err := rows.Scan(&p.Slug, &p.Name, &p.Description, &p.Version, &p.Icon, &p.DefaultCreditCost, &p.Status, &p.RequiredSecrets, &p.Config, &p.RegisteredAt, &p.UpdatedAt); err != nil {
			continue
		}
		plugins = append(plugins, p)
	}
	if plugins == nil {
		plugins = []Plugin{}
	}
	return plugins, nil
}

// UpdateStatus atualiza o status de um plugin (active, maintenance, disabled).
func (s *PluginStore) UpdateStatus(ctx context.Context, slug, status string) error {
	_, err := s.DB.Exec(ctx,
		`UPDATE plugin_registry SET status = $1, updated_at = NOW() WHERE slug = $2`,
		status, slug,
	)
	return err
}

// Delete remove um plugin do registry.
func (s *PluginStore) Delete(ctx context.Context, slug string) error {
	_, err := s.DB.Exec(ctx, `DELETE FROM plugin_registry WHERE slug = $1`, slug)
	return err
}
