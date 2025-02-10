import { Database } from './supabase';

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
export type InventoryMovement = Database['public']['Tables']['inventory_movements']['Row'];

export interface ProductCategory {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  path: string[];
  level: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  isActive: boolean;
}

export interface StockLocation {
  id: string;
  warehouseId: string;
  zone: string;
  rack: string;
  shelf: string;
  bin: string;
}

export interface InventoryTransaction {
  id: string;
  type: 'purchase' | 'sale' | 'transfer' | 'adjustment';
  sourceLocationId: string | null;
  destinationLocationId: string | null;
  items: InventoryTransactionItem[];
  status: 'draft' | 'pending' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransactionItem {
  id: string;
  transactionId: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  lotNumber: string | null;
  expirationDate: string | null;
}

export interface FinancialAccount {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentId: string | null;
  path: string[];
  level: number;
  currency: string;
  isActive: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  status: 'draft' | 'posted' | 'cancelled';
  lines: JournalLine[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLine {
  id: string;
  entryId: string;
  accountId: string;
  debit: number;
  credit: number;
  currency: string;
  exchangeRate: number;
  description: string;
}

export interface TaxRate {
  id: string;
  code: string;
  name: string;
  rate: number;
  type: 'sales' | 'purchase';
  isActive: boolean;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  lastUpdated: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  userId: string;
  timestamp: string;
  changes: Record<string, any>;
  ipAddress: string;
}