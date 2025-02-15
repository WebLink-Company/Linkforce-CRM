import React, { useState } from 'react';
import { X, Printer, Edit, FileText, Calendar, DollarSign, Tag, User, CheckCircle, XCircle } from 'lucide-react';
import type { Expense } from '../../types/payables';
import { supabase } from '../../lib/supabase';
import EditExpenseModal from './EditExpenseModal';

interface ExpenseViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onSuccess?: () => void;
}

export default function ExpenseViewerModal({ isOpen, onClose, expense, onSuccess }: ExpenseViewerModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !expense) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleApprove = async () => {
    if (!window.confirm('¿Está seguro que desea aprobar este gasto?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.rpc('approve_expense', {
        p_expense_id: expense.id,
        p_user_id: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) throw error;

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error approving expense:', error);
      setError(error instanceof Error ? error.message : 'Error al aprobar el gasto');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Por favor, indique el motivo del rechazo:');
    if (!reason) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.rpc('reject_expense', {
        p_expense_id: expense.id,
        p_reason: reason
      });

      if (error) throw error;

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error rejecting expense:', error);
      setError(error instanceof Error ? error.message : 'Error al rechazar el gasto');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Gasto #{expense.number}</h2>
          <div className="flex items-center space-x-2">
            {expense.status === 'pending' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {loading ? 'Procesando...' : 'Aprobar'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </button>
              </>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información General</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Fecha</p>
                      <p className="font-medium">{formatDate(expense.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Tag className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Categoría</p>
                      <p className="font-medium">{expense.category?.name}</p>
                    </div>
                  </div>
                  {expense.supplier && (
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Proveedor</p>
                        <p className="font-medium">{expense.supplier.business_name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Descripción</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">{expense.description}</p>
                </div>
              </div>
            </div>

            {/* Amounts and Status */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Montos</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(expense.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">ITBIS (18%):</span>
                    <span className="font-medium">{formatCurrency(expense.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-base font-medium">Total:</span>
                    <span className="text-lg font-bold">{formatCurrency(expense.total_amount)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Estado</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center">
                    {expense.status === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    ) : expense.status === 'rejected' ? (
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    ) : (
                      <FileText className="h-5 w-5 text-yellow-500 mr-2" />
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Estado Actual</p>
                      <p className={`font-medium ${
                        expense.status === 'approved' ? 'text-green-600' :
                        expense.status === 'rejected' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {expense.status === 'approved' ? 'Aprobado' :
                         expense.status === 'rejected' ? 'Rechazado' :
                         'Pendiente'}
                      </p>
                    </div>
                  </div>

                  {expense.payment_method && (
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Método de Pago</p>
                        <p className="font-medium">{expense.payment_method.name}</p>
                        {expense.reference_number && (
                          <p className="text-sm text-gray-500">Ref: {expense.reference_number}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {expense.approved_by && (
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Aprobado por</p>
                        <p className="font-medium">{expense.approved_by}</p>
                        <p className="text-sm text-gray-500">
                          {expense.approved_at && formatDate(expense.approved_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notas</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{expense.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <EditExpenseModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        expense={expense}
        onSuccess={() => {
          setShowEditModal(false);
          if (onSuccess) onSuccess();
        }}
      />
    </div>
  );
}