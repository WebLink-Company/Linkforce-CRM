import React, { useState } from 'react';
import { X, Mail, Printer, Building2, Phone, Mail as MailIcon, MapPin, User, Send } from 'lucide-react';
import type { Invoice } from '../../types/billing';
import { supabase } from '../../lib/supabase';
import PaymentModal from './PaymentModal';
import PaymentHistory from './PaymentHistory';
import SendEmailModal from './SendEmailModal';
import ConfirmationModal from './ConfirmationModal';

interface InvoiceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess?: () => void;
}

export default function InvoiceViewerModal({ isOpen, onClose, invoice, onSuccess }: InvoiceViewerModalProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    setShowEmailModal(true);
  };

  const handleIssue = async () => {
    setShowConfirmation(false);
    setIssuing(true);
    setError(null);

    try {
      // Update the issue date to current date before issuing
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          issue_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      // Issue the invoice
      const { error } = await supabase.rpc('issue_invoice', {
        p_invoice_id: invoice.id
      });

      if (error) throw error;

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error issuing invoice:', error);
      setError(error instanceof Error ? error.message : 'Error al emitir la factura');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-4xl my-8 border border-white/10 shadow-2xl">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        {/* Fixed Header */}
        <div className="sticky top-0 flex justify-between items-center p-4 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm rounded-t-lg z-50">
          <h2 className="text-lg font-semibold text-white">Factura #{invoice.ncf}</h2>
          <div className="flex items-center space-x-2">
            {invoice.status === 'draft' && (
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={issuing}
                className="btn btn-primary"
              >
                <Send className="h-4 w-4 mr-2" />
                {issuing ? 'Emitiendo...' : 'Emitir Factura'}
              </button>
            )}
            <button
              onClick={handleEmail}
              className="btn btn-secondary"
            >
              <Mail className="h-4 w-4 mr-2" />
              Enviar por Email
            </button>
            <button
              onClick={handlePrint}
              className="btn btn-secondary"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border-b border-red-500/50">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Company Information */}
            <div>
              <h1 className="text-xl font-bold text-white mb-2">Quimicinter S.R.L</h1>
              <h2 className="text-lg text-gray-300 mb-4">Productos Químicos Industriales e Institucionales</h2>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Calle Parada Vieja #38 Monte Adentro, Santiago, R.D</p>
                <p>Tel: 809-582-6495 | Cel: 809-753-5288</p>
                <p>Email: lr-quimicinter@hotmail.com</p>
                <p>RNC: 1-01-12345-6</p>
              </div>
            </div>

            {/* Order Information */}
            <div className="text-right">
              <h3 className="text-lg font-semibold text-white mb-2">
                Factura
                <br />
                #{invoice.ncf}
              </h3>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Fecha de Emisión: {new Date(invoice.issue_date).toLocaleDateString('es-DO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                <p>Fecha de Vencimiento: {new Date(invoice.due_date).toLocaleDateString('es-DO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                <p className="mt-2">
                  <span className={`status-badge ${
                    invoice.status === 'issued' ? 'status-badge-success' :
                    invoice.status === 'voided' ? 'status-badge-error' :
                    'status-badge-warning'
                  }`}>
                    {invoice.status === 'issued' ? 'Emitida' :
                     invoice.status === 'voided' ? 'Anulada' :
                     'Borrador'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 mb-8">
            <h4 className="text-sm font-medium text-gray-300 mb-4">
              <User className="h-4 w-4 inline mr-2" />
              Información del Cliente
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Razón Social</p>
                <p className="font-medium text-white">{invoice.customer?.full_name}</p>
                {invoice.customer?.commercial_name && (
                  <p className="text-sm text-gray-400">{invoice.customer.commercial_name}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-400">RNC</p>
                <p className="font-medium text-white">{invoice.customer?.identification_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="font-medium text-white">{invoice.customer?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Teléfono</p>
                <p className="font-medium text-white">{invoice.customer?.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-400">Dirección</p>
                <p className="font-medium text-white">{invoice.customer?.address}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="min-w-full divide-y divide-white/10">
              <thead>
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    CÓDIGO
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    PRODUCTO
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    CANTIDAD
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    PRECIO
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    ITBIS
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {invoice.items?.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {item.product?.code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {item.product?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">
                      {item.quantity} {item.product?.unit_measure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(item.tax_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(item.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white">
                    {new Intl.NumberFormat('es-DO', {
                      style: 'currency',
                      currency: 'DOP'
                    }).format(invoice.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">ITBIS (18%):</span>
                  <span className="text-white">
                    {new Intl.NumberFormat('es-DO', {
                      style: 'currency',
                      currency: 'DOP'
                    }).format(invoice.tax_amount)}
                  </span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-red-400">
                    <span>Descuento:</span>
                    <span>
                      -{new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(invoice.discount_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
                  <span className="text-white">Total:</span>
                  <span className="text-white">
                    {new Intl.NumberFormat('es-DO', {
                      style: 'currency',
                      currency: 'DOP'
                    }).format(invoice.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-8">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Notas:</h4>
              <p className="text-sm text-gray-400">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-gray-400 border-t border-white/10 pt-4">
            <p>Este documento es una factura oficial de Quimicinter S.R.L</p>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
          if (onSuccess) onSuccess();
        }}
        invoice={invoice}
      />

      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        invoice={invoice}
      />

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleIssue}
        title="Confirmar Emisión"
        message="¿Está seguro que desea emitir esta factura? Una vez emitida no podrá modificarla."
        loading={issuing}
      />
    </div>
  );
}