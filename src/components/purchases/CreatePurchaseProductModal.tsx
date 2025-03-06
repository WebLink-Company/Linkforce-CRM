import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Supplier } from '../../types/payables';
import CreateSupplierModal from '../suppliers/CreateSupplierModal';

interface CreatePurchaseProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProduct?: any;
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
  { value: 'lb', label: 'Libras' },
];

export default function CreatePurchaseProductModal({ isOpen, onClose, onSuccess, editingProduct }: CreatePurchaseProductModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category_id: '',
    unit_measure: '',
    default_supplier_id: '',
    min_order_quantity: 1,
    unit_price: 0,
    notes: '',
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      loadCategories();
      if (editingProduct) {
        setFormData({
          code: editingProduct.code,
          name: editingProduct.name,
          description: editingProduct.description || '',
          category_id: editingProduct.category_id || '',
          unit_measure: editingProduct.unit_measure,
          default_supplier_id: editingProduct.default_supplier_id || '',
          min_order_quantity: editingProduct.min_order_quantity,
          unit_price: editingProduct.unit_price || 0,
          notes: editingProduct.notes || '',
        });
      } else {
        setFormData({
          code: '',
          name: '',
          description: '',
          category_id: '',
          unit_measure: '',
          default_supplier_id: '',
          min_order_quantity: 1,
          unit_price: 0,
          notes: '',
        });
      }
    }
  }, [isOpen, editingProduct]);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .is('deleted_at', null)
        .order('business_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      if (editingProduct) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('purchase_products')
          .update({
            ...formData,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (updateError) throw updateError;
      } else {
        // Create new product
        const { error: createError } = await supabase
          .from('purchase_products')
          .insert([{
            ...formData,
            created_by: user.id,
            status: 'active'
          }]);

        if (createError) throw createError;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error instanceof Error ? error.message : 'Error saving product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
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
            {editingProduct ? 'Editar Producto' : 'Nuevo Producto de Compra'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 p-4 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-300">
                    Código *
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
                    Nombre *
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

            {/* Category and Supplier */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-300">
                    Categoría
                  </label>
                  <select
                    id="category_id"
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
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <label htmlFor="default_supplier_id" className="block text-sm font-medium text-gray-300">
                      Proveedor Principal
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCreateSupplierModal(true)}
                      className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nuevo Proveedor
                    </button>
                  </div>
                  <select
                    id="default_supplier_id"
                    value={formData.default_supplier_id}
                    onChange={(e) => setFormData({ ...formData, default_supplier_id: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  >
                    <option value="">Seleccione un proveedor</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.business_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Detalles del Producto</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="unit_measure" className="block text-sm font-medium text-gray-300">
                    Unidad de Medida *
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
                  <label htmlFor="min_order_quantity" className="block text-sm font-medium text-gray-300">
                    Cantidad Mínima *
                  </label>
                  <input
                    type="number"
                    id="min_order_quantity"
                    required
                    min="1"
                    value={formData.min_order_quantity}
                    onChange={(e) => setFormData({ ...formData, min_order_quantity: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="unit_price" className="block text-sm font-medium text-gray-300">
                    Precio Unitario *
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
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                      className="block w-full pl-12 rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300">
                Notas
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
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
              form="product-form"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </div>
      </div>

      <CreateSupplierModal
        isOpen={showCreateSupplierModal}
        onClose={() => setShowCreateSupplierModal(false)}
        onSuccess={(supplier) => {
          setSuppliers(prev => [...prev, supplier]);
          setFormData(prev => ({ ...prev, default_supplier_id: supplier.id }));
          setShowCreateSupplierModal(false);
        }}
      />
    </div>
  );
}