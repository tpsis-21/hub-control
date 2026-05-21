/**
 * Helpers de autenticação para API Routes (Fase 1 — Segurança)
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { cookieConfig } from '@/lib/supabase/config';

export async function getAuthenticatedApiUser(): Promise<User | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function createAuthenticatedApiClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...cookieConfig, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: '', ...cookieConfig, maxAge: 0, ...options });
        },
      },
    }
  );
}

type AuthResult =
  | { user: User; error: null }
  | { user: null; error: NextResponse };

export async function requireApiUser(): Promise<AuthResult> {
  const user = await getAuthenticatedApiUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'Não autorizado', message: 'Autenticação necessária.' },
        { status: 401 }
      ),
    };
  }
  return { user, error: null };
}

export async function requireApiAdmin(): Promise<AuthResult> {
  const result = await requireApiUser();
  if (result.error) return result;

  const supabase = await createAuthenticatedApiClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .or(`id.eq.${result.user.id},user_id.eq.${result.user.id}`)
    .maybeSingle();

  if (error || profile?.role !== 'admin') {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'Acesso negado', message: 'Permissão de administrador necessária.' },
        { status: 403 }
      ),
    };
  }
  return result;
}
