import React from 'react';
import { Receipt, Calendar } from 'lucide-react';
import type { Payment } from '../../types/billing';

interface PaymentHistoryProps {
  payments: Payment[];
}

export default function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (!payments?.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        No hay pagos registrados
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <div key={payment.id} className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-3">
              <Receipt className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="font-medium text-white">
                  {new Intl.NumberFormat('es-DO', {
                    style: 'currency',
                    currency: 'DOP'
                  }).format(payment.amount)}
                </p>
                <p className="text-sm text-gray-400">
                  {payment.payment_method?.name}
                  {payment.reference_number && ` - Ref: ${payment.reference_number}`}
                </p>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-400">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(payment.payment_date).toLocaleDateString('es-DO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
          {payment.notes && (
            <p className="mt-2 text-sm text-gray-400 border-t border-white/10 pt-2">
              {payment.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}