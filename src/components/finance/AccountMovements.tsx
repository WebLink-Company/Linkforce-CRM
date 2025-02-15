import React, { useState, useEffect } from 'react';
import { financeAPI } from '../../lib/api/finance';
import { billingAPI } from '../../lib/api/billing';
import type { AccountMovement, Invoice } from '../../types/billing';
import { ArrowUpRight, ArrowDownLeft, Eye } from 'lucide-react';
import InvoiceViewerModal from '../billing/InvoiceViewerModal';

interface AccountMovementsProps {
  accountId: string;
}

export default function AccountMovements({ accountId }: AccountMovementsProps) {
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (accountId) {
      loadMovements();
    }
  }, [accountId, dateRange]);

  const loadMovements = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading movements for account:', accountId);
      const { data, error } = await financeAPI.getAccountMovements(
        accountId,
        dateRange.startDate,
        dateRange.endDate
      );

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error loading movements:', error);
      setError(error instanceof Error ? error.message : 'Error loading account movements');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  // Calculate running balance
  let runningBalance = 0;
  const movementsWithBalance = movements.map(movement => {
    if (movement.type === 'debit') {
      runningBalance += movement.amount;
    } else {
      runningBalance -= movement.amount;
    }
    return { ...movement, balance: runningBalance };
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Movimientos de Cuenta</h3>
          <p className="text-sm text-gray-500 mt-1">
            Balance Actual: {' '}
            <span className="font-medium text-gray-900">
              {new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: 'DOP'
              }).format(runningBalance)}
            </span>
          </p>
        </div>
        <div className="flex space-x-4">
          <div>
            <label htmlFor="startDate" className="block text-sm text-gray-500">Desde</label>
            <input
              type="date"
              id="startDate"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm text-gray-500">Hasta</label>
            <input
              type="date"
              id="endDate"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Débito
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Crédito
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movementsWithBalance.map((movement) => (
              <tr key={movement.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(movement.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center">
                    {movement.type === 'debit' ? (
                      <ArrowUpRight className="h-4 w-4 text-red-500 mr-2" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-green-500 mr-2" />
                    )}
                    {movement.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {movement.type === 'debit' ? (
                    <span className="text-red-600">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(movement.amount)}
                    </span>
                  ) : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {movement.type === 'credit' ? (
                    <span className="text-green-600">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(movement.amount)}
                    </span>
                  ) : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                  {new Intl.NumberFormat('es-DO', {
                    style: 'currency',
                    currency: 'DOP'
                  }).format(movement.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}