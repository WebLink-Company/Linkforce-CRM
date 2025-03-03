import React, { useState } from 'react';
import { Menu, Package, FileText, DollarSign, Users, Shield, BookOpen, LogOut, Receipt, CreditCard, LayoutDashboard, ChevronDown, Settings, User, UserCircle2, ChevronRight, Building2, ShoppingCart, ListOrdered } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [isMenuPinned, setIsMenuPinned] = useState(false);
  const [showPurchaseSubmenu, setShowPurchaseSubmenu] = useState(false);
  const [showBillingSubmenu, setShowBillingSubmenu] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const linkClasses = (path: string) => `
    flex items-center space-x-3 p-2 rounded-lg 
    ${isActive(path) 
      ? 'bg-emerald-500/20 text-emerald-300' 
      : 'text-gray-300 hover:bg-white/5 hover:text-white'
    }
  `;

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/login');
    } else {
      console.error('Logout failed:', result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="relative bg-transparent z-50">
        <div className="absolute inset-0 bg-black bg-opacity-80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent"></div>
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-1/2 h-[3px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
            <div className="absolute top-0 left-1/3 w-1/3 h-[4px] bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm"></div>
            <div className="absolute top-0 left-1/3 -translate-x-1/2 w-32 h-32 bg-emerald-500/20 rounded-full blur-[100px]"></div>
            <div className="absolute top-0 right-1/3 translate-x-1/2 w-32 h-32 bg-blue-500/20 rounded-full blur-[100px]"></div>
          </div>
        </div>

        <div className="relative container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setIsMenuPinned(!isMenuPinned)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="text-lg font-semibold text-white/90 hover:text-white">
              Quimicinter CRM
            </Link>
          </div>

          {/* Floating Dashboard Button */}
          <Link 
            to="/dashboard"
            className="absolute left-1/2 top-[60%] transform -translate-x-1/2 -translate-y-1/2 
                     w-10 h-10 bg-gray-800/50 backdrop-blur-sm border border-white/10
                     rounded-full flex items-center justify-center 
                     shadow-lg hover:bg-gray-700/50 hover:-translate-y-[calc(50%+2px)]
                     transition-all duration-300 z-10
                     before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r before:from-emerald-500/20 before:via-blue-500/20 before:to-purple-500/20 before:animate-pulse"
          >
            <LayoutDashboard className="h-5 w-5 text-white relative z-10" />
          </Link>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
              >
                <User className="h-5 w-5" />
                <span className="text-sm">{user?.user_metadata?.full_name || 'Usuario'}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800/50 backdrop-blur-sm border border-white/10 ring-1 ring-black ring-opacity-5">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
                      role="menuitem"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="h-4 w-4 mr-3" />
                      Mi Perfil
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
                      role="menuitem"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Configuración
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Floating Menu Toggle */}
        <div 
          className={`fixed top-20 left-0 z-40 bg-gray-800/50 backdrop-blur-sm border border-white/10 text-white p-2 rounded-r-lg cursor-pointer transition-transform duration-300 ${
            isMenuExpanded || isMenuPinned ? 'translate-x-64' : 'translate-x-0 hover:bg-gray-700/50'
          }`}
          onClick={() => setIsMenuPinned(!isMenuPinned)}
        >
          <ChevronRight className={`h-5 w-5 transition-transform ${isMenuExpanded || isMenuPinned ? 'rotate-180' : ''}`} />
        </div>

        {/* Sidebar */}
        <aside 
          className={`fixed top-12 left-0 h-full w-64 bg-gray-800/50 backdrop-blur-sm border-r border-white/10 transform transition-transform duration-300 z-30 ${
            isMenuExpanded || isMenuPinned ? 'translate-x-0' : '-translate-x-full'
          }`}
          onMouseEnter={() => !isMenuPinned && setIsMenuExpanded(true)}
          onMouseLeave={() => !isMenuPinned && setIsMenuExpanded(false)}
        >
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className={linkClasses('/dashboard')}>
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
              </li>
              
              <li>
                <Link to="/usuarios" className={linkClasses('/usuarios')}>
                  <Users className="h-5 w-5" />
                  <span>Usuarios</span>
                </Link>
              </li>
              
              <li>
                <Link to="/inventario" className={linkClasses('/inventario')}>
                  <Package className="h-5 w-5" />
                  <span>Inventario</span>
                </Link>
              </li>

              <li>
                <Link to="/clientes" className={linkClasses('/clientes')}>
                  <UserCircle2 className="h-5 w-5" />
                  <span>Clientes</span>
                </Link>
              </li>
              
              <li>
                <div className="relative">
                  <button
                    onClick={() => setShowBillingSubmenu(!showBillingSubmenu)}
                    className={`w-full flex items-center space-x-3 p-2 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white ${
                      location.pathname.startsWith('/facturacion') ? 'bg-emerald-500/20 text-emerald-300' : ''
                    }`}
                  >
                    <FileText className="h-5 w-5" />
                    <span>Facturación</span>
                    <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showBillingSubmenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showBillingSubmenu && (
                    <ul className="ml-6 mt-2 space-y-2">
                      <li>
                        <Link to="/facturacion" className={linkClasses('/facturacion')}>
                          <FileText className="h-4 w-4" />
                          <span>Facturas</span>
                        </Link>
                      </li>
                      <li>
                        <Link to="/facturacion/cotizaciones" className={linkClasses('/facturacion/cotizaciones')}>
                          <FileText className="h-4 w-4" />
                          <span>Cotizaciones</span>
                        </Link>
                      </li>
                      <li>
                        <Link to="/facturacion/secuencias" className={linkClasses('/facturacion/secuencias')}>
                          <ListOrdered className="h-4 w-4" />
                          <span>Secuencias NCF</span>
                        </Link>
                      </li>
                    </ul>
                  )}
                </div>
              </li>

              {/* Compras Menu */}
              <li>
                <div className="relative">
                  <button
                    onClick={() => setShowPurchaseSubmenu(!showPurchaseSubmenu)}
                    className={`w-full flex items-center space-x-3 p-2 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white ${
                      location.pathname.startsWith('/compras') ? 'bg-emerald-500/20 text-emerald-300' : ''
                    }`}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Compras</span>
                    <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showPurchaseSubmenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showPurchaseSubmenu && (
                    <ul className="ml-6 mt-2 space-y-2">
                      <li>
                        <Link to="/compras" className={linkClasses('/compras')}>
                          <ShoppingCart className="h-4 w-4" />
                          <span>Órdenes de Compra</span>
                        </Link>
                      </li>
                      <li>
                        <Link to="/suplidores" className={linkClasses('/suplidores')}>
                          <Building2 className="h-4 w-4" />
                          <span>Suplidores</span>
                        </Link>
                      </li>
                    </ul>
                  )}
                </div>
              </li>
              
              <li>
                <Link to="/finanzas" className={linkClasses('/finanzas')}>
                  <DollarSign className="h-5 w-5" />
                  <span>Finanzas</span>
                </Link>
              </li>

              <li>
                <Link to="/cuentas-por-pagar" className={linkClasses('/cuentas-por-pagar')}>
                  <CreditCard className="h-5 w-5" />
                  <span>Cuentas por Pagar</span>
                </Link>
              </li>

              <li>
                <Link to="/gastos" className={linkClasses('/gastos')}>
                  <Receipt className="h-5 w-5" />
                  <span>Gastos</span>
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        <main className={`flex-1 p-6 transition-all duration-300 ${
          isMenuExpanded || isMenuPinned ? 'ml-64' : 'ml-0'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
}