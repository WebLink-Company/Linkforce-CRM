import React from 'react';
import { DollarSign, AlertCircle } from 'lucide-react';
import type { Invoice } from '../../types/billing';

interface PaymentSummaryProps {
  invoice: Invoice;
  onPaymentClick: () => void;
}

export default function PaymentSummary({ invoice, onPaymentClick }: PaymentSummaryProps) {
  const totalPaid = invoice.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const remainingAmount = invoice.total_amount - totalPaid;
  const isOverdue = new Date(invoice.due_date) < new Date() && remainingAmount > 0;

  // Don't show payment functionality for draft invoices
  if (invoice.status === 'draft') {
    return null;
  }

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-400">Total Facturado</p>
          <p className="text-lg font-semibold text-white">
            {new Intl.NumberFormat('es-DO', {
              style: 'currency',
              currency: 'DOP'
            }).format(invoice.total_amount)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Total Pagado</p>
          <p className="text-lg font-semibold text-emerald-400">
            {new Intl.NumberFormat('es-DO', {
              style: 'currency',
              currency: 'DOP'
            }).format(totalPaid)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Monto Pendiente</p>
          <p className="text-lg font-semibold text-blue-400">
            {new Intl.NumberFormat('es-DO', {
              style: 'currency',
              currency: 'DOP'
            }).format(remainingAmount)}
          </p>
        </div>

        {isOverdue && (
          <div className="flex items-center text-red-400 text-sm bg-red-500/10 p-2 rounded-md border border-red-500/20">
            <AlertCircle className="h-4 w-4 mr-1" />
            Factura vencida
          </div>
        )}

        {remainingAmount > 0 && invoice.status !== 'voided' && (
          <button
            onClick={onPaymentClick}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Registrar Pago
          </button>
        )}
      </div>
    </div>
  );
}