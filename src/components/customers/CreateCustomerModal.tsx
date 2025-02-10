import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  full_name: string;
  identification_number: string;
  email: string;
  phone: string;
  address: string;
  birth_date: string;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

export default function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    identification_number: '',
    email: '',
    phone: '',
    address: '',
    birth_date: '',
    category_id: '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('customer_categories')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error loading categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Required fields
    if (!formData.full_name) newErrors.full_name = 'El nombre es requerido';
    if (!formData.identification_number) newErrors.identification_number = 'La identificación es requerida';
    if (!formData.email) newErrors.email = 'El email es requerido';
    if (!formData.phone) newErrors.phone = 'El teléfono es requerido';
    if (!formData.address) newErrors.address = 'La dirección es requerida';
    if (!formData.birth_date) newErrors.birth_date = 'La fecha de nacimiento es requerida';
    if (!formData.category_id) newErrors.category_id = 'La categoría es requerida';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    // Phone validation
    const phoneRegex = /^\+?[\d\s-]{8,}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Formato de teléfono inválido';
    }

    // Age validation (18+)
    const birthDate = new Date(formData.birth_date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      newErrors.birth_date = 'El cliente debe ser mayor de 18 años';
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
      const { error } = await supabase
        .from('customers')
        .insert([{
          ...formData,
          status: 'active',
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }]);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'Error al crear el cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Nuevo Cliente</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {generalError && (
            <div className="mb-4 bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">{generalError}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Nombre Completo *
              </label>
              <input
                type="text"
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.full_name 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="identification_number" className="block text-sm font-medium text-gray-700">
                Número de Identificación *
              </label>
              <input
                type="text"
                id="identification_number"
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

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo Electrónico *
              </label>
              <input
                type="email"
                id="email"
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
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Teléfono *
              </label>
              <input
                type="tel"
                id="phone"
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
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Dirección *
              </label>
              <textarea
                id="address"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.address 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
              )}
            </div>

            <div>
              <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700">
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                id="birth_date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.birth_date 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.birth_date && (
                <p className="mt-1 text-sm text-red-600">{errors.birth_date}</p>
              )}
            </div>

            <div>
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                Categoría *
              </label>
              <select
                id="category_id"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.category_id 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="">Seleccione una categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}