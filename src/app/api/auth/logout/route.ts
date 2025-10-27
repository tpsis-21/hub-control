// src/app/api/auth/logout/route.ts
// API de logout simplificada e organizada
// Data: 2024-12-23
// Versão: 2.0 - Reorganizada

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createStandardErrorResponse, createStandardSuccessResponse } from '@/middleware/shared/helpers'
import { logger } from '@/utils/production-logger'

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
            maxAge: 0,
            path: '/'
          })
        },
      },
    }
  )
}

// Respostas padronizadas agora centralizadas em '@/middleware/shared/helpers'

// =====================================================
// ENDPOINT DE LOGOUT
// =====================================================

export async function POST(request: NextRequest) {
  try {
    logger.debug('🚪 Iniciando logout', undefined, "DEBUG")
    
    // =====================================================
    // 1. CRIAR CLIENTE SUPABASE
    // =====================================================
    
    const supabase = await createAuthClient()
    
    // =====================================================
    // 2. REALIZAR LOGOUT NO SUPABASE
    // =====================================================
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('❌ Erro no logout:', error.message)
      return createStandardErrorResponse(
        'LOGOUT_ERROR',
        'Erro ao realizar logout',
        400
      )
    }
    
    // =====================================================
    // 3. SUCESSO
    // =====================================================
    
    logger.debug('✅ Logout realizado com sucesso', undefined, "DEBUG")
    
    return createStandardSuccessResponse(null, 'Logout realizado com sucesso')
    
  } catch (error: any) {
    console.error('❌ Erro interno na API de logout:', error)
    
    return createStandardErrorResponse(
      'INTERNAL_ERROR',
      'Erro interno do servidor',
      500
    )
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
// 2. Respostas padronizadas
// 3. Logs estruturados
// 4. Suporte a CORS
// 5. Tratamento de erros consistente
// 
// MELHORIAS FUTURAS:
// - Adicionar logs de auditoria
// - Implementar invalidação de sessões ativas
// - Adicionar métricas
// =====================================================
