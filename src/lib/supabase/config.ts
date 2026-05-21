// src/lib/supabase/config.ts
// Configurações centralizadas para todos os clientes Supabase

/** JWT demo (Supabase local) — só para subir o app no CI sem secrets reais */
const CI_E2E_PLACEHOLDER_URL = 'https://ci-e2e-placeholder.supabase.co';
const CI_E2E_PLACEHOLDER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

function isE2eSmokeCi(): boolean {
  const flag = process.env.HUB_E2E_SMOKE_CI;
  return flag === 'true' || flag === '1';
}

function resolveSupabaseCredentials(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

  if (url && anonKey) {
    return { url, anonKey };
  }

  if (isE2eSmokeCi()) {
    return {
      url: url || CI_E2E_PLACEHOLDER_URL,
      anonKey: anonKey || CI_E2E_PLACEHOLDER_ANON_KEY,
    };
  }

  throw new Error('Variáveis de ambiente do Supabase não configuradas corretamente');
}

const resolved = resolveSupabaseCredentials();

export const supabaseConfig = {
  url: resolved.url,
  anonKey: resolved.anonKey,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  /** true quando o CI roda sem secrets do projeto (smoke UI/API apenas) */
  isCiPlaceholder: isE2eSmokeCi() && !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
} as const;

// Configurações de autenticação padrão
export const defaultAuthConfig = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'pkce' as const,
} as const;

// Configurações de cookies para SSR (httpOnly protege contra roubo via XSS)
export const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
} as const;

// Configuração de storage para cliente browser
export const storageConfig = {
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  storageKey: 'sb-session',
} as const;
