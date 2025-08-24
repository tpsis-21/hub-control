/**
 * Dashboard de Monitoramento de Performance
 * 
 * Componente para visualizar métricas de performance em tempo real:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Métricas de recursos e memória
 * - Alertas de performance
 * - Histórico de erros
 */

'use client';

import React, { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Activity,
  Cpu,
  HardDrive,
  Monitor,
  Network,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Settings,
  BarChart3,
  LineChart,
  PieChart
} from 'lucide-react';
import {
  usePerformanceMonitoring,
  PerformanceMetrics,
  ErrorMetrics,
  PerformanceAlert
} from '@/hooks/use-performance-monitoring';
import { useToast } from '@/hooks/use-toast';

// ============================================
// TIPOS E INTERFACES
// ============================================

interface PerformanceDashboardProps {
  className?: string;
  userId?: string;
  userRole?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showAdvancedMetrics?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'needs-improvement' | 'poor';
  threshold?: number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

interface AlertsPanelProps {
  alerts: PerformanceAlert[];
  onClearAlert: (alertId: string) => void;
  onClearAllAlerts: () => void;
  className?: string;
}

interface ErrorsPanelProps {
  errors: ErrorMetrics[];
  onClearErrors: () => void;
  className?: string;
}

// ============================================
// CONSTANTES
// ============================================

const CORE_WEB_VITALS_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 }
};

const STATUS_COLORS = {
  good: 'text-green-600 bg-green-50 border-green-200',
  'needs-improvement': 'text-yellow-600 bg-yellow-50 border-yellow-200',
  poor: 'text-red-600 bg-red-50 border-red-200'
};

const ALERT_SEVERITY_COLORS = {
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function PerformanceDashboard({
  className,
  userId,
  userRole = 'user',
  autoRefresh = true,
  refreshInterval = 30000,
  showAdvancedMetrics = false
}: PerformanceDashboardProps) {
  const { toast } = useToast();
  
  const {
    metrics,
    errors,
    alerts,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearAlerts,
    clearErrors,
    exportMetrics,
    config,
    sessionId
  } = usePerformanceMonitoring({
    userId,
    onAlert: (alert) => {
      if (alert.severity === 'critical') {
        toast({
          title: 'Alerta Crítico de Performance',
          description: alert.message,
          variant: 'destructive'
        });
      }
    }
  });

  // ============================================
  // ESTADO
  // ============================================

  const [activeTab, setActiveTab] = useState('overview');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ============================================
  // EFEITOS
  // ============================================

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const getMetricStatus = (value: number, thresholds: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const handleExportMetrics = async () => {
    try {
      const data = exportMetrics();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-metrics-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Métricas Exportadas',
        description: 'As métricas foram exportadas com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro na Exportação',
        description: 'Não foi possível exportar as métricas.',
        variant: 'destructive'
      });
    }
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  if (!isMonitoring) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Monitoramento Inativo</h3>
            <p className="text-muted-foreground mb-4">
              O monitoramento de performance não está ativo.
            </p>
            <Button onClick={startMonitoring}>
              <Activity className="h-4 w-4 mr-2" />
              Iniciar Monitoramento
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard de Performance</h2>
          <p className="text-muted-foreground">
            Monitoramento em tempo real • Última atualização: {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLastRefresh(new Date())}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportMetrics}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={stopMonitoring}>
            <Settings className="h-4 w-4 mr-2" />
            Parar
          </Button>
        </div>
      </div>

      {/* Alertas Críticos */}
      {alerts.filter(alert => alert.severity === 'critical').length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800">
                Alertas Críticos de Performance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.filter(alert => alert.severity === 'critical').slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">{alert.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newAlerts = alerts.filter(a => a.id !== alert.id);
                      // Note: Idealmente isso seria feito através do hook
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="resources">Recursos</TabsTrigger>
          <TabsTrigger value="errors">Erros</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* LCP */}
            <MetricCard
              title="LCP"
              value={metrics.lcp ? formatDuration(metrics.lcp) : 'N/A'}
              status={metrics.lcp ? getMetricStatus(metrics.lcp, CORE_WEB_VITALS_THRESHOLDS.lcp) : 'good'}
              threshold={CORE_WEB_VITALS_THRESHOLDS.lcp.good}
              icon={Eye}
              description="Largest Contentful Paint"
            />

            {/* FID */}
            <MetricCard
              title="FID"
              value={metrics.fid ? formatDuration(metrics.fid) : 'N/A'}
              status={metrics.fid ? getMetricStatus(metrics.fid, CORE_WEB_VITALS_THRESHOLDS.fid) : 'good'}
              threshold={CORE_WEB_VITALS_THRESHOLDS.fid.good}
              icon={Zap}
              description="First Input Delay"
            />

            {/* CLS */}
            <MetricCard
              title="CLS"
              value={metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
              status={metrics.cls ? getMetricStatus(metrics.cls, CORE_WEB_VITALS_THRESHOLDS.cls) : 'good'}
              threshold={CORE_WEB_VITALS_THRESHOLDS.cls.good}
              icon={BarChart3}
              description="Cumulative Layout Shift"
            />

            {/* Memória */}
            <MetricCard
              title="Memória"
              value={metrics.memoryUsage ? formatBytes(metrics.memoryUsage.usedJSHeapSize) : 'N/A'}
              status={metrics.memoryUsage ? 
                getMetricStatus(
                  (metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.jsHeapSizeLimit) * 100,
                  { good: 50, poor: 80 }
                ) : 'good'
              }
              icon={Cpu}
              description="Uso de Memória JS"
            />
          </div>

          {/* Gráficos de Recursos */}
          {metrics.resourceTiming && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Recursos Carregados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total de Recursos</span>
                      <Badge variant="outline">{metrics.resourceTiming.totalResources}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tamanho Total</span>
                      <Badge variant="outline">{formatBytes(metrics.resourceTiming.totalSize)}</Badge>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Recurso Mais Lento</span>
                      <div className="text-xs text-muted-foreground">
                        <p className="truncate">{metrics.resourceTiming.slowestResource.name}</p>
                        <p>{formatDuration(metrics.resourceTiming.slowestResource.duration)} • {formatBytes(metrics.resourceTiming.slowestResource.size)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Informações de Rede
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.networkInfo ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tipo de Conexão</span>
                        <Badge variant="outline">{metrics.networkInfo.effectiveType}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Velocidade</span>
                        <Badge variant="outline">{metrics.networkInfo.downlink} Mbps</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Latência</span>
                        <Badge variant="outline">{metrics.networkInfo.rtt}ms</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Informações de rede não disponíveis</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Core Web Vitals Detalhado */}
        <TabsContent value="vitals" className="space-y-6">
          <CoreWebVitalsPanel metrics={metrics} />
        </TabsContent>

        {/* Recursos */}
        <TabsContent value="resources" className="space-y-6">
          <ResourcesPanel metrics={metrics} />
        </TabsContent>

        {/* Erros */}
        <TabsContent value="errors" className="space-y-6">
          <ErrorsPanel errors={errors} onClearErrors={clearErrors} />
          <AlertsPanel alerts={alerts} onClearAlert={() => {}} onClearAllAlerts={clearAlerts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function MetricCard({
  title,
  value,
  unit,
  status,
  threshold,
  icon: Icon,
  description,
  trend,
  className
}: MetricCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold">{value}</p>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <Badge className={STATUS_COLORS[status]}>
              {status === 'good' ? 'Bom' : status === 'needs-improvement' ? 'Atenção' : 'Ruim'}
            </Badge>
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <div className="h-4 w-4" />
            )}
            <span className="text-xs text-muted-foreground">
              {trend === 'up' ? 'Melhorando' : trend === 'down' ? 'Piorando' : 'Estável'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CoreWebVitalsPanel({ metrics }: { metrics: PerformanceMetrics }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Core Web Vitals Detalhado</CardTitle>
          <CardDescription>
            Métricas essenciais de experiência do usuário definidas pelo Google
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* LCP */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Largest Contentful Paint (LCP)</span>
              <span className="text-sm text-muted-foreground">
                {metrics.lcp ? formatDuration(metrics.lcp) : 'N/A'}
              </span>
            </div>
            <Progress 
              value={metrics.lcp ? Math.min((metrics.lcp / 4000) * 100, 100) : 0} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Bom (&lt; 2.5s)</span>
              <span>Atenção (2.5s - 4s)</span>
              <span>Ruim (&gt; 4s)</span>
            </div>
          </div>

          {/* FID */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">First Input Delay (FID)</span>
              <span className="text-sm text-muted-foreground">
                {metrics.fid ? formatDuration(metrics.fid) : 'N/A'}
              </span>
            </div>
            <Progress 
              value={metrics.fid ? Math.min((metrics.fid / 300) * 100, 100) : 0} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Bom (&lt; 100ms)</span>
              <span>Atenção (100ms - 300ms)</span>
              <span>Ruim (&gt; 300ms)</span>
            </div>
          </div>

          {/* CLS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Cumulative Layout Shift (CLS)</span>
              <span className="text-sm text-muted-foreground">
                {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
              </span>
            </div>
            <Progress 
              value={metrics.cls ? Math.min((metrics.cls / 0.25) * 100, 100) : 0} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Bom (&lt; 0.1)</span>
              <span>Atenção (0.1 - 0.25)</span>
              <span>Ruim (&gt; 0.25)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResourcesPanel({ metrics }: { metrics: PerformanceMetrics }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Análise de Recursos</CardTitle>
          <CardDescription>
            Informações sobre carregamento de recursos da página
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.resourceTiming ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{metrics.resourceTiming.totalResources}</p>
                  <p className="text-sm text-muted-foreground">Total de Recursos</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{formatBytes(metrics.resourceTiming.totalSize)}</p>
                  <p className="text-sm text-muted-foreground">Tamanho Total</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{formatDuration(metrics.resourceTiming.slowestResource.duration)}</p>
                  <p className="text-sm text-muted-foreground">Recurso Mais Lento</p>
                </div>
              </div>
              
              {metrics.resourceTiming.slowestResource.name && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Recurso Mais Lento</h4>
                  <p className="text-sm text-muted-foreground break-all">
                    {metrics.resourceTiming.slowestResource.name}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span>Duração: {formatDuration(metrics.resourceTiming.slowestResource.duration)}</span>
                    <span>Tamanho: {formatBytes(metrics.resourceTiming.slowestResource.size)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Dados de recursos não disponíveis
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorsPanel({ errors, onClearErrors, className }: ErrorsPanelProps) {
  const recentErrors = errors.slice(-10); // Últimos 10 erros

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Erros Recentes
            </CardTitle>
            <CardDescription>
              {errors.length} erro(s) registrado(s) nesta sessão
            </CardDescription>
          </div>
          {errors.length > 0 && (
            <Button variant="outline" size="sm" onClick={onClearErrors}>
              Limpar Erros
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recentErrors.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum Erro</h3>
            <p className="text-muted-foreground">
              Nenhum erro foi registrado nesta sessão.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentErrors.map((error) => (
              <div key={error.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={error.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {error.severity}
                      </Badge>
                      <span className="text-sm font-medium">{error.type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{error.message}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{format(error.timestamp, 'dd/MM/yyyy HH:mm:ss')}</span>
                      <span>{error.route}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertsPanel({ alerts, onClearAlert, onClearAllAlerts, className }: AlertsPanelProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Performance
            </CardTitle>
            <CardDescription>
              {alerts.length} alerta(s) ativo(s)
            </CardDescription>
          </div>
          {alerts.length > 0 && (
            <Button variant="outline" size="sm" onClick={onClearAllAlerts}>
              Limpar Todos
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum Alerta</h3>
            <p className="text-muted-foreground">
              Todos os indicadores de performance estão dentro dos limites aceitáveis.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={ALERT_SEVERITY_COLORS[alert.severity]}>
                        {alert.severity === 'warning' ? 'Atenção' : 'Crítico'}
                      </Badge>
                      <span className="text-sm font-medium">{alert.type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{format(alert.timestamp, 'dd/MM/yyyy HH:mm:ss')}</span>
                      <span>Limite: {alert.threshold} | Atual: {alert.actualValue}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onClearAlert(alert.id)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PerformanceDashboard;