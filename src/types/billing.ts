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
  customer?: Customer;
  items?: InvoiceItem[];
  payments?: Payment[];
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
  product?: {
    id: string;
    name: string;
    code: string;
    unit_measure: string;
  };
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  requires_reference: boolean;
  is_active: boolean;
}

export interface PaymentTerm {
  id: string;
  name: string;
  code: string;
  days: number;
  description?: string;
  discount_percentage: number;
  discount_days: number;
  is_active: boolean;
}

export interface Payment {
  id: string;
  invoice_id: string;
  payment_method_id: string;
  amount: number;
  reference_number?: string;
  payment_date: string;
  notes?: string;
  created_by: string;
  created_at: string;
  payment_method?: PaymentMethod;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string;
  description?: string;
  is_active: boolean;
}

export interface AccountMovement {
  id: string;
  account_id: string;
  date: string;
  type: 'debit' | 'credit';
  amount: number;
  reference_type: string;
  reference_id: string;
  description?: string;
  created_by: string;
  created_at: string;
  account?: Account;
}

export interface PriceList {
  id: string;
  name: string;
  description?: string;
  type: 'sale' | 'purchase';
  currency: string;
  is_active: boolean;
  valid_from?: string;
  valid_to?: string;
}

export interface PriceListItem {
  id: string;
  price_list_id: string;
  product_id: string;
  price: number;
  min_quantity: number;
}

export interface Discount {
  id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'amount';
  value: number;
  min_amount?: number;
  min_quantity?: number;
  customer_category_id?: string;
  product_id?: string;
  valid_from?: string;
  valid_to?: string;
  is_active: boolean;
}

export interface PaymentReminder {
  id: string;
  invoice_id: string;
  reminder_date: string;
  type: 'first' | 'second' | 'final';
  status: 'pending' | 'sent' | 'cancelled';
  sent_at?: string;
  sent_by?: string;
}