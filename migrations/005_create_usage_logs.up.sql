CREATE TABLE usage_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id    UUID NOT NULL REFERENCES developers(id),
    api_key_id      UUID REFERENCES api_keys(id),
    plugin_slug     VARCHAR(100) NOT NULL,
    action          VARCHAR(255) NOT NULL,
    method          VARCHAR(10) NOT NULL,
    status_code     INTEGER NOT NULL,
    credits_charged DECIMAL(12,2) NOT NULL DEFAULT 0,
    latency_ms      INTEGER,
    request_id      VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_usage_dev ON usage_logs(developer_id, created_at DESC);
CREATE INDEX idx_usage_plugin ON usage_logs(plugin_slug, created_at DESC);
