// src/app/api/gates2b/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { ErrorService } from '@/services/error.service'
import { LoggerService } from '@/services/logger.service'
import { webhookService } from '@/services/webhook.service'
import { stripInternalDetailsForResponse } from '@/lib/api-error-response'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const contentType = headersList.get('content-type') || ''
    const signature =
      headersList.get('x-Gates2b-signature') ||
      headersList.get('x-gates2b-signature') ||
      headersList.get('x-webhook-signature') ||
      headersList.get('signature')

    const rawBody = await request.text()

    LoggerService.info('Webhook Gates2b recebido', 'Gates2b Webhook', {
      has_signature: !!signature,
      ip: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown',
    })

    const sigCheck = webhookService.validateGates2bSignature(rawBody, signature)
    if (!sigCheck.configured && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          success: false,
          message: 'Webhook não configurado',
          error: 'WEBHOOK_NOT_CONFIGURED',
        },
        { status: 503 }
      )
    }
    if (sigCheck.configured && !sigCheck.ok) {
      return NextResponse.json(
        {
          success: false,
          message: 'Assinatura do webhook inválida',
          error: 'INVALID_SIGNATURE',
        },
        { status: 401 }
      )
    }

    const result = await webhookService.handleGates2b(rawBody, contentType)
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'Gates2b Webhook - POST')
    return NextResponse.json(
      stripInternalDetailsForResponse(
        {
          success: false,
          message: 'Erro interno ao processar webhook',
          error: 'INTERNAL_ERROR',
          details: appError.message,
        },
        500
      ),
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Endpoint de webhook Gates2b',
      data: {
        endpoint: '/api/gates2b/webhook',
        method: 'POST',
        content_type: 'application/json',
      },
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'Gates2b Webhook - GET')
    return NextResponse.json(
      { success: false, message: appError.message, error: appError.code },
      { status: 500 }
    )
  }
}

export async function PUT() {
  return NextResponse.json(
    { success: false, message: 'Método PUT não suportado', error: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, message: 'Método DELETE não suportado', error: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, message: 'Método PATCH não suportado', error: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  )
}
