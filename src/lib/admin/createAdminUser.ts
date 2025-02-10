import { supabase } from '../supabase';

export async function createAdminUser(email: string, password: string) {
  try {
    // Create the user account
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
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

    return {
      success: true,
      user: authData.user,
      message: 'Admin user created successfully',
    };
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}