import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface InvoiceFiltersProps {
  onFilter: (filters: any) => void;
}

export default function InvoiceFilters({ onFilter }: InvoiceFiltersProps) {
  const [filters, setFilters] = useState({
    customer_id: '',
    status: '',
    payment_status: '',
    start_date: '',
    end_date: '',
  });

  const [customers, setCustomers] = useState<Array<{ id: string; full_name: string }>>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name')
      .order('full_name');

    if (error) {
      console.error('Error loading customers:', error);
      return;
    }

    setCustomers(data || []);
  };

  const handleFilter = () => {
    onFilter(filters);
  };

  const handleReset = () => {
    setFilters({
      customer_id: '',
      status: '',
      payment_status: '',
      start_date: '',
      end_date: '',
    });
    onFilter({});
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
            Cliente
          </label>
          <select
            id="customer"
            value={filters.customer_id}
            onChange={(e) => setFilters({ ...filters, customer_id: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Todos los clientes</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Estado
          </label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="issued">Emitida</option>
            <option value="voided">Anulada</option>
          </select>
        </div>

        <div>
          <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700">
            Estado de Pago
          </label>
          <select
            id="payment_status"
            value={filters.payment_status}
            onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="partial">Parcial</option>
            <option value="paid">Pagada</option>
          </select>
        </div>

        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
            Fecha Desde
          </label>
          <input
            type="date"
            id="start_date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
            Fecha Hasta
          </label>
          <input
            type="date"
            id="end_date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end space-x-3">
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Limpiar
        </button>
        <button
          onClick={handleFilter}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
}