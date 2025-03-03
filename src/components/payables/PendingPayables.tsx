import React, { useState, useEffect } from 'react';
import { payablesAPI } from '../../lib/api/payables';
import { AlertTriangle, Eye } from 'lucide-react';
import type { SupplierInvoice } from '../../types/payables';
import InvoiceViewerModal from './SupplierInvoiceViewer';

interface PendingPayable {
  invoice_id: string;
  supplier_id: string;
  supplier_name: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  days_overdue: number;
  supplier: any;
  items: any[];
  payments: any[];
}

export default function PendingPayables() {
  const [payables, setPayables] = useState<PendingPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [showViewerModal, setShowViewerModal] = useState(false);

  useEffect(() => {
    loadPayables();
  }, []);

  const loadPayables = async () => {
    try {
      const { data, error } = await payablesAPI.getPendingPayables();
      if (error) throw error;
      setPayables(data || []);
    } catch (error) {
      console.error('Error loading payables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (payable: PendingPayable) => {
    const invoice: SupplierInvoice = {
      id: payable.invoice_id,
      number: payable.invoice_number,
      supplier_id: payable.supplier_id,
      issue_date: payable.issue_date,
      due_date: payable.due_date,
      status: 'approved',
      payment_status: payable.paid_amount >= payable.total_amount ? 'paid' : 'partial',
      subtotal: payable.total_amount - (payable.total_amount * 0.18),
      tax_amount: payable.total_amount * 0.18,
      discount_amount: 0,
      total_amount: payable.total_amount,
      supplier: payable.supplier,
      items: payable.items,
      payments: payable.payments,
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

  if (!payables.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        No hay facturas pendientes de pago
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
                Proveedor
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
            {payables.map((payable) => (
              <tr key={payable.invoice_id} className="hover:bg-gray-700/30">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {payable.supplier_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {payable.invoice_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {new Date(payable.due_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">
                  {formatCurrency(payable.total_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-400 text-right">
                  {formatCurrency(payable.paid_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400 text-right font-medium">
                  {formatCurrency(payable.pending_amount)}
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
                    onClick={() => handleViewInvoice(payable)}
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