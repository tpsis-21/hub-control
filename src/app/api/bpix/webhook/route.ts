// src/app/api/bpix/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { bpixService, BPIXWebhookPayload } from '@/services/bpix.service'
import { ErrorService, ErrorType } from '@/services/error.service'
import { LoggerService } from '@/services/logger.service'
import { headers } from 'next/headers'

// POST /api/bpix/webhook - Recebe webhooks do BPIX
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const contentType = headersList.get('content-type') || ''
    const signature = headersList.get('x-bpix-signature') || headersList.get('signature')
    
    // Log da requisição recebida
    LoggerService.info('Webhook BPIX recebido', 'BPIX Webhook', {
      user_agent: userAgent,
      content_type: contentType,
      has_signature: !!signature,
      ip: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    })

    // Validação do Content-Type
    if (!contentType.includes('application/json')) {
      return NextResponse.json({
        success: false,
        message: 'Content-Type deve ser application/json',
        error: 'INVALID_CONTENT_TYPE'
      }, { status: 400 })
    }

    // Lê o corpo da requisição
    let body: any
    try {
      body = await request.json()
    } catch (error) {
      LoggerService.error('Erro ao parsear JSON do webhook', 'BPIX Webhook', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
      
      return NextResponse.json({
        success: false,
        message: 'Corpo da requisição deve ser um JSON válido',
        error: 'INVALID_JSON'
      }, { status: 400 })
    }

    // Validação básica do payload
    if (!body || typeof body !== 'object') {
      return NextResponse.json({
        success: false,
        message: 'Payload do webhook inválido',
        error: 'INVALID_PAYLOAD'
      }, { status: 400 })
    }

    // Validação dos campos obrigatórios do webhook
    const requiredFields = ['event', 'payment_id', 'transaction_id', 'status']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
        error: 'MISSING_REQUIRED_FIELDS'
      }, { status: 400 })
    }

    // Validação do tipo de evento
    const validEvents = ['payment.created', 'payment.paid', 'payment.expired', 'payment.cancelled']
    if (!validEvents.includes(body.event)) {
      LoggerService.warn('Evento de webhook não reconhecido', 'BPIX Webhook', {
        event: body.event,
        valid_events: validEvents
      })
      
      return NextResponse.json({
        success: false,
        message: `Evento não reconhecido: ${body.event}. Eventos válidos: ${validEvents.join(', ')}`,
        error: 'INVALID_EVENT_TYPE'
      }, { status: 400 })
    }

    // Validação do valor se presente
    if (body.amount !== undefined && (typeof body.amount !== 'number' || body.amount <= 0)) {
      return NextResponse.json({
        success: false,
        message: 'Valor deve ser um número maior que zero',
        error: 'INVALID_AMOUNT'
      }, { status: 400 })
    }

    // Monta o payload do webhook
    const webhookPayload: BPIXWebhookPayload = {
      event: body.event,
      payment_id: body.payment_id,
      transaction_id: body.transaction_id,
      amount: body.amount || 0,
      status: body.status,
      paid_at: body.paid_at,
      external_reference: body.external_reference
    }

    // Log detalhado do payload
    LoggerService.info('Processando webhook BPIX', 'BPIX Webhook', {
      event: webhookPayload.event,
      payment_id: webhookPayload.payment_id,
      transaction_id: webhookPayload.transaction_id,
      status: webhookPayload.status,
      amount: webhookPayload.amount,
      external_reference: webhookPayload.external_reference
    })

    // Processa o webhook
    const result = await bpixService.processWebhook(webhookPayload)

    // Log do resultado
    LoggerService.info('Webhook BPIX processado', 'BPIX Webhook', {
      success: result.success,
      event: webhookPayload.event,
      payment_id: webhookPayload.payment_id
    })

    return NextResponse.json({
      success: true,
      message: 'Webhook processado com sucesso',
      data: {
        event: webhookPayload.event,
        payment_id: webhookPayload.payment_id,
        processed_at: new Date().toISOString()
      }
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'BPIX Webhook - POST')
    
    // Para webhooks, é importante sempre retornar uma resposta
    // mesmo em caso de erro, para não causar reenvios desnecessários
    return NextResponse.json({
      success: false,
      message: 'Erro interno ao processar webhook',
      error: 'INTERNAL_ERROR',
      details: appError.message
    }, { status: 500 })
  }
}

// GET /api/bpix/webhook - Informações sobre o webhook
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Endpoint de webhook BPIX',
      data: {
        endpoint: '/api/bpix/webhook',
        method: 'POST',
        content_type: 'application/json',
        supported_events: [
          'payment.created',
          'payment.paid',
          'payment.expired',
          'payment.cancelled'
        ],
        required_fields: [
          'event',
          'payment_id',
          'transaction_id',
          'status'
        ],
        optional_fields: [
          'amount',
          'paid_at',
          'external_reference'
        ],
        example_payload: {
          event: 'payment.paid',
          payment_id: 'pay_123456789',
          transaction_id: 'txn_987654321',
          amount: 100.50,
          status: 'paid',
          paid_at: '2024-01-15T10:30:00Z',
          external_reference: 'order_12345'
        }
      }
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'BPIX Webhook - GET')
    
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

// Outros métodos não são suportados
export async function PUT(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Método PUT não suportado para webhooks',
    error: 'METHOD_NOT_ALLOWED'
  }, { status: 405 })
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Método DELETE não suportado para webhooks',
    error: 'METHOD_NOT_ALLOWED'
  }, { status: 405 })
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Método PATCH não suportado para webhooks',
    error: 'METHOD_NOT_ALLOWED'
  }, { status: 405 })
}
