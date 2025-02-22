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
console.log("Current schema being used:", getCurrentSchema());


// Initialize Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'quimicinter-erp'
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

export const getInventoryItems = async (
  search?: string,
  categoryId?: string,
  page = 1,
  limit = 10
) => {
  let query = createSchemaBuilder('inventory_items')
    .select('*, inventory_categories(name)', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error, count } = await query
    .range((page - 1) * limit, page * limit - 1)
    .order('created_at', { ascending: false });

  return { data, error, count };
};

export const createInventoryItem = async (item: any) => {
  const { data, error } = await createSchemaBuilder('inventory_items')
    .insert([{ ...item, created_by: supabase.auth.getUser()?.id }])
    .select()
    .single();
  return { data, error };
};

export const updateInventoryItem = async (id: string, updates: any) => {
  const { data, error } = await createSchemaBuilder('inventory_items')
    .update({ ...updates, updated_by: supabase.auth.getUser()?.id })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
};

export const createInventoryMovement = async (movement: any) => {
  const { data: item } = await createSchemaBuilder('inventory_items')
    .select('current_stock')
    .eq('id', movement.item_id)
    .single();

  if (!item) {
    return { error: new Error('Item not found') };
  }

  const previousStock = item.current_stock;
  const newStock = previousStock + (
    movement.movement_type === 'in' ? movement.quantity :
    movement.movement_type === 'out' ? -movement.quantity :
    movement.quantity
  );

  const { data, error } = await supabase.rpc('create_inventory_movement', {
    p_item_id: movement.item_id,
    p_movement_type: movement.movement_type,
    p_quantity: movement.quantity,
    p_previous_stock: previousStock,
    p_new_stock: newStock,
    p_notes: movement.notes,
  });

  return { data, error };
};

// Add retry logic for failed requests
export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};
