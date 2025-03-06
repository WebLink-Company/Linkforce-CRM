import React from 'react';
import { Building2, User } from 'lucide-react';

interface SupplierTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'regular' | 'corporate') => void;
}

export default function SupplierTypeDialog({ isOpen, onClose, onSelectType }: SupplierTypeDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[70] animate-fade-in">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-md border border-white/10 shadow-2xl transform transition-all duration-300 animate-slide-up">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Seleccionar Tipo de Proveedor</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onSelectType('regular')}
              className="flex flex-col items-center justify-center p-6 rounded-lg border border-white/10 bg-gray-800/50 hover:bg-gray-700/50 transition-colors group"
            >
              <User className="h-12 w-12 text-blue-400 mb-3 group-hover:text-blue-300" />
              <span className="text-sm font-medium text-white">Proveedor Regular</span>
              <span className="text-xs text-gray-400 text-center mt-1">
                Para proveedores pequeños o informales
              </span>
            </button>

            <button
              onClick={() => onSelectType('corporate')}
              className="flex flex-col items-center justify-center p-6 rounded-lg border border-white/10 bg-gray-800/50 hover:bg-gray-700/50 transition-colors group"
            >
              <Building2 className="h-12 w-12 text-blue-400 mb-3 group-hover:text-blue-300" />
              <span className="text-sm font-medium text-white">Proveedor Empresarial</span>
              <span className="text-xs text-gray-400 text-center mt-1">
                Para empresas formales
              </span>
            </button>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}