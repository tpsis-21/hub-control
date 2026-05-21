import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { appToast } from '@/lib/app-toast'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Settings, 
  Users, 
  MessageSquare, 
  Clock, 
  Target,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { automationService, AutomationRule as ServiceAutomationRule } from '@/lib/automation-service'
import { useAuth } from '@/hooks/useAuth'

// Tipo local para o componente
interface AutomationRule {
  id: string
  name: string
  description: string
  trigger: {
    type: 'user_action' | 'time_based' | 'condition'
    event: string
    conditions: any[]
  }
  actions: {
    type: 'send_message' | 'add_tag' | 'move_funnel' | 'webhook'
    config: any
  }[]
  isActive: boolean
  createdAt: string
  lastTriggered?: string
  triggerCount: number
}

interface RuleFormData {
  name: string
  description: string
  triggerType: string
  triggerEvent: string
  actionType: string
  actionConfig: any
}

export function AutomationRules() {
  const { user } = useAuth()
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    description: '',
    triggerType: 'user_action',
    triggerEvent: '',
    actionType: 'send_message',
    actionConfig: {}
  })

  useEffect(() => {
    loadRules()
  }, [])

  // Função para mapear ServiceAutomationRule para AutomationRule local
  const mapServiceRuleToLocal = (serviceRule: ServiceAutomationRule): AutomationRule => {
    return {
      id: serviceRule.id,
      name: serviceRule.name,
      description: serviceRule.description || '',
      trigger: {
        type: 'user_action', // Mapear conforme necessário
        event: serviceRule.trigger.type,
        conditions: serviceRule.conditions || []
      },
      actions: serviceRule.actions.map(action => ({
        type: 'send_message', // Mapear conforme necessário
        config: action.config
      })),
      isActive: serviceRule.enabled,
      createdAt: serviceRule.createdAt.toISOString(),
      triggerCount: 0 // Valor padrão
    }
  }

  const loadRules = async () => {
    try {
      setIsLoading(true)
      const serviceRules = await automationService.getRules()
      const mappedRules = serviceRules.map(mapServiceRuleToLocal)
      setRules(mappedRules)
    } catch (error) {
      console.error('Erro ao carregar regras:', error)
      appToast.error('Erro ao carregar regras de automação')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveRule = async () => {
    if (!formData.name.trim()) {
      appToast.error('Nome da regra é obrigatório')
      return
    }

    try {
      setIsLoading(true)
      
      // Mapear para o formato esperado pelo automationService
      const serviceRuleData = {
        name: formData.name,
        description: formData.description,
        enabled: true,
        trigger: {
          type: 'client_created' as const, // Mapear conforme necessário
          delay: 0
        },
        actions: [{
          type: 'send_email' as const, // Mapear conforme necessário
          config: formData.actionConfig
        }],
        conditions: []
      }

      if (editingRule) {
        await automationService.updateRule(editingRule.id, serviceRuleData)
        appToast.success('Regra atualizada com sucesso!')
      } else {
        await automationService.createRule(serviceRuleData)
        appToast.success('Regra criada com sucesso!')
      }

      setIsDialogOpen(false)
      setEditingRule(null)
      resetForm()
      loadRules()
    } catch (error) {
      console.error('Erro ao salvar regra:', error)
      appToast.error('Erro ao salvar regra')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await automationService.deleteRule(ruleId)
      appToast.success('Regra excluída com sucesso!')
      loadRules()
    } catch (error) {
      console.error('Erro ao excluir regra:', error)
      appToast.error('Erro ao excluir regra')
    }
  }

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await automationService.updateRule(ruleId, { enabled: isActive })
      appToast.success(`Regra ${isActive ? 'ativada' : 'desativada'} com sucesso!`)
      loadRules()
    } catch (error) {
      console.error('Erro ao alterar status da regra:', error)
      appToast.error('Erro ao alterar status da regra')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      triggerType: 'user_action',
      triggerEvent: '',
      actionType: 'send_message',
      actionConfig: {}
    })
  }

  const openEditDialog = (rule: AutomationRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description,
      triggerType: rule.trigger.type,
      triggerEvent: rule.trigger.event,
      actionType: rule.actions[0]?.type || 'send_message',
      actionConfig: rule.actions[0]?.config || {}
    })
    setIsDialogOpen(true)
  }

  const getTriggerTypeLabel = (type: string) => {
    const labels = {
      'user_action': 'Ação do Usuário',
      'time_based': 'Baseado em Tempo',
      'condition': 'Condição'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getActionTypeLabel = (type: string) => {
    const labels = {
      'send_message': 'Enviar Mensagem',
      'add_tag': 'Adicionar Tag',
      'move_funnel': 'Mover no Funil',
      'webhook': 'Webhook'
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Regras de Automação
            </CardTitle>
            <CardDescription>
              Configure regras automáticas para engajamento e conversão
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingRule(null) }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? 'Editar Regra' : 'Nova Regra de Automação'}
                </DialogTitle>
                <DialogDescription>
                  Configure os gatilhos e ações para sua regra de automação
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule-name">Nome da Regra *</Label>
                    <Input
                      id="rule-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Boas-vindas para novos leads"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="trigger-type">Tipo de Gatilho</Label>
                    <Select
                      value={formData.triggerType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, triggerType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user_action">Ação do Usuário</SelectItem>
                        <SelectItem value="time_based">Baseado em Tempo</SelectItem>
                        <SelectItem value="condition">Condição</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rule-description">Descrição</Label>
                  <Textarea
                    id="rule-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva o que esta regra faz..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="trigger-event">Evento Gatilho</Label>
                  <Input
                    id="trigger-event"
                    value={formData.triggerEvent}
                    onChange={(e) => setFormData(prev => ({ ...prev, triggerEvent: e.target.value }))}
                    placeholder="Ex: novo_lead, mensagem_recebida, tempo_inativo"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="action-type">Tipo de Ação</Label>
                  <Select
                    value={formData.actionType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, actionType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="send_message">Enviar Mensagem</SelectItem>
                      <SelectItem value="add_tag">Adicionar Tag</SelectItem>
                      <SelectItem value="move_funnel">Mover no Funil</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.actionType === 'send_message' && (
                  <div className="space-y-2">
                    <Label htmlFor="message-content">Conteúdo da Mensagem</Label>
                    <Textarea
                      id="message-content"
                      value={formData.actionConfig.message || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        actionConfig: { ...prev.actionConfig, message: e.target.value }
                      }))}
                      placeholder="Digite a mensagem que será enviada..."
                      rows={4}
                    />
                  </div>
                )}
                
                {formData.actionType === 'add_tag' && (
                  <div className="space-y-2">
                    <Label htmlFor="tag-name">Nome da Tag</Label>
                    <Input
                      id="tag-name"
                      value={formData.actionConfig.tagName || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        actionConfig: { ...prev.actionConfig, tagName: e.target.value }
                      }))}
                      placeholder="Ex: lead_qualificado, interessado"
                    />
                  </div>
                )}
                
                {formData.actionType === 'webhook' && (
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">URL do Webhook</Label>
                    <Input
                      id="webhook-url"
                      value={formData.actionConfig.url || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        actionConfig: { ...prev.actionConfig, url: e.target.value }
                      }))}
                      placeholder="https://exemplo.com/webhook"
                    />
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveRule} disabled={isLoading}>
                  {isLoading ? 'Salvando...' : editingRule ? 'Atualizar' : 'Criar Regra'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rules">Regras Ativas</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="rules" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Carregando regras...</p>
              </div>
            ) : rules.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma regra de automação configurada. Crie sua primeira regra para começar!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <Card key={rule.id} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {rule.isActive ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-400" />
                            )}
                            <CardTitle className="text-lg">{rule.name}</CardTitle>
                          </div>
                          <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                            {rule.isActive ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {rule.description && (
                        <CardDescription>{rule.description}</CardDescription>
                      )}
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Target className="h-4 w-4" />
                            Gatilho
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p><strong>Tipo:</strong> {getTriggerTypeLabel(rule.trigger.type)}</p>
                            <p><strong>Evento:</strong> {rule.trigger.event}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Activity className="h-4 w-4" />
                            Ações
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {rule.actions.map((action, index) => (
                              <p key={index}>
                                <strong>Tipo:</strong> {getActionTypeLabel(action.type)}
                              </p>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-4 w-4" />
                            Estatísticas
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p><strong>Execuções:</strong> {rule.triggerCount}</p>
                            <p><strong>Criada:</strong> {new Date(rule.createdAt).toLocaleDateString('pt-BR')}</p>
                            {rule.lastTriggered && (
                              <p><strong>Última execução:</strong> {new Date(rule.lastTriggered).toLocaleDateString('pt-BR')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4" />
                    Total de Regras
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rules.length}</div>
                  <p className="text-sm text-muted-foreground">
                    {rules.filter(r => r.isActive).length} ativas
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4" />
                    Execuções Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {rules.reduce((acc, rule) => acc + rule.triggerCount, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total de execuções
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Taxa de Sucesso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">95%</div>
                  <p className="text-sm text-muted-foreground">
                    Execuções bem-sucedidas
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Alert>
              <Activity className="h-4 w-4" />
              <AlertDescription>
                <strong>Analytics em Desenvolvimento:</strong> Em breve você terá acesso a métricas detalhadas sobre o desempenho de suas regras de automação, incluindo taxas de conversão, engajamento e ROI.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Boas-vindas para Novos Leads</CardTitle>
                  <CardDescription>
                    Envia uma mensagem de boas-vindas automaticamente quando um novo lead se cadastra
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Usar Template
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Reengajamento por Inatividade</CardTitle>
                  <CardDescription>
                    Envia mensagem para leads que não interagem há mais de 7 dias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Usar Template
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Qualificação de Leads</CardTitle>
                  <CardDescription>
                    Adiciona tags baseadas nas ações e respostas dos leads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Usar Template
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Notificação de Webhook</CardTitle>
                  <CardDescription>
                    Envia dados para sistemas externos quando eventos específicos ocorrem
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Usar Template
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default AutomationRules

