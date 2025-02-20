import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { FileText, Users, BarChart, Plus, FlaskRound as Flask, FileSpreadsheet, Package, Beaker, Atom } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuario';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Hero Section */}
      <div className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.15),transparent_50%)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle_at_50%_50%,rgba(2,137,85,0.2),transparent_50%)] blur-2xl"></div>
        </div>

        <div className="relative z-10 text-center px-4">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Atom className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Greeting */}
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Hola {firstName}
            </span>
          </h1>
          <p className="text-2xl text-gray-300 mb-12">
            ¿En qué vamos a trabajar hoy?
          </p>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <Link to="/facturacion" 
              className="group p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex flex-col items-center">
                <FileText className="w-8 h-8 text-emerald-400 mb-2" />
                <span className="text-gray-100 font-medium">Crear Factura</span>
              </div>
            </Link>

            <Link to="/clientes" 
              className="group p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex flex-col items-center">
                <Users className="w-8 h-8 text-purple-400 mb-2" />
                <span className="text-gray-100 font-medium">Nuevo Cliente</span>
              </div>
            </Link>

            <Link to="/finanzas" 
              className="group p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex flex-col items-center">
                <BarChart className="w-8 h-8 text-blue-400 mb-2" />
                <span className="text-gray-100 font-medium">Reporte de Ventas</span>
              </div>
            </Link>

            <Link to="/inventario" 
              className="group p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex flex-col items-center">
                <Package className="w-8 h-8 text-yellow-400 mb-2" />
                <span className="text-gray-100 font-medium">Inventario</span>
              </div>
            </Link>

            <Link to="/materias-primas" 
              className="group p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex flex-col items-center">
                <Flask className="w-8 h-8 text-pink-400 mb-2" />
                <span className="text-gray-100 font-medium">Materias Primas</span>
              </div>
            </Link>

            <Link to="/cumplimiento" 
              className="group p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex flex-col items-center">
                <Beaker className="w-8 h-8 text-red-400 mb-2" />
                <span className="text-gray-100 font-medium">Control de Calidad</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Monthly Income */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-white/5 overflow-hidden rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileSpreadsheet className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Ingresos del Mes
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-100">
                        RD$58,744.00
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <Plus className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="sr-only">Increased by</span>
                        12.5%
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Active Products */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-white/5 overflow-hidden rounded-lg">
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
                    <dd className="text-2xl font-semibold text-gray-100">
                      143
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-white/5 overflow-hidden rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Usuarios Activos
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-100">
                      12
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}