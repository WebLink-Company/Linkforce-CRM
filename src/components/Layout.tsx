import React, { useState } from 'react';
import { Menu, Package, FileText, DollarSign, Users, Shield, BookOpen, LogOut, Receipt, CreditCard, LayoutDashboard, ChevronDown, Settings, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const linkClasses = (path: string) => `
    flex items-center space-x-3 p-2 rounded-lg 
    ${isActive(path) 
      ? 'bg-blue-50 text-blue-700' 
      : 'hover:bg-blue-50 text-gray-700'
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Menu className="h-6 w-6" />
            <h1 className="text-xl font-bold">Quimicinter CRM</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 hover:text-blue-200 transition-colors"
              >
                <User className="h-5 w-5" />
                <span className="text-sm">{user?.user_metadata?.full_name || 'Usuario'}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="h-4 w-4 mr-3" />
                      Mi Perfil
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
        <aside className="w-64 min-h-screen bg-white shadow-lg">
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
                <Link to="/facturacion" className={linkClasses('/facturacion')}>
                  <FileText className="h-5 w-5" />
                  <span>Facturación</span>
                </Link>
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
              
              <li>
                <Link to="/cumplimiento" className={linkClasses('/cumplimiento')}>
                  <BookOpen className="h-5 w-5" />
                  <span>Cumplimiento</span>
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}