import React, { useState, useEffect } from 'react';
import { User, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Usuario } from '../../types/auth';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import CreateAdminUser from './CreateAdminUser';

export default function UserManagement() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<{show: boolean; userId: string | null}>({
    show: false,
    userId: null
  });

  const loadUsers = async () => {
    try {
      // Get current schema
      const schema = window.location.hostname.includes('qa') ? 'qalinkforce' :
                    window.location.hostname.includes('quimicinter') ? 'quimicinter' :
                    'public';

      // Get current user's role
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      // Query profiles based on role and schema
      let query = supabase.from('profiles').select('*');
      
      if (currentProfile?.role !== 'admin') {
        query = query.eq('schema_name', schema);
      }

      const { data: profiles, error: profilesError } = await query
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const formattedUsers = profiles.map(profile => ({
        id: profile.id,
        nombre: profile.full_name || '',
        email: '',
        rol: profile.role as Usuario['rol'],
        estado: profile.status === 'active' ? 'activo' : 
               profile.status === 'inactive' ? 'inactivo' : 'bloqueado',
        ultimaConexion: profile.last_login ? new Date(profile.last_login) : new Date(),
        intentosFallidos: 0
      }));

      setUsuarios(formattedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleEdit = (user: Usuario) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDelete = async (userId: string) => {
    setShowConfirmDelete({show: true, userId});
  };

  const confirmDelete = async () => {
    if (!showConfirmDelete.userId) return;
    
    try {
      // First delete from auth.users which will trigger our cascade delete
      const { error: authError } = await supabase.rpc('delete_user', {
        user_id: showConfirmDelete.userId
      });

      if (authError) throw authError;
      
      await loadUsers();
      setShowConfirmDelete({show: false, userId: null});
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error instanceof Error ? error.message : 'Error al eliminar el usuario');
    }
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
            <h1 className="text-2xl font-semibold">Gestión de Usuarios</h1>
            <p className="mt-2 text-sm text-gray-400">
              Administre los usuarios del sistema, sus roles y permisos.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              <User className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </button>
          </div>
        </div>

        <CreateAdminUser />

        {error && (
          <div className="mt-4 bg-red-500/20 p-4 rounded-md border border-red-500/30">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="mt-8">
          <div className="table-container">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-gray-900/50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-6">
                    Nombre
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">
                    Rol
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-300">
                    Estado
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-gray-800/30">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-700/30">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-300 sm:pl-6">
                      {usuario.nombre}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                      {usuario.rol}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                      <span className={`status-badge ${
                        usuario.estado === 'activo' ? 'status-badge-success' :
                        usuario.estado === 'bloqueado' ? 'status-badge-error' :
                        'status-badge-warning'
                      }`}>
                        {usuario.estado}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleEdit(usuario)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Editar usuario"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(usuario.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <AddUserModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadUsers}
        />

        <EditUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={loadUsers}
          user={selectedUser}
        />

        {/* Confirmation Modal */}
        {showConfirmDelete.show && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900/95 rounded-lg max-w-md w-full p-6 border border-white/10">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-white">
                    Confirmar Eliminación
                  </h3>
                </div>
              </div>
              
              <div className="mt-2">
                <p className="text-sm text-gray-300">
                  ¿Está seguro que desea eliminar este usuario? Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete({show: false, userId: null})}
                  className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Eliminar Usuario
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}