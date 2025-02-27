import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { billingAPI } from '../lib/api/billing';
import { Link } from 'react-router-dom';
import { 
  FileText, Users, BarChart, Plus, FlaskRound as Flask, FileSpreadsheet, 
  Package, Beaker, Atom, DollarSign, AlertTriangle, Receipt, ShoppingCart,
  Building2, CreditCard, Wallet, XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentSchema } from '../lib/supabase';

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuario';
  const [metrics, setMetrics] = useState({
    monthlyIncome: { total: 0, growthRate: 0 },
    accountsReceivable: { total: 0, count: 0 },
    activeCustomers: 0,
    overdueInvoices: [] as Array<{
      id: string;
      ncf: string;
      customer_name: string;
      due_date: string;
      total_amount: number;
      days_overdue: number;
    }>
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const schema = getCurrentSchema();
    console.log("Current Schema:", schema);
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setError(null);
      const result = await billingAPI.getDashboardMetrics();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      setMetrics(result.data);
    } catch (error) {
      console.error('Error loading metrics:', error);
      setError(error instanceof Error ? error.message : 'Error loading metrics');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { to: '/facturacion', icon: FileText, text: 'Crear Factura', color: 'text-emerald-400', delay: 'animate-bounce-in' },
    { to: '/clientes', icon: Users, text: 'Nuevo Cliente', color: 'text-purple-400', delay: 'animate-bounce-in-delay-1' },
    { to: '/finanzas', icon: BarChart, text: 'Reporte de Ventas', color: 'text-blue-400', delay: 'animate-bounce-in-delay-2' },
    { to: '/inventario', icon: Package, text: 'Inventario', color: 'text-yellow-400', delay: 'animate-bounce-in-delay-3' },
    { to: '/materias-primas', icon: Flask, text: 'Materias Primas', color: 'text-pink-400', delay: 'animate-bounce-in-delay-4' },
    { to: '/cumplimiento', icon: Beaker, text: 'Control de Calidad', color: 'text-red-400', delay: 'animate-bounce-in-delay-5' }
  ];

  const secondaryActions = [
    { to: '/gastos', icon: Receipt, text: 'Gastos', color: 'text-orange-400' },
    { to: '/compras', icon: ShoppingCart, text: 'Compras', color: 'text-indigo-400' },
    { to: '/suplidores', icon: Building2, text: 'Suplidores', color: 'text-teal-400' },
    { to: '/cuentas-por-pagar', icon: CreditCard, text: 'Cuentas por Pagar', color: 'text-rose-400' },
    { to: '/finanzas', icon: Wallet, text: 'Finanzas', color: 'text-cyan-400' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-lg w-full mx-4 text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error al Cargar Datos</h2>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadMetrics();
            }}
            className="mt-4 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Hero Section */}
      <div className="relative min-h-[40vh] flex items-center justify-center py-8">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.15),transparent_50%)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.2),transparent_50%)] blur-2xl"></div>
        </div>

        <div className="relative z-10 text-center px-4 w-full max-w-6xl mx-auto">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Atom className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Greeting */}
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Hola {firstName}
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            ¿En qué vamos a trabajar hoy?
          </p>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto mb-8">
            {quickActions.map((action, index) => (
              <Link
                key={action.to}
                to={action.to}
                className={`${action.delay} p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 
                          hover:bg-white/10 transition-all hover:-translate-y-1 group`}
              >
                <div className="flex flex-col items-center">
                  <action.icon className={`w-8 h-8 ${action.color} mb-2 group-hover:scale-110 transition-transform`} />
                  <span className="text-gray-100 font-medium text-sm text-center">{action.text}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Secondary Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            {secondaryActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/5 backdrop-blur-sm 
                         border border-white/10 hover:bg-white/10 transition-all group"
              >
                <action.icon className={`w-4 h-4 ${action.color} mr-2 group-hover:scale-110 transition-transform`} />
                <span className="text-gray-100 text-sm">{action.text}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Monthly Income */}
          <div className="bg-gray-800/50 overflow-hidden rounded-lg border border-white/10 animate-slide-up">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Ingresos del Mes
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {new Intl.NumberFormat('es-DO', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(metrics.monthlyIncome.total)}
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

          {/* Accounts Receivable */}
          <div className="bg-gray-800/50 overflow-hidden rounded-lg border border-white/10 animate-slide-up-delay-1">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Cuentas por Cobrar
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {new Intl.NumberFormat('es-DO', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(metrics.accountsReceivable.total)}
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

          {/* Active Customers */}
          <div className="bg-gray-800/50 overflow-hidden rounded-lg border border-white/10 animate-slide-up-delay-2">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Clientes Activos
                    </dt>
                    <dd className="text-2xl font-semibold text-white mt-1">
                      {metrics.activeCustomers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts Section */}
          <div className="bg-gray-800/50 overflow-hidden rounded-lg border border-white/10 animate-slide-up-delay-3">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Facturas Vencidas
                    </dt>
                    <dd className="text-2xl font-semibold text-white mt-1">
                      {metrics.overdueInvoices.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Invoices */}
        {metrics.overdueInvoices.length > 0 && (
          <div className="mt-6">
            <div className="bg-gray-800/50 shadow rounded-lg border border-white/10">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-white mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                  Facturas Vencidas
                </h3>
                <div className="space-y-2">
                  {metrics.overdueInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                      <div>
                        <p className="text-sm font-medium text-red-300">{invoice.customer_name}</p>
                        <p className="text-xs text-red-200/70">NCF: {invoice.ncf}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-300">
                          {new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: 'DOP'
                          }).format(invoice.total_amount)}
                        </p>
                        <p className="text-xs text-red-200/70">
                          {invoice.days_overdue} días vencida
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}