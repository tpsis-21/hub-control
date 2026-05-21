import { NextRequest, NextResponse } from 'next/server'
import { createApiSupabaseClient } from '@/lib/supabase/unified-client'
import { checkoutSettingsService } from '@/services/checkout-settings.service'
import { guardInvalidCheckoutUniqueLink } from '@/lib/checkout-invalid-link-rate-limit'
import {
  enforcePublicCheckoutRateLimit,
  jsonRateLimited,
} from '@/lib/rate-limit-response'

export const runtime = 'nodejs'

function normalizeUniqueLink(raw: string): string {
  const t = raw.trim()
  if (t.startsWith('/cliente/')) return t
  return `/cliente/link_${t.replace(/^link_/, '')}`
}

export async function GET(request: NextRequest) {
  const rateLimitResult = await enforcePublicCheckoutRateLimit(request)
  if (!rateLimitResult.success) {
    return jsonRateLimited(rateLimitResult)
  }

  const link = request.nextUrl.searchParams.get('uniqueLink')?.trim()
  if (!link) {
    return NextResponse.json({ success: false, message: 'uniqueLink obrigatório' }, { status: 400 })
  }

  try {
    const supabase = createApiSupabaseClient(true)
    const uniqueLink = normalizeUniqueLink(link)

    const { data: client } = await supabase
      .from('clients')
      .select('id, server_id, manager_id')
      .eq('unique_link', uniqueLink)
      .maybeSingle()

    if (!client) {
      const blocked = await guardInvalidCheckoutUniqueLink(request, uniqueLink)
      if (blocked) return blocked
      return NextResponse.json({ success: false, message: 'Cliente não encontrado' }, { status: 404 })
    }

    let resellerUserId = client.manager_id
    if (client.server_id) {
      const { data: server } = await supabase
        .from('servers')
        .select('user_id, payment_gateway')
        .eq('id', client.server_id)
        .maybeSingle()
      if (server?.user_id) resellerUserId = server.user_id
      if (server?.payment_gateway === false) {
        return NextResponse.json({
          success: true,
          paymentEnabled: false,
          message: 'Pagamento online desabilitado para este servidor',
        })
      }
    }

    if (!resellerUserId) {
      return NextResponse.json({ success: false, message: 'Revendedor não configurado' }, { status: 400 })
    }

    const settings = await checkoutSettingsService.getForReseller(resellerUserId)

    return NextResponse.json({
      success: true,
      paymentEnabled: true,
      caktoEnabled: settings.caktoEnabled,
      activeGatewayPix: settings.activeGatewayPix,
      activeGatewayCard: settings.activeGatewayCard,
      autoRenewalEnabled: settings.autoRenewalEnabled,
    })
  } catch {
    return NextResponse.json({ success: false, message: 'Erro ao carregar opções' }, { status: 500 })
  }
}
