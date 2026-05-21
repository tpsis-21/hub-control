'use server'

import { createServerSupabaseClientForActions } from '@/lib/supabase/clients/server'
import { checkoutOrderService } from '@/services/checkout-order.service'
import { paymentFulfillmentService } from '@/services/payment-fulfillment.service'
import { revalidatePath } from 'next/cache'

export async function getCheckoutOrders() {
  const supabase = await createServerSupabaseClientForActions()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false as const, error: 'Não autenticado', orders: [] }
  }

  try {
    const orders = await checkoutOrderService.listForReseller(user.id)
    return { success: true as const, orders }
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : 'Erro ao carregar pedidos',
      orders: [],
    }
  }
}

export async function retryCheckoutFulfillment(orderId: string) {
  const supabase = await createServerSupabaseClientForActions()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado' }
  }

  const order = await checkoutOrderService.getById(orderId)
  if (!order || order.reseller_user_id !== user.id) {
    return { success: false, error: 'Pedido não encontrado' }
  }

  if (order.status !== 'paid') {
    return { success: false, error: 'Só é possível reprocessar pedidos já pagos' }
  }

  try {
    const result = await paymentFulfillmentService.retryPanelRenewal(orderId)
    revalidatePath('/checkout/pedidos')
    return {
      success: result.fulfillmentStatus === 'completed',
      message: result.message,
      fulfillmentStatus: result.fulfillmentStatus,
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Erro ao reprocessar',
    }
  }
}
