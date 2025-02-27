import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Efficiently restore session on mount
    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session restoration error:', sessionError);
          throw sessionError;
        }

        if (session) {
          // ✅ Store auth tokens in localStorage for persistence
          localStorage.setItem('supabase.auth.token', session.access_token);
          localStorage.setItem('supabase.auth.refreshToken', session.refresh_token);

          setUser(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setError('Error connecting to authentication service');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // ✅ Listen for authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session) {
          // ✅ Store tokens for session persistence
          localStorage.setItem('supabase.auth.token', session.access_token);
          localStorage.setItem('supabase.auth.refreshToken', session.refresh_token);
          setUser(session.user);
        } else {
          // ✅ Clear stored session if user logs out
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('supabase.auth.refreshToken');
          setUser(null);
        }
        setError(null);
      } catch (error) {
        console.error('Error in auth state change:', error);
        setError('Error updating authentication state');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    loading,
    error,
  };
}
