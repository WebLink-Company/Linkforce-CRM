export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'ventas' | 'produccion' | 'finanzas' | 'calidad';
  estado: 'activo' | 'bloqueado' | 'inactivo';
  ultimaConexion: Date;
  intentosFallidos: number;
  ultimoIntentoFallido?: Date;
}

export interface LoginForm {
  email: string;
  password: string;
  recordar: boolean;
}

export interface ValidationError {
  campo: string;
  mensaje: string;
}

export interface AuthState {
  usuario: Usuario | null;
  cargando: boolean;
  error: string | null;
}

export const ERRORES_VALIDACION = {
  EMAIL_INVALIDO: 'Por favor, ingrese un correo electrónico válido',
  PASSWORD_CORTA: 'La contraseña debe tener al menos 8 caracteres',
  PASSWORD_REQUISITOS: 'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número',
  CUENTA_BLOQUEADA: 'Su cuenta ha sido bloqueada temporalmente. Por favor, intente de nuevo en 15 minutos',
  CREDENCIALES_INVALIDAS: 'Correo electrónico o contraseña incorrectos',
} as const;