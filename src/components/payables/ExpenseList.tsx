import React, { useState, useEffect } from 'react';
import { Plus, Filter, RefreshCw, Download, Eye, Trash2, Edit } from 'lucide-react';
import { payablesAPI } from '../../lib/api/payables';
import type { Expense } from '../../types/payables';
import CreateExpenseModal from './CreateExpenseModal';
import ExpenseViewerModal from './ExpenseViewerModal';
import EditExpenseModal from './EditExpenseModal';
import { exportToCSV } from '../../utils/export';

export default function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const { data, error } = await payablesAPI.getExpenses();
      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (expenses.length > 0) {
      exportToCSV(expenses, 'expenses');
    }
  };

  const handleView = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowViewerModal(true);
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar este gasto?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h2 className="text-xl font-semibold">Gastos</h2>
            <p className="mt-2 text-sm text-gray-400">
              Gestión de gastos operativos y administrativos
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-3">
            <button
              onClick={handleExport}
              className="btn btn-secondary"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Gasto
            </button>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-secondary"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </button>
              <button
                onClick={loadExpenses}
                className="btn btn-secondary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="table-header">
                <tr>
                  <th scope="col" className="table-header th">Número</th>
                  <th scope="col" className="table-header th">Categoría</th>
                  <th scope="col" className="table-header th">Descripción</th>
                  <th scope="col" className="table-header th text-right">Total</th>
                  <th scope="col" className="table-header th text-center">Estado</th>
                  <th scope="col" className="relative table-header th">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="table-row">
                    <td className="table-cell font-medium">{expense.number}</td>
                    <td className="table-cell">{expense.category?.name}</td>
                    <td className="table-cell">{expense.description}</td>
                    <td className="table-cell text-right">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(expense.total_amount)}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge ${
                        expense.status === 'approved' ? 'status-badge-success' :
                        expense.status === 'rejected' ? 'status-badge-error' :
                        'status-badge-warning'
                      }`}>
                        {expense.status === 'approved' ? 'Aprobado' :
                         expense.status === 'rejected' ? 'Rechazado' :
                         'Pendiente'}
                      </span>
                    </td>
                    <td className="table-cell-action">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleView(expense)}
                          className="action-icon-button"
                          title="Ver detalles"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {expense.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleEdit(expense)}
                              className="action-icon-button"
                              title="Editar"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-400 hover:text-red-300 action-icon-button"
                              title="Eliminar"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CreateExpenseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadExpenses}
        />

        <ExpenseViewerModal
          isOpen={showViewerModal}
          onClose={() => {
            setShowViewerModal(false);
            setSelectedExpense(null);
          }}
          expense={selectedExpense}
          onSuccess={loadExpenses}
        />

        <EditExpenseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedExpense(null);
          }}
          expense={selectedExpense!}
          onSuccess={loadExpenses}
        />
      </div>
    </div>
  );
}