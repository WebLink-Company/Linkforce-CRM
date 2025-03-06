import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Supplier } from '../../types/payables';

interface RegularSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supplier: Supplier) => void;
}

const formSectionClasses = "bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50";
const inputClasses = "mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm";
const labelClasses = "block text-sm font-medium text-gray-300";

export default function RegularSupplierModal({ isOpen, onClose, onSuccess }: RegularSupplierModalProps) {
  const [formData, setFormData] = useState({
    business_name: '',
    tax_id: '',
    phone: '',
    address: '',
    payment_terms: 'contado',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.business_name) {
      errors.business_name = 'El nombre es requerido';
    }

    if (formData.tax_id) {
      const rncRegex = /^\d{9,11}$/;
      if (!rncRegex.test(formData.tax_id)) {
        errors.tax_id = 'El RNC debe tener entre 9 y 11 dígitos';
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

      // Generate supplier code
      const { data: code } = await supabase.rpc('generate_supplier_code');
      if (!code) throw new Error('Error generating supplier code');

      // Create supplier
      const { data: supplier, error: createError } = await supabase
        .from('suppliers')
        .insert([{
          code,
          business_name: formData.business_name,
          tax_id: formData.tax_id || null,
          phone: formData.phone,
          address: formData.address,
          payment_terms: formData.payment_terms,
          notes: formData.notes,
          type: 'regular',
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
      setError(error instanceof Error ? error.message : 'Error creating supplier');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-lg border border-white/10 shadow-2xl">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Nuevo Proveedor Regular</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 p-4 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className={formSectionClasses}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="business_name" className={labelClasses}>
                    Nombre *
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
                  <label htmlFor="tax_id" className={labelClasses}>
                    RNC/Cédula
                  </label>
                  <input
                    type="text"
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
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

                <div>
                  <label htmlFor="address" className={labelClasses}>
                    Dirección
                  </label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className={inputClasses}
                  />
                </div>

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
                  </select>
                </div>

                <div>
                  <label htmlFor="notes" className={labelClasses}>
                    Notas
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className={inputClasses}
                  />
                </div>
              </div>
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