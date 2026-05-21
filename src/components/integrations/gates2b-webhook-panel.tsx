'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import { CopyableUrlField } from '@/components/integrations/gates2b-integration-guide'
import { useWebhookHubUrl } from '@/hooks/use-webhook-hub-url'

export function Gates2bWebhookPanel() {
  const { webhookHubUrl, isLocalDev } = useWebhookHubUrl()

  return (
    <div className="space-y-4">
      {isLocalDev ? (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Ambiente local: <strong>não cadastre</strong> esta URL no painel Gates2b ainda. Quando o
            Hub estiver em produção, defina <code className="text-xs">NEXT_PUBLIC_APP_URL</code> e{' '}
            <code className="text-xs">GATES2B_WEBHOOK_SECRET</code>, faça redeploy e use a URL HTTPS
            abaixo no painel. Checklist: <code className="text-xs">docs/GATES2B_CONFIGURAR_APOS_DEPLOY.md</code>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Cole esta URL no <strong>seu</strong> painel Gates2b (Integração → Webhooks). Mantenha
            também a URL do n8n (legado). Passo a passo na aba <strong>Guia</strong>.
          </AlertDescription>
        </Alert>
      )}
      <CopyableUrlField
        label={
          isLocalDev
            ? 'Webhook Hub (cadastrar no painel após deploy)'
            : 'Webhook Hub Control (sua conta Gates2b)'
        }
        url={webhookHubUrl}
      />
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Eventos que o Hub processa</h4>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            <code>payment.paid</code> + referência <code>hubco_</code> → confirma pedido e renova
            painel (se configurado)
          </li>
          <li>
            Outras referências: ignoradas pelo Hub — se você tem outra URL de webhook (automação,
            ERP, etc.), configure-a para ignorar <code>hubco_</code> (ver aba Guia).
          </li>
        </ul>
      </div>
    </div>
  )
}
