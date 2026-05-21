'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreditCard, Loader2 } from 'lucide-react'
import { appToast } from '@/lib/app-toast'
import type { CheckoutGateway } from '@/lib/checkout/types'

type Props = {
  uniqueLink: string
  planId: string
  planName: string
  paymentMethod?: 'pix' | 'card'
  gateway?: CheckoutGateway | 'auto'
  className?: string
  caktoAvailable?: boolean
}

export function RenewalCheckoutButton({
  uniqueLink,
  planId,
  planName,
  paymentMethod = 'pix',
  gateway = 'auto',
  caktoAvailable = false,
  className,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRenew() {
    setLoading(true)
    try {
      const res = await fetch('/api/public/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uniqueLink,
          planId,
          paymentMethod,
          gateway: caktoAvailable ? gateway : 'gates2b',
        }),
      })
      const data = await res.json()
      if (!data.success) {
        appToast.error(data.message || 'Não foi possível iniciar o pagamento')
        return
      }

      if (data.gateway === 'cakto' && data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }

      if (data.checkoutUrl && paymentMethod === 'card') {
        window.location.href = data.checkoutUrl
        return
      }

      if (data.orderId && (data.pixCode || data.qrImage)) {
        sessionStorage.setItem(
          `checkout_pix_${data.orderId}`,
          JSON.stringify({ pixCode: data.pixCode, qrImage: data.qrImage })
        )
      }

      if (data.pagamentoUrl) {
        const path = data.pagamentoUrl.startsWith('http')
          ? `${new URL(data.pagamentoUrl).pathname}${new URL(data.pagamentoUrl).search}`
          : data.pagamentoUrl
        router.push(path)
        return
      }

      appToast.error('Resposta de pagamento incompleta')
    } catch {
      appToast.error('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button className={className ?? 'w-full'} onClick={handleRenew} disabled={loading}>
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <CreditCard className="w-4 h-4 mr-2" />
      )}
      Renovar — {planName}
    </Button>
  )
}
