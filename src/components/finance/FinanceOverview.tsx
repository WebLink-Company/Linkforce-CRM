import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, FileText, ArrowUpRight, ArrowDownLeft, ChevronDown, ChevronUp, Wallet, Calculator, PieChart, BarChart } from 'lucide-react';
import { financeAPI } from '../../lib/api/finance';
import { supabase } from '../../lib/supabase';
import AccountSelector from './AccountSelector';
import AccountMovements from './AccountMovements';
import PendingReceivables from './PendingReceivables';
import PendingPayables from './PendingPayables';

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

  useEffect(() => {
    loadFinancialMetrics();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadAccountBalance();
    }
  }, [selectedAccount]);

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
      const { data, error } = await financeAPI.getAccountBalance(
        selectedAccount,
        new Date().toISOString().split('T')[0]
      );
      if (error) throw error;
      setAccountBalance(data?.balance || 0);
    } catch (error) {
      console.error('Error loading account balance:', error);
    }
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Finanzas</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestión financiera y contable de la empresa
          </p>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ingresos */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowDownLeft className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Ingresos del Mes
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(metrics.monthlyIncome.total)}
                    </div>
                    {metrics.monthlyIncome.growthRate !== 0 && (
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        metrics.monthlyIncome.growthRate > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="ml-1">
                          {formatPercentage(metrics.monthlyIncome.growthRate)}
                        </span>
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Gastos */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowUpRight className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Gastos del Mes
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(metrics.operatingExpenses.total)}
                    </div>
                    {metrics.operatingExpenses.growthRate !== 0 && (
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        metrics.operatingExpenses.growthRate > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="ml-1">
                          {formatPercentage(metrics.operatingExpenses.growthRate)}
                        </span>
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Cuentas por Cobrar */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Cuentas por Cobrar
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(metrics.accountsReceivable.total)}
                    </div>
                    <div className="ml-2 text-sm text-gray-500">
                      ({metrics.accountsReceivable.count} facturas)
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Cuentas por Pagar */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Wallet className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Cuentas por Pagar
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(metrics.accountsPayable.total)}
                    </div>
                    <div className="ml-2 text-sm text-gray-500">
                      ({metrics.accountsPayable.count} facturas)
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        {/* Balance de Efectivo */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calculator className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Balance de Efectivo
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(metrics.cashBalance.total)}
                    </div>
                    {metrics.cashBalance.total !== metrics.cashBalance.previousTotal && (
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        metrics.cashBalance.total > metrics.cashBalance.previousTotal 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="ml-1">
                          {formatPercentage(
                            ((metrics.cashBalance.total - metrics.cashBalance.previousTotal) / 
                             Math.abs(metrics.cashBalance.previousTotal)) * 100
                          )}
                        </span>
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Margen de Beneficio */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PieChart className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Margen de Beneficio
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatPercentage(metrics.profitMargin.current)}
                    </div>
                    {metrics.profitMargin.current !== metrics.profitMargin.previous && (
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        metrics.profitMargin.current > metrics.profitMargin.previous 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="ml-1">
                          {formatPercentage(metrics.profitMargin.current - metrics.profitMargin.previous)}
                        </span>
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Período Medio de Cobro */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Período Medio de Cobro
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {metrics.averageCollectionPeriod} días
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Selection */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-6">
            <label htmlFor="account" className="block text-sm font-medium text-gray-700">
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
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700">Balance Actual</h3>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
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
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <button
              onClick={() => setShowReceivables(!showReceivables)}
              className="flex justify-between items-center w-full"
            >
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Cuentas por Cobrar
              </h3>
              {showReceivables ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            {showReceivables && <PendingReceivables />}
          </div>
        </div>
      </div>

      {/* Accounts Payable Section */}
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <button
              onClick={() => setShowPayables(!showPayables)}
              className="flex justify-between items-center w-full"
            >
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Cuentas por Pagar
              </h3>
              {showPayables ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            {showPayables && <PendingPayables />}
          </div>
        </div>
      </div>
    </div>
  );
}