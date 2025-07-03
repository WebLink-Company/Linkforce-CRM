import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Search, Plus, Filter, RefreshCw, Download, Eye, Trash2, Edit, 
  FileSpreadsheet, DollarSign, Package, Users, Calendar, ArrowUp, ArrowDown, 
  XCircle, History, FileDown, Mail, Printer, Clock, AlertTriangle, TrendingUp,
  CreditCard, CheckCircle, FileBarChart
} from 'lucide-react';
import { billingAPI } from '../../lib/api/billing';
import type { Invoice } from '../../types/billing';
import CreateInvoiceModal from './CreateInvoiceModal';
import InvoiceViewerModal from './InvoiceViewerModal';
import EditInvoiceModal from './EditInvoiceModal';
import SendEmailModal from './SendEmailModal';
import { exportToCSV } from '../../utils/export';
import { Link } from 'react-router-dom';
import { jsPDF } from "jspdf";
import StatsSummary from './StatsSummary';
import FilterBadges from './FilterBadges';
import InvoiceTable from './InvoiceTable';

// Status order for sorting
const STATUS_ORDER = {
  'draft': 0,
  'issued': 1,
  'voided': 2
};

// Payment status order for sorting
const PAYMENT_STATUS_ORDER = {
  'pending': 0,
  'partial': 1,
  'paid': 2
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [stats, setStats] = useState({
    draftInvoices: { count: 0, total: 0 },
    pendingInvoices: { count: 0, total: 0 },
    upcomingDueInvoices: { count: 0, total: 0 },
    paidInvoices: { 
      monthlyTotal: 0,
      historicalTotal: 0,
      count: 0,
      lastPaymentDate: undefined as string | undefined
    },
    issuedInvoices: {
      monthlyCount: 0,
      monthlyTotal: 0,
      historicalCount: 0,
      historicalTotal: 0
    },
    overdueInvoices: { 
      count: 0,
      total: 0 
    },
    canceledInvoices: { 
      monthlyCount: 0,
      monthlyTotal: 0 
    },
    topProducts: [] as { name: string; total: number }[]
  });
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'status', direction: 'asc' });

  // Ref for table container
  const tableRef = useRef<HTMLDivElement>(null);

  const itemsPerPage = 30;
  const currentMonth = new Date().toLocaleString('es-DO', { month: 'long' });

  useEffect(() => {
    loadInvoices();
    loadStats();
  }, [activeFilter, dateRange, sortConfig]);

  const loadStats = async () => {
    try {
      const { data: monthlyData } = await billingAPI.getInvoices();
      if (!monthlyData) return;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      // Calculate draft invoices
      const draftInvoices = monthlyData.filter(inv => inv.status === 'draft');
      const draftTotal = draftInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

      // Calculate pending invoices
      const pendingInvoices = monthlyData.filter(inv => 
        inv.status === 'issued' && inv.payment_status !== 'paid'
      );
      const pendingTotal = pendingInvoices.reduce((sum, inv) => sum + (
        inv.total_amount - (inv.payments?.reduce((p, c) => p + c.amount, 0) || 0)
      ), 0);

      // Calculate upcoming due invoices
      const upcomingDueInvoices = monthlyData.filter(inv => 
        inv.status === 'issued' &&
        inv.payment_status !== 'paid' &&
        new Date(inv.due_date) > now &&
        new Date(inv.due_date) <= nextWeek
      );
      const upcomingDueTotal = upcomingDueInvoices.reduce((sum, inv) => sum + (
        inv.total_amount - (inv.payments?.reduce((p, c) => p + c.amount, 0) || 0)
      ), 0);

      // Calculate paid invoices
      const paidInvoicesThisMonth = monthlyData.filter(inv => 
        inv.status === 'issued' && 
        inv.payment_status === 'paid' &&
        inv.payments?.some(p => new Date(p.payment_date) >= firstDayOfMonth)
      );
      const monthlyPaidTotal = paidInvoicesThisMonth.reduce((sum, inv) => sum + inv.total_amount, 0);

      const allPaidInvoices = monthlyData.filter(inv => 
        inv.status === 'issued' && 
        inv.payment_status === 'paid'
      );
      const historicalPaidTotal = allPaidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

      // Get last payment date
      const lastPaymentDate = monthlyData
        .flatMap(inv => inv.payments || [])
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]?.payment_date;

      // Calculate issued invoices (excluding drafts)
      const issuedThisMonth = monthlyData.filter(inv => 
        inv.status === 'issued' &&
        new Date(inv.issue_date) >= firstDayOfMonth
      );
      const monthlyIssuedTotal = issuedThisMonth.reduce((sum, inv) => sum + inv.total_amount, 0);

      const allIssuedInvoices = monthlyData.filter(inv => inv.status === 'issued');
      const historicalIssuedTotal = allIssuedInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

      // Calculate overdue invoices
      const overdueInvoices = monthlyData.filter(inv => 
        inv.status === 'issued' &&
        inv.payment_status !== 'paid' &&
        new Date(inv.due_date) < now
      );
      const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + (
        inv.total_amount - (inv.payments?.reduce((p, c) => p + c.amount, 0) || 0)
      ), 0);

      // Calculate canceled invoices
      const canceledThisMonth = monthlyData.filter(inv => 
        inv.status === 'voided' &&
        new Date(inv.voided_at || '') >= firstDayOfMonth
      );
      const canceledTotal = canceledThisMonth.reduce((sum, inv) => sum + inv.total_amount, 0);

      // Calculate top products
      const productSales = new Map<string, number>();
      monthlyData.forEach(invoice => {
        if (invoice.status === 'issued') {
          invoice.items?.forEach(item => {
            const product = item.product?.name || '';
            const currentTotal = productSales.get(product) || 0;
            productSales.set(product, currentTotal + item.total_amount);
          });
        }
      });

      const topProducts = Array.from(productSales.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, total]) => ({ name, total }));

      setStats({
        draftInvoices: { 
          count: draftInvoices.length, 
          total: draftTotal 
        },
        pendingInvoices: { 
          count: pendingInvoices.length, 
          total: pendingTotal 
        },
        upcomingDueInvoices: { 
          count: upcomingDueInvoices.length, 
          total: upcomingDueTotal 
        },
        paidInvoices: { 
          monthlyTotal: monthlyPaidTotal,
          historicalTotal: historicalPaidTotal,
          count: paidInvoicesThisMonth.length,
          lastPaymentDate
        },
        issuedInvoices: {
          monthlyCount: issuedThisMonth.length,
          monthlyTotal: monthlyIssuedTotal,
          historicalCount: allIssuedInvoices.length,
          historicalTotal: historicalIssuedTotal
        },
        overdueInvoices: {
          count: overdueInvoices.length,
          total: overdueTotal
        },
        canceledInvoices: { 
          monthlyCount: canceledThisMonth.length,
          monthlyTotal: canceledTotal 
        },
        topProducts
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data, error } = await billingAPI.getInvoices();
      if (error) throw error;
      
      let filteredData = data || [];
      
      // Apply date range filter if set
      if (dateRange.startDate && dateRange.endDate) {
        filteredData = filteredData.filter(inv => 
          inv.issue_date >= dateRange.startDate && 
          inv.issue_date <= dateRange.endDate
        );
      }
      
      // By default show only issued and draft invoices
      if (!activeFilter) {
        filteredData = filteredData.filter(inv => 
          inv.status === 'issued' || inv.status === 'draft'
        );
      } else {
        // Apply active filter
        switch (activeFilter) {
          case 'month':
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            filteredData = filteredData.filter(inv => 
              new Date(inv.issue_date) >= firstDayOfMonth &&
              inv.status === 'issued'
            );
            break;
          case 'draft':
            filteredData = filteredData.filter(inv => 
              inv.status === 'draft'
            );
            break;
          case 'paid':
            filteredData = filteredData.filter(inv => 
              inv.payment_status === 'paid' &&
              inv.status === 'issued'
            );
            break;
          case 'pending':
            filteredData = filteredData.filter(inv => 
              inv.payment_status !== 'paid' &&
              inv.status === 'issued'
            );
            break;
          case 'overdue':
            const today = new Date();
            filteredData = filteredData.filter(inv => 
              inv.status === 'issued' &&
              inv.payment_status !== 'paid' &&
              new Date(inv.due_date) < today
            );
            break;
          case 'voided':
            filteredData = filteredData.filter(inv => 
              inv.status === 'voided'
            );
            break;
          case 'history':
            // No additional filtering needed
            break;
        }
      }

      // Apply sorting
      if (sortConfig) {
        filteredData.sort((a, b) => {
          let aValue, bValue;
          
          switch (sortConfig.key) {
            case 'status':
              aValue = STATUS_ORDER[a.status as keyof typeof STATUS_ORDER];
              bValue = STATUS_ORDER[b.status as keyof typeof STATUS_ORDER];
              break;
            case 'payment_status':
              aValue = PAYMENT_STATUS_ORDER[a.payment_status as keyof typeof PAYMENT_STATUS_ORDER];
              bValue = PAYMENT_STATUS_ORDER[b.payment_status as keyof typeof PAYMENT_STATUS_ORDER];
              break;
            case 'customer':
              aValue = a.customer?.full_name || '';
              bValue = b.customer?.full_name || '';
              break;
            case 'ncf':
              aValue = a.ncf;
              bValue = b.ncf;
              break;
            case 'issue_date':
              aValue = new Date(a.issue_date).getTime();
              bValue = new Date(b.issue_date).getTime();
              break;
            case 'last_payment_date':
              const aPayments = a.payments || [];
              const bPayments = b.payments || [];
              aValue = aPayments.length ? new Date(aPayments[aPayments.length - 1].payment_date).getTime() : 0;
              bValue = bPayments.length ? new Date(bPayments[bPayments.length - 1].payment_date).getTime() : 0;
              break;
            case 'total_amount':
              aValue = a.total_amount;
              bValue = b.total_amount;
              break;
            default:
              aValue = a[sortConfig.key as keyof Invoice];
              bValue = b[sortConfig.key as keyof Invoice];
          }

          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      setInvoices(filteredData);

      // Scroll to table after filtering
      if (activeFilter && tableRef.current) {
        const yOffset = -100; // Offset to leave some space at the top
        const y = tableRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        
        window.scrollTo({
          top: y,
          behavior: 'smooth'
        });
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const handleExport = () => {
    if (invoices.length > 0) {
      exportToCSV(invoices, 'invoices');
    }
  };

  const handleExportPDF = async (invoice: Invoice) => {
    try {
      const doc = new jsPDF();
      
      // Add company header
      doc.setFontSize(20);
      doc.text('Quimicinter S.R.L', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text('Productos Químicos Industriales e Institucionales', 105, 30, { align: 'center' });
      
      // Add invoice details
      doc.setFontSize(14);
      doc.text(`Factura #${invoice.ncf}`, 20, 50);
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date(invoice.issue_date).toLocaleDateString()}`, 20, 60);
      doc.text(`Cliente: ${invoice.customer?.full_name}`, 20, 70);
      
      // Add items table
      let y = 90;
      doc.text('Descripción', 20, y);
      doc.text('Cantidad', 100, y);
      doc.text('Precio', 140, y);
      doc.text('Total', 180, y);
      
      y += 10;
      invoice.items?.forEach(item => {
        doc.text(item.product?.name || '', 20, y);
        doc.text(item.quantity.toString(), 100, y);
        doc.text(item.unit_price.toFixed(2), 140, y);
        doc.text(item.total_amount.toFixed(2), 180, y);
        y += 10;
      });
      
      // Add totals
      y += 10;
      doc.text(`Subtotal: ${invoice.subtotal.toFixed(2)}`, 140, y);
      y += 10;
      doc.text(`ITBIS: ${invoice.tax_amount.toFixed(2)}`, 140, y);
      y += 10;
      doc.text(`Total: ${invoice.total_amount.toFixed(2)}`, 140, y);
      
      // Save the PDF
      doc.save(`factura-${invoice.ncf}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewerModal(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowEditModal(true);
  };

  const handleEmail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowEmailModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar esta factura?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadInvoices();
      await loadStats();
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  const handleFilter = (filter: string) => {
    setActiveFilter(activeFilter === filter ? '' : filter);
    setCurrentPage(1);
    // Clear date range when changing filters
    if (filter !== 'history') {
      setDateRange({ startDate: '', endDate: '' });
    }
  };

  const getFilterDescription = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return `Facturas del ${new Date(dateRange.startDate).toLocaleDateString()} al ${new Date(dateRange.endDate).toLocaleDateString()}`;
    }

    switch (activeFilter) {
      case 'month':
        return `Facturas Emitidas de ${currentMonth}`;
      case 'draft':
        return 'Borradores de Facturas';
      case 'paid':
        return `Facturas Cobradas de ${currentMonth}`;
      case 'pending':
        return `Facturas por Cobrar de ${currentMonth}`;
      case 'overdue':
        return 'Facturas Vencidas';
      case 'voided':
        return `Facturas Anuladas`;
      case 'history':
        return 'Historial de Facturas';
      default:
        return 'Facturas Emitidas';
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.ncf.toLowerCase().includes(search.toLowerCase()) ||
    invoice.customer?.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
            <Link
              to="/facturacion/cotizaciones"
              className="btn btn-secondary"
            >
              <FileText className="h-4 w-4 mr-2" />
              Cotizaciones
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
              Nueva Factura
            </button>
          </div>
        </div>

        <StatsSummary stats={stats} onCardClick={handleFilter} activeFilter={activeFilter} />

        <FilterBadges
          activeFilter={activeFilter}
          onFilter={handleFilter}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />

        <div className="mt-8" ref={tableRef}>
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

          {/* Results count with filter description */}
          <div className="mb-4 text-sm text-gray-400">
            Mostrando {paginatedInvoices.length} de {filteredInvoices.length} {getFilterDescription()}
          </div>

          <InvoiceTable
            invoices={paginatedInvoices}
            onView={handleView}
            onEmail={handleEmail}
            onExportPDF={handleExportPDF}
            onEdit={handleEdit}
            onDelete={handleDelete}
            sortConfig={sortConfig}
            onSort={handleSort}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-white/10 bg-gray-800/50 px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-400">
                    Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredInvoices.length)}
                    </span>{' '}
                    de <span className="font-medium">{filteredInvoices.length}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-white/10 hover:bg-white/5 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      <span className="sr-only">Anterior</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-white/10 hover:bg-white/5 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      <span className="sr-only">Siguiente</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        <CreateInvoiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadInvoices();
            loadStats();
          }}
        />

        {selectedInvoice && (
          <>
            <InvoiceViewerModal
              isOpen={showViewerModal}
              onClose={() => {
                setShowViewerModal(false);
                setSelectedInvoice(null);
              }}
              invoice={selectedInvoice}
              onSuccess={() => {
                loadInvoices();
                loadStats();
              }}
            />

            <EditInvoiceModal
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false);
                setSelectedInvoice(null);
              }}
              onSuccess={() => {
                loadInvoices();
                loadStats();
              }}
              invoice={selectedInvoice}
            />

            <SendEmailModal
              isOpen={showEmailModal}
              onClose={() => {
                setShowEmailModal(false);
                setSelectedInvoice(null);
              }}
              invoice={selectedInvoice}
            />
          </>
        )}
      </div>
    </div>
  );
}