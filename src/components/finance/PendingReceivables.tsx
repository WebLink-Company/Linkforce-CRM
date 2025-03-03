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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!receivables.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        No hay facturas pendientes de cobro
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-gray-900/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Cliente
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Factura
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Fecha Vencimiento
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
            {receivables.map((receivable) => (
              <tr key={receivable.invoice_id} className="hover:bg-gray-700/30">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {receivable.customer_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {receivable.invoice_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {new Date(receivable.due_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">
                  {formatCurrency(receivable.total_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-400 text-right">
                  {formatCurrency(receivable.paid_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400 text-right font-medium">
                  {formatCurrency(receivable.pending_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {receivable.days_overdue > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {receivable.days_overdue} días vencida
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Al día
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleViewInvoice(receivable)}
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