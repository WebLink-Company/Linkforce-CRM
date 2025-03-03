import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Supplier } from '../../types/payables';
import CreatePurchaseProductModal from './CreatePurchaseProductModal';

interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePurchaseModal({ isOpen, onClose, onSuccess }: CreatePurchaseModalProps) {
  const [formData, setFormData] = useState({
    supplier_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    notes: '',
  });

  const [items, setItems] = useState<any[]>([{
    product_id: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 18,
    tax_amount: 0,
    discount_rate: 0,
    discount_amount: 0,
    total_amount: 0
  }]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [totals, setTotals] = useState({
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0
  });

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      loadProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    calculateTotals();
  }, [items]);

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

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_products')
        .select('*')
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const calculateTotals = () => {
    const newTotals = items.reduce((acc, item) => ({
      subtotal: acc.subtotal + (item.quantity * item.unit_price),
      tax_amount: acc.tax_amount + item.tax_amount,
      discount_amount: acc.discount_amount + item.discount_amount,
      total_amount: acc.total_amount + item.total_amount
    }), {
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0
    });

    setTotals(newTotals);
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

      // Create purchase order
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchase_orders')
        .insert([{
          supplier_id: formData.supplier_id,
          issue_date: formData.issue_date,
          expected_date: formData.expected_date || null,
          notes: formData.notes,
          subtotal: totals.subtotal,
          tax_amount: totals.tax_amount,
          discount_amount: totals.discount_amount,
          total_amount: totals.total_amount,
          status: 'draft',
          created_by: user.id
        }])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      if (!purchase) throw new Error('Failed to create purchase order');

      // Create purchase order items
      const purchaseItems = items.map(item => ({
        purchase_order_id: purchase.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        discount_rate: item.discount_rate,
        discount_amount: item.discount_amount,
        total_amount: item.total_amount
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(purchaseItems);

      if (itemsError) throw itemsError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating purchase:', error);
      setError(error instanceof Error ? error.message : 'Error creating purchase order');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 18,
      tax_amount: 0,
      discount_rate: 0,
      discount_amount: 0,
      total_amount: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        item.unit_price = product.unit_price;
      }
    }
    
    // Recalculate item totals
    const subtotal = item.quantity * item.unit_price;
    const discount = subtotal * (item.discount_rate / 100);
    const taxable = subtotal - discount;
    const tax = taxable * (item.tax_rate / 100);
    
    item.tax_amount = tax;
    item.discount_amount = discount;
    item.total_amount = taxable + tax;
    
    newItems[index] = item;
    setItems(newItems);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-4xl my-8 border border-white/10 shadow-2xl">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        <div className="flex justify-between items-center p-4 border-b border-white/10 sticky top-0 bg-gray-900/95 z-10">
          <h2 className="text-lg font-semibold text-white">Nueva Orden de Compra</h2>
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
            <div className="bg-gray-800/50 p-4 rounded-lg space-y-4">
              <h3 className="text-sm font-medium text-white">Información Básica</h3>
              
              <div>
                <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-300">
                  Proveedor *
                </label>
                <select
                  id="supplier_id"
                  required
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="issue_date" className="block text-sm font-medium text-gray-300">
                    Fecha de Emisión *
                  </label>
                  <input
                    type="date"
                    id="issue_date"
                    required
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="expected_date" className="block text-sm font-medium text-gray-300">
                    Fecha Esperada
                  </label>
                  <input
                    type="date"
                    id="expected_date"
                    value={formData.expected_date}
                    onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                  <h3 className="text-sm font-medium text-white">Productos *</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateProductModal(true)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Crear Producto
                  </button>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Producto
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead>
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Producto
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                        Cantidad
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                        Precio
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                        Desc %
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                        ITBIS
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                        Total
                      </th>
                      <th scope="col" className="relative px-3 py-3">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-4">
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                            required
                            className="block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                          >
                            <option value="">Seleccione un producto</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.code} - {product.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                            required
                            className="block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                            required
                            className="block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount_rate}
                            onChange={(e) => updateItem(index, 'discount_rate', Number(e.target.value))}
                            className="block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-300 text-right">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(item.tax_amount)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-300 text-right">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(item.total_amount)}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 bg-gray-900/50 p-4 rounded-lg border border-white/10">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Subtotal:</span>
                      <span className="text-white">
                        {new Intl.NumberFormat('es-DO', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(totals.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">ITBIS (18%):</span>
                      <span className="text-white">
                        {new Intl.NumberFormat('es-DO', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(totals.tax_amount)}
                      </span>
                    </div>
                    {totals.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-red-400">
                        <span>Descuento:</span>
                        <span>
                          -{new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(totals.discount_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2 mt-2">
                      <span className="text-white">Total:</span>
                      <span className="text-white">
                        {new Intl.NumberFormat('es-DO', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(totals.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300">
                Notas
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                placeholder="Notas o comentarios adicionales..."
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
              {loading ? 'Guardando...' : 'Crear Orden'}
            </button>
          </div>
        </form>
      </div>

      <CreatePurchaseProductModal
        isOpen={showCreateProductModal}
        onClose={() => setShowCreateProductModal(false)}
        onSuccess={() => {
          setShowCreateProductModal(false);
          loadProducts();
        }}
      />
    </div>
  );
}