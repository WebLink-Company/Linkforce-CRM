import { supabase } from './supabase';

export interface LogoutResult {
  success: boolean;
  message: string;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthResult {
  success: boolean;
  error?: AuthError;
  data?: any;
}

// Get the schema name based on hostname
export const getSchemaFromHostname = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (hostname.includes('qa')) return 'qalinkforce';
    if (hostname.includes('quimicinter')) return 'quimicinter';
  }
  return 'public';
};

// Validate user has access to current schema
export const validateSchemaAccess = async (user: any): Promise<AuthResult> => {
  try {
    const currentSchema = getSchemaFromHostname();
    
    // Get user profile from current schema
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, schema_name')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // If no profile exists, create one
    if (!profile) {
      const { error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          schema_name: currentSchema,
          role: user.user_metadata?.role || 'user',
          status: 'active'
        }]);

      if (createError) throw createError;
      
      return { success: true };
    }

    // Admins can access all schemas
    if (profile.role === 'admin') {
      return { success: true, data: profile };
    }

    // Regular users must match schema
    if (profile.schema_name !== currentSchema) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          code: 'schema_mismatch',
          message: 'No tienes acceso a este ambiente. Por favor, contacta al administrador.'
        }
      };
    }

    return { success: true, data: profile };
  } catch (error) {
    console.error('Error validating schema access:', error);
    return {
      success: false,
      error: {
        code: 'validation_error',
        message: 'Error validando acceso'
      }
    };
  }
};

export const login = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        // Set session persistence to local storage
        persistSession: true
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned from auth');

    // Validate schema access
    const accessResult = await validateSchemaAccess(authData.user);
    if (!accessResult.success) {
      return accessResult;
    }

    // Update last login
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', authData.user.id);

    // Store session in local storage
    if (authData.session) {
      localStorage.setItem('supabase.auth.token', authData.session.access_token);
      localStorage.setItem('supabase.auth.refreshToken', authData.session.refresh_token);
    }

    return { success: true, data: authData };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: {
        code: 'auth_error',
        message: error instanceof Error ? error.message : 'Error durante el inicio de sesión'
      }
    };
  }
};

export const logout = async (): Promise<LogoutResult> => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    // Clear stored tokens
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.refreshToken');
    
    return {
      success: true,
      message: 'Sesión cerrada exitosamente'
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al cerrar sesión'
    };
  }
};