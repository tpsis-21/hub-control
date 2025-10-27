'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Settings, 
  CreditCard, 
  Webhook,
  Eye,
  EyeOff,
  TestTube,
  Save,
  Trash2,
  AlertTriangle,
  Info,
  BarChart3
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface BPIXConfig {
  baseUrl: string
  token: string
  timeout?: number
}

interface BPIXStatus {
  configured: boolean
  user_id: string
  has_config: boolean
}

interface BPIXTestResult {
  success: boolean
  message: string
  data?: any
  error?: string
}

export function BPIXConfig() {
  const [config, setConfig] = useState<BPIXConfig>({
    baseUrl: '',
    token: '',
    timeout: 30000
  })
  const [status, setStatus] = useState<BPIXStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [testResult, setTestResult] = useState<BPIXTestResult | null>(null)
  const [initialLoad, setInitialLoad] = useState(true)
  
  const { toast } = useToast()

  // Carrega o status da configuração
  const loadStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bpix/config')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data)
      } else {
        console.error('Erro ao carregar status:', data.message)
      }
    } catch (error) {
      console.error('Erro ao carregar status BPIX:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar status da configuração BPIX',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  // Testa a conexão
  const testConnection = async () => {
    try {
      setTesting(true)
      setTestResult(null)
      
      const response = await fetch('/api/bpix/config?action=test')
      const data = await response.json()
      
      setTestResult(data)
      
      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Conexão com BPIX testada com sucesso!',
        })
      } else {
        toast({
          title: 'Erro no teste',
          description: data.message || 'Falha ao testar conexão',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error)
      setTestResult({
        success: false,
        message: 'Erro interno ao testar conexão',
        error: 'INTERNAL_ERROR'
      })
      toast({
        title: 'Erro',
        description: 'Erro interno ao testar conexão',
        variant: 'destructive'
      })
    } finally {
      setTesting(false)
    }
  }

  // Salva a configuração
  const saveConfig = async () => {
    try {
      setSaving(true)
      
      // Validações básicas
      if (!config.baseUrl.trim()) {
        toast({
          title: 'Erro de validação',
          description: 'URL base é obrigatória',
          variant: 'destructive'
        })
        return
      }
      
      if (!config.token.trim()) {
        toast({
          title: 'Erro de validação',
          description: 'Token de autenticação é obrigatório',
          variant: 'destructive'
        })
        return
      }

      // Validação da URL
      try {
        new URL(config.baseUrl)
      } catch {
        toast({
          title: 'Erro de validação',
          description: 'URL base deve ser uma URL válida',
          variant: 'destructive'
        })
        return
      }

      const method = status?.configured ? 'PUT' : 'POST'
      const response = await fetch('/api/bpix/config', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Configuração BPIX salva com sucesso!',
        })
        await loadStatus() // Recarrega o status
        setTestResult(null) // Limpa resultado de teste anterior
      } else {
        toast({
          title: 'Erro ao salvar',
          description: data.message || 'Erro desconhecido',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      toast({
        title: 'Erro',
        description: 'Erro interno ao salvar configuração',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Remove a configuração
  const deleteConfig = async () => {
    if (!confirm('Tem certeza que deseja remover a configuração BPIX? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      setDeleting(true)
      
      const response = await fetch('/api/bpix/config', {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Configuração BPIX removida com sucesso!',
        })
        
        // Limpa o estado
        setConfig({
          baseUrl: '',
          token: '',
          timeout: 30000
        })
        setTestResult(null)
        await loadStatus()
      } else {
        toast({
          title: 'Erro ao remover',
          description: data.message || 'Erro desconhecido',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Erro ao remover configuração:', error)
      toast({
        title: 'Erro',
        description: 'Erro interno ao remover configuração',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

  // Carrega status na inicialização
  useEffect(() => {
    loadStatus()
  }, [])

  if (initialLoad) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando configuração BPIX...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>BPIX - Pagamentos PIX</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {status?.configured && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/integracoes/bpix/dashboard">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
              )}
              <Badge variant={status?.configured ? 'default' : 'secondary'}>
                {status?.configured ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Configurado</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Não Configurado</>
                )}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Configure a integração com BPIX para processar pagamentos PIX automaticamente
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="h-4 w-4 mr-2" />
            Teste
          </TabsTrigger>
          <TabsTrigger value="webhook">
            <Webhook className="h-4 w-4 mr-2" />
            Webhook
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuração da API BPIX</CardTitle>
              <CardDescription>
                Configure os dados de acesso à API BPIX
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">URL Base da API *</Label>
                  <Input
                    id="baseUrl"
                    type="url"
                    placeholder="https://api.bpix.com.br"
                    value={config.baseUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                    disabled={loading || saving}
                  />
                  <p className="text-sm text-muted-foreground">
                    URL base da API BPIX (sem barra final)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token">Token de Autenticação *</Label>
                  <div className="relative">
                    <Input
                      id="token"
                      type={showToken ? 'text' : 'password'}
                      placeholder="Seu token de acesso BPIX"
                      value={config.token}
                      onChange={(e) => setConfig(prev => ({ ...prev, token: e.target.value }))}
                      disabled={loading || saving}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Token Bearer fornecido pela BPIX
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="5000"
                    max="120000"
                    step="1000"
                    placeholder="30000"
                    value={config.timeout}
                    onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                    disabled={loading || saving}
                  />
                  <p className="text-sm text-muted-foreground">
                    Tempo limite para requisições (5-120 segundos)
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <Button
                    onClick={saveConfig}
                    disabled={loading || saving || !config.baseUrl || !config.token}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {status?.configured ? 'Atualizar' : 'Salvar'}
                  </Button>
                </div>

                {status?.configured && (
                  <Button
                    variant="destructive"
                    onClick={deleteConfig}
                    disabled={loading || deleting}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Remover
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Teste de Conexão</CardTitle>
              <CardDescription>
                Teste a conectividade com a API BPIX
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!status?.configured ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Configure a integração BPIX primeiro antes de testar a conexão.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex space-x-2">
                    <Button
                      onClick={testConnection}
                      disabled={testing || !status?.configured}
                    >
                      {testing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Testar Conexão
                    </Button>
                  </div>

                  {testResult && (
                    <Alert variant={testResult.success ? 'default' : 'destructive'}>
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>
                        <strong>{testResult.success ? 'Sucesso:' : 'Erro:'}</strong> {testResult.message}
                        {testResult.error && (
                          <div className="mt-1 text-sm opacity-80">
                            Código: {testResult.error}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Tab */}
        <TabsContent value="webhook">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Webhook</CardTitle>
              <CardDescription>
                Configure o webhook para receber notificações de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>URL do Webhook:</strong>
                  <code className="ml-2 px-2 py-1 bg-muted rounded text-sm">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/bpix/webhook` : '/api/bpix/webhook'}
                  </code>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Eventos Suportados:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• <code>payment.created</code> - Pagamento criado</li>
                    <li>• <code>payment.paid</code> - Pagamento confirmado</li>
                    <li>• <code>payment.expired</code> - Pagamento expirado</li>
                    <li>• <code>payment.cancelled</code> - Pagamento cancelado</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Configuração no BPIX:</h4>
                  <ol className="space-y-1 text-sm text-muted-foreground">
                    <li>1. Acesse o painel da BPIX</li>
                    <li>2. Vá em Configurações → Webhooks</li>
                    <li>3. Adicione a URL acima</li>
                    <li>4. Selecione os eventos desejados</li>
                    <li>5. Configure o método como POST</li>
                    <li>6. Salve as configurações</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default BPIXConfig;
