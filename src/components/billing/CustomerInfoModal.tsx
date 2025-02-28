import React from 'react';
import { X } from 'lucide-react';
import { Customer } from '../../types/customer';

interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export default function CustomerInfoModal({ isOpen, onClose, customer }: CustomerInfoModalProps) {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-white rounded-lg w-full max-w-2xl modal-content">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Información del Cliente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Información Principal */}
            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información Principal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Razón Social</label>
                  <p className="mt-1 text-sm text-gray-900">{customer.full_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">RNC</label>
                  <p className="mt-1 text-sm text-gray-900">{customer.identification_number}</p>
                </div>
                {customer.commercial_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nombre Comercial</label>
                    <p className="mt-1 text-sm text-gray-900">{customer.commercial_name}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Tipo de Comprobante</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {customer.invoice_type === 'B01' && 'Factura de Crédito Fiscal (B01)'}
                    {customer.invoice_type === 'B02' && 'Factura de Consumo (B02)'}
                    {customer.invoice_type === 'B14' && 'Factura Gubernamental (B14)'}
                    {customer.invoice_type === 'B15' && 'Factura para Exportaciones (B15)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sector Industrial */}
            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sector Industrial</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900">{customer.industry_sector}</p>
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información de Contacto</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Dirección Fiscal</label>
                  <p className="mt-1 text-sm text-gray-900">{customer.address}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Teléfono</label>
                  <p className="mt-1 text-sm text-gray-900">{customer.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Correo Electrónico</label>
                  <p className="mt-1 text-sm text-gray-900">{customer.email}</p>
                </div>
              </div>
            </div>

            {/* Estado y Pagos */}
            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Estado y Pagos</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Estado del Contribuyente</label>
                  <span className={`inline-flex mt-1 rounded-full px-2 text-xs font-semibold ${
                    customer.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Condiciones de Pago</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {customer.payment_terms === 'contado' ? 'Contado' : `${customer.payment_terms} días`}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Límite de Crédito</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Intl.NumberFormat('es-DO', {
                      style: 'currency',
                      currency: 'DOP'
                    }).format(customer.credit_limit || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}