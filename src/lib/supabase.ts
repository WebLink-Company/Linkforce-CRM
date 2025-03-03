import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing Supabase environment variables');
}

// ✅ Function to get schema dynamically based on hostname/localStorage
export const getCurrentSchema = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    console.log('🌐 Current hostname:', hostname);

    // ✅ Development mode - retrieve schema from localStorage
    if (hostname === 'localhost' || hostname.includes('webcontainer-api.io') || hostname.startsWith('127.0.0.1')) {
      const devSchema = localStorage.getItem('dev_schema');
      if (devSchema && ['public', 'quimicinter', 'qalinkforce'].includes(devSchema)) {
        console.log('🛠️ Using development schema:', devSchema);
        return devSchema;
      }
      console.log('🛠️ Defaulting to public schema in dev mode');
      return 'public';
    }
    // ✅ Production schema mapping
    if (hostname.includes('quimicinter')) {
      console.log('🌍 Using schema: quimicinter');
      return 'quimicinter';
    }
    if (hostname.includes('qa')) {
      console.log('🌍 Using schema: qalinkforce');
      return 'qalinkforce';

    }

    console.log('🌍 Defaulting to public schema');
    return 'public';
  }
  return 'public';
};

// ✅ Function to create a new Supabase client instance with a given schema
const createSupabaseClient = (schema: string) => {
  console.log('🔄 Creating Supabase client with schema:', schema);

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: localStorage,
    },
    global: {
      headers: {
        'x-schema-name': schema,
      },
    },
    db: {
      schema: schema,
    },
  });
};

// ✅ Helper to check if a schema is valid
export const validateSchema = (schema: string): boolean => {
  return ['public', 'quimicinter', 'qalinkforce'].includes(schema);
};

// ✅ Initialize Supabase client with the current schema
export const supabase = createSupabaseClient(getCurrentSchema());

// ✅ Function to update schema dynamically and recreate Supabase client
export const updateSupabaseSchema = (schema: string): void => {
  if (!validateSchema(schema)) {
    console.error('❌ Invalid schema:', schema);
    return;
  }

  console.log('🔄 Updating schema to:', schema);

  if (typeof window !== 'undefined') {
    localStorage.setItem('dev_schema', schema);
    console.log('🛠️ Stored schema in localStorage:', schema);
  }

  // ⚡ Update the exported supabase instance
  Object.assign(supabase, createSupabaseClient(schema));
  console.log('✅ Supabase client updated with new schema:', schema);
};