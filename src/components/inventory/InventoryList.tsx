import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Filter, RefreshCw, Download, Eye, Trash2, Edit, FlaskRound as Flask } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { InventoryItem } from '../../types/erp';
import AddProductModal from './AddProductModal';
import AddCategoryModal from './AddCategoryModal';
import { exportToCSV } from '../../utils/export';
import { Link } from 'react-router-dom';

export default function InventoryList() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const loadInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryItems();
  }, []);

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar este producto?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadInventoryItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error al eliminar el producto');
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingItem(null);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.code.toLowerCase().includes(search.toLowerCase())
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
            <h1 className="text-2xl font-semibold">Inventario</h1>
            <p className="mt-2 text-sm text-gray-400">
              Gestione el inventario de productos, stock y ubicaciones
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-3">
            <Link
              to="/materias-primas"
              className="btn btn-secondary"
            >
              <Flask className="h-4 w-4 mr-2" />
              Materias Primas
            </Link>
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="btn btn-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
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
                  placeholder="Buscar productos..."
                  className="form-input pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </button>
              <button
                onClick={loadInventoryItems}
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
                  <th scope="col" className="table-header th">Código</th>
                  <th scope="col" className="table-header th">Producto</th>
                  <th scope="col" className="table-header th">Stock Actual</th>
                  <th scope="col" className="table-header th">Unidad</th>
                  <th scope="col" className="table-header th">Precio</th>
                  <th scope="col" className="relative table-header th">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="table-row">
                    <td className="table-cell font-medium">{item.code}</td>
                    <td className="table-cell">{item.name}</td>
                    <td className="table-cell">
                      <span className={`status-badge ${
                        item.current_stock <= item.min_stock ? 'status-badge-error' :
                        item.current_stock <= item.reorder_point ? 'status-badge-warning' :
                        'status-badge-success'
                      }`}>
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="table-cell">{item.unit_measure}</td>
                    <td className="table-cell">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(item.unit_price || 0)}
                    </td>
                    <td className="table-cell-action">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Editar"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Eliminar"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <AddProductModal
          isOpen={showAddModal}
          onClose={handleModalClose}
          onSuccess={loadInventoryItems}
          editingItem={editingItem}
        />

        <AddCategoryModal
          isOpen={showAddCategoryModal}
          onClose={() => setShowAddCategoryModal(false)}
          onSuccess={loadInventoryItems}
        />
      </div>
    </div>
  );
}