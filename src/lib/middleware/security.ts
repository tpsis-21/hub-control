// @/lib/middleware/security.ts
"use server";

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
// Removido: import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/security/rate-limit';
import { auditLog } from '@/lib/security/audit';
import { createStandardErrorResponse, attachSecurityHeaders } from '@/middleware/shared/helpers'

/**
 * Middleware de segurança para validação de autenticação e autorização
 */
export async function securityMiddleware(request: NextRequest) {
  try {
    // Extrair IP de forma segura (compatível com diferentes ambientes)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      (request as any).ip ||
      'unknown';

    // Verificar rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      await auditLog({
        action: 'RATE_LIMIT_EXCEEDED',
        userId: null,
        ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { path: request.nextUrl.pathname }
      });
      
      return attachSecurityHeaders(
        createStandardErrorResponse('RATE_LIMIT_EXCEEDED', 'Muitas requisições. Tente novamente mais tarde.', 429)
      );
    }

    // Criar resposta base para adaptação de cookies
    let response = NextResponse.next();

    // Verificar autenticação para rotas protegidas
    if (isProtectedRoute(request.nextUrl.pathname)) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              response.cookies.set(name, value, options);
            },
            remove(name: string, options: any) {
              response.cookies.set(name, '', { ...options, maxAge: 0 });
            },
          },
        }
      );
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        await auditLog({
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          userId: null,
          ip,
          userAgent: request.headers.get('user-agent') || 'unknown',
          details: { path: request.nextUrl.pathname }
        });
        
        return attachSecurityHeaders(
          createStandardErrorResponse('UNAUTHORIZED', 'Não autorizado', 401)
        );
      }

      // Log de acesso autorizado
      await auditLog({
        action: 'AUTHORIZED_ACCESS',
        userId: session.user.id,
        ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { path: request.nextUrl.pathname }
      });
    }

    // Anexa headers de segurança na resposta padrão
    response = attachSecurityHeaders(response);
    return response;
  } catch (error) {
    console.error('Security middleware error:', error);

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      (request as any).ip ||
      'unknown';
    
    await auditLog({
      action: 'SECURITY_MIDDLEWARE_ERROR',
      userId: null,
      ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { 
        path: request.nextUrl.pathname,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    
    return attachSecurityHeaders(
      createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500)
    );
  }
}

/**
 * Verifica se a rota é protegida e requer autenticação
 */
function isProtectedRoute(pathname: string): boolean {
  const protectedPaths = [
    '/api/clients',
    '/api/plans',
    '/api/servers',
    '/api/tests',
    '/api/notifications',
    '/api/upload',
    '/api/dashboard'
  ];
  
  return protectedPaths.some(path => pathname.startsWith(path));
}

/**
 * Middleware para validação de CSRF token
 */
export async function csrfMiddleware(request: NextRequest) {
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    const csrfToken = request.headers.get('x-csrf-token');
    const sessionToken = request.cookies.get('csrf-token')?.value;

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      (request as any).ip ||
      'unknown';
    
    if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
      await auditLog({
        action: 'CSRF_TOKEN_MISMATCH',
        userId: null,
        ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { path: request.nextUrl.pathname }
      });
      
      return attachSecurityHeaders(
        createStandardErrorResponse('CSRF_TOKEN_MISMATCH', 'Token CSRF inválido ou ausente', 403)
      );
    }
  }
  
  return attachSecurityHeaders(NextResponse.next());
}

/**
 * Middleware para validação de headers de segurança
 */
export async function securityHeaders(response: NextResponse) {
  // Adicionar headers de segurança
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
  
  return response;
}
