-- Create function to create user profile
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_schema text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create or update profile in specified schema
  EXECUTE format('
    INSERT INTO %I.profiles (
      id,
      full_name,
      role,
      status,
      schema_name,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3::user_role, ''active''::user_status, $4, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      updated_at = now()
  ', p_schema)
  USING p_user_id, p_full_name, p_role, p_schema;
END;
$$;

-- Create function to sync admin profile
CREATE OR REPLACE FUNCTION sync_admin_profile(
  p_user_id uuid,
  p_full_name text,
  p_target_schema text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create or update admin profile in target schema
  EXECUTE format('
    INSERT INTO %I.profiles (
      id,
      full_name,
      role,
      status,
      schema_name,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, ''admin''::user_role, ''active''::user_status, $3, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = ''admin''::user_role,
      updated_at = now()
  ', p_target_schema)
  USING p_user_id, p_full_name, p_target_schema;
END;
$$;