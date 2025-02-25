import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Get current schema based on hostname or localStorage in dev mode
export const getCurrentSchema = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || 
                 hostname.includes('webcontainer-api.io') || 
                 hostname.startsWith('127.0.0.1');

    // Development mode - use localStorage
    if (isDev) {
      const devSchema = localStorage.getItem('dev_schema');
      if (devSchema && ['public', 'quimicinter', 'qalinkforce'].includes(devSchema)) {
        return devSchema;
      }
    }

    // Production schema mapping
    if (hostname.includes('quimicinter')) {
      return 'quimicinter';
    }
    if (hostname.includes('qa')) {
      return 'qalinkforce';
    }

    return 'public';
  }
  return 'public';
};

// Create Supabase client with dynamic schema header
export const createSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: localStorage
    },
    global: {
      headers: {
        'x-schema-name': getCurrentSchema()
      }
    }
  });
};

// Export supabase instance
export const supabase = createSupabaseClient();

// Helper to check if schema exists
export const validateSchema = (schema: string): boolean => {
  return ['public', 'quimicinter', 'qalinkforce'].includes(schema);
};

// Get schema-specific function name
export const getSchemaFunction = (functionName: string): string => {
  const schema = getCurrentSchema();
  // Remove any existing schema prefix to avoid duplication
  const baseName = functionName.replace(/^(public|quimicinter|qalinkforce)_/, '');
  return schema === 'public' ? baseName : `${schema}_${baseName}`;
};

// Function to recreate Supabase client with new schema
export const updateSupabaseSchema = (schema: string) => {
  if (!validateSchema(schema)) {
    console.error('Invalid schema:', schema);
    return;
  }

  // Store schema in localStorage for development
  if (window.location.hostname === 'localhost' || 
      window.location.hostname.includes('webcontainer-api.io') || 
      window.location.hostname.startsWith('127.0.0.1')) {
    localStorage.setItem('dev_schema', schema);
  }

  // Return new client instance with updated schema
  return createSupabaseClient();
};