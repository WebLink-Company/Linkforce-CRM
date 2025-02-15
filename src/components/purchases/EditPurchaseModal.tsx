import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PurchaseOrder } from '../../types/payables';

interface EditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchase: PurchaseOrder;
}

export default function EditPurchaseModal({ isOpen, onClose, onSuccess, purchase }: EditPurchaseModalProps) {
  const [formData, setFormData] = useState({
    supplier_id: purchase.supplier_id,
    issue_date: purchase.issue_date,
    expected_date: purchase.expected_date || '',
    notes: purchase.notes || '',
  });

  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState({
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0
  });
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      // Initialize items with existing purchase items
      if (purchase.items) {
        setItems(purchase.items.map(item => ({
          id: item.id,
          purchase_order_id: item.purchase_order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          discount_rate: item.discount_rate,
          discount_amount: item.discount_amount,
          total_amount: item.total_amount
        })));
      }
    }
  }, [isOpen, purchase]);

  useEffect(() => {
    calculateTotals();
  }, [items]);

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
      // Update purchase order
      const { error: purchaseError } = await supabase
        .from('purchase_orders')
        .update({
          ...formData,
          subtotal: totals.subtotal,
          tax_amount: totals.tax_amount,
          discount_amount: totals.discount_amount,
          total_amount: totals.total_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', purchase.id);

      if (purchaseError) throw purchaseError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', purchase.id);

      if (deleteError) throw deleteError;

      // Create new items
      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(items.map(item => ({
          purchase_order_id: purchase.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          discount_rate: item.discount_rate,
          discount_amount: item.discount_amount,
          total_amount: item.total_amount
        })));

      if (itemsError) throw itemsError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating purchase:', error);
      setError(error instanceof Error ? error.message : 'Error updating purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!window.confirm('¿Está seguro que desea emitir esta orden de compra? Una vez emitida no podrá modificarla.')) {
      return;
    }

    setIssuing(true);
    setError(null);

    try {
      const { error } = await supabase.rpc('issue_purchase_order', {
        p_order_id: purchase.id
      });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error issuing purchase order:', error);
      setError(error instanceof Error ? error.message : 'Error al emitir la orden de compra');
    } finally {
      setIssuing(false);
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
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl my-8">
        {/* Header with Issue Button */}
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold">Editar Orden de Compra #{purchase.number}</h2>
            <span className={`ml-3 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
              purchase.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              purchase.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              purchase.status === 'confirmed' ? 'bg-green-100 text-green-800' :
              purchase.status === 'received' ? 'bg-purple-100 text-purple-800' :
              'bg-red-100 text-red-800'
            }`}>
              {purchase.status === 'draft' ? 'Borrador' :
               purchase.status === 'sent' ? 'Enviada' :
               purchase.status === 'confirmed' ? 'Confirmada' :
               purchase.status === 'received' ? 'Recibida' :
               'Cancelada'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {purchase.status === 'draft' && (
              <button
                type="button"
                onClick={handleIssue}
                disabled={issuing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" />
                {issuing ? 'Emitiendo...' : 'Emitir Orden'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Supplier Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Información del Proveedor</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Razón Social:</span>
                  <p className="font-medium">{purchase.supplier?.business_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">RNC:</span>
                  <p className="font-medium">{purchase.supplier?.tax_id}</p>
                </div>
                {purchase.supplier?.email && (
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{purchase.supplier.email}</p>
                  </div>
                )}
                {purchase.supplier?.phone && (
                  <div>
                    <span className="text-gray-500">Teléfono:</span>
                    <p className="font-medium">{purchase.supplier.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Información de la Orden</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700">
                    Fecha de Emisión *
                  </label>
                  <input
                    type="date"
                    id="issue_date"
                    required
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="expected_date" className="block text-sm font-medium text-gray-700">
                    Fecha Esperada
                  </label>
                  <input
                    type="date"
                    id="expected_date"
                    value={formData.expected_date}
                    onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-900">Productos *</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Producto
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Producto
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Cantidad
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                        Precio
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">
                        Desc %
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                        ITBIS
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                        Total
                      </th>
                      <th scope="col" className="relative px-3 py-3 w-16">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-4">
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                            required
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-right"
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
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount_rate}
                            onChange={(e) => updateItem(index, 'discount_rate', Number(e.target.value))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900 text-right">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(item.tax_amount)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900 text-right font-medium">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(item.total_amount)}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('es-DO', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(totals.subtotal)}
                      </span>
                    </div>
                    {totals.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Descuento:</span>
                        <span>
                          -{new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(totals.discount_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">ITBIS (18%):</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('es-DO', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(totals.tax_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                      <span>Total:</span>
                      <span>
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
            <div className="bg-gray-50 p-4 rounded-lg">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notas
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Agregar notas o comentarios adicionales..."
              />
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
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}