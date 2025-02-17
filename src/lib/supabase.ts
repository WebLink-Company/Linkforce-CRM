import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Determine schema dynamically based on hostname
const getCurrentSchema = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (hostname.includes('qa')) return 'qalinkforce';
    if (hostname.includes('quimicinter')) return 'quimicinter';
  }
  return 'public'; // Default to production
};

// Initialize Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage // Explicitly set storage to localStorage
  },
  global: {
    headers: {
      'x-application-name': 'quimicinter-erp',
      'x-schema-name': getCurrentSchema()
    }
  },
  db: {
    schema: getCurrentSchema() // Use dynamic schema
  }
});

// Helper function to create a query builder with the correct schema
export const createSchemaBuilder = (table: string) => {
  return supabase.from(table).schema(getCurrentSchema());
};

// Auth functions that use the correct schema
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getProfile = async (userId: string) => {
  const { data, error } = await createSchemaBuilder('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const updateProfile = async (userId: string, updates: any) => {
  const { data, error } = await createSchemaBuilder('profiles')
    .update(updates)
    .eq('id', userId);
  return { data, error };
};