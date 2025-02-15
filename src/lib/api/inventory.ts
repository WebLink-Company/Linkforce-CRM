import { BaseAPI } from './base';
import { createSchemaBuilder } from '../supabase';
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
    let query = this.query.select('*').order('name');

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
    const warehousesAPI = createSchemaBuilder('warehouses');
    const { data, error } = await warehousesAPI
      .select('*')
      .order('name');
    return { data, error };
  }

  async createWarehouse(warehouse: Omit<Warehouse, 'id'>) {
    const warehousesAPI = createSchemaBuilder('warehouses');
    const { data, error } = await warehousesAPI
      .insert([warehouse])
      .select()
      .single();
    return { data, error };
  }

  // Stock Location Management
  async getLocations(warehouseId: string) {
    const locationsAPI = createSchemaBuilder('stock_locations');
    const { data, error } = await locationsAPI
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('zone, rack, shelf, bin');
    return { data, error };
  }

  // Inventory Transactions
  async createTransaction(transaction: Omit<InventoryTransaction, 'id' | 'createdAt' | 'updatedAt'>) {
    const transactionsAPI = createSchemaBuilder('inventory_transactions');
    const { data: trx, error: trxError } = await transactionsAPI
      .insert([{
        ...transaction,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (trxError || !trx) {
      return { error: trxError };
    }

    const transactionItemsAPI = createSchemaBuilder('inventory_transaction_items');
    const { error: itemsError } = await transactionItemsAPI
      .insert(
        transaction.items.map(item => ({
          ...item,
          transaction_id: trx.id
        }))
      );

    return { data: trx, error: itemsError };
  }

  async getTransactionById(id: string) {
    const transactionsAPI = createSchemaBuilder('inventory_transactions');
    const { data: transaction, error: trxError } = await transactionsAPI
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