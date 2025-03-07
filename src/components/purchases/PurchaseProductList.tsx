import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Filter, RefreshCw, Download, Eye, Trash2, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CreatePurchaseProductModal from './CreatePurchaseProductModal';
import { exportToCSV } from '../../utils/export';

interface PurchaseProduct {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category_id: string | null;
  unit_measure: string;
  default_supplier_id: string | null;
  min_order_quantity: number;
  current_stock: number;
  last_purchase_price: number;
  status: 'active' | 'inactive';
  category?: {
    name: string;
  };
  default_supplier?: {
    business_name: string;
  };
}

export default function PurchaseProductList() {
  const [products, setProducts] = useState<PurchaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PurchaseProduct | null>(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_products')
        .select(`
          *,
          category:supplier_categories(*),
          default_supplier:suppliers(business_name)
        `)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (products.length > 0) {
      exportToCSV(products, 'purchase_products');
    }
  };

  const handleEdit = (product: PurchaseProduct) => {
    setSelectedProduct(product);
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar este producto?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('purchase_products')
        .update({ 
          deleted_at: new Date().toISOString(),
          status: 'inactive'
        })
        .eq('id', id);

      if (error) throw error;
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.code.toLowerCase().includes(search.toLowerCase())
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
            <h1 className="text-2xl font-semibold">Productos de Compra</h1>
            <p className="mt-2 text-sm text-gray-400">
              Gestión de productos y materiales para compras
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
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-secondary"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </button>
              <button
                onClick={loadProducts}
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
                  <th scope="col" className="table-header th">Nombre</th>
                  <th scope="col" className="table-header th">Proveedor</th>
                  <th scope="col" className="table-header th">Stock</th>
                  <th scope="col" className="table-header th">Último Precio</th>
                  <th scope="col" className="table-header th text-center">Estado</th>
                  <th scope="col" className="relative table-header th">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="table-row">
                    <td className="table-cell font-medium">{product.code}</td>
                    <td className="table-cell">{product.name}</td>
                    <td className="table-cell">{product.default_supplier?.business_name || '-'}</td>
                    <td className="table-cell">
                      <span className={`status-badge ${
                        product.current_stock <= product.min_order_quantity ? 'status-badge-error' :
                        product.current_stock <= product.min_order_quantity * 2 ? 'status-badge-warning' :
                        'status-badge-success'
                      }`}>
                        {product.current_stock} {product.unit_measure}
                      </span>
                    </td>
                    <td className="table-cell">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(product.last_purchase_price)}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge ${
                        product.status === 'active' ? 'status-badge-success' : 'status-badge-error'
                      }`}>
                        {product.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="table-cell-action">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="action-icon-button"
                          title="Editar"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="action-icon-button text-red-400 hover:text-red-300"
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

        <CreatePurchaseProductModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={loadProducts}
          editingProduct={selectedProduct}
        />
      </div>
    </div>
  );
}