import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Supplier } from '../../types/payables';

interface CreateSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supplier: Supplier) => void;
}

const formSectionClasses = "bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50";
const inputClasses = "mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm";
const labelClasses = "block text-sm font-medium text-gray-300";
const sectionTitleClasses = "text-lg font-medium text-white mb-4";

export default function CreateSupplierModal({ isOpen, onClose, onSuccess }: CreateSupplierModalProps) {
  const [formData, setFormData] = useState({
    business_name: '',
    commercial_name: '',
    tax_id: '',
    website: '',
    email: '',
    phone: '',
    street: '',
    street_number: '',
    city: '',
    state: '',
    postal_code: '',
    contact_name: '',
    contact_position: '',
    contact_phone: '',
    payment_terms: 'contado',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.business_name) {
      errors.business_name = 'La razón social es requerida';
    }

    if (!formData.tax_id) {
      errors.tax_id = 'El RNC es requerido';
    } else {
      const rncRegex = /^\d{9,11}$/;
      if (!rncRegex.test(formData.tax_id)) {
        errors.tax_id = 'El RNC debe tener entre 9 y 11 dígitos';
      }
    }

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'El formato del email es inválido';
      }
    }

    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0]);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Get the next supplier code using the database function
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_supplier_code');

      if (codeError) {
        console.error('Error generating supplier code:', codeError);
        throw new Error('Error al generar el código del proveedor');
      }

      if (!codeData) {
        throw new Error('No se pudo generar el código del proveedor');
      }

      // Create supplier with the generated code
      const { data: supplier, error: createError } = await supabase
        .from('suppliers')
        .insert([{
          code: codeData,
          business_name: formData.business_name,
          commercial_name: formData.commercial_name || null,
          tax_id: formData.tax_id,
          website: formData.website || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: `${formData.street} ${formData.street_number}, ${formData.city}, ${formData.state}`,
          postal_code: formData.postal_code || null,
          contact_name: formData.contact_name || null,
          contact_position: formData.contact_position || null,
          contact_phone: formData.contact_phone || null,
          payment_terms: formData.payment_terms,
          notes: formData.notes || null,
          status: 'active',
          created_by: user.id
        }])
        .select()
        .single();

      if (createError) throw createError;
      if (!supplier) throw new Error('No data returned from supplier creation');

      onSuccess(supplier);
      onClose();
    } catch (error) {
      console.error('Error creating supplier:', error);
      setError(error instanceof Error ? error.message : 'Error al crear el proveedor');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-4xl border border-white/10 shadow-2xl">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Nuevo Proveedor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 p-4 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
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
                    className={inputClasses}
                  />
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

            {/* Contact Information */}
            <div className={formSectionClasses}>
              <h3 className={sectionTitleClasses}>Información de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className={labelClasses}>
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className={labelClasses}>
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="street" className={labelClasses}>
                      Calle *
                    </label>
                    <input
                      type="text"
                      id="street"
                      required
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      className={inputClasses}
                    />
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
                    className={inputClasses}
                  />
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
                    className={inputClasses}
                  />
                </div>
              </div>
            </div>

            {/* Contact Person */}
            <div className={formSectionClasses}>
              <h3 className={sectionTitleClasses}>Contacto Principal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="contact_name" className={labelClasses}>
                    Nombre
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
                    Cargo
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
                    Teléfono
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

            {/* Payment Terms */}
            <div className={formSectionClasses}>
              <h3 className={sectionTitleClasses}>Términos de Pago</h3>
              <div>
                <label htmlFor="payment_terms" className={labelClasses}>
                  Condiciones de Pago
                </label>
                <select
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className={inputClasses}
                >
                  <option value="contado">Contado</option>
                  <option value="15">15 días</option>
                  <option value="30">30 días</option>
                  <option value="45">45 días</option>
                  <option value="60">60 días</option>
                </select>
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
              {loading ? 'Guardando...' : 'Crear Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}