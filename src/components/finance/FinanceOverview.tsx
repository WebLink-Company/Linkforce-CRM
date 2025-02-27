import React, { useState, useEffect } from 'react';
import { financeAPI } from '../../lib/api/finance';
import { 
  DollarSign, BarChart, Plus, Wallet, Calculator, ChevronDown, ChevronUp,
  FilePieChart, FileDown, Printer 
} from 'lucide-react';
import AccountSelector from './AccountSelector';
import AccountMovements from './AccountMovements';
import PendingReceivables from './PendingReceivables';
import PendingPayables from './PendingPayables';
import { exportToCSV } from '../../utils/export';
import { jsPDF } from 'jspdf';

export default function FinanceOverview() {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReceivables, setShowReceivables] = useState(true);
  const [showPayables, setShowPayables] = useState(true);

  // Define main accounts to show balances for
  const mainAccounts = [
    { code: '1100', name: 'Efectivo y Equivalentes', icon: Wallet },
    { code: '1200', name: 'Cuentas por Cobrar', icon: Calculator },
    { code: '2100', name: 'Cuentas por Pagar', icon: DollarSign },
    { code: '4000', name: 'Ingresos', icon: BarChart },
  ];

  useEffect(() => {
    loadAccountBalances();
  }, []);

  const loadAccountBalances = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const balances: Record<string, number> = {};
      
      for (const account of mainAccounts) {
        const { data, error } = await financeAPI.getAccountBalance(
          account.code,
          new Date().toISOString().split('T')[0]
        );
        
        if (error) throw error;
        balances[account.code] = data?.balance || 0;
      }
      
      setAccountBalances(balances);
    } catch (error) {
      console.error('Error loading account balances:', error);
      setError(error instanceof Error ? error.message : 'Error loading account balances');
    } finally {
      setLoading(false);
    }
  };

  const handleExportFinancialReport = () => {
    // Export to CSV
    const reportData = mainAccounts.map(account => ({
      'Cuenta': account.name,
      'Balance': accountBalances[account.code] || 0
    }));

    exportToCSV(reportData, 'reporte_financiero');
  };

  const handlePrintFinancialReport = () => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text('Reporte Financiero', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Quimicinter S.R.L', 105, 30, { align: 'center' });
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-DO')}`, 105, 40, { align: 'center' });
    
    // Add account balances
    let y = 60;
    mainAccounts.forEach(account => {
      const balance = accountBalances[account.code] || 0;
      doc.text(account.name, 20, y);
      doc.text(new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP'
      }).format(balance), 160, y, { align: 'right' });
      y += 10;
    });
    
    // Add totals
    const totalAssets = (accountBalances['1100'] || 0) + (accountBalances['1200'] || 0);
    const totalLiabilities = accountBalances['2100'] || 0;
    
    y += 10;
    doc.setFontStyle('bold');
    doc.text('Total Activos:', 20, y);
    doc.text(new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(totalAssets), 160, y, { align: 'right' });
    
    y += 10;
    doc.text('Total Pasivos:', 20, y);
    doc.text(new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(totalLiabilities), 160, y, { align: 'right' });
    
    // Save the PDF
    doc.save('reporte_financiero.pdf');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold">Finanzas</h1>
            <p className="mt-2 text-sm text-gray-400">
              Gestión financiera y contable de la empresa
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-3">
            <button
              onClick={handleExportFinancialReport}
              className="btn btn-secondary"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Exportar Reporte
            </button>
            <button
              onClick={handlePrintFinancialReport}
              className="btn btn-secondary"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Reporte
            </button>
          </div>
        </div>

        {/* Account Balance Cards */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {mainAccounts.map((account) => {
            const Icon = account.icon;
            const balance = accountBalances[account.code] || 0;
            const isNegative = balance < 0;
            
            return (
              <div key={account.code} 
                className="bg-gray-800/50 overflow-hidden rounded-lg border border-white/10 animate-slide-up"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Icon className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-400 truncate">
                          {account.name}
                        </dt>
                        <dd className="text-2xl font-semibold text-white">
                          {formatCurrency(Math.abs(balance))}
                          {isNegative && <span className="text-red-400 text-sm ml-1">(DR)</span>}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Account Selection */}
        <div className="mt-8 bg-gray-800/50 shadow rounded-lg border border-white/10">
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-6">
              <label htmlFor="account" className="block text-sm font-medium text-gray-300">
                Seleccionar Cuenta
              </label>
              <div className="mt-1">
                <AccountSelector
                  value={selectedAccount}
                  onChange={setSelectedAccount}
                />
              </div>
            </div>

            {selectedAccount && (
              <>
                <div className="mb-6 bg-gray-900/50 p-4 rounded-lg border border-white/20">
                  <h3 className="text-sm font-medium text-gray-300">Balance Actual</h3>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {formatCurrency(accountBalances[selectedAccount] || 0)}
                  </p>
                </div>

                <AccountMovements accountId={selectedAccount} />
              </>
            )}
          </div>
        </div>

        {/* Accounts Receivable Section */}
        <div className="mt-8">
          <div className="bg-gray-800/50 shadow rounded-lg border border-white/10">
            <div className="px-4 py-5 sm:p-6">
              <button
                onClick={() => setShowReceivables(!showReceivables)}
                className="flex justify-between items-center w-full"
              >
                <h3 className="text-lg font-medium text-white">
                  Cuentas por Cobrar
                </h3>
                {showReceivables ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {showReceivables && <PendingReceivables />}
            </div>
          </div>
        </div>

        {/* Accounts Payable Section */}
        <div className="mt-8">
          <div className="bg-gray-800/50 shadow rounded-lg border border-white/10">
            <div className="px-4 py-5 sm:p-6">
              <button
                onClick={() => setShowPayables(!showPayables)}
                className="flex justify-between items-center w-full"
              >
                <h3 className="text-lg font-medium text-white">
                  Cuentas por Pagar
                </h3>
                {showPayables ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {showPayables && <PendingPayables />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}