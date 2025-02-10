import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Customer } from '../../types/customer';
import CustomerInfoModal from './CustomerInfoModal';

interface CustomerSelectorProps {
  onSelect: (customer: Customer) => void;
  selectedCustomerId?: string;
}

const INDUSTRY_SECTORS = [
  { code: 'A', name: 'Agricultura, Ganadería, Silvicultura y Pesca' },
  { code: 'B', name: 'Explotación de Minas y Canteras' },
  { code: 'C', name: 'Industrias Manufactureras' },
  { code: 'D', name: 'Suministro de Electricidad, Gas, Vapor y Aire Acondicionado' },
  { code: 'E', name: 'Suministro de Agua; Evacuación de Aguas Residuales' },
  { code: 'F', name: 'Construcción' },
  { code: 'G', name: 'Comercio al por Mayor y al por Menor' },
  { code: 'H', name: 'Transporte y Almacenamiento' },
  { code: 'I', name: 'Actividades de Alojamiento y Servicios de Comidas' },
  { code: 'J', name: 'Información y Comunicaciones' },
  { code: 'K', name: 'Actividades Financieras y de Seguros' },
  { code: 'L', name: 'Actividades Inmobiliarias' },
  { code: 'M', name: 'Actividades Profesionales, Científicas y Técnicas' },
  { code: 'N', name: 'Actividades de Servicios Administrativos y de Apoyo' },
  { code: 'O', name: 'Administración Pública y Defensa' },
  { code: 'P', name: 'Enseñanza' },
  { code: 'Q', name: 'Actividades de Atención de la Salud Humana' },
  { code: 'R', name: 'Actividades Artísticas, de Entretenimiento y Recreativas' },
  { code: 'S', name: 'Otras Actividades de Servicios' },
];

export default function CustomerSelector({ onSelect, selectedCustomerId }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, [selectedSector]);

  const loadCustomers = async () => {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('status', 'active')
      .is('deleted_at', null);

    if (selectedSector) {
      query = query.eq('industry_sector', selectedSector);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading customers:', error);
      return;
    }

    setCustomers(data || []);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowInfoModal(true);
    onSelect(customer);
  };

  const filteredCustomers = customers.filter(customer => 
    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.identification_number.includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="sector" className="block text-sm font-medium text-gray-700">
            Sector Industrial
          </label>
          <select
            id="sector"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Todos los sectores</option>
            {INDUSTRY_SECTORS.map((sector) => (
              <option key={sector.code} value={sector.code}>
                {sector.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Buscar Cliente
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o RNC..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                  RNC
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Razón Social
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Tipo de Comprobante
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4">
                  <span className="sr-only">Seleccionar</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredCustomers.map((customer) => (
                <tr 
                  key={customer.id}
                  className={`hover:bg-gray-50 ${selectedCustomerId === customer.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                    {customer.identification_number}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {customer.full_name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {customer.invoice_type === 'B01' && 'Crédito Fiscal (B01)'}
                    {customer.invoice_type === 'B02' && 'Consumo (B02)'}
                    {customer.invoice_type === 'B14' && 'Gubernamental (B14)'}
                    {customer.invoice_type === 'B15' && 'Exportación (B15)'}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleCustomerSelect(customer)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Seleccionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        customer={selectedCustomer}
      />
    </div>
  );
}