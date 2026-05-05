CREATE TABLE credit_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id    UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    amount          DECIMAL(12,2) NOT NULL,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'debit', 'refund', 'bonus')),
    description     VARCHAR(500),
    plugin_slug     VARCHAR(100),
    balance_after   DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_credit_tx_dev ON credit_transactions(developer_id, created_at DESC);
