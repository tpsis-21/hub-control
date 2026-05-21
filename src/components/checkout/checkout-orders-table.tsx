'use client'

import { useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormattedCurrency } from '@/components/ui/formatted-currency'
import { FormattedDate } from '@/components/app/formatted-date'
import { Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { retryCheckoutFulfillment } from '@/app/(app)/checkout/pedidos/actions'
import type { CheckoutOrderWithRelations } from '@/services/checkout-order.service'

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  paid: { label: 'Pago', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
  expired: { label: 'Expirado', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
}

const fulfillmentLabels: Record<string, string> = {
  pending: 'Pendente',
  completed: 'Renovado',
  failed: 'Falha painel',
  skipped: 'Ignorado',
  manual: 'Manual',
}

type Props = {
  orders: CheckoutOrderWithRelations[]
}

export function CheckoutOrdersTable({ orders }: Props) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  function handleRetry(orderId: string) {
    startTransition(async () => {
      const result = await retryCheckoutFulfillment(orderId)
      if (result.success) {
        toast({ title: 'Sucesso', description: result.message })
      } else {
        toast({
          title: 'Erro',
          description: result.error || result.message || 'Falha ao reprocessar',
          variant: 'destructive',
        })
      }
    })
  }

  if (orders.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum pedido de checkout ainda. Quando um cliente renovar pela área do cliente, os pedidos aparecem aqui.
      </p>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Gateway</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Painel</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const st = statusLabels[order.status] ?? { label: order.status, variant: 'outline' as const }
            const canRetry =
              order.status === 'paid' &&
              (order.fulfillment_status === 'failed' || order.fulfillment_status === 'manual')

            return (
              <TableRow key={order.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  <FormattedDate dateString={order.paid_at || order.created_at} format="dd/MM/yyyy HH:mm" />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{order.client?.name ?? '—'}</div>
                  {order.client?.iptv_username && (
                    <div className="text-xs text-muted-foreground">{order.client.iptv_username}</div>
                  )}
                </TableCell>
                <TableCell>{order.plan?.name ?? '—'}</TableCell>
                <TableCell>
                  <FormattedCurrency value={Number(order.amount)} />
                </TableCell>
                <TableCell className="capitalize">{order.gateway}</TableCell>
                <TableCell className="uppercase text-xs">{order.payment_method}</TableCell>
                <TableCell>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {fulfillmentLabels[order.fulfillment_status] ?? order.fulfillment_status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {canRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleRetry(order.id)}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Reprocessar painel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
