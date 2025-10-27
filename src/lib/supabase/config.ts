// src/lib/supabase/config.ts
// Configurações centralizadas para todos os clientes Supabase

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Opcional, apenas para operações admin
} as const;

// Configurações de autenticação padrão
export const defaultAuthConfig = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'pkce' as const,
} as const;

// Configurações de cookies para SSR
export const cookieConfig = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
} as const;

// Configuração de storage para cliente browser
export const storageConfig = {
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  storageKey: 'sb-session',
} as const;

// Email do admin principal (para verificações especiais)
export const ADMIN_EMAIL = 'topplaytv7@gmail.com';

// Validação de configuração
if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas corretamente');
}
