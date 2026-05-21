/**
 * Contrato da API Gates2b (sucessor do BPIX).
 * Referência: https://docs.gates2b.com/gates2b/llm.txt
 */

import { getGates2bBaseUrl } from '@/lib/integrations/server-base-urls'

export const GATES2B_DEFAULT_API_URL = getGates2bBaseUrl()

export const GATES2B_CRYPTO_GATEWAY_URL =
  process.env.GATES2B_CRYPTO_GATEWAY_URL || 'https://api-gateway.gates2b.com'

export const GATES2B_MIN_AMOUNT_BRL = 3

/** Parcelas no cartão (documentação Gates2b) */
export const GATES2B_CARD_INSTALLMENTS_MIN = 1
export const GATES2B_CARD_INSTALLMENTS_MAX = 24

export const GATES2B_DEFAULT_ENDPOINTS = {
  validateKey: '/api-key/validate',
  createPayment: '/payments',
  createInvoice: '/invoices/sale',
  listPayments: '/invoices/payment-gateway',
  getPayment: '/invoices/payment-gateway',
  createCardPayment: '/payments/v1/card',
  createCryptoPayment: '/payments/v2/crypto',
  refund: '/refunds/invoice',
  resendWebhook: '/invoices/resend-webhook',
} as const

/** Paths legados gravados no banco antes da migração Gates2b */
export const GATES2B_LEGACY_ENDPOINT_PATHS: Record<string, string> = {
  '/invoices/payments': GATES2B_DEFAULT_ENDPOINTS.createPayment,
  '/invoices/invoices': GATES2B_DEFAULT_ENDPOINTS.createInvoice,
}

export function normalizeGates2bBaseUrl(url: string): string {
  const canonical = getGates2bBaseUrl()
  return url
    .trim()
    .replace(/\/$/, '')
    .replace('https://api.bpix.app', canonical)
    .replace('http://api.bpix.app', canonical)
    .replace('https://api.bpix.com.br/v1', canonical)
    .replace('https://api.bpix.com.br', canonical)
}

export function resolveGates2bEndpoints(
  saved?: Partial<Record<keyof typeof GATES2B_DEFAULT_ENDPOINTS, string>>
): typeof GATES2B_DEFAULT_ENDPOINTS {
  const resolved = { ...GATES2B_DEFAULT_ENDPOINTS }
  if (!saved) return resolved

  const out: Record<keyof typeof GATES2B_DEFAULT_ENDPOINTS, string> = { ...resolved }
  for (const key of Object.keys(resolved) as (keyof typeof GATES2B_DEFAULT_ENDPOINTS)[]) {
    const value = saved[key]
    if (!value) continue
    out[key] = GATES2B_LEGACY_ENDPOINT_PATHS[value] ?? value
  }
  return out as typeof GATES2B_DEFAULT_ENDPOINTS
}

export function defaultPaymentExpireAt(hoursFromNow = 24): string {
  const date = new Date()
  date.setHours(date.getHours() + hoursFromNow)
  return date.toISOString()
}

/** Mapeia status internacional do webhook Gates2b para eventos internos do Hub */
export function mapGates2bStatusToWebhookEvent(
  internationalStatus: string
): 'payment.created' | 'payment.paid' | 'payment.expired' | 'payment.cancelled' | null {
  const status = internationalStatus.toUpperCase()
  if (['PAYMENT_RECEIVED', 'PAID'].includes(status)) return 'payment.paid'
  if (['DENIED'].includes(status)) return 'payment.cancelled'
  if (['CANCELED', 'REFUNDED', 'REFUND_COMPLETED', 'REFUND_FAILED', 'REFUND_CANCELLED'].includes(status)) {
    return 'payment.cancelled'
  }
  if (status === 'WAITING_PAYMENT') return 'payment.created'
  return null
}
