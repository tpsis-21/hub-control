'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Activity,
  Calendar,
  Loader2
} from 'lucide-react'
import { useGates2b } from '@/hooks/use-gates2b'
import { formatCurrency } from '@/lib/utils'

interface Gates2bMetricsProps {
  className?: string
  showRefresh?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export function Gates2bMetrics({ 
  className = '', 
  showRefresh = true, 
  autoRefresh = false, 
  refreshInterval = 30000 
}: Gates2bMetricsProps) {
  const { 
    config, 
    stats, 
    payments, 
    loading, 
    error, 
    loadStats, 
    listPayments, 
    testConnection,
    clearError 
  } = useGates2b()
  
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')
  const [testingConnection, setTestingConnection] = useState(false)

  // Testa conexão
  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const success = await testConnection()
      setConnectionStatus(success ? 'connected' : 'disconnected')
    } catch (err) {
      setConnectionStatus('disconnected')
    } finally {
      setTestingConnection(false)
    }
  }

  // Atualiza dados
  const handleRefresh = async () => {
    try {
      await Promise.all([
        loadStats(),
        listPayments({ limit: 10 })
      ])
      setLastUpdate(new Date())
      clearError()
    } catch (err) {
      console.error('Erro ao atualizar métricas Gates2b:', err)
    }
  }

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !config) return

    const interval = setInterval(() => {
      handleRefresh()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, config])

  // Carrega dados iniciais
  useEffect(() => {
    if (config) {
      handleRefresh()
      handleTestConnection()
    }
  }, [config])

  // Calcula métricas derivadas
  const recentPayments = payments.slice(0, 5)
  const todayPayments = payments.filter(p => {
    const today = new Date().toDateString()
    const paymentDate = new Date(p.created_at).toDateString()
    return today === paymentDate
  })
  
  const todayAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0)
  const successRate = stats ? 
    stats.total_payments > 0 ? (stats.paid_payments / stats.total_payments) * 100 : 0 
    : 0

  if (!config) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Métricas Gates2b</span>
          </CardTitle>
          <CardDescription>
            Configure a integração Gates2b para visualizar métricas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              integração Gates2b não configurada
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Status Gates2b</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'disconnected' ? 'destructive' : 'secondary'}>
                {connectionStatus === 'connected' && <CheckCircle className="h-3 w-3 mr-1" />}
                {connectionStatus === 'disconnected' && <XCircle className="h-3 w-3 mr-1" />}
                {connectionStatus === 'unknown' && <AlertTriangle className="h-3 w-3 mr-1" />}
                {connectionStatus === 'connected' ? 'Conectado' : connectionStatus === 'disconnected' ? 'Desconectado' : 'Desconhecido'}
              </Badge>
              {showRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          {lastUpdate && (
            <CardDescription>
              Última atualização: {lastUpdate.toLocaleString('pt-BR')}
            </CardDescription>
          )}
        </CardHeader>
        
        {error && (
          <CardContent>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">Erro:</span>
              </div>
              <p className="text-sm text-destructive mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="mt-2"
              >
                Limpar Erro
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pagamentos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.total_payments || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Todos os tempos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(stats?.total_amount || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                todayPayments.length
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(todayAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `${successRate.toFixed(1)}%`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Pagamentos confirmados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status dos Pagamentos</CardTitle>
            <CardDescription>
              Distribuição por status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm">Pagos</span>
              </div>
              <span className="text-sm font-medium">
                {loading ? '...' : stats?.paid_payments || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-sm">Pendentes</span>
              </div>
              <span className="text-sm font-medium">
                {loading ? '...' : stats?.pending_payments || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm">Expirados</span>
              </div>
              <span className="text-sm font-medium">
                {loading ? '...' : payments?.filter(p => p.status === 'expired').length || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full" />
                <span className="text-sm">Cancelados</span>
              </div>
              <span className="text-sm font-medium">
                {loading ? '...' : payments?.filter(p => p.status === 'cancelled').length || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pagamentos Recentes</CardTitle>
            <CardDescription>
              Últimas transações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recentPayments.length > 0 ? (
              <div className="space-y-3">
                {recentPayments.map((payment, index) => (
                  <div key={payment.id}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.description || 'Sem descrição'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={
                            payment.status === 'paid' ? 'default' :
                            payment.status === 'pending' ? 'secondary' :
                            payment.status === 'expired' ? 'destructive' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {payment.status === 'paid' ? 'Pago' :
                           payment.status === 'pending' ? 'Pendente' :
                           payment.status === 'expired' ? 'Expirado' :
                           'Cancelado'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {index < recentPayments.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum pagamento encontrado
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connection Test */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Teste de Conectividade</CardTitle>
          <CardDescription>
            Verifique a conexão com a API Gates2b
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Status da Conexão: 
                <span className={`ml-2 ${
                  connectionStatus === 'connected' ? 'text-green-600' :
                  connectionStatus === 'disconnected' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {connectionStatus === 'connected' ? 'Conectado' :
                   connectionStatus === 'disconnected' ? 'Desconectado' :
                   'Desconhecido'}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Última verificação: {lastUpdate ? lastUpdate.toLocaleTimeString('pt-BR') : 'Nunca'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Activity className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Gates2bMetrics;
