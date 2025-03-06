-- Function to safely cast text to user_role for each schema
CREATE OR REPLACE FUNCTION public.cast_to_user_role(v_role text)
RETURNS public.user_role
LANGUAGE plpgsql
AS $$
BEGIN
  CASE v_role
    WHEN 'admin' THEN RETURN 'admin'::public.user_role;
    WHEN 'manager' THEN RETURN 'manager'::public.user_role;
    WHEN 'user' THEN RETURN 'user'::public.user_role;
    ELSE RAISE EXCEPTION 'Invalid role: %', v_role;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION quimicinter.cast_to_user_role(v_role text)
RETURNS quimicinter.user_role
LANGUAGE plpgsql
AS $$
BEGIN
  CASE v_role
    WHEN 'admin' THEN RETURN 'admin'::quimicinter.user_role;
    WHEN 'manager' THEN RETURN 'manager'::quimicinter.user_role;
    WHEN 'user' THEN RETURN 'user'::quimicinter.user_role;
    ELSE RAISE EXCEPTION 'Invalid role: %', v_role;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION qalinkforce.cast_to_user_role(v_role text)
RETURNS qalinkforce.user_role
LANGUAGE plpgsql
AS $$
BEGIN
  CASE v_role
    WHEN 'admin' THEN RETURN 'admin'::qalinkforce.user_role;
    WHEN 'manager' THEN RETURN 'manager'::qalinkforce.user_role;
    WHEN 'user' THEN RETURN 'user'::qalinkforce.user_role;
    ELSE RAISE EXCEPTION 'Invalid role: %', v_role;
  END CASE;
END;
$$;

-- Update handle_new_auth_user function to use schema-specific casting
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_role text;
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

  -- Create profile in appropriate schema using schema-specific casting
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

  RETURN NEW;
END;
$$;

-- Fix any invalid roles in each schema using schema-specific casting
DO $$ 
BEGIN
  -- Public schema
  UPDATE profiles 
  SET role = public.cast_to_user_role('user')
  WHERE role::text NOT IN ('admin', 'manager', 'user');

  -- Quimicinter schema
  UPDATE quimicinter.profiles 
  SET role = quimicinter.cast_to_user_role('user')
  WHERE role::text NOT IN ('admin', 'manager', 'user');

  -- Qalinkforce schema
  UPDATE qalinkforce.profiles 
  SET role = qalinkforce.cast_to_user_role('user')
  WHERE role::text NOT IN ('admin', 'manager', 'user');
END $$;