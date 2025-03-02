import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, loading }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[60] animate-fade-in">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-md border border-white/10 shadow-2xl transform transition-all duration-300 animate-slide-up">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-white">
                {title}
              </h3>
            </div>
          </div>
          
          <div className="mt-2">
            <p className="text-sm text-gray-300">
              {message}
            </p>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}