import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Customer } from '../../types/customer';
import { User } from 'lucide-react';

interface CustomerSelectorProps {
  onSelect: (customer: Customer) => void;
  selectedCustomerId?: string;
  onLoadComplete?: () => void;
}

export default function CustomerSelector({ onSelect, selectedCustomerId, onLoadComplete }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;
      setCustomers(data || []);
      if (onLoadComplete) onLoadComplete();
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Function to add a new customer to the list
  const addCustomer = (newCustomer: Customer) => {
    setCustomers(prev => [...prev, newCustomer]);
    // Automatically select the new customer
    onSelect(newCustomer);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.identification_number.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-700/50 rounded-md"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
          <User className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar cliente por nombre o RNC..."
          className="block w-full pl-10 rounded-md bg-gray-700/50 border-gray-600/50 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
        />
      </div>

      {searchTerm && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md bg-gray-800/50 border border-white/10">
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => onSelect(customer)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-700/50 text-sm text-gray-300 ${
                selectedCustomerId === customer.id ? 'bg-gray-700/50' : ''
              }`}
            >
              <div className="font-medium">{customer.full_name}</div>
              <div className="text-xs text-gray-400">RNC: {customer.identification_number}</div>
            </button>
          ))}
          {filteredCustomers.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-400">
              No se encontraron clientes
            </div>
          )}
        </div>
      )}
    </div>
  );
}