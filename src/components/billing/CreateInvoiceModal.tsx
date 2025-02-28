import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, User, Building2, Phone, Mail as MailIcon, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Customer } from '../../types/customer';
import CustomerSelector from './CustomerSelector';
import CustomerTypeDialog from '../customers/CustomerTypeDialog';
import CreateCustomerModal from '../customers/CreateCustomerModal';
import CreateCorporateCustomerModal from '../customers/CreateCorporateCustomerModal';
import AddProductModal from '../inventory/AddProductModal';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const initialFormState = {
  issue_date: new Date().toISOString().split('T')[0],
  due_date: '',
  notes: '',
};

const initialItemState = {
  product_id: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 18,
  tax_amount: 0,
  discount_rate: 0,
  discount_amount: 0,
  total_amount: 0
};

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess }: CreateInvoiceModalProps) {
  const [formData, setFormData] = useState(initialFormState);
  const [items, setItems] = useState<any[]>([{...initialItemState}]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateCorporateCustomerModal, setShowCreateCorporateCustomerModal] = useState(false);
  const [showCustomerTypeDialog, setShowCustomerTypeDialog] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [nextNCF, setNextNCF] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      checkNextNCF();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCustomer && formData.issue_date) {
      const issueDate = new Date(formData.issue_date);
      let daysToAdd = 0;

      if (selectedCustomer.payment_terms === 'contado') {
        daysToAdd = 0;
      } else {
        daysToAdd = parseInt(selectedCustomer.payment_terms, 10) || 0;
      }

      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + daysToAdd);

      setFormData(prev => ({
        ...prev,
        due_date: dueDate.toISOString().split('T')[0]
      }));
    }
  }, [selectedCustomer, formData.issue_date]);

  const checkNextNCF = async () => {
    try {
      // Get the sequence type from customer or default to B01
      const sequenceType = selectedCustomer?.invoice_type || 'B01';
      
      // Get the next NCF that will be used
      const { data: sequences, error: seqError } = await supabase
        .from('fiscal_sequences')
        .select('prefix, current_number')
        .eq('sequence_type', sequenceType)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString().split('T')[0])
        .single();

      if (seqError) {
        console.error('Error fetching sequence:', seqError);
        return;
      }

      if (sequences) {
        const nextNumber = sequences.current_number.toString().padStart(8, '0');
        setNextNCF(`${sequences.prefix}${nextNumber}`);
      }
    } catch (error) {
      console.error('Error checking next NCF:', error);
      setError('Error al obtener el próximo NCF');
    }
  };

  // Add this effect to update NCF when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      checkNextNCF();
    } else {
      setNextNCF(null);
    }
  }, [selectedCustomer]);

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

  const resetForm = () => {
    setFormData(initialFormState);
    setItems([{...initialItemState}]);
    setSelectedCustomer(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!selectedCustomer) {
        throw new Error('Debe seleccionar un cliente');
      }

      if (items.length === 0 || !items[0].product_id) {
        throw new Error('Debe agregar al menos un producto');
      }

      // Get NCF
      const { data: ncfData, error: ncfError } = await supabase
        .rpc('generate_ncf', { 
          p_sequence_type: selectedCustomer.invoice_type || 'B01'
        });

      if (ncfError) throw ncfError;

      // Create invoice
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .insert([{
          ncf: ncfData,
          customer_id: selectedCustomer.id,
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

      if (!invData) {
        throw new Error('Failed to create invoice');
      }

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

      // Reset form
      resetForm();
      
      // Get next NCF
      await checkNextNCF();

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
    setItems([...items, {...initialItemState}]);
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
    if (type === 'individual') {
      setShowCreateModal(true);
    } else {
      setShowCreateCorporateCustomerModal(true);
    }
  };

  const handleCustomerCreated = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCreateModal(false);
    setShowCreateCorporateCustomerModal(false);
  };

  if (!isOpen) return null;

  const totals = items.reduce((acc, item) => ({
    subtotal: acc.subtotal + (item.quantity * item.unit_price),
    tax_amount: acc.tax_amount + item.tax_amount,
    discount_amount: acc.discount_amount + item.discount_amount,
    total_amount: acc.total_amount + item.total_amount
  }), { subtotal: 0, tax_amount: 0, discount_amount: 0, total_amount: 0 });

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 modal-backdrop">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-4xl my-8 border border-white/10 shadow-2xl flex flex-col max-h-[90vh] modal-content">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        {/* Fixed Header */}
        <div className="sticky top-0 flex justify-between items-center p-4 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm rounded-t-lg z-50">
          <div>
            <h2 className="text-lg font-semibold text-white">Nueva Factura</h2>
            {nextNCF && (
              <p className="text-sm text-emerald-400 mt-1">
                Próximo NCF: {nextNCF}
              </p>
            )}
          </div>
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
        <form onSubmit={handleSubmit} id="invoice-form" className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Customer Information */}
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

              <CustomerSelector
                onSelect={setSelectedCustomer}
                selectedCustomerId={selectedCustomer?.id}
              />

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
                    <MailIcon className="h-4 w-4 mt-1 text-gray-400" />
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

            {/* Invoice Information */}
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
                    readOnly
                    className="mt-1 block w-full rounded-md bg-gray-800/50 border-gray-600/50 text-white shadow-sm cursor-not-allowed sm:text-sm"
                  />
                  {selectedCustomer && (
                    <p className="mt-1 text-sm text-gray-400">
                      {selectedCustomer.payment_terms === 'contado' 
                        ? 'Pago al contado'
                        : `Vence a ${selectedCustomer.payment_terms} días`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Productos *</h3>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateProductModal(true)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-300 bg-blue-500/20 hover:bg-blue-500/30"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Crear Producto
                  </button>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Producto
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead>
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
                className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                placeholder="Notas o comentarios adicionales..."
              />
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="sticky bottom-0 p-4 border-t border-white/10 bg-gray-900/95 backdrop-blur-sm rounded-b-lg mt-auto">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="invoice-form"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Crear Factura'}
              </button>
            </div>
          </div>
        </form>

        <CustomerTypeDialog
          isOpen={showCustomerTypeDialog}
          onClose={() => setShowCustomerTypeDialog(false)}
          onSelectType={handleCustomerTypeSelect}
        />

        <CreateCustomerModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCustomerCreated}
        />

        <CreateCorporateCustomerModal
          isOpen={showCreateCorporateCustomerModal}
          onClose={() => setShowCreateCorporateCustomerModal(false)}
          onSuccess={handleCustomerCreated}
        />

        <AddProductModal
          isOpen={showCreateProductModal}
          onClose={() => setShowCreateProductModal(false)}
          onSuccess={() => {
            setShowCreateProductModal(false);
            loadProducts();
          }}
        />
      </div>
    </div>
  );
}