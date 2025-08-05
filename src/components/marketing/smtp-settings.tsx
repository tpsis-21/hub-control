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
  Plus, 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  MoreHorizontal,
  Edit,
  Trash2,
  Star,
  Mail,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { SMTPConfig } from '@/lib/types/marketing'
import { MarketingService } from '@/services/marketing.service'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function SMTPSettings() {
  const [configs, setConfigs] = useState<SMTPConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SMTPConfig | null>(null)
  const [deletingConfig, setDeletingConfig] = useState<SMTPConfig | null>(null)
  const [testingConfig, setTestingConfig] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    useForNotifications: false,
    useForMarketing: false,
    priority: 1,
    dailyLimit: 1000,
    currentDailyCount: 0
  })

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      // Aqui você carregaria as configurações do MarketingService
      // const configsData = await MarketingService.getSMTPConfigs()
      // setConfigs(configsData)
      
      // Dados simulados para demonstração
      setConfigs([
        {
          id: '1',
          name: 'Gmail Principal',
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          username: 'contato@empresa.com',
          password: '***',
          from_email: 'contato@empresa.com',
          from_name: 'Empresa IPTV',
          is_default: true,
          is_active: true,
          last_tested: new Date().toISOString(),
          test_result: { success: true, message: 'Teste realizado com sucesso' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
          useForNotifications: true,
          useForMarketing: false,
          priority: 1,
          dailyLimit: 500,
          currentDailyCount: 45
        },
        {
          id: '2',
          name: 'Outlook SMTP',
          host: 'smtp-mail.outlook.com',
          port: 587,
          secure: false,
          username: 'marketing@empresa.com',
          password: '***',
          from_email: 'marketing@empresa.com',
          from_name: 'Empresa IPTV Marketing',
          is_default: false,
          is_active: true,
          last_tested: new Date().toISOString(),
          test_result: { success: true, message: 'Teste realizado com sucesso' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
          useForNotifications: false,
          useForMarketing: true,
          priority: 2,
          dailyLimit: 300,
          currentDailyCount: 12
        }
      ])
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações SMTP')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingConfig) {
        // await MarketingService.updateSMTPConfig(editingConfig.id, formData)
        toast.success('Configuração atualizada com sucesso!')
      } else {
        // await MarketingService.createSMTPConfig(formData)
        toast.success('Configuração criada com sucesso!')
      }
      
      loadConfigs()
      handleCloseDialog()
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      toast.error('Erro ao salvar configuração')
    }
  }

  const handleTestConfig = async (config: SMTPConfig) => {
    try {
      setTestingConfig(config.id)
      const result = await MarketingService.testSMTPConfig(config)
      
      if (result.success) {
        toast.success('Teste de SMTP realizado com sucesso!')
      } else {
        toast.error(`Erro no teste: ${result.message}`)
      }
      
      loadConfigs()
    } catch (error) {
      console.error('Erro ao testar configuração:', error)
      toast.error('Erro ao testar configuração')
    } finally {
      setTestingConfig(null)
    }
  }

  const handleSetDefault = async (config: SMTPConfig) => {
    try {
      // await MarketingService.setDefaultSMTPConfig(config.id)
      toast.success('Configuração definida como padrão!')
      loadConfigs()
    } catch (error) {
      console.error('Erro ao definir configuração padrão:', error)
      toast.error('Erro ao definir configuração padrão')
    }
  }

  const handleDelete = async () => {
    if (!deletingConfig) return
    
    try {
      // await MarketingService.deleteSMTPConfig(deletingConfig.id)
      toast.success('Configuração excluída com sucesso!')
      loadConfigs()
    } catch (error) {
      console.error('Erro ao excluir configuração:', error)
      toast.error('Erro ao excluir configuração')
    } finally {
      setDeletingConfig(null)
    }
  }

  const handleEdit = (config: SMTPConfig) => {
    setEditingConfig(config)
    setFormData({
      name: config.name,
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.username,
      password: '', // Não preenche a senha por segurança
      from_email: config.from_email,
      from_name: config.from_name || '',
      useForNotifications: config.useForNotifications || false,
      useForMarketing: config.useForMarketing || false,
      priority: config.priority || 1,
      dailyLimit: config.dailyLimit || 1000
    })
    setIsCreateDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false)
    setEditingConfig(null)
    setFormData({
      name: '',
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      from_email: '',
      from_name: '',
      useForNotifications: false,
      useForMarketing: false,
      priority: 1,
      dailyLimit: 1000
    })
  }

  const getStatusBadge = (config: SMTPConfig) => {
    if (!config.is_active) {
      return <Badge variant="secondary">Inativo</Badge>
    }
    
    if (config.test_result?.success) {
      return <Badge variant="default" className="bg-green-500">Funcionando</Badge>
    }
    
    if (config.test_result?.success === false) {
      return <Badge variant="destructive">Erro</Badge>
    }
    
    return <Badge variant="outline">Não testado</Badge>
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
          <h2 className="text-2xl font-bold tracking-tight">Configurações SMTP</h2>
          <p className="text-muted-foreground">
            Gerencie suas configurações de servidor de email
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Configuração
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Editar Configuração SMTP' : 'Nova Configuração SMTP'}
              </DialogTitle>
              <DialogDescription>
                Configure um servidor SMTP para envio de emails
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Configuração</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Gmail Principal"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="host">Servidor SMTP</Label>
                  <Input
                    id="host"
                    placeholder="smtp.gmail.com"
                    value={formData.host}
                    onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="port">Porta</Label>
                  <Input
                    id="port"
                    type="number"
                    placeholder="587"
                    value={formData.port}
                    onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Switch
                      checked={formData.secure}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, secure: checked }))}
                    />
                    <span>Conexão Segura (SSL/TLS)</span>
                  </Label>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário/Email</Label>
                  <Input
                    id="username"
                    placeholder="contato@empresa.com"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={editingConfig ? "Deixe em branco para manter" : "Senha do email"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from_email">Email do Remetente</Label>
                  <Input
                    id="from_email"
                    placeholder="contato@empresa.com"
                    value={formData.from_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, from_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from_name">Nome do Remetente</Label>
                  <Input
                    id="from_name"
                    placeholder="Empresa IPTV"
                    value={formData.from_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, from_name: e.target.value }))}
                  />
                </div>
              </div>
              
              {/* Configurações de Uso */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Configurações de Uso</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <Switch
                        checked={formData.useForNotifications || false}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, useForNotifications: checked }))}
                      />
                      <span>Usar para Notificações</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">Avisos de vencimento, lembretes, etc.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <Switch
                        checked={formData.useForMarketing || false}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, useForMarketing: checked }))}
                      />
                      <span>Usar para Marketing</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">Campanhas de email marketing</p>
                  </div>
                </div>
              </div>
              
              {/* Configurações Avançadas */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Configurações Avançadas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="10"
                      placeholder="1"
                      value={formData.priority || 1}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                    />
                    <p className="text-xs text-muted-foreground">1 = maior prioridade, 10 = menor prioridade</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dailyLimit">Limite Diário</Label>
                    <Input
                      id="dailyLimit"
                      type="number"
                      min="1"
                      placeholder="1000"
                      value={formData.dailyLimit || 1000}
                      onChange={(e) => setFormData(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) || 1000 }))}
                    />
                    <p className="text-xs text-muted-foreground">Máximo de emails por dia</p>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingConfig ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Configurações Existentes */}
      {configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma configuração SMTP</h3>
            <p className="text-muted-foreground text-center mb-4">
              Configure um servidor SMTP para começar a enviar emails.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      {config.is_default && (
                        <Badge variant="outline" className="bg-yellow-50">
                          <Star className="mr-1 h-3 w-3" />
                          Padrão
                        </Badge>
                      )}
                      {getStatusBadge(config)}
                    </div>
                    <CardDescription>
                      {config.host}:{config.port} • {config.from_email}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleTestConfig(config)}
                        disabled={testingConfig === config.id}
                      >
                        <TestTube className="mr-2 h-4 w-4" />
                        {testingConfig === config.id ? 'Testando...' : 'Testar Conexão'}
                      </DropdownMenuItem>
                      {!config.is_default && (
                        <DropdownMenuItem onClick={() => handleSetDefault(config)}>
                          <Star className="mr-2 h-4 w-4" />
                          Definir como Padrão
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleEdit(config)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setDeletingConfig(config)}
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
                      <Mail className="mr-2 h-4 w-4" />
                      Configuração
                    </div>
                    <div className="text-sm space-y-1">
                      <div>Host: {config.host}</div>
                      <div>Porta: {config.port}</div>
                      <div>Seguro: {config.secure ? 'Sim' : 'Não'}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Shield className="mr-2 h-4 w-4" />
                      Autenticação
                    </div>
                    <div className="text-sm space-y-1">
                      <div>Usuário: {config.username}</div>
                      <div>Remetente: {config.from_name || config.from_email}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Settings className="mr-2 h-4 w-4" />
                      Uso e Limites
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center space-x-2">
                        {config.useForNotifications && (
                          <Badge variant="outline" className="text-xs">Notificações</Badge>
                        )}
                        {config.useForMarketing && (
                          <Badge variant="outline" className="text-xs">Marketing</Badge>
                        )}
                      </div>
                      <div>Prioridade: {config.priority || 1}</div>
                      <div>Limite: {config.currentDailyCount || 0}/{config.dailyLimit || 1000} hoje</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <TestTube className="mr-2 h-4 w-4" />
                      Último Teste
                    </div>
                    <div className="text-sm">
                      {config.last_tested ? (
                        <div className="space-y-1">
                          <div>{formatDistanceToNow(new Date(config.last_tested), { addSuffix: true, locale: ptBR })}</div>
                          {config.test_result && (
                            <div className={`flex items-center space-x-1 ${
                              config.test_result.success ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {config.test_result.success ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              <span className="text-xs">{config.test_result.message}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-yellow-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Nunca testado</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deletingConfig} onOpenChange={() => setDeletingConfig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Configuração SMTP</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a configuração "{deletingConfig?.name}"? 
              Esta ação não pode ser desfeita e pode afetar o envio de emails.
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