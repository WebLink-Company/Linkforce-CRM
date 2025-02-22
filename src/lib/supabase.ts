import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Initialize Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage
  },
  global: {
    headers: {
      'x-application-name': 'quimicinter-erp'
    }
  }
});

// Helper function to get current schema
export const getCurrentSchema = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (hostname.includes('qa')) return 'qalinkforce';
    if (hostname.includes('quimicinter')) return 'quimicinter';
  }
  return 'public';
};

// Helper function to create a query builder with the correct schema
export const createSchemaBuilder = (table: string) => {
  const schema = getCurrentSchema();
  return supabase.from(table).select('*').set({ schema });
};