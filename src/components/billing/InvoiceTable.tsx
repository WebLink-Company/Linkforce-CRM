import React from 'react';
import { Eye, Mail, FileDown, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Invoice } from '../../types/billing';

interface InvoiceTableProps {
  invoices: Invoice[];
  onView: (invoice: Invoice) => void;
  onEmail: (invoice: Invoice) => void;
  onExportPDF: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
  sortConfig: {
    key: string;
    direction: 'asc' | 'desc';
  };
  onSort: (key: string) => void;
}

export default function InvoiceTable({
  invoices,
  onView,
  onEmail,
  onExportPDF,
  onEdit,
  onDelete,
  sortConfig,
  onSort
}: InvoiceTableProps) {
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="table-container">
      <table className="min-w-full divide-y divide-white/5">
        <thead className="table-header">
          <tr>
            <th scope="col" className="table-header th cursor-pointer" onClick={() => onSort('ncf')}>
              <div className="flex items-center space-x-1">
                <span>NCF</span>
                {getSortIcon('ncf')}
              </div>
            </th>
            <th scope="col" className="table-header th cursor-pointer" onClick={() => onSort('customer')}>
              <div className="flex items-center space-x-1">
                <span>CLIENTE</span>
                {getSortIcon('customer')}
              </div>
            </th>
            <th scope="col" className="table-header th cursor-pointer" onClick={() => onSort('issue_date')}>
              <div className="flex items-center space-x-1">
                <span>FECHA</span>
                {getSortIcon('issue_date')}
              </div>
            </th>
            <th scope="col" className="table-header th cursor-pointer" onClick={() => onSort('last_payment_date')}>
              <div className="flex items-center space-x-1">
                <span>ÚLTIMO PAGO</span>
                {getSortIcon('last_payment_date')}
              </div>
            </th>
            <th scope="col" className="table-header th text-right cursor-pointer" onClick={() => onSort('total_amount')}>
              <div className="flex items-center justify-end space-x-1">
                <span>TOTAL</span>
                {getSortIcon('total_amount')}
              </div>
            </th>
            <th scope="col" className="table-header th cursor-pointer" onClick={() => onSort('status')}>
              <div className="flex items-center justify-center space-x-1">
                <span>ESTADO</span>
                {getSortIcon('status')}
              </div>
            </th>
            <th scope="col" className="table-header th cursor-pointer" onClick={() => onSort('payment_status')}>
              <div className="flex items-center justify-center space-x-1">
                <span>ESTADO DE PAGO</span>
                {getSortIcon('payment_status')}
              </div>
            </th>
            <th scope="col" className="relative table-header th">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {invoices.map((invoice, index) => {
            const lastPayment = invoice.payments?.sort((a, b) => 
              new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
            )[0];

            return (
              <tr 
                key={invoice.id} 
                className={`table-row opacity-0`}
                style={{
                  animation: `slideIn 0.5s ease-out ${index * 0.05}s forwards`
                }}
              >
                <td className="table-cell font-medium">{invoice.ncf}</td>
                <td className="table-cell">{invoice.customer?.full_name}</td>
                <td className="table-cell">
                  {new Date(invoice.issue_date).toLocaleDateString()}
                </td>
                <td className="table-cell">
                  {lastPayment ? new Date(lastPayment.payment_date).toLocaleDateString() : '-'}
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
                     invoice.status === 'voided' ? 'Anulada' :
                     'Borrador'}
                  </span>
                </td>
                <td className="table-cell text-center">
                  <span className={`status-badge ${
                    invoice.payment_status === 'paid' ? 'status-badge-success' :
                    invoice.payment_status === 'partial' ? 'status-badge-warning' :
                    'status-badge-error'
                  }`}>
                    {invoice.payment_status === 'paid' ? 'Pagada' :
                     invoice.payment_status === 'partial' ? 'Parcial' :
                     'Pendiente'}
                  </span>
                </td>
                <td className="table-cell-action">
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => onView(invoice)}
                      className="action-icon-button"
                      title="Ver detalles"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onEmail(invoice)}
                      className="action-icon-button"
                      title="Enviar por email"
                    >
                      <Mail className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onExportPDF(invoice)}
                      className="action-icon-button"
                      title="Exportar a PDF"
                    >
                      <FileDown className="h-5 w-5" />
                    </button>
                    {invoice.status === 'draft' && (
                      <>
                        <button
                          onClick={() => onEdit(invoice)}
                          className="action-icon-button"
                          title="Editar"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => onDelete(invoice.id)}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}