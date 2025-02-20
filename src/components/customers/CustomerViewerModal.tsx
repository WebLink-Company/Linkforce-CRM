import React from 'react';
import { X, Building2, Phone, Mail, MapPin, CreditCard, FileText } from 'lucide-react';
import type { Customer } from '../../types/customer';

interface CustomerViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export default function CustomerViewerModal({ isOpen, onClose, customer }: CustomerViewerModalProps) {
  if (!isOpen || !customer) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      {/* Glowing Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.15),transparent_50%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.2),transparent_50%)] blur-2xl"></div>
      </div>

      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-3xl border border-white/10 shadow-2xl">
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

        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            {customer.type === 'corporate' ? 'Cliente Empresarial' : 'Cliente Individual'}
          </h2>
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
                  <div>
                    <p className="text-sm text-gray-400">RNC/Cédula</p>
                    <p className="font-medium text-white">{customer.identification_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Nombre</p>
                    <p className="font-medium text-white">{customer.full_name}</p>
                    {customer.commercial_name && (
                      <p className="text-sm text-gray-400 mt-1">{customer.commercial_name}</p>
                    )}
                  </div>
                  {customer.industry_sector && (
                    <div>
                      <p className="text-sm text-gray-400">Sector Industrial</p>
                      <p className="font-medium text-white">{customer.industry_sector}</p>
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
                      <p className="font-medium text-white">{customer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-400">Teléfono</p>
                      <p className="font-medium text-white">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-400">Dirección</p>
                      <p className="font-medium text-white">{customer.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Facturación</h3>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-400">Tipo de Comprobante</p>
                      <p className="font-medium text-white">
                        {customer.invoice_type === 'B01' && 'Crédito Fiscal (B01)'}
                        {customer.invoice_type === 'B02' && 'Consumo (B02)'}
                        {customer.invoice_type === 'B14' && 'Gubernamental (B14)'}
                        {customer.invoice_type === 'B15' && 'Exportación (B15)'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-400">Condiciones de Pago</p>
                      <p className="font-medium text-white">
                        {customer.payment_terms === 'contado' ? 'Contado' : `${customer.payment_terms} días`}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Límite de Crédito</p>
                    <p className="font-medium text-white">
                      {formatCurrency(customer.credit_limit || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {customer.type === 'corporate' && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Contacto Principal</h3>
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                    {customer.contact_name && (
                      <div>
                        <p className="text-sm text-gray-400">Nombre</p>
                        <p className="font-medium text-white">{customer.contact_name}</p>
                      </div>
                    )}
                    {customer.contact_position && (
                      <div>
                        <p className="text-sm text-gray-400">Cargo</p>
                        <p className="font-medium text-white">{customer.contact_position}</p>
                      </div>
                    )}
                    {customer.contact_phone && (
                      <div>
                        <p className="text-sm text-gray-400">Teléfono</p>
                        <p className="font-medium text-white">{customer.contact_phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {customer.notes && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-4">Notas</h3>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <p className="text-gray-300 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}