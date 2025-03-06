import { BaseAPI } from './base';
import { supabase } from '../supabase';
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
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('code');
      return { data, error };
    } catch (error) {
      console.error('Error loading accounts:', error);
      return { data: null, error };
    }
  }

  // Account Movements
  async getAccountMovements(accountCode: string, startDate?: string, endDate?: string) {
    try {
      console.log('Getting movements for account:', accountCode, 'from:', startDate, 'to:', endDate);
      
      // First get the account ID from the code
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id, type')
        .eq('code', accountCode)
        .single();

      if (accountError) {
        console.error('Error finding account:', accountError);
        throw accountError;
      }

      if (!account) {
        throw new Error('Account not found');
      }

      // Get movements from account_movements table with proper joins
      let query = supabase
        .from('account_movements')
        .select(`
          id,
          date,
          type,
          amount,
          description,
          reference_type,
          reference_id,
          created_at,
          created_by,
          account:accounts!inner(
            id,
            code,
            name
          )
        `)
        .eq('account_id', account.id)
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data: movements, error: movementsError } = await query;
      
      if (movementsError) throw movementsError;

      // Get additional reference details if needed
      const enrichedMovements = await Promise.all((movements || []).map(async (movement) => {
        let referenceDetails = null;

        if (movement.reference_type === 'expense') {
          const { data: expense } = await supabase
            .from('expenses')
            .select(`
              number,
              description,
              category:expense_categories(name),
              supplier:suppliers(business_name)
            `)
            .eq('id', movement.reference_id)
            .single();

          if (expense) {
            referenceDetails = {
              number: expense.number,
              description: expense.description,
              category: expense.category?.name,
              supplier: expense.supplier?.business_name
            };
          }
        }

        return {
          ...movement,
          description: referenceDetails ? 
            `${referenceDetails.number} - ${referenceDetails.description} ${
              referenceDetails.supplier ? `(${referenceDetails.supplier})` : ''
            }` : 
            movement.description,
          category: referenceDetails?.category
        };
      }));

      return { data: enrichedMovements, error: null };
    } catch (error) {
      console.error('Error in getAccountMovements:', error);
      return { data: null, error };
    }
  }

  // Account Balance
  async getAccountBalance(accountCode: string, asOfDate: string) {
    try {
      console.log('Getting balance for account:', accountCode, 'as of:', asOfDate);
      
      // Get account ID
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id, type')
        .eq('code', accountCode)
        .single();

      if (accountError) {
        console.error('Error finding account:', accountError);
        throw accountError;
      }

      if (!account) {
        throw new Error('Account not found');
      }

      // Calculate balance from account_movements
      const { data: movements, error: movementsError } = await supabase
        .from('account_movements')
        .select('type, amount')
        .eq('account_id', account.id)
        .lte('date', asOfDate);

      if (movementsError) throw movementsError;

      // Calculate balance based on debits and credits
      // For asset and expense accounts:
      //   - Debit increases the balance
      //   - Credit decreases the balance
      // For liability, equity, and revenue accounts:
      //   - Credit increases the balance
      //   - Debit decreases the balance
      const isDebitNormal = ['asset', 'expense'].includes(account.type);
      
      const balance = movements?.reduce((sum, movement) => {
        const amount = movement.amount;
        if (movement.type === 'debit') {
          return sum + (isDebitNormal ? amount : -amount);
        } else {
          return sum + (isDebitNormal ? -amount : amount);
        }
      }, 0) || 0;

      return {
        data: {
          balance,
          as_of_date: asOfDate
        },
        error: null
      };
    } catch (error) {
      console.error('Error in getAccountBalance:', error);
      return { data: null, error };
    }
  }

  // Payment Methods
  async getPaymentMethods() {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('name');
    return { data, error };
  }

  // Payment Terms
  async getPaymentTerms() {
    const { data, error } = await supabase
      .from('payment_terms')
      .select('*')
      .eq('is_active', true)
      .order('days');
    return { data, error };
  }

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
  }

  // Financial Reports
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

  // Get pending payables
  async getPendingPayables() {
    try {
      const { data, error } = await supabase.rpc('get_pending_payables');
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting pending payables:', error);
      return { data: null, error };
    }
  }
}

export const financeAPI = new FinanceAPI();