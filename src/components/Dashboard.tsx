import React, { useState, useEffect } from 'react';
import { Users, Package, FileText, DollarSign, CreditCard, Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeProducts: 0,
    pendingInvoices: 0,
    monthlyRevenue: { total: 0, growth: 0 },
    accountsReceivable: { total: 0, count: 0 },
    accountsPayable: { total: 0, count: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get active products
      const { count: productsCount } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .gt('current_stock', 0);

      // Get pending invoices
      const { count: invoicesCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'issued')
        .eq('payment_status', 'pending');

      // Get monthly revenue
      const { data: revenueData } = await supabase
        .rpc('get_monthly_income', { 
          p_year: new Date().getFullYear(), 
          p_month: new Date().getMonth() + 1 
        });

      // Get accounts receivable
      const { data: receivablesData } = await supabase
        .rpc('get_accounts_receivable');

      // Get accounts payable
      const { data: payablesData } = await supabase
        .rpc('get_accounts_payable');

      setMetrics({
        totalUsers: usersCount || 0,
        activeProducts: productsCount || 0,
        pendingInvoices: invoicesCount || 0,
        monthlyRevenue: {
          total: revenueData?.total || 0,
          growth: revenueData?.growth_rate || 0
        },
        accountsReceivable: {
          total: receivablesData?.total || 0,
          count: receivablesData?.count || 0
        },
        accountsPayable: {
          total: payablesData?.total || 0,
          count: payablesData?.count || 0
        }
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Vista general del sistema y métricas principales
          </p>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Monthly Revenue */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Ingresos del Mes
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(metrics.monthlyRevenue.total)}
                    </div>
                    {metrics.monthlyRevenue.growth !== 0 && (
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        metrics.monthlyRevenue.growth > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendingUp className="self-center flex-shrink-0 h-4 w-4 mr-1" />
                        {metrics.monthlyRevenue.growth.toFixed(1)}%
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link to="/finanzas" className="text-sm font-medium text-blue-700 hover:text-blue-900">
              Ver detalles
            </Link>
          </div>
        </div>

        {/* Accounts Receivable */}
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
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(metrics.accountsReceivable.total)}
                    </div>
                    <div className="ml-2 text-sm text-gray-500">
                      ({metrics.accountsReceivable.count} facturas)
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link to="/facturacion" className="text-sm font-medium text-blue-700 hover:text-blue-900">
              Ver facturas
            </Link>
          </div>
        </div>

        {/* Accounts Payable */}
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
                      {new Intl.NumberFormat('es-DO', {
                        style: 'currency',
                        currency: 'DOP'
                      }).format(metrics.accountsPayable.total)}
                    </div>
                    <div className="ml-2 text-sm text-gray-500">
                      ({metrics.accountsPayable.count} facturas)
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link to="/cuentas-por-pagar" className="text-sm font-medium text-blue-700 hover:text-blue-900">
              Ver facturas
            </Link>
          </div>
        </div>

        {/* Active Products */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Productos Activos
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {metrics.activeProducts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link to="/inventario" className="text-sm font-medium text-blue-700 hover:text-blue-900">
              Ver inventario
            </Link>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Facturas Pendientes
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {metrics.pendingInvoices}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link to="/facturacion" className="text-sm font-medium text-blue-700 hover:text-blue-900">
              Ver facturas
            </Link>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Usuarios Activos
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {metrics.totalUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link to="/usuarios" className="text-sm font-medium text-blue-700 hover:text-blue-900">
              Gestionar usuarios
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}