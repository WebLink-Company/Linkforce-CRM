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
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-3xl border border-white/10 shadow-2xl">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        {/* Fixed Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm rounded-t-lg z-10">
          <h2 className="text-lg font-semibold text-white">Gasto #{expense.number}</h2>
          <div className="flex items-center space-x-2">
            {expense.status === 'pending' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {loading ? 'Procesando...' : 'Aprobar'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="btn btn-danger"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </button>
              </>
            )}
            <button
              onClick={handlePrint}
              className="btn btn-secondary"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border-b border-red-500/50">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Información General</h3>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-400">Fecha</p>
                      <p className="font-medium text-white">{formatDate(expense.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Tag className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-400">Categoría</p>
                      <p className="font-medium text-white">{expense.category?.name}</p>
                    </div>
                  </div>
                  {expense.supplier && (
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-400">Proveedor</p>
                        <p className="font-medium text-white">{expense.supplier.business_name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-4">Descripción</h3>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                  <p className="text-gray-300">{expense.description}</p>
                </div>
              </div>
            </div>

            {/* Amounts and Status */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Montos</h3>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Subtotal:</span>
                    <span className="font-medium text-white">{formatCurrency(expense.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">ITBIS:</span>
                    <span className="font-medium text-white">{formatCurrency(expense.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-base font-medium text-white">Total:</span>
                    <span className="text-lg font-bold text-white">{formatCurrency(expense.total_amount)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-4">Estado</h3>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                  <div className="flex items-center">
                    {expense.status === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400 mr-2" />
                    ) : expense.status === 'rejected' ? (
                      <XCircle className="h-5 w-5 text-red-400 mr-2" />
                    ) : (
                      <FileText className="h-5 w-5 text-yellow-400 mr-2" />
                    )}
                    <div>
                      <p className="text-sm text-gray-400">Estado Actual</p>
                      <p className={`font-medium ${
                        expense.status === 'approved' ? 'text-emerald-400' :
                        expense.status === 'rejected' ? 'text-red-400' :
                        'text-yellow-400'
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
                        <p className="text-sm text-gray-400">Método de Pago</p>
                        <p className="font-medium text-white">{expense.payment_method.name}</p>
                        {expense.reference_number && (
                          <p className="text-sm text-gray-400">Ref: {expense.reference_number}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {expense.approved_by && (
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-400">Aprobado por</p>
                        <p className="font-medium text-white">{expense.approved_by}</p>
                        <p className="text-sm text-gray-400">
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
              <h3 className="text-lg font-medium text-white mb-4">Notas</h3>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <p className="text-gray-300 whitespace-pre-wrap">{expense.notes}</p>
              </div>
            </div>
          )}

          {/* Attachments */}
          {expense.attachments && expense.attachments.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-4">Adjuntos</h3>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <ul className="divide-y divide-white/10">
                  {expense.attachments.map((attachment) => (
                    <li key={attachment.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="font-medium text-white">{attachment.file_name}</p>
                          <p className="text-sm text-gray-400">
                            {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // Handle file download
                        }}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        Descargar
                      </button>
                    </li>
                  ))}
                </ul>
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