import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth state...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session restoration error:', sessionError);
          throw sessionError;
        }

        if (session) {
          console.log('✅ Session restored successfully');
          setUser(session.user);
        } else {
          console.log('ℹ️ No active session found');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        setError('Error connecting to authentication service');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event);
      
      try {
        if (session) {
          console.log('✅ User authenticated:', session.user.email);
          setUser(session.user);
        } else {
          console.log('ℹ️ User signed out');
          setUser(null);
        }
        setError(null);
      } catch (error) {
        console.error('❌ Error in auth state change:', error);
        setError('Error updating authentication state');
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth listener');
      authListener.subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    loading,
    error,
  };
}