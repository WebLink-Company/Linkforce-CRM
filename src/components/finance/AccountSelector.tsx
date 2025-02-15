import React, { useState, useEffect } from 'react';
import { financeAPI } from '../../lib/api/finance';
import type { Account } from '../../types/billing';

interface AccountSelectorProps {
  value: string;
  onChange: (accountId: string) => void;
  type?: Account['type'][];
}

export default function AccountSelector({ value, onChange, type }: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const { data, error } = await financeAPI.getAccounts();
      if (error) throw error;
      
      let filteredAccounts = data || [];
      if (type?.length) {
        filteredAccounts = filteredAccounts.filter(account => type.includes(account.type));
      }
      
      setAccounts(filteredAccounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <select
        disabled
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
      >
        <option>Cargando cuentas...</option>
      </select>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
    >
      <option value="">Seleccione una cuenta</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.code} - {account.name}
        </option>
      ))}
    </select>
  );
}