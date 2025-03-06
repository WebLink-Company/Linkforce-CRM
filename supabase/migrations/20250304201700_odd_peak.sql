-- Create function to handle user creation without auto-login
CREATE OR REPLACE FUNCTION create_user_without_login(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_schema text,
  p_creator_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_profile_exists boolean;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE email = p_email
  ) INTO v_profile_exists;

  IF v_profile_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User already exists'
    );
  END IF;

  -- Create auth user with metadata
  INSERT INTO auth.users (
    email,
    encrypted_password,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_confirmed_at
  ) VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    jsonb_build_object(
      'full_name', p_full_name,
      'role', p_role,
      'schema_name', p_schema,
      'created_by', p_creator_id
    ),
    now(),
    now(),
    encode(gen_random_bytes(32), 'hex'),
    now()  -- Auto-confirm email
  )
  RETURNING id INTO v_user_id;

  -- Return success without triggering auto-login
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'User created successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Update handle_new_auth_user to prevent auto-login for new users
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_role text;
  v_creator_id uuid;
BEGIN
  -- Get schema from metadata or default to public
  v_schema := COALESCE(
    NEW.raw_user_meta_data->>'schema_name',
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );

  -- Get role from metadata or determine based on schema
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE schema_name = v_schema
      ) THEN 'admin'
      ELSE 'user'
    END
  );

  -- Get creator ID from metadata
  v_creator_id := (NEW.raw_user_meta_data->>'created_by')::uuid;

  -- Create profile in appropriate schema
  CASE v_schema
    WHEN 'public' THEN
      INSERT INTO profiles (
        id,
        email,
        full_name,
        role,
        status,
        schema_name,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        public.cast_to_user_role(v_role),
        'active',
        v_schema,
        now(),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();

    WHEN 'quimicinter' THEN
      INSERT INTO quimicinter.profiles (
        id,
        email,
        full_name,
        role,
        status,
        schema_name,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        quimicinter.cast_to_user_role(v_role),
        'active',
        v_schema,
        now(),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();

    WHEN 'qalinkforce' THEN
      INSERT INTO qalinkforce.profiles (
        id,
        email,
        full_name,
        role,
        status,
        schema_name,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        qalinkforce.cast_to_user_role(v_role),
        'active',
        v_schema,
        now(),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();
  END CASE;

  -- If this is a new user created by another user, restore creator's session
  IF v_creator_id IS NOT NULL THEN
    -- This is a placeholder - actual session restoration happens in the application
    NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_user_without_login(text, text, text, text, text, uuid) TO authenticated;