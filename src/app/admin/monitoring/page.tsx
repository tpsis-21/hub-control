/**
 * Dashboard de Monitoramento de Performance
 * 
 * Exibe métricas em tempo real de performance, cache, queries e sistema.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UXMetricsDashboard from '@/components/analytics/ux-metrics-dashboard';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  Database, 
  Zap, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface PerformanceMetrics {
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
  };
  apiPerformance: {
    avgResponseTime: number;
    slowRequests: number;
    errorRate: number;
    throughput: number;
  };
  cacheMetrics: {
    hitRate: number;
    size: number;
    maxSize: number;
    evictions: number;
  };
  systemMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    activeConnections: number;
  };
}

interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
}

// ============================================
// DADOS MOCK (em produção viriam da API)
// ============================================

const generateMockData = () => {
  const now = new Date();
  const timePoints = Array.from({ length: 24 }, (_, i) => {
    const time = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
    return {
      time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      responseTime: Math.random() * 500 + 100,
      requests: Math.floor(Math.random() * 1000) + 500,
      errors: Math.floor(Math.random() * 50),
      cacheHitRate: Math.random() * 20 + 80,
      memoryUsage: Math.random() * 30 + 40,
      cpuUsage: Math.random() * 40 + 20
    };
  });
  
  return timePoints;
};

const mockAlerts: AlertItem[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Alto tempo de resposta',
    description: 'API /api/clientes está respondendo em média 2.3s',
    timestamp: new Date(Date.now() - 300000),
    resolved: false
  },
  {
    id: '2',
    type: 'error',
    title: 'Cache com baixa taxa de hit',
    description: 'Taxa de hit do cache caiu para 65%',
    timestamp: new Date(Date.now() - 600000),
    resolved: false
  },
  {
    id: '3',
    type: 'info',
    title: 'Backup concluído',
    description: 'Backup automático executado com sucesso',
    timestamp: new Date(Date.now() - 900000),
    resolved: true
  }
];

// ============================================
// COMPONENTES
// ============================================

// Componente de Métrica
function MetricCard({ 
  title, 
  value, 
  unit, 
  trend, 
  status, 
  icon: Icon,
  description 
}: {
  title: string;
  value: number | string;
  unit?: string;
  trend?: number;
  status?: 'good' | 'warning' | 'error';
  icon: any;
  description?: string;
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    if (trend === undefined) return null;
    return trend > 0 ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${getStatusColor()}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}{unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend !== undefined && (
          <div className="flex items-center mt-2">
            {getTrendIcon()}
            <span className="text-xs text-muted-foreground ml-1">
              {Math.abs(trend)}% em relação à hora anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente de Alerta
function AlertCard({ alert, onResolve }: { alert: AlertItem; onResolve: (id: string) => void }) {
  const getAlertIcon = () => {
    switch (alert.type) {
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getAlertColor = () => {
    switch (alert.type) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
    }
  };

  return (
    <Alert className={`mb-4 ${alert.resolved ? 'opacity-50' : ''}`}>
      {getAlertIcon()}
      <AlertTitle className="flex items-center justify-between">
        <span>{alert.title}</span>
        <div className="flex items-center gap-2">
          <Badge variant={getAlertColor()}>{alert.type}</Badge>
          {!alert.resolved && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onResolve(alert.id)}
            >
              Resolver
            </Button>
          )}
        </div>
      </AlertTitle>
      <AlertDescription>
        {alert.description}
        <div className="text-xs text-muted-foreground mt-1">
          {alert.timestamp.toLocaleString('pt-BR')}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>(mockAlerts);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // segundos

  const chartData = useMemo(() => generateMockData(), []);

  // Simular carregamento de métricas
  useEffect(() => {
    const loadMetrics = () => {
      // Simular dados de métricas
      setMetrics({
        coreWebVitals: {
          lcp: 1.2 + Math.random() * 0.5,
          fid: 50 + Math.random() * 30,
          cls: 0.05 + Math.random() * 0.1,
          fcp: 0.8 + Math.random() * 0.4,
          ttfb: 200 + Math.random() * 100
        },
        apiPerformance: {
          avgResponseTime: 150 + Math.random() * 100,
          slowRequests: Math.floor(Math.random() * 20),
          errorRate: Math.random() * 5,
          throughput: 500 + Math.random() * 200
        },
        cacheMetrics: {
          hitRate: 85 + Math.random() * 10,
          size: Math.floor(Math.random() * 800) + 200,
          maxSize: 1000,
          evictions: Math.floor(Math.random() * 50)
        },
        systemMetrics: {
          memoryUsage: 60 + Math.random() * 20,
          cpuUsage: 30 + Math.random() * 30,
          diskUsage: 45 + Math.random() * 15,
          activeConnections: Math.floor(Math.random() * 100) + 50
        }
      });
      setIsLoading(false);
    };

    loadMetrics();

    // Auto refresh
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const handleResolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Simular delay de carregamento
    setTimeout(() => {
      setMetrics(prev => prev ? {
        ...prev,
        apiPerformance: {
          ...prev.apiPerformance,
          avgResponseTime: 150 + Math.random() * 100
        }
      } : null);
      setIsLoading(false);
    }, 1000);
  };

  const exportData = () => {
    const data = {
      metrics,
      alerts,
      chartData,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando métricas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoramento de Performance</h1>
          <p className="text-muted-foreground">
            Dashboard em tempo real de métricas do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Alertas Ativos */}
      {alerts.filter(a => !a.resolved).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Alertas Ativos ({alerts.filter(a => !a.resolved).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.filter(a => !a.resolved).map(alert => (
              <AlertCard 
                key={alert.id} 
                alert={alert} 
                onResolve={handleResolveAlert} 
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Métricas Principais */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Tempo de Resposta Médio"
            value={Math.round(metrics.apiPerformance.avgResponseTime)}
            unit="ms"
            trend={-5.2}
            status={metrics.apiPerformance.avgResponseTime < 200 ? 'good' : 'warning'}
            icon={Clock}
            description="APIs do sistema"
          />
          
          <MetricCard
            title="Taxa de Hit do Cache"
            value={Math.round(metrics.cacheMetrics.hitRate)}
            unit="%"
            trend={2.1}
            status={metrics.cacheMetrics.hitRate > 80 ? 'good' : 'warning'}
            icon={Database}
            description="Cache de queries"
          />
          
          <MetricCard
            title="Uso de Memória"
            value={Math.round(metrics.systemMetrics.memoryUsage)}
            unit="%"
            trend={-1.5}
            status={metrics.systemMetrics.memoryUsage < 70 ? 'good' : 'warning'}
            icon={Activity}
            description="Servidor principal"
          />
          
          <MetricCard
            title="Throughput"
            value={Math.round(metrics.apiPerformance.throughput)}
            unit="req/min"
            trend={8.3}
            status="good"
            icon={Zap}
            description="Requisições processadas"
          />
        </div>
      )}

      {/* Gráficos e Detalhes */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="ux">UX</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Tempo de Resposta (24h)</CardTitle>
                <CardDescription>
                  Tempo médio de resposta das APIs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Tempo (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requisições e Erros</CardTitle>
                <CardDescription>
                  Volume de requisições e taxa de erro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="requests" 
                      stackId="1" 
                      stroke="#82ca9d" 
                      fill="#82ca9d"
                      name="Requisições"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="errors" 
                      stackId="2" 
                      stroke="#ff7c7c" 
                      fill="#ff7c7c"
                      name="Erros"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Core Web Vitals */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Core Web Vitals</CardTitle>
                <CardDescription>
                  Métricas de experiência do usuário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">LCP</span>
                      <span className="text-sm">{metrics.coreWebVitals.lcp.toFixed(1)}s</span>
                    </div>
                    <Progress 
                      value={(metrics.coreWebVitals.lcp / 4) * 100} 
                      className="h-2"
                    />
                    <span className="text-xs text-muted-foreground">Largest Contentful Paint</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">FID</span>
                      <span className="text-sm">{Math.round(metrics.coreWebVitals.fid)}ms</span>
                    </div>
                    <Progress 
                      value={(metrics.coreWebVitals.fid / 300) * 100} 
                      className="h-2"
                    />
                    <span className="text-xs text-muted-foreground">First Input Delay</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">CLS</span>
                      <span className="text-sm">{metrics.coreWebVitals.cls.toFixed(3)}</span>
                    </div>
                    <Progress 
                      value={(metrics.coreWebVitals.cls / 0.25) * 100} 
                      className="h-2"
                    />
                    <span className="text-xs text-muted-foreground">Cumulative Layout Shift</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">FCP</span>
                      <span className="text-sm">{metrics.coreWebVitals.fcp.toFixed(1)}s</span>
                    </div>
                    <Progress 
                      value={(metrics.coreWebVitals.fcp / 3) * 100} 
                      className="h-2"
                    />
                    <span className="text-xs text-muted-foreground">First Contentful Paint</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">TTFB</span>
                      <span className="text-sm">{Math.round(metrics.coreWebVitals.ttfb)}ms</span>
                    </div>
                    <Progress 
                      value={(metrics.coreWebVitals.ttfb / 800) * 100} 
                      className="h-2"
                    />
                    <span className="text-xs text-muted-foreground">Time to First Byte</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Hit do Cache</CardTitle>
                <CardDescription>
                  Performance do cache ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cacheHitRate" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Hit Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {metrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas do Cache</CardTitle>
                  <CardDescription>
                    Informações detalhadas sobre o cache
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Uso do Cache</span>
                      <span>{metrics.cacheMetrics.size}/{metrics.cacheMetrics.maxSize}</span>
                    </div>
                    <Progress 
                      value={(metrics.cacheMetrics.size / metrics.cacheMetrics.maxSize) * 100} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(metrics.cacheMetrics.hitRate)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Taxa de Hit</div>
                    </div>
                    
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {metrics.cacheMetrics.evictions}
                      </div>
                      <div className="text-sm text-muted-foreground">Evictions</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Uso de Recursos</CardTitle>
                <CardDescription>
                  CPU e Memória ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="memoryUsage" 
                      stackId="1" 
                      stroke="#8884d8" 
                      fill="#8884d8"
                      name="Memória (%)"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cpuUsage" 
                      stackId="2" 
                      stroke="#82ca9d" 
                      fill="#82ca9d"
                      name="CPU (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {metrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Status do Sistema</CardTitle>
                  <CardDescription>
                    Informações em tempo real
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">
                        {Math.round(metrics.systemMetrics.memoryUsage)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Memória</div>
                      <Progress 
                        value={metrics.systemMetrics.memoryUsage} 
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">
                        {Math.round(metrics.systemMetrics.cpuUsage)}%
                      </div>
                      <div className="text-sm text-muted-foreground">CPU</div>
                      <Progress 
                        value={metrics.systemMetrics.cpuUsage} 
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">
                        {Math.round(metrics.systemMetrics.diskUsage)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Disco</div>
                      <Progress 
                        value={metrics.systemMetrics.diskUsage} 
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">
                        {metrics.systemMetrics.activeConnections}
                      </div>
                      <div className="text-sm text-muted-foreground">Conexões</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alertas</CardTitle>
              <CardDescription>
                Todos os alertas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.map(alert => (
                <AlertCard 
                  key={alert.id} 
                  alert={alert} 
                  onResolve={handleResolveAlert} 
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ux" className="space-y-4">
          <UXMetricsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}