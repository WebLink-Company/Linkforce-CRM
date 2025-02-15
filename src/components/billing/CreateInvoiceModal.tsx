import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { billingAPI } from '../../lib/api/billing';
import CreateCustomerModal from '../customers/CreateCustomerModal';
import CreateCorporateCustomerModal from '../customers/CreateCorporateCustomerModal';
import CustomerTypeDialog from '../customers/CustomerTypeDialog';
import AddProductModal from '../inventory/AddProductModal';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CustomerDetails {
  identification_number: string;
  commercial_name: string;
  invoice_type: string;
  payment_terms: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  unit_price: number;
}

interface InvoiceItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
  total_amount: number;
}

const calculateItemTotal = (item: InvoiceItem) => {
  const subtotal = item.quantity * item.unit_price;
  const discount = subtotal * (item.discount_rate / 100);
  const taxable = subtotal - discount;
  const tax = taxable * (item.tax_rate / 100);
  
  return {
    subtotal,
    discount,
    tax,
    total: taxable + tax
  };
};

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess }: CreateInvoiceModalProps) {
  const [formData, setFormData] = useState({
    customer_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
  });

  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([{
    product_id: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 18,
    tax_amount: 0,
    discount_rate: 0,
    discount_amount: 0,
    total_amount: 0
  }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showCustomerTypeDialog, setShowCustomerTypeDialog] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showCreateCorporateCustomerModal, setShowCreateCorporateCustomerModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.customer_id) {
      loadCustomerDetails();
    }
  }, [formData.customer_id]);

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

  const loadCustomerDetails = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('identification_number, commercial_name, invoice_type, payment_terms')
      .eq('id', formData.customer_id)
      .single();

    if (error) {
      console.error('Error loading customer details:', error);
      return;
    }

    setCustomerDetails(data);

    if (data.payment_terms && data.payment_terms !== 'contado') {
      const days = parseInt(data.payment_terms);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);
      setFormData(prev => ({
        ...prev,
        due_date: dueDate.toISOString().split('T')[0]
      }));
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, code, unit_price')
        .order('name');

      if (error) throw error;

      console.log('Loaded products:', data);
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    console.log('Selected product ID:', productId);
    const product = products.find(p => p.id === productId);
    console.log('Found product:', product);

    if (product) {
      const newItems = [...items];
      const item = newItems[index];
      const newItem = {
        ...item,
        product_id: productId,
        unit_price: product.unit_price || 0
      };
      
      // Recalculate totals
      const totals = calculateItemTotal(newItem);
      newItem.tax_amount = totals.tax;
      newItem.discount_amount = totals.discount;
      newItem.total_amount = totals.total;
      
      newItems[index] = newItem;
      setItems(newItems);
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

  const updateItem = (index: number, field: keyof InvoiceItem, value: number | string) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: typeof value === 'string' ? parseFloat(value) || 0 : value };
    
    // Recalculate totals
    const totals = calculateItemTotal(item);
    item.tax_amount = totals.tax;
    item.discount_amount = totals.discount;
    item.total_amount = totals.total;
    
    newItems[index] = item;
    setItems(newItems);
  };

  const calculateTotals = () => {
    return items.reduce((acc, item) => {
      const totals = calculateItemTotal(item);
      return {
        subtotal: acc.subtotal + totals.subtotal,
        tax: acc.tax + totals.tax,
        discount: acc.discount + totals.discount,
        total: acc.total + totals.total,
      };
    }, { subtotal: 0, tax: 0, discount: 0, total: 0 });
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.customer_id) {
      errors.push('Debe seleccionar un cliente');
    }

    const invalidProducts = items.some(item => !item.product_id);
    if (invalidProducts) {
      errors.push('Debe seleccionar un producto para cada línea');
    }

    const invalidQuantities = items.some(item => item.quantity <= 0);
    if (invalidQuantities) {
      errors.push('La cantidad debe ser mayor a 0 para todos los productos');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

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

  const handleCustomerTypeSelect = (type: 'individual' | 'corporate') => {
    setShowCustomerTypeDialog(false);
    if (type === 'individual') {
      setShowCreateCustomerModal(true);
    } else {
      setShowCreateCorporateCustomerModal(true);
    }
  };

  if (!isOpen) return null;

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-lg w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold" id="modal-title">Nueva Factura</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="mb-4 bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="mb-4 bg-red-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-red-800">Por favor corrija los siguientes errores:</h3>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700">
                    Cliente *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomerTypeDialog(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo Cliente
                  </button>
                </div>
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

              {customerDetails && (
                <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Detalles del Cliente</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500">RNC/Cédula</label>
                      <p className="text-sm">{customerDetails.identification_number}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Nombre Comercial</label>
                      <p className="text-sm">{customerDetails.commercial_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Tipo de Comprobante</label>
                      <p className="text-sm">
                        {customerDetails.invoice_type === 'B01' ? 'Crédito Fiscal (B01)' :
                         customerDetails.invoice_type === 'B02' ? 'Consumo (B02)' :
                         customerDetails.invoice_type === 'B14' ? 'Gubernamental (B14)' :
                         customerDetails.invoice_type === 'B15' ? 'Exportación (B15)' : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Términos de Pago</label>
                      <p className="text-sm">
                        {customerDetails.payment_terms === 'contado' ? 'Contado' :
                         `${customerDetails.payment_terms} días`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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

            <div className="space-y-4 md:col-span-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Productos *</h3>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(true)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo Producto
                  </button>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Línea
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desc %</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">ITBIS</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="relative px-3 py-3">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => {
                      const itemTotal = calculateItemTotal(item);
                      return (
                        <tr key={index}>
                          <td className="px-3 py-4">
                            <select
                              value={item.product_id}
                              onChange={(e) => handleProductChange(index, e.target.value)}
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
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </td>
                          <td className="px-3 py-4">
                            <input
                              type="number"
                              value={item.unit_price}
                              readOnly
                              className="block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm"
                            />
                          </td>
                          <td className="px-3 py-4">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount_rate}
                              onChange={(e) => updateItem(index, 'discount_rate', Number(e.target.value))}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-sm text-gray-900">
                              {new Intl.NumberFormat('es-DO', {
                                style: 'currency',
                                currency: 'DOP'
                              }).format(itemTotal.tax)}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-sm text-gray-900">
                              {new Intl.NumberFormat('es-DO', {
                                style: 'currency',
                                currency: 'DOP'
                              }).format(itemTotal.total)}
                            </div>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

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
                <dt className="text-sm text-gray-600">ITBIS (18%):</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('es-DO', {
                    style: 'currency',
                    currency: 'DOP'
                  }).format(totals.tax)}
                </dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <dt>Descuento:</dt>
                  <dd>-{new Intl.NumberFormat('es-DO', {
                    style: 'currency',
                    currency: 'DOP'
                  }).format(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <dt>Total:</dt>
                <dd>{new Intl.NumberFormat('es-DO', {
                  style: 'currency',
                  currency: 'DOP'
                }).format(totals.total)}</dd>
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

      <CustomerTypeDialog
        isOpen={showCustomerTypeDialog}
        onClose={() => setShowCustomerTypeDialog(false)}
        onSelectType={handleCustomerTypeSelect}
      />

      <CreateCustomerModal
        isOpen={showCreateCustomerModal}
        onClose={() => setShowCreateCustomerModal(false)}
        onSuccess={() => {
          setShowCreateCustomerModal(false);
          loadCustomers();
        }}
      />

      <CreateCorporateCustomerModal
        isOpen={showCreateCorporateCustomerModal}
        onClose={() => setShowCreateCorporateCustomerModal(false)}
        onSuccess={() => {
          setShowCreateCorporateCustomerModal(false);
          loadCustomers();
        }}
      />

      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onSuccess={() => {
          setShowAddProductModal(false);
          loadProducts();
        }}
      />
    </div>
  );
}