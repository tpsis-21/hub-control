// src/app/api/bpix/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { bpixService } from '@/services/bpix.service'
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

// GET /api/bpix - Testa conexão e obtém status
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    await bpixService.loadUserConfig(user.id)

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    switch (action) {
      case 'test-connection':
        const testResult = await bpixService.testConnection()
        return NextResponse.json(testResult)

      case 'stats':
        const statsResult = await bpixService.getPaymentStats()
        return NextResponse.json(statsResult)

      case 'status':
        return NextResponse.json({
          success: true,
          message: 'Status do serviço BPIX',
          data: {
            configured: bpixService.isConfigured(),
            user_id: user.id
          }
        })

      default:
        return NextResponse.json({
          success: true,
          message: 'API BPIX disponível',
          data: {
            configured: bpixService.isConfigured(),
            endpoints: [
              'GET /api/bpix?action=test-connection',
              'GET /api/bpix?action=stats',
              'GET /api/bpix?action=status',
              'POST /api/bpix/config',
              'POST /api/bpix/payments',
              'POST /api/bpix/invoices',
              'GET /api/bpix/payments',
              'POST /api/bpix/webhook'
            ]
          }
        })
    }
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'BPIX API - GET')
    
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

// POST /api/bpix - Não implementado (usar rotas específicas)
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Use rotas específicas: /api/bpix/config, /api/bpix/payments, /api/bpix/invoices',
    error: 'INVALID_ENDPOINT'
  }, { status: 400 })
}