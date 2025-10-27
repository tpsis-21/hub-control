import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { 
  Settings, 
  TestTube, 
  Users, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  Clock,
  Zap,
  Activity
} from 'lucide-react'
import { natvService } from '@/services/natv.service'
import { useAuth } from '@/hooks/useAuth'

interface NATVConfig {
  token: string
  baseUrl: string
  timeout: number
}

interface OperationData {
  createUser: {
    username: string
    email: string
    password: string
    plan: string
  }
  activation: {
    username: string
    plan: string
    duration: number
  }
  searchUsers: {
    username: string
    userId: string
    limit: number
  }
}

interface OperationResult {
  type: string
  data?: any
  error?: string
}

export function NATVConfig() {
  const { user } = useAuth()
  const [config, setConfig] = useState<NATVConfig>({
    token: '',
    baseUrl: 'https://revenda.pixbot.link',
    timeout: 30000
  })
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [operationLoading, setOperationLoading] = useState(false)
  const [operationResult, setOperationResult] = useState<OperationResult | null>(null)
  const [operationData, setOperationData] = useState<OperationData>({
    createUser: {
      username: '',
      email: '',
      password: '',
      plan: 'basic'
    },
    activation: {
      username: '',
      plan: 'basic',
      duration: 30
    },
    searchUsers: {
      username: '',
      userId: '',
      limit: 10
    }
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    if (!user?.id) return
    
    try {
      setIsLoading(true)
      const response = await natvService.getUserConfigInfo(user?.id || '')
      if (response.hasConfig && response.baseUrl) {
        setConfig({
          token: '', // Token não é retornado por segurança
          baseUrl: response.baseUrl,
          timeout: 30000
        })
        setIsConfigured(true)
      }
    } catch (error) {
      console.error('Erro ao carregar configuração NATV:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!config.token.trim()) {
      toast.error('Token é obrigatório')
      return
    }

    if (!user?.id) return
    
    setIsLoading(true)
    try {
      await natvService.saveUserConfig(user?.id || '', config)
      setIsConfigured(true)
      toast.success('Configuração salva com sucesso!')
      
      // Testar conexão
      const testResult = await natvService.testUserConnection(user?.id || '')
      if (testResult.success) {
        toast.success('Conexão testada com sucesso!')
      } else {
        toast.error('Configuração salva, mas falha no teste de conexão')
      }
    } catch (error) {
      toast.error('Erro ao salvar configuração')
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async () => {
    if (!user?.id) return
    
    setIsLoading(true)
    try {
      const result = await natvService.testUserConnection(user?.id || '')
      if (result.success) {
        toast.success('Conexão testada com sucesso!')
        setOperationResult({ type: 'test', data: result })
      } else {
        toast.error('Falha no teste de conexão')
        setOperationResult({ type: 'test', error: result.message })
      }
    } catch (error) {
      toast.error('Erro ao testar conexão')
      setOperationResult({ type: 'test', error: error instanceof Error ? error.message : 'Erro desconhecido' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração NATV
        </CardTitle>
        <CardDescription>
          Configure a integração com a API NATV para gerenciamento de usuários e licenças
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="operations">Operações</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="limits">Limites</TabsTrigger>
          </TabsList>
          
          <TabsContent value="config" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Token *</Label>
                <Input
                  id="token"
                  type="password"
                  value={config.token}
                  onChange={(e) => setConfig(prev => ({ ...prev, token: e.target.value }))}
                  placeholder="Seu Token da NATV"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="baseUrl">URL Base</Label>
                <Input
                  id="baseUrl"
                  value={config.baseUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://revenda.pixbot.link"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={config.timeout}
                  onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                  min="5000"
                  max="60000"
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={saveConfig} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Settings className="mr-2 h-4 w-4" />
                  )}
                  Salvar Configuração
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={testConnection} 
                  disabled={isLoading || !isConfigured}
                >
                  {isLoading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="mr-2 h-4 w-4" />
                  )}
                  Testar
                </Button>
              </div>
              
              {isConfigured && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Configuração salva e ativa. Você pode usar as operações da NATV.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="operations" className="space-y-4">
            <div className="space-y-6">
              {/* Criar Usuário */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-4 w-4" />
                    Criar Usuário de Teste
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="create-username">Nome de usuário</Label>
                      <Input
                        id="create-username"
                        value={operationData.createUser.username}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          createUser: { ...prev.createUser, username: e.target.value }
                        }))}
                        placeholder="usuario_teste"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-email">E-mail</Label>
                      <Input
                        id="create-email"
                        type="email"
                        value={operationData.createUser.email}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          createUser: { ...prev.createUser, email: e.target.value }
                        }))}
                        placeholder="teste@exemplo.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-password">Senha</Label>
                      <Input
                        id="create-password"
                        type="password"
                        value={operationData.createUser.password}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          createUser: { ...prev.createUser, password: e.target.value }
                        }))}
                        placeholder="senha123"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-plan">Plano</Label>
                      <Input
                        id="create-plan"
                        value={operationData.createUser.plan}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          createUser: { ...prev.createUser, plan: e.target.value }
                        }))}
                        placeholder="basic"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      setOperationLoading(true)
                      try {
                        const result = await natvService.createUserWithConfig(user?.id || '', operationData.createUser)
                        setOperationResult({ type: 'createUser', data: result })
                        if (result.success) {
                          toast.success('Usuário criado com sucesso!')
                        } else {
                          toast.error('Erro ao criar usuário')
                        }
                      } catch (error) {
                        toast.error('Erro ao criar usuário')
                        setOperationResult({ type: 'createUser', error: error instanceof Error ? error.message : 'Erro desconhecido' })
                      } finally {
                        setOperationLoading(false)
                      }
                    }}
                    disabled={operationLoading || !isConfigured || !operationData.createUser.username || !operationData.createUser.email}
                    className="w-full"
                  >
                    {operationLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="mr-2 h-4 w-4" />
                    )}
                    Criar Usuário
                  </Button>
                </CardContent>
              </Card>
              
              {/* Ativação/Renovação */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <RefreshCw className="h-4 w-4" />
                    Ativação/Renovação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="activation-username">Nome de usuário</Label>
                      <Input
                        id="activation-username"
                        value={operationData.activation.username}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          activation: { ...prev.activation, username: e.target.value }
                        }))}
                        placeholder="usuario_teste"
                      />
                    </div>
                    <div>
                      <Label htmlFor="activation-plan">Plano</Label>
                      <Input
                        id="activation-plan"
                        value={operationData.activation.plan}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          activation: { ...prev.activation, plan: e.target.value }
                        }))}
                        placeholder="basic"
                      />
                    </div>
                    <div>
                      <Label htmlFor="activation-duration">Duração (dias)</Label>
                      <Input
                        id="activation-duration"
                        type="number"
                        value={operationData.activation.duration}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          activation: { ...prev.activation, duration: parseInt(e.target.value) || 30 }
                        }))}
                        min="1"
                        max="365"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      setOperationLoading(true)
                      try {
                        const result = await natvService.activateUserWithConfig(user?.id || '', operationData.activation)
                        setOperationResult({ type: 'activation', data: result })
                        if (result.success) {
                          toast.success('Usuário ativado com sucesso!')
                        } else {
                          toast.error('Erro ao ativar usuário')
                        }
                      } catch (error) {
                        toast.error('Erro ao ativar usuário')
                        setOperationResult({ type: 'activation', error: error instanceof Error ? error.message : 'Erro desconhecido' })
                      } finally {
                        setOperationLoading(false)
                      }
                    }}
                    disabled={operationLoading || !isConfigured || !operationData.activation.username}
                    className="w-full"
                  >
                    {operationLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Ativar/Renovar
                  </Button>
                </CardContent>
              </Card>
              
              {/* Buscar Usuários */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Search className="h-4 w-4" />
                    Buscar Usuários
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="search-username">Nome de usuário</Label>
                      <Input
                        id="search-username"
                        value={operationData.searchUsers.username}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          searchUsers: { ...prev.searchUsers, username: e.target.value }
                        }))}
                        placeholder="usuario_teste"
                      />
                    </div>
                    <div>
                      <Label htmlFor="search-userid">ID do usuário</Label>
                      <Input
                        id="search-userid"
                        value={operationData.searchUsers.userId}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          searchUsers: { ...prev.searchUsers, userId: e.target.value }
                        }))}
                        placeholder="ID numérico"
                      />
                    </div>
                    <div>
                      <Label htmlFor="search-limit">Limite de resultados</Label>
                      <Input
                        id="search-limit"
                        type="number"
                        value={operationData.searchUsers.limit}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          searchUsers: { ...prev.searchUsers, limit: parseInt(e.target.value) || 10 }
                        }))}
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      setOperationLoading(true)
                      try {
                        const result = await natvService.searchUsersWithConfig(user?.id || '', {
                          username: operationData.searchUsers.username,
                          ...(operationData.searchUsers.userId && { email: operationData.searchUsers.userId })
                        })
                        setOperationResult({ type: 'searchUsers', data: result })
                        if (result.success) {
                          toast.success('Encontrados ' + (result.data?.length || 0) + ' usuários')
                        } else {
                          toast.error('Erro ao buscar usuários')
                        }
                      } catch (error) {
                        toast.error('Erro ao buscar usuários')
                        setOperationResult({ type: 'searchUsers', error: error instanceof Error ? error.message : 'Erro desconhecido' })
                      } finally {
                        setOperationLoading(false)
                      }
                    }}
                    disabled={operationLoading || !isConfigured}
                    className="w-full"
                  >
                    {operationLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Buscar Usuários
                  </Button>
                </CardContent>
              </Card>
              
              {/* Resultado das Operações */}
              {operationResult && (
                <Alert className={operationResult.data?.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {operationResult.data?.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">
                        Resultado da operação: {operationResult.type}
                      </p>
                      <p className="text-sm">
                        {operationResult.data?.message || operationResult.error || 'Operação concluída'}
                      </p>
                      {operationResult.data?.data && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium">Ver dados completos</summary>
                          <Textarea
                            className="mt-2 font-mono text-xs"
                            value={JSON.stringify(operationResult.data.data, null, 2)}
                            readOnly
                            rows={8}
                          />
                        </details>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="endpoints" className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Endpoints Disponíveis</h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Criar Usuário de Teste</p>
                    <p className="text-sm text-muted-foreground">POST /user</p>
                  </div>
                  <Badge variant="outline">POST</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Ativação/Renovação</p>
                    <p className="text-sm text-muted-foreground">POST /user/activation</p>
                  </div>
                  <Badge variant="outline">POST</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Buscar Usuários</p>
                    <p className="text-sm text-muted-foreground">GET /user/search</p>
                  </div>
                  <Badge variant="outline">GET</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Teste de Conexão</p>
                    <p className="text-sm text-muted-foreground">GET /test</p>
                  </div>
                  <Badge variant="outline">GET</Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <a 
                  href="https://revenda.pixbot.link" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Documentação da API
                </a>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="limits" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Limites da API NATV
              </h4>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Limites Específicos da API NATV:</strong>
                  <br />• Criação de usuários: 5 requisições a cada 30 segundos
                  <br />• Criação de usuários: 50 requisições por dia
                  <br />• Limite global: 1 requisição a cada 150ms
                  <br />• Timeout padrão: 30 segundos
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <h5 className="font-medium">Rate Limiting</h5>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 150ms entre requisições</li>
                    <li>• 5 criações por 30s</li>
                    <li>• 50 criações por dia</li>
                  </ul>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <h5 className="font-medium">Performance</h5>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Timeout: {config.timeout}ms</li>
                    <li>• Retry automático</li>
                    <li>• Cache de configuração</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default NATVConfig



