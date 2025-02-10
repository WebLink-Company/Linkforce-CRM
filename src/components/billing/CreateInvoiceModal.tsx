import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { billingAPI } from '../../lib/api/billing';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface InvoiceItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_rate: number;
}

interface Product {
  id: string;
  name: string;
  code: string;
  unit_price?: number;
}

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess }: CreateInvoiceModalProps) {
  const [formData, setFormData] = useState({
    customer_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
  });

  const [items, setItems] = useState<InvoiceItem[]>([{
    product_id: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 18,
    discount_rate: 0,
  }]);

  const [customers, setCustomers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadProducts();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name')
      .eq('status', 'active')
      .order('full_name');

    if (error) {
      console.error('Error loading customers:', error);
      return;
    }

    setCustomers(data || []);
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name, code')
      .order('name');

    if (error) {
      console.error('Error loading products:', error);
      return;
    }

    setProducts(data || []);
  };

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 18,
      discount_rate: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: number | string) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    setItems(newItems);
  };

  const calculateTotals = () => {
    return items.reduce((acc, item) => {
      const subtotal = item.quantity * item.unit_price;
      const discount = subtotal * (item.discount_rate / 100);
      const taxable = subtotal - discount;
      const tax = taxable * (item.tax_rate / 100);
      
      return {
        subtotal: acc.subtotal + subtotal,
        tax: acc.tax + tax,
        discount: acc.discount + discount,
        total: acc.total + taxable + tax,
      };
    }, { subtotal: 0, tax: 0, discount: 0, total: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const totals = calculateTotals();
      
      const { error } = await billingAPI.createInvoice({
        ...formData,
        subtotal: totals.subtotal,
        tax_amount: totals.tax,
        discount_amount: totals.discount,
        total_amount: totals.total,
        status: 'draft',
        payment_status: 'pending',
      }, items);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error creating invoice');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-lg w-full max-w-4xl flex flex-col max-h-[90vh]">
        {/* Fixed Header */}
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold" id="modal-title">Nueva Factura</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="mb-4 bg-red-50 p-4 rounded-md" role="alert">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Customer and Dates Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700">
                  Cliente
                </label>
                <select
                  id="customer_id"
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Seleccione un cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700">
                  Fecha de Emisión
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
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  id="due_date"
                  required
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Productos</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Producto
                </button>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
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
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        required
                        placeholder="Cantidad"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                        required
                        placeholder="Precio"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount_rate}
                        onChange={(e) => updateItem(index, 'discount_rate', Number(e.target.value))}
                        placeholder="Desc %"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notas
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="border-t p-4 bg-gray-50 rounded-b-lg shrink-0">
          <div className="flex justify-between mb-4">
            <dl className="space-y-2 flex-1 max-w-xs">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Subtotal:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('es-DO', {
                    style: 'currency',
                    currency: 'DOP'
                  }).format(totals.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Descuento:</dt>
                <dd className="text-sm font-medium text-red-600">
                  -{new Intl.NumberFormat('es-DO', {
                    style: 'currency',
                    currency: 'DOP'
                  }).format(totals.discount)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">ITBIS (18%):</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('es-DO', {
                    style: 'currency',
                    currency: 'DOP'
                  }).format(totals.tax)}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-2">
                <dt className="text-base font-medium text-gray-900">Total:</dt>
                <dd className="text-base font-medium text-gray-900">
                  {new Intl.NumberFormat('es-DO', {
                    style: 'currency',
                    currency: 'DOP'
                  }).format(totals.total)}
                </dd>
              </div>
            </dl>

            <div className="flex items-center space-x-3">
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
                onClick={handleSubmit}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Guardando...' : 'Crear Factura'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}