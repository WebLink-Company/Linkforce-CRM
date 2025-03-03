import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Filter, RefreshCw, Download, Eye, Trash2, Edit } from 'lucide-react';
import { customersAPI } from '../../lib/api/customers';
import type { Customer } from '../../types/customer';
import CreateCorporateCustomerModal from './CreateCorporateCustomerModal';
import CustomerViewerModal from './CustomerViewerModal';
import CustomerFilters from './CustomerFilters';
import { exportToCSV } from '../../utils/export';
import CustomerTypeDialog from './CustomerTypeDialog';
import CreateCustomerModal from './CreateCustomerModal';
import ConfirmationModal from './ConfirmationModal';
import CustomerStats from './CustomerStats';

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIndividualModal, setShowIndividualModal] = useState(false);
  const [showCorporateModal, setShowCorporateModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomerTypeDialog, setShowCustomerTypeDialog] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await customersAPI.getCustomers();
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (customers.length > 0) {
      exportToCSV(customers, 'customers');
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    if (customer.type === 'corporate') {
      setShowCorporateModal(true);
      setShowIndividualModal(false);
    } else {
      setShowIndividualModal(true);
      setShowCorporateModal(false);
    }
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setShowCustomerTypeDialog(true);
  };

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewerModal(true);
  };

  const handleDelete = async (id: string) => {
    setSelectedCustomer(customers.find(c => c.id === id) || null);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!selectedCustomer) return;
    
    setDeleteLoading(true);
    try {
      const { error } = await customersAPI.deleteCustomer(selectedCustomer.id);
      if (error) throw error;
      await loadCustomers();
      setShowConfirmDelete(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCustomerTypeSelect = (type: string) => {
    setShowCustomerTypeDialog(false);
    if (type === 'individual') {
      setShowIndividualModal(true);
      setShowCorporateModal(false);
    } else {
      setShowCorporateModal(true);
      setShowIndividualModal(false);
    }
  };

  const handleModalClose = () => {
    setShowIndividualModal(false);
    setShowCorporateModal(false);
    setSelectedCustomer(null);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name.toLowerCase().includes(search.toLowerCase()) ||
    customer.identification_number.includes(search)
  );

  const paginatedCustomers = filteredCustomers.slice(
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
            <h1 className="text-2xl font-semibold">Clientes</h1>
            <p className="mt-2 text-sm text-gray-400">
              Gestione la información de clientes y su historial
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
              onClick={handleCreate}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </button>
          </div>
        </div>

        {/* Customer Statistics Dashboard */}
        <CustomerStats />

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
                  placeholder="Buscar clientes..."
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
                onClick={loadCustomers}
                className="btn btn-secondary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </button>
            </div>
          </div>

          {showFilters && <CustomerFilters onFilter={loadCustomers} />}

          <div className="table-container">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="table-header">
                <tr>
                  <th scope="col" className="table-header th">RNC/Cédula</th>
                  <th scope="col" className="table-header th">Nombre</th>
                  <th scope="col" className="table-header th">Email</th>
                  <th scope="col" className="table-header th">Teléfono</th>
                  <th scope="col" className="table-header th">Tipo</th>
                  <th scope="col" className="relative table-header th">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="table-row">
                    <td className="table-cell font-medium">{customer.identification_number}</td>
                    <td className="table-cell">{customer.full_name}</td>
                    <td className="table-cell">{customer.email}</td>
                    <td className="table-cell">{customer.phone}</td>
                    <td className="table-cell">
                      <span className={`status-badge ${
                        customer.type === 'corporate' 
                          ? 'status-badge-info'
                          : 'status-badge-success'
                      }`}>
                        {customer.type === 'corporate' ? 'Empresarial' : 'Individual'}
                      </span>
                    </td>
                    <td className="table-cell-action">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleView(customer)}
                          className="action-icon-button"
                          title="Ver detalles"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="action-icon-button"
                          title="Editar"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="action-icon-button text-red-400 hover:text-red-300"
                          title="Eliminar"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CustomerTypeDialog
          isOpen={showCustomerTypeDialog}
          onClose={() => setShowCustomerTypeDialog(false)}
          onSelectType={handleCustomerTypeSelect}
        />

        <CreateCustomerModal
          isOpen={showIndividualModal}
          onClose={handleModalClose}
          onSuccess={loadCustomers}
          editingCustomer={selectedCustomer}
        />

        <CreateCorporateCustomerModal
          isOpen={showCorporateModal}
          onClose={handleModalClose}
          onSuccess={loadCustomers}
          editingCustomer={selectedCustomer}
        />

        <CustomerViewerModal
          isOpen={showViewerModal}
          onClose={() => {
            setShowViewerModal(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
        />

        <ConfirmationModal
          isOpen={showConfirmDelete}
          onClose={() => {
            setShowConfirmDelete(false);
            setSelectedCustomer(null);
          }}
          onConfirm={confirmDelete}
          title="Confirmar Eliminación"
          message={`¿Está seguro que desea eliminar el cliente ${selectedCustomer?.full_name}? Esta acción no se puede deshacer.`}
          loading={deleteLoading}
        />
      </div>
    </div>
  );
}