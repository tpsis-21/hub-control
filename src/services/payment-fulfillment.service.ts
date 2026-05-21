/**
 * Pós-pagamento no Hub Control: atualiza cliente, registra pagamento e renova no painel (sem n8n).
 */

import { createApiSupabaseClient } from '@/lib/supabase/unified-client'
import { parseCheckoutExternalReference } from '@/lib/checkout/external-reference'
import type { CheckoutOrderRow } from '@/lib/checkout/types'
import { checkoutOrderService } from '@/services/checkout-order.service'
import { checkoutSettingsService } from '@/services/checkout-settings.service'
import { subscriptionService } from '@/services/subscription.service'
import { NATVService } from '@/services/natv.service'
import { PeriodCalculationService } from '@/services/period-calculation.service'
import { LoggerService } from '@/services/logger.service'
import type { Gates2bWebhookPayload } from '@/services/gates2b.service'

export type FulfillmentResult = {
  orderId: string | null
  handled: boolean
  fulfillmentStatus: 'completed' | 'failed' | 'skipped' | 'manual'
  message: string
  details?: Record<string, unknown>
}

export class PaymentFulfillmentService {
  /**
   * Processa webhook Gates2b quando o pagamento foi confirmado.
   */
  async handleGates2bPaymentPaid(payload: Gates2bWebhookPayload): Promise<FulfillmentResult> {
    const orderId = parseCheckoutExternalReference(payload.external_reference)
    if (!orderId) {
      return {
        orderId: null,
        handled: false,
        fulfillmentStatus: 'skipped',
        message: 'external_reference não é pedido Hub Control',
      }
    }

    const order = await checkoutOrderService.getById(orderId)
    if (!order) {
      return {
        orderId,
        handled: false,
        fulfillmentStatus: 'skipped',
        message: 'Pedido não encontrado',
      }
    }

    if (order.status === 'paid') {
      return {
        orderId,
        handled: true,
        fulfillmentStatus: 'completed',
        message: 'Pedido já estava pago',
      }
    }

    return this.fulfillOrder(order, {
      paymentId: payload.payment_id,
      transactionId: payload.transaction_id,
      amount: payload.amount,
      paymentMethod: 'pix',
      gateway: 'gates2b',
    })
  }

  /**
   * Confirma pedido pago (Cakto ou reconciliação manual).
   */
  async handleOrderPaidById(
    orderId: string,
    meta: {
      paymentId: string
      transactionId?: string
      amount: number
      paymentMethod: 'pix' | 'card'
      gateway: 'gates2b' | 'cakto'
    }
  ): Promise<FulfillmentResult> {
    const order = await checkoutOrderService.getById(orderId)
    if (!order) {
      return {
        orderId,
        handled: false,
        fulfillmentStatus: 'skipped',
        message: 'Pedido não encontrado',
      }
    }
    if (order.status === 'paid') {
      return {
        orderId,
        handled: true,
        fulfillmentStatus: 'completed',
        message: 'Pedido já estava pago',
      }
    }
    return this.fulfillOrder(order, meta)
  }

  private async fulfillOrder(
    order: CheckoutOrderRow,
    meta: {
      paymentId: string
      transactionId?: string
      amount: number
      paymentMethod: 'pix' | 'card'
      gateway: 'gates2b' | 'cakto'
    }
  ): Promise<FulfillmentResult> {
    const supabase = createApiSupabaseClient(true)

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', order.client_id)
      .single()
    if (clientErr || !client) {
      await checkoutOrderService.markPaid(order.id, {
        fulfillmentStatus: 'failed',
        fulfillmentResult: { error: 'CLIENT_NOT_FOUND' },
        renewalAttempted: false,
        gates2bPaymentId: meta.paymentId,
        gates2bTransactionId: meta.transactionId ?? null,
      })
      return {
        orderId: order.id,
        handled: true,
        fulfillmentStatus: 'failed',
        message: 'Cliente não encontrado',
      }
    }

    const { data: plan } = await supabase.from('plans').select('*').eq('id', order.plan_id).single()
    if (!plan) {
      await checkoutOrderService.markPaid(order.id, {
        fulfillmentStatus: 'failed',
        fulfillmentResult: { error: 'PLAN_NOT_FOUND' },
        renewalAttempted: false,
        gates2bPaymentId: meta.paymentId,
        gates2bTransactionId: meta.transactionId ?? null,
      })
      return {
        orderId: order.id,
        handled: true,
        fulfillmentStatus: 'failed',
        message: 'Plano não encontrado',
      }
    }

    const serverId = order.server_id ?? client.server_id
    let server: {
      id: string
      name: string
      url: string | null
      user_id: string | null
      integration_type: string
      renewal_automation: boolean
      payment_gateway: boolean
      period_calculation_type: string | null
      period_calculation_config: unknown
    } | null = null

    if (serverId) {
      const { data: srv } = await supabase.from('servers').select('*').eq('id', serverId).single()
      server = srv
    }

    const resellerUserId = order.reseller_user_id
    const settings = await checkoutSettingsService.getForReseller(resellerUserId)

    const currentExpiration = new Date(client.expiration_date)
    const baseDate = currentExpiration > new Date() ? currentExpiration : new Date()
    const serverPeriodConfig = {
      period_calculation_type: (server?.period_calculation_type as 'days' | 'months') || 'days',
      period_calculation_config:
        (server?.period_calculation_config as Record<string, unknown>) || {},
    }
    const calc = PeriodCalculationService.calculateExpirationDate(
      baseDate,
      plan.validity,
      serverPeriodConfig
    )
    const newExpirationDate = calc.expirationDate

    await supabase
      .from('clients')
      .update({
        expiration_date: newExpirationDate.toISOString(),
        status: 'Ativo',
        plan_id: plan.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', client.id)

    await supabase.from('payments').insert({
      client_id: client.id,
      plan_id: plan.id,
      date: new Date().toISOString(),
      amount: meta.amount,
      status: 'Pago',
      transaction_id: meta.transactionId ?? meta.paymentId,
      payment_method: meta.gateway === 'cakto' ? 'cakto' : meta.paymentMethod,
    })

    const shouldRenewPanel =
      settings.autoRenewalEnabled &&
      server?.renewal_automation === true &&
      server?.payment_gateway !== false

    let panelResult: Record<string, unknown> = { skipped: true, reason: 'renewal_disabled' }
    let fulfillmentStatus: FulfillmentResult['fulfillmentStatus'] = 'manual'
    let renewalAttempted = false

    if (shouldRenewPanel && resellerUserId) {
      renewalAttempted = true
      panelResult = await this.renewOnPanel({
        resellerUserId,
        serverName: server?.name ?? '',
        serverUrl: server?.url ?? '',
        integrationType: server?.integration_type ?? 'none',
        client: {
          iptv_user_id: client.iptv_user_id,
          iptv_username: client.iptv_username,
        },
        planValidityDays: plan.validity,
        orderId: order.id,
        paymentId: meta.paymentId,
      })

      if (panelResult.success === true) {
        fulfillmentStatus = 'completed'
      } else if (panelResult.skipped) {
        fulfillmentStatus = 'manual'
      } else {
        fulfillmentStatus = 'failed'
      }
    } else {
      panelResult = {
        skipped: true,
        reason: !settings.autoRenewalEnabled
          ? 'auto_renewal_disabled'
          : !server?.renewal_automation
            ? 'server_renewal_automation_off'
            : 'no_server',
      }
    }

    await checkoutOrderService.markPaid(order.id, {
      gates2bPaymentId: meta.gateway === 'gates2b' ? meta.paymentId : null,
      gates2bTransactionId: meta.transactionId ?? null,
      fulfillmentStatus,
      fulfillmentResult: panelResult,
      renewalAttempted,
    })

    LoggerService.info('Checkout fulfillment concluído', 'PaymentFulfillmentService', {
      orderId: order.id,
      clientId: client.id,
      fulfillmentStatus,
    })

    return {
      orderId: order.id,
      handled: true,
      fulfillmentStatus,
      message:
        fulfillmentStatus === 'completed'
          ? 'Pagamento confirmado e acesso renovado no painel'
          : fulfillmentStatus === 'failed'
            ? 'Pagamento confirmado; falha na renovação do painel (ver logs)'
            : 'Pagamento confirmado; renovação no painel pendente ou manual',
      details: panelResult,
    }
  }

  private async renewOnPanel(params: {
    resellerUserId: string
    serverName: string
    serverUrl: string
    integrationType: string
    client: { iptv_user_id: string | null; iptv_username: string }
    planValidityDays: number
    orderId: string
    paymentId: string
  }): Promise<Record<string, unknown>> {
    const panelConfig = PeriodCalculationService.getPanelIdentificationConfig(
      params.serverName,
      params.serverUrl
    )
    const renewalPeriod = PeriodCalculationService.calculateRenewalPeriod(
      params.planValidityDays,
      panelConfig
    )

    const panelType =
      params.integrationType === 'natv'
        ? 'natv'
        : panelConfig.panelType

    try {
      if (panelType === 'thebest') {
        if (!params.client.iptv_user_id) {
          return { success: false, error: 'LINE_ID_REQUIRED', panelType }
        }
        const months =
          renewalPeriod.unit === 'months'
            ? renewalPeriod.value
            : Math.max(1, Math.round(params.planValidityDays / 30))

        const result = await subscriptionService.processAutoRenewalFromPayment({
          userId: params.resellerUserId,
          lineId: params.client.iptv_user_id,
          paymentId: params.paymentId,
          amount: 0,
          paymentMethod: 'hub_checkout',
          transactionId: params.orderId,
          months,
        })

        return {
          success: result.success,
          panelType: 'thebest',
          message: result.message,
          error: result.error,
          renewalId: result.renewalId,
        }
      }

      if (panelType === 'natv') {
        const natv = new NATVService()
        const months =
          renewalPeriod.unit === 'months'
            ? renewalPeriod.value
            : Math.max(1, Math.round(params.planValidityDays / 30))

        const activation: { months: number; username?: string; user_id?: number } = { months }
        if (params.client.iptv_user_id) {
          const uid = parseInt(params.client.iptv_user_id, 10)
          if (!Number.isNaN(uid)) activation.user_id = uid
        }
        if (params.client.iptv_username) {
          activation.username = params.client.iptv_username
        }
        if (!activation.username && activation.user_id == null) {
          return { success: false, error: 'NATV_USER_REQUIRED', panelType: 'natv' }
        }

        const result = await natv.activateUserWithConfig(params.resellerUserId, activation)
        return {
          success: result.success,
          panelType: 'natv',
          message: result.message,
          error: result.error,
          data: result.data,
        }
      }

      return {
        skipped: true,
        panelType: panelType,
        reason: 'panel_not_automated',
        message: 'Renovação automática não implementada para este tipo de servidor',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        panelType,
      }
    }
  }

  /** Reprocessa apenas a renovação no painel (pedido já pago). */
  async retryPanelRenewal(orderId: string): Promise<FulfillmentResult> {
    const supabase = createApiSupabaseClient(true)
    const order = await checkoutOrderService.getById(orderId)
    if (!order) {
      return {
        orderId,
        handled: false,
        fulfillmentStatus: 'failed',
        message: 'Pedido não encontrado',
      }
    }

    if (order.status !== 'paid') {
      return {
        orderId,
        handled: false,
        fulfillmentStatus: 'skipped',
        message: 'Pedido ainda não está pago',
      }
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id, iptv_user_id, iptv_username, server_id')
      .eq('id', order.client_id)
      .single()

    const { data: plan } = await supabase.from('plans').select('validity').eq('id', order.plan_id).single()

    const serverId = order.server_id ?? client?.server_id
    let server: {
      name: string
      url: string | null
      integration_type: string
    } | null = null
    if (serverId) {
      const { data: srv } = await supabase
        .from('servers')
        .select('name, url, integration_type')
        .eq('id', serverId)
        .single()
      server = srv
    }

    const panelResult = await this.renewOnPanel({
      resellerUserId: order.reseller_user_id,
      serverName: server?.name ?? '',
      serverUrl: server?.url ?? '',
      integrationType: server?.integration_type ?? 'none',
      client: {
        iptv_user_id: client?.iptv_user_id ?? null,
        iptv_username: client?.iptv_username ?? '',
      },
      planValidityDays: plan?.validity ?? 30,
      orderId: order.id,
      paymentId: order.gates2b_payment_id ?? order.id,
    })

    const fulfillmentStatus: FulfillmentResult['fulfillmentStatus'] =
      panelResult.success === true ? 'completed' : panelResult.skipped ? 'manual' : 'failed'

    await checkoutOrderService.markPaid(order.id, {
      gates2bPaymentId: order.gates2b_payment_id,
      gates2bTransactionId: order.gates2b_transaction_id,
      fulfillmentStatus,
      fulfillmentResult: { ...panelResult, retried_at: new Date().toISOString() },
      renewalAttempted: true,
    })

    return {
      orderId: order.id,
      handled: true,
      fulfillmentStatus,
      message:
        fulfillmentStatus === 'completed'
          ? 'Renovação no painel concluída'
          : 'Falha ao renovar no painel — ver detalhes',
      details: panelResult,
    }
  }
}

export const paymentFulfillmentService = new PaymentFulfillmentService()
