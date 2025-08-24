// src/lib/supabase/utils/cookies.ts
// Utilitários centralizados para gerenciamento de cookies Supabase

// Importação condicional para evitar erro em client-side
let cookies: any;
if (typeof window === 'undefined') {
  // Só importa cookies no servidor
  cookies = require('next/headers').cookies;
}
import { NextRequest, NextResponse } from 'next/server';
import { cookieConfig } from '../config';
import { supabaseLogger } from './logger';

// Tipo para configuração de cookies
type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
  expires?: Date;
};

// Classe para gerenciamento de cookies no servidor
export class ServerCookieManager {
  private cookieStore: Awaited<ReturnType<typeof cookies>>;

  constructor(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    this.cookieStore = cookieStore;
  }

  static async create(): Promise<ServerCookieManager> {
    if (typeof window !== 'undefined') {
      throw new Error('ServerCookieManager só pode ser usado no servidor');
    }
    const cookieStore = await cookies();
    return new ServerCookieManager(cookieStore);
  }

  get(name: string): string | undefined {
    const value = this.cookieStore.get(name)?.value;
    supabaseLogger.cookieOperation('get', name, 'server');
    return value;
  }

  set(name: string, value: string, options?: CookieOptions): void {
    const finalOptions = { ...cookieConfig, ...options };
    this.cookieStore.set({ name, value, ...finalOptions });
    supabaseLogger.cookieOperation('set', name, 'server');
  }

  remove(name: string, options?: CookieOptions): void {
    const finalOptions = { ...cookieConfig, ...options, maxAge: 0 };
    this.cookieStore.set({ name, value: '', ...finalOptions });
    supabaseLogger.cookieOperation('remove', name, 'server');
  }

  getAll(): Record<string, string> {
    const allCookies: Record<string, string> = {};
    this.cookieStore.getAll().forEach((cookie: { name: string; value: string }) => {
      allCookies[cookie.name] = cookie.value;
    });
    return allCookies;
  }
}

// Classe para gerenciamento de cookies no middleware
export class MiddlewareCookieManager {
  private request: NextRequest;
  private response: NextResponse;

  constructor(request: NextRequest, response: NextResponse) {
    this.request = request;
    this.response = response;
  }

  get(name: string): string | undefined {
    const value = this.request.cookies.get(name)?.value;
    supabaseLogger.cookieOperation('get', name, 'middleware');
    return value;
  }

  set(name: string, value: string, options?: CookieOptions): void {
    const finalOptions = { ...cookieConfig, ...options };
    
    // Atualizar cookies na request
    this.request.cookies.set({ name, value, ...finalOptions });
    
    // Atualizar cookies na response
    this.response.cookies.set({ name, value, ...finalOptions });
    
    supabaseLogger.cookieOperation('set', name, 'middleware');
  }

  remove(name: string, options?: CookieOptions): void {
    const finalOptions = { ...cookieConfig, ...options };
    
    // Remover da request
    this.request.cookies.set({ name, value: '', ...finalOptions });
    
    // Remover da response
    this.response.cookies.set({ name, value: '', ...finalOptions });
    
    supabaseLogger.cookieOperation('remove', name, 'middleware');
  }
}

// Funções utilitárias para Server Actions
export async function getServerCookie(name: string): Promise<string | undefined> {
  const manager = await ServerCookieManager.create();
  return manager.get(name);
}

export async function setServerCookie(name: string, value: string, options?: CookieOptions): Promise<void> {
  const manager = await ServerCookieManager.create();
  manager.set(name, value, options);
}

export async function removeServerCookie(name: string, options?: CookieOptions): Promise<void> {
  const manager = await ServerCookieManager.create();
  manager.remove(name, options);
}

export async function getAllServerCookies(): Promise<Record<string, string>> {
  const manager = await ServerCookieManager.create();
  return manager.getAll();
}

// Função para criar configuração de cookies para clientes Supabase
export function createCookieConfig(readOnly: boolean = false) {
  return {
    get(name: string) {
      // Esta função será sobrescrita pelo contexto específico
      return undefined;
    },
    set(name: string, value: string, options: any) {
      if (readOnly) {
        // Em contextos de leitura, não modificar cookies
        return;
      }
      // Esta função será sobrescrita pelo contexto específico
    },
    remove(name: string, options: any) {
      if (readOnly) {
        // Em contextos de leitura, não modificar cookies
        return;
      }
      // Esta função será sobrescrita pelo contexto específico
    },
  };
}