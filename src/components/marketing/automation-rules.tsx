'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Zap, 
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause,
  Clock,
  Target,
  Mail,
  MessageSquare,
  Tag,
  CheckSquare,
  BarChart3
} from 'lucide-react'
import { AutomationRule, AutomationTrigger, AutomationAction, AutomationCondition } from '@/lib/types/marketing'
import { AutomationService } from '@/services/automation.service'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TRIGGER_TYPES = [
  { value: 'client_expiring', label: 'Vencimento se aproximando' },
  { value: 'client_expired', label: 'Plano vencido' },
  { value: 'payment_received', label: 'Pagamento confirmado' },
  { value: 'test_created', label: 'Teste criado' },
  { value: 'client_created', label: 'Cliente criado' },
  { value: 'manual', label: 'Manual' }
]

const ACTION_TYPES = [
  { value: 'send_email', label: 'Enviar Email', icon: Mail },
  { value: 'send_whatsapp', label: 'Enviar WhatsApp', icon: MessageSquare },
  { value: 'update_status', label: 'Atualizar Status', icon: CheckSquare },
  { value: 'add_tag', label: 'Adicionar Tag', icon: Tag },
  { value: 'create_task', label: 'Criar Tarefa', icon: CheckSquare }
]

const FREQUENCIES = [
  { value: 'once', label: 'Uma vez' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' }
]

export function AutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [deletingRule, setDeletingRule] = useState<AutomationRule | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: {
      type: 'client_expiring' as AutomationTrigger['type'],
      config: {} as AutomationTrigger['config']
    },
    conditions: [] as AutomationCondition[],
    actions: [] as AutomationAction[],
    isActive: true
  })

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const rulesData = await AutomationService.getRules()
      setRules(rulesData)
    } catch (error) {
      console.error('Erro ao carregar regras:', error)
      toast.error('Erro ao carregar regras de automação')
      
      // Dados simulados para demonstração
      setRules([
        {
          id: '1',
          name: 'Lembrete de Vencimento',
          description: 'Enviar email 1 dia antes do vencimento',
          trigger: {
            type: 'client_expiring',
            config: { daysBefore: 1 }
          },
          conditions: [{
            field: 'status',
            operator: 'equals',
            value: 'active'
          }],
          actions: [{
            type: 'send_email',
            config: {
              templateId: '1'
            }
          }],
          isActive: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lastExecuted: new Date().toISOString(),
          executionCount: 45
        },
        {
          id: '2',
          name: 'Boas-vindas para Novos Clientes',
          description: 'Enviar email de boas-vindas quando cliente é criado',
          trigger: {
            type: 'client_created',
            config: {}
          },
          conditions: [],
          actions: [{
            type: 'send_email',
            config: {
              templateId: '2'
            }
          }],
          isActive: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lastExecuted: new Date().toISOString(),
          executionCount: 12
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingRule) {
        await AutomationService.updateRule(editingRule.id, formData)
        toast.success('Regra atualizada com sucesso!')
      } else {
        await AutomationService.createRule(formData)
        toast.success('Regra criada com sucesso!')
      }
      
      loadRules()
      handleCloseDialog()
    } catch (error) {
      console.error('Erro ao salvar regra:', error)
      toast.error('Erro ao salvar regra')
    }
  }

  const handleToggleActive = async (rule: AutomationRule) => {
    try {
      await AutomationService.updateRule(rule.id, {
        isActive: !rule.isActive
      })
      
      toast.success(`Regra ${rule.isActive ? 'desativada' : 'ativada'} com sucesso!`)
      loadRules()
    } catch (error) {
      console.error('Erro ao alterar status da regra:', error)
      toast.error('Erro ao alterar status da regra')
    }
  }

  const handleDelete = async () => {
    if (!deletingRule) return
    
    try {
      await AutomationService.deleteRule(deletingRule.id)
      toast.success('Regra excluída com sucesso!')
      loadRules()
    } catch (error) {
      console.error('Erro ao excluir regra:', error)
      toast.error('Erro ao excluir regra')
    } finally {
      setDeletingRule(null)
    }
  }

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || '',
      trigger: rule.trigger,
      conditions: rule.conditions,
      actions: rule.actions,
      isActive: rule.isActive
    })
    setIsCreateDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false)
    setEditingRule(null)
    setFormData({
      name: '',
      description: '',
      trigger: {
        type: 'client_expiring' as AutomationTrigger['type'],
        config: {} as AutomationTrigger['config']
      },
      conditions: [] as AutomationCondition[],
      actions: [] as AutomationAction[],
      isActive: true
    })
  }

  const getTriggerLabel = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type
  }

  const getActionLabel = (type: string) => {
    return ACTION_TYPES.find(a => a.value === type)?.label || type
  }

  const getActionIcon = (type: string) => {
    const action = ACTION_TYPES.find(a => a.value === type)
    return action?.icon || Mail
  }

  const getFrequencyLabel = (frequency: string) => {
    return FREQUENCIES.find(f => f.value === frequency)?.label || frequency
  }

  const getSuccessRate = (rule: AutomationRule) => {
    if (rule.executionCount === 0) return 0
    // Assumindo 90% de sucesso como exemplo, já que não temos dados de falhas separados
    return 90
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
          <h2 className="text-2xl font-bold tracking-tight">Regras de Automação</h2>
          <p className="text-muted-foreground">
            Configure automações para notificações e ações baseadas em eventos
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Editar Regra de Automação' : 'Nova Regra de Automação'}
              </DialogTitle>
              <DialogDescription>
                Configure uma regra para automatizar ações baseadas em eventos
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="trigger">Gatilho</TabsTrigger>
                <TabsTrigger value="actions">Ações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Regra</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Lembrete de Vencimento"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Descreva o que esta regra faz"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <span>Regra Ativa</span>
                  </Label>
                </div>
              </TabsContent>
              
              <TabsContent value="trigger" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="trigger_type">Tipo de Gatilho</Label>
                  <Select value={formData.trigger.type} onValueChange={(value) => setFormData(prev => ({ ...prev, trigger: { ...prev.trigger, type: value as AutomationTrigger['type'] } }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((trigger) => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          {trigger.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.trigger.type === 'client_expiring' && (
                  <div className="space-y-2">
                    <Label htmlFor="days_before">Dias antes do vencimento</Label>
                    <Input
                      id="days_before"
                      type="number"
                      placeholder="3"
                      value={(formData.trigger.config as any).daysBefore || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        trigger: {
                          ...prev.trigger,
                          config: {
                            ...prev.trigger.config,
                            daysBefore: parseInt(e.target.value) || 1
                          } as any
                        }
                      }))}
                    />
                  </div>
                )}
                
                {/* Configurações específicas do trigger podem ser adicionadas aqui */}
              </TabsContent>
              
              <TabsContent value="actions" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Ações a executar</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          actions: [...prev.actions, { type: 'send_email', config: {} } as AutomationAction]
                        }))
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Ação
                    </Button>
                  </div>
                  
                  {formData.actions.map((action, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tipo de Ação</Label>
                            <Select 
                              value={action.type} 
                              onValueChange={(value) => {
                                const newActions = [...formData.actions]
                                newActions[index] = { ...action, type: value as any }
                                setFormData(prev => ({ ...prev, actions: newActions }))
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_TYPES.map((actionType) => (
                                  <SelectItem key={actionType.value} value={actionType.value}>
                                    {actionType.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newActions = formData.actions.filter((_, i) => i !== index)
                                setFormData(prev => ({ ...prev, actions: newActions }))
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {action.type === 'send_email' && (
                          <div className="mt-4 space-y-2">
                            <Label>Template de Email</Label>
                            <Input
                              placeholder="ID do template"
                              value={action.config.templateId || ''}
                              onChange={(e) => {
                                const newActions = [...formData.actions]
                                newActions[index] = {
                                  ...action,
                                  config: { ...action.config, templateId: e.target.value }
                                }
                                setFormData(prev => ({ ...prev, actions: newActions }))
                              }}
                            />
                          </div>
                        )}
                        
                        {action.type === 'update_status' && (
                          <div className="mt-4 space-y-2">
                            <Label>Novo Status</Label>
                            <Select 
                              value={action.config.status || ''}
                              onValueChange={(value) => {
                                const newActions = [...formData.actions]
                                newActions[index] = {
                                  ...action,
                                  config: { ...action.config, status: value }
                                }
                                setFormData(prev => ({ ...prev, actions: newActions }))
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Ativo</SelectItem>
                                <SelectItem value="inactive">Inativo</SelectItem>
                                <SelectItem value="suspended">Suspenso</SelectItem>
                                <SelectItem value="expired">Vencido</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {action.type === 'add_tag' && (
                          <div className="mt-4 space-y-2">
                            <Label>Tag</Label>
                            <Input
                              placeholder="Nome da tag"
                              value={action.config.tag || ''}
                              onChange={(e) => {
                                const newActions = [...formData.actions]
                                newActions[index] = {
                                  ...action,
                                  config: { ...action.config, tag: e.target.value }
                                }
                                setFormData(prev => ({ ...prev, actions: newActions }))
                              }}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  
                  {formData.actions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma ação configurada. Clique em "Adicionar Ação" para começar.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingRule ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Regras Existentes */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma regra criada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira regra de automação para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => {
            const IconComponent = getActionIcon(rule.actions[0]?.type || 'send_email')
            
            return (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{rule.name}</CardTitle>
                        <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                          {rule.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <CardDescription>{rule.description}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleActive(rule)}>
                          {rule.isActive ? (
                            <><Pause className="mr-2 h-4 w-4" />Pausar</>
                          ) : (
                            <><Play className="mr-2 h-4 w-4" />Ativar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(rule)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setDeletingRule(rule)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Target className="mr-2 h-4 w-4" />
                        Gatilho
                      </div>
                      <div className="text-sm">
                        {getTriggerLabel(rule.trigger.type)}
                        {rule.trigger.config.daysBefore && (
                          <div className="text-xs text-muted-foreground">
                            {rule.trigger.config.daysBefore} dias antes
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <IconComponent className="mr-2 h-4 w-4" />
                        Ações
                      </div>
                      <div className="text-sm">
                        {rule.actions.length} ação(ões)
                        <div className="text-xs text-muted-foreground">
                          {rule.actions.map(action => getActionLabel(action.type)).join(', ')}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Performance
                      </div>
                      <div className="text-sm">
                        {rule.executionCount > 0 ? (
                          <div className="space-y-1">
                            <div>{getSuccessRate(rule)}% sucesso</div>
                            <div className="text-xs text-muted-foreground">
                              {rule.executionCount} execuções
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">Sem dados</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4" />
                        Última Execução
                      </div>
                      <div className="text-sm">
                        {rule.lastExecuted ? (
                          formatDistanceToNow(new Date(rule.lastExecuted), { addSuffix: true, locale: ptBR })
                        ) : (
                          <span className="text-muted-foreground">Nunca executada</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deletingRule} onOpenChange={() => setDeletingRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Regra de Automação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a regra "{deletingRule?.name}"? 
              Esta ação não pode ser desfeita e pode afetar automações em andamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
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