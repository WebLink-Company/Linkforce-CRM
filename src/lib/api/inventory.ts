import { supabase } from '../supabase';
import type { 
  InventoryItem, 
  InventoryTransaction,
  StockLocation,
  Warehouse 
} from '../../types/erp';

export const inventoryAPI = {
  // Inventory Items
  async getInventoryItems(search?: string, categoryId?: string) {
    let query = supabase
      .from('inventory_items')
      .select('*')
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([{
        ...item,
        created_by: supabase.auth.getUser()?.id
      }])
      .select()
      .single();
    return { data, error };
  },

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
    const { data, error } = await supabase
      .from('inventory_items')
      .update({
        ...updates,
        updated_by: supabase.auth.getUser()?.id
      })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Warehouse Management
  async getWarehouses() {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('name');
    return { data, error };
  },

  async createWarehouse(warehouse: Omit<Warehouse, 'id'>) {
    const { data, error } = await supabase
      .from('warehouses')
      .insert([warehouse])
      .select()
      .single();
    return { data, error };
  },

  // Stock Location Management
  async getLocations(warehouseId: string) {
    const { data, error } = await supabase
      .from('stock_locations')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('zone, rack, shelf, bin');
    return { data, error };
  },

  // Inventory Transactions
  async createTransaction(transaction: Omit<InventoryTransaction, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data: trx, error: trxError } = await supabase
      .from('inventory_transactions')
      .insert([{
        ...transaction,
        created_by: supabase.auth.getUser()?.id
      }])
      .select()
      .single();

    if (trxError || !trx) {
      return { error: trxError };
    }

    const { error: itemsError } = await supabase
      .from('inventory_transaction_items')
      .insert(
        transaction.items.map(item => ({
          ...item,
          transaction_id: trx.id
        }))
      );

    return { data: trx, error: itemsError };
  },

  async getTransactionById(id: string) {
    const { data: transaction, error: trxError } = await supabase
      .from('inventory_transactions')
      .select(`
        *,
        items:inventory_transaction_items(*)
      `)
      .eq('id', id)
      .single();

    return { data: transaction, error: trxError };
  }
};