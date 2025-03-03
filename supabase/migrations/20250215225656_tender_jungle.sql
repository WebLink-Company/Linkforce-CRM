-- Function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_schema text;
BEGIN
  -- Get schema from request headers
  v_schema := COALESCE(
    current_setting('request.headers', true)::json->>'x-schema-name',
    'public'
  );

  -- Delete profile from current schema
  EXECUTE format('
    DELETE FROM %I.profiles 
    WHERE id = $1 
    AND schema_name = $2
  ', v_schema) 
  USING OLD.id, v_schema;

  -- If user is admin, delete from all schemas
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = OLD.id 
    AND role::text = 'admin'
  ) THEN
    -- Delete from quimicinter schema
    DELETE FROM quimicinter.profiles 
    WHERE id = OLD.id;

    -- Delete from qalinkforce schema
    DELETE FROM qalinkforce.profiles 
    WHERE id = OLD.id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_user_deleted ON auth.users;
CREATE TRIGGER on_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();