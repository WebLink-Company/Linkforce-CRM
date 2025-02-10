import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { CustomerCategory } from '../../types/customer';

interface CustomerFiltersProps {
  onFilter: (filters: any) => void;
}

export default function CustomerFilters({ onFilter }: CustomerFiltersProps) {
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [filters, setFilters] = useState({
    category_id: '',
    status: '',
    date_from: '',
    date_to: '',
  });

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('customer_categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading categories:', error);
        return;
      }

      setCategories(data || []);
    };

    loadCategories();
  }, []);

  const handleFilter = () => {
    onFilter(filters);
  };

  const handleReset = () => {
    setFilters({
      category_id: '',
      status: '',
      date_from: '',
      date_to: '',
    });
    onFilter({});
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Categoría
          </label>
          <select
            id="category"
            value={filters.category_id}
            onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
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
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <div>
          <label htmlFor="date_from" className="block text-sm font-medium text-gray-700">
            Fecha Desde
          </label>
          <input
            type="date"
            id="date_from"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="date_to" className="block text-sm font-medium text-gray-700">
            Fecha Hasta
          </label>
          <input
            type="date"
            id="date_to"
            value={filters.date_to}
            onChange={(e ) => setFilters({ ...filters, date_to: e.target.value })}
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