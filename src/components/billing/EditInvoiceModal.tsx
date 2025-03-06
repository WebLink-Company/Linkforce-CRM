import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Invoice, InvoiceItem } from '../../types/billing';

interface EditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: Invoice;
}

export default function EditInvoiceModal({ isOpen, onClose, onSuccess, invoice }: EditInvoiceModalProps) {
  const [formData, setFormData] = useState({
    notes: invoice.notes || '',
    due_date: invoice.due_date,
    issue_date: invoice.issue_date,
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        notes: invoice.notes || '',
        due_date: invoice.due_date,
        issue_date: invoice.issue_date,
      });
      
      // Initialize items with existing invoice items
      if (invoice.items) {
        setItems(invoice.items.map(item => ({
          ...item,
          id: item.id,
          invoice_id: item.invoice_id,
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
      
      loadProducts();
    }
  }, [isOpen, invoice]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Call the update_invoice function
      const { data, error } = await supabase.rpc('update_invoice', {
        p_invoice_id: invoice.id,
        p_notes: formData.notes,
        p_due_date: formData.due_date,
        p_issue_date: formData.issue_date,
        p_items: items
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      onSuccess();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error updating invoice');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, {
      id: '',
      invoice_id: invoice.id,
      product_id: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 18,
      tax_amount: 0,
      discount_rate: 0,
      discount_amount: 0,
      total_amount: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        item.unit_price = product.unit_price;
      }
    }
    
    // Recalculate totals
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

  const total = items.reduce((sum, item) => sum + item.total_amount, 0);

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 modal-backdrop">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-4xl flex flex-col max-h-[90vh] border border-white/10 shadow-2xl modal-content">
        {/* Fixed Header */}
        <div className="sticky top-0 flex justify-between items-center p-4 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm rounded-t-lg z-50">
          <h2 className="text-lg font-semibold text-white">Editar Factura #{invoice.ncf}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border-b border-red-500/50">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} id="edit-invoice-form" className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Customer Information */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Información del Cliente</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Cliente</p>
                  <p className="font-medium text-white">{invoice.customer?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">RNC</p>
                  <p className="font-medium text-white">{invoice.customer?.identification_number}</p>
                </div>
              </div>
            </div>

            {/* Invoice Information */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Información de la Factura</h3>
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
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-300">
                    Fecha de Vencimiento *
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-medium text-white">Items</h3>
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
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase w-[45%]">
                        Producto
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase w-[10%]">
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
                      <th scope="col" className="relative px-3 py-3 w-[5%]">
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
                            className="block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            value={item.unit_price}
                            readOnly
                            className="block w-full rounded-md bg-gray-800/50 border-gray-700/50 text-white shadow-sm sm:text-sm text-right"
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
                <div className="w-64 bg-gray-800/50 p-4 rounded-lg border border-white/10">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Subtotal:</span>
                      <span className="text-white">
                        {new Intl.NumberFormat('es-DO', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">ITBIS (18%):</span>
                      <span className="text-white">
                        {new Intl.NumberFormat('es-DO', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(items.reduce((sum, item) => sum + item.tax_amount, 0))}
                      </span>
                    </div>
                    {items.reduce((sum, item) => sum + item.discount_amount, 0) > 0 && (
                      <div className="flex justify-between text-sm text-red-400">
                        <span>Descuento:</span>
                        <span>
                          -{new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(items.reduce((sum, item) => sum + item.discount_amount, 0))}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
                      <span className="text-white">Total:</span>
                      <span className="text-white">
                        {new Intl.NumberFormat('es-DO', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
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
          </div>

          {/* Fixed Footer */}
          <div className="sticky bottom-0 p-4 border-t border-white/10 bg-gray-900/95 backdrop-blur-sm rounded-b-lg mt-auto">
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
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}