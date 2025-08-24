// src/lib/supabase/clients/middleware.ts
// Cliente Supabase consolidado para uso em middleware do Next.js

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '../../database.types';
import { supabaseConfig } from '../config';
import { MiddlewareCookieManager } from '../utils/cookies';
import { UserManager } from '../auth/user';
import { supabaseLogger } from '../utils/logger';

// Função para criar um cliente Supabase no middleware
export function createMiddlewareSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const cookieManager = new MiddlewareCookieManager(request, response);

  const supabase = createServerClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieManager.get(name);
        },
        set(name: string, value: string, options: any) {
          cookieManager.set(name, value, options);
          
          // Criar nova response com cookies atualizados
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          // Aplicar o cookie na nova response
          response.cookies.set(name, value, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            ...options,
          });
        },
        remove(name: string, options: any) {
          cookieManager.remove(name, options);
          
          // Criar nova response com cookies atualizados
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          // Remover o cookie da nova response
          response.cookies.set(name, '', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
            ...options,
          });
        },
      },
    }
  );

  supabaseLogger.clientCreated('middleware');
  return { supabase, response };
}

// === FUNÇÕES DE USUÁRIO ===

// Função para obter o usuário no middleware
export async function getUser(request: NextRequest) {
  try {
    const { supabase } = createMiddlewareSupabaseClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      supabaseLogger.authError('getUser', error, undefined);
      return null;
    }
    
    if (user) {
      supabaseLogger.userOperation('getUser', user.id, user.email);
    }
    
    return user;
  } catch (error) {
    supabaseLogger.authError('getUser', error, undefined);
    return null;
  }
}

// Função para obter o usuário com response no middleware
export async function getUserWithResponse(request: NextRequest) {
  try {
    const { supabase, response } = createMiddlewareSupabaseClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      supabaseLogger.authError('getUserWithResponse', error, undefined);
      return { user: null, response };
    }
    
    if (user) {
      supabaseLogger.userOperation('getUserWithResponse', user.id, user.email);
    }
    
    return { user, response };
  } catch (error) {
    supabaseLogger.authError('getUserWithResponse', error, undefined);
    return { user: null, response: NextResponse.next() };
  }
}

// Função para verificar se o usuário está autenticado no middleware
export async function isMiddlewareAuthenticated(request: NextRequest): Promise<boolean> {
  const user = await getUser(request);
  return !!user;
}

// Função para obter o role do usuário no middleware
export async function getMiddlewareUserRole(request: NextRequest) {
  try {
    const { supabase } = createMiddlewareSupabaseClient(request);
    const userManager = new UserManager(supabase);
    return await userManager.getUserRole();
  } catch (error) {
    supabaseLogger.error('Erro ao obter role do usuário no middleware', error);
    return null;
  }
}

// Função para verificar se o usuário é admin no middleware
export async function isMiddlewareUserAdmin(request: NextRequest): Promise<boolean> {
  try {
    const { supabase } = createMiddlewareSupabaseClient(request);
    const userManager = new UserManager(supabase);
    return await userManager.isUserAdmin();
  } catch (error) {
    supabaseLogger.error('Erro ao verificar se usuário é admin no middleware', error);
    return false;
  }
}

// Função para verificar se o usuário está aprovado no middleware
export async function isMiddlewareUserApproved(request: NextRequest): Promise<boolean> {
  try {
    const { supabase } = createMiddlewareSupabaseClient(request);
    const userManager = new UserManager(supabase);
    return await userManager.isUserApproved();
  } catch (error) {
    supabaseLogger.error('Erro ao verificar aprovação do usuário no middleware', error);
    return false;
  }
}

// === EXPORTS PARA COMPATIBILIDADE ===

// Manter compatibilidade com imports existentes
export {
  createMiddlewareSupabaseClient as createClient,
};