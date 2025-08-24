// src/lib/supabase/clients/api.ts
// Cliente Supabase consolidado para uso em API routes

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types';
import { supabaseConfig } from '../config';
import { UserManager } from '../auth/user';
import { supabaseLogger } from '../utils/logger';

// Cliente Supabase para manipuladores de rota (API)
let apiClient: ReturnType<typeof createClient<Database>> | null = null;

export function createApiSupabaseClient() {
  if (!apiClient) {
    apiClient = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey
    );
    supabaseLogger.clientCreated('api');
  }
  return apiClient;
}

// Manager de usuário para cliente API
const apiUserManager = new UserManager(createApiSupabaseClient());

// === FUNÇÕES DE USUÁRIO ===

// Função para obter o usuário atual em rotas de API
export async function getApiUser() {
  return await apiUserManager.getCurrentUser();
}

// Função para verificar se o usuário está autenticado em rotas de API
export async function isApiAuthenticated() {
  return await apiUserManager.isAuthenticated();
}

// Função para obter o role do usuário em rotas de API
export async function getApiUserRole() {
  return await apiUserManager.getUserRole();
}

// Função para verificar se o usuário atual é admin
export async function isApiUserAdmin(): Promise<boolean> {
  return await apiUserManager.isUserAdmin();
}

// Alias para compatibilidade
export { isApiUserAdmin as isUserAdmin };

// Função para verificar se o usuário está aprovado em rotas de API
export async function isApiUserApproved() {
  return await apiUserManager.isUserApproved();
}

// Função para obter perfil do usuário em rotas de API
export async function getApiUserProfile(userId?: string) {
  return await apiUserManager.getUserProfile(userId);
}

// === FUNÇÕES ADMINISTRATIVAS ===

// Função para verificar se um usuário específico é admin (por ID)
export async function isUserAdminById(userId: string): Promise<boolean> {
  return await apiUserManager.isUserAdmin(userId);
}

// Função para verificar se um usuário específico está aprovado (por ID)
export async function isUserApprovedById(userId: string): Promise<boolean> {
  return await apiUserManager.isUserApproved(userId);
}

// === EXPORTS PARA COMPATIBILIDADE ===

// Manter compatibilidade com imports existentes
export {
  createApiSupabaseClient as createClient,
  createApiSupabaseClient as supabase,
};

// Export do cliente padrão
export default createApiSupabaseClient();