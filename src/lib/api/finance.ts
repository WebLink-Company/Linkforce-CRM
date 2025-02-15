import { BaseAPI } from './base';
import { supabase, createSchemaBuilder } from '../supabase';
import type { 
  Account,
  AccountMovement,
  Payment,
  PaymentMethod,
  PaymentTerm,
  PriceList,
  Discount
} from '../../types/billing';

class FinanceAPI extends BaseAPI {
  constructor() {
    super('accounts');
  }

  // Account Management
  async getAccounts() {
    const { data, error } = await this.query
      .select('*')
      .order('code');
    return { data, error };
  }

  async createAccount(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) {
    return this.create(account);
  }

  // Account Movements
  async createMovement(movement: Omit<AccountMovement, 'id' | 'created_at'>) {
    const movementsAPI = createSchemaBuilder('account_movements');
    const { data, error } = await movementsAPI
      .insert([{
        ...movement,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    return { data, error };
  }

  async getAccountMovements(accountId: string, startDate?: string, endDate?: string) {
    try {
      console.log('Getting movements for account:', accountId, 'from:', startDate, 'to:', endDate);
      const accountsAPI = createSchemaBuilder('accounts');
      
      // First get the account ID from the code
      const { data: account, error: accountError } = await accountsAPI
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

      const movementsAPI = createSchemaBuilder('account_movements');
      let query = movementsAPI
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
  }

  // Payment Methods
  async getPaymentMethods() {
    const paymentMethodsAPI = createSchemaBuilder('payment_methods');
    const { data, error } = await paymentMethodsAPI
      .select('*')
      .eq('is_active', true)
      .order('name');
    return { data, error };
  }

  // Payment Terms
  async getPaymentTerms() {
    const paymentTermsAPI = createSchemaBuilder('payment_terms');
    const { data, error } = await paymentTermsAPI
      .select('*')
      .eq('is_active', true)
      .order('days');
    return { data, error };
  }

  // Payments
  async createPayment(payment: Omit<Payment, 'id' | 'created_at'>) {
    const paymentsAPI = createSchemaBuilder('payments');
    const { data: paymentData, error: paymentError } = await paymentsAPI
      .insert([{
        ...payment,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (paymentError) return { error: paymentError };

    // Update invoice payment status
    const { data: invoicePayments } = await paymentsAPI
      .select('amount')
      .eq('invoice_id', payment.invoice_id);

    const totalPaid = (invoicePayments || []).reduce((sum, p) => sum + p.amount, 0);

    const invoicesAPI = createSchemaBuilder('invoices');
    const { data: invoice } = await invoicesAPI
      .select('total_amount')
      .eq('id', payment.invoice_id)
      .single();

    if (invoice) {
      const { error: updateError } = await invoicesAPI
        .update({
          payment_status: totalPaid >= invoice.total_amount ? 'paid' : 'partial'
        })
        .eq('id', payment.invoice_id);

      if (updateError) return { error: updateError };
    }

    return { data: paymentData, error: null };
  }

  // Financial Reports
  async getAccountBalance(accountId: string, asOfDate: string) {
    try {
      console.log('Getting balance for account:', accountId, 'as of:', asOfDate);
      const accountsAPI = createSchemaBuilder('accounts');
      
      // First get the account ID from the code
      const { data: account, error: accountError } = await accountsAPI
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
  }

  async getAgedReceivables(asOfDate: string) {
    const { data, error } = await supabase
      .rpc('get_aged_receivables', {
        p_as_of_date: asOfDate
      });
    return { data, error };
  }

  async getCashFlow(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .rpc('get_cash_flow', {
        p_start_date: startDate,
        p_end_date: endDate
      });
    return { data, error };
  }
}

export const financeAPI = new FinanceAPI();