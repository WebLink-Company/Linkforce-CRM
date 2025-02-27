import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { InventoryItem } from '../../types/erp';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingItem?: InventoryItem | null;
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

const initialFormData = {
  code: '',
  name: '',
  description: '',
  category_id: '',
  unit_measure: '',
  unit_price: 0,
  min_stock: 0,
  current_stock: 0,
  reorder_point: 0,
};

export default function AddProductModal({ isOpen, onClose, onSuccess, editingItem }: AddProductModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setFormData({
          code: editingItem.code,
          name: editingItem.name,
          description: editingItem.description || '',
          category_id: editingItem.category_id || '',
          unit_measure: editingItem.unit_measure,
          unit_price: Number(editingItem.unit_price) || 0,
          min_stock: editingItem.min_stock,
          current_stock: editingItem.current_stock,
          reorder_point: editingItem.reorder_point,
        });
      } else {
        setFormData(initialFormData);
      }
      fetchCategories();
    }
  }, [isOpen, editingItem]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('inventory_categories')
        .insert([{
          name: newCategory.name,
          description: newCategory.description,
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchCategories();
      setFormData({ ...formData, category_id: data.id });
      setShowNewCategoryForm(false);
      setNewCategory({ name: '', description: '' });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error creating category');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const dataToSave = {
        ...formData,
        unit_price: Number(formData.unit_price) || 0,
        min_stock: Number(formData.min_stock) || 0,
        current_stock: Number(formData.current_stock) || 0,
        reorder_point: Number(formData.reorder_point) || 0,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(dataToSave)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert([dataToSave]);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error saving product');
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

      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-2xl my-8 border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        {/* Fixed Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm rounded-t-lg z-10">
          <h2 className="text-lg font-semibold text-white">
            {editingItem ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 p-4 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-300">
                    Código
                  </label>
                  <input
                    type="text"
                    id="code"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                    Descripción
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-medium text-white">Categoría</h3>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryForm(true)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva Categoría
                </button>
              </div>

              {showNewCategoryForm ? (
                <div className="space-y-3 bg-gray-900/50 p-4 rounded-md border border-white/10">
                  <div>
                    <label htmlFor="new-category-name" className="block text-sm font-medium text-gray-300">
                      Nombre de la Categoría
                    </label>
                    <input
                      type="text"
                      id="new-category-name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-category-description" className="block text-sm font-medium text-gray-300">
                      Descripción
                    </label>
                    <textarea
                      id="new-category-description"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      rows={2}
                      className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryForm(false)}
                      className="px-3 py-1 text-sm text-gray-400 hover:text-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="px-3 py-1 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700"
                    >
                      Guardar Categoría
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  id="category_id"
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                >
                  <option value="">Seleccione una categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Product Details */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Detalles del Producto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="unit_measure" className="block text-sm font-medium text-gray-300">
                    Unidad de Medida
                  </label>
                  <select
                    id="unit_measure"
                    required
                    value={formData.unit_measure}
                    onChange={(e) => setFormData({ ...formData, unit_measure: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  >
                    <option value="">Seleccione una unidad</option>
                    {UNIT_MEASURES.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="unit_price" className="block text-sm font-medium text-gray-300">
                    Precio Unitario
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 sm:text-sm">RD$</span>
                    </div>
                    <input
                      type="number"
                      id="unit_price"
                      required
                      min="0"
                      step="0.01"
                      value={formData.unit_price.toString()}
                      onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) || 0 })}
                      className="block w-full pl-12 rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Information */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Información de Stock</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="current_stock" className="block text-sm font-medium text-gray-300">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    id="current_stock"
                    required
                    min="0"
                    value={formData.current_stock.toString()}
                    onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="min_stock" className="block text-sm font-medium text-gray-300">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    id="min_stock"
                    required
                    min="0"
                    value={formData.min_stock.toString()}
                    onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="reorder_point" className="block text-sm font-medium text-gray-300">
                    Punto de Reorden
                  </label>
                  <input
                    type="number"
                    id="reorder_point"
                    required
                    min="0"
                    value={formData.reorder_point.toString()}
                    onChange={(e) => setFormData({ ...formData, reorder_point: Number(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 border-t border-white/10 bg-gray-900/95 backdrop-blur-sm rounded-b-lg">
          <div className="flex justify-end space-x-3">
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
              {loading ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}