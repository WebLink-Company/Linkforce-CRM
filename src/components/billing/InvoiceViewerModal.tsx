import React, { useState } from 'react';
import { X, Mail, Printer, Building2, Phone, Mail as MailIcon, MapPin, User, Send } from 'lucide-react';
import type { Invoice } from '../../types/billing';
import { supabase } from '../../lib/supabase';
import PaymentModal from './PaymentModal';
import PaymentHistory from './PaymentHistory';
import SendEmailModal from './SendEmailModal';

interface InvoiceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export default function InvoiceViewerModal({ isOpen, onClose, invoice }: InvoiceViewerModalProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
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
    if (!window.confirm('¿Está seguro que desea emitir esta factura? Una vez emitida no podrá modificarla.')) {
      return;
    }

    setIssuing(true);
    setError(null);

    try {
      const { error } = await supabase.rpc('issue_invoice', {
        p_invoice_id: invoice.id
      });

      if (error) throw error;

      window.location.reload();
    } catch (error) {
      console.error('Error issuing invoice:', error);
      setError(error instanceof Error ? error.message : 'Error al emitir la factura');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      {/* Glowing Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.15),transparent_50%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.2),transparent_50%)] blur-2xl"></div>
      </div>

      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col border border-white/10 shadow-2xl">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          {/* Top border */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-[2px] w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Bottom border */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-[2px] w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Left border */}
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-[2px] h-3/4 my-auto bg-gradient-to-b from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Right border */}
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-[2px] h-3/4 my-auto bg-gradient-to-b from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Corner glows */}
          <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
        </div>

        {/* Fixed Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm rounded-t-lg">
          <h2 className="text-lg font-semibold text-white">Factura #{invoice.ncf}</h2>
          <div className="flex items-center space-x-2">
            {invoice.status === 'draft' && (
              <button
                onClick={handleIssue}
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
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white transition-colors"
            >
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Invoice Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row justify-between">
                <div className="mb-4 md:mb-0">
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-white mb-2">
                      Quimicinter S.R.L
                    </h1>
                    <h2 className="text-lg text-gray-300 mb-4">
                      Productos Químicos Industriales e Institucionales
                    </h2>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>Calle Parada Vieja #38 Monte Adentro, Santiago, R.D</p>
                      <p>Tel: 809-582-6495 | Cel: 809-753-5288</p>
                      <p>Email: lr-quimicinter@hotmail.com</p>
                      <p>RNC: 1-01-12345-6</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      Factura de Crédito Fiscal
                    </h3>
                    <p className="text-gray-400">#{invoice.ncf}</p>
                  </div>
                  <div className="text-sm text-gray-400">
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

              {/* Contact Information */}
              <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Información del Cliente
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start space-x-2">
                    <Building2 className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Razón Social</p>
                      <p className="font-medium text-white">{invoice.customer?.full_name}</p>
                      {invoice.customer?.commercial_name && (
                        <p className="text-sm text-gray-400">{invoice.customer.commercial_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <MailIcon className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-white">{invoice.customer?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Dirección</p>
                      <p className="font-medium text-white">{invoice.customer?.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Phone className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Teléfono</p>
                      <p className="font-medium text-white">{invoice.customer?.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="table-container">
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="table-header">
                    <tr>
                      <th scope="col" className="table-header th">Código</th>
                      <th scope="col" className="table-header th">Producto</th>
                      <th scope="col" className="table-header th text-right">Cantidad</th>
                      <th scope="col" className="table-header th text-right">Precio</th>
                      <th scope="col" className="table-header th text-right">ITBIS</th>
                      <th scope="col" className="table-header th text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {invoice.items?.map((item, index) => (
                      <tr key={index} className="table-row">
                        <td className="table-cell font-medium">{item.product?.code}</td>
                        <td className="table-cell">{item.product?.name}</td>
                        <td className="table-cell text-right">
                          {item.quantity} {item.product?.unit_measure}
                        </td>
                        <td className="table-cell text-right">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(item.unit_price)}
                        </td>
                        <td className="table-cell text-right">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(item.tax_amount)}
                        </td>
                        <td className="table-cell text-right font-medium">
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
              <div className="flex justify-end">
                <div className="w-64 bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-white/10">
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
                    <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2 mt-2">
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
            </div>

            {/* Right Column - Payment Information */}
            {invoice.status === 'issued' && (
              <div className="space-y-6">
                {/* Payment Status */}
                <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                  <h3 className="text-sm font-medium text-gray-300 mb-4">Estado de Pago</h3>
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
                        }).format(
                          invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Monto Pendiente</p>
                      <p className="text-lg font-semibold text-blue-400">
                        {new Intl.NumberFormat('es-DO', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(
                          invoice.total_amount - (invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)
                        )}
                      </p>
                    </div>

                    {invoice.status === 'issued' && invoice.payment_status !== 'paid' && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full mt-4 btn btn-primary"
                      >
                        Registrar Pago
                      </button>
                    )}
                  </div>
                </div>

                {/* Payment History */}
                {invoice.payments && invoice.payments.length > 0 && (
                  <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                    <h3 className="text-sm font-medium text-gray-300 mb-4">Historial de Pagos</h3>
                    <PaymentHistory payments={invoice.payments} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 text-sm text-gray-400">
              <h4 className="font-medium text-gray-300 mb-1">Notas:</h4>
              <p>{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
          window.location.reload();
        }}
        invoice={invoice}
      />

      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        invoice={invoice}
      />
    </div>
  );
}