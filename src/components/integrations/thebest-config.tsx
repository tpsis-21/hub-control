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
import { appToast } from '@/lib/app-toast'
import { validateIntegrationConfig } from '@/lib/local-validation'
import { ValidationFeedback, InlineValidation } from '@/components/ui/validation-feedback'
import { THEBEST_DEFAULT_TIMEOUT_MS } from '@/lib/integrations/thebest-constants'
import { PAINEL_BEST_API_DOCS_URL } from '@/config/thebest-api'

interface TheBestConfigForm {
  apiKey: string
  apiSecret: string
  timeout: number
}

interface TheBestPackage {
  id: string
  name?: string
  classificacao: string
  duracao: string
  telas: number
  creditos: number
  is_trial?: boolean
}

export function TheBestConfig() {
  const [config, setConfig] = useState<TheBestConfigForm>({
    apiKey: '',
    apiSecret: '',
    timeout: THEBEST_DEFAULT_TIMEOUT_MS,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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
    lineId: '',
    months: '1',
  })
  const [trialData, setTrialData] = useState({
    packageId: '',
    username: '',
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
      // Usar API segura para verificar autenticação
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const { user } = await response.json();
        if (user) {
          setCurrentUser(user);
          await loadUserConfig(user.id);
        } else {
          appToast.error('Usuário não autenticado');
        }
      } else {
        appToast.error('Erro ao verificar autenticação');
      }
    } catch (error) {
      console.error('Erro ao inicializar componente:', error);
      appToast.error('Erro ao carregar dados do usuário');
    }
  }

  const loadUserConfig = async (_userId: string) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/integrations/thebest/config', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setConfig({
            apiKey: result.data.api_key ? '••••••••' : '',
            apiSecret: '',
            timeout: THEBEST_DEFAULT_TIMEOUT_MS,
          });
          setIsConfigured(true);
        } else {
          setIsConfigured(false);
        }
      } else {
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSave = async () => {
    const apiKeyToSave = config.apiKey.startsWith('••••') ? '' : config.apiKey.trim();
    if (!apiKeyToSave) {
      appToast.error('Informe a chave da API do painel TheBest')
      return
    }

    if (!currentUser) {
      appToast.error('Usuário não autenticado')
      return
    }

    try {
      setIsLoading(true)
      
      const response = await fetch('/api/integrations/thebest/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            apiKey: apiKeyToSave,
            apiSecret: config.apiSecret.trim() || undefined,
            timeout: config.timeout,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar configuração');
      }

      const { success, message } = await response.json();
      
      if (success) {
        setIsConfigured(true)
        setConfig((prev) => ({ ...prev, apiKey: '••••••••' }))
        appToast.success(message || 'Configuração salva com sucesso!')
        await testConnection()
        await loadPackages()
      } else {
        throw new Error(message || 'Erro ao salvar configuração')
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      appToast.error('Erro ao salvar configuração')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = async () => {
    if (!config.apiKey.trim() || config.apiKey.startsWith('••••')) {
      appToast.error('Salve ou informe a chave da API antes de testar')
      return
    }

    if (!currentUser) {
      appToast.error('Usuário não autenticado')
      return
    }

    try {
      setIsTesting(true)
      setTestResult(null)
      
      // Fazer requisição de teste via proxy
      const response = await fetch('/api/proxy/thebest?action=test_connection', {
        method: 'GET',
        headers: {
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
        appToast.success('Teste de conexão realizado com sucesso!')
      } else {
        appToast.error('Falha no teste de conexão')
      }
    } catch (error) {
      console.error('Erro no teste:', error)
      setTestResult({
        success: false,
        message: 'Erro interno no teste de conexão',
        timestamp: new Date().toLocaleString('pt-BR')
      })
      appToast.error('Erro no teste de conexão')
    } finally {
      setIsTesting(false)
    }
  }

  // Função duplicada removida - usar loadPackages mais abaixo

  // Função duplicada removida - usar syncPackages mais abaixo

  // Função duplicada removida - usar createRenewal mais abaixo

  // Função duplicada removida - usar loadUserRenewals mais abaixo

  const loadConfig = async () => {
    if (!currentUser) return

    try {
      setIsLoading(true)
      
      // Usar API segura em vez de acesso direto ao banco
      const response = await fetch('/api/integrations/thebest/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar configuração');
      }

      const { data } = await response.json();

      if (data) {
        setConfig({
          apiKey: data.api_key ? '••••••••' : '',
          apiSecret: '',
          timeout: THEBEST_DEFAULT_TIMEOUT_MS,
        })
        setIsConfigured(true)
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
      appToast.error('Erro ao carregar configuração')
    } finally {
      setIsLoading(false)
    }
  }

  // Função duplicada removida - usar testConnection em vez disso

  const testConnection = async () => {
    const apiKeyForTest = config.apiKey.startsWith('••••') ? '' : config.apiKey.trim();
    try {
      setIsTesting(true)
      
      const response = await fetch('/api/integrations/thebest/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            apiKey: apiKeyForTest || undefined,
            apiSecret: config.apiSecret.trim() || undefined,
            timeout: config.timeout,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao testar conexão');
      }

      const { success, message } = await response.json();
      
      if (success) {
        setTestResult({ success: true, message: message || 'Conexão testada com sucesso!' })
        appToast.success('Conexão testada com sucesso!')
      } else {
        setTestResult({ success: false, message: message || 'Falha na conexão' })
        appToast.error('Falha na conexão')
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error)
      setTestResult({ success: false, message: 'Erro ao testar conexão' })
      appToast.error('Erro ao testar conexão')
    } finally {
      setIsTesting(false)
    }
  }

  const loadPackages = async () => {
    try {
      setIsLoadingPackages(true)
      
      const response = await fetch('/api/integrations/thebest/packages', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar pacotes');
      }

      const { data } = await response.json();
      setPackages(data || [])
    } catch (error) {
      console.error('Erro ao carregar pacotes:', error)
      appToast.error('Erro ao carregar pacotes')
    } finally {
      setIsLoadingPackages(false)
    }
  }

  const syncPackages = async () => {
    if (!isConfigured) {
      appToast.error('Configure a integração antes de sincronizar pacotes')
      return
    }

    try {
      setIsLoadingPackages(true)
      
      const response = await fetch('/api/integrations/thebest/packages?sync=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      })
      
      if (!response.ok) {
        throw new Error('Erro na sincronização')
      }
      
      const result = await response.json()
      appToast.success('Pacotes sincronizados com sucesso!')
      
      // Recarregar pacotes
      await loadPackages()
    } catch (error) {
      console.error('Erro ao sincronizar pacotes:', error)
      appToast.error('Erro ao sincronizar pacotes')
    } finally {
      setIsLoadingPackages(false)
    }
  }

  const createRenewal = async () => {
    if (!renewalData.lineId.trim()) {
      appToast.error('Informe o ID do cliente no painel (line_id)')
      return
    }

    try {
      setOperationLoading(true)
      
      const response = await fetch('/api/proxy/thebest?action=renew_line', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          line_id: renewalData.lineId.trim(),
          months: parseInt(renewalData.months, 10) || 1,
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro na criação da renovação')
      }
      
      setOperationResult(result)
      appToast.success('Renovação criada com sucesso!')
      
      // Recarregar renovações do usuário
      await loadUserRenewals()
    } catch (error) {
      console.error('Erro ao criar renovação:', error)
      appToast.error(error instanceof Error ? error.message : 'Erro ao criar renovação')
    } finally {
      setOperationLoading(false)
    }
  }

  const loadUserRenewals = async () => {
    if (!isConfigured) return
    
    try {
      setIsLoadingRenewals(true)
      
      // TODO: Implementar carregamento de renovações quando a API estiver disponível
      // const response = await fetch('/api/integrations/thebest/renewals', {
      //   method: 'GET',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      // });
      // 
      // if (response.ok) {
      //   const { data } = await response.json();
      //   setUserRenewals(data || []);
      // }
      
      setUserRenewals([])
    } catch (error) {
      console.error('Erro ao carregar renovações:', error)
      appToast.error('Erro ao carregar renovações')
    } finally {
      setIsLoadingRenewals(false)
    }
  }

  const removeConfig = async () => {
    if (!confirm('Tem certeza que deseja remover esta configuração?')) {
      return
    }

    try {
      const response = await fetch('/api/integrations/thebest/config', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao remover configuração');
      }

      // Resetar estado
      setConfig({
        apiKey: '',
        apiSecret: '',
        timeout: THEBEST_DEFAULT_TIMEOUT_MS,
      })
      setIsConfigured(false)
      setTestResult(null)
      setPackages([])
      
      appToast.success('Configuração removida com sucesso!')
    } catch (error) {
      console.error('Erro ao remover configuração:', error)
      appToast.error('Erro ao remover configuração')
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
            Integração com o Painel Best (API REST). Autenticação via header{' '}
            <code className="text-xs">Api-Key</code>.{' '}
            <a
              href={PAINEL_BEST_API_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Documentação da API
            </a>
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
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm text-muted-foreground">
                    A URL da API fica apenas no servidor (<code className="text-xs">THEBEST_API_BASE_URL</code>, padrão{' '}
                    <code className="text-xs">https://api.painel.best</code>). Gere a chave em Autenticação → Chaves de API no painel.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">Api-Key *</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Chave de API do revendedor"
                    value={config.apiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiSecret">Segredo adicional (opcional)</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    placeholder="Somente se o painel exigir"
                    value={config.apiSecret}
                    onChange={(e) => setConfig(prev => ({ ...prev, apiSecret: e.target.value }))}
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
                    disabled={isTesting || !config.apiKey}
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
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pacotes</strong> (<code className="text-xs">GET /packages/</code>) servem para sync, mapeamento de planos e criar teste.
                  <strong> Renovação</strong> na API não usa package — apenas <code className="text-xs">line_id</code> + <code className="text-xs">months</code> na aba Renovações.
                </AlertDescription>
              </Alert>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Pacotes do Painel Best</h3>
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
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-medium text-sm">{pkg.name ?? `Pacote #${pkg.id}`}</p>
                          {pkg.is_trial && (
                            <Badge variant="secondary">Teste</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline">{pkg.classificacao}</Badge>
                          <Badge variant="outline">{pkg.duracao}</Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm"><strong>ID painel:</strong> {pkg.id}</p>
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
                
                <p className="text-sm text-muted-foreground">
                  Renovação oficial: <code className="text-xs">POST /lines/&#123;id&#125;/renew/</code> com{' '}
                  <code className="text-xs">months</code> (meses). O ID é o cliente/line no Painel Best, não o usuário do Hub.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lineId">ID do cliente no painel (line_id) *</Label>
                    <Input
                      id="lineId"
                      type="number"
                      min={1}
                      placeholder="Ex.: 12345"
                      value={renewalData.lineId}
                      onChange={(e) => setRenewalData(prev => ({ ...prev, lineId: e.target.value }))}
                      disabled={!isConfigured}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="months">Meses *</Label>
                    <select
                      id="months"
                      className="w-full p-2 border rounded-md"
                      value={renewalData.months}
                      onChange={(e) => setRenewalData(prev => ({ ...prev, months: e.target.value }))}
                      disabled={!isConfigured}
                    >
                      <option value="1">1 mês</option>
                      <option value="3">3 meses</option>
                      <option value="6">6 meses</option>
                      <option value="12">12 meses</option>
                    </select>
                  </div>
                </div>
                
                <Button
                  onClick={createRenewal}
                  disabled={!isConfigured || operationLoading || !renewalData.lineId.trim()}
                >
                  <Package className={`h-4 w-4 mr-2 ${operationLoading ? 'animate-spin' : ''}`} />
                  {operationLoading ? 'Renovando...' : 'Renovar cliente'}
                </Button>

                <Separator />

                <h4 className="text-md font-medium">Criar cliente teste</h4>
                <p className="text-sm text-muted-foreground">
                  <code className="text-xs">POST /lines/create-trial/</code> — exige pacote de teste (<code className="text-xs">package_id</code>).
                  Usuário e senha são gerados pelo painel se omitidos.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trialPackage">Pacote teste *</Label>
                    <select
                      id="trialPackage"
                      className="w-full p-2 border rounded-md"
                      value={trialData.packageId}
                      onChange={(e) => setTrialData(prev => ({ ...prev, packageId: e.target.value }))}
                      disabled={!isConfigured}
                    >
                      <option value="">Selecione (is_trial)</option>
                      {packages
                        .filter((p) => p.is_trial)
                        .map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name ?? pkg.id} — {pkg.creditos} créditos
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trialUsername">Usuário (opcional)</Label>
                    <Input
                      id="trialUsername"
                      placeholder="8–20 caracteres; senha gerada se vazio"
                      value={trialData.username}
                      onChange={(e) => setTrialData(prev => ({ ...prev, username: e.target.value }))}
                      disabled={!isConfigured}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  disabled={!isConfigured || operationLoading || !trialData.packageId}
                  onClick={async () => {
                    try {
                      setOperationLoading(true)
                      const response = await fetch('/api/proxy/thebest?action=create_trial', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          package_id: parseInt(trialData.packageId, 10),
                          username: trialData.username.trim() || undefined,
                        }),
                      })
                      const result = await response.json()
                      if (!response.ok) throw new Error(result.error || 'Erro ao criar teste')
                      setOperationResult(result)
                      appToast.success('Cliente teste criado no painel')
                    } catch (error) {
                      appToast.error(error instanceof Error ? error.message : 'Erro ao criar teste')
                    } finally {
                      setOperationLoading(false)
                    }
                  }}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Criar teste
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

export default TheBestConfig;
