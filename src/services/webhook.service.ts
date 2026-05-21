/**
 * Webhooks externos: validação de assinatura, parse e despacho.
 * Rotas HTTP só recebem a requisição e delegam aqui.
 */

import crypto from 'crypto'
import { createApiSupabaseClient } from '@/lib/supabase/clients/api'
import { verifyHmacSha256, requireWebhookSecret } from '@/lib/webhook-auth'
import { parsePaymentWebhookPayload } from '@/lib/gates2b-webhook'
import { LoggerService } from './logger.service'
import { paymentService } from './payment.service'
import { subscriptionService } from './subscription.service'

export type WebhookHandleResult = {
  status: number
  body: Record<string, unknown>
}

function getTheBestWebhookSecret(): string | null {
  const secret = process.env.THEBEST_WEBHOOK_SECRET
  if (secret && secret.length >= 16) return secret
  return null
}

export class WebhookService {
  validateTheBestPaymentSignature(body: string, signature: string | null): boolean {
    const secret = getTheBestWebhookSecret()
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        LoggerService.error('THEBEST_WEBHOOK_SECRET ausente em produção', 'WebhookService')
        return false
      }
      return false
    }
    if (!signature) return false

    try {
      const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
      const received = signature.replace(/^sha256=/, '')
      if (expected.length !== received.length) return false
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(received, 'hex')
      )
    } catch {
      return false
    }
  }

  validateGates2bSignature(body: string, signature: string | null): { ok: boolean; configured: boolean } {
    const secret =
      process.env.GATES2B_WEBHOOK_SECRET || process.env.BPIX_WEBHOOK_SECRET || null
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        return { ok: false, configured: false }
      }
      return { ok: true, configured: false }
    }
    return {
      ok: verifyHmacSha256(body, signature, secret),
      configured: true,
    }
  }

  /**
   * Webhook The Best — pagamento confirmado → renovação automática.
   */
  async handleTheBestPayment(rawBody: string): Promise<WebhookHandleResult> {
    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return { status: 400, body: { error: 'Invalid JSON', success: false } }
    }

    const validation = subscriptionService.validateTheBestPaymentPayload(payload)
    if (!validation.valid || !validation.data) {
      return {
        status: 400,
        body: { error: 'Invalid payload', details: validation.errors, success: false },
      }
    }

    const paymentData = subscriptionService.toPaymentData(validation.data)

    if (await subscriptionService.isPaymentAlreadyProcessed(paymentData.paymentId)) {
      return {
        status: 200,
        body: {
          success: true,
          message: 'Payment already processed',
          payment_id: paymentData.paymentId,
        },
      }
    }

    const renewalResult = await subscriptionService.processAutoRenewalFromPayment(paymentData)

    if (renewalResult.success) {
      return {
        status: 200,
        body: {
          success: true,
          message: renewalResult.message,
          renewal_id: renewalResult.renewalId,
          package_info: renewalResult.packageInfo
            ? {
                id: renewalResult.packageInfo.package_id,
                name: renewalResult.packageInfo.name,
                credits: renewalResult.packageInfo.credits,
              }
            : undefined,
        },
      }
    }

    await this.logTheBestWebhookError({
      paymentId: paymentData.paymentId,
      userId: paymentData.userId,
      error: renewalResult.error ?? 'Unknown',
      message: renewalResult.message,
      payload,
    })

    return {
      status: 200,
      body: {
        success: false,
        message: renewalResult.message,
        error: renewalResult.error,
      },
    }
  }

  /**
   * Webhook Gates2b (PIX / status de cobrança).
   */
  async handleGates2b(rawBody: string, contentType: string): Promise<WebhookHandleResult> {
    if (!contentType.includes('application/json')) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Content-Type deve ser application/json',
          error: 'INVALID_CONTENT_TYPE',
        },
      }
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody)
    } catch {
      return {
        status: 400,
        body: {
          success: false,
          message: 'JSON inválido',
          error: 'INVALID_JSON',
        },
      }
    }

    const parsed = parsePaymentWebhookPayload(body)
    if ('error' in parsed) {
      return {
        status: 400,
        body: { success: false, message: parsed.error, error: 'INVALID_PAYLOAD' },
      }
    }

    const { payload: webhookPayload, format } = parsed

    if (webhookPayload.amount !== undefined && webhookPayload.amount <= 0) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Valor inválido',
          error: 'INVALID_AMOUNT',
        },
      }
    }

    LoggerService.info('Processando webhook Gates2b', 'WebhookService', {
      format,
      event: webhookPayload.event,
      payment_id: webhookPayload.payment_id,
    })

    const result = await paymentService.processGates2bWebhook(webhookPayload)

    return {
      status: 200,
      body: {
        success: true,
        message: 'Webhook processado com sucesso',
        data: {
          format,
          event: webhookPayload.event,
          payment_id: webhookPayload.payment_id,
          processed_at: new Date().toISOString(),
          gateway_result: result,
        },
      },
    }
  }

  private async logTheBestWebhookError(errorData: {
    paymentId?: string
    userId?: string
    error: string
    message?: string
    payload?: unknown
  }) {
    try {
      const supabase = createApiSupabaseClient()
      await supabase.from('thebest_api_logs').insert({
        user_id: errorData.userId ?? 'webhook',
        operation_type: 'webhook_payment',
        request_data: (errorData.payload as object) ?? {},
        response_data: {
          error: errorData.error,
          message: errorData.message,
        },
        status_code: 500,
        error_message: errorData.error,
      })
    } catch (logError) {
      LoggerService.error('Falha ao logar webhook', 'WebhookService', {
        error: logError instanceof Error ? logError.message : String(logError),
      })
    }
  }
}

export const webhookService = new WebhookService()
