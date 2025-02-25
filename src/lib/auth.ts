import { supabase } from './supabase';
import { getCurrentSchema, validateSchema } from './supabase';

interface AuthResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

// Login function
export const login = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      throw signInError;
    }

    if (!session?.user) {
      throw new Error('No user returned from login');
    }

    // Validate schema access
    const schemaResult = await validateSchemaAccess(session.user);
    if (!schemaResult.success) {
      await supabase.auth.signOut();
      return schemaResult;
    }

    // Update last login
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Error updating last login:', updateError);
    }

    return {
      success: true,
      data: {
        user: session.user,
        session
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: {
        code: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }
    };
  }
};

// Validate user has access to current schema
export const validateSchemaAccess = async (user: any): Promise<AuthResult> => {
  try {
    const currentSchema = getCurrentSchema();
    
    // Validate schema
    if (!validateSchema(currentSchema)) {
      return {
        success: false,
        error: {
          code: 'invalid_schema',
          message: 'Schema inválido'
        }
      };
    }
    
    // Get user profile from current schema
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, schema_name')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // If no profile exists in this schema, deny access
    if (!profile) {
      return {
        success: false,
        error: {
          code: 'no_profile',
          message: 'No tienes acceso a este ambiente. Por favor, contacta al administrador.'
        }
      };
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
