import { NextRequest, NextResponse } from 'next/server'
import { checkoutOrderService } from '@/services/checkout-order.service'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId')?.trim()
  if (!orderId) {
    return NextResponse.json({ success: false, message: 'orderId obrigatório' }, { status: 400 })
  }

  try {
    const order = await checkoutOrderService.getById(orderId)
    if (!order) {
      return NextResponse.json({ success: false, message: 'Pedido não encontrado' }, { status: 404 })
    }

    const paid = order.status === 'paid'
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || request.nextUrl.origin

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      paid,
      fulfillmentStatus: order.fulfillment_status,
      paidAt: order.paid_at,
      thankYouUrl: paid ? `${base}/cliente/obrigado?orderId=${order.id}` : null,
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Erro ao consultar pedido' },
      { status: 500 }
    )
  }
}
