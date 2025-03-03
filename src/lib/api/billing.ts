import { BaseAPI } from './base';
import { supabase } from '../supabase';
import type { Invoice, InvoiceItem } from '../../types/billing';
import { getCurrentSchema } from '../supabase';

class BillingAPI extends BaseAPI {
  constructor() {
    super('invoices');
  }

  async getDashboardMetrics() {
    try {
      const schema = getCurrentSchema();
      console.log("🔍 Using Schema for Queries:", schema);

      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // Get monthly income
      const { data: incomeData, error: incomeError } = await supabase
        .rpc('get_monthly_income', { 
          p_year: year, 
          p_month: month 
        });

      if (incomeError) throw incomeError;

      // Get accounts receivable
      const { data: receivablesData, error: receivablesError } = await supabase
        .rpc('get_accounts_receivable');

      if (receivablesError) throw receivablesError;

      // Get overdue invoices
      const { data: overdueInvoices, error: overdueError } = await supabase
        .from('invoices')
        .select(`
          id,
          ncf,
          customer:customers(full_name),
          due_date,
          total_amount
        `)
        .eq('status', 'issued')
        .neq('payment_status', 'paid')
        .lt('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5);

      if (overdueError) throw overdueError;

      const processedOverdueInvoices = overdueInvoices?.map(invoice => ({
        id: invoice.id,
        ncf: invoice.ncf,
        customer_name: invoice.customer?.full_name || '',
        due_date: invoice.due_date,
        total_amount: invoice.total_amount,
        days_overdue: Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
      })) || [];

      // Get customer count
      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('status', 'active');

      if (customersError) throw customersError;

      return {
        success: true,
        data: {
          monthlyIncome: {
            total: incomeData?.total || 0,
            growthRate: incomeData?.growth_rate || 0
          },
          accountsReceivable: receivablesData || { total: 0, count: 0 },
          activeCustomers: customersCount || 0,
          overdueInvoices: processedOverdueInvoices
        }
      };
    } catch (error) {
      console.error('❌ Error getting dashboard metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error loading dashboard metrics'
      };
    }
  }

  async getInvoices() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          items:invoice_items(
            *,
            product:inventory_items(*)
          ),
          payments:payments(
            *,
            payment_method:payment_methods(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error loading invoices:', error);
      return { data: null, error };
    }
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'ncf' | 'created_at' | 'updated_at'>, items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]) {
    try {
      const { data: ncfData, error: ncfError } = await supabase
        .rpc('generate_ncf', { p_sequence_type: 'B01' });

      if (ncfError) throw ncfError;

      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .insert([{
          ...invoice,
          ncf: ncfData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (invError) throw invError;

      if (!invData) {
        throw new Error('Failed to create invoice');
      }

      const itemsWithInvoiceId = items.map(item => ({
        ...item,
        invoice_id: invData.id
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsWithInvoiceId);

      if (itemsError) throw itemsError;

      return { data: invData, error: null };
    } catch (error) {
      console.error('Error creating invoice:', error);
      return { data: null, error };
    }
  }

  async issueInvoice(invoiceId: string) {
    try {
      const { error } = await supabase
        .rpc('issue_invoice', { p_invoice_id: invoiceId });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error issuing invoice:', error);
      return { error };
    }
  }

  async voidInvoice(invoiceId: string, reason: string) {
    try {
      const { error } = await supabase
        .rpc('void_invoice', { p_invoice_id: invoiceId, p_reason: reason });


      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error voiding invoice:', error);
      return { error };
    }
  }
}

export const billingAPI = new BillingAPI();
