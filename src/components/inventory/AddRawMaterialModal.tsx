import React, { useState, useEffect } from 'react';
import { X, Upload, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CreateSupplierModal from '../suppliers/CreateSupplierModal';

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddRawMaterialModal({ isOpen, onClose, onSuccess }: AddRawMaterialModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    supplier_id: '',
    unit_measure: '',
    min_stock: 0,
    current_stock: 0,
    reorder_point: 0,
    lot_number: '',
    expiration_date: '',
    msds_url: '',
  });

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
    }
  }, [isOpen]);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .is('deleted_at', null)
        .order('business_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Create raw material
      const { data: material, error: materialError } = await supabase
        .from('raw_materials')
        .insert([{
          ...formData,
          created_by: user.id
        }])
        .select()
        .single();

      if (materialError) throw materialError;

      // Upload MSDS document if provided
      if (files.length > 0) {
        for (const file of files) {
          const { error: uploadError } = await supabase.storage
            .from('raw-material-documents')
            .upload(`${material.id}/${file.name}`, file);

          if (uploadError) throw uploadError;

          // Create document record
          const { error: docError } = await supabase
            .from('raw_material_documents')
            .insert([{
              material_id: material.id,
              document_type: 'msds',
              file_name: file.name,
              file_path: `${material.id}/${file.name}`,
              uploaded_by: user.id
            }]);

          if (docError) throw docError;
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating raw material:', error);
      setError(error instanceof Error ? error.message : 'Error creating raw material');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl my-8">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">Nueva Materia Prima</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700">
                  Proveedor *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCreateSupplierModal(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo Proveedor
                </button>
              </div>
              <select
                id="supplier_id"
                required
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Seleccione un proveedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.business_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="unit_measure" className="block text-sm font-medium text-gray-700">
                Unidad de Medida *
              </label>
              <select
                id="unit_measure"
                required
                value={formData.unit_measure}
                onChange={(e) => setFormData({ ...formData, unit_measure: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Seleccione una unidad</option>
                <option value="gls">Galones</option>
                <option value="kg">Kilogramos</option>
                <option value="g">Gramos</option>
                <option value="l">Litros</option>
                <option value="ml">Mililitros</option>
                <option value="u">Unidades</option>
                <option value="pz">Piezas</option>
                <option value="cj">Cajas</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="min_stock" className="block text-sm font-medium text-gray-700">
                  Stock Mínimo *
                </label>
                <input
                  type="number"
                  id="min_stock"
                  required
                  min="0"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="current_stock" className="block text-sm font-medium text-gray-700">
                  Stock Actual *
                </label>
                <input
                  type="number"
                  id="current_stock"
                  required
                  min="0"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="reorder_point" className="block text-sm font-medium text-gray-700">
                  Punto de Reorden *
                </label>
                <input
                  type="number"
                  id="reorder_point"
                  required
                  min="0"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({ ...formData, reorder_point: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lot_number" className="block text-sm font-medium text-gray-700">
                  Número de Lote
                </label>
                <input
                  type="text"
                  id="lot_number"
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="expiration_date" className="block text-sm font-medium text-gray-700">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  id="expiration_date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="msds_url" className="block text-sm font-medium text-gray-700">
                URL de MSDS
              </label>
              <input
                type="url"
                id="msds_url"
                value={formData.msds_url}
                onChange={(e) => setFormData({ ...formData, msds_url: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="https://example.com/msds.pdf"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ficha de Seguridad (MSDS)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Subir archivo</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".pdf"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">o arrastrar y soltar</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF hasta 10MB
                  </p>
                </div>
              </div>

              {files.length > 0 && (
                <ul className="mt-4 divide-y divide-gray-200">
                  {files.map((file, index) => (
                    <li key={index} className="py-3 flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {file.name}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-900"
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
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear Materia Prima'}
            </button>
          </div>
        </form>
      </div>

      <CreateSupplierModal
        isOpen={showCreateSupplierModal}
        onClose={() => setShowCreateSupplierModal(false)}
        onSuccess={() => {
          setShowCreateSupplierModal(false);
          loadSuppliers();
        }}
      />
    </div>
  );
}