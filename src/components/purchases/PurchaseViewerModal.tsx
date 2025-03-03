import React, { useState } from 'react';
import { X, Mail, Printer, Building2, Phone, Mail as MailIcon, MapPin, User, Send } from 'lucide-react';
import type { PurchaseOrder } from '../../types/payables';
import { supabase } from '../../lib/supabase';
import EditPurchaseModal from './EditPurchaseModal';

interface PurchaseViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: PurchaseOrder | null;
  onSuccess?: () => void;
}

export default function PurchaseViewerModal({ isOpen, onClose, purchase, onSuccess }: PurchaseViewerModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
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
      const { error } = await supabase.rpc('issue_purchase_order', {
        p_order_id: purchase.id
      });

      if (error) throw error;

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error issuing purchase order:', error);
      setError(error instanceof Error ? error.message : 'Error al emitir la orden de compra');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
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
                Orden de Compra
                <br />
                #{purchase.number}
              </h3>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Fecha de Emisión: {new Date(purchase.issue_date).toLocaleDateString('es-DO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                {purchase.expected_date && (
                  <p>Fecha Esperada: {new Date(purchase.expected_date).toLocaleDateString('es-DO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                )}
                <p className="mt-2">
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
                </p>
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="bg-gray-800/50 p-4 rounded-lg mb-8">
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
          <div className="flex justify-end mb-8">
            <div className="w-64 bg-gray-800/50 p-4 rounded-lg border border-white/10">
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
                    <span>-{new Intl.NumberFormat('es-DO', {
                      style: 'currency',
                      currency: 'DOP'
                    }).format(purchase.discount_amount)}</span>
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

          {/* Notes */}
          {purchase.notes && (
            <div className="mb-8">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Notas:</h4>
              <p className="text-sm text-gray-400">{purchase.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-gray-400 border-t border-white/10 pt-4">
            <p>Este documento es una orden de compra oficial de Quimicinter S.R.L</p>
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
    </div>
  );
}