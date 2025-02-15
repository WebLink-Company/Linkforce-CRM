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
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Total Facturado</p>
          <p className="text-lg font-semibold">
            {new Intl.NumberFormat('es-DO', {
              style: 'currency',
              currency: 'DOP'
            }).format(invoice.total_amount)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Pagado</p>
          <p className="text-lg font-semibold text-green-600">
            {new Intl.NumberFormat('es-DO', {
              style: 'currency',
              currency: 'DOP'
            }).format(totalPaid)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">Monto Pendiente</p>
          <p className={`text-lg font-semibold ${remainingAmount > 0 ? 'text-blue-600' : 'text-green-600'}`}>
            {new Intl.NumberFormat('es-DO', {
              style: 'currency',
              currency: 'DOP'
            }).format(remainingAmount)}
          </p>
        </div>

        {isOverdue && (
          <div className="mt-2 flex items-center text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            Factura vencida
          </div>
        )}
      </div>

      {remainingAmount > 0 && invoice.status !== 'voided' && (
        <button
          onClick={onPaymentClick}
          className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Registrar Pago
        </button>
      )}
    </div>
  );
}