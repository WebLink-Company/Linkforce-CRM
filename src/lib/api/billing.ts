import { BaseAPI } from './base';
import { supabase } from '../supabase';
import type { Invoice, InvoiceItem } from '../../types/billing';

class BillingAPI extends BaseAPI {
  constructor() {
    super('invoices');
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'ncf' | 'created_at' | 'updated_at'>, items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]) {
    try {
      // Get NCF
      const { data: ncfData, error: ncfError } = await supabase
        .rpc('generate_ncf', { p_sequence_type: 'B01' });

      if (ncfError) throw ncfError;

      // Create invoice
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

      // Create invoice items
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
      console.error('Error getting invoices:', error);
      return { data: null, error };
    }
  }

  async issueInvoice(invoiceId: string) {
    try {
      const { error } = await supabase.rpc('issue_invoice', {
        p_invoice_id: invoiceId
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error issuing invoice:', error);
      return { error };
    }
  }

  async voidInvoice(invoiceId: string, reason: string) {
    try {
      const { error } = await supabase.rpc('void_invoice', {
        p_invoice_id: invoiceId,
        p_reason: reason
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error voiding invoice:', error);
      return { error };
    }
  }
}

export const billingAPI = new BillingAPI();