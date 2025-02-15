import React, { useState } from 'react';
import { X, Mail, Printer, Building2, Phone, Mail as MailIcon, MapPin, User, Briefcase } from 'lucide-react';
import type { SupplierInvoice } from '../../types/payables';
import { payablesAPI } from '../../lib/api/payables';
import PaymentModal from './SupplierPaymentModal';

interface SupplierInvoiceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SupplierInvoice | null;
}

export default function SupplierInvoiceViewer({ isOpen, onClose, invoice }: SupplierInvoiceViewerProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
    if (invoice.supplier?.email) {
      window.location.href = `mailto:${invoice.supplier.email}?subject=Factura ${invoice.number}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl my-8">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Factura #{invoice.number}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleEmail}
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

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Invoice Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row justify-between">
                <div className="mb-4 md:mb-0">
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                      {invoice.supplier?.business_name}
                    </h1>
                    {invoice.supplier?.commercial_name && (
                      <h2 className="text-lg text-gray-800 mb-4">
                        {invoice.supplier.commercial_name}
                      </h2>
                    )}
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{invoice.supplier?.address}</p>
                      <p>RNC: {invoice.supplier?.tax_id}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Factura de Proveedor
                    </h3>
                    <p className="text-gray-600">#{invoice.number}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Fecha de Emisión: {formatDate(invoice.issue_date)}</p>
                    <p>Fecha de Vencimiento: {formatDate(invoice.due_date)}</p>
                    <p className="mt-2">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        invoice.status === 'approved' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        invoice.status === 'voided' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status === 'approved' ? 'Aprobada' :
                         invoice.status === 'rejected' ? 'Rechazada' :
                         invoice.status === 'voided' ? 'Anulada' :
                         'Pendiente'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Información de Contacto
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invoice.supplier?.contact_name && (
                    <div className="flex items-start space-x-2">
                      <User className="h-4 w-4 mt-1 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Contacto</p>
                        <p className="font-medium">{invoice.supplier.contact_name}</p>
                        {invoice.supplier.contact_position && (
                          <p className="text-sm text-gray-600">
                            {invoice.supplier.contact_position}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {invoice.supplier?.email && (
                    <div className="flex items-start space-x-2">
                      <MailIcon className="h-4 w-4 mt-1 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium">{invoice.supplier.email}</p>
                      </div>
                    </div>
                  )}

                  {invoice.supplier?.phone && (
                    <div className="flex items-start space-x-2">
                      <Phone className="h-4 w-4 mt-1 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Teléfono</p>
                        <p className="font-medium">{invoice.supplier.phone}</p>
                      </div>
                    </div>
                  )}

                  {invoice.supplier?.address && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 mt-1 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Dirección</p>
                        <p className="font-medium">{invoice.supplier.address}</p>
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
              {/* Payment Status */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Estado de Pago</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Facturado</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Pagado</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(
                        invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Monto Pendiente</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(
                        invoice.total_amount - (invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)
                      )}
                    </p>
                  </div>

                  {invoice.status === 'approved' && invoice.payment_status !== 'paid' && (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Registrar Pago
                    </button>
                  )}
                </div>
              </div>

              {/* Payment History */}
              {invoice.payments && invoice.payments.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Historial de Pagos</h3>
                  <div className="space-y-4">
                    {invoice.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="border-b border-gray-200 last:border-0 pb-4 last:pb-0"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {payment.payment_method?.name}
                            </p>
                            {payment.reference_number && (
                              <p className="text-sm text-gray-500">
                                Ref: {payment.reference_number}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatDate(payment.payment_date)}
                          </p>
                        </div>
                        {payment.notes && (
                          <p className="mt-2 text-sm text-gray-600">
                            {payment.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 text-sm text-gray-600">
              <h4 className="font-medium text-gray-700 mb-1">Notas:</h4>
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
    </div>
  );
}