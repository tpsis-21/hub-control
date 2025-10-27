import { BPIXDashboard } from '@/components/integrations/bpix-dashboard'

export default function BPIXDashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <BPIXDashboard />
    </div>
  )
}

export const metadata = {
  title: 'Dashboard BPIX - Hub Control',
  description: 'Gerencie pagamentos e faturas PIX através da integração BPIX'
}
