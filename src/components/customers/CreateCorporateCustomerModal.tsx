import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import IndustrySectorSelector from '../billing/IndustrySectorSelector';

interface CreateCorporateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  business_name: string;
  commercial_name: string;
  identification_number: string;
  industry_sector: string;
  website: string;
  street: string;
  street_number: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  contact_name: string;
  contact_position: string;
  contact_phone: string;
  invoice_type: string;
  payment_terms: string;
  preferred_currency: string;
  credit_limit: number;
  notes: string;
  status: 'active' | 'inactive';
}

const INITIAL_FORM_DATA: FormData = {
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
  status: 'active',
};

export default function CreateCorporateCustomerModal({ isOpen, onClose, onSuccess }: CreateCorporateCustomerModalProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
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
    const newErrors: Partial<Record<keyof FormData, string>> = {};

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

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Check if customer already exists
      const { data: existingCustomer, error: checkError } = await supabase
        .from('customers')
        .select('id')
        .or(`identification_number.eq.${formData.identification_number},email.eq.${formData.email}`)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingCustomer) {
        throw new Error('Ya existe un cliente con este RNC o email');
      }

      // Create customer
      const { data: customer, error: createError } = await supabase
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
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (createError) throw createError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating customer:', error);
      setGeneralError(error instanceof Error ? error.message : 'Error al crear el cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl my-8">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Nuevo Cliente Empresarial</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {generalError && (
            <div className="mb-6 bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">{generalError}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Información Empresarial */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información Empresarial</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    id="business_name"
                    required
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.business_name 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  />
                  {errors.business_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.business_name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="commercial_name" className="block text-sm font-medium text-gray-700">
                    Nombre Comercial
                  </label>
                  <input
                    type="text"
                    id="commercial_name"
                    value={formData.commercial_name}
                    onChange={(e) => setFormData({ ...formData, commercial_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="identification_number" className="block text-sm font-medium text-gray-700">
                    RNC *
                  </label>
                  <input
                    type="text"
                    id="identification_number"
                    required
                    value={formData.identification_number}
                    onChange={(e) => setFormData({ ...formData, identification_number: e.target.value })}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.identification_number 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  />
                  {errors.identification_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.identification_number}</p>
                  )}
                </div>

                <IndustrySectorSelector
                  value={selectedSector}
                  onChange={handleSectorChange}
                  className="mb-4"
                />

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                    Sitio Web
                  </label>
                  <input
                    type="url"
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.website 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  />
                  {errors.website && (
                    <p className="mt-1 text-sm text-red-600">{errors.website}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dirección</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                    Calle/Avenida *
                  </label>
                  <input
                    type="text"
                    id="street"
                    required
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="street_number" className="block text-sm font-medium text-gray-700">
                    Número
                  </label>
                  <input
                    type="text"
                    id="street_number"
                    value={formData.street_number}
                    onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    Provincia *
                  </label>
                  <input
                    type="text"
                    id="state"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                    País *
                  </label>
                  <input
                    type="text"
                    id="country"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Teléfono Principal *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.phone 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Corporativo *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.email 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700">
                    Nombre Contacto Principal *
                  </label>
                  <input
                    type="text"
                    id="contact_name"
                    required
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="contact_position" className="block text-sm font-medium text-gray-700">
                    Cargo Contacto Principal
                  </label>
                  <input
                    type="text"
                    id="contact_position"
                    value={formData.contact_position}
                    onChange={(e) => setFormData({ ...formData, contact_position: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                    Teléfono Contacto Principal
                  </label>
                  <input
                    type="tel"
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Facturación */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Facturación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="invoice_type" className="block text-sm font-medium text-gray-700">
                    Tipo de Comprobante *
                  </label>
                  <select
                    id="invoice_type"
                    required
                    value={formData.invoice_type}
                    onChange={(e) => setFormData({ ...formData, invoice_type: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Seleccione un tipo</option>
                    <option value="B01">Factura de Crédito Fiscal (B01)</option>
                    <option value="B02">Factura de Consumo (B02)</option>
                    <option value="B14">Factura Gubernamental (B14)</option>
                    <option value="B15">Factura para Exportaciones (B15)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="payment_terms" className="block text-sm font-medium text-gray-700">
                    Condiciones de Pago *
                  </label>
                  <select
                    id="payment_terms"
                    required
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                  <label htmlFor="preferred_currency" className="block text-sm font-medium text-gray-700">
                    Moneda Preferida
                  </label>
                  <select
                    id="preferred_currency"
                    value={formData.preferred_currency}
                    onChange={(e) => setFormData({ ...formData, preferred_currency: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="DOP">Peso Dominicano (DOP)</option>
                    <option value="USD">Dólar Estadounidense (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="credit_limit" className="block text-sm font-medium text-gray-700">
                    Límite de Crédito
                  </label>
                  <input
                    type="number"
                    id="credit_limit"
                    min="0"
                    step="0.01"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información Adicional</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notas
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Estado
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}