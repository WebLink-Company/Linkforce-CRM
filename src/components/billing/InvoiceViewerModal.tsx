import React, { useState } from 'react';
import { X, Mail, Printer, Building2, Phone, Mail as MailIcon, MapPin, User, Briefcase, Edit } from 'lucide-react';
import type { Invoice } from '../../types/billing';
import { billingAPI } from '../../lib/api/billing';
import PaymentModal from './PaymentModal';
import PaymentHistory from './PaymentHistory';
import PaymentSummary from './PaymentSummary';
import EditInvoiceModal from './EditInvoiceModal';
import SendEmailModal from './SendEmailModal';

interface InvoiceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export default function InvoiceViewerModal({ isOpen, onClose, invoice }: InvoiceViewerModalProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    if (invoice.customer?.email) {
      window.location.href = `mailto:${invoice.customer.email}?subject=Factura ${invoice.ncf}&body=Adjunto factura ${invoice.ncf}`;
    }
  };

  const handleIssueInvoice = async () => {
    setIssuing(true);
    setError(null);
    try {
      const { error } = await billingAPI.issueInvoice(invoice.id);
      if (error) throw error;
      window.location.reload(); // Reload to get updated invoice
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error issuing invoice');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl my-8">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">Factura #{invoice.ncf}</h2>
          <div className="flex items-center space-x-2">
            {invoice.status === 'draft' && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </button>
                <button
                  onClick={handleIssueInvoice}
                  disabled={issuing}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {issuing ? 'Emitiendo...' : 'Emitir Factura'}
                </button>
              </>
            )}
            <button
              onClick={() => setShowEmailModal(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Mail className="h-4 w-4 mr-2" />
              Enviar por Email
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Invoice Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row justify-between">
                <div className="mb-4 md:mb-0">
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Quimicinter S.R.L</h1>
                    <h2 className="text-lg text-gray-800 mb-4">Productos Químicos Industriales e Institucionales</h2>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Calle Parada Vieja #38 Monte Adentro, Santiago, R.D</p>
                      <p>Tel: 809-582-6495 | Cel: 809-753-5288</p>
                      <p>Email: lr-quimicinter@hotmail.com</p>
                      <p>RNC: 1-01-12345-6</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">Factura de Crédito Fiscal</h3>
                    <p className="text-gray-600">NCF: {invoice.ncf}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Fecha de Emisión: {formatDate(invoice.issue_date)}</p>
                    <p>Fecha de Vencimiento: {formatDate(invoice.due_date)}</p>
                    <p className="mt-2">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        invoice.status === 'issued' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'voided' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status === 'issued' ? 'Emitida' :
                         invoice.status === 'voided' ? 'Anulada' : 'Borrador'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Información del Cliente
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-2">
                    <Building2 className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Razón Social</p>
                      <p className="font-medium">{invoice.customer?.full_name}</p>
                      {invoice.customer?.commercial_name && (
                        <p className="text-sm text-gray-600">{invoice.customer.commercial_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <MailIcon className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">{invoice.customer?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Dirección</p>
                      <p className="font-medium">{invoice.customer?.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Phone className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Teléfono</p>
                      <p className="font-medium">{invoice.customer?.phone}</p>
                    </div>
                  </div>

                  {invoice.customer?.contact_name && (
                    <div className="flex items-start space-x-2">
                      <User className="h-4 w-4 mt-1 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Contacto</p>
                        <p className="font-medium">{invoice.customer.contact_name}</p>
                        {invoice.customer?.contact_position && (
                          <p className="text-sm text-gray-600">{invoice.customer.contact_position}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {invoice.customer?.contact_phone && (
                    <div className="flex items-start space-x-2">
                      <Phone className="h-4 w-4 mt-1 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Teléfono Contacto</p>
                        <p className="font-medium">{invoice.customer.contact_phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Código
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Producto
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Cantidad
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Precio
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        ITBIS
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          {item.product?.code}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          {item.product?.name}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900 text-right">
                          {item.quantity} {item.product?.unit_measure}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900 text-right">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900 text-right">
                          {formatCurrency(item.tax_amount)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900 text-right">
                          {formatCurrency(item.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ITBIS (18%):</span>
                      <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
                    </div>
                    {invoice.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Descuento:</span>
                        <span>-{formatCurrency(invoice.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(invoice.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Information */}
            <div className="space-y-6">
              <PaymentSummary
                invoice={invoice}
                onPaymentClick={() => setShowPaymentModal(true)}
              />

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Historial de Pagos</h3>
                <PaymentHistory payments={invoice.payments || []} />
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 text-sm text-gray-600">
              <h4 className="font-medium text-gray-700 mb-1">Notas:</h4>
              <p>{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-8 border-t text-xs text-gray-500 text-center">
            <p>Este documento es una factura de crédito fiscal válida para fines tributarios.</p>
            <p>Gracias por hacer negocios con Quimicinter S.R.L</p>
          </div>
        </div>
      </div>

      <EditInvoiceModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          setShowEditModal(false);
          window.location.reload();
        }}
        invoice={invoice}
      />

      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        invoice={invoice}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
          window.location.reload();
        }}
        invoice={invoice}
      />
    </div>
  );
}