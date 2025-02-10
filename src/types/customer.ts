export interface Customer {
  id: string;
  identification_number: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  birth_date: string;
  category_id: string;
  total_purchases: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CustomerCategory {
  id: string;
  name: string;
  description: string;
  min_purchase_amount: number;
  benefits: string[];
}

export interface CustomerTransaction {
  id: string;
  customer_id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
}

export interface CustomerFormData {
  identification_number: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  birth_date: string;
  category_id: string;
}