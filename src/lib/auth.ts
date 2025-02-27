import { supabase } from './supabase';

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

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          code: 'profile_error',
          message: 'Error getting user profile'
        }
      };
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

// Logout function
export const logout = async (): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: {
        code: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : 'Error al cerrar sesión'
      }
    };
  }
};

// Get current user's profile
export const getCurrentProfile = async (): Promise<AuthResult> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    if (!user) throw new Error('No authenticated user');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    if (!profile) {
      console.error('No profile found');
      throw new Error('Profile not found');
    }

    return {
      success: true,
      data: profile
    };
  } catch (error) {
    console.error('Error getting current profile:', error);
    return {
      success: false,
      error: {
        code: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : 'Error getting profile'
      }
    };
  }
};