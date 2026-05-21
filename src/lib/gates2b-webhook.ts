import type { Gates2bWebhookPayload } from '@/services/gates2b.service'
import { mapGates2bStatusToWebhookEvent } from '@/config/gates2b-api'

/** Formato legado (Gates2b) */
function isLegacyWebhookPayload(body: Record<string, unknown>): boolean {
  return typeof body.event === 'string' && (body.payment_id != null || body.transaction_id != null)
}

/** Formato Gates2b (painel → webhook de status de venda) */
function isGates2bWebhookPayload(body: Record<string, unknown>): boolean {
  return (
    body.id != null &&
    (typeof body.international_status === 'string' ||
      typeof body.id_transaction === 'string' ||
      typeof body.transaction_pix_id === 'string')
  )
}

export function parsePaymentWebhookPayload(
  body: Record<string, unknown>
): { payload: Gates2bWebhookPayload; format: 'legacy' | 'gates2b' } | { error: string } {
  if (isLegacyWebhookPayload(body)) {
    const event = String(body.event)
    const validEvents = ['payment.created', 'payment.paid', 'payment.expired', 'payment.cancelled']
    if (!validEvents.includes(event)) {
      return { error: `Evento não reconhecido: ${event}` }
    }
    return {
      format: 'legacy',
      payload: {
        event: event as Gates2bWebhookPayload['event'],
        payment_id: String(body.payment_id),
        transaction_id: String(body.transaction_id),
        amount: typeof body.amount === 'number' ? body.amount : 0,
        status: String(body.status ?? ''),
        paid_at: typeof body.paid_at === 'string' ? body.paid_at : undefined,
        external_reference:
          typeof body.external_reference === 'string' ? body.external_reference : undefined,
        international_status:
          typeof body.international_status === 'string' ? body.international_status : undefined,
      },
    }
  }

  if (isGates2bWebhookPayload(body)) {
    const internationalStatus =
      typeof body.international_status === 'string' ? body.international_status : ''
    const event =
      mapGates2bStatusToWebhookEvent(internationalStatus) ??
      (typeof body.status === 'string' && body.status.toLowerCase().includes('realizado')
        ? 'payment.paid'
        : null)

    if (!event) {
      return {
        error: `Status internacional não mapeado: ${internationalStatus || '(ausente)'}`,
      }
    }

    return {
      format: 'gates2b',
      payload: {
        event,
        payment_id: String(body.id),
        transaction_id: String(
          body.id_transaction ?? body.transaction_pix_id ?? body.id
        ),
        amount: typeof body.amount === 'number' ? body.amount : 0,
        status: String(body.status ?? internationalStatus),
        paid_at: typeof body.createdAt === 'string' ? body.createdAt : undefined,
        external_reference:
          typeof body.external_reference === 'string' ? body.external_reference : undefined,
        international_status: internationalStatus || undefined,
      },
    }
  }

  return { error: 'Payload não corresponde ao formato Gates2b nem ao formato legado Gates2b' }
}
