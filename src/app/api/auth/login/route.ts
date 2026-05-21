// src/app/api/auth/login/route.ts
// API de login simplificada e organizada
// Data: 2024-12-23
// Versão: 2.0 - Reorganizada

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// === LOGS DE DEBUG ADICIONADOS ===
const DEBUG_AUTH = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG_AUTH) {
    logger.debug(`[LOGIN API DEBUG] ${new Date().toISOString()} - ${message}`, data || '', "DEBUG");
  }
}

function debugError(message: string, error?: any) {
  if (DEBUG_AUTH) {
    console.error(`[LOGIN API ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  }
}
// === FIM DOS LOGS DE DEBUG ===
import { 
  createStandardErrorResponse, 
  createStandardSuccessResponse,
  applyRateLimit,
  attachRateLimitHeaders 
} from '@/middleware/shared/helpers'
import { getClientIP, rateLimitCustom, buildRateLimitHeaders } from '@/lib/security/rate-limit'
import { logger } from '@/utils/production-logger'
import { cookieConfig } from '@/lib/supabase/config'

// =====================================================
// CONFIGURAÇÕES E VALIDAÇÕES
// =====================================================

// Schema de validação para login
const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .max(255, 'Email muito longo'),
  password: z.string()
    .min(1, 'Senha é obrigatória')
    .max(128, 'Senha muito longa')
})

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Cria cliente Supabase para autenticação
 */
async function createAuthClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
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
            ...cookieConfig,
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
  )
}

/**
 * Mapeia erros do Supabase para mensagens amigáveis
 */
function mapSupabaseError(error: any): { message: string; code: string; userFriendly: string } {
  const errorMessage = error.message?.toLowerCase() || ''
  
  if (errorMessage.includes('invalid login credentials')) {
    return {
      message: 'Email ou senha incorretos',
      code: 'INVALID_CREDENTIALS',
      userFriendly: '🔐 Ops! Parece que o email ou senha estão incorretos. Verifique se digitou corretamente e tente novamente.'
    }
  }
  
  if (errorMessage.includes('email not confirmed')) {
    return {
      message: 'Email não confirmado',
      code: 'EMAIL_NOT_CONFIRMED',
      userFriendly: '📧 Seu email ainda não foi confirmado. Verifique sua caixa de entrada (e spam) para ativar sua conta.'
    }
  }
  
  if (errorMessage.includes('too many requests')) {
    return {
      message: 'Muitas tentativas',
      code: 'TOO_MANY_REQUESTS',
      userFriendly: '⏰ Você fez muitas tentativas de login. Por segurança, aguarde alguns minutos antes de tentar novamente.'
    }
  }
  
  if (errorMessage.includes('user not found')) {
    return {
      message: 'Usuário não encontrado',
      code: 'USER_NOT_FOUND',
      userFriendly: '👤 Não encontramos uma conta com este email. Verifique se digitou corretamente ou crie uma nova conta.'
    }
  }
  
  if (errorMessage.includes('signup disabled')) {
    return {
      message: 'Cadastro desabilitado',
      code: 'SIGNUP_DISABLED',
      userFriendly: '🚫 Novos cadastros estão temporariamente desabilitados. Entre em contato com o administrador.'
    }
  }
  
  return {
    message: 'Erro de autenticação',
    code: 'AUTH_ERROR',
    userFriendly: '⚠️ Ocorreu um problema durante o login. Tente novamente ou entre em contato com o suporte.'
  }
}

// Respostas padronizadas agora centralizadas em '@/middleware/shared/helpers'

// =====================================================
// ENDPOINT DE LOGIN
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 20 tentativas a cada 5 minutos por IP
    const rateLimitResult = await rateLimitCustom(request, {
      windowMs: 5 * 60 * 1000, // 5 minutos
      max: 20, // 20 tentativas
      namespace: 'auth-login'
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { 
          status: 429,
          headers: buildRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    // =====================================================
    // 2. VALIDAR DADOS DE ENTRADA
    // =====================================================
    
    const rawData = await request.json()
    
    let validatedData
    try {
      validatedData = loginSchema.parse(rawData)
    } catch (validationError: any) {
      logger.warn('🚫 Dados inválidos:', validationError.errors)
      const firstError = validationError.errors?.[0]
      const fieldName = firstError?.path?.[0] === 'email' ? 'email' : 'senha'
      
      return createStandardErrorResponse(
        'VALIDATION_ERROR',
        `📝 Por favor, verifique o ${fieldName} informado. ${firstError?.message || 'Dados inválidos.'}`,
        400
      )
    }
    
    const { email, password } = validatedData
    
    const ip = getClientIP(request)
    logger.debug(`🔐 Tentativa de login para: ${email} IP: ${ip}`)
    
    // =====================================================
    // 3. AUTENTICAR COM SUPABASE
    // =====================================================
    
    const supabase = await createAuthClient()
    
    debugLog('Tentando autenticação com Supabase');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    // =====================================================
    // 4. TRATAR ERROS DE AUTENTICAÇÃO
    // =====================================================
    
    debugLog('Resultado da autenticação', { 
    hasData: !!data, 
    hasUser: !!data?.user, 
    hasSession: !!data?.session,
    error: error?.message 
  });
  
  if (error) {
    debugError('Erro na autenticação Supabase', error);
      console.error('❌ Erro de autenticação:', error.message)
      
      const mapped = mapSupabaseError(error)
      return createStandardErrorResponse(
        mapped.code,
        mapped.userFriendly || mapped.message,
        400
      )
    }
    
    // =====================================================
    // 5. SUCESSO
    // =====================================================
    
    const response = createStandardSuccessResponse(
      {
        user: {
          id: data.user?.id,
          email: data.user?.email
        }
      },
      'Login realizado com sucesso'
    )

    // Anexar cabeçalhos de rate limit na resposta de sucesso
    return attachRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Erro inesperado no login:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500)
  }
}

// =====================================================
// ENDPOINT OPTIONS (CORS)
// =====================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// =====================================================
// NOTAS DE IMPLEMENTAÇÃO:
// =====================================================
// 
// 1. API simplificada e organizada
// 2. Validação com Zod mais simples
// 3. Rate limiting básico
// 4. Mapeamento de erros do Supabase
// 5. Busca de perfil do usuário
// 6. Respostas padronizadas
// 7. Logs estruturados
// 8. Suporte a CORS
// 
// MELHORIAS FUTURAS:
// - Implementar rate limiting com Redis
// - Adicionar logs de auditoria
// - Implementar 2FA
// - Adicionar métricas
// =====================================================
