-- Schema Backup Script for qalinkforce and quimicinter
-- Generated: 2025-02-22

-- Function to backup schema
CREATE OR REPLACE FUNCTION backup_schema(p_source_schema text, p_target_schema text)
RETURNS void AS $$
DECLARE
  v_table record;
  v_function record;
  v_trigger record;
  v_policy record;
  v_constraint record;
  v_sequence record;
  v_type record;
BEGIN
  -- Create backup schema
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_target_schema);
  EXECUTE format('CREATE SCHEMA %I', p_target_schema);

  -- Copy custom types
  FOR v_type IN (
    SELECT t.typname, pg_catalog.format_type(t.oid, NULL) AS full_type
    FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = p_source_schema
    AND t.typtype = 'e'  -- enum types
  ) LOOP
    EXECUTE format(
      'CREATE TYPE %I.%I AS %s',
      p_target_schema,
      v_type.typname,
      v_type.full_type
    );
  END LOOP;

  -- Copy tables with data
  FOR v_table IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = p_source_schema
  ) LOOP
    -- Create table
    EXECUTE format(
      'CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)',
      p_target_schema,
      v_table.tablename,
      p_source_schema,
      v_table.tablename
    );
    
    -- Copy data
    EXECUTE format(
      'INSERT INTO %I.%I SELECT * FROM %I.%I',
      p_target_schema,
      v_table.tablename,
      p_source_schema,
      v_table.tablename
    );
  END LOOP;

  -- Copy sequences
  FOR v_sequence IN (
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = p_source_schema
  ) LOOP
    EXECUTE format(
      'CREATE SEQUENCE %I.%I',
      p_target_schema,
      v_sequence.sequence_name
    );
    
    -- Set sequence value
    EXECUTE format(
      'SELECT setval(%L, (SELECT last_value FROM %I.%I))',
      p_target_schema || '.' || v_sequence.sequence_name,
      p_source_schema,
      v_sequence.sequence_name
    );
  END LOOP;

  -- Copy functions
  FOR v_function IN (
    SELECT 
      p.proname,
      pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = p_source_schema
  ) LOOP
    -- Replace schema name in function definition
    EXECUTE replace(
      v_function.definition,
      p_source_schema,
      p_target_schema
    );
  END LOOP;

  -- Copy triggers
  FOR v_trigger IN (
    SELECT 
      tgname,
      tgrelid::regclass::text as table_name,
      pg_get_triggerdef(oid) as definition
    FROM pg_trigger
    WHERE tgrelid::regclass::text LIKE p_source_schema || '.%'
  ) LOOP
    -- Replace schema name in trigger definition
    EXECUTE replace(
      v_trigger.definition,
      p_source_schema,
      p_target_schema
    );
  END LOOP;

  -- Copy RLS policies
  FOR v_policy IN (
    SELECT 
      polname,
      tablename,
      pg_get_expr(polqual, polrelid) as using_expr,
      pg_get_expr(polwithcheck, polrelid) as check_expr,
      polcmd,
      polroles
    FROM pg_policy pol
    JOIN pg_class pc ON pol.polrelid = pc.oid
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = p_source_schema
  ) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I FOR %s TO %s %s %s',
      v_policy.polname,
      p_target_schema,
      v_policy.tablename,
      v_policy.polcmd,
      array_to_string(v_policy.polroles::text[], ','),
      CASE WHEN v_policy.using_expr IS NOT NULL 
        THEN 'USING (' || v_policy.using_expr || ')'
        ELSE ''
      END,
      CASE WHEN v_policy.check_expr IS NOT NULL 
        THEN 'WITH CHECK (' || v_policy.check_expr || ')'
        ELSE ''
      END
    );
  END LOOP;

  -- Enable RLS on tables
  FOR v_table IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = p_source_schema
  ) LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      p_target_schema,
      v_table.tablename
    );
  END LOOP;

  -- Grant necessary permissions
  EXECUTE format('
    GRANT USAGE ON SCHEMA %I TO authenticated;
    GRANT USAGE ON SCHEMA %I TO anon;
    GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA %I TO authenticated;
  ', p_target_schema, p_target_schema, p_target_schema, p_target_schema, p_target_schema);

END;
$$ LANGUAGE plpgsql;

-- Create backup schemas with timestamp
DO $$ 
DECLARE
  v_timestamp text := to_char(current_timestamp, 'YYYYMMDD_HH24MISS');
  v_qalinkforce_backup text := 'qalinkforce_backup_' || v_timestamp;
  v_quimicinter_backup text := 'quimicinter_backup_' || v_timestamp;
BEGIN
  -- Backup qalinkforce schema
  PERFORM backup_schema('qalinkforce', v_qalinkforce_backup);
  RAISE NOTICE 'Backed up qalinkforce schema to %', v_qalinkforce_backup;

  -- Backup quimicinter schema
  PERFORM backup_schema('quimicinter', v_quimicinter_backup);
  RAISE NOTICE 'Backed up quimicinter schema to %', v_quimicinter_backup;
END $$;