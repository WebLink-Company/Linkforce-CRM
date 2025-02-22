import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Get current schema based on hostname
export const getCurrentSchema = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Local development handling
    if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
      // Check if schema is specified in localStorage for development
      const devSchema = localStorage.getItem('dev_schema');
      if (devSchema && ['public', 'quimicinter', 'qalinkforce'].includes(devSchema)) {
        return devSchema;
      }
      return 'public';
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
console.log("Current schema being used:", getCurrentSchema());


// Initialize Supabase client with schema header
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

// Create schema-aware query builder
export const createSchemaBuilder = (table: string) => {
  const schema = getCurrentSchema();
  return supabase.schema(schema).from(table);
};

// Get schema-specific function name
export const getSchemaFunction = (funcName: string): string => {
  const schema = getCurrentSchema();
  return schema === 'public' ? funcName : `${schema}_${funcName}`;
};

// Helper to check if schema exists
export const validateSchema = (schema: string): boolean => {
  return ['public', 'quimicinter', 'qalinkforce'].includes(schema);
};

// Development helper to switch schemas
export const setDevSchema = (schema: string): void => {
  if (process.env.NODE_ENV === 'development') {
    if (validateSchema(schema)) {
      localStorage.setItem('dev_schema', schema);
      window.location.reload(); // Reload to apply new schema
    } else {
      throw new Error(`Invalid schema: ${schema}`);
    }
  }
};
