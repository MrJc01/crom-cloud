-- Plugin Registry: registro persistente de plugins no banco de dados
CREATE TABLE IF NOT EXISTS plugin_registry (
    slug                VARCHAR(100) PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    version             VARCHAR(20) NOT NULL,
    icon                VARCHAR(50),
    default_credit_cost INTEGER NOT NULL DEFAULT 1,
    status              VARCHAR(20) NOT NULL DEFAULT 'active',
    required_secrets    JSONB,
    config              JSONB,
    registered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
