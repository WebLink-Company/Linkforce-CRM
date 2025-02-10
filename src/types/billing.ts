export interface FiscalSequence {
  id: string;
  sequence_type: string;
  prefix: string;
  current_number: number;
  end_number: number;
  valid_until: string;
  is_active: boolean;
}

export interface Invoice {
  id: string;
  ncf: string;
  customer_id: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'draft' | 'issued' | 'voided';
  payment_status: 'pending' | 'partial' | 'paid';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  voided_at?: string;
  voided_reason?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
  total_amount: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  payment_method_id: string;
  amount: number;
  reference_number?: string;
  payment_date: string;
  notes?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface FiscalPeriod {
  id: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at?: string;
  closed_by?: string;
}