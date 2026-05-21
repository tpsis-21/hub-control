import { createApiSupabaseClient } from '@/lib/supabase/unified-client'
import {
  DEFAULT_CHECKOUT_SETTINGS,
  type CheckoutGateway,
  type CheckoutSettings,
} from '@/lib/checkout/types'

type SettingsRow = {
  user_id: string
  active_gateway_pix: CheckoutGateway
  active_gateway_card: CheckoutGateway
  cakto_enabled: boolean
  auto_renewal_enabled: boolean
}

function mapRow(row: SettingsRow): CheckoutSettings {
  return {
    userId: row.user_id,
    activeGatewayPix: row.active_gateway_pix,
    activeGatewayCard: row.active_gateway_card,
    caktoEnabled: row.cakto_enabled,
    autoRenewalEnabled: row.auto_renewal_enabled,
  }
}

export type SaveCheckoutSettingsInput = {
  activeGatewayPix: CheckoutGateway
  activeGatewayCard: CheckoutGateway
  caktoEnabled: boolean
  autoRenewalEnabled: boolean
}

export class CheckoutSettingsService {
  async getForReseller(userId: string): Promise<CheckoutSettings> {
    const supabase = createApiSupabaseClient(true)
    const { data } = await supabase
      .from('checkout_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!data) {
      return { userId, ...DEFAULT_CHECKOUT_SETTINGS }
    }
    return mapRow(data as SettingsRow)
  }

  async saveForReseller(userId: string, input: SaveCheckoutSettingsInput): Promise<CheckoutSettings> {
    const supabase = createApiSupabaseClient(true)
    const row = {
      user_id: userId,
      active_gateway_pix: input.activeGatewayPix,
      active_gateway_card: input.activeGatewayCard,
      cakto_enabled: input.caktoEnabled,
      auto_renewal_enabled: input.autoRenewalEnabled,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('checkout_settings')
      .upsert(row, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return mapRow(data as SettingsRow)
  }

  /** Gateway efetivo para o pedido (Cakto só se habilitado e URL do plano existir). */
  resolveGateway(
    settings: CheckoutSettings,
    paymentMethod: 'pix' | 'card',
    planCaktoUrl: string | null | undefined,
    requested?: CheckoutGateway | 'auto'
  ): CheckoutGateway {
    if (requested && requested !== 'auto') {
      if (requested === 'cakto' && settings.caktoEnabled && planCaktoUrl) return 'cakto'
      return requested === 'cakto' ? 'gates2b' : requested
    }
    const preferred =
      paymentMethod === 'card' ? settings.activeGatewayCard : settings.activeGatewayPix
    if (preferred === 'cakto' && settings.caktoEnabled && planCaktoUrl) return 'cakto'
    return 'gates2b'
  }
}

export const checkoutSettingsService = new CheckoutSettingsService()
