// src/app/api/gates2b/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { gates2bService } from '@/services/gates2b.service'
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

// GET /api/gates2b - Testa conexão e obtém status
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    await gates2bService.loadUserConfig(user.id)

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    switch (action) {
      case 'test-connection':
        const testResult = await gates2bService.testConnection()
        return NextResponse.json(testResult)

      case 'stats':
        const statsResult = await gates2bService.getPaymentStats()
        return NextResponse.json(statsResult)

      case 'status':
        return NextResponse.json({
          success: true,
          message: 'Status do Serviço Gates2b',
          data: {
            configured: gates2bService.isConfigured(),
            user_id: user.id
          }
        })

      default:
        return NextResponse.json({
          success: true,
          message: 'API Gates2b disponível',
          data: {
            configured: gates2bService.isConfigured(),
            endpoints: [
              'GET /api/gates2b?action=test-connection',
              'GET /api/gates2b?action=stats',
              'GET /api/gates2b?action=status',
              'POST /api/gates2b/config',
              'POST /api/gates2b/payments',
              'POST /api/gates2b/payments/card',
              'POST /api/gates2b/invoices',
              'GET /api/gates2b/payments',
              'POST /api/gates2b/webhook'
            ]
          }
        })
    }
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'Gates2b API - GET')
    
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

// POST /api/gates2b - Não implementado (usar rotas específicas)
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Use rotas específicas: /api/gates2b/config, /api/gates2b/payments, /api/gates2b/invoices',
    error: 'INVALID_ENDPOINT'
  }, { status: 400 })
}
