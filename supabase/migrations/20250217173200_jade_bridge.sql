-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON auth.users;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON auth.users;

-- Create policies for auth.users
CREATE POLICY "Enable insert for authenticated users"
  ON auth.users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON auth.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create trigger function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_schema text;
BEGIN
  -- Get schema from request headers
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );

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
      ''user''::user_role,
      ''active''::user_status,
      $3,
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING
  ', v_schema)
  USING 
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_schema;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO anon, authenticated;

-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create function to validate user creation
CREATE OR REPLACE FUNCTION validate_user_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate email format
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Ensure raw_user_meta_data contains required fields
  IF NEW.raw_user_meta_data->>'full_name' IS NULL THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger
DROP TRIGGER IF EXISTS validate_new_user ON auth.users;
CREATE TRIGGER validate_new_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_creation();

-- Create function to get current schema
CREATE OR REPLACE FUNCTION get_current_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );
END;
$$;

-- Create function to check if user exists
CREATE OR REPLACE FUNCTION check_user_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  );
END;
$$;