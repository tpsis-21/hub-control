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
  Package,
  User,
  Search,
  Activity,
  Upload,
  Download
} from 'lucide-react'
import { toast } from 'sonner'
import { createClientSupabaseClient } from '@/lib/supabase/clients/browser'
import { validateIntegrationConfig } from '@/lib/local-validation'
import { ValidationFeedback, InlineValidation } from '@/components/ui/validation-feedback'

interface TheBestConfig {
  apiUrl: string
  apiKey: string
  username: string
  password: string
  timeout: number
}

interface TheBestPackage {
  id: string
  classificacao: string
  duracao: string
  telas: number
  creditos: number
}

export function TheBestConfig() {
  const [config, setConfig] = useState<TheBestConfig>({
    apiUrl: '',
    apiKey: '',
    username: '',
    password: '',
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
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [packages, setPackages] = useState<TheBestPackage[]>([])
  const [isLoadingPackages, setIsLoadingPackages] = useState(false)
  const [renewalData, setRenewalData] = useState({
    packageId: '',
    userId: '',
    duration: '1',
    classification: 'COM ADULTO'
  })
  const [operationResult, setOperationResult] = useState<any>(null)
  const [operationLoading, setOperationLoading] = useState(false)
  const [userRenewals, setUserRenewals] = useState<any[]>([])
  const [isLoadingRenewals, setIsLoadingRenewals] = useState(false)
  
  // Estado para validação local
  const [localValidation, setLocalValidation] = useState(validateIntegrationConfig(config))

  useEffect(() => {
    initializeComponent()
  }, [])

  // Validação local em tempo real
  useEffect(() => {
    const validation = validateIntegrationConfig(config)
    setLocalValidation(validation)
  }, [config])

  const initializeComponent = async () => {
    try {
      const supabase = createClientSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setCurrentUser(user)
        await loadUserConfig(user.id)
      } else {
        toast.error('Usuário não autenticado')
      }
    } catch (error) {
      console.error('Erro ao inicializar componente:', error)
      toast.error('Erro ao carregar dados do usuário')
    }
  }

  const loadUserConfig = async (userId: string) => {
    try {
      setIsLoading(true)
      const supabase = createClientSupabaseClient()
      
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .eq('provider', 'thebest')
        .eq('created_by', userId)
        .eq('is_active', true)
        .single()
      
      if (data && !error) {
        const configData = data.config_data as any
        setConfig({
          apiUrl: data.base_url || '',
          apiKey: data.auth_token || '',
          username: configData?.username || '',
          password: configData?.password || '',
          timeout: configData?.timeout || 30000
        })
        setIsConfigured(true)
        
        // Carregar pacotes se configurado
        await loadPackages()
        await loadUserRenewals()
      } else {
        setIsConfigured(false)
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do usuário:', error)
      toast.error('Erro ao carregar configuração The Best')
      setIsConfigured(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config.apiUrl.trim() || !config.apiKey.trim()) {
      toast.error('URL da API e Chave da API são obrigatórias')
      return
    }

    if (!currentUser) {
      toast.error('Usuário não autenticado')
      return
    }

    try {
      setIsLoading(true)
      const supabase = createClientSupabaseClient()
      
      // Verificar se já existe configuração
      const { data: existingConfig } = await supabase
        .from('integration_configs')
        .select('id')
        .eq('provider', 'thebest')
        .eq('created_by', currentUser.id)
        .eq('is_active', true)
        .single()
      
      const configData = {
        provider: 'thebest',
        name: 'The Best API',
        base_url: config.apiUrl,
        auth_token: config.apiKey,
        auth_type: 'bearer',
        config_data: {
          username: config.username,
          password: config.password,
          timeout: config.timeout
        },
        is_active: true,
        updated_at: new Date().toISOString(),
        created_by: currentUser.id,
        updated_by: currentUser.id
      }
      
      if (existingConfig) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('integration_configs')
          .update(configData)
          .eq('id', existingConfig.id)
        
        if (error) throw error
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from('integration_configs')
          .insert(configData)
        
        if (error) throw error
      }
      
      setIsConfigured(true)
      toast.success('Configuração salva com sucesso!')
      
      // Carregar pacotes após salvar
      await loadPackages()
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      toast.error('Erro ao salvar configuração')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = async () => {
    if (!config.apiUrl.trim() || !config.apiKey.trim()) {
      toast.error('Configure a URL e chave da API antes de testar')
      return
    }

    if (!currentUser) {
      toast.error('Usuário não autenticado')
      return
    }

    try {
      setIsTesting(true)
      setTestResult(null)
      
      // Fazer requisição de teste via proxy
      const response = await fetch('/api/proxy/thebest?action=test_connection', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await createClientSupabaseClient().auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      setTestResult({
        success: result.success || response.ok,
        message: result.message || (response.ok ? 'Conexão estabelecida com sucesso!' : 'Erro na conexão'),
        timestamp: new Date().toLocaleString('pt-BR'),
        data: result
      })
      
      if (result.success || response.ok) {
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

  const loadPackages = async () => {
    if (!isConfigured) return
    
    try {
      setIsLoadingPackages(true)
      // TODO: Implementar carregamento de pacotes quando a tabela thebest_packages estiver disponível
      // const supabase = createClientSupabaseClient()
      // 
      // const { data, error } = await supabase
      //   .from('thebest_packages')
      //   .select('*')
      //   .order('classificacao', { ascending: true })
      //   .order('duracao', { ascending: true })
      // 
      // if (error) throw error
      // 
      // setPackages(data || [])
      setPackages([])
    } catch (error) {
      console.error('Erro ao carregar pacotes:', error)
      toast.error('Erro ao carregar pacotes')
    } finally {
      setIsLoadingPackages(false)
    }
  }

  const syncPackages = async () => {
    if (!isConfigured) {
      toast.error('Configure a integração antes de sincronizar pacotes')
      return
    }

    try {
      setIsLoadingPackages(true)
      
      const response = await fetch('/api/proxy/thebest?action=sync_packages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await createClientSupabaseClient().auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })
      
      if (!response.ok) {
        throw new Error('Erro na sincronização')
      }
      
      const result = await response.json()
      toast.success('Pacotes sincronizados com sucesso!')
      
      // Recarregar pacotes
      await loadPackages()
    } catch (error) {
      console.error('Erro ao sincronizar pacotes:', error)
      toast.error('Erro ao sincronizar pacotes')
    } finally {
      setIsLoadingPackages(false)
    }
  }

  const createRenewal = async () => {
    if (!renewalData.packageId || !renewalData.userId) {
      toast.error('Selecione um pacote e informe o ID do usuário')
      return
    }

    try {
      setOperationLoading(true)
      
      const response = await fetch('/api/proxy/thebest?action=create_renewal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await createClientSupabaseClient().auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          package_id: renewalData.packageId,
          user_id: renewalData.userId,
          duration: renewalData.duration,
          classification: renewalData.classification
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro na criação da renovação')
      }
      
      setOperationResult(result)
      toast.success('Renovação criada com sucesso!')
      
      // Recarregar renovações do usuário
      await loadUserRenewals()
    } catch (error) {
      console.error('Erro ao criar renovação:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar renovação')
    } finally {
      setOperationLoading(false)
    }
  }

  const loadUserRenewals = async () => {
    if (!isConfigured) return
    
    try {
      setIsLoadingRenewals(true)
      const supabase = createClientSupabaseClient()
      
      // TODO: Implementar carregamento de renovações quando a tabela thebest_renewals estiver disponível
      // const { data, error } = await supabase
      //   .from('thebest_renewals')
      //   .select(`
      //     *,
      //     thebest_packages (
      //       classificacao,
      //       duracao,
      //       telas,
      //       creditos
      //     )
      //   `)
      //   .eq('created_by', currentUser?.id)
      //   .order('created_at', { ascending: false })
      //   .limit(10)
      // 
      // if (error) throw error
      // 
      // setUserRenewals(data || [])
      setUserRenewals([])
    } catch (error) {
      console.error('Erro ao carregar renovações:', error)
      toast.error('Erro ao carregar renovações')
    } finally {
      setIsLoadingRenewals(false)
    }
  }

  const removeConfig = async () => {
    if (!currentUser) {
      toast.error('Usuário não autenticado')
      return
    }

    try {
      setIsLoading(true)
      const supabase = createClientSupabaseClient()
      
      const { error } = await supabase
        .from('integration_configs')
        .update({ is_active: false })
        .eq('created_by', currentUser.id)
        .eq('provider', 'thebest')
      
      if (error) throw error
      
      setConfig({
        apiUrl: '',
        apiKey: '',
        username: '',
        password: '',
        timeout: 30000
      })
      setIsConfigured(false)
      setPackages([])
      setUserRenewals([])
      toast.success('Configuração removida com sucesso!')
    } catch (error) {
      console.error('Erro ao remover configuração:', error)
      toast.error('Erro ao remover configuração')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <CardTitle>Configuração The Best</CardTitle>
              {isConfigured && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configurado
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUserConfig(currentUser?.id)}
              disabled={isLoading || !currentUser}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Recarregar
            </Button>
          </div>
          <CardDescription>
            Configure sua integração com The Best para gerenciar pacotes e renovações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="config">Configuração</TabsTrigger>
              <TabsTrigger value="packages">Pacotes</TabsTrigger>
              <TabsTrigger value="renewals">Renovações</TabsTrigger>
              <TabsTrigger value="test">Teste</TabsTrigger>
            </TabsList>
            
            <TabsContent value="config" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl">URL da API *</Label>
                  <Input
                    id="apiUrl"
                    type="url"
                    placeholder="https://api.thebest.com"
                    value={config.apiUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">Chave da API *</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Sua chave da API"
                    value={config.apiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Usuário (opcional)"
                    value={config.username}
                    onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Senha (opcional)"
                    value={config.password}
                    onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    placeholder="30000"
                    value={config.timeout}
                    onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              {/* Validação local em tempo real */}
              <ValidationFeedback result={localValidation} />
              
              <Separator />
              
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Salvando...' : 'Salvar Configuração'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={isTesting || !config.apiUrl || !config.apiKey}
                  >
                    <TestTube className={`h-4 w-4 mr-2 ${isTesting ? 'animate-pulse' : ''}`} />
                    {isTesting ? 'Testando...' : 'Testar Conexão'}
                  </Button>
                </div>
                {isConfigured && (
                  <Button
                    variant="destructive"
                    onClick={removeConfig}
                    disabled={isLoading}
                  >
                    Remover Configuração
                  </Button>
                )}
              </div>
              
              {testResult && (
                <Alert className={testResult.success ? 'border-green-500' : 'border-red-500'}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>{testResult.message}</p>
                      {testResult.timestamp && (
                        <p className="text-xs text-muted-foreground">
                          Testado em: {testResult.timestamp}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="packages" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Pacotes Disponíveis</h3>
                <Button
                  onClick={syncPackages}
                  disabled={!isConfigured || isLoadingPackages}
                  variant="outline"
                >
                  <Download className={`h-4 w-4 mr-2 ${isLoadingPackages ? 'animate-spin' : ''}`} />
                  {isLoadingPackages ? 'Sincronizando...' : 'Sincronizar Pacotes'}
                </Button>
              </div>
              
              {!isConfigured ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Configure a integração primeiro para visualizar os pacotes.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packages.map((pkg) => (
                    <Card key={pkg.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline">{pkg.classificacao}</Badge>
                          <span className="text-sm text-muted-foreground">{pkg.duracao}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm"><strong>Telas:</strong> {pkg.telas}</p>
                          <p className="text-sm"><strong>Créditos:</strong> {pkg.creditos}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="renewals" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Criar Nova Renovação</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="packageSelect">Pacote</Label>
                    <select
                      id="packageSelect"
                      className="w-full p-2 border rounded-md"
                      value={renewalData.packageId}
                      onChange={(e) => setRenewalData(prev => ({ ...prev, packageId: e.target.value }))}
                      disabled={!isConfigured}
                    >
                      <option value="">Selecione um pacote</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.classificacao} - {pkg.duracao} ({pkg.telas} telas, {pkg.creditos} créditos)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userId">ID do Usuário</Label>
                    <Input
                      id="userId"
                      type="text"
                      placeholder="ID do usuário"
                      value={renewalData.userId}
                      onChange={(e) => setRenewalData(prev => ({ ...prev, userId: e.target.value }))}
                      disabled={!isConfigured}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duração</Label>
                    <select
                      id="duration"
                      className="w-full p-2 border rounded-md"
                      value={renewalData.duration}
                      onChange={(e) => setRenewalData(prev => ({ ...prev, duration: e.target.value }))}
                      disabled={!isConfigured}
                    >
                      <option value="1">1 mês</option>
                      <option value="3">3 meses</option>
                      <option value="6">6 meses</option>
                      <option value="12">12 meses</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classification">Classificação</Label>
                    <select
                      id="classification"
                      className="w-full p-2 border rounded-md"
                      value={renewalData.classification}
                      onChange={(e) => setRenewalData(prev => ({ ...prev, classification: e.target.value }))}
                      disabled={!isConfigured}
                    >
                      <option value="COM ADULTO">COM ADULTO</option>
                      <option value="SEM ADULTO">SEM ADULTO</option>
                    </select>
                  </div>
                </div>
                
                <Button
                  onClick={createRenewal}
                  disabled={!isConfigured || operationLoading || !renewalData.packageId || !renewalData.userId}
                >
                  <Package className={`h-4 w-4 mr-2 ${operationLoading ? 'animate-spin' : ''}`} />
                  {operationLoading ? 'Criando...' : 'Criar Renovação'}
                </Button>
                
                {operationResult && (
                  <Alert className="border-green-500">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p>Renovação criada com sucesso!</p>
                        <pre className="text-xs bg-muted p-2 rounded mt-2">
                          {JSON.stringify(operationResult, null, 2)}
                        </pre>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Suas Renovações</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadUserRenewals}
                      disabled={isLoadingRenewals}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingRenewals ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>
                  
                  {userRenewals.length > 0 ? (
                    <div className="space-y-2">
                      {userRenewals.map((renewal) => (
                        <Card key={renewal.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="font-medium">Renovação #{renewal.id}</p>
                              <p className="text-sm text-muted-foreground">
                                Usuário: {renewal.user_id} | Status: {renewal.status}
                              </p>
                              {renewal.thebest_packages && (
                                <p className="text-sm">
                                  Pacote: {renewal.thebest_packages.classificacao} - {renewal.thebest_packages.duracao}
                                </p>
                              )}
                            </div>
                            <Badge variant={renewal.status === 'active' ? 'default' : 'secondary'}>
                              {renewal.status}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhuma renovação encontrada.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="test" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Teste de Integração</h3>
                
                {!isConfigured ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Configure a integração primeiro para realizar testes.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <Button
                      onClick={handleTest}
                      disabled={isTesting}
                      className="w-full"
                    >
                      <TestTube className={`h-4 w-4 mr-2 ${isTesting ? 'animate-pulse' : ''}`} />
                      {isTesting ? 'Testando Conexão...' : 'Testar Conexão com The Best'}
                    </Button>
                    
                    {testResult && (
                      <Alert className={testResult.success ? 'border-green-500' : 'border-red-500'}>
                        {testResult.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <AlertDescription>
                          <div className="space-y-2">
                            <p>{testResult.message}</p>
                            {testResult.timestamp && (
                              <p className="text-xs text-muted-foreground">
                                Testado em: {testResult.timestamp}
                              </p>
                            )}
                            {testResult.data && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm font-medium">Detalhes da Resposta</summary>
                                <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                                  {JSON.stringify(testResult.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default TheBestConfig