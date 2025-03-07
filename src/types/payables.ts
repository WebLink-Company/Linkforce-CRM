export interface Supplier {
  id: string;
  code: string;
  business_name: string;
  commercial_name?: string;
  tax_id: string;
  email?: string;
  phone?: string;
  address?: string;
  country: string;
  contact_name?: string;
  contact_position?: string;
  contact_phone?: string;
  payment_terms?: string;
  credit_limit: number;
  bank_name?: string;
  bank_account_type?: string;
  bank_account_number?: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
  categories?: SupplierCategory[];
}

export interface SupplierCategory {
  id: string;
  name: string;
  description?: string;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplier_id: string;
  issue_date: string;
  expected_date?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  payment_status: 'pending' | 'partial' | 'paid';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
  payments?: PurchasePayment[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
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

export interface PurchasePayment {
  id: string;
  purchase_order_id: string;
  payment_method_id: string;
  amount: number;
  reference_number?: string;
  payment_date: string;
  notes?: string;
  payment_method?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface SupplierInvoice {
  id: string;
  number: string;
  supplier_id: string;
  purchase_order_id?: string;
  issue_date: string;
  due_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'voided';
  payment_status: 'pending' | 'partial' | 'paid';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  voided_at?: string;
  voided_reason?: string;
  supplier?: Supplier;
  purchase_order?: PurchaseOrder;
  items?: SupplierInvoiceItem[];
  payments?: SupplierPayment[];
}

export interface SupplierInvoiceItem {
  id: string;
  invoice_id: string;
  purchase_order_item_id?: string;
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

export interface SupplierPayment {
  id: string;
  invoice_id: string;
  payment_method_id: string;
  amount: number;
  reference_number?: string;
  payment_date: string;
  notes?: string;
  payment_method?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  account_id: string;
  is_active: boolean;
}

export interface Expense {
  id: string;
  number: string;
  category_id: string;
  supplier_id?: string;
  date: string;
  description: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method_id?: string;
  reference_number?: string;
  status: 'pending' | 'approved' | 'rejected' | 'voided';
  notes?: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  category?: ExpenseCategory;
  supplier?: Supplier;
  payment_method?: {
    id: string;
    name: string;
    code: string;
  };
  attachments?: ExpenseAttachment[];
}

export interface ExpenseAttachment {
  id: string;
  expense_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_at: string;
}

export interface ExpenseSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  start_date: string;
  end_date: string;
}

export interface MonthlyExpensesByCategory {
  category_id: string;
  category_name: string;
  total_amount: number;
  expense_count: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  requires_reference: boolean;
  is_active: boolean;
}