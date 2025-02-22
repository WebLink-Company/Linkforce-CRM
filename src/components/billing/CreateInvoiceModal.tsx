import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, User, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Customer } from '../../types/customer';
import CreateCustomerModal from '../customers/CreateCustomerModal';
import CreateCorporateCustomerModal from '../customers/CreateCorporateCustomerModal';
import CustomerTypeDialog from '../customers/CustomerTypeDialog';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess }: CreateInvoiceModalProps) {
  const [formData, setFormData] = useState({
    customer_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
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

  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showCreateCorporateCustomerModal, setShowCreateCorporateCustomerModal] = useState(false);
  const [showCustomerTypeDialog, setShowCustomerTypeDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      loadCustomers();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

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
      // Get NCF
      const { data: ncfData, error: ncfError } = await supabase
        .rpc('generate_ncf', { p_sequence_type: 'B01' });

      if (ncfError) throw ncfError;

      // Create invoice
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .insert([{
          ncf: ncfData,
          customer_id: formData.customer_id,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          subtotal: items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0),
          tax_amount: items.reduce((sum, item) => sum + item.tax_amount, 0),
          discount_amount: items.reduce((sum, item) => sum + item.discount_amount, 0),
          total_amount: items.reduce((sum, item) => sum + item.total_amount, 0),
          status: 'draft',
          payment_status: 'pending',
          notes: formData.notes,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (invError) throw invError;

      // Create invoice items
      const invoiceItems = items.map(item => ({
        invoice_id: invData.id,
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
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError(error instanceof Error ? error.message : 'Error creating invoice');
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

  const handleCustomerTypeSelect = (type: string) => {
    setShowCustomerTypeDialog(false);
    if (type === 'personal') {
      setShowCreateCustomerModal(true);
    } else {
      setShowCreateCorporateCustomerModal(true);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.identification_number.includes(searchTerm)
  );

  if (!isOpen) return null;

  const totals = items.reduce((acc, item) => ({
    subtotal: acc.subtotal + (item.quantity * item.unit_price),
    tax_amount: acc.tax_amount + item.tax_amount,
    discount_amount: acc.discount_amount + item.discount_amount,
    total_amount: acc.total_amount + item.total_amount
  }), { subtotal: 0, tax_amount: 0, discount_amount: 0, total_amount: 0 });

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-4xl my-8 border border-white/10 shadow-2xl">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Nueva Factura</h2>
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
            {/* Customer Selection */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Información del Cliente</h3>
                <button
                  type="button"
                  onClick={() => setShowCustomerTypeDialog(true)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir Nuevo Cliente
                </button>
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar cliente por nombre o RNC..."
                  className="block w-full pl-10 rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              {searchTerm && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-md bg-gray-800/50 border border-white/10">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, customer_id: customer.id }));
                        setSearchTerm(customer.full_name);
                        setSelectedCustomer(customer);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-700/50 text-sm text-gray-300"
                    >
                      <div className="font-medium">{customer.full_name}</div>
                      <div className="text-xs text-gray-400">RNC: {customer.identification_number}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Customer Details */}
              {selectedCustomer && (
                <div className="mt-4 grid grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-lg border border-white/20">
                  <div className="flex items-start space-x-2">
                    <Building2 className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Razón Social</p>
                      <p className="font-medium text-white">{selectedCustomer.full_name}</p>
                      {selectedCustomer.commercial_name && (
                        <p className="text-sm text-gray-400">{selectedCustomer.commercial_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Mail className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="font-medium text-white">{selectedCustomer.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Dirección</p>
                      <p className="font-medium text-white">{selectedCustomer.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Phone className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Teléfono</p>
                      <p className="font-medium text-white">{selectedCustomer.phone}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Tipo de Comprobante</p>
                    <p className="font-medium text-white">
                      {selectedCustomer.invoice_type === 'B01' ? 'Crédito Fiscal (B01)' :
                       selectedCustomer.invoice_type === 'B02' ? 'Consumo (B02)' :
                       selectedCustomer.invoice_type === 'B14' ? 'Gubernamental (B14)' :
                       selectedCustomer.invoice_type === 'B15' ? 'Factura para Exportaciones (B15)' :
                       'No especificado'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Términos de Pago</p>
                    <p className="font-medium text-white">
                      {selectedCustomer.payment_terms === 'contado' ? 'Contado' :
                       `${selectedCustomer.payment_terms} días`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Information */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">Información de la Factura</h3>
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
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Productos *</h3>
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
                      <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-300 uppercase">Producto</th>
                      <th className="px-3 py-3.5 text-right text-xs font-medium text-gray-300 uppercase">Cantidad</th>
                      <th className="px-3 py-3.5 text-right text-xs font-medium text-gray-300 uppercase">Precio</th>
                      <th className="px-3 py-3.5 text-right text-xs font-medium text-gray-300 uppercase">Desc %</th>
                      <th className="px-3 py-3.5 text-right text-xs font-medium text-gray-300 uppercase">ITBIS</th>
                      <th className="px-3 py-3.5 text-right text-xs font-medium text-gray-300 uppercase">Total</th>
                      <th className="relative px-3 py-3.5">
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
                            className="block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
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
                            className="block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            value={item.unit_price}
                            readOnly
                            className="block w-full rounded-md bg-gray-800/50 border-gray-700 text-white shadow-sm sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount_rate}
                            onChange={(e) => updateItem(index, 'discount_rate', Number(e.target.value))}
                            className="block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-4 text-right text-gray-300">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(item.tax_amount)}
                        </td>
                        <td className="px-3 py-4 text-right text-gray-300">
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
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300">
                Notas
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
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
              {loading ? 'Guardando...' : 'Crear Factura'}
            </button>
          </div>
        </form>

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
      </div>
    </div>
  );
}