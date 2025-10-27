/**
 * Cliente Supabase Unificado e Centralizado
 * 
 * Este arquivo consolida todos os clientes Supabase em uma única interface,
 * eliminando duplicações e fornecendo uma API consistente para toda a aplicação.
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { supabaseConfig } from './config';
import { logger } from '@/lib/logger';

// Tipos para diferentes contextos de uso
type ClientContext = 'browser' | 'server' | 'api' | 'middleware' | 'test';

// Interface para configuração do cliente
interface ClientConfig {
  context: ClientContext;
  cookies?: {
    get: (name: string) => string | undefined;
    set: (name: string, value: string, options?: any) => void;
    remove: (name: string, options?: any) => void;
  };
  serviceRole?: boolean;
  enableLogging?: boolean;
}

// Cache de clientes para evitar recriações desnecessárias
const clientCache = new Map<string, any>();

// Função principal para criar cliente unificado
export function createUnifiedSupabaseClient(config: ClientConfig) {
  const cacheKey = `${config.context}-${config.serviceRole ? 'service' : 'anon'}`;
  
  // Verificar cache primeiro
  if (clientCache.has(cacheKey)) {
    if (config.enableLogging) {
      logger.debug(`Reutilizando cliente Supabase em cache: ${cacheKey}`);
    }
    return clientCache.get(cacheKey);
  }

  let client;
  
  // SEGURANÇA: Service Role Key nunca deve ser usada no browser
  if (config.context === 'browser' && config.serviceRole) {
    logger.error('ERRO DE SEGURANÇA: Tentativa de usar service role key no browser');
    throw new Error('Service role key não pode ser usada no contexto do browser por motivos de segurança');
  }
  
  const apiKey = config.serviceRole ? supabaseConfig.serviceRoleKey : supabaseConfig.anonKey;
  
  if (!apiKey) {
    throw new Error(`API key não configurada para contexto ${config.context} com serviceRole=${config.serviceRole}`);
  }

  switch (config.context) {
    case 'browser':
      client = createBrowserClient<Database>(
        supabaseConfig.url,
        supabaseConfig.anonKey // Sempre usar anon key no browser
      );
      break;

    case 'server':
      client = createServerClient<Database>(
        supabaseConfig.url,
        apiKey,
        {
          cookies: config.cookies || {
            get: () => undefined,
            set: () => {},
            remove: () => {}
          }
        }
      );
      break;

    case 'api':
    case 'middleware':
    case 'test':
    default:
      client = createSupabaseClient<Database>(
        supabaseConfig.url,
        apiKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );
      break;
  }

  // Armazenar no cache
  clientCache.set(cacheKey, client);
  
  if (config.enableLogging) {
    logger.debug(`Cliente Supabase criado: ${cacheKey}`);
  }

  return client;
}

// === CLIENTES PRÉ-CONFIGURADOS ===

// Cliente para uso no browser (componentes React)
export function createBrowserSupabaseClient(cookies?: ClientConfig['cookies']) {
  return createUnifiedSupabaseClient({
    context: 'browser',
    cookies,
    enableLogging: process.env.NODE_ENV === 'development'
  });
}

// Cliente para uso no servidor (Server Components, Server Actions)
export function createServerSupabaseClient(cookies?: ClientConfig['cookies']) {
  return createUnifiedSupabaseClient({
    context: 'server',
    cookies,
    enableLogging: process.env.NODE_ENV === 'development'
  });
}

// Cliente para uso em API routes
export function createApiSupabaseClient(serviceRole: boolean = false) {
  return createUnifiedSupabaseClient({
    context: 'api',
    serviceRole,
    enableLogging: process.env.NODE_ENV === 'development'
  });
}

// Cliente para uso em middleware
export function createMiddlewareSupabaseClient() {
  return createUnifiedSupabaseClient({
    context: 'middleware',
    enableLogging: process.env.NODE_ENV === 'development'
  });
}

// Cliente para testes
export function createTestSupabaseClient(serviceRole: boolean = true) {
  return createUnifiedSupabaseClient({
    context: 'test',
    serviceRole,
    enableLogging: false
  });
}

// === UTILITÁRIOS DE GERENCIAMENTO ===

// Limpar cache de clientes (útil para testes)
export function clearClientCache() {
  clientCache.clear();
  logger.debug('Cache de clientes Supabase limpo');
}

// Obter estatísticas do cache
export function getClientCacheStats() {
  return {
    size: clientCache.size,
    keys: Array.from(clientCache.keys())
  };
}

// Verificar se um cliente está em cache
export function isClientCached(context: ClientContext, serviceRole: boolean = false) {
  const cacheKey = `${context}-${serviceRole ? 'service' : 'anon'}`;
  return clientCache.has(cacheKey);
}

// === FUNÇÕES DE CONVENIÊNCIA ===

// Obter cliente baseado no ambiente
export function getSupabaseClient() {
  // Detectar ambiente automaticamente
  if (typeof window !== 'undefined') {
    // Browser environment
    return createBrowserSupabaseClient();
  } else {
    // Server environment
    return createApiSupabaseClient();
  }
}

// Obter cliente com service role (para operações administrativas)
export function getAdminSupabaseClient() {
  return createApiSupabaseClient(true);
}

// === MIGRAÇÃO E COMPATIBILIDADE ===

// Função para migrar código existente
export function migrateToUnifiedClient(oldClientType: string) {
  const migrationMap: Record<string, () => any> = {
    'supabase-client': () => createBrowserSupabaseClient(),
    'supabase-server': () => createServerSupabaseClient(),
    'supabase-api': () => createApiSupabaseClient(),
    'supabase-middleware': () => createMiddlewareSupabaseClient()
  };

  const migrationFn = migrationMap[oldClientType];
  if (!migrationFn) {
    logger.warn(`Tipo de cliente desconhecido para migração: ${oldClientType}`);
    return getSupabaseClient();
  }

  logger.info(`Migrando cliente ${oldClientType} para cliente unificado`);
  return migrationFn();
}

// === VALIDAÇÃO E MONITORAMENTO ===

// Validar configuração do Supabase
export function validateSupabaseConfig() {
  const errors: string[] = [];

  if (!supabaseConfig.url) {
    errors.push('URL do Supabase não configurada');
  }

  if (!supabaseConfig.anonKey) {
    errors.push('Chave anônima do Supabase não configurada');
  }

  // Service role key é opcional - apenas necessária para operações administrativas no backend
  if (!supabaseConfig.serviceRoleKey) {
    logger.warn('Service role key não configurada - operações administrativas não estarão disponíveis');
  }

  if (errors.length > 0) {
    console.error('Configuração do Supabase inválida:', errors.join(', '));
    throw new Error(`Configuração do Supabase inválida: ${errors.join(', ')}`);
  }

  logger.info('Configuração do Supabase validada com sucesso');
  return true;
}

// Monitorar uso dos clientes
let usageStats = {
  browser: 0,
  server: 0,
  api: 0,
  middleware: 0,
  test: 0
};

export function trackClientUsage(context: ClientContext) {
  usageStats[context]++;
}

export function getUsageStats() {
  return { ...usageStats };
}

export function resetUsageStats() {
  usageStats = {
    browser: 0,
    server: 0,
    api: 0,
    middleware: 0,
    test: 0
  };
}

// === FUNÇÕES DE USUÁRIO ESPECÍFICAS ===

// Importar funções específicas dos clientes antigos para compatibilidade
import { 
  getBrowserUser, 
  getBrowserUserRole, 
  isBrowserUserAdmin, 
  isBrowserUserApproved 
} from './clients/browser';
import { 
  getServerUser, 
  getServerUserRole, 
  isServerUserAdmin, 
  isServerUserApproved 
} from './clients/server';

// Re-exportar funções específicas para compatibilidade
export {
  getBrowserUser,
  getBrowserUserRole, 
  isBrowserUserAdmin,
  isBrowserUserApproved,
  getServerUser,
  getServerUserRole,
  isServerUserAdmin,
  isServerUserApproved
};

// Função específica para Server Actions (com modificação de cookies)
export function createServerSupabaseClientForActions(cookies?: ClientConfig['cookies']) {
  return createUnifiedSupabaseClient({
    context: 'server',
    cookies,
    enableLogging: process.env.NODE_ENV === 'development'
  });
}

// === EXPORTS PRINCIPAIS ===

// Todas as funções já são exportadas individualmente acima
// Removido bloco de re-exportação para evitar duplicatas

// Cliente padrão para compatibilidade
export default getSupabaseClient();

// === DOCUMENTAÇÃO DE USO ===

/**
 * GUIA DE USO:
 * 
 * 1. Para componentes React (browser):
 *    import { createBrowserSupabaseClient } from '@/lib/supabase/unified-client';
 *    const supabase = createBrowserSupabaseClient();
 * 
 * 2. Para Server Components/Actions:
 *    import { createServerSupabaseClient } from '@/lib/supabase/unified-client';
 *    const supabase = createServerSupabaseClient(cookies);
 * 
 * 3. Para API routes:
 *    import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
 *    const supabase = createApiSupabaseClient();
 * 
 * 4. Para operações administrativas:
 *    import { getAdminSupabaseClient } from '@/lib/supabase/unified-client';
 *    const supabase = getAdminSupabaseClient();
 * 
 * 5. Para testes:
 *    import { createTestSupabaseClient } from '@/lib/supabase/unified-client';
 *    const supabase = createTestSupabaseClient();
 */
