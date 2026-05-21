export type CheckoutGateway = 'gates2b' | 'cakto'
export type CheckoutPaymentMethod = 'pix' | 'card'
export type CheckoutOrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled'
export type CheckoutFulfillmentStatus = 'pending' | 'completed' | 'failed' | 'skipped' | 'manual'

export type CheckoutSettings = {
  userId: string
  activeGatewayPix: CheckoutGateway
  activeGatewayCard: CheckoutGateway
  caktoEnabled: boolean
  autoRenewalEnabled: boolean
}

export type CheckoutOrderRow = {
  id: string
  reseller_user_id: string
  client_id: string
  plan_id: string
  server_id: string | null
  gateway: CheckoutGateway
  payment_method: CheckoutPaymentMethod
  status: CheckoutOrderStatus
  amount: number
  external_reference: string
  gates2b_transaction_id: string | null
  gates2b_payment_id: string | null
  fulfillment_status: CheckoutFulfillmentStatus
  fulfillment_result: Record<string, unknown> | null
  renewal_attempted: boolean
  paid_at: string | null
  created_at: string
  updated_at: string
}

export const DEFAULT_CHECKOUT_SETTINGS: Omit<CheckoutSettings, 'userId'> = {
  activeGatewayPix: 'gates2b',
  activeGatewayCard: 'gates2b',
  caktoEnabled: false,
  autoRenewalEnabled: true,
}
