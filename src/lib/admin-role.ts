import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

type AdminCheckResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/**
 * Verifica sessão e role admin em profiles (sem backdoor por email/UUID).
 */
export async function requireAdminFromSession(
  supabase: SupabaseClient
): Promise<AdminCheckResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: 'Usuário não autenticado' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return { ok: false, error: 'Acesso negado: apenas administradores' };
  }

  return { ok: true, user };
}

export async function isProfileAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle();

  return profile?.role === 'admin';
}
