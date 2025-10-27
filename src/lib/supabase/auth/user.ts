// src/lib/supabase/auth/user.ts
// Funções centralizadas para operações de usuário

import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL } from '../config';
import { supabaseLogger } from '../utils/logger';
import { logger } from '@/utils/production-logger'

// Tipos para operações de usuário
export interface UserProfile {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at?: string;
  updated_at?: string;
}

export interface AuthResult {
  user: User | null;
  error: any;
}

// Classe base para operações de usuário
export class UserManager {
  constructor(private supabase: SupabaseClient) {}

  // Obter usuário atual
  async getCurrentUser(): Promise<User | null> {
    try {
      console.log('🔍 UserManager.getCurrentUser: Iniciando obtenção da sessão...');
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      console.log('📊 UserManager.getCurrentUser: Resultado da sessão:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        error: error ? { message: error.message, name: error.name } : null
      });
      
      if (error) {
        console.error('❌ UserManager.getCurrentUser: Erro na sessão:', error);
        supabaseLogger.authError('getCurrentUser', error);
        return null;
      }

      if (session?.user) {
        console.log('✅ UserManager.getCurrentUser: Usuário encontrado na sessão:', {
          id: session.user.id,
          email: session.user.email
        });
        supabaseLogger.userOperation('getCurrentUser', session.user.id, session.user.email || undefined);
      } else {
        console.log('❌ UserManager.getCurrentUser: Nenhum usuário na sessão');
      }

      return session?.user || null;
    } catch (error) {
      console.error('❌ UserManager.getCurrentUser: Exceção capturada:', error);
      supabaseLogger.authError('getCurrentUser', error);
      return null;
    }
  }

  // Verificar se usuário está autenticado
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    const isAuth = !!user;
    
    supabaseLogger.userOperation('isAuthenticated', user?.id, user?.email);
    return isAuth;
  }

  // Obter perfil do usuário
  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    try {
      const targetUserId = userId || (await this.getCurrentUser())?.id;
      
      if (!targetUserId) {
        supabaseLogger.warn('getUserProfile: Usuário não encontrado');
        return null;
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) {
        supabaseLogger.error('Erro ao obter perfil do usuário', error, { userId: targetUserId });
        return null;
      }

      supabaseLogger.userOperation('getUserProfile', targetUserId);
      return data as UserProfile;
    } catch (error) {
      supabaseLogger.error('Erro na função getUserProfile', error as Error);
      return null;
    }
  }

  // Obter role do usuário
  async getUserRole(userId?: string): Promise<'admin' | 'user' | null> {
    try {
      const user = userId ? { id: userId } : await this.getCurrentUser();
      
      if (!user) {
        return null;
      }

      // Admin principal é sempre admin automaticamente
      const userEmail = userId ? null : (await this.getCurrentUser())?.email;
      if (userEmail === ADMIN_EMAIL) {
        supabaseLogger.userOperation('getUserRole', user.id, userEmail || undefined);
        return 'admin';
      }

      const profile = await this.getUserProfile(user.id);
      const role = profile?.role || null;
      
      supabaseLogger.userOperation('getUserRole', user.id, userEmail || undefined);
      return role;
    } catch (error) {
      supabaseLogger.error('Erro ao obter role do usuário', error as Error);
      return null;
    }
  }

  // Verificar se usuário é admin
  async isUserAdmin(userId?: string): Promise<boolean> {
    try {
      const role = await this.getUserRole(userId);
      const isAdmin = role === 'admin';
      
      supabaseLogger.userOperation('isUserAdmin', userId, undefined);
      return isAdmin;
    } catch (error) {
      supabaseLogger.error('Erro ao verificar se usuário é admin', error as Error);
      return false;
    }
  }

  // Verificar se usuário está aprovado
  async isUserApproved(userId?: string): Promise<boolean> {
    try {
      const user = userId ? { id: userId, email: null } : await this.getCurrentUser();
      
      if (!user) {
        supabaseLogger.warn('isUserApproved: Usuário não encontrado');
        return false;
      }

      // Admin principal é sempre aprovado automaticamente
      if (user.email === ADMIN_EMAIL) {
        supabaseLogger.userOperation('isUserApproved', user.id, user.email || undefined);
        
        // Tentar criar o perfil se não existir (ignorar erros de permissão)
        try {
          await this.supabase
            .from('profiles')
            .upsert({ id: user.id, user_id: user.id, role: 'admin' }, { onConflict: 'user_id' });
        } catch (error) {
          supabaseLogger.warn('Não foi possível criar perfil de admin (modo somente leitura)', { userId: user.id });
        }
        
        return true;
      }

      const profile = await this.getUserProfile(user.id);
      
      // Se não encontrou o perfil
      if (!profile) {
        supabaseLogger.warn('isUserApproved: Perfil não encontrado para usuário comum', { userId: user.id });
        return false;
      }

      // Administradores são automaticamente aprovados
      const isApproved = profile.role === 'admin';
      
      supabaseLogger.userOperation('isUserApproved', user.id, user.email || undefined);
      return isApproved;
    } catch (error) {
      supabaseLogger.error('Erro ao verificar aprovação do usuário', error as Error);
      return false;
    }
  }
}

// Funções utilitárias para operações de autenticação
export async function signInWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const result = await supabase.auth.signInWithPassword({ email, password });
    
    if (result.error) {
      supabaseLogger.authError('signInWithEmail', result.error, email);
    } else {
      supabaseLogger.authSuccess('signInWithEmail', email);
    }
    
    return { user: result.data.user, error: result.error };
  } catch (error) {
    supabaseLogger.authError('signInWithEmail', error, email);
    return { user: null, error };
  }
}

export async function signUpWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const result = await supabase.auth.signUp({ email, password });
    
    if (result.error) {
      supabaseLogger.authError('signUpWithEmail', result.error, email);
    } else {
      supabaseLogger.authSuccess('signUpWithEmail', email);
    }
    
    return { user: result.data.user, error: result.error };
  } catch (error) {
    supabaseLogger.authError('signUpWithEmail', error, email);
    return { user: null, error };
  }
}

export async function signOut(supabase: SupabaseClient): Promise<{ error: any }> {
  try {
    const result = await supabase.auth.signOut();
    
    if (result.error) {
      supabaseLogger.authError('signOut', result.error);
    } else {
      supabaseLogger.authSuccess('signOut');
    }
    
    return { error: result.error };
  } catch (error) {
    supabaseLogger.authError('signOut', error);
    return { error };
  }
}
