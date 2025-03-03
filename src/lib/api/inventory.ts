import { BaseAPI } from './base';
import type { 
  InventoryItem, 
  InventoryTransaction,
  StockLocation,
  Warehouse 
} from '../../types/erp';

class InventoryAPI extends BaseAPI {
  constructor() {
    super('inventory_items');
  }

  // Inventory Items
  async getInventoryItems(search?: string, categoryId?: string) {
    let query = this.createSchemaBuilder().select('*').order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    return { data, error };
  }

  async createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) {
    return this.create({
      ...item,
      created_by: (await supabase.auth.getUser()).data.user?.id
    });
  }

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
    return this.update(id, {
      ...updates,
      updated_by: (await supabase.auth.getUser()).data.user?.id
    });
  }

  // Warehouse Management
  async getWarehouses() {
    const { data, error } = await this.createSchemaBuilder('warehouses')
      .select('*')
      .order('name');
    return { data, error };
  }

  async createWarehouse(warehouse: Omit<Warehouse, 'id'>) {
    const { data, error } = await this.createSchemaBuilder('warehouses')
      .insert([warehouse])
      .select()
      .single();
    return { data, error };
  }

  // Stock Location Management
  async getLocations(warehouseId: string) {
    const { data, error } = await this.createSchemaBuilder('stock_locations')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('zone, rack, shelf, bin');
    return { data, error };
  }

  // Inventory Transactions
  async createTransaction(transaction: Omit<InventoryTransaction, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data: trx, error: trxError } = await this.createSchemaBuilder('inventory_transactions')
      .insert([{
        ...transaction,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (trxError || !trx) {
      return { error: trxError };
    }

    const { error: itemsError } = await this.createSchemaBuilder('inventory_transaction_items')
      .insert(
        transaction.items.map(item => ({
          ...item,
          transaction_id: trx.id
        }))
      );

    return { data: trx, error: itemsError };
  }

  async getTransactionById(id: string) {
    const { data: transaction, error: trxError } = await this.createSchemaBuilder('inventory_transactions')
      .select(`
        *,
        items:inventory_transaction_items(*)
      `)
      .eq('id', id)
      .single();

    return { data: transaction, error: trxError };
  }
}

export const inventoryAPI = new InventoryAPI();