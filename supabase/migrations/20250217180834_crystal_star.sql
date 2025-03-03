-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_state_change ON auth.users;

-- Create improved function to handle new auth users
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_role text;
  v_profile_exists boolean;
BEGIN
  -- Get schema from request headers
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );

  -- Check if profile already exists in this schema
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM %I.profiles
      WHERE id = $1
    )', v_schema)
  INTO v_profile_exists
  USING NEW.id;

  -- If profile exists, just return
  IF v_profile_exists THEN
    RETURN NEW;
  END IF;

  -- Determine role (admin for first user in schema)
  SELECT 
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE schema_name = v_schema
      ) THEN 'admin'
      ELSE 'user'
    END INTO v_role;

  -- Create profile in appropriate schema
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
      $1,
      $2,
      $3::user_role,
      ''active''::user_status,
      $4,
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING
  ', v_schema)
  USING 
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_schema;

  -- If admin, create profiles in other schemas too
  IF v_role = 'admin' THEN
    -- Create in quimicinter
    IF v_schema != 'quimicinter' THEN
      INSERT INTO quimicinter.profiles (
        id, full_name, role, status, schema_name, created_at, updated_at
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'admin'::user_role,
        'active'::user_status,
        'quimicinter',
        now(),
        now()
      ) ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Create in qalinkforce
    IF v_schema != 'qalinkforce' THEN
      INSERT INTO qalinkforce.profiles (
        id, full_name, role, status, schema_name, created_at, updated_at
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'admin'::user_role,
        'active'::user_status,
        'qalinkforce',
        now(),
        now()
      ) ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- Update RLS policies
DO $$
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['public', 'quimicinter', 'qalinkforce'])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Users can view profiles in their schema" ON %I.profiles;
      DROP POLICY IF EXISTS "Users can update own profile" ON %I.profiles;
      DROP POLICY IF EXISTS "New users can be created in current schema" ON %I.profiles;

      CREATE POLICY "Users can view profiles in their schema"
        ON %I.profiles FOR SELECT
        TO authenticated
        USING (
          schema_name = COALESCE(current_setting(''request.headers'', true)::json->>''x-schema-name'', ''public'')
          OR role::text = ''admin''
        );

      CREATE POLICY "Users can update own profile"
        ON %I.profiles FOR UPDATE
        TO authenticated
        USING (
          auth.uid() = id 
          OR (
            role::text = ''admin'' 
            AND schema_name = COALESCE(current_setting(''request.headers'', true)::json->>''x-schema-name'', ''public'')
          )
        )
        WITH CHECK (
          auth.uid() = id 
          OR (
            role::text = ''admin'' 
            AND schema_name = COALESCE(current_setting(''request.headers'', true)::json->>''x-schema-name'', ''public'')
          )
        );

      CREATE POLICY "New users can be created in current schema"
        ON %I.profiles FOR INSERT
        TO authenticated
        WITH CHECK (
          schema_name = COALESCE(current_setting(''request.headers'', true)::json->>''x-schema-name'', ''public'')
          OR EXISTS (
            SELECT 1 FROM %I.profiles
            WHERE id = auth.uid()
            AND role::text = ''admin''
          )
        );
    ', 
    schema_name, schema_name, schema_name,
    schema_name, schema_name, schema_name,
    schema_name);
  END LOOP;
END $$;