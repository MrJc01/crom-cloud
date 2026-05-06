ALTER TABLE key_permissions DROP CONSTRAINT IF EXISTS key_permissions_api_key_id_plugin_slug_key;
ALTER TABLE key_permissions ADD CONSTRAINT key_permissions_api_key_plugin_resource_key UNIQUE NULLS NOT DISTINCT (api_key_id, plugin_slug, resource_id);
