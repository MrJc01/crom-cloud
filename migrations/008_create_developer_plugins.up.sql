CREATE TABLE developer_plugins (
    developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    plugin_slug VARCHAR(100) NOT NULL REFERENCES plugin_registry(slug) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (developer_id, plugin_slug)
);
