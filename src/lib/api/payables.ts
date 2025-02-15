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

export const payablesAPI = {
  // Supplier Management
  async getSuppliers() {
    const { data, error } = await supabase
      .from('suppliers')
      .select(`
        *,
        categories:supplier_categories_suppliers(
          category:supplier_categories(*)
        )
      `)
      .is('deleted_at', null)
      .order('business_name');
    return { data, error };
  },

  async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([supplier])
      .select()
      .single();
    return { data, error };
  },

  // Purchase Orders
  async createPurchaseOrder(order: Omit<PurchaseOrder, 'id' | 'number' | 'created_at' | 'updated_at'>) {
    const { data: number } = await supabase.rpc('generate_po_number');
    
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([{ ...order, number }])
      .select()
      .single();
    
    return { data, error };
  },

  async getPurchaseOrders() {
    const { data, error } = await supabase
      .from('purchase_orders')
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
  },

  // Supplier Invoices
  async getSupplierInvoices() {
    const { data, error } = await supabase
      .from('supplier_invoices')
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
  },

  async createSupplierInvoice(
    invoice: Omit<SupplierInvoice, 'id' | 'created_at' | 'updated_at'>,
    items: any[]
  ) {
    const { data: invData, error: invError } = await supabase
      .from('supplier_invoices')
      .insert([invoice])
      .select()
      .single();

    if (invError) return { error: invError };

    const itemsWithInvoiceId = items.map(item => ({
      ...item,
      invoice_id: invData.id
    }));

    const { error: itemsError } = await supabase
      .from('supplier_invoice_items')
      .insert(itemsWithInvoiceId);

    return { data: invData, error: itemsError };
  },

  async createSupplierPayment(payment: Omit<SupplierPayment, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('supplier_payments')
      .insert([payment])
      .select()
      .single();
    return { data, error };
  },

  // Expenses
  async getExpenseCategories() {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    return { data, error };
  },

  async createExpense(expense: Omit<Expense, 'id' | 'number' | 'created_at' | 'updated_at'>) {
    const { data: number } = await supabase.rpc('generate_expense_number');
    
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expense, number }])
      .select()
      .single();
    
    return { data, error };
  },

  async getExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        category:expense_categories(*),
        supplier:suppliers(*),
        payment_method:payment_methods(*),
        attachments:expense_attachments(*)
      `)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async approveExpense(id: string) {
    const { data, error } = await supabase
      .rpc('approve_expense', {
        p_expense_id: id,
        p_user_id: (await supabase.auth.getUser()).data.user?.id
      });
    return { data, error };
  },

  async rejectExpense(id: string, reason: string) {
    const { data, error } = await supabase
      .rpc('reject_expense', {
        p_expense_id: id,
        p_reason: reason
      });
    return { data, error };
  },

  // Reports
  async getPendingPayables() {
    const { data, error } = await supabase
      .rpc('get_pending_payables');
    return { data, error };
  },

  async getMonthlyExpensesByCategory(year: number, month: number) {
    const { data, error } = await supabase
      .rpc('get_monthly_expenses_by_category', {
        p_year: year,
        p_month: month
      });
    return { data, error };
  },

  async getExpenseSummary(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .rpc('get_expense_summary', {
        p_start_date: startDate,
        p_end_date: endDate
      });
    return { data, error };
  }
};