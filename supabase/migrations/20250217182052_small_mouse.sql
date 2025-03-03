-- Add email column to profiles in each schema
-- Public schema
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_public_profiles_email 
  ON public.profiles(email);

-- Quimicinter schema
ALTER TABLE quimicinter.profiles 
ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_quimicinter_profiles_email 
  ON quimicinter.profiles(email);

-- Qalinkforce schema
ALTER TABLE qalinkforce.profiles 
ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_qalinkforce_profiles_email 
  ON qalinkforce.profiles(email);

-- Update handle_new_auth_user function to include email
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
      OR email = $2
    )', v_schema)
  INTO v_profile_exists
  USING NEW.id, NEW.email;

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
      email,
      full_name,
      role,
      status,
      schema_name,
      created_at,
      updated_at
    ) VALUES (
      $1,
      $2,
      $3,
      $4::user_role,
      ''active''::user_status,
      $5,
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING
  ', v_schema)
  USING 
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_schema;

  -- If admin, create profiles in other schemas too
  IF v_role = 'admin' THEN
    -- Create in quimicinter
    IF v_schema != 'quimicinter' THEN
      INSERT INTO quimicinter.profiles (
        id, email, full_name, role, status, schema_name, created_at, updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
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
        id, email, full_name, role, status, schema_name, created_at, updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
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

-- Create function to validate login schema access
CREATE OR REPLACE FUNCTION validate_login_access(user_id uuid, p_schema text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists boolean;
BEGIN
  -- Check if user has a profile in the target schema
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM %I.profiles
      WHERE id = $1
    )', p_schema)
  INTO v_profile_exists
  USING user_id;

  RETURN v_profile_exists;
END;
$$;

-- Update existing profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;

UPDATE quimicinter.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;

UPDATE qalinkforce.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;