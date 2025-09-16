// src/app/api/bpix/config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { bpixService, BPIXConfig } from '@/services/bpix.service'
import { ErrorService, ErrorType } from '@/services/error.service'
import { LoggerService } from '@/services/logger.service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Função auxiliar para obter o usuário autenticado
async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
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
              httpOnly: true,
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

    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw ErrorService.createError(
        ErrorType.AUTHENTICATION,
        'Usuário não autenticado',
        'USER_NOT_AUTHENTICATED'
      )
    }

    return user
  } catch (error) {
    throw ErrorService.fromNativeError(error)
  }
}

// POST /api/bpix/config - Salva configuração BPIX
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()

    // Validação dos dados obrigatórios
    if (!body.baseUrl || typeof body.baseUrl !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'URL base da API BPIX é obrigatória',
        error: 'MISSING_BASE_URL'
      }, { status: 400 })
    }

    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Token de autenticação BPIX é obrigatório',
        error: 'MISSING_TOKEN'
      }, { status: 400 })
    }

    // Validação da URL
    try {
      new URL(body.baseUrl)
    } catch {
      return NextResponse.json({
        success: false,
        message: 'URL base inválida',
        error: 'INVALID_BASE_URL'
      }, { status: 400 })
    }

    // Monta a configuração
    const config: BPIXConfig = {
      baseUrl: body.baseUrl.replace(/\/$/, ''), // Remove barra final se existir
      token: body.token,
      timeout: body.timeout || 30000,
      endpoints: {
        createPayment: '/invoices/payments',
        createInvoice: '/invoices/invoices',
        getPayment: '/invoices/payments',
        getInvoice: '/invoices/invoices',
        webhook: '/webhook'
      }
    }

    // Salva a configuração
    await bpixService.saveUserConfig(user.id, config)

    LoggerService.info('Configuração BPIX salva', 'BPIX Config API', {
      user_id: user.id,
      base_url: config.baseUrl
    })

    return NextResponse.json({
      success: true,
      message: 'Configuração BPIX salva com sucesso',
      data: {
        baseUrl: config.baseUrl,
        timeout: config.timeout,
        configured: true
      }
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'BPIX Config API - POST')
    
    // Mapeia tipo de erro para status HTTP
    let statusCode = 500
    if (appError.type === 'AUTHENTICATION') statusCode = 401
    else if (appError.type === 'AUTHORIZATION') statusCode = 403
    else if (appError.type === 'VALIDATION') statusCode = 400
    else if (appError.type === 'NOT_FOUND') statusCode = 404
    
    return NextResponse.json({
      success: false,
      message: appError.message,
      error: appError.code
    }, { status: statusCode })
  }
}

// GET /api/bpix/config - Obtém configuração atual
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    await bpixService.loadUserConfig(user.id)

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    if (action === 'test') {
      // Testa a configuração atual
      const testResult = await bpixService.testConnection()
      return NextResponse.json(testResult)
    }

    // Retorna status da configuração (sem expor dados sensíveis)
    return NextResponse.json({
      success: true,
      message: 'Status da configuração BPIX',
      data: {
        configured: bpixService.isConfigured(),
        user_id: user.id,
        has_config: bpixService.isConfigured()
      }
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'BPIX Config API - GET')
    
    // Mapeia tipo de erro para status HTTP
    let statusCode = 500
    if (appError.type === 'AUTHENTICATION') statusCode = 401
    else if (appError.type === 'AUTHORIZATION') statusCode = 403
    else if (appError.type === 'VALIDATION') statusCode = 400
    else if (appError.type === 'NOT_FOUND') statusCode = 404
    
    return NextResponse.json({
      success: false,
      message: appError.message,
      error: appError.code
    }, { status: statusCode })
  }
}

// PUT /api/bpix/config - Atualiza configuração existente
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()

    // Carrega configuração atual
    await bpixService.loadUserConfig(user.id)

    if (!bpixService.isConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma configuração BPIX encontrada para atualizar',
        error: 'NO_CONFIG_FOUND'
      }, { status: 404 })
    }

    // Validação dos dados (similar ao POST, mas campos opcionais)
    if (body.baseUrl && typeof body.baseUrl !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'URL base deve ser uma string válida',
        error: 'INVALID_BASE_URL_TYPE'
      }, { status: 400 })
    }

    if (body.token && typeof body.token !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Token deve ser uma string válida',
        error: 'INVALID_TOKEN_TYPE'
      }, { status: 400 })
    }

    // Validação da URL se fornecida
    if (body.baseUrl) {
      try {
        new URL(body.baseUrl)
      } catch {
        return NextResponse.json({
          success: false,
          message: 'URL base inválida',
          error: 'INVALID_BASE_URL'
        }, { status: 400 })
      }
    }

    // Monta a configuração atualizada
    const config: BPIXConfig = {
      baseUrl: body.baseUrl ? body.baseUrl.replace(/\/$/, '') : '',
      token: body.token || '',
      timeout: body.timeout || 30000,
      endpoints: {
        createPayment: '/invoices/payments',
        createInvoice: '/invoices/invoices',
        getPayment: '/invoices/payments',
        getInvoice: '/invoices/invoices',
        webhook: '/webhook'
      }
    }

    // Salva a configuração atualizada
    await bpixService.saveUserConfig(user.id, config)

    LoggerService.info('Configuração BPIX atualizada', 'BPIX Config API', {
      user_id: user.id,
      base_url: config.baseUrl
    })

    return NextResponse.json({
      success: true,
      message: 'Configuração BPIX atualizada com sucesso',
      data: {
        baseUrl: config.baseUrl,
        timeout: config.timeout,
        configured: true
      }
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'BPIX Config API - PUT')
    
    // Mapeia tipo de erro para status HTTP
    let statusCode = 500
    if (appError.type === 'AUTHENTICATION') statusCode = 401
    else if (appError.type === 'AUTHORIZATION') statusCode = 403
    else if (appError.type === 'VALIDATION') statusCode = 400
    else if (appError.type === 'NOT_FOUND') statusCode = 404
    
    return NextResponse.json({
      success: false,
      message: appError.message,
      error: appError.code
    }, { status: statusCode })
  }
}

// DELETE /api/bpix/config - Remove configuração
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    
    // Desativa a configuração no banco de dados
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('integration_configs')
      .update({ is_active: false })
      .eq('provider', 'bpix')
      .eq('created_by', user.id)

    if (error) {
      throw ErrorService.createError(
        ErrorType.DATABASE,
        'Erro ao remover configuração BPIX',
        'DELETE_CONFIG_ERROR',
        { supabaseError: error }
      )
    }

    LoggerService.info('Configuração BPIX removida', 'BPIX Config API', {
      user_id: user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Configuração BPIX removida com sucesso'
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'BPIX Config API - DELETE')
    
    // Mapeia tipo de erro para status HTTP
    let statusCode = 500
    if (appError.type === 'AUTHENTICATION') statusCode = 401
    else if (appError.type === 'AUTHORIZATION') statusCode = 403
    else if (appError.type === 'VALIDATION') statusCode = 400
    else if (appError.type === 'NOT_FOUND') statusCode = 404
    
    return NextResponse.json({
      success: false,
      message: appError.message,
      error: appError.code
    }, { status: statusCode })
  }
}