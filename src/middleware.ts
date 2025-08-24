// src/middleware.ts
// Middleware simplificado e organizado para autenticação
// Data: 2024-12-23
// Versão: 2.0 - Reorganizada

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createStandardErrorResponse, attachSecurityHeaders } from '@/middleware/shared/helpers'


// === LOGS DE DEBUG ADICIONADOS ===
const DEBUG_AUTH = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG_AUTH) {
    console.log(`[MIDDLEWARE DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
  }
}

function debugError(message: string, error?: any) {
  if (DEBUG_AUTH) {
    console.error(`[MIDDLEWARE ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  }
}
// === FIM DOS LOGS DE DEBUG ===
// =====================================================
// LISTAS DE ROTAS
// =====================================================

const PUBLIC_ROUTES = [
  '/login',
  '/register', 
  '/reset-password',
  '/auth',
  '/favicon.ico',
  '/_next',
  '/public',
  '/static',
  '/@vite'
]

const AUTH_ROUTES = [
  '/login',
  '/register',
  '/auth/login',
  '/auth/register',
  '/reset-password'
]

const PROTECTED_ROUTES = [
  '/dashboard',
  '/configuracoes',
  '/notificacoes',
  '/servidores',
  '/planos',
  '/testes',
  '/ajuda',
  '/clientes',
  '/admin',
  '/perfil'
]

const PUBLIC_API_ROUTES = [
  '/api/auth'
]

const PROTECTED_API_ROUTES = [
  '/api/admin',
  '/api/proxy',
  '/api/plan-groups',
  '/api/messages',
  '/api/push-notifications'
]

const ADMIN_API_ROUTES = [
  '/api/admin'
]

// =====================================================
// HELPERS DE ROTA
// =====================================================

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathname.startsWith(route))
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
}

function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route))
}

function isAdminApiRoute(pathname: string): boolean {
  return ADMIN_API_ROUTES.some(route => pathname.startsWith(route))
}

// =====================================================
// SUPABASE CLIENT
// =====================================================

function createSupabaseClient(req: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )
}

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
  
  console.log(`🔍 Middleware: Verificando rota ${pathname}`)
  
  // Criar resposta base
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })
  
  // =====================================================
  // 1. VERIFICAR ROTAS PÚBLICAS
  // =====================================================
  
  // Permitir rota raiz
  if (pathname === '/') {
    console.log(`✅ Middleware: Rota raiz permitida`)
    return response
  }
  
  // Permitir rotas públicas
  if (isPublicRoute(pathname)) {
    console.log(`✅ Middleware: Rota pública permitida: ${pathname}`)
    return response
  }
  
  // Permitir APIs públicas
  if (isPublicApiRoute(pathname)) {
    console.log(`✅ Middleware: API pública permitida: ${pathname}`)
    return response
  }
  
  // =====================================================
  // 2. VERIFICAR SE PRECISA DE AUTENTICAÇÃO
  // =====================================================
  
  const needsAuth = isProtectedRoute(pathname) || isProtectedApiRoute(pathname)
  
  if (!needsAuth) {
    console.log(`🟡 Middleware: Rota não categorizada, permitindo: ${pathname}`)
    return response
  }
  
  // =====================================================
  // 3. VERIFICAR AUTENTICAÇÃO
  // =====================================================
  
  const supabase = createSupabaseClient(req, response)
  let user = null
  let authError = null
  
  try {
    // Primeiro, tentar autenticação por cookie (sessão web)
    const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
    
    if (cookieUser && !cookieError) {
      user = cookieUser
      console.log(`✅ Middleware: Usuário autenticado via cookie: ${user.email}`)
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
        console.log(`❌ Middleware: Nenhum token encontrado (cookie ou JWT)`)
        authError = cookieError
      }
    }
    
    // Usuário não autenticado
    if (!user || authError) {
      console.log(`❌ Middleware: Usuário não autenticado: ${pathname}`)
      
      // Para APIs, retornar 401
      if (isProtectedApiRoute(pathname)) {
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
    
    console.log(`✅ Middleware: Usuário autenticado: ${user.email}`)
    
    // Redirecionar usuários autenticados das páginas de auth
    if (isAuthRoute(pathname)) {
      console.log(`🔄 Middleware: Redirecionando usuário autenticado para dashboard`)
      const dashboardUrl = req.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }
    
    // Redirecionar da página inicial para dashboard
    if (pathname === '/') {
      console.log(`🔄 Middleware: Redirecionando da página inicial para dashboard`)
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
        console.warn(`🚫 Acesso negado para ${user.email} em ${pathname}`)
        return createStandardErrorResponse(
          'Acesso negado',
          'Permissão de administrador necessária para acessar este recurso.',
          403
        )
      }
      
      console.log(`👑 Middleware: Acesso de admin autorizado para ${user.email}`)
    }
    
    // =====================================================
    // 6. ADICIONAR HEADERS DE SEGURANÇA
    // =====================================================
    
    // Headers básicos de segurança (usando helper compartilhado)
    response = attachSecurityHeaders(response)
    
    // CORS para APIs
    if (pathname.startsWith('/api/')) {
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    }
    
    // =====================================================
    // 7. LOG DE SEGURANÇA
    // =====================================================
    
    // Log para ações importantes
    if (isAdminApiRoute(pathname) || 
        pathname.includes('delete') || 
        pathname.includes('update')) {
      console.log(`🔐 Log de segurança: ${req.method} ${pathname} por ${user.email}`)
    }
    
    return response
    
  } catch (error) {
    console.error(`🚨 Middleware: Erro na verificação:`, error)
    
    // Para APIs, retornar erro
    if (isProtectedApiRoute(pathname)) {
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