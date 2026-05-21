import { Gates2bDashboard } from '@/components/integrations/gates2b-dashboard'

export default function Gates2bDashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <Gates2bDashboard />
    </div>
  )
}

export const metadata = {
  title: 'Dashboard Gates2b - Hub Control',
  description: 'Gerencie pagamentos e faturas PIX através da integração Gates2b'
}
