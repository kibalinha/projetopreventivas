import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Profile } from '../lib/supabase';
import { useAuth } from '../hooks/useSupabase';
import { useQueryClient } from '@tanstack/react-query';

type AuthContextType = {
  user: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, username: string, role: 'supervisor' | 'tecnico') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { signUp, signIn, signOut, getSession, onAuthStateChange } = useAuth();
  const queryClient = useQueryClient();

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setUser(data as Profile);
    } else {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const session = await getSession();
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const initAuth = async () => {
      const session = await getSession();
      if (session?.user?.id) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };
    initAuth();

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [onAuthStateChange, queryClient]);

  const handleSignUp = async (email: string, password: string, name: string, username: string, role: 'supervisor' | 'tecnico') => {
    await signUp(email, password, name, username, role);
  };

  const handleSignIn = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp: handleSignUp, signIn: handleSignIn, signOut: handleSignOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}