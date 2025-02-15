import React from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserMenuProps {
  onClose: () => void;
  onLogout: () => void;
}

export default function UserMenu({ onClose, onLogout }: UserMenuProps) {
  return (
    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
      <div className="py-1" role="menu" aria-orientation="vertical">
        <Link
          to="/profile"
          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          role="menuitem"
          onClick={onClose}
        >
          <User className="h-4 w-4 mr-3" />
          Mi Perfil
        </Link>
        <Link
          to="/settings"
          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          role="menuitem"
          onClick={onClose}
        >
          <Settings className="h-4 w-4 mr-3" />
          Configuración
        </Link>
        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          role="menuitem"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}