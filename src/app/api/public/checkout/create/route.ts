import { NextRequest, NextResponse } from 'next/server'
import { createApiSupabaseClient } from '@/lib/supabase/unified-client'
import { paymentService, PaymentServiceError } from '@/services/payment.service'
import { checkoutOrderService } from '@/services/checkout-order.service'
import { checkoutSettingsService } from '@/services/checkout-settings.service'
import type { CheckoutGateway } from '@/lib/checkout/types'
import { LoggerService } from '@/services/logger.service'
import { guardInvalidCheckoutUniqueLink } from '@/lib/checkout-invalid-link-rate-limit'
import {
  enforcePublicCheckoutRateLimit,
  jsonRateLimited,
} from '@/lib/rate-limit-response'

export const runtime = 'nodejs'

type Body = {
  uniqueLink: string
  planId: string
  paymentMethod?: 'pix' | 'card'
  gateway?: CheckoutGateway | 'auto'
}

function normalizeUniqueLink(raw: string): string {
  const t = raw.trim()
  if (t.startsWith('/cliente/')) return t
  return `/cliente/link_${t.replace(/^link_/, '')}`
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await enforcePublicCheckoutRateLimit(request)
  if (!rateLimitResult.success) {
    return jsonRateLimited(rateLimitResult)
  }

  try {
    let body: Body
    try {
      body = (await request.json()) as Body
    } catch {
      return NextResponse.json({ success: false, message: 'JSON inválido' }, { status: 400 })
    }

    if (!body.uniqueLink?.trim() || !body.planId?.trim()) {
      return NextResponse.json(
        { success: false, message: 'uniqueLink e planId são obrigatórios' },
        { status: 400 }
      )
    }

    const paymentMethod = body.paymentMethod === 'card' ? 'card' : 'pix'
    const supabase = createApiSupabaseClient(true)
    const uniqueLink = normalizeUniqueLink(body.uniqueLink)

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, whatsapp, server_id, manager_id, plan_id, status')
      .eq('unique_link', uniqueLink)
      .maybeSingle()

    if (clientError || !client) {
      const blocked = await guardInvalidCheckoutUniqueLink(request, uniqueLink)
      if (blocked) return blocked
      return NextResponse.json({ success: false, message: 'Cliente não encontrado' }, { status: 404 })
    }

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, name, price, validity, screens, is_public, group_id, cakto_url')
      .eq('id', body.planId)
      .maybeSingle()

    if (planError || !plan) {
      return NextResponse.json({ success: false, message: 'Plano não encontrado' }, { status: 404 })
    }

    if (!plan.is_public) {
      return NextResponse.json({ success: false, message: 'Plano não disponível para renovação' }, { status: 403 })
    }

    const serverId = client.server_id
    if (!serverId) {
      return NextResponse.json(
        { success: false, message: 'Cliente sem servidor configurado. Contate o suporte.' },
        { status: 400 }
      )
    }

    const { data: server } = await supabase
      .from('servers')
      .select('id, user_id, payment_gateway, renewal_automation, name')
      .eq('id', serverId)
      .single()

    const resellerUserId = server?.user_id ?? client.manager_id
    if (!resellerUserId) {
      return NextResponse.json(
        { success: false, message: 'Revendedor não identificado para este cliente' },
        { status: 400 }
      )
    }

    if (server && server.payment_gateway === false) {
      return NextResponse.json(
        { success: false, message: 'Pagamento online não habilitado para este servidor' },
        { status: 403 }
      )
    }

    const settings = await checkoutSettingsService.getForReseller(resellerUserId)
    const gateway = checkoutSettingsService.resolveGateway(
      settings,
      paymentMethod,
      plan.cakto_url,
      body.gateway
    )

    const amount = Number(plan.price)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Valor do plano inválido' }, { status: 400 })
    }

    const order = await checkoutOrderService.createPending({
      resellerUserId,
      clientId: client.id,
      planId: plan.id,
      serverId,
      gateway,
      paymentMethod,
      amount,
    })

    if (gateway === 'cakto') {
      const caktoUrl = String(plan.cakto_url || '').trim()
      if (!caktoUrl) {
        return NextResponse.json(
          { success: false, message: 'Plano sem link Cakto configurado' },
          { status: 400 }
        )
      }
      return NextResponse.json({
        success: true,
        gateway: 'cakto',
        orderId: order.id,
        redirectUrl: caktoUrl,
        externalReference: order.external_reference,
      })
    }

    await paymentService.ensureConfigured(resellerUserId)

    const description = `Renovação ${plan.name} — ${client.name}`.slice(0, 200)
    const redirectBase =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      request.nextUrl.origin

    if (paymentMethod === 'card') {
      const card = await paymentService.createCardPayment(resellerUserId, {
        amount,
        clientMode: client.email ? 'fillDataNow' : 'noNeedToSpecify',
        installments: 1,
        external_reference: order.external_reference,
        description,
        redirect_url: `${redirectBase}/cliente/pagamento?orderId=${order.id}`,
      })
      const checkoutUrl = card.data?.checkout_url
      if (card.data?.id) {
        await checkoutOrderService.updateGates2bIds(order.id, {
          paymentId: String(card.data.id),
        })
      }
      return NextResponse.json({
        success: true,
        gateway: 'gates2b',
        paymentMethod: 'card',
        orderId: order.id,
        checkoutUrl,
        externalReference: order.external_reference,
        pagamentoUrl: `${redirectBase}/cliente/pagamento?orderId=${order.id}`,
      })
    }

    const pix = await paymentService.createPixPayment(resellerUserId, {
      amount,
      description,
      clientMode: 'noNeedToSpecify',
      external_reference: order.external_reference,
      email: client.email ?? undefined,
      name_client: client.name,
      phoneNumber: client.whatsapp ?? undefined,
      redirect_url: `${redirectBase}/cliente/pagamento?orderId=${order.id}`,
    })

    const txId = pix.data?.id_transaction ?? pix.data?.transaction_pix_id
    if (txId) {
      await checkoutOrderService.updateGates2bIds(order.id, {
        transactionId: String(txId),
        paymentId: String(pix.data?.checkout_id ?? txId),
      })
    }

    return NextResponse.json({
      success: true,
      gateway: 'gates2b',
      paymentMethod: 'pix',
      orderId: order.id,
      externalReference: order.external_reference,
      pagamentoUrl: `${redirectBase}/cliente/pagamento?orderId=${order.id}`,
      pixCode: pix.data?.qr_text ?? pix.data?.emv,
      qrImage: pix.data?.qr_image,
      transactionId: txId,
    })
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return NextResponse.json(
        { success: false, message: error.message, error: error.code },
        { status: error.httpStatus }
      )
    }
    LoggerService.error('Erro ao criar checkout', 'PublicCheckoutCreate', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { success: false, message: 'Erro ao iniciar pagamento' },
      { status: 500 }
    )
  }
}
