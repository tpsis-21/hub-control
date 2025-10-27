// src/lib/supabase/clients/server.ts
// Cliente Supabase consolidado para uso no servidor (server-side)

import { createServerClient } from '@supabase/ssr';
import type { Database } from '../../database.types';
import { supabaseConfig } from '../config';
import { ServerCookieManager, getServerCookie, getAllServerCookies } from '../utils/cookies';
import { UserManager } from '../auth/user';
import { supabaseLogger } from '../utils/logger';
import { createServerSupabaseClient } from '../unified-client';

// Função para criar um cliente Supabase para Server Actions (com modificação de cookies)
export async function createServerSupabaseClientForActions() {
  const cookieManager = await ServerCookieManager.create();
  
  const client = createServerClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieManager.get(name);
        },
        set(name: string, value: string, options: any) {
          cookieManager.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieManager.remove(name, options);
        },
      },
    }
  );
  
  supabaseLogger.clientCreated('server-actions');
  return client;
}

// === FUNÇÕES DE USUÁRIO ===

// Função para obter o usuário atual no lado do servidor
export async function getServerUser() {
  const supabase = createServerSupabaseClient();
  const userManager = new UserManager(supabase);
  return await userManager.getCurrentUser();
}

// Função para verificar se o usuário está autenticado no lado do servidor
export async function isServerAuthenticated() {
  const supabase = createServerSupabaseClient();
  const userManager = new UserManager(supabase);
  return await userManager.isAuthenticated();
}

// Função para obter o role do usuário no servidor
export async function getServerUserRole() {
  const supabase = createServerSupabaseClient();
  const userManager = new UserManager(supabase);
  return await userManager.getUserRole();
}

// Função para verificar se o usuário é admin no servidor
export async function isServerUserAdmin() {
  const supabase = createServerSupabaseClient();
  const userManager = new UserManager(supabase);
  return await userManager.isUserAdmin();
}

// Função para verificar se o usuário está aprovado no servidor
export async function isServerUserApproved() {
  const supabase = createServerSupabaseClient();
  const userManager = new UserManager(supabase);
  return await userManager.isUserApproved();
}

// === FUNÇÕES DE COOKIES (compatibilidade) ===

// Função para obter todos os cookies
export async function getServerCookies() {
  return await getAllServerCookies();
}

// Função única para obter um cookie específico
export { getServerCookie };

// === EXPORTS PARA COMPATIBILIDADE ===

// Manter compatibilidade com imports existentes
export {
  createServerSupabaseClient,
  createServerSupabaseClient as createServerClient,
  createServerSupabaseClientForActions as createServerClientForActions,
};
