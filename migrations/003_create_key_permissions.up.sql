CREATE TABLE key_permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id  UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    plugin_slug VARCHAR(100) NOT NULL,
    scope       VARCHAR(20) NOT NULL DEFAULT 'read',
    UNIQUE(api_key_id, plugin_slug)
);
CREATE INDEX idx_key_permissions_key ON key_permissions(api_key_id);
