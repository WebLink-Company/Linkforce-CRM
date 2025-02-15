import React from 'react';
import { Building2, User } from 'lucide-react';

interface CustomerTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'individual' | 'corporate') => void;
}

export default function CustomerTypeDialog({ isOpen, onClose, onSelectType }: CustomerTypeDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Tipo de Cliente</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onSelectType('individual')}
              className="flex flex-col items-center justify-center p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <User className="h-12 w-12 text-blue-600 mb-3" />
              <span className="text-sm font-medium text-gray-900">Cliente Individual</span>
              <span className="text-xs text-gray-500 text-center mt-1">
                Para personas físicas
              </span>
            </button>

            <button
              onClick={() => onSelectType('corporate')}
              className="flex flex-col items-center justify-center p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Building2 className="h-12 w-12 text-blue-600 mb-3" />
              <span className="text-sm font-medium text-gray-900">Cliente Empresarial</span>
              <span className="text-xs text-gray-500 text-center mt-1">
                Para empresas y negocios
              </span>
            </button>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}