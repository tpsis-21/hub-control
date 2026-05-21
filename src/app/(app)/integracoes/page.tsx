'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Settings, 
  Plug, 
  Zap, 
  MessageSquare, 
  Mail,
  ExternalLink,
  CreditCard,
  Package,
  ShoppingCart,
} from 'lucide-react'
import { CheckoutConfig } from '@/components/integrations/checkout-config'
import { NATVConfig } from '@/components/integrations/natv-config'
import { Gates2bConfig } from '@/components/integrations/gates2b-config'
import { Gates2bMetrics } from '@/components/integrations/gates2b-metrics'
import { TheBestConfig } from '@/components/integrations/thebest-config'
import { TheBestPackageManager } from '@/components/integrations/thebest-package-manager'
import { TheBestPlanMappingManager } from '@/components/integrations/thebest-plan-mapping'

export default function IntegracoesPage() {
  const [activeTab, setActiveTab] = useState('natv')

  const integrations = [
    {
      id: 'natv',
      name: 'NATV',
      description: 'API para criação e gerenciamento de usuários de teste',
      icon: Zap,
      status: 'available',
      category: 'Streaming'
    },
    {
      id: 'gates2b',
      name: 'Gates2b',
      description: 'PIX, cartão de crédito e cobranças via Gates2b',
      icon: CreditCard,
      status: 'available',
      category: 'Pagamentos'
    },
    {
      id: 'checkout',
      name: 'Checkout',
      description: 'Pagamento e renovação na área do cliente (Hub Control)',
      icon: ShoppingCart,
      status: 'available',
      category: 'Pagamentos'
    },
    {
      id: 'thebest',
      name: 'The Best',
      description: 'Gerenciamento de pacotes e renovações automáticas',
      icon: Package,
      status: 'available',
      category: 'Streaming'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Integração com WhatsApp Business API',
      icon: MessageSquare,
      status: 'coming_soon',
      category: 'Comunicação'
    },
    {
      id: 'email',
      name: 'Provedores de Email',
      description: 'Configuração de provedores SMTP externos',
      icon: Mail,
      status: 'available',
      category: 'Comunicação'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="default">Disponível</Badge>
      case 'coming_soon':
        return <Badge variant="secondary">Em Breve</Badge>
      case 'beta':
        return <Badge variant="outline">Beta</Badge>
      default:
        return <Badge variant="secondary">Indisponível</Badge>
    }
  }

  const getIcon = (IconComponent: any) => {
    return <IconComponent className="h-5 w-5" />
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure e gerencie integrações com serviços externos.
      </p>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrações Ativas</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.filter(i => i.status === 'available').length}</div>
            <p className="text-xs text-muted-foreground">
              {integrations.filter(i => i.status === 'available').length} disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Streaming, Pagamentos e Comunicação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Desenvolvimento</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter(i => i.status === 'coming_soon').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Novas integrações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => {
          const IconComponent = integration.icon
          return (
            <Card key={integration.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{integration.category}</Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab(integration.id)}
                    disabled={integration.status !== 'available'}
                  >
                    {integration.status === 'available' ? 'Configurar' : 'Em Breve'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex w-full max-w-full overflow-x-auto">
          <TabsTrigger value="natv" disabled={!integrations.find(i => i.id === 'natv')?.status.includes('available')}>
            <Zap className="h-4 w-4 mr-2" />
            NATV
          </TabsTrigger>
          <TabsTrigger value="gates2b" disabled={!integrations.find(i => i.id === 'gates2b')?.status.includes('available')}>
            <CreditCard className="h-4 w-4 mr-2" />
            Gates2b
          </TabsTrigger>
          <TabsTrigger value="checkout" disabled={!integrations.find(i => i.id === 'checkout')?.status.includes('available')}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Checkout
          </TabsTrigger>
          <TabsTrigger value="thebest" disabled={!integrations.find(i => i.id === 'thebest')?.status.includes('available')}>
            <Package className="h-4 w-4 mr-2" />
            The Best
          </TabsTrigger>
          <TabsTrigger value="whatsapp" disabled>
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="email" disabled>
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="natv" className="space-y-4">
          <NATVConfig />
        </TabsContent>

        <TabsContent value="gates2b" className="space-y-4">
          <Gates2bMetrics />
          <Gates2bConfig />
        </TabsContent>

        <TabsContent value="checkout" className="space-y-4">
          <CheckoutConfig />
        </TabsContent>

        <TabsContent value="thebest" className="space-y-4">
          <TheBestConfig />
          <TheBestPackageManager />
          <TheBestPlanMappingManager />
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Business API</CardTitle>
              <CardDescription>
                Integração com WhatsApp Business para envio de mensagens automáticas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Em Desenvolvimento</h3>
                <p className="text-muted-foreground mb-4">
                  Esta integração estará disponível em breve.
                </p>
                <Button variant="outline" disabled>
                  Notificar quando disponível
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provedores de Email</CardTitle>
              <CardDescription>
                Configure provedores SMTP externos para envio de emails.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Configuração Avançada</h3>
                <p className="text-muted-foreground mb-4">
                  Use as configurações SMTP na seção de Marketing.
                </p>
                <Button variant="outline" asChild>
                  <a href="/marketing">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ir para Marketing
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
