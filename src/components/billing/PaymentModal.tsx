import React, { useState, useEffect } from 'react';
import { X, DollarSign, Receipt, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Invoice } from '../../types/billing';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: Invoice;
}

export default function PaymentModal({ isOpen, onClose, onSuccess, invoice }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    payment_method_id: '',
    amount: invoice.total_amount - (invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0),
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
    }
  }, [isOpen]);

  const loadPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setError('Error loading payment methods');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('payments')
        .insert([{
          ...formData,
          invoice_id: invoice.id,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error processing payment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedMethod = paymentMethods.find(m => m.id === formData.payment_method_id);
  const remainingAmount = invoice.total_amount - (invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[70]">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-md border border-white/10">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          {/* Top border */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-[2px] w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Bottom border */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-[2px] w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Left border */}
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-[2px] h-3/4 my-auto bg-gradient-to-b from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Right border */}
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-[2px] h-3/4 my-auto bg-gradient-to-b from-transparent via-white/25 to-transparent blur-sm"></div>
          
          {/* Corner glows */}
          <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
        </div>

        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Registrar Pago</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 p-4 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Invoice Summary */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Resumen de Factura</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">NCF</p>
                  <p className="font-medium text-white">{invoice.ncf}</p>
                </div>
                <div>
                  <p className="text-gray-400">Cliente</p>
                  <p className="font-medium text-white">{invoice.customer?.full_name}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Factura</p>
                  <p className="font-medium text-white">
                    {new Intl.NumberFormat('es-DO', {
                      style: 'currency',
                      currency: 'DOP'
                    }).format(invoice.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Pendiente</p>
                  <p className="font-medium text-blue-400">
                    {new Intl.NumberFormat('es-DO', {
                      style: 'currency',
                      currency: 'DOP'
                    }).format(remainingAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="payment_method" className="block text-sm font-medium text-gray-300">
                Método de Pago
              </label>
              <select
                id="payment_method"
                required
                value={formData.payment_method_id}
                onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
                className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              >
                <option value="">Seleccione un método</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-300">
                Monto
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="amount"
                  required
                  min="0.01"
                  max={remainingAmount}
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="block w-full pl-10 pr-12 bg-gray-800 border-gray-700 text-white rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 sm:text-sm">DOP</span>
                </div>
              </div>
            </div>

            {selectedMethod?.requires_reference && (
              <div>
                <label htmlFor="reference_number" className="block text-sm font-medium text-gray-300">
                  Número de Referencia
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Receipt className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="reference_number"
                    required
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="block w-full pl-10 bg-gray-800 border-gray-700 text-white rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    placeholder="Número de confirmación"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="payment_date" className="block text-sm font-medium text-gray-300">
                Fecha de Pago
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="payment_date"
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="block w-full pl-10 bg-gray-800 border-gray-700 text-white rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300">
                Notas
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                placeholder="Notas adicionales sobre el pago..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Procesando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}