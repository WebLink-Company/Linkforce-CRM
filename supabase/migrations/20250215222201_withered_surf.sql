-- Create required types in public schema
CREATE TYPE IF NOT EXISTS public.user_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE IF NOT EXISTS public.user_status AS ENUM ('active', 'inactive', 'pending');

-- Add role column to quimicinter.profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'quimicinter' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE quimicinter.profiles 
    ADD COLUMN role public.user_role NOT NULL DEFAULT 'user'::public.user_role;
  END IF;
END $$;

-- Add role column to qalinkforce.profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'qalinkforce' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE qalinkforce.profiles 
    ADD COLUMN role public.user_role NOT NULL DEFAULT 'user'::public.user_role;
  END IF;
END $$;

-- Update RLS policies to use role column
DO $$
BEGIN
  -- Update quimicinter schema policies
  DROP POLICY IF EXISTS "schema_based_select" ON quimicinter.profiles;
  CREATE POLICY "schema_based_select" ON quimicinter.profiles
    FOR SELECT TO authenticated
    USING (
      schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'quimicinter')
      OR role::text = 'admin'
    );

  -- Update qalinkforce schema policies
  DROP POLICY IF EXISTS "schema_based_select" ON qalinkforce.profiles;
  CREATE POLICY "schema_based_select" ON qalinkforce.profiles
    FOR SELECT TO authenticated
    USING (
      schema_name = COALESCE(current_setting('request.headers', true)::json->>'x-schema-name', 'qalinkforce')
      OR role::text = 'admin'
    );
END $$;