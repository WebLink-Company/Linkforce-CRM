-- Drop existing sync function
DROP FUNCTION IF EXISTS sync_admin_profiles() CASCADE;

-- Create improved sync function without schema-qualified types
CREATE OR REPLACE FUNCTION sync_admin_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    -- Sync to quimicinter schema
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
      NEW.full_name,
      'admin',
      'active',
      'quimicinter',
      now(),
      now()
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      updated_at = now();

    -- Sync to qalinkforce schema
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
      NEW.full_name,
      'admin',
      'active',
      'qalinkforce',
      now(),
      now()
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for admin sync
CREATE TRIGGER sync_admin_profiles_trigger
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'admin')
  EXECUTE FUNCTION sync_admin_profiles();

-- Update existing admin users
UPDATE public.profiles 
SET role = 'admin'
WHERE email IN (
  'julioverasb@gmail.com',
  'julioesar@sediweb.com'
);