// src/lib/supabase-client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

// Função para criar um cliente Supabase no lado do cliente
export function createClientSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Função para obter o usuário atual no lado do cliente
export async function getClientUser() {
  try {
    const supabase = createClientSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao obter sessão do usuário:', error);
      return null;
    }
    
    if (!session?.user) {
      console.log('Nenhuma sessão ativa encontrada');
      return null;
    }
    
    console.log('Usuário obtido com sucesso:', session.user.email);
    return session.user;
  } catch (error) {
    console.error('Erro na função getClientUser:', error);
    return null;
  }
}

// Função para verificar se o usuário está autenticado no lado do cliente
export async function isClientAuthenticated() {
  const supabase = createClientSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Função para fazer login com email e senha
export async function signInWithEmail(email: string, password: string) {
  const supabase = createClientSupabaseClient();
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

// Função para fazer registro com email e senha
export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClientSupabaseClient();
  return await supabase.auth.signUp({
    email,
    password,
  });
}

// Função para fazer logout
export async function signOut() {
  const supabase = createClientSupabaseClient();
  return await supabase.auth.signOut();
}

// Função para obter o papel (role) do usuário logado a partir da tabela profiles
export async function getClientUserRole() {
  const supabase = createClientSupabaseClient();
  const user = await getClientUser();
  if (!user) return null;
  
  // Admin principal é sempre admin automaticamente
  if (user.email === 'topplaytv7@gmail.com') {
    return 'admin';
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (error || !data) return null;
  return data.role as 'admin' | 'user';
}

// Função para obter se o usuário está aprovado na tabela profiles
export async function isClientUserApproved() {
  const supabase = createClientSupabaseClient();
  const user = await getClientUser();
  
  console.log('🔍 Verificando aprovação do usuário:', user?.email);
  
  if (!user) {
    console.log('❌ Usuário não encontrado');
    return false;
  }
  
  // Admin principal é sempre aprovado automaticamente
  if (user.email === 'topplaytv7@gmail.com') {
    console.log('👑 Admin principal detectado - aprovado automaticamente');
    
    // Tentar criar o perfil se não existir (ignorar erros de permissão)
    try {
      await supabase
        .from('profiles')
        .upsert({ id: user.id, user_id: user.id, role: 'admin' }, { onConflict: 'user_id' });
      console.log('✅ Perfil de admin criado/atualizado');
    } catch (error) {
      console.log('⚠️ Não foi possível criar perfil (modo somente leitura), mas admin aprovado');
    }
    
    return true;
  }
  
  try {
    console.log('🔍 Buscando perfil para ID:', user.id);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    console.log('📊 Resultado da consulta:', { data, error });
    
    // Se não encontrou o perfil
    if (error || !data) {
      console.log('❌ Perfil não encontrado para usuário comum');
      return false;
    }
    
    console.log('👤 Perfil encontrado com role:', data.role);
    
    // Administradores são automaticamente aprovados
    if (data.role === 'admin') {
      console.log('✅ Usuário é admin - aprovado');
      return true;
    }
    
    console.log('❌ Usuário não é admin - negado');
    return false;
    
  } catch (error) {
    console.error('💥 Erro ao verificar aprovação do usuário:', error);
    return false;
  }
}