import { createApiSupabaseClient } from '@/lib/supabase/unified-client'
import { checkoutSettingsService } from '@/services/checkout-settings.service'
import type { CheckoutGateway } from '@/lib/checkout/types'

export type ClientCheckoutOptions = {
  paymentEnabled: boolean
  caktoEnabled: boolean
  activeGatewayPix: CheckoutGateway
  activeGatewayCard: CheckoutGateway
  autoRenewalEnabled: boolean
}

const DEFAULT_OPTIONS: ClientCheckoutOptions = {
  paymentEnabled: true,
  caktoEnabled: false,
  activeGatewayPix: 'gates2b',
  activeGatewayCard: 'gates2b',
  autoRenewalEnabled: true,
}

export async function getClientCheckoutOptions(
  _clientId: string,
  serverId: string | null,
  managerId: string | null
): Promise<ClientCheckoutOptions> {
  const supabase = createApiSupabaseClient(true)

  if (serverId) {
    const { data: server } = await supabase
      .from('servers')
      .select('user_id, payment_gateway')
      .eq('id', serverId)
      .maybeSingle()

    if (server?.payment_gateway === false) {
      return { ...DEFAULT_OPTIONS, paymentEnabled: false }
    }

    const resellerId = server?.user_id ?? managerId
    if (!resellerId) return DEFAULT_OPTIONS

    const settings = await checkoutSettingsService.getForReseller(resellerId)
    return {
      paymentEnabled: true,
      caktoEnabled: settings.caktoEnabled,
      activeGatewayPix: settings.activeGatewayPix,
      activeGatewayCard: settings.activeGatewayCard,
      autoRenewalEnabled: settings.autoRenewalEnabled,
    }
  }

  if (managerId) {
    const settings = await checkoutSettingsService.getForReseller(managerId)
    return {
      paymentEnabled: true,
      caktoEnabled: settings.caktoEnabled,
      activeGatewayPix: settings.activeGatewayPix,
      activeGatewayCard: settings.activeGatewayCard,
      autoRenewalEnabled: settings.autoRenewalEnabled,
    }
  }

  return DEFAULT_OPTIONS
}
