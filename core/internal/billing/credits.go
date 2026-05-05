package billing

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CreditStore gerencia operações de créditos.
type CreditStore struct {
	DB *pgxpool.Pool
}

// DebitCredits debita créditos do saldo do desenvolvedor de forma atômica.
func (s *CreditStore) DebitCredits(ctx context.Context, devID uuid.UUID, cost float64, pluginSlug, description string) error {
	tx, err := s.DB.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return fmt.Errorf("erro ao iniciar transação: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock e leitura do saldo
	var balance float64
	err = tx.QueryRow(ctx,
		`SELECT credit_balance FROM developers WHERE id = $1 FOR UPDATE`, devID,
	).Scan(&balance)
	if err != nil {
		return fmt.Errorf("desenvolvedor não encontrado: %w", err)
	}

	if balance < cost {
		return fmt.Errorf("INSUFFICIENT_CREDITS: saldo %.2f, custo %.2f", balance, cost)
	}

	newBalance := balance - cost

	// Atualizar saldo
	_, err = tx.Exec(ctx,
		`UPDATE developers SET credit_balance = $1, updated_at = NOW() WHERE id = $2`,
		newBalance, devID,
	)
	if err != nil {
		return fmt.Errorf("erro ao atualizar saldo: %w", err)
	}

	// Registrar transação no ledger
	_, err = tx.Exec(ctx,
		`INSERT INTO credit_transactions (developer_id, amount, type, description, plugin_slug, balance_after)
		 VALUES ($1, $2, 'debit', $3, $4, $5)`,
		devID, -cost, description, pluginSlug, newBalance,
	)
	if err != nil {
		return fmt.Errorf("erro ao registrar transação: %w", err)
	}

	return tx.Commit(ctx)
}

// RefundCredits reembolsa créditos ao desenvolvedor.
func (s *CreditStore) RefundCredits(ctx context.Context, devID uuid.UUID, amount float64, pluginSlug, description string) error {
	tx, err := s.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("erro ao iniciar transação: %w", err)
	}
	defer tx.Rollback(ctx)

	var newBalance float64
	err = tx.QueryRow(ctx,
		`UPDATE developers SET credit_balance = credit_balance + $1, updated_at = NOW()
		 WHERE id = $2 RETURNING credit_balance`, amount, devID,
	).Scan(&newBalance)
	if err != nil {
		return fmt.Errorf("erro ao reembolsar: %w", err)
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO credit_transactions (developer_id, amount, type, description, plugin_slug, balance_after)
		 VALUES ($1, $2, 'refund', $3, $4, $5)`,
		devID, amount, description, pluginSlug, newBalance,
	)
	if err != nil {
		return fmt.Errorf("erro ao registrar reembolso: %w", err)
	}

	return tx.Commit(ctx)
}

// AddCredits adiciona créditos (compra/bonus) ao saldo.
func (s *CreditStore) AddCredits(ctx context.Context, devID uuid.UUID, amount float64, txType, description string) error {
	tx, err := s.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("erro ao iniciar transação: %w", err)
	}
	defer tx.Rollback(ctx)

	var newBalance float64
	err = tx.QueryRow(ctx,
		`UPDATE developers SET credit_balance = credit_balance + $1, updated_at = NOW()
		 WHERE id = $2 RETURNING credit_balance`, amount, devID,
	).Scan(&newBalance)
	if err != nil {
		return fmt.Errorf("erro ao adicionar créditos: %w", err)
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO credit_transactions (developer_id, amount, type, description, balance_after)
		 VALUES ($1, $2, $3, $4, $5)`,
		devID, amount, txType, description, newBalance,
	)
	if err != nil {
		return fmt.Errorf("erro ao registrar transação: %w", err)
	}

	return tx.Commit(ctx)
}

// GetBalance retorna o saldo atual do desenvolvedor.
func (s *CreditStore) GetBalance(ctx context.Context, devID uuid.UUID) (float64, error) {
	var balance float64
	err := s.DB.QueryRow(ctx, `SELECT credit_balance FROM developers WHERE id = $1`, devID).Scan(&balance)
	return balance, err
}

// LogUsage registra uma chamada de API no log de uso.
func (s *CreditStore) LogUsage(ctx context.Context, devID, keyID uuid.UUID, pluginSlug, action, method, requestID string, statusCode int, credits float64, latencyMs int) {
	s.DB.Exec(ctx,
		`INSERT INTO usage_logs (developer_id, api_key_id, plugin_slug, action, method, status_code, credits_charged, latency_ms, request_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		devID, keyID, pluginSlug, action, method, statusCode, credits, latencyMs, requestID,
	)
}

// ========================================================================
// Structs de consulta
// ========================================================================

// CreditTransaction representa uma transação de créditos.
type CreditTransaction struct {
	ID           uuid.UUID `json:"id"`
	DeveloperID  uuid.UUID `json:"developer_id"`
	Amount       float64   `json:"amount"`
	Type         string    `json:"type"`
	Description  string    `json:"description"`
	PluginSlug   *string   `json:"plugin_slug,omitempty"`
	BalanceAfter float64   `json:"balance_after"`
	CreatedAt    time.Time `json:"created_at"`
}

// UsageLog representa um registro de uso de API.
type UsageLog struct {
	ID             uuid.UUID `json:"id"`
	DeveloperID    uuid.UUID `json:"developer_id"`
	APIKeyID       uuid.UUID `json:"api_key_id"`
	PluginSlug     string    `json:"plugin_slug"`
	Action         string    `json:"action"`
	Method         string    `json:"method"`
	StatusCode     int       `json:"status_code"`
	CreditsCharged float64   `json:"credits_charged"`
	LatencyMs      int       `json:"latency_ms"`
	RequestID      string    `json:"request_id"`
	CreatedAt      time.Time `json:"created_at"`
}

// UsageSummaryItem representa o resumo de uso por plugin.
type UsageSummaryItem struct {
	PluginSlug   string  `json:"plugin_slug"`
	TotalCalls   int     `json:"total_calls"`
	TotalCredits float64 `json:"total_credits"`
	AvgLatencyMs float64 `json:"avg_latency_ms"`
}

// ========================================================================
// Funções de consulta
// ========================================================================

// GetCreditHistory retorna o histórico de transações do desenvolvedor.
func (s *CreditStore) GetCreditHistory(ctx context.Context, devID uuid.UUID, txType string, limit, offset int) ([]CreditTransaction, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	var rows pgx.Rows
	var err error

	if txType != "" {
		rows, err = s.DB.Query(ctx,
			`SELECT id, developer_id, amount, type, description, plugin_slug, balance_after, created_at
			 FROM credit_transactions WHERE developer_id = $1 AND type = $2
			 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
			devID, txType, limit, offset,
		)
	} else {
		rows, err = s.DB.Query(ctx,
			`SELECT id, developer_id, amount, type, description, plugin_slug, balance_after, created_at
			 FROM credit_transactions WHERE developer_id = $1
			 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
			devID, limit, offset,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao consultar histórico: %w", err)
	}
	defer rows.Close()

	var txns []CreditTransaction
	for rows.Next() {
		var t CreditTransaction
		if err := rows.Scan(&t.ID, &t.DeveloperID, &t.Amount, &t.Type, &t.Description, &t.PluginSlug, &t.BalanceAfter, &t.CreatedAt); err != nil {
			continue
		}
		txns = append(txns, t)
	}
	if txns == nil {
		txns = []CreditTransaction{}
	}
	return txns, nil
}

// GetUsageLogs retorna os logs de uso do desenvolvedor com filtros.
func (s *CreditStore) GetUsageLogs(ctx context.Context, devID uuid.UUID, pluginSlug string, from, to *time.Time, limit, offset int) ([]UsageLog, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	// Construir query dinâmica
	query := `SELECT id, developer_id, api_key_id, plugin_slug, action, method, status_code, credits_charged, latency_ms, request_id, created_at
		 FROM usage_logs WHERE developer_id = $1`
	countQuery := `SELECT COUNT(*) FROM usage_logs WHERE developer_id = $1`
	args := []interface{}{devID}
	argIdx := 2

	if pluginSlug != "" {
		query += fmt.Sprintf(" AND plugin_slug = $%d", argIdx)
		countQuery += fmt.Sprintf(" AND plugin_slug = $%d", argIdx)
		args = append(args, pluginSlug)
		argIdx++
	}
	if from != nil {
		query += fmt.Sprintf(" AND created_at >= $%d", argIdx)
		countQuery += fmt.Sprintf(" AND created_at >= $%d", argIdx)
		args = append(args, *from)
		argIdx++
	}
	if to != nil {
		query += fmt.Sprintf(" AND created_at <= $%d", argIdx)
		countQuery += fmt.Sprintf(" AND created_at <= $%d", argIdx)
		args = append(args, *to)
		argIdx++
	}

	// Count total
	var total int
	s.DB.QueryRow(ctx, countQuery, args...).Scan(&total)

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := s.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("erro ao consultar usage: %w", err)
	}
	defer rows.Close()

	var logs []UsageLog
	for rows.Next() {
		var l UsageLog
		if err := rows.Scan(&l.ID, &l.DeveloperID, &l.APIKeyID, &l.PluginSlug, &l.Action, &l.Method, &l.StatusCode, &l.CreditsCharged, &l.LatencyMs, &l.RequestID, &l.CreatedAt); err != nil {
			continue
		}
		logs = append(logs, l)
	}
	if logs == nil {
		logs = []UsageLog{}
	}
	return logs, total, nil
}

// GetUsageSummary retorna o resumo mensal de uso agregado por plugin.
func (s *CreditStore) GetUsageSummary(ctx context.Context, devID uuid.UUID, from, to time.Time) ([]UsageSummaryItem, error) {
	rows, err := s.DB.Query(ctx,
		`SELECT plugin_slug, COUNT(*) as total_calls, COALESCE(SUM(credits_charged), 0) as total_credits, COALESCE(AVG(latency_ms), 0) as avg_latency
		 FROM usage_logs WHERE developer_id = $1 AND created_at >= $2 AND created_at <= $3
		 GROUP BY plugin_slug ORDER BY total_credits DESC`,
		devID, from, to,
	)
	if err != nil {
		return nil, fmt.Errorf("erro ao consultar resumo: %w", err)
	}
	defer rows.Close()

	var items []UsageSummaryItem
	for rows.Next() {
		var item UsageSummaryItem
		if err := rows.Scan(&item.PluginSlug, &item.TotalCalls, &item.TotalCredits, &item.AvgLatencyMs); err != nil {
			continue
		}
		items = append(items, item)
	}
	if items == nil {
		items = []UsageSummaryItem{}
	}
	return items, nil
}
