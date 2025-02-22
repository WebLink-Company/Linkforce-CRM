import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CreateNCFSequenceModal from './CreateNCFSequenceModal';

interface NCFSequence {
  id: string;
  sequence_type: string;
  prefix: string;
  current_number: number;
  end_number: number;
  valid_until: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function NCFSequenceList() {
  const [sequences, setSequences] = useState<NCFSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    try {
      const { data, error } = await supabase
        .from('fiscal_sequences')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSequences(data || []);
    } catch (error) {
      console.error('Error loading sequences:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-2xl font-semibold">Secuencias NCF</h1>
            <p className="mt-2 text-sm text-gray-400">
              Gestión de secuencias de Números de Comprobantes Fiscales (NCF)
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-3">
            <button
              onClick={loadSequences}
              className="btn btn-secondary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Secuencia
            </button>
          </div>
        </div>

        <div className="mt-8">
          <div className="table-container">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="table-header">
                <tr>
                  <th scope="col" className="table-header th">Tipo</th>
                  <th scope="col" className="table-header th">Prefijo</th>
                  <th scope="col" className="table-header th text-right">Número Actual</th>
                  <th scope="col" className="table-header th text-right">Número Final</th>
                  <th scope="col" className="table-header th">Válido Hasta</th>
                  <th scope="col" className="table-header th text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sequences.map((sequence) => (
                  <tr key={sequence.id} className="table-row">
                    <td className="table-cell font-medium">
                      {sequence.sequence_type === 'B01' && 'Crédito Fiscal'}
                      {sequence.sequence_type === 'B02' && 'Consumo'}
                      {sequence.sequence_type === 'B14' && 'Gubernamental'}
                      {sequence.sequence_type === 'B15' && 'Exportación'}
                    </td>
                    <td className="table-cell">{sequence.prefix}</td>
                    <td className="table-cell text-right">
                      {sequence.current_number.toString().padStart(8, '0')}
                    </td>
                    <td className="table-cell text-right">
                      {sequence.end_number.toString().padStart(8, '0')}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(sequence.valid_until).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge ${
                        sequence.is_active ? 'status-badge-success' : 'status-badge-error'
                      }`}>
                        {sequence.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CreateNCFSequenceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadSequences}
        />
      </div>
    </div>
  );
}