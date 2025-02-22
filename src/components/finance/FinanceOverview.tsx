import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { DollarSign, BarChart, Plus, FlaskRound as Flask, FileSpreadsheet, Package, Beaker, Atom, Calculator, PieChart, ChevronDown, ChevronUp, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AccountSelector from './AccountSelector';
import AccountMovements from './AccountMovements';
import PendingReceivables from './PendingReceivables';
import PendingPayables from './PendingPayables';
import type { SupplierInvoice } from '../../types/payables';
import InvoiceViewerModal from '../payables/SupplierInvoiceViewer';

interface FinancialMetrics {
  monthlyIncome: {
    total: number;
    growthRate: number;
  };
  monthlyExpenses: {
    total: number;
    growthRate: number;
  };
  accountsReceivable: {
    total: number;
    count: number;
  };
  accountsPayable: {
    total: number;
    count: number;
  };
  operatingExpenses: {
    total: number;
    growthRate: number;
  };
  cashBalance: {
    total: number;
    previousTotal: number;
  };
  profitMargin: {
    current: number;
    previous: number;
  };
  averageCollectionPeriod: number;
}

export default function FinanceOverview() {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [showReceivables, setShowReceivables] = useState(true);
  const [showPayables, setShowPayables] = useState(true);
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    monthlyIncome: { total: 0, growthRate: 0 },
    monthlyExpenses: { total: 0, growthRate: 0 },
    accountsReceivable: { total: 0, count: 0 },
    accountsPayable: { total: 0, count: 0 },
    operatingExpenses: { total: 0, growthRate: 0 },
    cashBalance: { total: 0, previousTotal: 0 },
    profitMargin: { current: 0, previous: 0 },
    averageCollectionPeriod: 0
  });
  const [loading, setLoading] = useState(true);
  const [payables, setPayables] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    loadFinancialMetrics();
    loadPayables();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadAccountBalance();
    }
  }, [selectedAccount]);

  const loadPayables = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_payables');
      if (error) throw error;
      setPayables(data || []);
    } catch (error) {
      console.error('Error loading payables:', error);
    }
  };

  const loadFinancialMetrics = async () => {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const lastDayOfMonth = new Date(year, month, 0).getDate();

      // Get monthly income
      const { data: incomeData } = await supabase
        .rpc('get_monthly_income', { p_year: year, p_month: month });

      // Get monthly expenses from expenses module
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('total_amount, created_at')
        .eq('status', 'approved')
        .gte('date', `${year}-${month.toString().padStart(2, '0')}-01`)
        .lte('date', `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth}`);

      const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.total_amount, 0) || 0;

      // Get accounts receivable
      const { data: receivablesData } = await supabase
        .rpc('get_accounts_receivable');

      // Get accounts payable
      const { data: payablesData } = await supabase
        .rpc('get_accounts_payable');

      setMetrics({
        monthlyIncome: {
          total: incomeData?.total || 0,
          growthRate: incomeData?.growth_rate || 0
        },
        monthlyExpenses: {
          total: totalExpenses,
          growthRate: 0 // Calculate this if needed
        },
        accountsReceivable: {
          total: receivablesData?.total || 0,
          count: receivablesData?.count || 0
        },
        accountsPayable: {
          total: payablesData?.total || 0,
          count: payablesData?.count || 0
        },
        operatingExpenses: {
          total: totalExpenses,
          growthRate: 0
        },
        cashBalance: {
          total: 0,
          previousTotal: 0
        },
        profitMargin: {
          current: 0,
          previous: 0
        },
        averageCollectionPeriod: 30
      });
    } catch (error) {
      console.error('Error loading financial metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccountBalance = async () => {
    try {
      const { data, error } = await supabase.rpc('get_account_balance', {
        p_account_id: selectedAccount,
        p_as_of_date: new Date().toISOString().split('T')[0]
      });
      if (error) throw error;
      setAccountBalance(data?.balance || 0);
    } catch (error) {
      console.error('Error loading account balance:', error);
    }
  };

  const handleViewInvoice = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

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
            <h1 className="text-2xl font-semibold">Finanzas</h1>
            <p className="mt-2 text-sm text-gray-400">
              Gestión financiera y contable de la empresa
            </p>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Ingresos */}
          <div className="bg-gray-800/50 overflow-hidden rounded-lg border border-white/10">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Ingresos del Mes
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {formatCurrency(metrics.monthlyIncome.total)}
                      </div>
                      {metrics.monthlyIncome.growthRate !== 0 && (
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          metrics.monthlyIncome.growthRate > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          <Plus className="self-center flex-shrink-0 h-4 w-4" />
                          <span className="sr-only">Increased by</span>
                          {metrics.monthlyIncome.growthRate.toFixed(1)}%
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Active Products */}
          <div className="bg-gray-800/50 overflow-hidden rounded-lg border border-white/10">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Productos Activos
                    </dt>
                    <dd className="text-2xl font-semibold text-white">
                      {metrics.activeProducts}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Cuentas por Cobrar */}
          <div className="bg-gray-800/50 overflow-hidden rounded-lg border border-white/10">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calculator className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Cuentas por Cobrar
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {formatCurrency(metrics.accountsReceivable.total)}
                      </div>
                      <div className="ml-2 text-sm text-gray-400">
                        ({metrics.accountsReceivable.count} facturas)
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Cuentas por Pagar */}
          <div className="bg-gray-800/50 overflow-hidden rounded-lg border border-white/10">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Wallet className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Cuentas por Pagar
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {formatCurrency(metrics.accountsPayable.total)}
                      </div>
                      <div className="ml-2 text-sm text-gray-400">
                        ({metrics.accountsPayable.count} facturas)
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
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
                    {accountBalance !== null ? formatCurrency(accountBalance) : 'Cargando...'}
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
              {showPayables && <PendingPayables payables={payables} onView={handleViewInvoice} />}
            </div>
          </div>
        </div>

        {/* Invoice Viewer Modal */}
        <InvoiceViewerModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
        />
      </div>
    </div>
  );
}