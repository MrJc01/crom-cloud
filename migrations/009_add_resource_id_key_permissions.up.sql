DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'key_permissions' AND column_name = 'resource_id'
    ) THEN
        ALTER TABLE key_permissions ADD COLUMN resource_id VARCHAR(255);
    END IF;
END
$$;
