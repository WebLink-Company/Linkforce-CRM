import React from 'react';
import { AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { financeAPI } from '../../lib/api/finance';

interface AccountMovementsProps {
  accountId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  onDateRangeChange: (range: { startDate: string; endDate: string }) => void;
}

export default function AccountMovements({ accountId, dateRange, onDateRangeChange }: AccountMovementsProps) {
  const [movements, setMovements] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (accountId) {
      loadMovements();
    }
  }, [accountId, dateRange]);

  const loadMovements = async () => {
    setLoading(true);
    setError(null);
    try {
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
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
        {error}
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
          <h3 className="text-lg font-medium text-white">Movimientos de Cuenta</h3>
          <p className="text-sm text-gray-400 mt-1">
            Balance Actual: {' '}
            <span className="font-medium text-white">
              {new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: 'DOP'
              }).format(runningBalance)}
            </span>
          </p>
        </div>
        <div className="flex space-x-4">
          <div>
            <label htmlFor="startDate" className="block text-sm text-gray-400">Desde</label>
            <input
              type="date"
              id="startDate"
              value={dateRange.startDate}
              onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
              className="mt-1 block rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm text-gray-400">Hasta</label>
            <input
              type="date"
              id="endDate"
              value={dateRange.endDate}
              onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
              className="mt-1 block rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-gray-900/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Fecha
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Descripción
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Débito
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Crédito
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-gray-800/30">
            {movementsWithBalance.map((movement) => (
              <tr key={movement.id} className="hover:bg-gray-700/30">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {new Date(movement.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  <div className="flex items-center">
                    {movement.type === 'debit' ? (
                      <ArrowUpRight className="h-4 w-4 text-red-400 mr-2" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-emerald-400 mr-2" />
                    )}
                    {movement.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {movement.type === 'debit' ? (
                    <span className="text-red-400">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(movement.amount)}
                    </span>
                  ) : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {movement.type === 'credit' ? (
                    <span className="text-emerald-400">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(movement.amount)}
                    </span>
                  ) : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-white">
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