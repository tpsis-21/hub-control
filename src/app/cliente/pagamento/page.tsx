import { Suspense } from 'react'
import { ClientePagamentoClient } from '@/components/cliente/cliente-pagamento-client'

export default function ClientePagamentoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background py-12 px-4">
      <Suspense fallback={<p className="text-center text-muted-foreground">Carregando…</p>}>
        <ClientePagamentoClient />
      </Suspense>
    </div>
  )
}
