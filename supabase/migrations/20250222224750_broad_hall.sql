-- Schema Restore Script
-- This script restores a backed up schema to its original name

CREATE OR REPLACE FUNCTION restore_schema(
  p_backup_schema text,
  p_target_schema text
)
RETURNS void AS $$
BEGIN
  -- Drop target schema if exists
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_target_schema);
  
  -- Rename backup schema to target
  EXECUTE format('ALTER SCHEMA %I RENAME TO %I', p_backup_schema, p_target_schema);
  
  -- Re-grant permissions
  EXECUTE format('
    GRANT USAGE ON SCHEMA %I TO authenticated;
    GRANT USAGE ON SCHEMA %I TO anon;
    GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA %I TO authenticated;
  ', p_target_schema, p_target_schema, p_target_schema, p_target_schema, p_target_schema);
  
  RAISE NOTICE 'Successfully restored schema % from backup %', p_target_schema, p_backup_schema;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT restore_schema('qalinkforce_backup_20250222_120000', 'qalinkforce');
-- SELECT restore_schema('quimicinter_backup_20250222_120000', 'quimicinter');