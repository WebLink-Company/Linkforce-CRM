/*
  # Update Profile RLS Policies

  1. Changes
    - Add policy to allow profile creation during signup
    - Update existing policies for better security

  2. Security
    - Enable RLS on profiles table (already enabled)
    - Add policy for profile creation during signup
    - Maintain existing policies for profile viewing and updates
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for service role"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Enable update for service role"
  ON profiles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);