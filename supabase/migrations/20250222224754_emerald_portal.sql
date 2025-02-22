-- Script to list available schema backups

CREATE OR REPLACE FUNCTION list_schema_backups()
RETURNS TABLE (
  backup_name text,
  backup_date timestamp,
  schema_name text,
  table_count bigint,
  total_rows bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH schema_backups AS (
    SELECT 
      nspname as schema_name,
      CASE 
        WHEN nspname LIKE 'qalinkforce_backup_%' THEN 'qalinkforce'
        WHEN nspname LIKE 'quimicinter_backup_%' THEN 'quimicinter'
      END as original_schema,
      to_timestamp(
        substring(nspname from '_backup_(\d{8}_\d{6})$'),
        'YYYYMMDD_HH24MISS'
      ) as backup_timestamp
    FROM pg_namespace
    WHERE nspname LIKE '%_backup_%'
  )
  SELECT 
    sb.schema_name,
    sb.backup_timestamp,
    sb.original_schema,
    COUNT(DISTINCT tables.table_name)::bigint as table_count,
    COALESCE(SUM(tables.row_count), 0)::bigint as total_rows
  FROM schema_backups sb
  LEFT JOIN (
    SELECT 
      table_schema,
      table_name,
      (xpath('/row/c/text()', query_to_xml(format('SELECT COUNT(*) as c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint as row_count
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
  ) tables ON tables.table_schema = sb.schema_name
  GROUP BY sb.schema_name, sb.backup_timestamp, sb.original_schema
  ORDER BY sb.backup_timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM list_schema_backups();