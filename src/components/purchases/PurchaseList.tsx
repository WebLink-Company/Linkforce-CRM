import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Plus, Filter, RefreshCw, Download, Eye, Trash2, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PurchaseOrder } from '../../types/payables';
import CreatePurchaseModal from './CreatePurchaseModal';
import PurchaseViewerModal from './PurchaseViewerModal';
import { exportToCSV } from '../../utils/export';

export default function PurchaseList() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseOrder | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          items:purchase_order_items(
            *,
            product:purchase_products(*)
          ),
          payments:purchase_payments(
            *,
            payment_method:payment_methods(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (purchases.length > 0) {
      exportToCSV(purchases, 'purchases');
    }
  };

  const handleView = (purchase: PurchaseOrder) => {
    setSelectedPurchase(purchase);
    setShowViewerModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar esta orden de compra?')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_purchase_order', {
        p_order_id: id
      });

      if (error) throw error;
      await loadPurchases();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      alert('Error al eliminar la orden de compra');
    }
  };

  const handleIssue = async (id: string) => {
    if (!window.confirm('¿Está seguro que desea emitir esta orden de compra?')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('issue_purchase_order', {
        p_order_id: id
      });

      if (error) throw error;
      await loadPurchases();
    } catch (error) {
      console.error('Error issuing purchase order:', error);
      alert('Error al emitir la orden de compra');
    }
  };

  const filteredPurchases = purchases.filter(purchase =>
    purchase.number.toLowerCase().includes(search.toLowerCase()) ||
    purchase.supplier?.business_name.toLowerCase().includes(search.toLowerCase())
  );

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
            <h1 className="text-2xl font-semibold">Compras</h1>
            <p className="mt-2 text-sm text-gray-400">
              Gestión de órdenes de compra y facturas de proveedores
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
              Nueva Compra
            </button>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar compras..."
                  className="form-input pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-secondary"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </button>
              <button
                onClick={loadPurchases}
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
                  <th scope="col" className="table-header th">Proveedor</th>
                  <th scope="col" className="table-header th">Fecha</th>
                  <th scope="col" className="table-header th text-right">Total</th>
                  <th scope="col" className="table-header th text-center">Estado</th>
                  <th scope="col" className="table-header th text-center">Estado de Pago</th>
                  <th scope="col" className="relative table-header th">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="table-row">
                    <td className="table-cell font-medium">{purchase.number}</td>
                    <td className="table-cell">{purchase.supplier?.business_name}</td>
                    <td className="table-cell">
                      {new Date(purchase.issue_date).toLocaleDateString()}
                    </td>
                    <td className="table-cell text-right">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(purchase.total_amount)}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge ${
                        purchase.status === 'draft' ? 'status-badge-warning' :
                        purchase.status === 'sent' ? 'status-badge-info' :
                        purchase.status === 'confirmed' ? 'status-badge-success' :
                        purchase.status === 'received' ? 'status-badge-success' :
                        'status-badge-error'
                      }`}>
                        {purchase.status === 'draft' ? 'Borrador' :
                         purchase.status === 'sent' ? 'Enviada' :
                         purchase.status === 'confirmed' ? 'Confirmada' :
                         purchase.status === 'received' ? 'Recibida' :
                         'Cancelada'}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge ${
                        purchase.payment_status === 'paid' ? 'status-badge-success' :
                        purchase.payment_status === 'partial' ? 'status-badge-warning' :
                        'status-badge-error'
                      }`}>
                        {purchase.payment_status === 'paid' ? 'Pagada' :
                         purchase.payment_status === 'partial' ? 'Parcial' :
                         'Pendiente'}
                      </span>
                    </td>
                    <td className="table-cell-action">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleView(purchase)}
                          className="action-icon-button"
                          title="Ver detalles"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {purchase.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleIssue(purchase.id)}
                              className="action-icon-button text-emerald-400 hover:text-emerald-300"
                              title="Emitir"
                            >
                              <Send className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(purchase.id)}
                              className="action-icon-button text-red-400 hover:text-red-300"
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

        <CreatePurchaseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadPurchases}
        />

        <PurchaseViewerModal
          isOpen={showViewerModal}
          onClose={() => {
            setShowViewerModal(false);
            setSelectedPurchase(null);
          }}
          purchase={selectedPurchase}
          onSuccess={loadPurchases}
        />
      </div>
    </div>
  );
}