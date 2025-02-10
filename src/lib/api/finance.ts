import { supabase } from '../supabase';
import type { 
  FinancialAccount, 
  JournalEntry,
  Currency 
} from '../../types/erp';

export const financeAPI = {
  // Account Management
  async getAccounts() {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .order('code');
    return { data, error };
  },

  async createAccount(account: Omit<FinancialAccount, 'id'>) {
    const { data, error } = await supabase
      .from('financial_accounts')
      .insert([account])
      .select()
      .single();
    return { data, error };
  },

  // Journal Entries
  async createJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert([{
        ...entry,
        created_by: supabase.auth.getUser()?.id
      }])
      .select()
      .single();

    if (entryError || !journalEntry) {
      return { error: entryError };
    }

    const { error: linesError } = await supabase
      .from('journal_lines')
      .insert(
        entry.lines.map(line => ({
          ...line,
          entry_id: journalEntry.id
        }))
      );

    return { data: journalEntry, error: linesError };
  },

  async getJournalEntryById(id: string) {
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .select(`
        *,
        lines:journal_lines(*)
      `)
      .eq('id', id)
      .single();

    return { data: entry, error: entryError };
  },

  // Financial Reports
  async getTrialBalance(fromDate: string, toDate: string, currency: string = 'USD') {
    const { data, error } = await supabase
      .rpc('get_trial_balance', {
        p_from_date: fromDate,
        p_to_date: toDate,
        p_currency: currency
      });
    return { data, error };
  },

  async getBalanceSheet(asOfDate: string, currency: string = 'USD') {
    const { data, error } = await supabase
      .rpc('get_balance_sheet', {
        p_as_of_date: asOfDate,
        p_currency: currency
      });
    return { data, error };
  },

  // Currency Management
  async getCurrencies() {
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .order('code');
    return { data, error };
  },

  async updateExchangeRates(rates: Partial<Currency>[]) {
    const { data, error } = await supabase
      .from('currencies')
      .upsert(
        rates.map(rate => ({
          ...rate,
          last_updated: new Date().toISOString()
        }))
      );
    return { data, error };
  }
};