import { BaseAPI } from './base';
import { supabase } from '../supabase';
import type {
  Supplier,
  PurchaseOrder,
  SupplierInvoice,
  SupplierPayment,
  Expense,
  ExpenseCategory,
  ExpenseSummary,
  MonthlyExpensesByCategory
} from '../../types/payables';

class PayablesAPI extends BaseAPI {
  constructor() {
    super('suppliers');
  }

  // Expense Categories
  async getExpenseCategories() {
    try {
      const { data, error } = await this.createSchemaBuilder('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      return { data, error };
    } catch (error) {
      console.error('Error loading expense categories:', error);
      return { data: null, error };
    }
  }

  async createExpense(expense: Omit<Expense, 'id' | 'number' | 'created_at' | 'updated_at'>) {
    try {
      const { data: number } = await this.rpc('generate_expense_number');
      
      const { data, error } = await this.createSchemaBuilder('expenses')
        .insert([{ ...expense, number }])
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Error creating expense:', error);
      return { data: null, error };
    }
  }

  async getExpenses() {
    try {
      const { data, error } = await this.createSchemaBuilder('expenses')
        .select(`
          *,
          category:expense_categories(*),
          supplier:suppliers(*),
          payment_method:payment_methods(*),
          attachments:expense_attachments(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error loading expenses:', error);
      return { data: null, error };
    }
  }

  // Reports
  async getPendingPayables() {
    try {
      const { data, error } = await this.rpc('get_pending_payables');
      return { data, error };
    } catch (error) {
      console.error('Error loading pending payables:', error);
      return { data: null, error };
    }
  }

  async getMonthlyExpensesByCategory(year: number, month: number) {
    try {
      const { data, error } = await this.rpc('get_monthly_expenses_by_category', {
        p_year: year,
        p_month: month
      });
      return { data, error };
    } catch (error) {
      console.error('Error loading monthly expenses:', error);
      return { data: null, error };
    }
  }

  async getExpenseSummary(startDate: string, endDate: string) {
    try {
      const { data, error } = await this.rpc('get_expense_summary', {
        p_start_date: startDate,
        p_end_date: endDate
      });
      return { data, error };
    } catch (error) {
      console.error('Error loading expense summary:', error);
      return { data: null, error };
    }
  }

  // Supplier Management
  async getSuppliers() {
    try {
      const { data, error } = await this.createSchemaBuilder('suppliers')
        .select(`
          *,
          categories:supplier_categories_suppliers(
            category:supplier_categories(*)
          )
        `)
        .is('deleted_at', null)
        .order('business_name');
      return { data, error };
    } catch (error) {
      console.error('Error loading suppliers:', error);
      return { data: null, error };
    }
  }

  async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) {
    try {
      return await this.create(supplier);
    } catch (error) {
      console.error('Error creating supplier:', error);
      return { data: null, error };
    }
  }

  // Purchase Orders
  async createPurchaseOrder(order: Omit<PurchaseOrder, 'id' | 'number' | 'created_at' | 'updated_at'>) {
    try {
      const { data: number } = await this.rpc('generate_po_number');
      
      const { data, error } = await this.createSchemaBuilder('purchase_orders')
        .insert([{ ...order, number }])
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Error creating purchase order:', error);
      return { data: null, error };
    }
  }

  async getPurchaseOrders() {
    try {
      const { data, error } = await this.createSchemaBuilder('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          items:purchase_order_items(
            *,
            product:inventory_items(*)
          )
        `)
        .order('created_at', { ascending: false });
      return { data, error };
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      return { data: null, error };
    }
  }

  // Supplier Invoices
  async getSupplierInvoices() {
    try {
      const { data, error } = await this.createSchemaBuilder('supplier_invoices')
        .select(`
          *,
          supplier:suppliers(*),
          purchase_order:purchase_orders(*),
          items:supplier_invoice_items(
            *,
            product:inventory_items(*)
          ),
          payments:supplier_payments(
            *,
            payment_method:payment_methods(*)
          )
        `)
        .order('created_at', { ascending: false });
      return { data, error };
    } catch (error) {
      console.error('Error loading supplier invoices:', error);
      return { data: null, error };
    }
  }

  async createSupplierInvoice(
    invoice: Omit<SupplierInvoice, 'id' | 'created_at' | 'updated_at'>,
    items: any[]
  ) {
    try {
      const { data: invData, error: invError } = await this.createSchemaBuilder('supplier_invoices')
        .insert([invoice])
        .select()
        .single();

      if (invError) return { error: invError };

      const itemsWithInvoiceId = items.map(item => ({
        ...item,
        invoice_id: invData.id
      }));

      const { error: itemsError } = await this.createSchemaBuilder('supplier_invoice_items')
        .insert(itemsWithInvoiceId);

      return { data: invData, error: itemsError };
    } catch (error) {
      console.error('Error creating supplier invoice:', error);
      return { data: null, error };
    }
  }
}

export const payablesAPI = new PayablesAPI();