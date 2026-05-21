'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { appToast } from '@/lib/app-toast'
import {
  NATV_DEFAULT_TIMEOUT_MS,
  NATV_DEFAULT_TEST_MINUTES,
  NATV_API_ENDPOINTS,
} from '@/lib/integrations/natv-public'
import {
  Settings,
  TestTube,
  Users,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Zap,
  Activity,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react'
import { natvService } from '@/services/natv.service'
import { useAuth } from '@/hooks/useAuth'

const ENDPOINT_ROWS = [
  { title: 'Criar Usuário de Teste', path: `POST ${NATV_API_ENDPOINTS.createUser}`, method: 'POST' as const },
  { title: 'Ativação/Renovação', path: `POST ${NATV_API_ENDPOINTS.activation}`, method: 'POST' as const },
  { title: 'Buscar Usuários', path: `POST ${NATV_API_ENDPOINTS.search}`, method: 'POST' as const },
  { title: 'Teste de Conexão', path: `GET ${NATV_API_ENDPOINTS.test}`, method: 'GET' as const },
]

interface OperationData {
  createUser: {
    username: string
    minutes: number
  }
  activation: {
    username: string
    userId: string
    months: number
  }
  searchUsers: {
    username: string
    userId: string
  }
}

interface OperationResult {
  type: string
  data?: any
  error?: string
}

export function NATVConfig() {
  const { user } = useAuth()
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [operationLoading, setOperationLoading] = useState(false)
  const [operationResult, setOperationResult] = useState<OperationResult | null>(null)
  const [operationData, setOperationData] = useState<OperationData>({
    createUser: {
      username: '',
      minutes: NATV_DEFAULT_TEST_MINUTES,
    },
    activation: {
      username: '',
      userId: '',
      months: 1,
    },
    searchUsers: {
      username: '',
      userId: '',
    },
  })

  useEffect(() => {
    if (user?.id) {
      loadConfig()
    }
  }, [user?.id])

  const loadConfig = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/natv/config')
      const json = await response.json()
      if (response.ok && json.data) {
        setIsConfigured(true)
      } else {
        setIsConfigured(false)
      }
    } catch (error) {
      console.error('Erro ao carregar configuração NATV:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!token.trim()) {
      appToast.error('Token é obrigatório')
      return
    }

    if (!user?.id) return

    setIsLoading(true)
    try {
      await natvService.saveUserConfig(user.id, { token: token.trim() })
      setIsConfigured(true)
      appToast.success('Configuração salva com sucesso!')
      
      // Testar conexão
      const testResult = await natvService.testUserConnection(user?.id || '')
      if (testResult.success) {
        appToast.success('Conexão testada com sucesso!')
      } else {
        appToast.error('Configuração salva, mas falha no teste de conexão')
      }
    } catch (error) {
      appToast.error('Erro ao salvar configuração')
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
        appToast.success('Conexão testada com sucesso!')
        setOperationResult({ type: 'test', data: result })
      } else {
        appToast.error('Falha no teste de conexão')
        setOperationResult({ type: 'test', error: result.message })
      }
    } catch (error) {
      appToast.error('Erro ao testar conexão')
      setOperationResult({ type: 'test', error: error instanceof Error ? error.message : 'Erro desconhecido' })
    } finally {
      setIsLoading(false)
    }
  }

  const operationSuccess =
    operationResult?.data?.success ?? (operationResult && !operationResult.error)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração NATV
              </CardTitle>
              <CardDescription className="mt-1.5">
                Informe o token do revendedor fornecido pela NATV.
              </CardDescription>
            </div>
            {isConfigured && (
              <Badge variant="secondary" className="w-fit shrink-0">
                <CheckCircle className="mr-1 h-3 w-3" />
                Configurado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="operations">Operações</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="limits">Limites</TabsTrigger>
          </TabsList>
          
          <TabsContent value="config" className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="natv-token">Token do revendedor *</Label>
              <div className="flex gap-2">
                <Input
                  id="natv-token"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={isConfigured ? 'Informe um novo token para atualizar' : 'Cole o token da API NATV'}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowToken((v) => !v)}
                  aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                O token não é exibido após salvar. Para alterar, informe um novo valor e salve novamente.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={saveConfig} disabled={isLoading} className="sm:flex-1">
                {isLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar configuração
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
                Testar conexão
              </Button>
            </div>

            {isConfigured && (
              <Alert className="border-emerald-500/30 bg-emerald-500/10">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <AlertDescription>
                  Configuração ativa. Use a aba Operações para testar criação, ativação e busca.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="operations" className="mt-6 space-y-8">
              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Users className="h-4 w-4" />
                  Criar usuário de teste
                </h3>
                <p className="text-sm text-muted-foreground">
                  A senha é gerada pela NATV. Informe a duração em minutos; o usuário é opcional.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="create-username">Usuário (opcional)</Label>
                    <Input
                      id="create-username"
                      value={operationData.createUser.username}
                      onChange={(e) =>
                        setOperationData((prev) => ({
                          ...prev,
                          createUser: { ...prev.createUser, username: e.target.value },
                        }))
                      }
                      placeholder="Deixe vazio para gerar automaticamente"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-minutes">Duração do teste (minutos) *</Label>
                    <Input
                      id="create-minutes"
                      type="number"
                      min={1}
                      max={10080}
                      value={operationData.createUser.minutes}
                      onChange={(e) =>
                        setOperationData((prev) => ({
                          ...prev,
                          createUser: {
                            ...prev.createUser,
                            minutes: parseInt(e.target.value, 10) || NATV_DEFAULT_TEST_MINUTES,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    setOperationLoading(true)
                    try {
                      const payload = {
                        minutes: operationData.createUser.minutes,
                        ...(operationData.createUser.username.trim()
                          ? { username: operationData.createUser.username.trim() }
                          : {}),
                      }
                      const result = await natvService.createUserWithConfig(
                        user?.id || '',
                        payload
                      )
                      setOperationResult({ type: 'createUser', data: result })
                      if (result.success) {
                        appToast.success('Teste criado. Credenciais retornadas pela NATV.')
                      } else {
                        appToast.error(result.message || 'Erro ao criar teste')
                      }
                    } catch (error) {
                      appToast.error('Erro ao criar teste')
                      setOperationResult({
                        type: 'createUser',
                        error: error instanceof Error ? error.message : 'Erro desconhecido',
                      })
                    } finally {
                      setOperationLoading(false)
                    }
                  }}
                  disabled={
                    operationLoading ||
                    !isConfigured ||
                    operationData.createUser.minutes < 1
                  }
                  className="w-full"
                >
                    {operationLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="mr-2 h-4 w-4" />
                    )}
                    Criar usuário
                  </Button>
              </section>

              <Separator />

              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <RefreshCw className="h-4 w-4" />
                  Ativação / renovação
                </h3>
                <p className="text-sm text-muted-foreground">
                  Informe o usuário ou o ID no painel NATV e a quantidade de meses.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="activation-username">Usuário</Label>
                    <Input
                      id="activation-username"
                      value={operationData.activation.username}
                      onChange={(e) =>
                        setOperationData((prev) => ({
                          ...prev,
                          activation: { ...prev.activation, username: e.target.value },
                        }))
                      }
                      placeholder="usuario"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="activation-userid">ID no painel</Label>
                    <Input
                      id="activation-userid"
                      type="number"
                      value={operationData.activation.userId}
                      onChange={(e) =>
                        setOperationData((prev) => ({
                          ...prev,
                          activation: { ...prev.activation, userId: e.target.value },
                        }))
                      }
                      placeholder="4240216"
                    />
                  </div>
                  <div>
                    <Label htmlFor="activation-months">Meses *</Label>
                    <Input
                      id="activation-months"
                      type="number"
                      min={1}
                      max={24}
                      value={operationData.activation.months}
                      onChange={(e) =>
                        setOperationData((prev) => ({
                          ...prev,
                          activation: {
                            ...prev.activation,
                            months: parseInt(e.target.value, 10) || 1,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    setOperationLoading(true)
                    try {
                      const payload = {
                        months: operationData.activation.months,
                        ...(operationData.activation.username.trim()
                          ? { username: operationData.activation.username.trim() }
                          : {}),
                        ...(operationData.activation.userId.trim()
                          ? { user_id: parseInt(operationData.activation.userId, 10) }
                          : {}),
                      }
                      const result = await natvService.activateUserWithConfig(
                        user?.id || '',
                        payload
                      )
                      setOperationResult({ type: 'activation', data: result })
                      if (result.success) {
                        appToast.success('Ativação/renovação concluída')
                      } else {
                        appToast.error(result.message || 'Erro na ativação')
                      }
                    } catch (error) {
                      appToast.error('Erro na ativação')
                      setOperationResult({
                        type: 'activation',
                        error: error instanceof Error ? error.message : 'Erro desconhecido',
                      })
                    } finally {
                      setOperationLoading(false)
                    }
                  }}
                  disabled={
                    operationLoading ||
                    !isConfigured ||
                    (!operationData.activation.username.trim() &&
                      !operationData.activation.userId.trim()) ||
                    operationData.activation.months < 1
                  }
                  className="w-full"
                >
                    {operationLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Ativar / renovar
                  </Button>
              </section>

              <Separator />

              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Search className="h-4 w-4" />
                  Buscar usuários
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="search-username">Usuário</Label>
                    <Input
                      id="search-username"
                      value={operationData.searchUsers.username}
                      onChange={(e) =>
                        setOperationData((prev) => ({
                          ...prev,
                          searchUsers: { ...prev.searchUsers, username: e.target.value },
                        }))
                      }
                      placeholder="usuario"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="search-userid">ID no painel (opcional)</Label>
                    <Input
                      id="search-userid"
                      type="number"
                      value={operationData.searchUsers.userId}
                      onChange={(e) =>
                        setOperationData((prev) => ({
                          ...prev,
                          searchUsers: { ...prev.searchUsers, userId: e.target.value },
                        }))
                      }
                      placeholder="4240216"
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    setOperationLoading(true)
                    try {
                      const payload = {
                        ...(operationData.searchUsers.username.trim()
                          ? { username: operationData.searchUsers.username.trim() }
                          : {}),
                        ...(operationData.searchUsers.userId.trim()
                          ? { user_id: parseInt(operationData.searchUsers.userId, 10) }
                          : {}),
                      }
                      const result = await natvService.searchUsersWithConfig(
                        user?.id || '',
                        payload
                      )
                      setOperationResult({ type: 'searchUsers', data: result })
                      if (result.success) {
                        const count = Array.isArray(result.data) ? result.data.length : 0
                        appToast.success(`Encontrados ${count} usuário(s)`)
                      } else {
                        appToast.error(result.message || 'Erro na busca')
                      }
                    } catch (error) {
                      appToast.error('Erro na busca')
                      setOperationResult({
                        type: 'searchUsers',
                        error: error instanceof Error ? error.message : 'Erro desconhecido',
                      })
                    } finally {
                      setOperationLoading(false)
                    }
                  }}
                  disabled={
                    operationLoading ||
                    !isConfigured ||
                    (!operationData.searchUsers.username.trim() &&
                      !operationData.searchUsers.userId.trim())
                  }
                  className="w-full"
                >
                    {operationLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Buscar usuários
                  </Button>
              </section>

              {operationResult && (
                <Alert
                  className={
                    operationSuccess
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-destructive/30 bg-destructive/10'
                  }
                >
                  {operationSuccess ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">
                        Resultado da operação: {operationResult.type}
                      </p>
                      <p className="text-sm">
                        {operationResult.data?.message || operationResult.error || 'Operação concluída'}
                      </p>
                      {operationResult.type === 'createUser' &&
                        operationResult.data?.success &&
                        operationResult.data?.data && (
                          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                            <p>
                              <span className="font-medium">Usuário:</span>{' '}
                              {operationResult.data.data.username ?? '—'}
                            </p>
                            <p>
                              <span className="font-medium">Senha (NATV):</span>{' '}
                              {operationResult.data.data.password ?? '—'}
                            </p>
                            {operationResult.data.data.id != null && (
                              <p>
                                <span className="font-medium">ID:</span>{' '}
                                {operationResult.data.data.id}
                              </p>
                            )}
                          </div>
                        )}
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
          </TabsContent>

          <TabsContent value="endpoints" className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Rotas disponíveis na integração NATV (acesso via Hub Control).
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              {ENDPOINT_ROWS.map((row, index) => (
                <div
                  key={row.path}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${
                    index > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{row.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{row.path}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                    {row.method}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="limits" className="mt-6 space-y-4">
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
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <h5 className="font-medium">Rate limiting</h5>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>150ms entre requisições</li>
                    <li>5 criações por 30s</li>
                    <li>50 criações por dia</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h5 className="font-medium">Performance</h5>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Timeout: {NATV_DEFAULT_TIMEOUT_MS / 1000}s</li>
                    <li>Retry automático</li>
                    <li>Proxy autenticado no Hub</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </div>
  )
}

export default NATVConfig



