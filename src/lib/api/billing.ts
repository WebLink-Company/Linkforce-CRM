import { BaseAPI } from './base';
import type { Invoice, InvoiceItem, Payment } from '../../types/billing';

class BillingAPI extends BaseAPI {
  constructor() {
    super('invoices'); // Pass the base table name
  }

  // Example of a custom method that uses the schema-aware query builder
  async createInvoice(invoice: Omit<Invoice, 'id' | 'ncf' | 'created_at' | 'updated_at'>, items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]) {
    const { data: ncfData, error: ncfError } = await supabase
      .rpc('generate_ncf', { p_sequence_type: 'B01' });

    if (ncfError) throw ncfError;

    const { data: invData, error: invError } = await this.query
      .insert([{ ...invoice, ncf: ncfData }])
      .select()
      .single();

    if (invError) throw invError;

    const itemsWithInvoiceId = items.map(item => ({
      ...item,
      invoice_id: invData.id,
      total_amount: item.total_amount
    }));

    const { error: itemsError } = await createSchemaBuilder('invoice_items')
      .insert(itemsWithInvoiceId);

    if (itemsError) throw itemsError;

    return { data: invData, error: null };
  }

  // Other methods...
}

export const billingAPI = new BillingAPI();