import { supabase } from './supabase';

export interface LogoutResult {
  success: boolean;
  message: string;
}

export async function logout(): Promise<LogoutResult> {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        message: 'No active session found'
      };
    }

    // Perform logout
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }

    // Clear any local storage items related to auth
    localStorage.removeItem('supabase.auth.token');
    
    return {
      success: true,
      message: 'Successfully logged out'
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred during logout'
    };
  }
}