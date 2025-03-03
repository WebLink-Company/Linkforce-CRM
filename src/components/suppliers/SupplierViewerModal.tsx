import React from 'react';
import { X, Building2, Phone, Mail, MapPin, Globe, Briefcase, CreditCard, FileText } from 'lucide-react';
import type { Supplier } from '../../types/payables';

interface SupplierViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export default function SupplierViewerModal({ isOpen, onClose, supplier }: SupplierViewerModalProps) {
  if (!isOpen || !supplier) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-3xl border border-white/10 shadow-2xl">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Detalles del Proveedor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Información General</h3>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                  <div className="flex items-center">
                    <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-400">Razón Social</p>
                      <p className="font-medium text-white">{supplier.business_name}</p>
                      {supplier.commercial_name && (
                        <p className="text-sm text-gray-400">{supplier.commercial_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-400">RNC</p>
                      <p className="font-medium text-white">{supplier.tax_id}</p>
                    </div>
                  </div>
                  {supplier.website && (
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-400">Sitio Web</p>
                        <a 
                          href={supplier.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-emerald-400 hover:text-emerald-300"
                        >
                          {supplier.website}
                        </a>
                      </div>
                    </div>
                  )}
                  {supplier.industry_sector && (
                    <div className="flex items-center">
                      <Briefcase className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-400">Sector Industrial</p>
                        <p className="font-medium text-white">{supplier.industry_sector}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-4">Contacto</h3>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="font-medium text-white">{supplier.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-400">Teléfono</p>
                      <p className="font-medium text-white">{supplier.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-400">Dirección</p>
                      <p className="font-medium text-white">{supplier.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Información de Facturación</h3>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Tipo de Comprobante</p>
                    <p className="font-medium text-white">
                      {supplier.invoice_type === 'B01' && 'Factura de Crédito Fiscal (B01)'}
                      {supplier.invoice_type === 'B02' && 'Factura de Consumo (B02)'}
                      {supplier.invoice_type === 'B14' && 'Factura Gubernamental (B14)'}
                      {supplier.invoice_type === 'B15' && 'Factura para Exportaciones (B15)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Condiciones de Pago</p>
                    <p className="font-medium text-white">
                      {supplier.payment_terms === 'contado' ? 'Contado' : `${supplier.payment_terms} días`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Límite de Crédito</p>
                    <p className="font-medium text-white">
                      {formatCurrency(supplier.credit_limit)}
                    </p>
                  </div>
                </div>
              </div>

              {(supplier.contact_name || supplier.contact_position || supplier.contact_phone) && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Contacto Principal</h3>
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                    {supplier.contact_name && (
                      <div>
                        <p className="text-sm text-gray-400">Nombre</p>
                        <p className="font-medium text-white">{supplier.contact_name}</p>
                      </div>
                    )}
                    {supplier.contact_position && (
                      <div>
                        <p className="text-sm text-gray-400">Cargo</p>
                        <p className="font-medium text-white">{supplier.contact_position}</p>
                      </div>
                    )}
                    {supplier.contact_phone && (
                      <div>
                        <p className="text-sm text-gray-400">Teléfono</p>
                        <p className="font-medium text-white">{supplier.contact_phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {supplier.notes && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-4">Notas</h3>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <p className="text-gray-300 whitespace-pre-wrap">{supplier.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}