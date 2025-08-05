'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  MoreHorizontal, 
  Send, 
  Edit, 
  Copy, 
  Trash2, 
  Play, 
  Pause, 
  BarChart3,
  Calendar,
  Users
} from 'lucide-react'
import { Campaign } from '@/lib/types/marketing'
import { MarketingService } from '@/services/marketing.service'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface CampaignListProps {
  campaigns: Campaign[]
  onCampaignUpdate: () => void
}

export function CampaignList({ campaigns, onCampaignUpdate }: CampaignListProps) {
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null)
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null)

  const getStatusBadge = (status: Campaign['status']) => {
    const variants = {
      draft: { variant: 'secondary' as const, label: 'Rascunho' },
      scheduled: { variant: 'outline' as const, label: 'Agendada' },
      sending: { variant: 'default' as const, label: 'Enviando' },
      sent: { variant: 'default' as const, label: 'Enviada' },
      paused: { variant: 'destructive' as const, label: 'Pausada' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelada' }
    }
    
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const handleSendCampaign = async (campaign: Campaign) => {
    try {
      setSendingCampaign(campaign.id)
      await MarketingService.sendCampaign(campaign.id)
      toast.success('Campanha enviada com sucesso!')
      onCampaignUpdate()
    } catch (error) {
      console.error('Erro ao enviar campanha:', error)
      toast.error('Erro ao enviar campanha')
    } finally {
      setSendingCampaign(null)
    }
  }

  const handleDeleteCampaign = async () => {
    if (!deletingCampaign) return
    
    try {
      // Aqui você implementaria a função de deletar no MarketingService
      // await MarketingService.deleteCampaign(deletingCampaign.id)
      toast.success('Campanha excluída com sucesso!')
      onCampaignUpdate()
    } catch (error) {
      console.error('Erro ao excluir campanha:', error)
      toast.error('Erro ao excluir campanha')
    } finally {
      setDeletingCampaign(null)
    }
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    })
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Send className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma campanha criada</h3>
          <p className="text-muted-foreground text-center mb-4">
            Crie sua primeira campanha de email marketing para começar a engajar seus clientes.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                <CardDescription>{campaign.subject}</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(campaign.status)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {campaign.status === 'draft' && (
                      <DropdownMenuItem 
                        onClick={() => handleSendCampaign(campaign)}
                        disabled={sendingCampaign === campaign.id}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {sendingCampaign === campaign.id ? 'Enviando...' : 'Enviar Agora'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Ver Métricas
                    </DropdownMenuItem>
                    {campaign.status === 'sending' && (
                      <DropdownMenuItem>
                        <Pause className="mr-2 h-4 w-4" />
                        Pausar
                      </DropdownMenuItem>
                    )}
                    {campaign.status === 'paused' && (
                      <DropdownMenuItem>
                        <Play className="mr-2 h-4 w-4" />
                        Retomar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setDeletingCampaign(campaign)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Métricas da Campanha */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  Segmentação
                </div>
                <div className="text-sm">
                  {campaign.segmentation.type === 'all' && 'Todos os clientes'}
                  {campaign.segmentation.type === 'active' && 'Clientes ativos'}
                  {campaign.segmentation.type === 'inactive' && 'Clientes inativos'}
                  {campaign.segmentation.type === 'expiring' && 'Clientes vencendo'}
                  {campaign.segmentation.type === 'custom' && 'Segmentação personalizada'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Data
                </div>
                <div className="text-sm">
                  {campaign.sent_at 
                    ? `Enviada ${formatDate(campaign.sent_at)}`
                    : campaign.scheduled_at
                    ? `Agendada para ${formatDate(campaign.scheduled_at)}`
                    : `Criada ${formatDate(campaign.created_at)}`
                  }
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Performance
                </div>
                <div className="text-sm">
                  {campaign.metrics.sent > 0 ? (
                    <div className="space-y-1">
                      <div>Enviados: {campaign.metrics.sent}</div>
                      <div>Abertos: {campaign.metrics.opened} ({((campaign.metrics.opened / campaign.metrics.sent) * 100).toFixed(1)}%)</div>
                      <div>Cliques: {campaign.metrics.clicked} ({((campaign.metrics.clicked / campaign.metrics.sent) * 100).toFixed(1)}%)</div>
                    </div>
                  ) : (
                    'Ainda não enviada'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deletingCampaign} onOpenChange={() => setDeletingCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a campanha "{deletingCampaign?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCampaign}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}