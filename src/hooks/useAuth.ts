// @/hooks/useAuth.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClientSupabaseClient } from "@/lib/supabase/clients/browser";
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/production-logger'

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  browserSignOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Cache para sessão
const SESSION_CACHE_KEY = 'hub_control_session';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

interface CachedSession {
  session: Session | null;
  user: User | null;
  timestamp: number;
}

function getCachedSession(): CachedSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(SESSION_CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedSession = JSON.parse(cached);
    const now = Date.now();
    
    // Verifica se o cache ainda é válido
    if (now - parsed.timestamp > CACHE_DURATION) {
      localStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_CACHE_KEY);
    return null;
  }
}

function setCachedSession(session: Session | null, user: User | null) {
  if (typeof window === 'undefined') return;
  
  const cached: CachedSession = {
    session,
    user,
    timestamp: Date.now()
  };
  
  try {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Falha silenciosa se localStorage não estiver disponível
  }
}

function clearCachedSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_CACHE_KEY);
}

export function useAuth(): AuthContextType {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false
  });
  
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  const updateAuthState = useCallback((session: Session | null, user: User | null) => {
    const isAuthenticated = !!(session && user);
    
    setAuthState({
      user,
      session,
      loading: false,
      isAuthenticated
    });
    
    // Atualiza o cache
    setCachedSession(session, user);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Erro ao obter sessão:', error);
        updateAuthState(null, null);
        return;
      }
      
      updateAuthState(session, session?.user || null);
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
      updateAuthState(null, null);
    }
  }, [supabase.auth, updateAuthState]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return { error: error.message };
      }
      
      updateAuthState(data.session, data.user);
      
      // Redireciona para dashboard após login bem-sucedido
      router.push('/dashboard');
      
      return {};
    } catch (error) {
      console.error('Erro no login:', error);
      return { error: 'Erro interno do servidor' };
    }
  }, [supabase.auth, updateAuthState, router]);

  const browserSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      updateAuthState(null, null);
      clearCachedSession();
      router.push('/auth/login');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }, [supabase.auth, updateAuthState, router]);

  useEffect(() => {
    // Primeiro, tenta carregar do cache
    const cached = getCachedSession();
    if (cached && cached.session && cached.user) {
      setAuthState({
        user: cached.user,
        session: cached.session,
        loading: false,
        isAuthenticated: true
      });
      
      // Valida a sessão em background
      refreshSession();
    } else {
      // Se não há cache, busca a sessão
      refreshSession();
    }

    // Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('Auth state changed:', event);
        
        switch (event) {
          case 'SIGNED_IN':
            updateAuthState(session, session?.user || null);
            break;
          case 'SIGNED_OUT':
            updateAuthState(null, null);
            clearCachedSession();
            break;
          case 'TOKEN_REFRESHED':
            updateAuthState(session, session?.user || null);
            break;
          default:
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, refreshSession, updateAuthState]);

  return {
    ...authState,
    signIn,
    browserSignOut,
    refreshSession
  };
}

// Hook para verificar se o usuário está autenticado e redirecionar
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  return { isAuthenticated, loading };
}

// Hook para redirecionar usuários já autenticados
export function useRedirectIfAuthenticated() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  return { isAuthenticated, loading };
}
