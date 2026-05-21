import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { webhookService } from '@/services/webhook.service'

/**
 * POST /api/thebest/webhook/payment
 * Rota fina: validação HTTP + delegação ao WebhookService / SubscriptionService.
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const signature = headersList.get('x-webhook-signature')
    const body = await request.text()

    if (!webhookService.validateTheBestPaymentSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    const result = await webhookService.handleTheBestPayment(body)
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('Erro no webhook de pagamento The Best:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  return NextResponse.json({
    message: 'The Best Payment Webhook Endpoint',
    status: 'active',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
}
