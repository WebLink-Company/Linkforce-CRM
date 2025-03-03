import React, { useState, useEffect } from 'react';
import { FileText, Search, Plus, Filter, RefreshCw, Download, Eye, Trash2, Edit, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Quote } from '../../types/billing';
import CreateQuoteModal from './CreateQuoteModal';
import QuoteViewerModal from './QuoteViewerModal';
import { exportToCSV } from '../../utils/export';
import { Link } from 'react-router-dom';

export default function QuoteList() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          customer:customers(*),
          items:quote_items(
            *,
            product:inventory_items(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (quotes.length > 0) {
      exportToCSV(quotes, 'quotes');
    }
  };

  const handleView = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowViewerModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar esta cotización?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadQuotes();
    } catch (error) {
      console.error('Error deleting quote:', error);
    }
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.number.toLowerCase().includes(search.toLowerCase()) ||
    quote.customer?.full_name.toLowerCase().includes(search.toLowerCase())
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
            <h2 className="text-xl font-semibold">Cotizaciones</h2>
            <p className="mt-2 text-sm text-gray-400">
              Gestión de cotizaciones para clientes
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-3">
            <Link
              to="/facturacion"
              className="btn btn-secondary"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Facturación
            </Link>
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
              Nueva Cotización
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
                  placeholder="Buscar cotizaciones..."
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
                onClick={loadQuotes}
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
                  <th scope="col" className="table-header th">Número</th>
                  <th scope="col" className="table-header th">Cliente</th>
                  <th scope="col" className="table-header th">Fecha</th>
                  <th scope="col" className="table-header th text-right">Total</th>
                  <th scope="col" className="table-header th text-center">Estado</th>
                  <th scope="col" className="relative table-header th">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="table-row">
                    <td className="table-cell font-medium">{quote.number}</td>
                    <td className="table-cell">{quote.customer?.full_name}</td>
                    <td className="table-cell">
                      {new Date(quote.issue_date).toLocaleDateString()}
                    </td>
                    <td className="table-cell text-right">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(quote.total_amount)}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge ${
                        quote.status === 'approved' ? 'status-badge-success' :
                        quote.status === 'rejected' ? 'status-badge-error' :
                        quote.status === 'converted' ? 'status-badge-info' :
                        'status-badge-warning'
                      }`}>
                        {quote.status === 'approved' ? 'Aprobada' :
                         quote.status === 'rejected' ? 'Rechazada' :
                         quote.status === 'converted' ? 'Convertida' :
                         'Pendiente'}
                      </span>
                    </td>
                    <td className="table-cell-action">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleView(quote)}
                          className="action-icon-button"
                          title="Ver detalles"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {quote.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleView(quote)}
                              className="action-icon-button"
                              title="Editar"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(quote.id)}
                              className="text-red-400 hover:text-red-300 action-icon-button"
                              title="Eliminar"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CreateQuoteModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadQuotes}
        />

        <QuoteViewerModal
          isOpen={showViewerModal}
          onClose={() => {
            setShowViewerModal(false);
            setSelectedQuote(null);
          }}
          quote={selectedQuote}
        />
      </div>
    </div>
  );
}