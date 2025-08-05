// src/lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

// Função para criar um cliente Supabase no lado do servidor
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Não modificar cookies em funções de leitura
        },
        remove(name: string, options: any) {
          // Não modificar cookies em funções de leitura
        },
      },
    }
  );
}

// Função para criar um cliente Supabase para Server Actions
export async function createServerSupabaseClientForActions() {
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({
            name,
            value,
            ...options,
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
          })
        },
        remove(name: string, options: any) {
          cookieStore.set({
            name,
            value: '',
            ...options,
            maxAge: 0
          })
        },
      },
    }
  );
}

// Função para obter o usuário atual no lado do servidor
export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user;
}

// Função para verificar se o usuário está autenticado no lado do servidor
export async function isServerAuthenticated() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

export async function getServerCookies() {
  return await cookies();
}

// Função única para obter um cookie específico
export async function getServerCookie(name: string) {
  const cookieStore = await cookies();
  return cookieStore.get(name);
}

export async function getServerCookieValue(name: string) {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}