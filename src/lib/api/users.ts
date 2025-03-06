import { BaseAPI } from './base';
import { supabase } from '../supabase';
import type { Usuario } from '../../types/auth';
import { getCurrentSchema } from '../supabase';

class UsersAPI extends BaseAPI {
  constructor() {
    super('profiles');
  }

  async getUsers() {
    try {
      const schema = getCurrentSchema();
      console.log('Getting users from schema:', schema);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in getUsers:', error);
        throw error;
      }

      console.log('Found users:', data?.length || 0);
      return { data, error: null };
    } catch (error) {
      console.error('Error loading users:', error);
      return { data: null, error };
    }
  }

  async getCurrentUserRole(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      console.log('Current user role:', profile?.role);
      return profile?.role || null;
    } catch (error) {
      console.error('Error getting current user role:', error);
      return null;
    }
  }

  async createUser(email: string, password: string, fullName: string, role: string) {
    try {
      const schema = getCurrentSchema();
      console.log('Creating user in schema:', schema);
      
      // Get current user's role
      const currentRole = await this.getCurrentUserRole();
      console.log('Current user role:', currentRole);

      if (currentRole !== 'admin') {
        console.error('User is not an admin. Current role:', currentRole);
        throw new Error('Unauthorized: Admin access required');
      }

      // First create the auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role.toLowerCase()
          }
        }
      });

      if (signUpError) {
        console.error('Error creating auth user:', signUpError);
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('No user data returned from auth signup');
      }

      console.log('Auth user created:', authData.user.id);

      // Now create the profile using our RPC function
      const { data: profileData, error: profileError } = await supabase
        .rpc('create_new_user', {
          p_email: email,
          p_password: password,
          p_full_name: fullName,
          p_role: role.toLowerCase(),
          p_schema: schema
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // Try to clean up auth user if profile creation fails
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          console.error('Failed to clean up auth user:', cleanupError);
        }
        throw profileError;
      }

      console.log('User profile created successfully:', profileData);
      return { data: profileData, error: null };
    } catch (error) {
      console.error('Error in createUser:', error);
      return { 
        data: null, 
        error: {
          message: error instanceof Error ? error.message : 'Error creating user',
          code: error instanceof Error && 'code' in error ? (error as any).code : 'unknown'
        }
      };
    }
  }

  async updateUser(userId: string, updates: Partial<Usuario>) {
    try {
      const schema = getCurrentSchema();
      console.log('Updating user in schema:', schema);

      const { data, error } = await supabase
        .rpc('manage_user_profile', {
          p_user_id: userId,
          p_action: 'update',
          p_data: {
            ...updates,
            role: updates.role?.toLowerCase() // Ensure role is lowercase
          }
        });

      if (error) {
        console.error('Error in updateUser:', error);
        throw error;
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error };
    }
  }

  async deleteUser(userId: string) {
    try {
      const { data, error } = await supabase
        .rpc('manage_user_profile', {
          p_user_id: userId,
          p_action: 'delete'
        });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error);
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error };
    }
  }

  async validateSchemaAccess(userId: string): Promise<boolean> {
    try {
      const schema = getCurrentSchema();
      console.log('Validating schema access for user:', userId, 'in schema:', schema);

      const { data, error } = await supabase
        .from('profiles')
        .select('role, schema_name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error validating schema access:', error);
        return false;
      }

      if (!data) {
        console.log('No profile found for user in schema:', schema);
        return false;
      }

      // Admins can access all schemas
      if (data.role === 'admin') {
        console.log('User is admin, access granted to all schemas');
        return true;
      }

      // Regular users must match schema
      const hasAccess = data.schema_name === schema;
      console.log('Schema access validation result:', hasAccess);
      return hasAccess;
    } catch (error) {
      console.error('Error in validateSchemaAccess:', error);
      return false;
    }
  }
}

export const usersAPI = new UsersAPI();