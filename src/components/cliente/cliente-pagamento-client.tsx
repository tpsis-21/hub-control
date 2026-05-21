'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Clock, Copy, Loader2 } from 'lucide-react'
import { appToast } from '@/lib/app-toast'

type StatusResponse = {
  success: boolean
  orderId?: string
  status?: string
  paid?: boolean
  thankYouUrl?: string | null
  message?: string
}

type CreateResponse = {
  success: boolean
  pixCode?: string
  qrImage?: string
  message?: string
}

export function ClientePagamentoClient() {
  const searchParams = useSearchParams()
  const orderId = useMemo(
    () => searchParams?.get('orderId')?.trim() ?? '',
    [searchParams]
  )
  const [status, setStatus] = useState<'pending' | 'paid'>('pending')
  const [thankYouUrl, setThankYouUrl] = useState<string | null>(null)
  const [pixCode, setPixCode] = useState('')
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!orderId) return
    const stored = sessionStorage.getItem(`checkout_pix_${orderId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CreateResponse
        if (parsed.pixCode) setPixCode(parsed.pixCode)
        if (parsed.qrImage) setQrImage(parsed.qrImage)
      } catch {
        /* ignore */
      }
    }
  }, [orderId])

  async function checkStatus() {
    if (!orderId) return
    setChecking(true)
    try {
      const res = await fetch(`/api/public/checkout/status?orderId=${encodeURIComponent(orderId)}`, {
        cache: 'no-store',
      })
      const data = (await res.json()) as StatusResponse
      if (!data.success) return
      if (data.paid) {
        setStatus('paid')
        setThankYouUrl(data.thankYouUrl ?? null)
        if (data.thankYouUrl) window.location.assign(data.thankYouUrl)
      }
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (!orderId) return
    void checkStatus()
    const id = window.setInterval(() => void checkStatus(), 4000)
    return () => window.clearInterval(id)
  }, [orderId])

  function copyPix() {
    if (!pixCode) return
    void navigator.clipboard.writeText(pixCode)
    appToast.success('Código PIX copiado')
  }

  if (!orderId) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Link inválido</CardTitle>
          <CardDescription>Volte à área do cliente e escolha o plano novamente.</CardDescription>
        </CardHeader>
        <CardFooterLink />
      </Card>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'paid' ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <Clock className="h-6 w-6 text-primary" />
            )}
            {status === 'paid' ? 'Pagamento confirmado' : 'Aguardando pagamento'}
          </CardTitle>
          <CardDescription>
            {status === 'paid'
              ? 'Redirecionando…'
              : 'Pague o PIX ou conclua no checkout do cartão. Esta página atualiza automaticamente.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pixCode && status !== 'paid' && (
            <div className="space-y-2">
              {qrImage && (
                <img
                  src={qrImage.startsWith('data:') ? qrImage : `data:image/png;base64,${qrImage}`}
                  alt="QR Code PIX"
                  className="mx-auto max-w-[220px] rounded border"
                />
              )}
              <p className="text-xs text-muted-foreground break-all font-mono bg-muted p-3 rounded">
                {pixCode}
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={copyPix}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar código PIX
              </Button>
            </div>
          )}
          <Button type="button" variant="secondary" className="w-full" onClick={checkStatus} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Verificar pagamento agora
          </Button>
        </CardContent>
      </Card>
      <CardFooterLink />
    </div>
  )
}

function CardFooterLink() {
  return (
    <div className="text-center">
      <Button asChild variant="link">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
