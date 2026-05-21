// src/middleware.ts
// Middleware simplificado e organizado para autenticação
// Data: 2024-12-23
// Versão: 2.0 - Reorganizada

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createStandardErrorResponse, attachSecurityHeaders } from '@/middleware/shared/helpers'
import { createMiddlewareSupabaseClient } from '@/lib/supabase/clients/middleware'
import { logger } from '@/utils/production-logger'


// === LOGS DE DEBUG ADICIONADOS ===
const DEBUG_AUTH = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG_AUTH) {
    logger.debug(`[MIDDLEWARE DEBUG] ${new Date().toISOString()} - ${message}`, data || '', "DEBUG");
  }
}

function debugError(message: string, error?: any) {
  if (DEBUG_AUTH) {
    console.error(`[MIDDLEWARE ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  }
}
// === FIM DOS LOGS DE DEBUG ===
// =====================================================
// LISTAS DE ROTAS — Política default-deny (Fase 1)
// Tudo exige autenticação, exceto o que estiver explicitamente público.
// =====================================================

const PUBLIC_PAGE_PREFIXES = [
  '/login',
  '/register',
  '/reset-password',
  '/auth',
  '/privacy-policy',
  '/terms',
  '/favicon.ico',
  '/_next',
  '/public',
  '/static',
  '/@vite',
]

const AUTH_ROUTES = [
  '/login',
  '/register',
  '/auth/login',
  '/auth/register',
  '/reset-password',
]

/** APIs acessíveis sem sessão Supabase (auth própria ou health check) */
const PUBLIC_API_PREFIXES = [
  '/api/auth',
  '/api/health',
  '/api/status',
]

/** Webhooks — validam assinatura na própria rota */
const WEBHOOK_API_PREFIXES = [
  '/api/gates2b/webhook',
  '/api/bpix/webhook', // legado → redirect em next.config
  '/api/thebest/webhook',
  '/api/webhooks/cakto',
]

/** Checkout público (área do cliente) */
const PUBLIC_CHECKOUT_API_PREFIXES = ['/api/public/checkout']

/** APIs com autenticação por API key na rota (não sessão Supabase) */
const API_KEY_AUTH_PREFIXES = ['/api/v1/bot']

const ADMIN_API_PREFIXES = ['/api/admin']

/** Rotas de desenvolvimento — bloqueadas em producao (Fase 2) */
const DEV_ONLY_PAGE_PREFIXES = ['/test-auth', '/test-delete', '/examples']

// =====================================================
// HELPERS DE ROTA
// =====================================================

function isDevOnlyRoute(pathname: string): boolean {
  return DEV_ONLY_PAGE_PREFIXES.some((route) => pathname.startsWith(route))
}

function isPublicPage(pathname: string): boolean {
  if (pathname === '/') return true
  if (pathname.startsWith('/cliente/')) return true
  return PUBLIC_PAGE_PREFIXES.some((route) => pathname.startsWith(route))
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route))
}

function isPublicApi(pathname: string): boolean {
  return (
    PUBLIC_API_PREFIXES.some((route) => pathname.startsWith(route)) ||
    PUBLIC_CHECKOUT_API_PREFIXES.some((route) => pathname.startsWith(route)) ||
    WEBHOOK_API_PREFIXES.some((route) => pathname.startsWith(route)) ||
    API_KEY_AUTH_PREFIXES.some((route) => pathname.startsWith(route))
  )
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

function requiresAuthentication(pathname: string): boolean {
  if (isPublicPage(pathname)) return false
  if (isApiRoute(pathname)) return !isPublicApi(pathname)
  return true
}

function isAdminApiRoute(pathname: string): boolean {
  return ADMIN_API_PREFIXES.some((route) => pathname.startsWith(route))
}

// =====================================================
// SUPABASE CLIENT - Usando cliente consolidado
// =====================================================

// =====================================================
// VERIFICAR ADMIN
// =====================================================

async function isUserAdmin(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    return profile?.role === 'admin'
  } catch (error) {
    console.error('Erro ao verificar role de admin:', error)
    return false
  }
}

// =====================================================
// MIDDLEWARE PRINCIPAL
// =====================================================

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  logger.debug(`🔍 Middleware: Verificando rota ${pathname}`, undefined, "DEBUG")
  
  // Criar resposta base
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })
  
  // =====================================================
  // 1. VERIFICAR ROTAS PÚBLICAS
  // =====================================================
  
  // Bloquear rotas de teste em producao
  if (process.env.NODE_ENV === 'production' && isDevOnlyRoute(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Permitir rota raiz
  if (pathname === '/') {
    logger.debug(`✅ Middleware: Rota raiz permitida`, undefined, "DEBUG")
    return response
  }
  
  // Permitir páginas públicas
  if (isPublicPage(pathname)) {
    logger.debug(`✅ Middleware: Página pública permitida: ${pathname}`, undefined, "DEBUG")
    return response
  }

  // Permitir APIs públicas / webhooks / bot (auth na rota)
  if (isApiRoute(pathname) && isPublicApi(pathname)) {
    logger.debug(`✅ Middleware: API pública permitida: ${pathname}`, undefined, "DEBUG")
    return response
  }

  // =====================================================
  // 2. DEFAULT-DENY — exige autenticação
  // =====================================================

  if (!requiresAuthentication(pathname)) {
    return response
  }
  
  // =====================================================
  // 3. VERIFICAR AUTENTICAÇÃO
  // =====================================================
  
  const { supabase } = createMiddlewareSupabaseClient(req)
  let user = null
  let authError = null
  
  try {
    // Primeiro, tentar autenticação por cookie (sessão web)
    const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
    
    if (cookieUser && !cookieError) {
      user = cookieUser
      logger.debug(`✅ Middleware: Usuário autenticado via cookie: ${user.email}`, undefined, "DEBUG")
    } else {
      // Se não há cookie, verificar token JWT no header Authorization
      const authHeader = req.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        console.log(`🔍 Middleware: Verificando token JWT: ${token.substring(0, 20)}...`)
        
        try {
          const { data: { user: jwtUser }, error: jwtError } = await supabase.auth.getUser(token)
          if (jwtUser && !jwtError) {
            user = jwtUser
            console.log(`✅ Middleware: Usuário autenticado via JWT: ${user.email}`)
          } else {
            console.log(`❌ Middleware: Token JWT inválido:`, jwtError)
            authError = jwtError
          }
        } catch (jwtErr) {
          console.log(`❌ Middleware: Erro ao verificar JWT:`, jwtErr)
          authError = jwtErr
        }
      } else {
        logger.debug(`❌ Middleware: Nenhum token encontrado (cookie ou JWT, undefined, "DEBUG")`)
        authError = cookieError
      }
    }
    
    // Usuário não autenticado
    if (!user || authError) {
      logger.debug(`❌ Middleware: Usuário não autenticado: ${pathname}`, undefined, "DEBUG")
      
      // Para APIs, retornar 401
      if (isApiRoute(pathname)) {
        return createStandardErrorResponse(
          'Não autorizado',
          'Você precisa estar autenticado para acessar esta API.',
          401
        )
      }
      
      // Para páginas, redirecionar para login
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
      
      if (pathname !== '/') {
        loginUrl.searchParams.set('from', pathname)
      }
      
      return NextResponse.redirect(loginUrl)
    }
    
    // =====================================================
    // 4. USUÁRIO AUTENTICADO
    // =====================================================
    
    logger.debug(`✅ Middleware: Usuário autenticado: ${user.email}`, undefined, "DEBUG")
    
    // Redirecionar usuários autenticados das páginas de auth
    if (isAuthRoute(pathname)) {
      logger.debug(`🔄 Middleware: Redirecionando usuário autenticado para dashboard`, undefined, "DEBUG")
      const dashboardUrl = req.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }
    
    // Redirecionar da página inicial para dashboard
    if (pathname === '/') {
      logger.debug(`🔄 Middleware: Redirecionando da página inicial para dashboard`, undefined, "DEBUG")
      const dashboardUrl = req.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }
    
    // =====================================================
    // 5. VERIFICAR PERMISSÕES DE ADMIN
    // =====================================================
    
    if (isAdminApiRoute(pathname)) {
      const isAdmin = await isUserAdmin(supabase, user.id)
      
      if (!isAdmin) {
        logger.warn(`🚫 Acesso negado para ${user.email} em ${pathname}`, undefined, "WARN")
        return createStandardErrorResponse(
          'Acesso negado',
          'Permissão de administrador necessária para acessar este recurso.',
          403
        )
      }
      
      logger.debug(`👑 Middleware: Acesso de admin autorizado para ${user.email}`, undefined, "DEBUG")
    }
    
    // =====================================================
    // 6. ADICIONAR HEADERS DE SEGURANÇA
    // =====================================================
    
    // Headers básicos de segurança (usando helper compartilhado)
    response = attachSecurityHeaders(response)
    
    // CORS restrito para APIs autenticadas
    if (pathname.startsWith('/api/')) {
      const allowedOrigin =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    
    // =====================================================
    // 7. LOG DE SEGURANÇA
    // =====================================================
    
    // Log para ações importantes
    if (isAdminApiRoute(pathname) || 
        pathname.includes('delete') || 
        pathname.includes('update')) {
      logger.debug(`🔐 Log de segurança: ${req.method} ${pathname} por ${user.email}`, undefined, "DEBUG")
    }
    
    return response
    
  } catch (error) {
    console.error(`🚨 Middleware: Erro na verificação:`, error)
    
    // Para APIs, retornar erro
    if (isApiRoute(pathname)) {
      return createStandardErrorResponse(
        'Erro de autenticação',
        'Ocorreu um erro ao verificar sua sessão. Tente novamente.',
        500
      )
    }
    
    // Para páginas, redirecionar para login
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }
}

// =====================================================
// CONFIGURAÇÃO DO MATCHER
// =====================================================

export const config = {
  matcher: [
    /*
     * Aplicar middleware a todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - arquivos de imagem (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/api/:path*',
  ],
}

// =====================================================
// NOTAS DE IMPLEMENTAÇÃO:
// =====================================================
// 
// 1. Middleware simplificado e organizado
