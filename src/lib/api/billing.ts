import { supabase } from '../supabase';
import type { Invoice, InvoiceItem, Payment } from '../../types/billing';

export const billingAPI = {
  // Invoice Management
  async createInvoice(invoice: Omit<Invoice, 'id' | 'ncf' | 'created_at' | 'updated_at'>, items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]) {
    const { data: ncfData, error: ncfError } = await supabase
      .rpc('generate_ncf', { p_sequence_type: 'B01' });

    if (ncfError) throw ncfError;

    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .insert([{ ...invoice, ncf: ncfData }])
      .select()
      .single();

    if (invError) throw invError;

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(
        items.map(item => ({
          ...item,
          invoice_id: invData.id
        }))
      );

    if (itemsError) throw itemsError;

    return { data: invData, error: null };
  },

  async getInvoices(filters?: {
    customer_id?: string;
    status?: string;
    payment_status?: string;
    start_date?: string;
    end_date?: string;
  }) {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(id, full_name),
        items:invoice_items(*)
      `);

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.payment_status) {
      query = query.eq('payment_status', filters.payment_status);
    }

    if (filters?.start_date) {
      query = query.gte('issue_date', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('issue_date', filters.end_date);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },

  async voidInvoice(id: string, reason: string) {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        voided_reason: reason
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Payment Management
  async recordPayment(payment: Omit<Payment, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('payments')
      .insert([payment])
      .select()
      .single();

    if (!error) {
      // Update invoice payment status
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', payment.invoice_id);

      const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);

      const { data: invoice } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('id', payment.invoice_id)
        .single();

      if (invoice) {
        await supabase
          .from('invoices')
          .update({
            payment_status: totalPaid >= invoice.total_amount ? 'paid' : 'partial'
          })
          .eq('id', payment.invoice_id);
      }
    }

    return { data, error };
  },

  // Reports
  async getDailySales(date: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*),
        payments:payments(*)
      `)
      .eq('issue_date', date)
      .eq('status', 'issued');

    return { data, error };
  },

  async getMonthlySales(year: number, month: number) {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*),
        payments:payments(*)
      `)
      .gte('issue_date', startDate)
      .lte('issue_date', endDate)
      .eq('status', 'issued');

    return { data, error };
  }
};