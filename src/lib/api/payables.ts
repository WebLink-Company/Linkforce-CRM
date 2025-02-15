import { BaseAPI } from './base';
import { supabase, createSchemaBuilder } from '../supabase';
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

  // Supplier Management
  async getSuppliers() {
    const { data, error } = await this.query
      .select(`
        *,
        categories:supplier_categories_suppliers(
          category:supplier_categories(*)
        )
      `)
      .is('deleted_at', null)
      .order('business_name');
    return { data, error };
  }

  async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) {
    return this.create(supplier);
  }

  // Purchase Orders
  async createPurchaseOrder(order: Omit<PurchaseOrder, 'id' | 'number' | 'created_at' | 'updated_at'>) {
    const { data: number } = await supabase.rpc('generate_po_number');
    
    const purchaseOrdersAPI = createSchemaBuilder('purchase_orders');
    const { data, error } = await purchaseOrdersAPI
      .insert([{ ...order, number }])
      .select()
      .single();
    
    return { data, error };
  }

  async getPurchaseOrders() {
    const purchaseOrdersAPI = createSchemaBuilder('purchase_orders');
    const { data, error } = await purchaseOrdersAPI
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
  }

  // Supplier Invoices
  async getSupplierInvoices() {
    const supplierInvoicesAPI = createSchemaBuilder('supplier_invoices');
    const { data, error } = await supplierInvoicesAPI
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
  }

  async createSupplierInvoice(
    invoice: Omit<SupplierInvoice, 'id' | 'created_at' | 'updated_at'>,
    items: any[]
  ) {
    const supplierInvoicesAPI = createSchemaBuilder('supplier_invoices');
    const { data: invData, error: invError } = await supplierInvoicesAPI
      .insert([invoice])
      .select()
      .single();

    if (invError) return { error: invError };

    const itemsWithInvoiceId = items.map(item => ({
      ...item,
      invoice_id: invData.id
    }));

    const supplierInvoiceItemsAPI = createSchemaBuilder('supplier_invoice_items');
    const { error: itemsError } = await supplierInvoiceItemsAPI
      .insert(itemsWithInvoiceId);

    return { data: invData, error: itemsError };
  }

  // Expenses
  async getExpenseCategories() {
    const expenseCategoriesAPI = createSchemaBuilder('expense_categories');
    const { data, error } = await expenseCategoriesAPI
      .select('*')
      .eq('is_active', true)
      .order('name');
    return { data, error };
  }

  async createExpense(expense: Omit<Expense, 'id' | 'number' | 'created_at' | 'updated_at'>) {
    const { data: number } = await supabase.rpc('generate_expense_number');
    
    const expensesAPI = createSchemaBuilder('expenses');
    const { data, error } = await expensesAPI
      .insert([{ ...expense, number }])
      .select()
      .single();
    
    return { data, error };
  }

  async getExpenses() {
    const expensesAPI = createSchemaBuilder('expenses');
    const { data, error } = await expensesAPI
      .select(`
        *,
        category:expense_categories(*),
        supplier:suppliers(*),
        payment_method:payment_methods(*),
        attachments:expense_attachments(*)
      `)
      .order('created_at', { ascending: false });
    return { data, error };
  }

  // Reports
  async getPendingPayables() {
    const { data, error } = await supabase.rpc('get_pending_payables');
    return { data, error };
  }

  async getMonthlyExpensesByCategory(year: number, month: number) {
    const { data, error } = await supabase.rpc('get_monthly_expenses_by_category', {
      p_year: year,
      p_month: month
    });
    return { data, error };
  }

  async getExpenseSummary(startDate: string, endDate: string) {
    const { data, error } = await supabase.rpc('get_expense_summary', {
      p_start_date: startDate,
      p_end_date: endDate
    });
    return { data, error };
  }
}

export const payablesAPI = new PayablesAPI();