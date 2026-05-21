'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Loader2, Save, ShoppingCart, Info, List } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { CheckoutGateway } from '@/lib/checkout/types'
import { Gates2bIntegrationGuide } from '@/components/integrations/gates2b-integration-guide'

type SettingsPayload = {
  activeGatewayPix: CheckoutGateway
  activeGatewayCard: CheckoutGateway
  caktoEnabled: boolean
  autoRenewalEnabled: boolean
  webhookGates2bUrl?: string
  webhookCaktoUrl?: string
}

export function CheckoutConfig() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [gates2bConfigured, setGates2bConfigured] = useState<boolean | undefined>(undefined)
  const [settings, setSettings] = useState<SettingsPayload>({
    activeGatewayPix: 'gates2b',
    activeGatewayCard: 'gates2b',
    caktoEnabled: false,
    autoRenewalEnabled: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, gates2bRes] = await Promise.all([
        fetch('/api/checkout/settings'),
        fetch('/api/gates2b/config'),
      ])
      const json = await settingsRes.json()
      const g2b = await gates2bRes.json()
      if (g2b.success && g2b.data) {
        setGates2bConfigured(Boolean(g2b.data.configured))
      }
      if (json.success && json.data) {
        setSettings({
          activeGatewayPix: json.data.activeGatewayPix,
          activeGatewayCard: json.data.activeGatewayCard,
          caktoEnabled: json.data.caktoEnabled,
          autoRenewalEnabled: json.data.autoRenewalEnabled,
          webhookGates2bUrl: json.data.webhookGates2bUrl,
          webhookCaktoUrl: json.data.webhookCaktoUrl,
        })
      }
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar o checkout.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/checkout/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const json = await res.json()
      if (!json.success) {
        toast({ title: 'Erro', description: json.message || 'Falha ao salvar', variant: 'destructive' })
        return
      }
      toast({ title: 'Salvo', description: 'Configurações de checkout atualizadas.' })
    } catch {
      toast({ title: 'Erro', description: 'Falha de conexão', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Gates2bIntegrationGuide
        webhookHubUrl={settings.webhookGates2bUrl}
        includeCheckoutSteps
        apiConfigured={gates2bConfigured}
      />

      {settings.caktoEnabled && settings.webhookCaktoUrl && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <span>
              <strong>Cakto:</strong> cadastre no gateway Cakto a URL de webhook:
            </span>
            <code className="block text-xs break-all font-mono bg-muted rounded p-2">
              {settings.webhookCaktoUrl}
            </code>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <Link href="/checkout/pedidos">
            <List className="h-4 w-4 mr-2" />
            Ver pedidos de checkout
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Checkout do cliente
          </CardTitle>
          <CardDescription>Gateways padrão e renovação automática após pagamento confirmado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Renovação automática no painel</Label>
              <p className="text-sm text-muted-foreground">
                Após PIX/cartão confirmado, renova TheBest/NATV se o servidor permitir.
              </p>
            </div>
            <Switch
              checked={settings.autoRenewalEnabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, autoRenewalEnabled: v }))}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Oferecer Cakto</Label>
              <p className="text-sm text-muted-foreground">
                Permite usar link Cakto nos planos que tiverem URL cadastrada.
              </p>
            </div>
            <Switch
              checked={settings.caktoEnabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, caktoEnabled: v }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Gateway padrão — PIX</Label>
              <Select
                value={settings.activeGatewayPix}
                onValueChange={(v: CheckoutGateway) =>
                  setSettings((s) => ({ ...s, activeGatewayPix: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gates2b">Gates2b</SelectItem>
                  <SelectItem value="cakto" disabled={!settings.caktoEnabled}>
                    Cakto
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gateway padrão — Cartão</Label>
              <Select
                value={settings.activeGatewayCard}
                onValueChange={(v: CheckoutGateway) =>
                  setSettings((s) => ({ ...s, activeGatewayCard: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gates2b">Gates2b</SelectItem>
                  <SelectItem value="cakto" disabled={!settings.caktoEnabled}>
                    Cakto
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar configurações
          </Button>
        </CardContent>
      </Card>

    </div>
  )
}
