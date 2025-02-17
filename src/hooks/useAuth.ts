import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          localStorage.setItem('supabase.auth.token', session.access_token);
        }
        if (session?.refresh_token) {
          localStorage.setItem('supabase.auth.refreshToken', session.refresh_token);
        }
        
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting auth session:', error);
        setError('Error connecting to authentication service');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        localStorage.setItem('supabase.auth.token', session.access_token);
      }
      if (session?.refresh_token) {
        localStorage.setItem('supabase.auth.refreshToken', session.refresh_token);
      }
      
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    loading,
    error,
  };
}