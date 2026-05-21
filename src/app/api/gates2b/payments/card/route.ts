// POST /api/gates2b/payments/card — checkout de cartão de crédito (Gates2b)
import { NextRequest, NextResponse } from 'next/server'
import { gates2bService, Gates2bCreateCardPaymentRequest } from '@/services/gates2b.service'
import { ErrorService } from '@/services/error.service'
import { LoggerService } from '@/services/logger.service'
import {
  GATES2B_CARD_INSTALLMENTS_MAX,
  GATES2B_CARD_INSTALLMENTS_MIN,
  GATES2B_MIN_AMOUNT_BRL,
} from '@/config/gates2b-api'
import { getGates2bAuthenticatedUser, gates2bRouteErrorResponse } from '@/lib/gates2b-route-auth'

const CLIENT_MODES = ['noNeedToSpecify', 'fillDataNow', 'requestCheckout'] as const

export async function POST(request: NextRequest) {
  try {
    const user = await getGates2bAuthenticatedUser()
    await gates2bService.loadUserConfig(user.id)

    if (!gates2bService.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Gates2b não configurado. Acesse /integracoes/gates2b',
          error: 'GATES2B_NOT_CONFIGURED',
        },
        { status: 400 }
      )
    }

    const body = await request.json()

    if (!body.amount || typeof body.amount !== 'number' || body.amount < GATES2B_MIN_AMOUNT_BRL) {
      return NextResponse.json(
        {
          success: false,
          message: `Valor mínimo é R$ ${GATES2B_MIN_AMOUNT_BRL.toFixed(2)}`,
          error: 'INVALID_AMOUNT',
        },
        { status: 400 }
      )
    }

    const installments = Number(body.installments)
    if (
      !Number.isInteger(installments) ||
      installments < GATES2B_CARD_INSTALLMENTS_MIN ||
      installments > GATES2B_CARD_INSTALLMENTS_MAX
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Parcelas devem ser de ${GATES2B_CARD_INSTALLMENTS_MIN} a ${GATES2B_CARD_INSTALLMENTS_MAX}`,
          error: 'INVALID_INSTALLMENTS',
        },
        { status: 400 }
      )
    }

    const clientMode = body.clientMode ?? 'requestCheckout'
    if (!CLIENT_MODES.includes(clientMode)) {
      return NextResponse.json(
        {
          success: false,
          message: `clientMode deve ser: ${CLIENT_MODES.join(', ')}`,
          error: 'INVALID_CLIENT_MODE',
        },
        { status: 400 }
      )
    }

    let expireAt = body.expire_at
    if (!expireAt) {
      const defaultExpire = new Date()
      defaultExpire.setHours(defaultExpire.getHours() + 48)
      expireAt = defaultExpire.toISOString()
    } else {
      const expireDate = new Date(expireAt)
      if (isNaN(expireDate.getTime()) || expireDate <= new Date()) {
        return NextResponse.json(
          {
            success: false,
            message: 'Data de expiração deve ser válida e no futuro',
            error: 'INVALID_EXPIRE_DATE',
          },
          { status: 400 }
        )
      }
    }

    const cardRequest: Gates2bCreateCardPaymentRequest = {
      amount: body.amount,
      clientMode,
      installments,
      expire_at: expireAt,
      external_reference: body.external_reference || `card_${user.id}_${Date.now()}`,
      description:
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim()
          : undefined,
    }

    const result = await gates2bService.createCardPayment(cardRequest)

    LoggerService.info('Pagamento cartão criado via API', 'Gates2b Card API', {
      user_id: user.id,
      amount: cardRequest.amount,
      installments: cardRequest.installments,
      payment_id: result.data?.id,
    })

    return NextResponse.json({
      ...result,
      data: result.data
        ? {
            ...result.data,
            method: 'card' as const,
            external_reference: cardRequest.external_reference,
          }
        : undefined,
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'Gates2b Card API - POST')
    const { statusCode, body } = gates2bRouteErrorResponse(appError)
    return NextResponse.json(body, { status: statusCode })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Criar pagamento com cartão de crédito (checkout Gates2b)',
    data: {
      method: 'POST',
      required_fields: ['amount', 'installments'],
      optional_fields: ['clientMode', 'expire_at', 'external_reference', 'description'],
      clientMode_values: CLIENT_MODES,
      installments_range: [GATES2B_CARD_INSTALLMENTS_MIN, GATES2B_CARD_INSTALLMENTS_MAX],
      gates2b_endpoint: 'POST /payments/v1/card',
      panel_checklist: '/docs/PAINEL_GATES2B_O_QUE_MUDAR.md',
    },
  })
}
