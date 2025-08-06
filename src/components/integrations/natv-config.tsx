'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Save,
  RefreshCw,
  ExternalLink,
  Clock,
  Zap,
  User,
  Search,
  Activity
} from 'lucide-react'
import { natvService, type NATVConfig } from '@/services/natv.service'
import { toast } from 'sonner'

export function NATVConfig() {
  const [config, setConfig] = useState<NATVConfig>({
    baseUrl: 'https://revenda.pixbot.link',
    token: '',
    timeout: 30000
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    timestamp?: string
    data?: any
  } | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const [testData, setTestData] = useState({
    username: '',
    password: '',
    searchQuery: ''
  })
  const [operationData, setOperationData] = useState({
    createUser: {
      username: '',
      minutes: 60
    },
    activateUser: {
      username: '',
      userId: '',
      months: 1
    },
    searchUsers: {
      username: '',
      userId: '',
      limit: 10
    }
  })
  const [operationResult, setOperationResult] = useState<any>(null)
  const [operationLoading, setOperationLoading] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setIsLoading(true)
      await natvService.reloadConfig()
      const configInfo = natvService.getConfigInfo()
      
      if (configInfo) {
        setConfig(prev => ({
          ...prev,
          baseUrl: configInfo.baseUrl,
          timeout: configInfo.timeout || 30000
        }))
        setIsConfigured(true)
      } else {
        setIsConfigured(false)
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
      toast.error('Erro ao carregar configuração NATV')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config.token.trim()) {
      toast.error('Token de autenticação é obrigatório')
      return
    }

    try {
      setIsLoading(true)
      await natvService.saveConfig(config)
      setIsConfigured(true)
      toast.success('Configuração salva com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      toast.error('Erro ao salvar configuração')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = async () => {
    if (!config.token.trim()) {
      toast.error('Configure o token antes de testar')
      return
    }

    try {
      setIsTesting(true)
      setTestResult(null)
      
      // Salva a configuração temporariamente para teste
      await natvService.saveConfig(config)
      
      const result = await natvService.testConnection()
      
      setTestResult({
        success: result.success,
        message: result.success ? 'Conexão estabelecida com sucesso!' : result.error || 'Erro na conexão',
        timestamp: new Date().toLocaleString('pt-BR'),
        data: result.data
      })
      
      if (result.success) {
        toast.success('Teste de conexão realizado com sucesso!')
      } else {
        toast.error('Falha no teste de conexão')
      }
    } catch (error) {
      console.error('Erro no teste:', error)
      setTestResult({
        success: false,
        message: 'Erro interno no teste de conexão',
        timestamp: new Date().toLocaleString('pt-BR')
      })
      toast.error('Erro no teste de conexão')
    } finally {
      setIsTesting(false)
    }
  }

  const handleCreateUser = async () => {
    if (!testData.username || !testData.password) {
      toast.error('Username e password são obrigatórios')
      return
    }

    try {
      setIsTesting(true)
      const result = await natvService.createUser({
        username: testData.username,
        password: testData.password,
        duration: 1 // 1 dia de teste
      })
      
      setTestResult({
        success: result.success,
        message: result.message,
        timestamp: new Date().toLocaleString('pt-BR'),
        data: result.data
      })
      
      if (result.success) {
        toast.success('Usuário criado com sucesso!')
        setTestData(prev => ({ ...prev, username: '', password: '' }))
      } else {
        toast.error(result.error || 'Erro ao criar usuário')
      }
    } catch (error) {
      toast.error('Erro ao criar usuário')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSearchUsers = async () => {
    if (!testData.searchQuery) {
      toast.error('Digite um termo para busca')
      return
    }

    try {
      setIsTesting(true)
      const result = await natvService.searchUsers({
        username: testData.searchQuery
      })
      
      setTestResult({
        success: result.success,
        message: result.message,
        timestamp: new Date().toLocaleString('pt-BR'),
        data: result.data
      })
      
      if (result.success) {
        toast.success('Busca realizada com sucesso!')
      } else {
        toast.error(result.error || 'Erro na busca')
      }
    } catch (error) {
      toast.error('Erro na busca de usuários')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>Configuração NATV</CardTitle>
          <Badge variant={isConfigured ? 'default' : 'secondary'}>
            {isConfigured ? 'Configurado' : 'Não Configurado'}
          </Badge>
        </div>
        <CardDescription>
          Configure a integração com a API de Revenda NATV para criação e gerenciamento de usuários de teste.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="test">Teste</TabsTrigger>
            <TabsTrigger value="operations">Operações</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="limits">Limites</TabsTrigger>
          </TabsList>
          
          <TabsContent value="config" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">URL Base da API</Label>
                <Input
                  id="baseUrl"
                  value={config.baseUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://revenda.pixbot.link"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="token">Token de Autenticação</Label>
                <Input
                  id="token"
                  type="password"
                  value={config.token}
                  onChange={(e) => setConfig(prev => ({ ...prev, token: e.target.value }))}
                  placeholder="Seu token Bearer"
                />
                <p className="text-sm text-muted-foreground">
                  Token usado no header: Authorization: Bearer {'{token}'}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={config.timeout}
                  onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                  placeholder="30000"
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Salvando...' : 'Salvar Configuração'}
              </Button>
              
              <Button variant="outline" onClick={handleTest} disabled={isTesting || !config.token}>
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? 'Testando...' : 'Testar Conexão'}
              </Button>
              
              <Button variant="outline" onClick={loadConfig}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar
              </Button>
            </div>
            
            {testResult && (
              <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                  <div className="space-y-1">
                    <p>{testResult.message}</p>
                    {testResult.timestamp && (
                      <p className="text-xs opacity-70">Testado em: {testResult.timestamp}</p>
                    )}
                    {testResult.data && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs">Ver dados da resposta</summary>
                        <pre className="mt-1 text-xs bg-black/5 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="test" className="space-y-4">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Criar Usuário de Teste
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-username">Username</Label>
                    <Input
                      id="test-username"
                      value={testData.username}
                      onChange={(e) => setTestData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="usuario_teste"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="test-password">Password</Label>
                    <Input
                      id="test-password"
                      type="password"
                      value={testData.password}
                      onChange={(e) => setTestData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="senha123"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleCreateUser} 
                  disabled={isTesting || !isConfigured}
                  className="w-full"
                >
                  <User className="h-4 w-4 mr-2" />
                  {isTesting ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Buscar Usuários
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="search-query">Termo de Busca</Label>
                  <Input
                    id="search-query"
                    value={testData.searchQuery}
                    onChange={(e) => setTestData(prev => ({ ...prev, searchQuery: e.target.value }))}
                    placeholder="Digite username para buscar"
                  />
                </div>
                
                <Button 
                  onClick={handleSearchUsers} 
                  disabled={isTesting || !isConfigured}
                  className="w-full"
                  variant="outline"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isTesting ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
              
              {testResult && (
                <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                    <div className="space-y-2">
                      <p className="font-medium">{testResult.message}</p>
                      {testResult.timestamp && (
                        <p className="text-xs opacity-70">Executado em: {testResult.timestamp}</p>
                      )}
                      {testResult.data && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium">Ver resposta completa</summary>
                          <Textarea 
                            className="mt-2 font-mono text-xs" 
                            value={JSON.stringify(testResult.data, null, 2)}
                            readOnly
                            rows={10}
                          />
                        </details>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="operations" className="space-y-4">
            <div className="space-y-6">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Operações da API NATV
              </h4>
              
              {/* Criar Usuário */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Criar Usuário de Teste</CardTitle>
                  <CardDescription>
                    Cria um novo usuário de teste com duração específica
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="create-username">Nome de usuário (opcional)</Label>
                      <Input
                        id="create-username"
                        value={operationData.createUser.username}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          createUser: { ...prev.createUser, username: e.target.value }
                        }))}
                        placeholder="Deixe vazio para gerar automaticamente"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-minutes">Duração (minutos)</Label>
                      <Input
                        id="create-minutes"
                        type="number"
                        value={operationData.createUser.minutes}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          createUser: { ...prev.createUser, minutes: parseInt(e.target.value) || 60 }
                        }))}
                        min="1"
                        max="1440"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      setOperationLoading(true)
                      try {
                        const result = await natvService.createUser({
                          username: operationData.createUser.username || `user_${Date.now()}`,
                          password: `pass_${Date.now()}`,
                          duration: operationData.createUser.minutes
                        })
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
                    disabled={operationLoading || !isConfigured}
                    className="w-full"
                  >
                    {operationLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <User className="mr-2 h-4 w-4" />
                    )}
                    Criar Usuário
                  </Button>
                </CardContent>
              </Card>
              
              {/* Ativar/Renovar Usuário */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ativar/Renovar Usuário</CardTitle>
                  <CardDescription>
                    Ativa ou renova um usuário existente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="activate-username">Nome de usuário</Label>
                      <Input
                        id="activate-username"
                        value={operationData.activateUser.username}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          activateUser: { ...prev.activateUser, username: e.target.value }
                        }))}
                        placeholder="Nome do usuário"
                      />
                    </div>
                    <div>
                      <Label htmlFor="activate-userid">ID do usuário (alternativo)</Label>
                      <Input
                        id="activate-userid"
                        value={operationData.activateUser.userId}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          activateUser: { ...prev.activateUser, userId: e.target.value }
                        }))}
                        placeholder="ID numérico"
                      />
                    </div>
                    <div>
                      <Label htmlFor="activate-months">Meses</Label>
                      <Input
                        id="activate-months"
                        type="number"
                        value={operationData.activateUser.months}
                        onChange={(e) => setOperationData(prev => ({
                          ...prev,
                          activateUser: { ...prev.activateUser, months: parseInt(e.target.value) || 1 }
                        }))}
                        min="1"
                        max="12"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      setOperationLoading(true)
                      try {
                        const result = await natvService.activateUser({
                          username: operationData.activateUser.username,
                          plan: 'default',
                          duration: operationData.activateUser.months * 30
                        })
                        setOperationResult({ type: 'activateUser', data: result })
                        if (result.success) {
                          toast.success('Usuário ativado/renovado com sucesso!')
                        } else {
                          toast.error('Erro ao ativar/renovar usuário')
                        }
                      } catch (error) {
                        toast.error('Erro ao ativar/renovar usuário')
                        setOperationResult({ type: 'activateUser', error: error instanceof Error ? error.message : 'Erro desconhecido' })
                      } finally {
                        setOperationLoading(false)
                      }
                    }}
                    disabled={operationLoading || !isConfigured || (!operationData.activateUser.username && !operationData.activateUser.userId)}
                    className="w-full"
                  >
                    {operationLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    Ativar/Renovar
                  </Button>
                </CardContent>
              </Card>
              
              {/* Buscar Usuários */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Buscar Usuários</CardTitle>
                  <CardDescription>
                    Busca usuários por nome ou ID
                  </CardDescription>
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
                        placeholder="Nome do usuário"
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
                        const result = await natvService.searchUsers({
                          username: operationData.searchUsers.username,
                          ...(operationData.searchUsers.userId && { email: operationData.searchUsers.userId })
                        })
                        setOperationResult({ type: 'searchUsers', data: result })
                        if (result.success) {
                          toast.success(`Encontrados ${result.data?.length || 0} usuários`)
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