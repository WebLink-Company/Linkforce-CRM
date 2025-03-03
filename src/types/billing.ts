// Add these types to the existing billing.ts file

export interface Quote {
  id: string;
  number: string;
  customer_id: string;
  issue_date: string;
  valid_until: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  quote_id: string;
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