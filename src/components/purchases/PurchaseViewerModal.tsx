import React, { useState } from 'react';
import { X, Mail, Printer, Building2, Phone, Mail as MailIcon, MapPin, User, Send, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import type { PurchaseOrder } from '../../types/payables';
import { purchasesAPI } from '../../lib/api/purchases';
import EditPurchaseModal from './EditPurchaseModal';
import PurchasePaymentModal from './PurchasePaymentModal';

interface PurchaseViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: PurchaseOrder | null;
  onSuccess?: () => void;
}

export default function PurchaseViewerModal({ isOpen, onClose, purchase, onSuccess }: PurchaseViewerModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !purchase) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    if (purchase.supplier?.email) {
      window.location.href = `mailto:${purchase.supplier.email}?subject=Orden de Compra ${purchase.number}`;
    }
  };

  const handleIssue = async () => {
    if (!window.confirm('¿Está seguro que desea emitir esta orden de compra? Una vez emitida no podrá modificarla.')) {
      return;
    }

    setIssuing(true);
    setError(null);

    try {
      const { success, error } = await purchasesAPI.issuePurchaseOrder(purchase.id);
      if (!success) throw error;

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error issuing purchase order:', error);
      setError(error instanceof Error ? error.message : 'Error al emitir la orden de compra');
    } finally {
      setIssuing(false);
    }
  };

  // Calculate payment totals
  const totalPaid = purchase.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const remainingAmount = purchase.total_amount - totalPaid;

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

        {/* Main Content */}
        <div className="flex">
          {/* Left Column - Order Details */}
          <div className="flex-1 overflow-y-auto max-h-[90vh]">
            {/* Fixed Header */}
            <div className="sticky top-0 flex justify-between items-center p-4 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm rounded-t-lg z-50">
              <h2 className="text-lg font-semibold text-white">Orden de Compra #{purchase.number}</h2>
              <div className="flex items-center space-x-2">
                {purchase.status === 'draft' && (
                  <button
                    onClick={handleIssue}
                    disabled={issuing}
                    className="btn btn-primary"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {issuing ? 'Emitiendo...' : 'Emitir Orden'}
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

            <div className="p-6 space-y-6">
              {/* Order Status */}
              <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Estado</p>
                    <span className={`status-badge ${
                      purchase.status === 'draft' ? 'status-badge-warning' :
                      purchase.status === 'sent' ? 'status-badge-info' :
                      purchase.status === 'confirmed' ? 'status-badge-success' :
                      purchase.status === 'received' ? 'status-badge-success' :
                      'status-badge-error'
                    }`}>
                      {purchase.status === 'draft' ? 'Borrador' :
                       purchase.status === 'sent' ? 'Enviada' :
                       purchase.status === 'confirmed' ? 'Confirmada' :
                       purchase.status === 'received' ? 'Recibida' :
                       'Cancelada'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Fecha de Emisión</p>
                    <p className="font-medium text-white">
                      {new Date(purchase.issue_date).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Supplier Information */}
              <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <h4 className="text-sm font-medium text-gray-300 mb-4">
                  <Building2 className="h-4 w-4 inline mr-2" />
                  Información del Proveedor
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Razón Social</p>
                    <p className="font-medium text-white">{purchase.supplier?.business_name}</p>
                    {purchase.supplier?.commercial_name && (
                      <p className="text-sm text-gray-400">{purchase.supplier.commercial_name}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">RNC</p>
                    <p className="font-medium text-white">{purchase.supplier?.tax_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="font-medium text-white">{purchase.supplier?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Teléfono</p>
                    <p className="font-medium text-white">{purchase.supplier?.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-400">Dirección</p>
                    <p className="font-medium text-white">{purchase.supplier?.address}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <h4 className="text-sm font-medium text-gray-300 mb-4">Productos</h4>
                <div className="overflow-x-auto">
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
                      {purchase.items?.map((item, index) => (
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
                <div className="mt-4 flex justify-end">
                  <div className="w-64">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Subtotal:</span>
                        <span className="text-white">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(purchase.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">ITBIS (18%):</span>
                        <span className="text-white">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(purchase.tax_amount)}
                        </span>
                      </div>
                      {purchase.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-red-400">
                          <span>Descuento:</span>
                          <span>
                            -{new Intl.NumberFormat('es-DO', {
                              style: 'currency',
                              currency: 'DOP'
                            }).format(purchase.discount_amount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
                        <span className="text-white">Total:</span>
                        <span className="text-white">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(purchase.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {purchase.notes && (
                <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Notas:</h4>
                  <p className="text-sm text-gray-400">{purchase.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Payment Information */}
          <div className="w-80 border-l border-white/10 p-6 overflow-y-auto max-h-[90vh]">
            {/* Payment Summary */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">Resumen de Pagos</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Total Orden</p>
                  <p className="text-lg font-semibold text-white">
                    {new Intl.NumberFormat('es-DO', {
                      style: 'currency',
                      currency: 'DOP'
                    }).format(purchase.total_amount)}
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

                {purchase.status !== 'draft' && remainingAmount > 0 && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </button>
                )}
              </div>
            </div>

            {/* Payment History */}
            {purchase.payments && purchase.payments.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-white mb-4">Historial de Pagos</h3>
                <div className="space-y-4">
                  {purchase.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-gray-800/50 p-4 rounded-lg border border-white/10"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-white">
                            {new Intl.NumberFormat('es-DO', {
                              style: 'currency',
                              currency: 'DOP'
                            }).format(payment.amount)}
                          </p>
                          <p className="text-sm text-gray-400">
                            {payment.payment_method?.name}
                          </p>
                          {payment.reference_number && (
                            <p className="text-sm text-gray-400">
                              Ref: {payment.reference_number}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {new Date(payment.payment_date).toLocaleDateString('es-DO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      {payment.notes && (
                        <p className="mt-2 text-sm text-gray-400 border-t border-white/10 pt-2">
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
      </div>

      {showEditModal && (
        <EditPurchaseModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            if (onSuccess) onSuccess();
            setShowEditModal(false);
            onClose();
          }}
          purchase={purchase}
        />
      )}

      <PurchasePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          if (onSuccess) onSuccess();
          setShowPaymentModal(false);
        }}
        purchase={purchase}
      />
    </div>
  );
}
