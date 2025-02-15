import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, Eye } from 'lucide-react';
import InvoiceViewerModal from '../billing/InvoiceViewerModal';
import type { Invoice } from '../../types/billing';

interface PendingReceivable {
  invoice_id: string;
  customer_id: string;
  customer_name: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  days_overdue: number;
  customer: any;
  items: any[];
  payments: any[];
}

export default function PendingReceivables() {
  const [receivables, setReceivables] = useState<PendingReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showViewerModal, setShowViewerModal] = useState(false);

  useEffect(() => {
    loadReceivables();
  }, []);

  const loadReceivables = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_receivables');
      if (error) throw error;
      setReceivables(data || []);
    } catch (error) {
      console.error('Error loading receivables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (receivable: PendingReceivable) => {
    const invoice: Invoice = {
      id: receivable.invoice_id,
      ncf: receivable.invoice_number,
      customer_id: receivable.customer_id,
      issue_date: receivable.issue_date,
      due_date: receivable.due_date,
      subtotal: receivable.total_amount - (receivable.total_amount * 0.18),
      tax_amount: receivable.total_amount * 0.18,
      discount_amount: 0,
      total_amount: receivable.total_amount,
      status: 'issued',
      payment_status: receivable.paid_amount >= receivable.total_amount ? 'paid' : 'partial',
      customer: receivable.customer,
      items: receivable.items,
      payments: receivable.payments,
      created_by: '',
      created_at: '',
      updated_at: ''
    };
    setSelectedInvoice(invoice);
    setShowViewerModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!receivables.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay facturas pendientes de cobro
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Factura
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Vencimiento
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pagado
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pendiente
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {receivables.map((receivable) => (
              <tr key={receivable.invoice_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {receivable.customer_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {receivable.invoice_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(receivable.due_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatCurrency(receivable.total_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                  {formatCurrency(receivable.paid_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-medium">
                  {formatCurrency(receivable.pending_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {receivable.days_overdue > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {receivable.days_overdue} días vencida
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Al día
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleViewInvoice(receivable)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InvoiceViewerModal
        isOpen={showViewerModal}
        onClose={() => {
          setShowViewerModal(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />
    </>
  );
}