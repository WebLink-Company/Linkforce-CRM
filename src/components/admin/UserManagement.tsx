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
      console.error('Error fetching users:', error);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Usuarios</h1>
          <p className="mt-2 text-sm text-gray-700">
            Administre los usuarios del sistema, sus roles y permisos.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <User className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      <CreateAdminUser />

      {error && (
        <div className="mt-4 bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Nombre
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Rol
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        {usuario.nombre}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {usuario.rol}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          usuario.estado === 'activo' ? 'bg-green-100 text-green-800' :
                          usuario.estado === 'bloqueado' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {usuario.estado}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(usuario)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar usuario"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(usuario.id)}
                            className="text-red-600 hover:text-red-900"
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar Eliminación
                </h3>
              </div>
            </div>
            
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                ¿Está seguro que desea eliminar este usuario? Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmDelete({show: false, userId: null})}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
  );
}