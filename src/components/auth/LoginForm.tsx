import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { LoginForm as ILoginForm, ERRORES_VALIDACION } from '../../types/auth';
import { login } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { getCurrentSchema, updateSupabaseSchema } from '../../lib/supabase';

const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos en milisegundos

const validarEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+$/.test(email);
const validarPassword = (password: string): boolean => password.length >= 8;

export default function LoginForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ILoginForm>({ email: '', password: '', recordar: false });
  const [selectedSchema, setSelectedSchema] = useState(getCurrentSchema());
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  useEffect(() => {
    console.log('🔄 Schema actualizado a:', selectedSchema);
    localStorage.setItem('dev_schema', selectedSchema);
    updateSupabaseSchema(selectedSchema);
  }, [selectedSchema]);

  const validarForm = (): boolean => {
    const nuevosErrores: string[] = [];

    if (!validarEmail(formData.email)) {
      nuevosErrores.push('Correo electrónico inválido. Asegúrese de ingresar un email válido.');
    }

    if (!validarPassword(formData.password)) {
      nuevosErrores.push('La contraseña debe tener al menos 8 caracteres.');
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
      console.log('🔍 Iniciando sesión con esquema:', selectedSchema);

      const result = await login(formData.email, formData.password);

      if (!result.success) {
        if (result.error?.code === 'schema_mismatch') {
          setErrores([`El usuario no pertenece al esquema seleccionado (${selectedSchema}). Verifique e intente nuevamente.`]);
          return;
        }

        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          setLockoutUntil(Date.now() + LOCKOUT_DURATION);
          setErrores(['Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.']);
        } else {
          setErrores(['Correo o contraseña incorrectos. Intente nuevamente.']);
        }
        return;
      }

      setLoginAttempts(0);
      setLockoutUntil(null);

      if (formData.recordar && result.data?.session) {
        localStorage.setItem('supabase.auth.token', result.data.session.access_token);
      }

      console.log('✅ Login exitoso, redirigiendo al dashboard...');
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Error en login:', error);
      setErrores(['Error al iniciar sesión. Intente nuevamente.']);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000814] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#000814] via-[#1A0B2E] to-[#2B0B3A]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(138,43,226,0.15),transparent_50%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_50%_50%,rgba(138,43,226,0.1),transparent_50%)] blur-3xl"></div>
      </div>

      {/* Logo Section */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex flex-col items-center">
          {/* Logo Image */}
          <img 
            src="/img/LinkForce-logo-01.png"
            alt="LinkForce Logo"
            className="w-64 h-auto mb-4"
          />
          <h2 className="text-center text-4xl font-extrabold bg-gradient-to-r from-white via-purple-300 to-white bg-clip-text text-transparent">
            Bienvenido a LinkForce
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Ingrese sus credenciales para continuar
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/5 backdrop-blur-sm py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-white/10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errores.length > 0 && (
              <div className="rounded-md bg-red-500/20 border border-red-500/50 p-4">
                <h3 className="text-sm font-medium text-red-300">Errores detectados:</h3>
                <ul className="mt-2 text-sm text-red-300 list-disc pl-5">
                  {errores.map((error, index) => <li key={index}>{error}</li>)}
                </ul>
              </div>
            )}

            {/* Selector de esquema en modo desarrollo */}
            {(window.location.hostname === 'localhost' || window.location.hostname.includes('webcontainer-api.io') || window.location.hostname.startsWith('127.0.0.1')) && (
              <div>
                <label htmlFor="schema" className="block text-sm font-medium text-gray-300">
                  Esquema (Modo Desarrollo)
                </label>
                <select
                  id="schema"
                  value={selectedSchema}
                  onChange={(e) => {
                    console.log('🔄 Cambio de esquema:', e.target.value);
                    setSelectedSchema(e.target.value);
                  }}
                  className="mt-1 block w-full rounded-md bg-white/5 border-white/10 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                >
                  <option value="public">Público</option>
                  <option value="quimicinter">Quimicinter</option>
                  <option value="qalinkforce">QA Linkforce</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Correo electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                  className="block w-full px-3 py-2 border border-white/10 rounded-md shadow-sm bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full px-3 py-2 border border-white/10 rounded-md shadow-sm bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                >
                  {mostrarPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="recordar"
                  type="checkbox"
                  checked={formData.recordar}
                  onChange={(e) => setFormData({ ...formData, recordar: e.target.checked })}
                  className="h-4 w-4 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="recordar" className="ml-2 block text-sm text-gray-300">
                  Recordarme
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-purple-400 hover:text-purple-300">
                  ¿Olvidó su contraseña?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={cargando || (lockoutUntil && Date.now() < lockoutUntil)}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8A2BE2] hover:bg-[#9B30FF] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02]"
              >
                <LogIn className="h-5 w-5 mr-2" />
                {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6">
            <p className="text-center text-sm text-gray-400">
              © 2025 LinkForce. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}