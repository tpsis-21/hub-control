import { NextRequest, NextResponse } from 'next/server'
import { parseCheckoutExternalReference } from '@/lib/checkout/external-reference'
import { verifyHmacSha256 } from '@/lib/webhook-auth'
import { checkoutOrderService } from '@/services/checkout-order.service'
import { paymentFulfillmentService } from '@/services/payment-fulfillment.service'
import { LoggerService } from '@/services/logger.service'

export const runtime = 'nodejs'

const MIN_SECRET_LENGTH = 16

function isPaidStatus(value: string): boolean {
  const v = value.trim().toLowerCase()
  return ['paid', 'approved', 'completed', 'confirmed', 'success', 'pago'].includes(v)
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function resolveOrderId(body: Record<string, unknown>): string | null {
  const direct = pickString(
    body.orderId,
    body.reference_id,
    body.external_reference,
    body.externalReference
  )
  if (direct?.startsWith('hubco_')) {
    return parseCheckoutExternalReference(direct)
  }
  if (typeof body.orderId === 'string' && /^[0-9a-f-]{36}$/i.test(body.orderId)) {
    return body.orderId
  }
  return null
}

function getCaktoSignature(request: NextRequest): string | null {
  return (
    request.headers.get('x-cakto-signature') ||
    request.headers.get('x-webhook-signature') ||
    request.headers.get('signature')
  )
}

function validateCaktoSignature(
  rawBody: string,
  signature: string | null
): NextResponse | null {
  const secret = process.env.CAKTO_WEBHOOK_SECRET?.trim()
  const isProduction = process.env.NODE_ENV === 'production'

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    if (isProduction) {
      return NextResponse.json(
        { success: false, message: 'Webhook Cakto não configurado' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { success: false, message: 'CAKTO_WEBHOOK_SECRET ausente ou inválido' },
      { status: 401 }
    )
  }

  if (!signature || !verifyHmacSha256(rawBody, signature, secret)) {
    return NextResponse.json({ success: false, message: 'Assinatura inválida' }, { status: 401 })
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    const authError = validateCaktoSignature(rawBody, getCaktoSignature(request))
    if (authError) return authError

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      return NextResponse.json({ success: false, message: 'JSON inválido' }, { status: 400 })
    }

    const status = String(body.status ?? body.event ?? '')
    if (!isPaidStatus(status)) {
      return NextResponse.json({ success: true, message: 'Evento ignorado', paid: false })
    }

    const orderId = resolveOrderId(body)
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'orderId / external_reference não identificado' },
        { status: 400 }
      )
    }

    const order = await checkoutOrderService.getById(orderId)
    if (!order) {
      return NextResponse.json({ success: false, message: 'Pedido não encontrado' }, { status: 404 })
    }

    const result = await paymentFulfillmentService.handleOrderPaidById(orderId, {
      paymentId: String(body.payment_id ?? body.id ?? orderId),
      transactionId: typeof body.transactionId === 'string' ? body.transactionId : undefined,
      amount: Number(order.amount),
      paymentMethod: order.payment_method,
      gateway: 'cakto',
    })

    return NextResponse.json({
      success: true,
      paid: true,
      orderId,
      fulfillment: result,
    })
  } catch (error) {
    LoggerService.error('Webhook Cakto', 'CaktoWebhook', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}
