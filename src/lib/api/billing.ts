import { BaseAPI } from './base';
import { supabase, getCurrentSchema, createSchemaBuilder } from '../supabase';
import type { Invoice, InvoiceItem } from '../../types/billing';

class BillingAPI extends BaseAPI {
  constructor() {
    super('invoices');
  }

  async getDashboardMetrics() {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const schema = getCurrentSchema();

      // Get monthly income using schema-specific RPC function
      const { data: incomeData, error: incomeError } = await supabase.rpc(
        `${schema}_get_monthly_income`,
        {
          p_year: year,
          p_month: month
        }
      );

      if (incomeError) {
        console.error('Error getting monthly income:', incomeError);
        throw incomeError;
      }

      // Get invoice payment stats using schema-specific RPC function
      const { data: invoiceStats, error: invoiceError } = await supabase.rpc(
        `${schema}_get_invoice_payment_stats`,
        {
          p_year: year,
          p_month: month
        }
      );

      if (invoiceError) {
        console.error('Error getting invoice stats:', invoiceError);
        throw invoiceError;
      }

      // Get active customers count from current schema
      const { count: customersCount, error: customersError } = await createSchemaBuilder('customers')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('status', 'active');

      if (customersError) {
        console.error('Error getting customer count:', customersError);
        throw customersError;
      }

      // Get overdue invoices from current schema
      const { data: overdueInvoices, error: overdueError } = await createSchemaBuilder('invoices')
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

      if (overdueError) {
        console.error('Error getting overdue invoices:', overdueError);
        throw overdueError;
      }

      // Process overdue invoices
      const processedOverdueInvoices = overdueInvoices?.map(invoice => ({
        id: invoice.id,
        ncf: invoice.ncf,
        customer_name: invoice.customer?.full_name || '',
        due_date: invoice.due_date,
        total_amount: invoice.total_amount,
        days_overdue: Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
      })) || [];

      return {
        success: true,
        data: {
          monthlyIncome: {
            total: incomeData?.total || 0,
            growthRate: incomeData?.growth_rate || 0
          },
          monthlyExpenses: {
            total: 0,
            growthRate: 0
          },
          accountsReceivable: {
            total: invoiceStats?.pending?.total || 0,
            count: invoiceStats?.pending?.count || 0
          },
          accountsPayable: {
            total: 0,
            count: 0
          },
          operatingExpenses: {
            total: 0,
            growthRate: 0
          },
          cashBalance: {
            total: 0,
            previousTotal: 0
          },
          profitMargin: {
            current: 0,
            previous: 0
          },
          averageCollectionPeriod: 30,
          activeCustomers: customersCount || 0,
          overdueInvoices: processedOverdueInvoices
        }
      };
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error loading dashboard metrics'
      };
    }
  }

  async getInvoices() {
    try {
      const { data, error } = await createSchemaBuilder('invoices')
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
      console.error('Error getting invoices:', error);
      return { data: null, error };
    }
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'ncf' | 'created_at' | 'updated_at'>, items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]) {
    try {
      const schema = getCurrentSchema();
      
      // Get NCF using schema-specific RPC function
      const { data: ncfData, error: ncfError } = await supabase.rpc(
        `${schema}_generate_ncf`,
        {
          p_sequence_type: 'B01'
        }
      );

      if (ncfError) throw ncfError;

      // Create invoice
      const { data: invData, error: invError } = await createSchemaBuilder('invoices')
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

      // Create invoice items
      const itemsWithInvoiceId = items.map(item => ({
        ...item,
        invoice_id: invData.id
      }));

      const { error: itemsError } = await createSchemaBuilder('invoice_items')
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
      const schema = getCurrentSchema();
      const { error } = await supabase.rpc(
        `${schema}_issue_invoice`,
        {
          p_invoice_id: invoiceId
        }
      );

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error issuing invoice:', error);
      return { error };
    }
  }

  async voidInvoice(invoiceId: string, reason: string) {
    try {
      const schema = getCurrentSchema();
      const { error } = await supabase.rpc(
        `${schema}_void_invoice`,
        {
          p_invoice_id: invoiceId,
          p_reason: reason
        }
      );

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error voiding invoice:', error);
      return { error };
    }
  }
}

export const billingAPI = new BillingAPI();