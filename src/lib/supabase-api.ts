// src/lib/supabase-api.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Função para criar um cliente Supabase para manipuladores de rota (API)
export function createApiSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Função para obter o usuário atual em rotas de API
export async function getApiUser() {
  const supabase = createApiSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user;
}

// Função para verificar se o usuário está autenticado em rotas de API
export async function isApiAuthenticated() {
  const supabase = createApiSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Função createAdminSupabaseClient removida por segurança
// Service Role Key agora é usada apenas no backend
// Use os endpoints /api/admin/* para operações administrativas

// Função para verificar se o usuário atual é admin
export async function isUserAdmin(): Promise<boolean> {
  try {
    const supabase = createApiSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      return false;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    return profile?.role === 'admin';
  } catch (error) {
    console.error('Erro ao verificar se usuário é admin:', error);
    return false;
  }
}