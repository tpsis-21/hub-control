// src/lib/supabase/clients/browser.ts
// Cliente Supabase consolidado para uso no browser (client-side)

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types';
import { createBrowserSupabaseClient } from '../unified-client';
import { supabaseConfig, defaultAuthConfig, storageConfig } from '../config';
import { UserManager, signInWithEmail, signUpWithEmail, signOut } from '../auth/user';
import { supabaseLogger } from '../utils/logger';
import { logger } from '@/utils/production-logger'


// === LOGS DE DEBUG ADICIONADOS ===
const DEBUG_AUTH = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG_AUTH) {
    logger.debug(`[SUPABASE CLIENT DEBUG] ${new Date().toISOString()} - ${message}`, data || '', "DEBUG");
  }
}
// === FIM DOS LOGS DE DEBUG ===
// Cliente browser otimizado para SSR (substitui supabase-client.ts)
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClientSupabaseClient() {
  if (!browserClient) {
    console.log('🔧 createClientSupabaseClient: Criando novo cliente browser...');
    console.log('🔧 createClientSupabaseClient: URL:', supabaseConfig.url);
    console.log('🔧 createClientSupabaseClient: AnonKey:', supabaseConfig.anonKey ? 'Configurada' : 'Não configurada');
    
    browserClient = createBrowserClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey
    );
    
    console.log('✅ createClientSupabaseClient: Cliente criado com sucesso');
    supabaseLogger.clientCreated('browser-ssr');
  } else {
    console.log('♻️ createClientSupabaseClient: Reutilizando cliente existente');
  }
  return browserClient;
}

// Cliente genérico com localStorage (substitui supabase.ts)
let genericClient: ReturnType<typeof createClient<Database>> | null = null;

export function createGenericSupabaseClient() {
  if (!genericClient) {
    genericClient = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        auth: {
          ...defaultAuthConfig,
          ...storageConfig,
        }
      }
    );
    supabaseLogger.clientCreated('browser-generic');
  }
  return genericClient;
}

// Instância padrão (compatibilidade com supabase.ts)
export const supabase = createGenericSupabaseClient();

// === INSTÂNCIAS DOS GERENCIADORES DE USUÁRIO ===

// Instância do gerenciador para cliente browser
console.log('🔧 Inicializando browserUserManager...');
const browserUserManager = new UserManager(createClientSupabaseClient());
console.log('✅ browserUserManager inicializado');

console.log('🔧 Inicializando genericUserManager...');
const genericUserManager = new UserManager(createGenericSupabaseClient());
console.log('✅ genericUserManager inicializado');

// === FUNÇÕES DO CLIENTE BROWSER (supabase-client.ts) ===

// Função para obter o usuário atual no lado do cliente
export async function getClientUser() {
  try {
    console.log('🔍 getClientUser: Iniciando obtenção do usuário...');
    const user = await browserUserManager.getCurrentUser();
    console.log('👤 getClientUser: Usuário obtido:', user ? { id: user.id, email: user.email } : 'null');
    return user;
  } catch (error) {
    console.error('❌ getClientUser: Erro ao obter usuário:', error);
    return null;
  }
}

// Função para verificar se o usuário está autenticado no lado do cliente
export async function isClientAuthenticated() {
  return await browserUserManager.isAuthenticated();
}

// Função para obter o papel (role) do usuário logado
export async function getClientUserRole() {
  return await browserUserManager.getUserRole();
}

// Função para obter se o usuário está aprovado
export async function isClientUserApproved() {
  return await browserUserManager.isUserApproved();
}

// === FUNÇÕES DO CLIENTE GENÉRICO (supabase.ts) ===

// Função para obter o usuário atual
export async function getCurrentUser() {
  return await genericUserManager.getCurrentUser();
}

// Função para verificar se o usuário está autenticado
export async function isAuthenticated() {
  return await genericUserManager.isAuthenticated();
}

// === FUNÇÕES DE AUTENTICAÇÃO COMPARTILHADAS ===

// Função para fazer login com email e senha (cliente browser)
export async function signInWithEmailClient(email: string, password: string) {
  const client = createClientSupabaseClient();
  return await signInWithEmail(client, email, password);
}

// Função para fazer registro com email e senha (cliente browser)
export async function signUpWithEmailClient(email: string, password: string) {
  const client = createClientSupabaseClient();
  return await signUpWithEmail(client, email, password);
}

// Função para fazer logout (cliente browser)
export async function signOutClient() {
  const client = createClientSupabaseClient();
  return await signOut(client);
}

// Função para fazer login com email e senha (cliente genérico)
export async function signInWithEmailGeneric(email: string, password: string) {
  const client = createGenericSupabaseClient();
  return await signInWithEmail(client, email, password);
}

// Função para fazer registro com email e senha (cliente genérico)
export async function signUpWithEmailGeneric(email: string, password: string) {
  const client = createGenericSupabaseClient();
  return await signUpWithEmail(client, email, password);
}

// Função para fazer logout (cliente genérico)
export async function signOutGeneric() {
  const client = createGenericSupabaseClient();
  return await signOut(client);
}

// === FUNÇÕES PRINCIPAIS PARA EXPORTAÇÃO ===

// Funções principais do browser client
// Nota: createBrowserSupabaseClient é exportado pelo unified-client.ts
export { createClientSupabaseClient as createBrowserSupabaseClient };
export { createGenericSupabaseClient as createSSRSupabaseClient };
export { getClientUser as getBrowserUser };
export { isClientAuthenticated as isBrowserAuthenticated };
export { getClientUserRole as getBrowserUserRole };
export async function isBrowserUserAdmin() {
  const role = await getClientUserRole();
  return role === 'admin';
}
export { isClientUserApproved as isBrowserUserApproved };
export async function getBrowserUserProfile() {
  return await browserUserManager.getUserProfile();
}

// Funções de autenticação do browser
export { signInWithEmailClient as browserSignIn };
export { signUpWithEmailClient as browserSignUp };
export { signOutClient as browserSignOut };

// === COMPATIBILIDADE COM CÓDIGO EXISTENTE ===

// Aliases para manter compatibilidade com supabase.ts
export { signInWithEmailGeneric as signInWithEmail };
export { signUpWithEmailGeneric as signUpWithEmail };
export { signOutGeneric as signOut };

// Export do cliente padrão para compatibilidade
export default supabase;
