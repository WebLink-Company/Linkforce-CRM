import React, { useState, useEffect } from 'react';
import { FileText, Search, Plus, Filter, RefreshCw, Download, Eye, Printer, XCircle } from 'lucide-react';
import { billingAPI } from '../../lib/api/billing';
import type { Invoice } from '../../types/billing';
import CreateInvoiceModal from './CreateInvoiceModal';
import InvoiceFilters from './InvoiceFilters';
import InvoiceViewerModal from './InvoiceViewerModal';
import { exportToCSV } from '../../utils/export';

// Status order for sorting
const STATUS_ORDER = {
  'draft': 0,
  'issued': 1,
  'voided': 2
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const { data, error } = await billingAPI.getInvoices();
      if (error) throw error;
      
      // Sort invoices by status and date
      const sortedInvoices = (data || []).sort((a, b) => {
        // First sort by status
        const statusDiff = STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] - 
                         STATUS_ORDER[b.status as keyof typeof STATUS_ORDER];
        if (statusDiff !== 0) return statusDiff;
        
        // Then by date (most recent first)
        return new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime();
      });
      
      setInvoices(sortedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await billingAPI.getInvoices();
      if (data) {
        exportToCSV(data, 'invoices');
      }
    } catch (error) {
      console.error('Error exporting invoices:', error);
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewerModal(true);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewerModal(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleVoidInvoice = async (invoice: Invoice) => {
    if (window.confirm('¿Está seguro que desea anular esta factura?')) {
      try {
        const reason = prompt('Por favor, indique el motivo de la anulación:');
        if (reason) {
          const { error } = await billingAPI.voidInvoice(invoice.id, reason);
          if (error) throw error;
          loadInvoices();
        }
      } catch (error) {
        console.error('Error voiding invoice:', error);
      }
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.ncf.toLowerCase().includes(search.toLowerCase()) ||
    invoice.customer?.full_name.toLowerCase().includes(search.toLowerCase())
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
            <h1 className="text-2xl font-semibold">Facturación</h1>
            <p className="mt-2 text-sm text-gray-400">
              Gestione las facturas y pagos del sistema
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
              Nueva Factura
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
                  placeholder="Buscar facturas..."
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
                onClick={loadInvoices}
                className="btn btn-secondary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </button>
            </div>
          </div>

          {showFilters && <InvoiceFilters onFilter={loadInvoices} />}

          <div className="table-container">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="table-header">
                <tr>
                  <th scope="col" className="table-header th w-1/6">NCF</th>
                  <th scope="col" className="table-header th w-2/6">CLIENTE</th>
                  <th scope="col" className="table-header th w-1/6">FECHA</th>
                  <th scope="col" className="table-header th w-1/6 text-right">TOTAL</th>
                  <th scope="col" className="table-header th w-1/6 text-center">ESTADO</th>
                  <th scope="col" className="table-header th w-24">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="table-row">
                    <td className="table-cell font-medium">{invoice.ncf}</td>
                    <td className="table-cell">{invoice.customer?.full_name}</td>
                    <td className="table-cell">
                      {new Date(invoice.issue_date).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </td>
                    <td className="table-cell text-right">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(invoice.total_amount)}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge ${
                        invoice.status === 'issued' ? 'status-badge-success' :
                        invoice.status === 'voided' ? 'status-badge-error' :
                        'status-badge-warning'
                      }`}>
                        {invoice.status === 'issued' ? 'Emitida' :
                         invoice.status === 'voided' ? 'Anulada' : 'Borrador'}
                      </span>
                    </td>
                    <td className="table-cell-action">
                      <div className="flex justify-end space-x-3">
                        <button 
                          onClick={() => handleViewInvoice(invoice)}
                          className="action-icon-button"
                          title="Ver factura"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handlePrintInvoice(invoice)}
                          className="action-icon-button"
                          title="Imprimir factura"
                        >
                          <Printer className="h-5 w-5" />
                        </button>
                        {invoice.status === 'draft' && (
                          <button 
                            onClick={() => handleVoidInvoice(invoice)}
                            className="action-icon-button text-red-400 hover:text-red-300"
                            title="Anular factura"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CreateInvoiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadInvoices}
        />

        <InvoiceViewerModal
          isOpen={showViewerModal}
          onClose={() => {
            setShowViewerModal(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
        />
      </div>
    </div>
  );
}