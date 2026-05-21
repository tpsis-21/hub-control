'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { useWebhookHubUrl } from '@/hooks/use-webhook-hub-url'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  ListOrdered,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function CopyableUrlField({ label, url }: { label: string; url: string }) {
  const { toast } = useToast()

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Copiado', description: label })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar.', variant: 'destructive' })
    }
  }, [label, toast, url])

  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copiar
        </Button>
      </div>
      <code className="block text-xs break-all font-mono">{url}</code>
    </div>
  )
}

type GuideProps = {
  /** Se omitido, usa origin do navegador + /api/gates2b/webhook */
  webhookHubUrl?: string
  /** Exibir passos do checkout na área do cliente */
  includeCheckoutSteps?: boolean
  /** Gates2b já salvo no Hub (API key) */
  apiConfigured?: boolean
}

export function Gates2bIntegrationGuide({
  webhookHubUrl: webhookHubUrlProp,
  includeCheckoutSteps = true,
  apiConfigured,
}: GuideProps) {
  const fromHook = useWebhookHubUrl()
  const webhookHubUrl = webhookHubUrlProp ?? fromHook.webhookHubUrl
  const isLocalDev = webhookHubUrlProp ? false : fromHook.isLocalDev

  const clienteAreaExample =
    typeof window !== 'undefined'
      ? `${window.location.origin}/cliente/SEU_LINK_UNICO`
      : '/cliente/SEU_LINK_UNICO'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />
          Guia de integração Gates2b
        </CardTitle>
        <CardDescription>
          Passo a passo para o <strong>seu</strong> usuário revendedor: API, webhook no painel
          Gates2b e checkout automático no Hub Control.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLocalDev ? (
          <Alert className="border-amber-500/40 bg-amber-500/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Webhook no painel Gates2b:</strong> configure só depois do deploy, com URL{' '}
              <strong>HTTPS</strong> pública. Em <code className="text-xs">localhost</code> a Gates2b
              não alcança o Hub. Guia completo:{' '}
              <code className="text-xs">docs/GATES2B_CONFIGURAR_APOS_DEPLOY.md</code> — use{' '}
              <code className="text-xs">NEXT_PUBLIC_APP_URL</code> no servidor e cadastre{' '}
              <code className="text-xs">/api/gates2b/webhook</code> no painel na hora certa.
            </AlertDescription>
          </Alert>
        ) : null}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            A Gates2b envia <strong>todos</strong> os eventos de pagamento para <strong>cada</strong>{' '}
            URL que você cadastrar (não dá para filtrar por tipo no painel). Inclua a URL do Hub
            abaixo <strong>além</strong> de qualquer outra que já use (n8n, Zapier, script, etc.).
            O Hub só processa referências <code className="text-xs">hubco_</code> (checkout da área
            do cliente).
          </AlertDescription>
        </Alert>

        {apiConfigured !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            {apiConfigured ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>API Gates2b salva nesta conta.</span>
              </>
            ) : (
              <Badge variant="secondary">Complete o passo 1 para gerar cobranças</Badge>
            )}
          </div>
        )}

        <Accordion type="multiple" defaultValue={['api', 'webhook', 'checkout']} className="w-full">
          <AccordionItem value="api">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 shrink-0" />
                1. Chave API no Hub Control
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Acesse{' '}
                  <a
                    href="https://painel.gates2b.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-1"
                  >
                    painel.gates2b.com
                    <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  → <strong>Integração</strong> e copie sua chave API (Bearer).
                </li>
                <li>
                  Nesta página (<strong>Integrações → Gates2b → Configuração</strong>), informe URL
                  base <code className="text-xs">https://api.gates2b.com</code> e o token.
                </li>
                <li>
                  Clique em <strong>Salvar</strong> e, na aba <strong>Teste</strong>, use{' '}
                  <strong>Testar conexão</strong>.
                </li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="webhook">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 shrink-0" />
                2. Webhook no painel Gates2b (sua conta)
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <CopyableUrlField
                label={
                  isLocalDev
                    ? 'URL do webhook (após deploy — pré-visualização)'
                    : 'URL para cadastrar no painel Gates2b'
                }
                url={webhookHubUrl}
              />
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  {isLocalDev ? (
                    <>
                      <strong>Após o deploy:</strong> no painel Gates2b →{' '}
                      <strong>Integração / Webhooks</strong>, <strong>adicione</strong> a URL HTTPS do
                      Hub (mantenha URLs existentes, ex.: n8n).
                    </>
                  ) : (
                    <>
                      No painel Gates2b → <strong>Integração / Webhooks</strong>,{' '}
                      <strong>adicione</strong> a URL do Hub (não precisa remover as URLs que já
                      existem).
                    </>
                  )}
                </li>
                <li>
                  Método: <code className="text-xs">POST</code>, conteúdo JSON. O Hub confirma
                  pagamentos com status pago (PIX/cartão).
                </li>
                <li>
                  A assinatura do webhook é validada no servidor do Hub (
                  <code className="text-xs">GATES2B_WEBHOOK_SECRET</code> no deploy). Se o painel
                  Gates2b pedir um secret, use o valor definido pelo administrador do sistema.
                </li>
              </ol>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 text-sm">
                <p className="font-medium text-foreground">
                  Já recebe eventos em outro lugar? (n8n, Zapier, Make, servidor próprio, etc.)
                </p>
                <p className="text-muted-foreground">
                  Como a Gates2b dispara o <strong>mesmo</strong> evento para todas as URLs, configure
                  cada automação para <strong>não tratar</strong> pagamentos do checkout Hub quando o
                  campo <code className="text-xs">external_reference</code> começar com{' '}
                  <code className="text-xs">hubco_</code>. Esses pagamentos são concluídos só pelo Hub
                  (pedido + renovação no painel).
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <strong>Condição sugerida:</strong>{' '}
                    <code className="text-xs">external_reference</code> não começa com{' '}
                    <code className="text-xs">hubco_</code> → segue seu fluxo atual.
                  </li>
                  <li>
                    <strong>Se começa com</strong> <code className="text-xs">hubco_</code> → encerre o
                    fluxo (no-op) naquela integração; não renove painel nem duplique cobrança.
                  </li>
                  <li>
                    Pagamentos antigos (CheckoutTP, bots, links próprios) costumam usar outras
                    referências — continuam na sua automação habitual.
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground border-t pt-3">
                  <strong>Exemplo (operação com n8n):</strong> no fluxo &quot;Eventos Gates2B&quot;, um IF
                  com <code className="text-xs">hubco_</code> no ramo verdadeiro para em stop — detalhe
                  interno da equipe, não obrigatório se você não usa n8n.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {includeCheckoutSteps && (
            <AccordionItem value="checkout">
              <AccordionTrigger className="text-left">
                <span className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 shrink-0" />
                  3. Checkout na área do cliente
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <Link href="/integracoes" className="text-primary underline">
                      Integrações → Checkout
                    </Link>
                    : ative <strong>Renovação automática no painel</strong> e gateways PIX/cartão
                    (Gates2b).
                  </li>
                  <li>
                    Em <Link href="/planos" className="text-primary underline">Planos</Link>, cadastre
                    preços; opcional: link Cakto por plano se usar Cakto.
                  </li>
                  <li>
                    No cadastro do <strong>servidor</strong> usado pelo cliente, marque{' '}
                    <strong>Gateway de pagamento</strong> e <strong>Renovação automática</strong>.
                  </li>
                  <li>
                    No <strong>cliente</strong>: TheBest → campo ID no painel (
                    <code className="text-xs">iptv_user_id</code>); NATV → usuário no painel.
                  </li>
                  <li>
                    Envie ao cliente o link da área (campo link único no cadastro):
                    <CopyableUrlField label="Exemplo de URL da área do cliente" url={clienteAreaExample} />
                  </li>
                  <li>
                    Acompanhe pedidos em{' '}
                    <Link href="/checkout/pedidos" className="text-primary underline">
                      Checkout → Pedidos
                    </Link>
                    . Se pagou e não renovou, use <strong>Reprocessar painel</strong>.
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="verify">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 shrink-0" />
                4. Conferir se está funcionando
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-4">
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  Teste de conexão Gates2b OK na aba Teste.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  PIX de teste na área do cliente; pedido aparece em Checkout → Pedidos como pago.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  Vencimento do cliente atualizado e renovação no painel (se automação ligada).
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
