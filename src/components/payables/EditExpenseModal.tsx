import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Expense, ExpenseCategory } from '../../types/payables';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense;
  onSuccess: () => void;
}

export default function EditExpenseModal({ isOpen, onClose, expense, onSuccess }: EditExpenseModalProps) {
  const [formData, setFormData] = useState({
    category_id: '',
    date: '',
    description: '',
    amount: 0,
    tax_amount: 0,
    total_amount: 0,
    payment_method_id: '',
    reference_number: '',
    notes: '',
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expense) {
      setFormData({
        category_id: expense.category_id,
        date: expense.date,
        description: expense.description,
        amount: expense.amount,
        tax_amount: expense.tax_amount,
        total_amount: expense.total_amount,
        payment_method_id: expense.payment_method_id || '',
        reference_number: expense.reference_number || '',
        notes: expense.notes || '',
      });
    }
  }, [expense]);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadPaymentMethods();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

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
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = Number(e.target.value) || 0;
    setFormData({
      ...formData,
      amount,
      total_amount: amount + formData.tax_amount
    });
  };

  const handleTaxAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const taxAmount = Number(e.target.value) || 0;
    setFormData({
      ...formData,
      tax_amount: taxAmount,
      total_amount: formData.amount + taxAmount
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Update expense
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', expense.id);

      if (updateError) throw updateError;

      // Upload new attachments if any
      if (files.length > 0) {
        for (const file of files) {
          const { error: uploadError } = await supabase.storage
            .from('expense-attachments')
            .upload(`${expense.id}/${file.name}`, file);

          if (uploadError) throw uploadError;

          const { error: attachmentError } = await supabase
            .from('expense_attachments')
            .insert([{
              expense_id: expense.id,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              file_path: `${expense.id}/${file.name}`,
              uploaded_by: (await supabase.auth.getUser()).data.user?.id
            }]);

          if (attachmentError) throw attachmentError;
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating expense:', error);
      setError(error instanceof Error ? error.message : 'Error updating expense');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-2xl my-8 border border-white/10 shadow-2xl">
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Editar Gasto #{expense.number}</h2>
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
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Información Básica</h3>
              
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-300">
                  Categoría *
                </label>
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
              </div>

              <div className="mt-4">
                <label htmlFor="date" className="block text-sm font-medium text-gray-300">
                  Fecha *
                </label>
                <input
                  type="date"
                  id="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                  Descripción *
                </label>
                <textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Amount Information */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <h3 className="text-base font-medium text-white mb-4">Información de Pago</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-300">
                    Monto *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 sm:text-sm">RD$</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      required
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={handleAmountChange}
                      className="block w-full pl-12 rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="tax_amount" className="block text-sm font-medium text-gray-300">
                    ITBIS
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 sm:text-sm">RD$</span>
                    </div>
                    <input
                      type="number"
                      id="tax_amount"
                      min="0"
                      step="0.01"
                      value={formData.tax_amount}
                      onChange={handleTaxAmountChange}
                      className="block w-full pl-12 rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="total_amount" className="block text-sm font-medium text-gray-300">
                    Total
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 sm:text-sm">RD$</span>
                    </div>
                    <input
                      type="number"
                      id="total_amount"
                      readOnly
                      value={formData.total_amount}
                      className="block w-full pl-12 rounded-md bg-gray-800/50 border-gray-700/50 text-white shadow-sm sm:text-sm cursor-not-allowed font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="payment_method_id" className="block text-sm font-medium text-gray-300">
                  Método de Pago *
                </label>
                <select
                  id="payment_method_id"
                  required
                  value={formData.payment_method_id}
                  onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                >
                  <option value="">Seleccione un método</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.payment_method_id && (
                <div className="mt-4">
                  <label htmlFor="reference_number" className="block text-sm font-medium text-gray-300">
                    Número de Referencia
                  </label>
                  <input
                    type="text"
                    id="reference_number"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              )}
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

            {/* File Upload */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
              <label className="block text-sm font-medium text-gray-300">
                Adjuntar Nuevos Archivos
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600/50 border-dashed rounded-md hover:border-gray-500/50 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-400">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-medium text-emerald-400 hover:text-emerald-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2"
                    >
                      <span>Subir archivos</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">o arrastrar y soltar</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    PNG, JPG, PDF hasta 10MB
                  </p>
                </div>
              </div>

              {files.length > 0 && (
                <ul className="mt-4 divide-y divide-gray-600/50">
                  {files.map((file, index) => (
                    <li key={index} className="py-3 flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-white">
                          {file.name}
                        </span>
                        <span className="ml-2 text-sm text-gray-400">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}