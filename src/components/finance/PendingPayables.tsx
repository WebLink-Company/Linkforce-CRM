import React from 'react';
import { AlertTriangle, Eye } from 'lucide-react';
import type { PurchaseOrder } from '../../types/payables';
import PurchaseViewerModal from '../purchases/PurchaseViewerModal';

interface PendingPayablesProps {
  payables: any[];
  onView: (payable: any) => void;
}

export default function PendingPayables({ payables = [], onView }: PendingPayablesProps) {
  if (!payables?.length) {
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
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 bg-gray-800/30">
          {payables.map((payable) => (
            <tr key={payable.order_id} className="hover:bg-gray-700/30">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {payable.supplier_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {payable.order_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {new Date(payable.expected_date).toLocaleDateString()}
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
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onView(payable)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Eye className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}