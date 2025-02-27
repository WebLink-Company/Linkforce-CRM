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

  async createUser(email: string, password: string, fullName: string, role: string) {
    try {
      const schema = getCurrentSchema();
      console.log('Creating user in schema:', schema);
      
      // Create auth user with schema metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            schema_name: schema
          }
        }
      });

      if (signUpError) {
        console.error('Error in auth signup:', signUpError);
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      console.log('User created successfully in schema:', schema);
      return { data: authData.user, error: null };
    } catch (error) {
      console.error('Error creating user:', error);
      return { data: null, error };
    }
  }

  async updateUser(userId: string, updates: Partial<Usuario>) {
    try {
      const schema = getCurrentSchema();
      console.log('Updating user in schema:', schema);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error in updateUser:', updateError);
        throw updateError;
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error };
    }
  }

  async deleteUser(userId: string) {
    try {
      const schema = getCurrentSchema();
      console.log('Deleting user from schema:', schema);

      // Delete auth user (this will trigger cascade delete of profile)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) {
        console.error('Error in deleteUser:', error);
        throw error;
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