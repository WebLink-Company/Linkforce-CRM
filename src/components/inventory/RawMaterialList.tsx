import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Filter, RefreshCw, Download, AlertTriangle, Eye, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AddRawMaterialModal from './AddRawMaterialModal';
import RawMaterialViewerModal from './RawMaterialViewerModal';
import { exportToCSV } from '../../utils/export';

interface RawMaterial {
  id: string;
  code: string;
  name: string;
  description: string;
  supplier_id: string;
  unit_measure: string;
  min_stock: number;
  current_stock: number;
  reorder_point: number;
  lot_number: string;
  expiration_date: string;
  msds_url: string;
  status: 'active' | 'inactive';
  purchase_product_id: string | null;
  supplier?: {
    business_name: string;
  };
}

export default function RawMaterialList() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      // First get all raw materials
      const { data: rawMaterials, error: rawError } = await supabase
        .from('raw_materials')
        .select(`
          *,
          supplier:suppliers(business_name)
        `)
        .order('name');

      if (rawError) throw rawError;

      // Get the list of linked purchase product IDs
      const linkedProductIds = (rawMaterials || [])
        .map(m => m.purchase_product_id)
        .filter(id => id !== null);

      // Then get all purchase products that are not linked
      const { data: purchaseProducts, error: purchaseError } = await supabase
        .from('purchase_products')
        .select(`
          id,
          code,
          name,
          description,
          default_supplier_id,
          unit_measure,
          min_order_quantity,
          current_stock,
          supplier:suppliers(business_name)
        `)
        .is('deleted_at', null)
        .eq('status', 'active')
        .not('id', 'in', `(${linkedProductIds.join(',')})`)
        .order('name');

      if (purchaseError) throw purchaseError;

      // Convert purchase products to raw material format
      const purchaseAsMaterials = purchaseProducts?.map(product => ({
        id: product.id,
        code: product.code,
        name: product.name,
        description: product.description,
        supplier_id: product.default_supplier_id,
        unit_measure: product.unit_measure,
        min_stock: product.min_order_quantity,
        current_stock: product.current_stock,
        reorder_point: product.min_order_quantity * 2,
        lot_number: '',
        expiration_date: '',
        msds_url: '',
        status: 'active' as const,
        purchase_product_id: product.id,
        supplier: product.supplier,
        is_purchase_product: true
      })) || [];

      // Combine both lists
      setMaterials([...(rawMaterials || []), ...purchaseAsMaterials]);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (materials.length > 0) {
      exportToCSV(materials, 'raw_materials');
    }
  };

  const handleView = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setShowViewerModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar esta materia prima?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
    }
  };

  const handleConvertToPurchase = async (material: RawMaterial) => {
    if (!window.confirm('¿Está seguro que desea convertir este producto de compra en materia prima?')) {
      return;
    }

    try {
      const lotNumber = prompt('Por favor, ingrese el número de lote:');
      if (!lotNumber) return;

      const expirationDate = prompt('Por favor, ingrese la fecha de vencimiento (YYYY-MM-DD):');
      if (!expirationDate) return;

      const { error } = await supabase.rpc('create_raw_material_from_purchase', {
        p_product_id: material.id,
        p_lot_number: lotNumber,
        p_expiration_date: expirationDate
      });

      if (error) throw error;
      await loadMaterials();
    } catch (error) {
      console.error('Error converting to raw material:', error);
      alert('Error al convertir el producto en materia prima');
    }
  };

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(search.toLowerCase()) ||
    material.code.toLowerCase().includes(search.toLowerCase())
  );

  const getLowStockStatus = (material: RawMaterial) => {
    if (material.current_stock <= material.min_stock) {
      return 'critical';
    }
    if (material.current_stock <= material.reorder_point) {
      return 'warning';
    }
    return 'ok';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Materias Primas</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestión de inventario de materias primas y control de stock
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Materia Prima
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
                placeholder="Buscar materias primas..."
                className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:text-gray-900 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
            <button
              onClick={loadMaterials}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </button>
          </div>
        </div>

        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Código
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Nombre
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Proveedor
                </th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  Stock Actual
                </th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                  Estado
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredMaterials.map((material) => {
                const stockStatus = getLowStockStatus(material);
                return (
                  <tr key={material.id} className={material.purchase_product_id ? 'bg-blue-50' : ''}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {material.code}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {material.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {material.supplier?.business_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                      <div className="flex items-center justify-end">
                        {stockStatus !== 'ok' && (
                          <AlertTriangle className={`h-4 w-4 mr-2 ${
                            stockStatus === 'critical' ? 'text-red-500' : 'text-yellow-500'
                          }`} />
                        )}
                        <span className={`${
                          stockStatus === 'critical' ? 'text-red-600 font-medium' :
                          stockStatus === 'warning' ? 'text-yellow-600' :
                          'text-gray-900'
                        }`}>
                          {material.current_stock} {material.unit_measure}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        material.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {material.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleView(material)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {material.purchase_product_id ? (
                          <button
                            onClick={() => handleConvertToPurchase(material)}
                            className="text-green-600 hover:text-green-900"
                            title="Convertir a Materia Prima"
                          >
                            <Package className="h-5 w-5" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {/* Handle edit */}}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(material.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddRawMaterialModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadMaterials}
      />

      <RawMaterialViewerModal
        isOpen={showViewerModal}
        onClose={() => {
          setShowViewerModal(false);
          setSelectedMaterial(null);
        }}
        material={selectedMaterial}
      />
    </div>
  );
}