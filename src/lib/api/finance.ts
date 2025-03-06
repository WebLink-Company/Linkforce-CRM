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

      // For expenses account (5000), get movements from approved expenses
      if (accountCode === '5000') {
        let query = supabase
          .from('expenses')
          .select(`
            id,
            number,
            date,
            description,
            amount,
            tax_amount,
            total_amount,
            category:expense_categories(name),
            supplier:suppliers(business_name)
          `)
          .eq('status', 'approved');

        if (startDate) {
          query = query.gte('date', startDate);
        }
        if (endDate) {
          query = query.lte('date', endDate);
        }

        const { data: expenses, error: expensesError } = await query;
        if (expensesError) throw expensesError;

        // Transform expenses into movements format
        const movements = expenses?.map(expense => ({
          id: expense.id,
          date: expense.date,
          description: `${expense.number} - ${expense.description} ${expense.supplier?.business_name ? `(${expense.supplier.business_name})` : ''}`,
          type: 'debit' as const,
          amount: expense.total_amount,
          reference_type: 'expense',
          reference_id: expense.id,
          category: expense.category?.name
        })) || [];

        return { data: movements, error: null };
      }

      // For accounts payable (2100), get movements from purchase orders and payments
      if (accountCode === '2100') {
        // Get approved purchase orders
        let poQuery = supabase
          .from('purchase_orders')
          .select(`
            id,
            number,
            issue_date,
            total_amount,
            supplier:suppliers(business_name)
          `)
          .in('status', ['sent', 'confirmed', 'received']);

        if (startDate) {
          poQuery = poQuery.gte('issue_date', startDate);
        }
        if (endDate) {
          poQuery = poQuery.lte('issue_date', endDate);
        }

        const { data: orders, error: ordersError } = await poQuery;
        if (ordersError) throw ordersError;

        // Get supplier payments
        let paymentQuery = supabase
          .from('supplier_payments')
          .select(`
            id,
            payment_date,
            amount,
            invoice:supplier_invoices(
              number,
              supplier:suppliers(business_name)
            )
          `);

        if (startDate) {
          paymentQuery = paymentQuery.gte('payment_date', startDate);
        }
        if (endDate) {
          paymentQuery = paymentQuery.lte('payment_date', endDate);
        }

        const { data: payments, error: paymentsError } = await paymentQuery;
        if (paymentsError) throw paymentsError;

        // Combine and transform movements
        const movements = [
          // Purchase order movements (credits - increase liability)
          ...(orders?.map(order => ({
            id: order.id,
            date: order.issue_date,
            description: `Orden de Compra ${order.number} - ${order.supplier?.business_name}`,
            type: 'credit' as const,
            amount: order.total_amount,
            reference_type: 'purchase_order',
            reference_id: order.id
          })) || []),

          // Payment movements (debits - decrease liability)
          ...(payments?.map(payment => ({
            id: payment.id,
            date: payment.payment_date,
            description: `Pago factura ${payment.invoice?.number} - ${payment.invoice?.supplier?.business_name}`,
            type: 'debit' as const,
            amount: payment.amount,
            reference_type: 'supplier_payment',
            reference_id: payment.id
          })) || [])
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { data: movements, error: null };
      }

      // For other accounts, get from account_movements table
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
  }

  // Account Balance
  async getAccountBalance(accountCode: string, asOfDate: string) {
    try {
      console.log('Getting balance for account:', accountCode, 'as of:', asOfDate);
      
      // For expenses account (5000), calculate from approved expenses
      if (accountCode === '5000') {
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('total_amount')
          .eq('status', 'approved')
          .lte('date', asOfDate);

        if (expensesError) throw expensesError;

        const balance = expenses?.reduce((sum, exp) => sum + exp.total_amount, 0) || 0;

        return {
          data: {
            balance,
            as_of_date: asOfDate
          },
          error: null
        };
      }

      // For accounts payable (2100), calculate from purchase orders and payments
      if (accountCode === '2100') {
        // Get total from approved purchase orders
        const { data: orders, error: ordersError } = await supabase
          .from('purchase_orders')
          .select('total_amount')
          .in('status', ['sent', 'confirmed', 'received'])
          .lte('issue_date', asOfDate);

        if (ordersError) throw ordersError;

        // Get total payments
        const { data: payments, error: paymentsError } = await supabase
          .from('supplier_payments')
          .select('amount')
          .lte('payment_date', asOfDate);

        if (paymentsError) throw paymentsError;

        const totalOrders = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
        const totalPayments = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        const balance = totalOrders - totalPayments;

        return {
          data: {
            balance,
            as_of_date: asOfDate
          },
          error: null
        };
      }

      // For other accounts, use the account_balance function
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('code', accountCode)
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