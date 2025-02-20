import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import IndustrySectorSelector from '../billing/IndustrySectorSelector';

interface CreateCorporateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCorporateCustomerModal({ isOpen, onClose, onSuccess }: CreateCorporateCustomerModalProps) {
  const [formData, setFormData] = useState({
    business_name: '',
    commercial_name: '',
    identification_number: '',
    industry_sector: '',
    website: '',
    street: '',
    street_number: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'DO',
    phone: '',
    email: '',
    contact_name: '',
    contact_position: '',
    contact_phone: '',
    invoice_type: '',
    payment_terms: '',
    preferred_currency: 'DOP',
    credit_limit: 0,
    notes: '',
    status: 'active' as const
  });

  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedSubsector, setSelectedSubsector] = useState('');

  const handleSectorChange = (sector: string, subsector: string) => {
    setSelectedSector(sector);
    setSelectedSubsector(subsector);
    setFormData({
      ...formData,
      industry_sector: `${sector}${subsector ? ` - ${subsector}` : ''}`
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {};

    // Required fields
    if (!formData.business_name) newErrors.business_name = 'La razón social es requerida';
    if (!formData.identification_number) newErrors.identification_number = 'El RNC es requerido';
    if (!formData.phone) newErrors.phone = 'El teléfono es requerido';
    if (!formData.email) newErrors.email = 'El email es requerido';
    if (!formData.street) newErrors.street = 'La dirección es requerida';
    if (!formData.city) newErrors.city = 'La ciudad es requerida';
    if (!formData.state) newErrors.state = 'La provincia es requerida';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'El formato del email es inválido';
    }

    // Phone validation
    const phoneRegex = /^\+?[\d\s-]{8,}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = 'El formato del teléfono es inválido';
    }

    // RNC validation (9 or 11 digits)
    const rncRegex = /^\d{9,11}$/;
    if (formData.identification_number && !rncRegex.test(formData.identification_number)) {
      newErrors.identification_number = 'El RNC debe tener entre 9 y 11 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Create customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([{
          type: 'corporate',
          identification_number: formData.identification_number,
          full_name: formData.business_name,
          commercial_name: formData.commercial_name,
          email: formData.email,
          phone: formData.phone,
          address: `${formData.street} ${formData.street_number}, ${formData.city}, ${formData.state}`,
          postal_code: formData.postal_code,
          country: formData.country,
          website: formData.website,
          industry_sector: formData.industry_sector,
          contact_name: formData.contact_name,
          contact_position: formData.contact_position,
          contact_phone: formData.contact_phone,
          invoice_type: formData.invoice_type,
          payment_terms: formData.payment_terms,
          preferred_currency: formData.preferred_currency,
          credit_limit: formData.credit_limit,
          notes: formData.notes,
          status: formData.status,
          created_by: user.id,
        }])
        .select()
        .single();

      if (customerError) throw customerError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error in customer creation:', error);
      setGeneralError(error instanceof Error ? error.message : 'Error creating customer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      {/* Glowing Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.15),transparent_50%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.2),transparent_50%)] blur-2xl"></div>
      </div>

      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-4xl my-8 border border-white/10 shadow-2xl">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Nuevo Cliente Empresarial</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {generalError && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 p-4 rounded-md">
              <p className="text-sm text-red-400">{generalError}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="business_name" className="block text-sm font-medium text-gray-300">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    id="business_name"
                    required
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                  {errors.business_name && (
                    <p className="mt-1 text-sm text-red-400">{errors.business_name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="commercial_name" className="block text-sm font-medium text-gray-300">
                    Nombre Comercial
                  </label>
                  <input
                    type="text"
                    id="commercial_name"
                    value={formData.commercial_name}
                    onChange={(e) => setFormData({ ...formData, commercial_name: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="identification_number" className="block text-sm font-medium text-gray-300">
                    RNC *
                  </label>
                  <input
                    type="text"
                    id="identification_number"
                    required
                    value={formData.identification_number}
                    onChange={(e) => setFormData({ ...formData, identification_number: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                  {errors.identification_number && (
                    <p className="mt-1 text-sm text-red-400">{errors.identification_number}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-300">
                    Sitio Web
                  </label>
                  <input
                    type="url"
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-4">
                <IndustrySectorSelector
                  value={selectedSector}
                  onChange={handleSectorChange}
                  className="mb-4"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Información de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
                  )}
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="street" className="block text-sm font-medium text-gray-300">
                      Calle *
                    </label>
                    <input
                      type="text"
                      id="street"
                      required
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="street_number" className="block text-sm font-medium text-gray-300">
                      Número
                    </label>
                    <input
                      type="text"
                      id="street_number"
                      value={formData.street_number}
                      onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                      className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-300">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-300">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-300">
                    Provincia *
                  </label>
                  <input
                    type="text"
                    id="state"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Contact Person */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Contacto Principal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="contact_name" className="block text-sm font-medium text-gray-300">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="contact_position" className="block text-sm font-medium text-gray-300">
                    Cargo
                  </label>
                  <input
                    type="text"
                    id="contact_position"
                    value={formData.contact_position}
                    onChange={(e) => setFormData({ ...formData, contact_position: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-300">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Billing Information */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Información de Facturación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="invoice_type" className="block text-sm font-medium text-gray-300">
                    Tipo de Comprobante *
                  </label>
                  <select
                    id="invoice_type"
                    required
                    value={formData.invoice_type}
                    onChange={(e) => setFormData({ ...formData, invoice_type: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  >
                    <option value="">Seleccione un tipo</option>
                    <option value="B01">Factura de Crédito Fiscal (B01)</option>
                    <option value="B02">Factura de Consumo (B02)</option>
                    <option value="B14">Factura Gubernamental (B14)</option>
                    <option value="B15">Factura para Exportaciones (B15)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="payment_terms" className="block text-sm font-medium text-gray-300">
                    Condiciones de Pago *
                  </label>
                  <select
                    id="payment_terms"
                    required
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  >
                    <option value="">Seleccione condición</option>
                    <option value="contado">Contado</option>
                    <option value="15">15 días</option>
                    <option value="30">30 días</option>
                    <option value="45">45 días</option>
                    <option value="60">60 días</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="credit_limit" className="block text-sm font-medium text-gray-300">
                    Límite de Crédito
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">RD$</span>
                    </div>
                    <input
                      type="number"
                      id="credit_limit"
                      min="0"
                      step="0.01"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                      className="block w-full pl-12 pr-12 bg-gray-700/50 border-gray-600 text-white rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300">
                Notas
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}