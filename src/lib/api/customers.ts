import { BaseAPI } from './base';
import { supabase } from '../supabase';
import type { Customer, CustomerCategory } from '../../types/customer';

class CustomersAPI extends BaseAPI {
  constructor() {
    super('customers');
  }

  async getCustomers() {
    try {
      const { data, error } = await this.createSchemaBuilder()
        .select(`
          *,
          category:customer_categories(*)
        `)
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error loading customers:', error);
      return { data: null, error };
    }
  }

  async getCustomerCategories() {
    try {
      const { data, error } = await this.createSchemaBuilder('customer_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error loading customer categories:', error);
      return { data: null, error };
    }
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { data, error } = await this.createSchemaBuilder()
        .insert([{
          ...customer,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating customer:', error);
      return { data: null, error };
    }
  }

  async updateCustomer(id: string, updates: Partial<Customer>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { data, error } = await this.createSchemaBuilder()
        .update({
          ...updates,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating customer:', error);
      return { data: null, error };
    }
  }

  async deleteCustomer(id: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { error } = await this.createSchemaBuilder()
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting customer:', error);
      return { success: false, error };
    }
  }

  async getCustomerById(id: string) {
    try {
      const { data, error } = await this.createSchemaBuilder()
        .select(`
          *,
          category:customer_categories(*)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error loading customer:', error);
      return { data: null, error };
    }
  }

  async createCategory(category: Omit<CustomerCategory, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await this.createSchemaBuilder('customer_categories')
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating category:', error);
      return { data: null, error };
    }
  }

  async getCustomerTransactions(customerId: string) {
    try {
      const { data, error } = await this.createSchemaBuilder('customer_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('date', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error loading customer transactions:', error);
      return { data: null, error };
    }
  }
}

export const customersAPI = new CustomersAPI();