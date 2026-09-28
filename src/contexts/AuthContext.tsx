import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Profile } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import bcrypt from 'bcryptjs';

type AuthContextType = {
  user: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createUser: (name: string, username: string, password: string, role: 'supervisor' | 'tecnico') => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Simple session storage key
const SESSION_KEY = 'preventiva_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check for existing session on load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const session = localStorage.getItem(SESSION_KEY);
        if (session) {
          const { userId } = JSON.parse(session);
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          if (!error && data) {
            setUser(data as Profile);
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const signIn = async (username: string, password: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      throw new Error('Usuário não encontrado');
    }

    const profile = data as Profile & { password_hash?: string };

    if (!profile.password_hash) {
      throw new Error('Usuário sem senha configurada');
    }

    const valid = await bcrypt.compare(password, profile.password_hash);
    if (!valid) {
      throw new Error('Senha incorreta');
    }

    // Remove password_hash from user object
    const { password_hash: _, ...userWithoutHash } = profile;
    setUser(userWithoutHash as Profile);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: profile.id }));
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    queryClient.clear();
  };

  const createUser = async (name: string, username: string, password: string, role: 'supervisor' | 'tecnico') => {
    // Check if username exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      throw new Error('Nome de usuário já existe');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        name,
        username,
        role,
        password_hash,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, createUser }}>
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