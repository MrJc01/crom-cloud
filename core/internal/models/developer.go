package models

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// Developer representa um desenvolvedor registrado.
type Developer struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	Name          string    `json:"name"`
	PasswordHash  string    `json:"-"`
	CreditBalance float64   `json:"credit_balance"`
	Plan          string    `json:"plan"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// DeveloperStore gerencia operações de desenvolvedor no banco.
type DeveloperStore struct {
	DB *pgxpool.Pool
}

// Create registra um novo desenvolvedor.
func (s *DeveloperStore) Create(ctx context.Context, email, name, password string) (*Developer, error) {
	if len(password) < 6 {
		return nil, fmt.Errorf("senha deve ter no mínimo 6 caracteres")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("erro ao gerar hash: %w", err)
	}

	dev := &Developer{}
	err = s.DB.QueryRow(ctx,
		`INSERT INTO developers (email, name, password_hash)
		 VALUES ($1, $2, $3)
		 RETURNING id, email, name, credit_balance, plan, is_active, created_at, updated_at`,
		email, name, string(hash),
	).Scan(&dev.ID, &dev.Email, &dev.Name, &dev.CreditBalance, &dev.Plan, &dev.IsActive, &dev.CreatedAt, &dev.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("erro ao criar desenvolvedor: %w", err)
	}
	return dev, nil
}

// FindByEmail busca um desenvolvedor pelo email (para login).
func (s *DeveloperStore) FindByEmail(ctx context.Context, email string) (*Developer, error) {
	dev := &Developer{}
	err := s.DB.QueryRow(ctx,
		`SELECT id, email, name, password_hash, credit_balance, plan, is_active, created_at, updated_at
		 FROM developers WHERE email = $1`, email,
	).Scan(&dev.ID, &dev.Email, &dev.Name, &dev.PasswordHash, &dev.CreditBalance, &dev.Plan, &dev.IsActive, &dev.CreatedAt, &dev.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("desenvolvedor não encontrado: %w", err)
	}
	return dev, nil
}

// FindByID busca um desenvolvedor pelo UUID.
func (s *DeveloperStore) FindByID(ctx context.Context, id uuid.UUID) (*Developer, error) {
	dev := &Developer{}
	err := s.DB.QueryRow(ctx,
		`SELECT id, email, name, password_hash, credit_balance, plan, is_active, created_at, updated_at
		 FROM developers WHERE id = $1`, id,
	).Scan(&dev.ID, &dev.Email, &dev.Name, &dev.PasswordHash, &dev.CreditBalance, &dev.Plan, &dev.IsActive, &dev.CreatedAt, &dev.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("desenvolvedor não encontrado: %w", err)
	}
	return dev, nil
}

// CheckPassword compara a senha com o hash armazenado.
func (d *Developer) CheckPassword(password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(d.PasswordHash), []byte(password)) == nil
}

// UpdateBalance atualiza o saldo de créditos do desenvolvedor.
func (s *DeveloperStore) UpdateBalance(ctx context.Context, id uuid.UUID, newBalance float64) error {
	tag, err := s.DB.Exec(ctx,
		`UPDATE developers SET credit_balance = $1, updated_at = NOW() WHERE id = $2`,
		newBalance, id,
	)
	if err != nil {
		return fmt.Errorf("erro ao atualizar saldo: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("desenvolvedor não encontrado")
	}
	return nil
}

// EnablePlugin habilita um plugin para o desenvolvedor.
func (s *DeveloperStore) EnablePlugin(ctx context.Context, devID uuid.UUID, slug string) error {
	_, err := s.DB.Exec(ctx,
		`INSERT INTO developer_plugins (developer_id, plugin_slug, status) 
		 VALUES ($1, $2, 'active')
		 ON CONFLICT (developer_id, plugin_slug) DO UPDATE SET status = 'active', updated_at = NOW()`,
		devID, slug,
	)
	if err != nil {
		return fmt.Errorf("erro ao habilitar plugin: %w", err)
	}
	return nil
}

// DisablePlugin desabilita um plugin para o desenvolvedor.
func (s *DeveloperStore) DisablePlugin(ctx context.Context, devID uuid.UUID, slug string) error {
	_, err := s.DB.Exec(ctx,
		`UPDATE developer_plugins SET status = 'disabled', updated_at = NOW() 
		 WHERE developer_id = $1 AND plugin_slug = $2`,
		devID, slug,
	)
	if err != nil {
		return fmt.Errorf("erro ao desabilitar plugin: %w", err)
	}
	return nil
}

// ListEnabledPlugins lista os slugs de todos os plugins habilitados para um desenvolvedor.
func (s *DeveloperStore) ListEnabledPlugins(ctx context.Context, devID uuid.UUID) ([]string, error) {
	rows, err := s.DB.Query(ctx,
		`SELECT plugin_slug FROM developer_plugins WHERE developer_id = $1 AND status = 'active'`,
		devID,
	)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar plugins habilitados: %w", err)
	}
	defer rows.Close()

	var slugs []string
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			return nil, fmt.Errorf("erro ao escanear slug: %w", err)
		}
		slugs = append(slugs, slug)
	}
	return slugs, rows.Err()
}
