// src/app/api/auth/register/route.ts
// API de registro simplificada e organizada
// Data: 2024-12-23
// Versão: 2.0 - Reorganizada

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  createStandardErrorResponse, 
  createStandardSuccessResponse, 
  applyRateLimit,
  attachRateLimitHeaders
} from '@/middleware/shared/helpers'
import { getClientIP } from '@/lib/security/rate-limit'
import { logger } from '@/utils/production-logger'

// =====================================================
// CONFIGURAÇÕES E VALIDAÇÕES
// =====================================================

// Schema de validação para registro
const registerSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .max(255, 'Email muito longo'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve conter ao menos uma letra minúscula, maiúscula e um número'),
  full_name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .optional()
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
  )
}

/**
 * Mapeia erros do Supabase para mensagens amigáveis
 */
function mapSupabaseError(error: any): { message: string; code: string } {
  const errorMessage = error.message?.toLowerCase() || ''
  
  if (errorMessage.includes('user already registered')) {
    return {
      message: 'Este email já está cadastrado',
      code: 'EMAIL_ALREADY_EXISTS'
    }
  }
  
  if (errorMessage.includes('password should be at least')) {
    return {
      message: 'Senha deve ter pelo menos 6 caracteres',
      code: 'PASSWORD_TOO_SHORT'
    }
  }
  
  if (errorMessage.includes('signup is disabled')) {
    return {
      message: 'Cadastro temporariamente desabilitado',
      code: 'SIGNUP_DISABLED'
    }
  }
  
  return {
    message: 'Erro ao criar conta',
    code: 'SIGNUP_ERROR'
  }
}

// Respostas padronizadas agora centralizadas em '@/middleware/shared/helpers'

// =====================================================
// ENDPOINT DE REGISTRO
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // =====================================================
    // 1. RATE LIMITING CENTRALIZADO
    // =====================================================
    const ip = getClientIP(request)
    const rateCheck = await applyRateLimit(request, { requests: 3, windowMs: 15 * 60 * 1000, namespace: 'auth:register' })
    if (!rateCheck.success) {
      logger.warn(`🚫 Rate limit excedido para registro IP: ${ip}`, undefined, "WARN")
      return rateCheck.response!
    }
    
    // =====================================================
    // 2. VALIDAR DADOS DE ENTRADA
    // =====================================================
    
    const rawData = await request.json()
    
    let validatedData
    try {
      validatedData = registerSchema.parse(rawData)
    } catch (validationError: any) {
      logger.warn('🚫 Dados inválidos para registro:', validationError.errors)
      return createStandardErrorResponse(
        'VALIDATION_ERROR',
        'Dados de entrada inválidos',
        400
      )
    }
    
    const { email, password, full_name } = validatedData
    
    logger.debug(`📝 Tentativa de registro para: ${email} IP: ${ip}`)
    
    // =====================================================
    // 3. CRIAR CONTA NO SUPABASE
    // =====================================================
    
    const supabase = await createAuthClient()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || null
        }
      }
    })
    
    // =====================================================
    // 4. TRATAR ERROS DE REGISTRO
    // =====================================================
    
    if (error) {
      console.error('❌ Erro de registro:', error.message)
      
      const { message, code } = mapSupabaseError(error)
      return createStandardErrorResponse(code, message, 400)
    }
    
    // =====================================================
    // 5. SUCESSO - LIMPAR RATE LIMIT E RETORNAR DADOS
    // =====================================================
    
    logger.debug('✅ Registro bem-sucedido para:', data.user?.email)
    
    // Verificar se o usuário precisa confirmar email
    const needsConfirmation = !data.user?.email_confirmed_at
    
    const response = createStandardSuccessResponse(
      {
        user: {
          id: data.user?.id,
          email: data.user?.email,
          needs_confirmation: needsConfirmation
        },
        message: needsConfirmation 
          ? 'Cadastro realizado com sucesso! Enviamos um email de confirmação.' 
          : 'Cadastro realizado com sucesso!'
      }
    )
    
    return attachRateLimitHeaders(response, rateCheck.result)

  } catch (error) {
    console.error('Erro inesperado no registro:', error)
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
// 2. Validação com Zod mais rigorosa para senhas
// 3. Rate limiting mais restritivo (3 por 15 min)
// 4. Mapeamento de erros do Supabase
// 5. Suporte a confirmação de email
// 6. Respostas padronizadas
// 7. Logs estruturados
// 8. Suporte a CORS
// 
// MELHORIAS FUTURAS:
// - Implementar rate limiting com Redis
// - Adicionar verificação de domínios permitidos
// - Implementar captcha
// - Adicionar logs de auditoria
// =====================================================
