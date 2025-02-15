import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Determine schema based on hostname
const getSchema = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('qa') ? 'qalinkforce' : 'public';
  }
  return 'public'; // Default to public schema
};

// Create Supabase client with dynamic schema
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: getSchema()
  },
  global: {
    headers: {
      'x-application-name': 'linkforce-erp'
    }
  }
});

// Helper function to get current schema
export const getCurrentSchema = () => getSchema();

// Helper function to create a query builder with the correct schema
export const createSchemaBuilder = (table: string) => {
  return supabase.from(table).schema(getSchema());
};

// Example usage:
// Instead of: supabase.from('users').select('*')
// Use: createSchemaBuilder('users').select('*')