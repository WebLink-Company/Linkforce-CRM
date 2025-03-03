-- Create required schemas
CREATE SCHEMA IF NOT EXISTS qalinkforce;
CREATE SCHEMA IF NOT EXISTS quimicinter;

-- Create ENUM types in new schemas
DO $$ 
BEGIN
  CREATE TYPE qalinkforce.user_role AS ENUM ('admin', 'manager', 'user');
  CREATE TYPE qalinkforce.user_status AS ENUM ('active', 'inactive', 'pending');
  CREATE TYPE qalinkforce.movement_type AS ENUM ('in', 'out', 'adjustment');

  CREATE TYPE quimicinter.user_role AS ENUM ('admin', 'manager', 'user');
  CREATE TYPE quimicinter.user_status AS ENUM ('active', 'inactive', 'pending');
  CREATE TYPE quimicinter.movement_type AS ENUM ('in', 'out', 'adjustment');
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

-- Create tables in qalinkforce schema
CREATE TABLE IF NOT EXISTS qalinkforce.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  role qalinkforce.user_role NOT NULL DEFAULT 'user',
  status qalinkforce.user_status NOT NULL DEFAULT 'pending',
  phone_number text,
  last_login timestamptz,
  schema_name text NOT NULL DEFAULT 'qalinkforce',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qalinkforce.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'individual',
  identification_number text UNIQUE NOT NULL,
  full_name text NOT NULL,
  commercial_name text,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  postal_code text,
  country text,
  website text,
  industry_sector text,
  contact_name text,
  contact_position text,
  contact_phone text,
  invoice_type text,
  payment_terms text,
  preferred_currency text DEFAULT 'DOP',
  credit_limit numeric DEFAULT 0,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT valid_type CHECK (type IN ('individual', 'corporate'))
);

-- Create tables in quimicinter schema
CREATE TABLE IF NOT EXISTS quimicinter.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  role quimicinter.user_role NOT NULL DEFAULT 'user',
  status quimicinter.user_status NOT NULL DEFAULT 'pending',
  phone_number text,
  last_login timestamptz,
  schema_name text NOT NULL DEFAULT 'quimicinter',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quimicinter.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'individual',
  identification_number text UNIQUE NOT NULL,
  full_name text NOT NULL,
  commercial_name text,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  postal_code text,
  country text,
  website text,
  industry_sector text,
  contact_name text,
  contact_position text,
  contact_phone text,
  invoice_type text,
  payment_terms text,
  preferred_currency text DEFAULT 'DOP',
  credit_limit numeric DEFAULT 0,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT valid_type CHECK (type IN ('individual', 'corporate'))
);

-- Enable RLS on all tables
ALTER TABLE qalinkforce.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qalinkforce.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quimicinter.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quimicinter.customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for qalinkforce schema
CREATE POLICY "profiles_read_policy" ON qalinkforce.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert_policy" ON qalinkforce.profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "profiles_update_policy" ON qalinkforce.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM qalinkforce.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "customers_read_policy" ON qalinkforce.customers
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "customers_insert_policy" ON qalinkforce.customers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "customers_update_policy" ON qalinkforce.customers
  FOR UPDATE TO authenticated USING (true);

-- Create RLS policies for quimicinter schema
CREATE POLICY "profiles_read_policy" ON quimicinter.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert_policy" ON quimicinter.profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "profiles_update_policy" ON quimicinter.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM quimicinter.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "customers_read_policy" ON quimicinter.customers
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "customers_insert_policy" ON quimicinter.customers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "customers_update_policy" ON quimicinter.customers
  FOR UPDATE TO authenticated USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_qalinkforce_customers_identification ON qalinkforce.customers(identification_number);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_customers_email ON qalinkforce.customers(email);
CREATE INDEX IF NOT EXISTS idx_qalinkforce_customers_type ON qalinkforce.customers(type);

CREATE INDEX IF NOT EXISTS idx_quimicinter_customers_identification ON quimicinter.customers(identification_number);
CREATE INDEX IF NOT EXISTS idx_quimicinter_customers_email ON quimicinter.customers(email);
CREATE INDEX IF NOT EXISTS idx_quimicinter_customers_type ON quimicinter.customers(type);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA qalinkforce TO authenticated;
GRANT USAGE ON SCHEMA qalinkforce TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA qalinkforce TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA qalinkforce TO authenticated;

GRANT USAGE ON SCHEMA quimicinter TO authenticated;
GRANT USAGE ON SCHEMA quimicinter TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA quimicinter TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA quimicinter TO authenticated;