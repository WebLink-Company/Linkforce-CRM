import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CreateAdminUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createAdmin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Create the user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: 'julioverasb@gmail.com',
        password: 'Prueba55',
        options: {
          data: {
            full_name: 'Julio Veras',
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Set up admin profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          status: 'active',
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create admin user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4 bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {success ? (
        <div className="mb-4 bg-green-50 p-4 rounded-md">
          <p className="text-sm text-green-700">
            Admin user created successfully! You can now log in with the following credentials:
            <br />
            Email: julioverasb@gmail.com
            <br />
            Password: Prueba55
          </p>
        </div>
      ) : (
        <button
          onClick={createAdmin}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating Admin User...' : 'Create Admin User'}
        </button>
      )}
    </div>
  );
}