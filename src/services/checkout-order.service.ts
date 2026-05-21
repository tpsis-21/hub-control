import { createApiSupabaseClient } from '@/lib/supabase/unified-client'
import { buildCheckoutExternalReference } from '@/lib/checkout/external-reference'
import type {
  CheckoutFulfillmentStatus,
  CheckoutGateway,
  CheckoutOrderRow,
  CheckoutOrderStatus,
  CheckoutPaymentMethod,
} from '@/lib/checkout/types'

export type CheckoutOrderWithRelations = CheckoutOrderRow & {
  client?: { id: string; name: string; iptv_username: string } | null
  plan?: { id: string; name: string } | null
}

export type CreateCheckoutOrderInput = {
  resellerUserId: string
  clientId: string
  planId: string
  serverId: string | null
  gateway: CheckoutGateway
  paymentMethod: CheckoutPaymentMethod
  amount: number
}

export class CheckoutOrderService {
  private supabase = createApiSupabaseClient(true)

  async createPending(input: CreateCheckoutOrderInput): Promise<CheckoutOrderRow> {
    const id = crypto.randomUUID()
    const external_reference = buildCheckoutExternalReference(id)
    const now = new Date().toISOString()

    const row = {
      id,
      reseller_user_id: input.resellerUserId,
      client_id: input.clientId,
      plan_id: input.planId,
      server_id: input.serverId,
      gateway: input.gateway,
      payment_method: input.paymentMethod,
      status: 'pending' as const,
      amount: input.amount,
      external_reference,
      fulfillment_status: 'pending' as const,
      renewal_attempted: false,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await this.supabase
      .from('checkout_orders')
      .insert(row)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return data as CheckoutOrderRow
  }

  async getById(orderId: string): Promise<CheckoutOrderRow | null> {
    const { data, error } = await this.supabase
      .from('checkout_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as CheckoutOrderRow) ?? null
  }

  async getByExternalReference(ref: string): Promise<CheckoutOrderRow | null> {
    const { data, error } = await this.supabase
      .from('checkout_orders')
      .select('*')
      .eq('external_reference', ref)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as CheckoutOrderRow) ?? null
  }

  async updateGates2bIds(
    orderId: string,
    ids: { transactionId?: string; paymentId?: string }
  ): Promise<void> {
    const patch: Record<string, string> = { updated_at: new Date().toISOString() }
    if (ids.transactionId) patch.gates2b_transaction_id = ids.transactionId
    if (ids.paymentId) patch.gates2b_payment_id = ids.paymentId
    const { error } = await this.supabase.from('checkout_orders').update(patch).eq('id', orderId)
    if (error) throw new Error(error.message)
  }

  async listForReseller(
    resellerUserId: string,
    options?: { limit?: number; status?: CheckoutOrderStatus }
  ): Promise<CheckoutOrderWithRelations[]> {
    let query = this.supabase
      .from('checkout_orders')
      .select(
        `
        *,
        client:clients(id, name, iptv_username),
        plan:plans(id, name)
      `
      )
      .eq('reseller_user_id', resellerUserId)
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 100)

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data as CheckoutOrderWithRelations[]) ?? []
  }

  async markPaid(
    orderId: string,
    meta: {
      gates2bTransactionId?: string | null
      gates2bPaymentId?: string | null
      fulfillmentStatus: CheckoutFulfillmentStatus
      fulfillmentResult: Record<string, unknown> | null
      renewalAttempted: boolean
    }
  ): Promise<CheckoutOrderRow | null> {
    const { data, error } = await this.supabase
      .from('checkout_orders')
      .update({
        status: 'paid' satisfies CheckoutOrderStatus,
        paid_at: new Date().toISOString(),
        gates2b_transaction_id: meta.gates2bTransactionId ?? undefined,
        gates2b_payment_id: meta.gates2bPaymentId ?? undefined,
        fulfillment_status: meta.fulfillmentStatus,
        fulfillment_result: meta.fulfillmentResult,
        renewal_attempted: meta.renewalAttempted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return (data as CheckoutOrderRow) ?? null
  }
}

export const checkoutOrderService = new CheckoutOrderService()
