import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { InventoryItem } from '../../types/erp';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UNIT_MEASURES = [
  { value: 'gls', label: 'Galones' },
  { value: 'kg', label: 'Kilogramos' },
  { value: 'g', label: 'Gramos' },
  { value: 'l', label: 'Litros' },
  { value: 'ml', label: 'Mililitros' },
  { value: 'u', label: 'Unidades' },
  { value: 'pz', label: 'Piezas' },
  { value: 'cj', label: 'Cajas' },
  
];

export default function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category_id: '',
    unit_measure: '',
    min_stock: 0,
    current_stock: 0,
    reorder_point: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      setCategories(data || []);
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('inventory_items')
        .insert([formData]);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error creating product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Agregar Nuevo Producto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && (
            <div className="mb-4 bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Código
              </label>
              <input
                type="text"
                id="code"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                Categoría
              </label>
              <select
                id="category_id"
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Seleccione una categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="unit_measure" className="block text-sm font-medium text-gray-700">
                Unidad de Medida
              </label>
              <select
                id="unit_measure"
                required
                value={formData.unit_measure}
                onChange={(e) => setFormData({ ...formData, unit_measure: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Seleccione una unidad</option>
                {UNIT_MEASURES.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="current_stock" className="block text-sm font-medium text-gray-700">
                  Stock Actual
                </label>
                <input
                  type="number"
                  id="current_stock"
                  required
                  min="0"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="min_stock" className="block text-sm font-medium text-gray-700">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  id="min_stock"
                  required
                  min="0"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="reorder_point" className="block text-sm font-medium text-gray-700">
                  Punto de Reorden
                </label>
                <input
                  type="number"
                  id="reorder_point"
                  required
                  min="0"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({ ...formData, reorder_point: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
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
              {loading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}