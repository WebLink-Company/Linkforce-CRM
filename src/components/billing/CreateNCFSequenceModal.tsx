import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateNCFSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateNCFSequenceModal({ isOpen, onClose, onSuccess }: CreateNCFSequenceModalProps) {
  const [formData, setFormData] = useState({
    sequence_type: '',
    prefix: '',
    current_number: 1,
    end_number: 99999999,
    valid_until: '',
    is_active: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: createError } = await supabase
        .from('fiscal_sequences')
        .insert([formData]);

      if (createError) throw createError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating sequence:', error);
      setError(error instanceof Error ? error.message : 'Error creating sequence');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-md border border-white/10 shadow-2xl">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Nueva Secuencia NCF</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 p-4 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="sequence_type" className="block text-sm font-medium text-gray-300">
                Tipo de Comprobante *
              </label>
              <select
                id="sequence_type"
                required
                value={formData.sequence_type}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    sequence_type: e.target.value,
                    prefix: e.target.value // Set prefix same as type
                  });
                }}
                className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              >
                <option value="">Seleccione un tipo</option>
                <option value="B01">Crédito Fiscal (B01)</option>
                <option value="B02">Consumo (B02)</option>
                <option value="B14">Gubernamental (B14)</option>
                <option value="B15">Exportación (B15)</option>
              </select>
            </div>

            <div>
              <label htmlFor="current_number" className="block text-sm font-medium text-gray-300">
                Número Inicial *
              </label>
              <input
                type="number"
                id="current_number"
                required
                min="1"
                value={formData.current_number}
                onChange={(e) => setFormData({ ...formData, current_number: Number(e.target.value) })}
                className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="end_number" className="block text-sm font-medium text-gray-300">
                Número Final *
              </label>
              <input
                type="number"
                id="end_number"
                required
                min={formData.current_number}
                value={formData.end_number}
                onChange={(e) => setFormData({ ...formData, end_number: Number(e.target.value) })}
                className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="valid_until" className="block text-sm font-medium text-gray-300">
                Válido Hasta *
              </label>
              <input
                type="date"
                id="valid_until"
                required
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="mt-1 block w-full rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-600/50 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-300">
                Secuencia Activa
              </label>
            </div>
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
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear Secuencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}