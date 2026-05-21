/**
 * Assinaturas / renovações (The Best e pacotes).
 * Separa lógica de plano e renovação automática das rotas HTTP.
 */

import { createApiSupabaseClient } from '@/lib/supabase/clients/api'
import { createRenewalService, type PaymentData, type RenewalResult } from './thebest-renewal.service'
import { LoggerService } from './logger.service'

export interface TheBestPaymentWebhookPayload {
  /** UUID do revendedor no Hub (dono de `thebest_configs`). */
  user_id: string
  /** ID do cliente/line no Painel Best (inteiro). */
  line_id: number | string
  package_id: number | string
  payment_id: string
  amount: number
  payment_method: string
  transaction_id?: string
  /** Meses na API; se omitido, deriva do pacote mapeado no Hub. */
  months?: number
  /** Alias legado de `line_id`. */
  client_id?: number | string
}

export class SubscriptionService {
  private get renewal() {
    return createRenewalService(createApiSupabaseClient())
  }

  /**
   * Renovação automática após confirmação de pagamento (webhook The Best).
   */
  async processAutoRenewalFromPayment(paymentData: PaymentData): Promise<RenewalResult> {
    LoggerService.info('Renovação automática', 'SubscriptionService', {
      userId: paymentData.userId,
      lineId: paymentData.lineId,
      packageId: paymentData.packageId,
      paymentId: paymentData.paymentId,
      months: paymentData.months,
    })
    return this.renewal.processAutoRenewal(paymentData)
  }

  async isPaymentAlreadyProcessed(paymentId: string): Promise<boolean> {
    return this.renewal.isPaymentProcessed(paymentId)
  }

  /**
   * Valida payload do webhook de pagamento The Best.
   */
  validateTheBestPaymentPayload(payload: unknown): { valid: boolean; errors?: string[]; data?: TheBestPaymentWebhookPayload } {
    const errors: string[] = []
    if (!payload || typeof payload !== 'object') {
      return { valid: false, errors: ['Payload inválido'] }
    }

    const p = payload as Record<string, unknown>
    const required = ['user_id', 'payment_id', 'amount', 'payment_method'] as const

    for (const field of required) {
      if (p[field] == null || p[field] === '') {
        errors.push(`Campo obrigatório ausente: ${field}`)
      }
    }

    const hasPackage = p.package_id != null && p.package_id !== ''
    const hasMonths = typeof p.months === 'number' && p.months >= 1
    if (!hasPackage && !hasMonths) {
      errors.push('Informe package_id (mapeamento Hub) ou months (renovação direta no painel)')
    }

    const lineId = p.line_id ?? p.client_id
    if (lineId == null || lineId === '') {
      errors.push('Campo obrigatório ausente: line_id (ID do cliente no Painel Best)')
    } else if (
      typeof lineId !== 'number' &&
      typeof lineId !== 'string'
    ) {
      errors.push('line_id deve ser número ou string')
    }

    if (p.months != null && typeof p.months !== 'number') {
      errors.push('months deve ser número')
    }

    if (p.package_id != null && typeof p.package_id !== 'number' && typeof p.package_id !== 'string') {
      errors.push('package_id deve ser número ou string')
    }
    if (typeof p.amount === 'number' && p.amount <= 0) {
      errors.push('amount deve ser positivo')
    }
    if (p.user_id != null && typeof p.user_id !== 'string') {
      errors.push('user_id deve ser string')
    }

    if (errors.length > 0) {
      return { valid: false, errors }
    }

    return {
      valid: true,
      data: {
        user_id: p.user_id as string,
        line_id: (p.line_id ?? p.client_id) as number | string,
        package_id: p.package_id as number | string,
        payment_id: p.payment_id as string,
        amount: p.amount as number,
        payment_method: p.payment_method as string,
        transaction_id: p.transaction_id as string | undefined,
        months: typeof p.months === 'number' ? p.months : undefined,
        client_id: p.client_id as number | string | undefined,
      },
    }
  }

  toPaymentData(payload: TheBestPaymentWebhookPayload): PaymentData {
    const packageIdRaw = payload.package_id
    const packageId =
      packageIdRaw == null || packageIdRaw === ''
        ? undefined
        : typeof packageIdRaw === 'string'
          ? parseInt(packageIdRaw, 10)
          : packageIdRaw

    const lineRaw = payload.line_id ?? payload.client_id
    const lineId =
      typeof lineRaw === 'number' ? lineRaw : parseInt(String(lineRaw), 10)

    return {
      userId: payload.user_id,
      lineId: Number.isNaN(lineId) ? String(lineRaw) : lineId,
      packageId:
        packageId === undefined || Number.isNaN(packageId as number)
          ? undefined
          : packageId,
      paymentId: payload.payment_id,
      amount: payload.amount,
      paymentMethod: payload.payment_method as string,
      transactionId: payload.transaction_id,
      months: payload.months,
    }
  }
}

export const subscriptionService = new SubscriptionService()
