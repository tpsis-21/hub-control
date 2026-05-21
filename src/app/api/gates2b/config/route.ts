// src/app/api/gates2b/config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { gates2bService, Gates2bConfig } from '@/services/gates2b.service'
import { GATES2B_DEFAULT_API_URL, GATES2B_DEFAULT_ENDPOINTS, normalizeGates2bBaseUrl } from '@/config/gates2b-api'
import { ErrorService, ErrorType } from '@/services/error.service'
import { LoggerService } from '@/services/logger.service'
import { createApiSupabaseClient } from '@/lib/supabase/unified-client'
import { cookies } from 'next/headers'

// Função auxiliar para obter o usuário autenticado
async function getAuthenticatedUser() {
  try {
    const supabase = createApiSupabaseClient(false)
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

// POST /api/gates2b/config - Salva configuração Gates2b
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()

    // Validação dos dados obrigatórios
    if (!body.baseUrl || typeof body.baseUrl !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'URL base da API Gates2b é obrigatória',
        error: 'MISSING_BASE_URL'
      }, { status: 400 })
    }

    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Token de autenticação Gates2b é obrigatório',
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
    const config: Gates2bConfig = {
      baseUrl: normalizeGates2bBaseUrl(body.baseUrl || GATES2B_DEFAULT_API_URL),
      token: body.token,
      timeout: body.timeout || 30000,
      endpoints: {
        createPayment: GATES2B_DEFAULT_ENDPOINTS.createPayment,
        createCardPayment: GATES2B_DEFAULT_ENDPOINTS.createCardPayment,
        createInvoice: GATES2B_DEFAULT_ENDPOINTS.createInvoice,
        getPayment: GATES2B_DEFAULT_ENDPOINTS.getPayment,
        getInvoice: GATES2B_DEFAULT_ENDPOINTS.getPayment,
        webhook: '/webhook',
      },
    }

    // Salva a configuração
    await gates2bService.saveUserConfig(user.id, config)

    LoggerService.info('Configuração Gates2b salva', 'Gates2b Config API', {
      user_id: user.id,
      base_url: config.baseUrl
    })

    return NextResponse.json({
      success: true,
      message: 'Configuração Gates2b salva com sucesso',
      data: {
        baseUrl: config.baseUrl,
        timeout: config.timeout,
        configured: true
      }
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'Gates2b Config API - POST')
    
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

// GET /api/gates2b/config - Obtém configuração atual
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    await gates2bService.loadUserConfig(user.id)

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    if (action === 'test') {
      // Testa a configuração atual
      const testResult = await gates2bService.testConnection()
      return NextResponse.json(testResult)
    }

    // Retorna status da configuração (sem expor dados sensíveis)
    return NextResponse.json({
      success: true,
      message: 'Status da configuração Gates2b',
      data: {
        configured: gates2bService.isConfigured(),
        user_id: user.id,
        has_config: gates2bService.isConfigured()
      }
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'Gates2b Config API - GET')
    
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

// PUT /api/gates2b/config - Atualiza configuração existente
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()

    // Carrega configuração atual
    await gates2bService.loadUserConfig(user.id)

    if (!gates2bService.isConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma configuração Gates2b encontrada para atualizar',
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
    const config: Gates2bConfig = {
      baseUrl: body.baseUrl
        ? normalizeGates2bBaseUrl(body.baseUrl)
        : normalizeGates2bBaseUrl(GATES2B_DEFAULT_API_URL),
      token: body.token || '',
      timeout: body.timeout || 30000,
      endpoints: {
        createPayment: GATES2B_DEFAULT_ENDPOINTS.createPayment,
        createCardPayment: GATES2B_DEFAULT_ENDPOINTS.createCardPayment,
        createInvoice: GATES2B_DEFAULT_ENDPOINTS.createInvoice,
        getPayment: GATES2B_DEFAULT_ENDPOINTS.getPayment,
        getInvoice: GATES2B_DEFAULT_ENDPOINTS.getPayment,
        webhook: '/webhook',
      },
    }

    // Salva a configuração atualizada
    await gates2bService.saveUserConfig(user.id, config)

    LoggerService.info('Configuração Gates2b atualizada', 'Gates2b Config API', {
      user_id: user.id,
      base_url: config.baseUrl
    })

    return NextResponse.json({
      success: true,
      message: 'Configuração Gates2b atualizada com sucesso',
      data: {
        baseUrl: config.baseUrl,
        timeout: config.timeout,
        configured: true
      }
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'Gates2b Config API - PUT')
    
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

// DELETE /api/gates2b/config - Remove configuração
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    
    // SEGURANÇA: Redirecionar para API administrativa segura
    return NextResponse.json({
      success: false,
      message: 'Esta operação foi movida para /api/admin/gates2b-config por motivos de segurança',
      error: 'OPERATION_MOVED',
      redirect: '/api/admin/gates2b-config'
    }, { status: 301 });

    // CÓDIGO REMOVIDO POR SEGURANÇA - não usar service role no frontend
    // const supabase = createApiSupabaseClient(true)

    // CÓDIGO REMOVIDO - operação movida para API administrativa segura
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'Gates2b Config API - DELETE')
    
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
