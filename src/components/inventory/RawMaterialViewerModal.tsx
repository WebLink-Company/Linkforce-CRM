import React from 'react';
import { X, Printer, Building2, AlertTriangle, FileText } from 'lucide-react';

interface RawMaterialViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: any;
}

export default function RawMaterialViewerModal({ isOpen, onClose, material }: RawMaterialViewerModalProps) {
  if (!isOpen || !material) return null;

  const handlePrint = () => {
    window.print();
  };

  const getLowStockStatus = () => {
    if (material.current_stock <= material.min_stock) {
      return {
        type: 'critical',
        message: 'Stock crítico'
      };
    }
    if (material.current_stock <= material.reorder_point) {
      return {
        type: 'warning',
        message: 'Stock bajo'
      };
    }
    return {
      type: 'ok',
      message: 'Stock normal'
    };
  };

  const stockStatus = getLowStockStatus();

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Materia Prima: {material.name}</h2>
          <div className="flex items-center space-x-2">
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

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información General</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Código</p>
                    <p className="font-medium">{material.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{material.name}</p>
                  </div>
                  {material.description && (
                    <div>
                      <p className="text-sm text-gray-500">Descripción</p>
                      <p className="font-medium">{material.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Proveedor</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center">
                    <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="font-medium">{material.supplier?.business_name}</p>
                      {material.supplier?.contact_name && (
                        <p className="text-sm text-gray-500">
                          Contacto: {material.supplier.contact_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Inventario</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Stock Actual</p>
                      <div className="flex items-center">
                        {stockStatus.type !== 'ok' && (
                          <AlertTriangle className={`h-4 w-4 mr-2 ${
                            stockStatus.type === 'critical' ? 'text-red-500' : 'text-yellow-500'
                          }`} />
                        )}
                        <p className={`font-medium ${
                          stockStatus.type === 'critical' ? 'text-red-600' :
                          stockStatus.type === 'warning' ? 'text-yellow-600' :
                          'text-gray-900'
                        }`}>
                          {material.current_stock} {material.unit_measure}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{stockStatus.message}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Stock Mínimo</p>
                      <p className="font-medium">{material.min_stock} {material.unit_measure}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Punto de Reorden</p>
                    <p className="font-medium">{material.reorder_point} {material.unit_measure}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Lote Actual</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  {material.lot_number ? (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">Número de Lote</p>
                        <p className="font-medium">{material.lot_number}</p>
                      </div>
                      {material.expiration_date && (
                        <div>
                          <p className="text-sm text-gray-500">Fecha de Vencimiento</p>
                          <p className="font-medium">
                            {new Date(material.expiration_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No hay información de lote disponible</p>
                  )}
                </div>
              </div>

              {material.msds_url && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Documentación</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <a
                      href={material.msds_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-500"
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Ver Ficha de Seguridad (MSDS)
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}