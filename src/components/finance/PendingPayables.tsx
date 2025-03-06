import React, { useState, useEffect } from 'react';
import { financeAPI } from '../../lib/api/finance';
import { AlertTriangle, Eye } from 'lucide-react';
import type { PurchaseOrder } from '../../types/payables';

interface PendingPayable {
  order_id: string;
  order_number: string;
  supplier_name: string;
  issue_date: string;
  expected_date: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  days_overdue: number;
}

export default function PendingPayables() {
  const [payables, setPayables] = useState<PendingPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayables();
  }, []);

  const loadPayables = async () => {
    try {
      const { data, error } = await financeAPI.getPendingPayables();
      if (error) throw error;
      setPayables(data || []);
    } catch (error) {
      console.error('Error loading payables:', error);
      setError(error instanceof Error ? error.message : 'Error loading payables');
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

  if (!payables.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        No hay órdenes de compra pendientes de pago
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-white/10">
        <thead className="bg-gray-900/50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Proveedor
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Orden
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Fecha Esperada
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              Total
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              Pagado
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              Pendiente
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 bg-gray-800/30">
          {payables.map((payable) => (
            <tr key={`${payable.order_id}-${payable.order_number}`} className="hover:bg-gray-700/30">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {payable.supplier_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {payable.order_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {new Date(payable.expected_date).toLocaleDateString('es-DO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">
                {new Intl.NumberFormat('es-DO', {
                  style: 'currency',
                  currency: 'DOP'
                }).format(payable.total_amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-400 text-right">
                {new Intl.NumberFormat('es-DO', {
                  style: 'currency',
                  currency: 'DOP'
                }).format(payable.paid_amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400 text-right font-medium">
                {new Intl.NumberFormat('es-DO', {
                  style: 'currency',
                  currency: 'DOP'
                }).format(payable.pending_amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {payable.days_overdue > 0 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {payable.days_overdue} días vencida
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Al día
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}