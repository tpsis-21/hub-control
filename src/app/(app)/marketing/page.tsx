'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Send, Users, TrendingUp, Mail, Settings } from 'lucide-react'
import { MarketingService } from '@/services/marketing.service'
import { Campaign, MarketingDashboard } from '@/lib/types/marketing'
import { CampaignList } from '@/components/marketing/campaign-list'
import { CreateCampaignDialog } from '@/components/marketing/create-campaign-dialog'
import { MarketingMetrics } from '@/components/marketing/marketing-metrics'
import { EmailTemplates } from '@/components/marketing/email-templates'
import { SMTPSettings } from '@/components/marketing/smtp-settings'
import { SMTPGlobalSettings } from '@/components/marketing/smtp-global-settings'
import { AutomationRules } from '@/components/marketing/automation-rules'

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [dashboard, setDashboard] = useState<MarketingDashboard | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('campaigns')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [campaignsData, dashboardData] = await Promise.all([
        MarketingService.getCampaigns(),
        MarketingService.getMarketingDashboard()
      ])
      setCampaigns(campaignsData)
      setDashboard(dashboardData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCampaignCreated = (campaign: Campaign) => {
    setCampaigns(prev => [campaign, ...prev])
    setIsCreateDialogOpen(false)
    loadData() // Recarrega para atualizar métricas
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground">
            Gerencie campanhas, automações e configurações de email
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Métricas Rápidas */}
      {dashboard && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.activeCampaigns}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.totalCampaigns} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emails Enviados</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.totalEmailsSent?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                Este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Abertura</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.averageOpenRate?.toFixed(1) || 0}%</div>
              <p className="text-xs text-muted-foreground">
                Média geral
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.activeClients || 0}</div>
              <p className="text-xs text-muted-foreground">
                Segmentação disponível
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automation">Automações</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <CampaignList 
            campaigns={campaigns} 
            onCampaignUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <EmailTemplates />
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <AutomationRules />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <MarketingMetrics dashboard={dashboard} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="space-y-6">
            <SMTPGlobalSettings />
            <SMTPSettings />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de Criação de Campanha */}
      <CreateCampaignDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCampaignCreated={handleCampaignCreated}
      />
    </div>
  )
}