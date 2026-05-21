import { NextRequest, NextResponse } from 'next/server'
import { createApiSupabaseClient } from '@/lib/supabase/clients/api'
import { checkoutSettingsService } from '@/services/checkout-settings.service'
import type { CheckoutGateway } from '@/lib/checkout/types'
import { z } from 'zod'

const saveSchema = z.object({
  activeGatewayPix: z.enum(['gates2b', 'cakto']),
  activeGatewayCard: z.enum(['gates2b', 'cakto']),
  caktoEnabled: z.boolean(),
  autoRenewalEnabled: z.boolean(),
})

export async function GET() {
  try {
    const supabase = createApiSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Não autenticado' }, { status: 401 })
    }

    const settings = await checkoutSettingsService.getForReseller(user.id)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || ''

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        webhookGates2bUrl: appUrl ? `${appUrl}/api/gates2b/webhook` : '/api/gates2b/webhook',
        webhookCaktoUrl: appUrl ? `${appUrl}/api/webhooks/cakto` : '/api/webhooks/cakto',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao carregar configurações',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createApiSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Não autenticado' }, { status: 401 })
    }

    const body = saveSchema.parse(await request.json())
    const saved = await checkoutSettingsService.saveForReseller(user.id, body)

    return NextResponse.json({ success: true, data: saved })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao salvar',
      },
      { status: 500 }
    )
  }
}
