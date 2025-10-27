'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Server,
  Calendar,
  Bell,
  Settings,
  Download,
  Filter
} from 'lucide-react';
import { 
  validateMonitoringConfig, 
  validateMonitoringBusinessRules, 
  validateCompleteConfig,
  monitoringConfigSchema,
  type MonitoringConfig 
} from '@/lib/validations/period-config';

// Tipos para o dashboard de monitoramento
interface CreditStatus {
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  usage_percentage: number;
  last_updated: string;
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

interface CreditAlert {
  id: string;
  type: 'low_credits' | 'high_usage' | 'renewal_due' | 'payment_failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  threshold_value: number;
  current_value: number;
  created_at: string;
  resolved: boolean;
  resolved_at?: string;
  user_id?: string;
  server_id?: string;
  plan_id?: string;
}

interface CreditHistory {
  id: string;
  user_id: string;
  user_name: string;
  action: 'purchase' | 'usage' | 'refund' | 'bonus' | 'expiry';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
  server_id?: string;
  plan_id?: string;
}

interface UsageMetrics {
  daily_usage: { date: string; credits: number }[];
  top_users: { user_id: string; user_name: string; credits_used: number }[];
  top_servers: { server_id: string; server_name: string; credits_used: number }[];
  plan_usage: { plan_id: string; plan_name: string; credits_used: number; user_count: number }[];
}

// MonitoringConfig é importado de @/lib/validations/period-config

const defaultConfig: MonitoringConfig = {
  auto_refresh: false, // Desabilitado por padrão para evitar requisições desnecessárias
  refresh_interval: 300, // 5 minutos quando habilitado (mínimo 60 segundos)
  alert_thresholds: {
    low_credits: 20,
    high_usage: 80,
    critical_usage: 95
  },
  notification_settings: {
    email_alerts: true,
    webhook_alerts: false,
    dashboard_alerts: true
  }
};

export function CreditMonitoringDashboard() {
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null);
  const [alerts, setAlerts] = useState<CreditAlert[]>([]);
  const [history, setHistory] = useState<CreditHistory[]>([]);
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [config, setConfig] = useState<MonitoringConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [historyFilter, setHistoryFilter] = useState({
    action: 'all',
    user: '',
    dateRange: '7d'
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadCreditStatus(),
        loadAlerts(),
        loadHistory(),
        loadMetrics()
      ]);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar dados',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Carregamento inicial apenas
  useEffect(() => {
    loadDashboardData();
  }, []); // Remove dependências para evitar recarregamentos desnecessários

  // Auto-refresh effect (apenas quando explicitamente habilitado)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (config.auto_refresh && config.refresh_interval >= 60) { // Mínimo de 1 minuto
      interval = setInterval(() => {
        refreshData();
      }, config.refresh_interval * 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [config.auto_refresh, config.refresh_interval, refreshData]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCreditStatus(),
        loadAlerts(),
        loadHistory(),
        loadMetrics(),
        loadConfig()
      ]);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do dashboard',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCreditStatus = async () => {
    const response = await fetch('/api/admin/credit-monitoring?type=status');
    if (!response.ok) throw new Error('Erro ao carregar status de créditos');
    const data = await response.json();
    setCreditStatus(data.status);
  };

  const loadAlerts = async () => {
    const response = await fetch('/api/admin/credit-monitoring?type=alerts');
    if (!response.ok) throw new Error('Erro ao carregar alertas');
    const data = await response.json();
    setAlerts(data.alerts);
  };

  const loadHistory = async () => {
    const params = new URLSearchParams({
      type: 'history',
      ...historyFilter
    });
    const response = await fetch(`/api/admin/credit-monitoring?${params}`);
    if (!response.ok) throw new Error('Erro ao carregar histórico');
    const data = await response.json();
    setHistory(data.history);
  };

  const loadMetrics = async () => {
    const response = await fetch('/api/admin/credit-monitoring?type=metrics');
    if (!response.ok) throw new Error('Erro ao carregar métricas');
    const data = await response.json();
    setMetrics(data.metrics);
  };

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/credit-monitoring?type=config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      }
    } catch (error) {
      // Usar configuração padrão se não conseguir carregar
    }
  };

  const runManualCheck = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/credit-monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'manual_check' })
      });

      if (!response.ok) {
        throw new Error('Erro ao executar verificação manual');
      }

      const data = await response.json();
      toast({
        title: 'Verificação concluída',
        description: data.message
      });

      await refreshData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/admin/credit-monitoring', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ alert_id: alertId })
      });

      if (!response.ok) {
        throw new Error('Erro ao resolver alerta');
      }

      toast({
        title: 'Alerta resolvido',
        description: 'Alerta marcado como resolvido'
      });

      await loadAlerts();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const updateConfig = async (newConfig: MonitoringConfig) => {
    try {
      // Validação usando Zod schema
      const schemaValidation = validateCompleteConfig(
        newConfig, 
        monitoringConfigSchema, 
        validateMonitoringBusinessRules
      );
      
      if (!schemaValidation.success) {
        setValidationErrors(schemaValidation.errors);
        toast({
          title: 'Erro de validação',
          description: `${schemaValidation.errors.length} erro(s) encontrado(s)`,
          variant: 'destructive'
        });
        return;
      }
      
      setValidationErrors([]);
      
      const response = await fetch('/api/admin/credit-monitoring', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: newConfig })
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar configuração');
      }

      setConfig(newConfig);
      toast({
        title: 'Configuração atualizada',
        description: 'Configurações de monitoramento atualizadas'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const exportData = async (type: 'alerts' | 'history' | 'metrics') => {
    try {
      const response = await fetch(`/api/admin/credit-monitoring/export?type=${type}`);
      if (!response.ok) throw new Error('Erro ao exportar dados');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credit-monitoring-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Exportação concluída',
        description: `Dados de ${type} exportados com sucesso`
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'purchase': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'usage': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'refund': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'bonus': return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case 'expiry': return <TrendingDown className="h-4 w-4 text-gray-500" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando dashboard...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Monitoramento de Créditos</h2>
          <p className="text-muted-foreground">
            Acompanhe o uso de créditos, alertas e métricas em tempo real
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={refreshData} 
            disabled={refreshing}
            size="sm"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={runManualCheck}
            disabled={refreshing}
            size="sm"
          >
            Verificação Manual
          </Button>
        </div>
      </div>

      {/* Cards de status */}
      {creditStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Créditos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creditStatus.total_credits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Última atualização: {new Date(creditStatus.last_updated).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos Usados</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creditStatus.used_credits.toLocaleString()}</div>
              <div className="flex items-center space-x-1">
                {creditStatus.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-red-500" />
                ) : creditStatus.trend === 'down' ? (
                  <TrendingDown className="h-3 w-3 text-green-500" />
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {creditStatus.trend_percentage}% vs período anterior
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos Restantes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creditStatus.remaining_credits.toLocaleString()}</div>
              <Progress value={100 - creditStatus.usage_percentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uso Atual</CardTitle>
              <div className="flex items-center space-x-1">
                {creditStatus.usage_percentage >= 90 ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : creditStatus.usage_percentage >= 70 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creditStatus.usage_percentage.toFixed(1)}%</div>
              <Progress 
                value={creditStatus.usage_percentage} 
                className={`mt-2 ${creditStatus.usage_percentage >= 90 ? 'bg-red-100' : creditStatus.usage_percentage >= 70 ? 'bg-yellow-100' : 'bg-green-100'}`}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas ativos */}
      {alerts.filter(alert => !alert.resolved).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas Ativos ({alerts.filter(alert => !alert.resolved).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.filter(alert => !alert.resolved).slice(0, 5).map((alert) => (
                <Alert key={alert.id} variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <div className="flex justify-between items-start w-full">
                    <div>
                      <AlertDescription className="font-medium">
                        {alert.title}
                      </AlertDescription>
                      <AlertDescription className="text-sm mt-1">
                        {alert.message}
                      </AlertDescription>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolver
                    </Button>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Usuários por Uso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metrics.top_users.slice(0, 5).map((user, index) => (
                      <div key={user.user_id} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span className="font-medium">{user.user_name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {user.credits_used.toLocaleString()} créditos
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Servidores por Uso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metrics.top_servers.slice(0, 5).map((server, index) => (
                      <div key={server.server_id} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span className="font-medium">{server.server_name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {server.credits_used.toLocaleString()} créditos
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Todos os Alertas</h3>
            <Button variant="outline" size="sm" onClick={() => exportData('alerts')}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>{alert.type}</TableCell>
                  <TableCell>
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{alert.title}</TableCell>
                  <TableCell>{new Date(alert.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {alert.resolved ? (
                      <Badge variant="secondary">Resolvido</Badge>
                    ) : (
                      <Badge variant="destructive">Ativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!alert.resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Resolver
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Histórico de Transações</h3>
            <div className="flex space-x-2">
              <Select 
                value={historyFilter.action} 
                onValueChange={(value) => setHistoryFilter(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="purchase">Compra</SelectItem>
                  <SelectItem value="usage">Uso</SelectItem>
                  <SelectItem value="refund">Reembolso</SelectItem>
                  <SelectItem value="bonus">Bônus</SelectItem>
                  <SelectItem value="expiry">Expiração</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => exportData('history')}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Saldo Anterior</TableHead>
                <TableHead>Saldo Atual</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.user_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getActionIcon(transaction.action)}
                      <span className="capitalize">{transaction.action}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={transaction.action === 'usage' || transaction.action === 'expiry' ? 'text-red-500' : 'text-green-500'}>
                      {transaction.action === 'usage' || transaction.action === 'expiry' ? '-' : '+'}
                      {Math.abs(transaction.amount).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>{transaction.balance_before.toLocaleString()}</TableCell>
                  <TableCell>{transaction.balance_after.toLocaleString()}</TableCell>
                  <TableCell>{new Date(transaction.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Métricas de Uso</h3>
                <Button variant="outline" size="sm" onClick={() => exportData('metrics')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Uso por Plano</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.plan_usage.map((plan) => (
                        <div key={plan.plan_id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{plan.plan_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {plan.user_count} usuários
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span>{plan.credits_used.toLocaleString()} créditos</span>
                            <span>{(plan.credits_used / plan.user_count).toFixed(0)} por usuário</span>
                          </div>
                          <Progress 
                            value={(plan.credits_used / Math.max(...metrics.plan_usage.map(p => p.credits_used))) * 100} 
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Uso Diário (Últimos 7 dias)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.daily_usage.slice(-7).map((day) => (
                        <div key={day.date} className="flex justify-between items-center">
                          <span className="text-sm">
                            {new Date(day.date).toLocaleDateString()}
                          </span>
                          <span className="font-medium">
                            {day.credits.toLocaleString()} créditos
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações de Monitoramento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alertas de validação */}
              {validationErrors.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Erros de validação encontrados:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4">
                {/* Alerta sobre requisições automáticas */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Importante:</strong> A atualização automática faz requisições constantes ao servidor. 
                    Use apenas quando necessário e com intervalos adequados (mínimo 60 segundos) para evitar sobrecarga.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto_refresh"
                    checked={config.auto_refresh}
                    onCheckedChange={(checked) => {
                      const newConfig = { ...config, auto_refresh: checked };
                      setConfig(newConfig);
                      updateConfig(newConfig);
                    }}
                  />
                  <Label htmlFor="auto_refresh">Atualização Automática</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refresh_interval">
                    Intervalo de Atualização (segundos) - Mínimo: 60s
                  </Label>
                  <Input
                    id="refresh_interval"
                    type="number"
                    min="60"
                    max="3600"
                    value={config.refresh_interval}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 60;
                      const newConfig = { 
                        ...config, 
                        refresh_interval: Math.max(60, value) // Garante mínimo de 60 segundos
                      };
                      setConfig(newConfig);
                    }}
                    onBlur={() => updateConfig(config)}
                    disabled={!config.auto_refresh}
                  />
                  {config.auto_refresh && config.refresh_interval < 60 && (
                    <p className="text-sm text-amber-600">
                      ⚠️ Intervalo muito baixo pode causar sobrecarga no servidor
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Limites de Alerta (%)</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="low_credits">Créditos Baixos</Label>
                      <Input
                        id="low_credits"
                        type="number"
                        min="0"
                        max="100"
                        value={config.alert_thresholds.low_credits}
                        onChange={(e) => {
                          const newConfig = {
                            ...config,
                            alert_thresholds: {
                              ...config.alert_thresholds,
                              low_credits: parseInt(e.target.value) || 0
                            }
                          };
                          setConfig(newConfig);
                        }}
                        onBlur={() => updateConfig(config)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="high_usage">Uso Alto</Label>
                      <Input
                        id="high_usage"
                        type="number"
                        min="0"
                        max="100"
                        value={config.alert_thresholds.high_usage}
                        onChange={(e) => {
                          const newConfig = {
                            ...config,
                            alert_thresholds: {
                              ...config.alert_thresholds,
                              high_usage: parseInt(e.target.value) || 0
                            }
                          };
                          setConfig(newConfig);
                        }}
                        onBlur={() => updateConfig(config)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="critical_usage">Uso Crítico</Label>
                      <Input
                        id="critical_usage"
                        type="number"
                        min="0"
                        max="100"
                        value={config.alert_thresholds.critical_usage}
                        onChange={(e) => {
                          const newConfig = {
                            ...config,
                            alert_thresholds: {
                              ...config.alert_thresholds,
                              critical_usage: parseInt(e.target.value) || 0
                            }
                          };
                          setConfig(newConfig);
                        }}
                        onBlur={() => updateConfig(config)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Configurações de Notificação</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="email_alerts"
                        checked={config.notification_settings.email_alerts}
                        onCheckedChange={(checked) => {
                          const newConfig = {
                            ...config,
                            notification_settings: {
                              ...config.notification_settings,
                              email_alerts: checked
                            }
                          };
                          setConfig(newConfig);
                          updateConfig(newConfig);
                        }}
                      />
                      <Label htmlFor="email_alerts">Alertas por Email</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="webhook_alerts"
                        checked={config.notification_settings.webhook_alerts}
                        onCheckedChange={(checked) => {
                          const newConfig = {
                            ...config,
                            notification_settings: {
                              ...config.notification_settings,
                              webhook_alerts: checked
                            }
                          };
                          setConfig(newConfig);
                          updateConfig(newConfig);
                        }}
                      />
                      <Label htmlFor="webhook_alerts">Alertas via Webhook</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="dashboard_alerts"
                        checked={config.notification_settings.dashboard_alerts}
                        onCheckedChange={(checked) => {
                          const newConfig = {
                            ...config,
                            notification_settings: {
                              ...config.notification_settings,
                              dashboard_alerts: checked
                            }
                          };
                          setConfig(newConfig);
                          updateConfig(newConfig);
                        }}
                      />
                      <Label htmlFor="dashboard_alerts">Alertas no Dashboard</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
