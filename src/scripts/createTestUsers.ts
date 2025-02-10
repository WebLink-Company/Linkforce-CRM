import { supabase } from '../lib/supabase';

async function createUser(email: string, password: string, fullName: string, role: 'admin' | 'manager' | 'user') {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log(`User ${email} already exists with role ${existingUser.role}`);
      return { success: true, existing: true };
    }

    // Create the user account
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      // If user exists in auth but not in profiles, just update the profile
      if (signUpError.message.includes('already registered')) {
        const { data: { user } } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              role: role,
              status: 'active',
              full_name: fullName
            })
            .eq('id', user.id);

          if (profileError) throw profileError;
          
          console.log(`Updated existing user ${email} with role ${role}`);
          return { success: true, updated: true };
        }
      }
      throw signUpError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // Set up user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: role,
        status: 'active',
        full_name: fullName
      })
      .eq('id', authData.user.id);

    if (profileError) throw profileError;

    console.log(`${role} user created successfully:`, email);
    return { success: true, user: authData.user };
  } catch (error) {
    console.error(`Error creating ${role} user:`, error);
    return { success: false, error };
  }
}

async function main() {
  try {
    // Create admin user if it doesn't exist
    await createUser(
      'julioverasb@gmail.com',
      'Prueba55',
      'Julio Veras',
      'admin'
    );

    // Create manager user
    await createUser(
      'manager@example.com',
      'Manager123!',
      'María Gerente',
      'manager'
    );

    // Create regular user
    await createUser(
      'user@example.com',
      'User123!',
      'Juan Usuario',
      'user'
    );

    console.log('All test users have been processed successfully');
  } catch (error) {
    console.error('Failed to create test users:', error);
    process.exit(1);
  }
}

main();