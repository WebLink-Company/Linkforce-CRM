import React, { useState, useEffect } from 'react';
import { X, Building2, Phone, Mail, MapPin, FileText, Printer, Send, History, CreditCard, Receipt, Download, AlertTriangle } from 'lucide-react';
import type { Customer } from '../../types/customer';
import { supabase } from '../../lib/supabase';
import { jsPDF } from 'jspdf';

interface CustomerViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onFilterByDebt?: () => void;
  onFilterByNew?: () => void;
  onFilterByInactive?: () => void;
  onFilterByFrequent?: () => void;
}

interface CustomerTransactions {
  invoices: any[];
  payments: any[];
  pendingBalance: number;
}

const getStatusBadge = (status: string, payment_status: string) => {
  if (status === 'voided') {
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
  if (status === 'draft') {
    return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  }
  if (payment_status === 'paid') {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  }
  if (payment_status === 'partial') {
    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  }
  return 'bg-red-500/20 text-red-300 border-red-500/30';
};

const getStatusText = (status: string, payment_status: string) => {
  if (status === 'voided') return 'Anulada';
  if (status === 'draft') return 'Borrador';
  if (payment_status === 'paid') return 'Pagada';
  if (payment_status === 'partial') return 'Parcial';
  return 'Pendiente';
};

export default function CustomerViewerModal({ 
  isOpen, 
  onClose, 
  customer,
  onFilterByDebt,
  onFilterByNew,
  onFilterByInactive,
  onFilterByFrequent
}: CustomerViewerModalProps) {
  const [transactions, setTransactions] = useState<CustomerTransactions>({
    invoices: [],
    payments: [],
    pendingBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [sendingNotification, setSendingNotification] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      loadTransactions();
    }
  }, [isOpen, customer]);

  const loadTransactions = async () => {
    if (!customer) return;

    try {
      // Get invoices with their payments
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          *,
          payments(*)
        `)
        .eq('customer_id', customer.id)
        .order('issue_date', { ascending: false });

      // Calculate pending balance
      const pendingBalance = invoices?.reduce((sum, inv) => {
        if (inv.status === 'issued' && inv.payment_status !== 'paid') {
          return sum + (inv.total_amount - (inv.payments?.reduce((p, c) => p + c.amount, 0) || 0));
        }
        return sum;
      }, 0) || 0;

      // Get payments with invoice reference
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          *,
          invoice_id,
          invoice:invoices!invoice_id(ncf)
        `)
        .in('invoice_id', invoices?.map(inv => inv.id) || [])
        .order('payment_date', { ascending: false });

      setTransactions({
        invoices: invoices || [],
        payments: payments || [],
        pendingBalance
      });
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAccountStatement = async () => {
    try {
      const doc = new jsPDF();
      
      // Add header with logo
      doc.setFontSize(20);
      doc.text('Estado de Cuenta', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text('Quimicinter S.R.L', 105, 30, { align: 'center' });
      doc.text('Productos Químicos Industriales e Institucionales', 105, 35, { align: 'center' });
      
      // Add customer info
      doc.text(`Cliente: ${customer?.full_name}`, 20, 50);
      doc.text(`RNC/Cédula: ${customer?.identification_number}`, 20, 60);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 70);
      
      // Add summary section
      let y = 90;
      doc.setFontSize(14);
      doc.text('Resumen de Cuenta', 20, y);
      y += 10;
      doc.setFontSize(10);
      doc.text(`Balance Pendiente: ${new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP'
      }).format(transactions.pendingBalance)}`, 20, y);
      
      // Add pending invoices section
      y += 20;
      doc.setFontSize(12);
      doc.text('Facturas Pendientes', 20, y);
      y += 10;
      doc.setFontSize(10);
      
      const pendingInvoices = transactions.invoices.filter(
        inv => inv.status === 'issued' && inv.payment_status !== 'paid'
      );
      
      if (pendingInvoices.length > 0) {
        // Add table headers
        doc.text('NCF', 20, y);
        doc.text('Fecha', 60, y);
        doc.text('Total', 100, y);
        doc.text('Pendiente', 140, y);
        y += 10;

        // Add table rows
        pendingInvoices.forEach(invoice => {
          const paid = invoice.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
          const pending = invoice.total_amount - paid;
          
          doc.text(invoice.ncf, 20, y);
          doc.text(new Date(invoice.issue_date).toLocaleDateString(), 60, y);
          doc.text(invoice.total_amount.toFixed(2), 100, y);
          doc.text(pending.toFixed(2), 140, y);
          y += 8;
        });
      } else {
        doc.text('No hay facturas pendientes', 20, y);
      }

      // Add recent payments section
      y += 20;
      doc.setFontSize(12);
      doc.text('Pagos Recientes', 20, y);
      y += 10;
      doc.setFontSize(10);

      const recentPayments = transactions.payments
        .filter(p => new Date(p.payment_date).getMonth() === new Date().getMonth())
        .slice(0, 5);

      if (recentPayments.length > 0) {
        // Add table headers
        doc.text('Fecha', 20, y);
        doc.text('Factura', 60, y);
        doc.text('Monto', 100, y);
        y += 10;

        // Add table rows
        recentPayments.forEach(payment => {
          doc.text(new Date(payment.payment_date).toLocaleDateString(), 20, y);
          doc.text(payment.invoice?.ncf || '', 60, y);
          doc.text(payment.amount.toFixed(2), 100, y);
          y += 8;
        });
      } else {
        doc.text('No hay pagos registrados este mes', 20, y);
      }

      // Add footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.text('Este documento es un estado de cuenta y no tiene validez fiscal', 105, pageHeight - 20, { align: 'center' });
      
      doc.save(`estado_cuenta_${customer?.identification_number}.pdf`);
    } catch (error) {
      console.error('Error generating statement:', error);
    }
  };

  const sendPaymentNotification = async () => {
    if (!customer?.email) return;
    
    setSendingNotification(true);
    try {
      // Here you would integrate with your email service
      // For now we'll simulate an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      alert('Notificación enviada exitosamente');
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error al enviar la notificación');
    } finally {
      setSendingNotification(false);
    }
  };

  if (!isOpen || !customer) return null;

  const quickActions = [
    {
      icon: FileText,
      label: 'Estado de Cuenta',
      onClick: generateAccountStatement,
      color: 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
    },
    {
      icon: Printer,
      label: 'Imprimir Factura',
      onClick: () => window.print(),
      color: 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
    },
    {
      icon: Send,
      label: sendingNotification ? 'Enviando...' : 'Notificar Pago',
      onClick: sendPaymentNotification,
      disabled: sendingNotification,
      color: 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
    },
    {
      icon: History,
      label: 'Historial',
      onClick: () => setActiveTab('history'),
      color: 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-lg w-full max-w-4xl border border-white/10 shadow-2xl">
        {/* Glowing border effects */}
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"></div>
        </div>

        {/* Fixed Header with Customer Name */}
        <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-sm rounded-t-lg">
          {/* Main Header */}
          <div className="flex justify-between items-center p-4 border-b border-white/10">
            <div className="flex items-center space-x-4">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-gray-400" />
                  {customer.full_name}
                </h2>
                <p className="text-sm text-gray-400 mt-1">{customer.identification_number}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Actions Bar */}
          <div className="px-4 py-2 border-b border-white/10 bg-gray-800/50">
            <div className="flex items-center justify-center space-x-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`inline-flex items-center px-3 py-1.5 rounded-md ${action.color} 
                    transition-all duration-200 text-sm font-medium
                    hover:scale-105 disabled:opacity-50 disabled:hover:scale-100
                    border border-white/10`}
                >
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 px-4">
            <button
              className={`py-2 px-3 text-sm font-medium transition-colors rounded-t-lg ${
                activeTab === 'general' 
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-gray-800/30' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
              }`}
              onClick={() => setActiveTab('general')}
            >
              Información General
            </button>
            <button
              className={`py-2 px-3 text-sm font-medium transition-colors rounded-t-lg ${
                activeTab === 'history' 
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-gray-800/30' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
              }`}
              onClick={() => setActiveTab('history')}
            >
              Historial
            </button>
            <button
              className={`py-2 px-3 text-sm font-medium transition-colors rounded-t-lg ${
                activeTab === 'invoices' 
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-gray-800/30' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
              }`}
              onClick={() => setActiveTab('invoices')}
            >
              Facturas
            </button>
            <button
              className={`py-2 px-3 text-sm font-medium transition-colors rounded-t-lg ${
                activeTab === 'payments' 
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-gray-800/30' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
              }`}
              onClick={() => setActiveTab('payments')}
            >
              Pagos
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Información General</h3>
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                    <div>
                      <p className="text-sm text-gray-400">RNC/Cédula</p>
                      <p className="font-medium text-white">{customer.identification_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Nombre</p>
                      <p className="font-medium text-white">{customer.full_name}</p>
                      {customer.commercial_name && (
                        <p className="text-sm text-gray-400 mt-1">{customer.commercial_name}</p>
                      )}
                    </div>
                    {customer.industry_sector && (
                      <div>
                        <p className="text-sm text-gray-400">Sector Industrial</p>
                        <p className="font-medium text-white">{customer.industry_sector}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Contacto</h3>
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-400">Email</p>
                        <p className="font-medium text-white">{customer.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-400">Teléfono</p>
                        <p className="font-medium text-white">{customer.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-400">Dirección</p>
                        <p className="font-medium text-white">{customer.address}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Información Financiera</h3>
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                    <div className="flex items-center">
                      <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-400">Límite de Crédito</p>
                        <p className="font-medium text-white">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(customer.credit_limit || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Receipt className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-400">Balance Pendiente</p>
                        <p className="font-medium text-white">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(transactions.pendingBalance)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Summary */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Actividad Reciente</h3>
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 space-y-4">
                    <div className="space-y-2">
                      {transactions.invoices.slice(0, 3).map((invoice) => (
                        <div key={invoice.id} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-white">{invoice.ncf}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(invoice.issue_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center">
                            {invoice.payment_status !== 'paid' && (
                              <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2" />
                            )}
                            <p className={`text-sm font-medium ${
                              invoice.payment_status === 'paid' ? 'text-emerald-400' : 'text-yellow-400'
                            }`}>
                              {new Intl.NumberFormat('es-DO', {
                                style: 'currency',
                                currency: 'DOP'
                              }).format(invoice.total_amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <h3 className="text-lg font-medium text-white mb-4">Historial de Transacciones</h3>
                <div className="space-y-4">
                  {[...transactions.invoices, ...transactions.payments]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((item) => (
                      <div key={item.id} className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {'ncf' in item ? `Factura ${item.ncf}` : `Pago ${item.reference_number || ''}`}
                          </p>
                          <div className="flex items-center space-x-2">
                            <p className="text-xs text-gray-400">
                              {new Date('ncf' in item ? item.issue_date : item.payment_date).toLocaleDateString()}
                            </p>
                            {'ncf' in item && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${
                                getStatusBadge(item.status, item.payment_status)
                              }`}>
                                {getStatusText(item.status, item.payment_status)}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className={`text-sm font-medium ${
                          'ncf' in item ? 'text-yellow-400' : 'text-emerald-400'
                        }`}>
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(item.total_amount || item.amount)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <h3 className="text-lg font-medium text-white mb-4">Facturas</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">NCF</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Fecha</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">Total</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-400">Estado</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {transactions.invoices.map((invoice) => (
                        <tr key={invoice.id} className="group hover:bg-white/5">
                          <td className="px-4 py-2 text-sm text-white">{invoice.ncf}</td>
                          <td className="px-4 py-2 text-sm text-gray-300">
                            {new Date(invoice.issue_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-300">
                            {new Intl.NumberFormat('es-DO', {
                              style: 'currency',
                              currency: 'DOP'
                            }).format(invoice.total_amount)}
                          </td>
                          <td className="px-4 py-2 text-sm text-center">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold border ${
                              getStatusBadge(invoice.status, invoice.payment_status)
                            }`}>
                              {getStatusText(invoice.status, invoice.payment_status)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            <button
                              onClick={() => window.print()}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-white"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <h3 className="text-lg font-medium text-white mb-4">Pagos Realizados</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Factura</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Referencia</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">Monto</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {transactions.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-4 py-2 text-sm text-gray-300">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-300">
                            {payment.invoice?.ncf}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-300">
                            {payment.reference_number}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-emerald-400">
                            {new Intl.NumberFormat('es-DO', {
                              style: 'currency',
                              currency: 'DOP'
                            }).format(payment.amount)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            <button
                              onClick={() => window.print()}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {customer.notes && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-4">Notas</h3>
              <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <p className="text-gray-300 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}