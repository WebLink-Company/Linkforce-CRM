import { supabase } from './supabase';
import { getCurrentSchema } from './supabase';

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
    const schema = getCurrentSchema();
    console.log('🔍 Attempting login in schema:', schema);

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

    // First check if user exists in any schema
    const { data: userProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('schema_name, role')
      .eq('id', session.user.id);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          code: 'profile_error',
          message: 'Error getting user profile'
        }
      };
    }

    // No profiles found
    if (!userProfiles || userProfiles.length === 0) {
      console.error('❌ No profiles found for user');
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          code: 'profile_not_found',
          message: 'User profile not found'
        }
      };
    }

    // Check if user has access to current schema
    const hasAccess = userProfiles.some(profile => 
      profile.schema_name === schema || profile.role === 'admin'
    );

    if (!hasAccess) {
      console.error('❌ Schema access denied:', schema);
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          code: 'schema_mismatch',
          message: `User does not have access to ${schema} schema`
        }
      };
    }

    // Get profile for current schema
    const { data: profile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .eq('schema_name', schema)
      .maybeSingle();

    if (currentProfileError) {
      console.error('❌ Error fetching current schema profile:', currentProfileError);
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          code: 'profile_error',
          message: 'Error getting user profile'
        }
      };
    }

    // For admin users, if profile doesn't exist in current schema, create it
    if (!profile && userProfiles.some(p => p.role === 'admin')) {
      const adminProfile = userProfiles.find(p => p.role === 'admin');
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata.full_name,
          role: 'admin',
          status: 'active',
          schema_name: schema,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating admin profile:', createError);
        await supabase.auth.signOut();
        return {
          success: false,
          error: {
            code: 'profile_creation_error',
            message: 'Error creating admin profile'
          }
        };
      }

      // Use the newly created profile
      if (newProfile) {
        console.log('✅ Created new admin profile in schema:', schema);
        return {
          success: true,
          data: {
            user: session.user,
            session,
            profile: newProfile
          }
        };
      }
    }

    // If no profile exists for this schema and user is not admin
    if (!profile) {
      console.error('❌ No profile found in schema:', schema);
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          code: 'profile_not_found',
          message: `No profile found in ${schema} schema`
        }
      };
    }

    // Verify status
    if (profile.status !== 'active') {
      console.error('❌ Account not active:', profile.status);
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          code: 'account_inactive',
          message: 'Account is not active'
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
      .eq('id', session.user.id)
      .eq('schema_name', schema);

    if (updateError) {
      console.error('❌ Error updating last login:', updateError);
    }

    console.log('✅ Login successful in schema:', schema);
    return {
      success: true,
      data: {
        user: session.user,
        session,
        profile
      }
    };
  } catch (error) {
    console.error('❌ Login error:', error);
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
    console.error('❌ Logout error:', error);
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
    const schema = getCurrentSchema();
    console.log('🔍 Getting profile in schema:', schema);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    if (!user) throw new Error('No authenticated user');

    // First check if user is admin
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('role, schema_name')
      .eq('id', user.id);

    if (profilesError) throw profilesError;

    const isAdmin = profiles?.some(p => p.role === 'admin');

    // Get profile for current schema
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .eq('schema_name', schema)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      throw profileError;
    }

    // If no profile exists and user is admin, create one
    if (!profile && isAdmin) {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name,
          role: 'admin',
          status: 'active',
          schema_name: schema,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) throw createError;
      return {
        success: true,
        data: newProfile
      };
    }

    if (!profile) {
      console.error('❌ No profile found in schema:', schema);
      throw new Error('Profile not found');
    }

    return {
      success: true,
      data: profile
    };
  } catch (error) {
    console.error('❌ Error getting current profile:', error);
    return {
      success: false,
      error: {
        code: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : 'Error getting profile'
      }
    };
  }
};