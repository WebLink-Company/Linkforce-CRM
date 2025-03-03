import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import IndustrySectorSelector from '../billing/IndustrySectorSelector';
import type { Customer } from '../../types/payables';
import ConfirmationModal from './ConfirmationModal';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCustomer?: Customer | null;
}

const initialFormData = {
  business_name: '',
  commercial_name: '',
  tax_id: '',
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
};

const formSectionClasses = "bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50";
const inputClasses = "mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm";
const labelClasses = "block text-sm font-medium text-gray-300";
const sectionTitleClasses = "text-base font-medium text-white mb-4";

export default function CreateCustomerModal({ isOpen, onClose, onSuccess, editingCustomer }: CreateCustomerModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedSubsector, setSelectedSubsector] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [deletedCustomer, setDeletedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingCustomer) {
        // Initialize form with editing customer data
        setFormData({
          business_name: editingCustomer.full_name || '',
          commercial_name: editingCustomer.commercial_name || '',
          tax_id: editingCustomer.identification_number || '',
          industry_sector: editingCustomer.industry_sector || '',
          website: editingCustomer.website || '',
          street: '',
          street_number: '',
          city: '',
          state: '',
          postal_code: editingCustomer.postal_code || '',
          country: editingCustomer.country || 'DO',
          phone: editingCustomer.phone || '',
          email: editingCustomer.email || '',
          contact_name: editingCustomer.contact_name || '',
          contact_position: editingCustomer.contact_position || '',
          contact_phone: editingCustomer.contact_phone || '',
          invoice_type: editingCustomer.invoice_type || '',
          payment_terms: editingCustomer.payment_terms || '',
          preferred_currency: editingCustomer.preferred_currency || 'DOP',
          credit_limit: editingCustomer.credit_limit || 0,
          notes: editingCustomer.notes || '',
          status: editingCustomer.status as 'active' | 'inactive'
        });
      } else {
        // Reset form for new customer
        setFormData(initialFormData);
        setErrors({});
        setGeneralError(null);
        setSelectedSector('');
        setSelectedSubsector('');
      }
    }
  }, [isOpen, editingCustomer]);

  const handleSectorChange = (sector: string, subsector: string) => {
    setSelectedSector(sector);
    setSelectedSubsector(subsector);
    setFormData({
      ...formData,
      industry_sector: `${sector}${subsector ? ` - ${subsector}` : ''}`
    });
  };

  const checkExistingCustomer = async (field: string, value: string): Promise<Customer | null> => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .or(`${field}.eq.${value}`)
      .not('deleted_at', 'is', null)
      .single();

    return data;
  };

  const validateField = async (field: keyof typeof formData, value: string) => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {};

    switch (field) {
      case 'email':
        if (value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors.email = 'El formato del email es inválido';
          } else {
            // Check if email exists in deleted customers
            const deletedCustomer = await checkExistingCustomer('email', value);
            if (deletedCustomer) {
              setDeletedCustomer(deletedCustomer);
              setShowRestoreConfirm(true);
              return false;
            }
          }
        }
        break;

      case 'tax_id':
        if (value) {
          const rncRegex = /^\d{9,11}$/;
          if (!rncRegex.test(value)) {
            newErrors.tax_id = 'El RNC debe tener entre 9 y 11 dígitos';
          } else {
            // Check if RNC exists in deleted customers
            const deletedCustomer = await checkExistingCustomer('identification_number', value);
            if (deletedCustomer) {
              setDeletedCustomer(deletedCustomer);
              setShowRestoreConfirm(true);
              return false;
            }
          }
        }
        break;

      case 'phone':
        if (value) {
          const phoneRegex = /^\+?[\d\s-]{8,}$/;
          if (!phoneRegex.test(value)) {
            newErrors.phone = 'El formato del teléfono es inválido';
          }
        }
        break;
    }

    setErrors(prev => ({ ...prev, [field]: newErrors[field] }));
    return !newErrors[field];
  };

  const handleFieldBlur = async (field: keyof typeof formData) => {
    await validateField(field, formData[field].toString());
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {};

    // Required fields
    if (!formData.business_name) newErrors.business_name = 'La razón social es requerida';
    if (!formData.tax_id) newErrors.tax_id = 'El RNC es requerido';
    if (!formData.phone) newErrors.phone = 'El teléfono es requerido';
    if (!formData.email) newErrors.email = 'El email es requerido';
    if (!formData.street) newErrors.street = 'La dirección es requerida';
    if (!formData.city) newErrors.city = 'La ciudad es requerida';
    if (!formData.state) newErrors.state = 'La provincia es requerida';

    // Validate unique fields
    if (formData.email) {
      await validateField('email', formData.email);
    }
    if (formData.tax_id) {
      await validateField('tax_id', formData.tax_id);
    }
    if (formData.phone) {
      await validateField('phone', formData.phone);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!await validateForm()) return;
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const customerData = {
        type: 'corporate',
        identification_number: formData.tax_id,
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
      };

      if (editingCustomer) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            ...customerData,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCustomer.id);

        if (updateError) throw updateError;
      } else {
        // Create new customer
        const { error: createError } = await supabase
          .from('customers')
          .insert([{
            ...customerData,
            created_by: user.id
          }]);

        if (createError) throw createError;
      }

      onSuccess();
      onClose();
      // Reset form
      setFormData(initialFormData);
      setErrors({});
      setGeneralError(null);
      setSelectedSector('');
      setSelectedSubsector('');
    } catch (error) {
      console.error('Error in customer operation:', error);
      setGeneralError(error instanceof Error ? error.message : 'Error processing customer');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreCustomer = async () => {
    if (!deletedCustomer) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          deleted_at: null,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', deletedCustomer.id);

      if (error) throw error;

      onSuccess();
      onClose();
      // Reset form
      setFormData(initialFormData);
      setErrors({});
      setGeneralError(null);
      setSelectedSector('');
      setSelectedSubsector('');
    } catch (error) {
      console.error('Error restoring customer:', error);
      setGeneralError(error instanceof Error ? error.message : 'Error restoring customer');
    } finally {
      setLoading(false);
      setShowRestoreConfirm(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData(initialFormData);
    setErrors({});
    setGeneralError(null);
    setSelectedSector('');
    setSelectedSubsector('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.15),transparent_50%)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.2),transparent_50%)] blur-2xl"></div>
        </div>

        <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-4xl my-8 border border-white/10 shadow-2xl animate-slide-up">
          <div className="absolute inset-0 rounded-lg pointer-events-none">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          </div>

          <div className="flex justify-between items-center p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">
              {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente Empresarial'}
            </h2>
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
              <div className={formSectionClasses}>
                <h3 className={sectionTitleClasses}>Información Básica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="business_name" className={labelClasses}>
                      Razón Social *
                    </label>
                    <input
                      type="text"
                      id="business_name"
                      required
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      onBlur={() => handleFieldBlur('business_name')}
                      className={inputClasses}
                    />
                    {errors.business_name && (
                      <p className="mt-1 text-sm text-red-400">{errors.business_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="commercial_name" className={labelClasses}>
                      Nombre Comercial
                    </label>
                    <input
                      type="text"
                      id="commercial_name"
                      value={formData.commercial_name}
                      onChange={(e) => setFormData({ ...formData, commercial_name: e.target.value })}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label htmlFor="tax_id" className={labelClasses}>
                      RNC *
                    </label>
                    <input
                      type="text"
                      id="tax_id"
                      required
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      onBlur={() => handleFieldBlur('tax_id')}
                      className={inputClasses}
                    />
                    {errors.tax_id && (
                      <p className="mt-1 text-sm text-red-400">{errors.tax_id}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="industry_sector" className={labelClasses}>
                      Sector Industrial
                    </label>
                    <IndustrySectorSelector
                      selectedSector={selectedSector}
                      selectedSubsector={selectedSubsector}
                      onChange={handleSectorChange}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label htmlFor="website" className={labelClasses}>
                      Sitio Web
                    </label>
                    <input
                      type="url"
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className={formSectionClasses}>
                <h3 className={sectionTitleClasses}>Dirección</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="street" className={labelClasses}>
                      Calle *
                    </label>
                    <input
                      type="text"
                      id="street"
                      required
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      onBlur={() => handleFieldBlur('street')}
                      className={inputClasses}
                    />
                    {errors.street && (
                      <p className="mt-1 text-sm text-red-400">{errors.street}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="street_number" className={labelClasses}>
                      Número
                    </label>
                    <input
                      type="text"
                      id="street_number"
                      value={formData.street_number}
                      onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className={labelClasses}>
                      Ciudad *
                    </label>
                    <input
                      type="text"
                      id="city"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      onBlur={() => handleFieldBlur('city')}
                      className={inputClasses}
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-400">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="state" className={labelClasses}>
                      Provincia *
                    </label>
                    <input
                      type="text"
                      id="state"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      onBlur={() => handleFieldBlur('state')}
                      className={inputClasses}
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-400">{errors.state}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="postal_code" className={labelClasses}>
                      Código Postal
                    </label>
                    <input
                      type="text"
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className={formSectionClasses}>
                <h3 className={sectionTitleClasses}>Información de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className={labelClasses}>
                      Teléfono Principal *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      onBlur={() => handleFieldBlur('phone')}
                      className={inputClasses}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className={labelClasses}>
                      Email Principal *
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onBlur={() => handleFieldBlur('email')}
                      className={inputClasses}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contact_name" className={labelClasses}>
                      Nombre del Contacto
                    </label>
                    <input
                      type="text"
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label htmlFor="contact_position" className={labelClasses}>
                      Posición del Contacto
                    </label>
                    <input
                      type="text"
                      id="contact_position"
                      value={formData.contact_position}
                      onChange={(e) => setFormData({ ...formData, contact_position: e.target.value })}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label htmlFor="contact_phone" className={labelClasses}>
                      Teléfono del Contacto
                    </label>
                    <input
                      type="tel"
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>

              {/* Billing Information */}
              <div className={formSectionClasses}>
                <h3 className={sectionTitleClasses}>Información de Facturación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="invoice_type" className={labelClasses}>
                      Tipo de Comprobante *
                    </label>
                    <select
                      id="invoice_type"
                      required
                      value={formData.invoice_type}
                      onChange={(e) => setFormData({ ...formData, invoice_type: e.target.value })}
                      className={inputClasses}
                    >
                      <option value="">Seleccione un tipo</option>
                      <option value="B01">Factura de Crédito Fiscal (B01)</option>
                      <option value="B02">Factura de Consumo (B02)</option>
                      <option value="B14">Factura Gubernamental (B14)</option>
                      <option value="B15">Factura para Exportaciones (B15)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="payment_terms" className={labelClasses}>
                      Condiciones de Pago *
                    </label>
                    <select
                      id="payment_terms"
                      required
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      className={inputClasses}
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
                    <label htmlFor="preferred_currency" className={labelClasses}>
                      Moneda Preferida
                    </label>
                    <select
                      id="preferred_currency"
                      value={formData.preferred_currency}
                      onChange={(e) => setFormData({ ...formData, preferred_currency: e.target.value })}
                      className={inputClasses}
                    >
                      <option value="DOP">Peso Dominicano (DOP)</option>
                      <option value="USD">Dólar Estadounidense (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="credit_limit" className={labelClasses}>
                      Límite de Crédito
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 sm:text-sm">
                          {formData.preferred_currency === 'DOP' ? 'RD$' : formData.preferred_currency === 'USD' ? '$' : '€'}
                        </span>
                      </div>
                      <input
                        type="number"
                        id="credit_limit"
                        min="0"
                        step="0.01"
                        value={formData.credit_limit}
                        onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                        className={`${inputClasses} pl-12`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className={formSectionClasses}>
                <label htmlFor="notes" className={labelClasses}>
                  Notas
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className={inputClasses}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : editingCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        onConfirm={handleRestoreCustomer}
        title="Restaurar Cliente"
        message={`Se encontró un cliente eliminado con los mismos datos. ¿Desea restaurarlo?`}
        loading={loading}
      />
    </>
  );
}