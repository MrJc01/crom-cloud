CREATE TABLE developer_secrets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id    UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    plugin_slug     VARCHAR(100) NOT NULL,
    secret_key      VARCHAR(100) NOT NULL,
    encrypted_value BYTEA NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(developer_id, plugin_slug, secret_key)
);
CREATE INDEX idx_secrets_dev_plugin ON developer_secrets(developer_id, plugin_slug);
