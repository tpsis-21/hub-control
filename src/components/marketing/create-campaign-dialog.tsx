'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { sanitizeHtml } from '@/lib/sanitize'
import { 
  CalendarIcon, 
  Users, 
  Mail, 
  Eye, 
  Code, 
  Wand2,
  Send,
  Save
} from 'lucide-react'
import { Campaign, CampaignSegmentation, EmailTemplate } from '@/lib/types/marketing'
import { MarketingService } from '@/services/marketing.service'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CreateCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCampaignCreated: (campaign: Campaign) => void
}

export function CreateCampaignDialog({ 
  open, 
  onOpenChange, 
  onCampaignCreated 
}: CreateCampaignDialogProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html')
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>()
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    segmentation: {
      type: 'all' as CampaignSegmentation['type'],
      filters: {}
    },
    settings: {
      fromName: 'Hub Control',
      fromEmail: 'noreply@hubcontrol.com',
      trackOpens: true,
      trackClicks: true,
      unsubscribeLink: true
    },
    send_immediately: true
  })

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const loadTemplates = async () => {
    try {
      // Aqui você carregaria os templates do MarketingService
      // const templatesData = await MarketingService.getEmailTemplates()
      // setTemplates(templatesData)
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
    }
  }

  const handleTemplateSelect = (template: EmailTemplate) => {
    setFormData(prev => ({
      ...prev,
      subject: template.name,
      htmlContent: template.htmlContent,
      textContent: template.textContent || ''
    }))
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('htmlContent') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = textarea.value
      const before = text.substring(0, start)
      const after = text.substring(end, text.length)
      const newText = before + `{{${variable}}}` + after
      
      setFormData(prev => ({ ...prev, htmlContent: newText }))
      
      // Restaura o foco e posição do cursor
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4)
      }, 0)
    }
  }

  const getSegmentationDescription = () => {
    switch (formData.segmentation.type) {
      case 'all':
        return 'Todos os clientes cadastrados'
      case 'active':
        return 'Apenas clientes com status ativo'
      case 'inactive':
        return 'Apenas clientes com status inativo'
      case 'expiring':
        return 'Clientes com planos vencendo em até 7 dias'
      case 'custom':
        return 'Segmentação personalizada com múltiplos filtros'
      default:
        return ''
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      
      const { send_immediately, ...campaignFields } = formData
      const campaignData = {
        ...campaignFields,
        status: send_immediately ? 'sending' as const : 'scheduled' as const,
        scheduled_at: send_immediately ? undefined : scheduledDate?.toISOString()
      }
      
      const campaign = await MarketingService.createCampaign(campaignData)
      
      if (send_immediately) {
        await MarketingService.sendCampaign(campaign.id)
        toast.success('Campanha criada e enviada com sucesso!')
      } else {
        toast.success('Campanha criada e agendada com sucesso!')
      }
      
      onCampaignCreated(campaign)
      handleClose()
    } catch (error) {
      console.error('Erro ao criar campanha:', error)
      toast.error('Erro ao criar campanha')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setFormData({
      name: '',
      subject: '',
      htmlContent: '',
      textContent: '',
      segmentation: {
        type: 'all',
        filters: {}
      },
      settings: {
        fromName: 'Hub Control',
        fromEmail: 'noreply@hubcontrol.com',
        trackOpens: true,
        trackClicks: true,
        unsubscribeLink: true
      },
      send_immediately: true
    })
    setScheduledDate(undefined)
    onOpenChange(false)
  }

  const canProceedToStep2 = formData.name && formData.subject
  const canProceedToStep3 = formData.htmlContent
  const canSubmit = formData.name && formData.subject && formData.htmlContent

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Campanha de Email</DialogTitle>
          <DialogDescription>
            Crie uma nova campanha de email marketing em 3 etapas simples
          </DialogDescription>
        </DialogHeader>

        {/* Indicador de Etapas */}
        <div className="flex items-center space-x-4 mb-6">
          {[1, 2, 3].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= stepNumber 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {stepNumber}
              </div>
              {stepNumber < 3 && (
                <div className={cn(
                  "w-12 h-0.5 mx-2",
                  step > stepNumber ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Etapa 1: Informações Básicas */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Campanha</Label>
              <Input
                id="name"
                placeholder="Ex: Promoção Black Friday 2024"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Assunto do Email</Label>
              <Input
                id="subject"
                placeholder="Ex: 🔥 50% OFF em todos os planos - Oferta limitada!"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            {/* Templates Disponíveis */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Templates Disponíveis</Label>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Etapa 2: Conteúdo do Email */}
        {step === 2 && (
          <div className="space-y-4">
            <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as 'html' | 'text')}>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="html">
                    <Code className="mr-2 h-4 w-4" />
                    HTML
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>
                
                {/* Variáveis Disponíveis */}
                <div className="flex items-center space-x-2">
                  <Label className="text-sm">Variáveis:</Label>
                  {['nome', 'email', 'plano', 'vencimento', 'servidor'].map((variable) => (
                    <Badge 
                      key={variable}
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => insertVariable(variable)}
                    >
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>

              <TabsContent value="html" className="space-y-2">
                <Label htmlFor="htmlContent">Conteúdo HTML</Label>
                <Textarea
                  id="htmlContent"
                  placeholder="Digite o conteúdo HTML do seu email..."
                  className="min-h-[300px] font-mono"
                  value={formData.htmlContent}
                  onChange={(e) => setFormData(prev => ({ ...prev, htmlContent: e.target.value }))}
                />
              </TabsContent>

              <TabsContent value="text" className="space-y-2">
                <Label>Preview do Email</Label>
                <div 
                  className="border rounded-md p-4 min-h-[300px] bg-background"
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeHtml(
                      formData.htmlContent || '<p>Digite o conteúdo HTML para ver o preview</p>', 
                      'template'
                    ) 
                  }}
                />
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="textContent">Versão em Texto (Opcional)</Label>
              <Textarea
                id="textContent"
                placeholder="Versão em texto simples para clientes que não suportam HTML"
                value={formData.textContent}
                onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Etapa 3: Segmentação e Envio */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Segmentação de Clientes</Label>
              <Select 
                value={formData.segmentation.type} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  segmentation: { ...prev.segmentation, type: value as CampaignSegmentation['type'] }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  <SelectItem value="active">Clientes ativos</SelectItem>
                  <SelectItem value="inactive">Clientes inativos</SelectItem>
                  <SelectItem value="expiring">Clientes vencendo</SelectItem>
                  
                  <SelectItem value="custom">Segmentação personalizada</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {getSegmentationDescription()}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="send_immediately"
                  checked={formData.send_immediately}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    send_immediately: checked as boolean 
                  }))}
                />
                <Label htmlFor="send_immediately">Enviar imediatamente</Label>
              </div>

              {!formData.send_immediately && (
                <div className="space-y-2">
                  <Label>Data e Hora do Envio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? (
                          format(scheduledDate, "PPP 'às' HH:mm", { locale: ptBR })
                        ) : (
                          "Selecione a data e hora"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Resumo da Campanha */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Campanha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><strong>Nome:</strong> {formData.name}</div>
                <div><strong>Assunto:</strong> {formData.subject}</div>
                <div><strong>Segmentação:</strong> {getSegmentationDescription()}</div>
                <div><strong>Envio:</strong> {formData.send_immediately ? 'Imediato' : `Agendado para ${scheduledDate ? format(scheduledDate, "PPP 'às' HH:mm", { locale: ptBR }) : 'Data não selecionada'}`}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Voltar
                </Button>
              )}
            </div>
            
            <div className="space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              
              {step < 3 ? (
                <Button 
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 ? !canProceedToStep2 : !canProceedToStep3}
                >
                  Próximo
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={!canSubmit || loading}
                >
                  {loading ? (
                    'Criando...'
                  ) : formData.send_immediately ? (
                    <><Send className="mr-2 h-4 w-4" /> Criar e Enviar</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Criar e Agendar</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
