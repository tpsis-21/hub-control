// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  console.log(`🔍 Middleware: Verificando rota ${pathname}`);
  
  // Rotas que não precisam de autenticação
  const publicPaths = [
    '/login', 
    '/register', 
    '/favicon.ico', 
    '/_next', 
    '/public', 
    '/reset-password',
    '/static',
    '/cliente',
    '/@vite'
  ];
  
  // Rota raiz específica
  const isRootPath = pathname === '/';
  
  // Rotas de API que não precisam de autenticação
  const publicApiPaths = [
    '/api/auth'
  ];
  
  // Rotas de API que precisam de autenticação
  const protectedApiPaths = [
    '/api/plan-groups'
  ];
  
  // Rotas que precisam de autenticação mas são permitidas temporariamente
  const protectedPaths = [
    '/configuracoes',
    '/dashboard',
    '/notificacoes',
    '/servidores',
    '/planos',
    '/testes',
    '/ajuda',
    '/clientes',
    '/admin'
  ];
  
  // Verificar se é uma rota de API protegida PRIMEIRO
  if (protectedApiPaths.some(path => pathname.startsWith(path))) {
    console.log(`🔒 Middleware: Rota de API protegida detectada: ${pathname}`);
    // Continuar para verificação de autenticação
  } else {
    // Permite acesso à rota raiz
    if (isRootPath) {
      console.log(`✅ Middleware: Rota raiz permitida: ${pathname}`);
      return NextResponse.next();
    }
    
    // Permite acesso a rotas públicas
    const matchedPublicPath = publicPaths.find(path => pathname.startsWith(path));
    if (matchedPublicPath) {
      console.log(`✅ Middleware: Rota pública permitida: ${pathname} (matched: ${matchedPublicPath})`);
      return NextResponse.next();
    }
    
    // Permite acesso a rotas de API públicas
    if (publicApiPaths.some(path => pathname.startsWith(path))) {
      console.log(`✅ Middleware: Rota de API pública permitida: ${pathname}`);
      return NextResponse.next();
    }
  }
  
  // Verificar se é uma rota protegida que precisa de autenticação
  const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path));
  const isProtectedApiRoute = protectedApiPaths.some(path => pathname.startsWith(path));
  
  if (!isProtectedRoute && !isProtectedApiRoute) {
    console.log(`🟡 Middleware: Rota não categorizada, permitindo: ${pathname}`);
    return NextResponse.next();
  }
  
  // Criar cliente Supabase simplificado
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0
          })
        },
      },
    }
  )

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (user && !error) {
      console.log(`✅ Middleware: Usuário autenticado: ${user.email}`);
      return response;
    }
    
    // Para rotas de API protegidas, retornar 401 em vez de redirecionamento
    if (isProtectedApiRoute) {
      console.log(`❌ Middleware: API não autenticada: ${pathname}`);
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    console.log(`❌ Middleware: Não autenticado, redirecionando ${pathname} -> /login`);
    
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    
    return NextResponse.redirect(loginUrl);
    
  } catch (error) {
    console.log(`🚨 Middleware: Erro na verificação:`, error);
    
    // Para rotas de API protegidas, retornar 401 em vez de redirecionamento
    if (isProtectedApiRoute) {
      return NextResponse.json(
        { error: 'Erro de autenticação' },
        { status: 401 }
      );
    }
    
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/api/:path*',
  ],
}