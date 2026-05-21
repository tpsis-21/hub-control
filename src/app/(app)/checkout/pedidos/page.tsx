import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { CheckoutOrdersTable } from '@/components/checkout/checkout-orders-table'
import { getCheckoutOrders } from './actions'

export default async function CheckoutPedidosPage() {
  const result = await getCheckoutOrders()
  const orders = result.success ? result.orders : []

  const summary = {
    total: orders.length,
    paid: orders.filter((o) => o.status === 'paid').length,
    pending: orders.filter((o) => o.status === 'pending').length,
    failedFulfillment: orders.filter(
      (o) => o.status === 'paid' && (o.fulfillment_status === 'failed' || o.fulfillment_status === 'manual')
    ).length,
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground max-w-xl">
          Renovações iniciadas na área do cliente (PIX, cartão ou Cakto) — processadas no Hub.
        </p>
        <Button variant="outline" asChild>
          <Link href="/integracoes">
            <Settings className="h-4 w-4 mr-2" />
            Configurar checkout
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.paid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Aguardando PIX</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Painel pendente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.failedFulfillment}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>
            Referência externa: <code className="text-xs">hubco_…</code> (Gates2b). Use reprocessar se o pagamento
            entrou mas o painel não renovou.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!result.success && (
            <p className="text-destructive text-sm mb-4">{result.error}</p>
          )}
          <CheckoutOrdersTable orders={orders} />
        </CardContent>
      </Card>
    </div>
  )
}
