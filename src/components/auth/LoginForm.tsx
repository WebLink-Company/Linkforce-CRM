import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { LoginForm as ILoginForm, ERRORES_VALIDACION } from '../../types/auth';
import { login } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { getCurrentSchema, updateSupabaseSchema } from '../../lib/supabase';

const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

const validarEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validarPassword = (password: string): boolean => {
  return password.length >= 8;
};

export default function LoginForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ILoginForm>({
    email: '',
    password: '',
    recordar: false,
  });
  
  const [selectedSchema, setSelectedSchema] = useState(getCurrentSchema());
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  useEffect(() => {
    // Update Supabase client when schema changes
    if (selectedSchema) {
      updateSupabaseSchema(selectedSchema);
      console.log('Schema updated to:', selectedSchema);
    }
  }, [selectedSchema]);

  const validarForm = (): boolean => {
    const nuevosErrores: string[] = [];
    
    if (!validarEmail(formData.email)) {
      nuevosErrores.push(ERRORES_VALIDACION.EMAIL_INVALIDO);
    }
    
    if (!validarPassword(formData.password)) {
      nuevosErrores.push(ERRORES_VALIDACION.PASSWORD_CORTA);
    }
    
    setErrores(nuevosErrores);
    return nuevosErrores.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const minutesLeft = Math.ceil((lockoutUntil - Date.now()) / 60000);
      setErrores([`Cuenta bloqueada. Intente nuevamente en ${minutesLeft} minutos.`]);
      return;
    }

    if (!validarForm()) return;
    
    setCargando(true);
    try {
      const result = await login(formData.email, formData.password);

      if (!result.success) {
        if (result.error?.code === 'schema_mismatch') {
          setErrores([result.error.message]);
          return;
        }

        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          const lockoutTime = Date.now() + LOCKOUT_DURATION;
          setLockoutUntil(lockoutTime);
          setErrores([ERRORES_VALIDACION.CUENTA_BLOQUEADA]);
        } else {
          setErrores([ERRORES_VALIDACION.CREDENCIALES_INVALIDAS]);
        }
        return;
      }

      setLoginAttempts(0);
      setLockoutUntil(null);
      
      if (formData.recordar && result.data?.session) {
        localStorage.setItem('supabase.auth.token', result.data.session.access_token);
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setErrores(['Error al iniciar sesión']);
    } finally {
      setCargando(false);
    }
  };

  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname.includes('webcontainer-api.io') || 
                window.location.hostname.startsWith('127.0.0.1');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Iniciar Sesión
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errores.length > 0 && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Se encontraron los siguientes errores:
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {errores.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Schema Selector for Development */}
            {isDev && (
              <div>
                <label htmlFor="schema" className="block text-sm font-medium text-gray-700">
                  Schema (Development Only)
                </label>
                <select
                  id="schema"
                  value={selectedSchema}
                  onChange={(e) => {
                    console.log("Changing schema to:", e.target.value);
                    setSelectedSchema(e.target.value);
                  }}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="public">Public</option>
                  <option value="quimicinter">Quimicinter</option>
                  <option value="qalinkforce">QA Linkforce</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                >
                  {mostrarPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="recordar"
                  name="recordar"
                  type="checkbox"
                  checked={formData.recordar}
                  onChange={(e) => setFormData({ ...formData, recordar: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="recordar" className="ml-2 block text-sm text-gray-900">
                  Recordar sesión
                </label>
              </div>

              <div className="text-sm">
                <a href="/recuperar-password" className="font-medium text-blue-600 hover:text-blue-500">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={cargando || (lockoutUntil && Date.now() < lockoutUntil)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar Sesión
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
