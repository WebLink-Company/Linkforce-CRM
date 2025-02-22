-- Schema Sync Migration
-- This migration synchronizes all schemas with their required structure

-- Create required types in each schema
DO $$ 
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['qalinkforce', 'quimicinter'])
  LOOP
    -- Create types if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = schema_name AND t.typname = 'user_role') THEN
      EXECUTE format('CREATE TYPE %I.user_role AS ENUM (''admin'', ''manager'', ''user'')', schema_name);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = schema_name AND t.typname = 'user_status') THEN
      EXECUTE format('CREATE TYPE %I.user_status AS ENUM (''active'', ''inactive'', ''pending'')', schema_name);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = schema_name AND t.typname = 'movement_type') THEN
      EXECUTE format('CREATE TYPE %I.movement_type AS ENUM (''in'', ''out'', ''adjustment'')', schema_name);
    END IF;
  END LOOP;
END $$;

-- Function to sync table structure
CREATE OR REPLACE FUNCTION sync_table_structure(p_source_schema text, p_target_schema text, p_table_name text)
RETURNS void AS $$
DECLARE
  v_column record;
  v_constraint record;
  v_index record;
BEGIN
  -- Create table if it doesn't exist
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.%I (LIKE %I.%I INCLUDING ALL)',
    p_target_schema, p_table_name,
    p_source_schema, p_table_name
  );

  -- Sync columns
  FOR v_column IN
    SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = p_source_schema AND table_name = p_table_name
  LOOP
    -- Add column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = p_target_schema
      AND table_name = p_table_name
      AND column_name = v_column.column_name
    ) THEN
      EXECUTE format('
        ALTER TABLE %I.%I ADD COLUMN %I %s%s%s%s',
        p_target_schema, p_table_name,
        v_column.column_name,
        v_column.data_type,
        CASE WHEN v_column.character_maximum_length IS NOT NULL 
          THEN '(' || v_column.character_maximum_length || ')'
          ELSE ''
        END,
        CASE WHEN v_column.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
        CASE WHEN v_column.column_default IS NOT NULL 
          THEN ' DEFAULT ' || v_column.column_default
          ELSE ''
        END
      );
    END IF;
  END LOOP;

  -- Sync constraints
  FOR v_constraint IN
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = p_source_schema)
    AND conrelid = (p_source_schema || '.' || p_table_name)::regclass::oid
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = p_target_schema)
      AND conrelid = (p_target_schema || '.' || p_table_name)::regclass::oid
      AND conname = v_constraint.conname
    ) THEN
      EXECUTE format('
        ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
        p_target_schema, p_table_name,
        v_constraint.conname,
        v_constraint.def
      );
    END IF;
  END LOOP;

  -- Sync indexes
  FOR v_index IN
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = p_source_schema
    AND tablename = p_table_name
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = p_target_schema
      AND tablename = p_table_name
      AND indexname = v_index.indexname
    ) THEN
      EXECUTE replace(v_index.indexdef, p_source_schema, p_target_schema);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to sync RLS policies
CREATE OR REPLACE FUNCTION sync_rls_policies(p_source_schema text, p_target_schema text, p_table_name text)
RETURNS void AS $$
DECLARE
  v_policy record;
BEGIN
  -- Enable RLS
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', p_target_schema, p_table_name);

  -- Drop existing policies
  FOR v_policy IN (
    SELECT polname
    FROM pg_policy pol
    JOIN pg_class pc ON pol.polrelid = pc.oid
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = p_target_schema
    AND pc.relname = p_table_name
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      v_policy.polname, p_target_schema, p_table_name);
  END LOOP;

  -- Create new policies
  FOR v_policy IN (
    SELECT 
      pol.polname,
      pol.polcmd,
      array_to_string(pol.polroles::text[], ',') as roles,
      pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
      pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expr
    FROM pg_policy pol
    JOIN pg_class pc ON pol.polrelid = pc.oid
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = p_source_schema
    AND pc.relname = p_table_name
  ) LOOP
    EXECUTE format('
      CREATE POLICY %I ON %I.%I
      FOR %s TO %s
      %s %s',
      v_policy.polname,
      p_target_schema,
      p_table_name,
      v_policy.polcmd,
      v_policy.roles,
      CASE WHEN v_policy.using_expr IS NOT NULL THEN 'USING (' || v_policy.using_expr || ')' ELSE '' END,
      CASE WHEN v_policy.check_expr IS NOT NULL THEN 'WITH CHECK (' || v_policy.check_expr || ')' ELSE '' END
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to sync schema
CREATE OR REPLACE FUNCTION sync_schema(p_source_schema text, p_target_schema text)
RETURNS void AS $$
DECLARE
  v_table record;
  v_function record;
  v_trigger record;
BEGIN
  -- Create schema if it doesn't exist
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_target_schema);

  -- Sync tables and their components
  FOR v_table IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = p_source_schema
  ) LOOP
    -- Sync table structure
    PERFORM sync_table_structure(p_source_schema, p_target_schema, v_table.tablename);
    
    -- Sync RLS policies
    PERFORM sync_rls_policies(p_source_schema, p_target_schema, v_table.tablename);
  END LOOP;

  -- Sync functions
  FOR v_function IN (
    SELECT proname, prosrc
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = p_source_schema
  ) LOOP
    -- Replace schema references in function definition
    EXECUTE replace(v_function.prosrc, p_source_schema, p_target_schema);
  END LOOP;

  -- Sync triggers
  FOR v_trigger IN (
    SELECT 
      tgname,
      tgrelid::regclass::text as table_name,
      pg_get_triggerdef(oid) as definition
    FROM pg_trigger
    WHERE tgrelid::regclass::text LIKE p_source_schema || '.%'
  ) LOOP
    -- Replace schema references in trigger definition
    EXECUTE replace(v_trigger.definition, p_source_schema, p_target_schema);
  END LOOP;

  -- Grant permissions
  EXECUTE format('
    GRANT USAGE ON SCHEMA %I TO authenticated;
    GRANT USAGE ON SCHEMA %I TO anon;
    GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA %I TO authenticated;
  ', p_target_schema, p_target_schema, p_target_schema, p_target_schema, p_target_schema);
END;
$$ LANGUAGE plpgsql;

-- Sync schemas
DO $$ 
BEGIN
  -- Sync qalinkforce schema
  PERFORM sync_schema('public', 'qalinkforce');
  RAISE NOTICE 'Synchronized qalinkforce schema';

  -- Sync quimicinter schema
  PERFORM sync_schema('public', 'quimicinter');
  RAISE NOTICE 'Synchronized quimicinter schema';
END $$;