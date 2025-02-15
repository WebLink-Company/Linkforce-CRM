import { supabase } from '../supabase';
import type { 
  Account,
  AccountMovement,
  Payment,
  PaymentMethod,
  PaymentTerm,
  PriceList,
  Discount
} from '../types/billing';

export const financeAPI = {
  // Account Management
  async getAccounts() {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('code');
    return { data, error };
  },

  async createAccount(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('accounts')
      .insert([account])
      .select()
      .single();
    return { data, error };
  },

  // Account Movements
  async createMovement(movement: Omit<AccountMovement, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('account_movements')
      .insert([{
        ...movement,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    return { data, error };
  },

  async getAccountMovements(accountId: string, startDate?: string, endDate?: string) {
    try {
      console.log('Getting movements for account:', accountId, 'from:', startDate, 'to:', endDate);
      // First get the account ID from the code
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('code', accountId)
        .single();

      if (accountError) {
        console.error('Error finding account:', accountError);
        throw accountError;
      }

      if (!account) {
        throw new Error('Account not found');
      }

      let query = supabase
        .from('account_movements')
        .select(`
          *,
          account:accounts(*)
        `)
        .eq('account_id', account.id)
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error in getAccountMovements:', error);
      return { data: null, error };
    }
  },

  // Payment Methods
  async getPaymentMethods() {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('name');
    return { data, error };
  },

  // Payment Terms
  async getPaymentTerms() {
    const { data, error } = await supabase
      .from('payment_terms')
      .select('*')
      .eq('is_active', true)
      .order('days');
    return { data, error };
  },

  // Payments
  async createPayment(payment: Omit<Payment, 'id' | 'created_at'>) {
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        ...payment,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (paymentError) return { error: paymentError };

    // Update invoice payment status
    const { data: invoicePayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', payment.invoice_id);

    const totalPaid = (invoicePayments || []).reduce((sum, p) => sum + p.amount, 0);

    const { data: invoice } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('id', payment.invoice_id)
      .single();

    if (invoice) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          payment_status: totalPaid >= invoice.total_amount ? 'paid' : 'partial'
        })
        .eq('id', payment.invoice_id);

      if (updateError) return { error: updateError };
    }

    return { data: paymentData, error: null };
  },

  // Price Lists
  async getPriceLists() {
    const { data, error } = await supabase
      .from('price_lists')
      .select(`
        *,
        items:price_list_items(
          *,
          product:inventory_items(*)
        )
      `)
      .eq('is_active', true);
    return { data, error };
  },

  async createPriceList(priceList: Omit<PriceList, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('price_lists')
      .insert([priceList])
      .select()
      .single();
    return { data, error };
  },

  // Discounts
  async getDiscounts() {
    const { data, error } = await supabase
      .from('discounts')
      .select(`
        *,
        customer_category:customer_categories(*),
        product:inventory_items(*)
      `)
      .eq('is_active', true);
    return { data, error };
  },

  async createDiscount(discount: Omit<Discount, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('discounts')
      .insert([discount])
      .select()
      .single();
    return { data, error };
  },

  // Financial Reports
  async getAccountBalance(accountId: string, asOfDate: string) {
    try {
      console.log('Getting balance for account:', accountId, 'as of:', asOfDate);
      // First get the account ID from the code
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id, type')
        .eq('code', accountId)
        .single();

      if (accountError) {
        console.error('Error finding account:', accountError);
        throw accountError;
      }

      if (!account) {
        throw new Error('Account not found');
      }

      const { data: balanceData, error: balanceError } = await supabase
        .rpc('get_account_balance', {
          p_account_id: account.id,
          p_as_of_date: asOfDate
        });

      if (balanceError) throw balanceError;

      return { data: balanceData, error: null };
    } catch (error) {
      console.error('Error in getAccountBalance:', error);
      return { data: null, error };
    }
  },

  async getAgedReceivables(asOfDate: string) {
    const { data, error } = await supabase
      .rpc('get_aged_receivables', {
        p_as_of_date: asOfDate
      });
    return { data, error };
  },

  async getCashFlow(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .rpc('get_cash_flow', {
        p_start_date: startDate,
        p_end_date: endDate
      });
    return { data, error };
  }
};