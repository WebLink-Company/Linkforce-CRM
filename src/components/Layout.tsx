import React from 'react';
import { Menu, Home, Package, FileText, DollarSign, Users, Shield, BookOpen, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../lib/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

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
      // You might want to show this error in a toast notification
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
            <span className="text-sm">Juan Pérez</span>
            <Shield className="h-5 w-5" />
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 hover:text-blue-200 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 min-h-screen bg-white shadow-lg">
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className={linkClasses('/dashboard')}>
                  <Home className="h-5 w-5" />
                  <span>Inicio</span>
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
                <Link to="/clientes" className={linkClasses('/clientes')}>
                  <Users className="h-5 w-5" />
                  <span>Clientes</span>
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