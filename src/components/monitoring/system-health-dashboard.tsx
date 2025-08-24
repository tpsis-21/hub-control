/**
 * Dashboard de Saúde do Sistema
 * 
 * Componente principal que integra todas as métricas de monitoramento:
 * - Status geral do sistema
 * - Métricas de performance
 * - Alertas ativos
 * - Saúde dos serviços
 * - Tendências históricas
 */

'use client';

import React, { useState, useEffect } from 'react';
import { format, formatDistanceToNow, subDays, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Heart,
  Monitor,
  Network,
  RefreshCw,
  Server,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  Wifi,
  XCircle,
  Zap,
  BarChart3,
  LineChart,
  PieChart,
  Settings,
  Download,
  Eye,
  AlertCircle,
  Info,
  Warning
} from 'lucide-react';
import { usePerformanceMonitoring } from '@/hooks/use-performance-monitoring';
import { useSystemAlerts } from '@/hooks/use-system-alerts';
import { useToast } from '@/hooks/use-toast';

// ============================================
// TIPOS E INTERFACES
// ============================================

interface SystemHealthDashboardProps {
  className?: string;
  userId?: string;
  userRole?: string;
  refreshInterval?: number;
  showAdvancedMetrics?: boolean;
}

interface ServiceStatus {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  uptime: number; // em porcentagem
  responseTime: number; // em ms
  lastCheck: Date;
  endpoint?: string;
  version?: string;
  dependencies?: string[];
  metrics?: {
    cpu?: number;
    memory?: number;
    disk?: number;
    connections?: number;
  };
}

interface SystemMetrics {
  overall: {
    status: 'healthy' | 'warning' | 'critical';
    score: number; // 0-100
    uptime: number;
    lastIncident?: Date;
  };
  performance: {
    avgResponseTime: number;
    throughput: number;
    errorRate: number;
    availability: number;
  };
  resources: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  security: {
    threatsBlocked: number;
    vulnerabilities: number;
    lastScan: Date;
    score: number;
  };
  users: {
    active: number;
    total: number;
    sessionsToday: number;
    avgSessionDuration: number;
  };
}

interface HealthCheckResult {
  service: string;
  status: 'pass' | 'fail' | 'warn';
  timestamp: Date;
  responseTime: number;
  details?: Record<string, any>;
}

// ============================================
// CONSTANTES
// ============================================

const STATUS_COLORS = {
  healthy: 'text-green-600 bg-green-50 border-green-200',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  critical: 'text-red-600 bg-red-50 border-red-200',
  unknown: 'text-gray-600 bg-gray-50 border-gray-200'
};

const STATUS_ICONS = {
  healthy: CheckCircle,
  warning: AlertTriangle,
  critical: XCircle,
  unknown: AlertCircle
};

const MOCK_SERVICES: ServiceStatus[] = [
  {
    id: 'api',
    name: 'API Principal',
    status: 'healthy',
    uptime: 99.9,
    responseTime: 120,
    lastCheck: new Date(),
    endpoint: '/api/health',
    version: '1.2.3',
    metrics: { cpu: 45, memory: 60, connections: 150 }
  },
  {
    id: 'database',
    name: 'Banco de Dados',
    status: 'healthy',
    uptime: 99.8,
    responseTime: 50,
    lastCheck: new Date(),
    version: 'PostgreSQL 15.2',
    metrics: { cpu: 30, memory: 70, disk: 65, connections: 25 }
  },
  {
    id: 'cache',
    name: 'Sistema de Cache',
    status: 'warning',
    uptime: 98.5,
    responseTime: 15,
    lastCheck: new Date(),
    version: 'Redis 7.0',
    metrics: { cpu: 20, memory: 85, connections: 200 }
  },
  {
    id: 'storage',
    name: 'Armazenamento',
    status: 'healthy',
    uptime: 99.9,
    responseTime: 80,
    lastCheck: new Date(),
    metrics: { disk: 45, connections: 50 }
  },
  {
    id: 'auth',
    name: 'Autenticação',
    status: 'healthy',
    uptime: 99.7,
    responseTime: 200,
    lastCheck: new Date(),
    version: '2.1.0',
    metrics: { cpu: 25, memory: 40, connections: 300 }
  }
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function SystemHealthDashboard({
  className,
  userId,
  userRole = 'user',
  refreshInterval = 30000,
  showAdvancedMetrics = false
}: SystemHealthDashboardProps) {
  const { toast } = useToast();
  
  const {
    metrics: performanceMetrics,
    isMonitoring,
    startMonitoring
  } = usePerformanceMonitoring({ userId });
  
  const {
    alerts,
    stats: alertStats,
    createAlert
  } = useSystemAlerts({ userId });
  
  // ============================================
  // ESTADO
  // ============================================
  
  const [services, setServices] = useState<ServiceStatus[]>(MOCK_SERVICES);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    overall: {
      status: 'healthy',
      score: 95,
      uptime: 99.8
    },
    performance: {
      avgResponseTime: 150,
      throughput: 1250,
      errorRate: 0.1,
      availability: 99.9
    },
    resources: {
      cpu: 45,
      memory: 65,
      disk: 55,
      network: 30
    },
    security: {
      threatsBlocked: 127,
      vulnerabilities: 2,
      lastScan: subHours(new Date(), 6),
      score: 88
    },
    users: {
      active: 1247,
      total: 15680,
      sessionsToday: 3420,
      avgSessionDuration: 28
    }
  });
  
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // ============================================
  // EFEITOS
  // ============================================
  
  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);
  
  // Iniciar monitoramento se não estiver ativo
  useEffect(() => {
    if (!isMonitoring) {
      startMonitoring();
    }
  }, [isMonitoring, startMonitoring]);
  
  // ============================================
  // FUNÇÕES
  // ============================================
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Simular atualização dos dados
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Atualizar timestamp
      setLastRefresh(new Date());
      
      // Simular mudanças nos serviços
      setServices(prev => prev.map(service => ({
        ...service,
        responseTime: service.responseTime + (Math.random() - 0.5) * 20,
        lastCheck: new Date(),
        metrics: service.metrics ? {
          ...service.metrics,
          cpu: Math.max(0, Math.min(100, service.metrics.cpu + (Math.random() - 0.5) * 10)),
          memory: Math.max(0, Math.min(100, service.metrics.memory + (Math.random() - 0.5) * 5))
        } : undefined
      })));
      
    } catch (error) {
      toast({
        title: 'Erro na Atualização',
        description: 'Não foi possível atualizar os dados do sistema.',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const getOverallStatus = (): 'healthy' | 'warning' | 'critical' => {
    const criticalServices = services.filter(s => s.status === 'critical').length;
    const warningServices = services.filter(s => s.status === 'warning').length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
    
    if (criticalServices > 0 || criticalAlerts > 0) return 'critical';
    if (warningServices > 1) return 'warning';
    return 'healthy';
  };
  
  const getHealthScore = (): number => {
    const serviceScore = services.reduce((sum, service) => {
      switch (service.status) {
        case 'healthy': return sum + 25;
        case 'warning': return sum + 15;
        case 'critical': return sum + 5;
        default: return sum + 10;
      }
    }, 0) / services.length;
    
    const alertScore = Math.max(0, 25 - (alertStats.active * 2));
    const performanceScore = performanceMetrics.lcp ? Math.max(0, 25 - (performanceMetrics.lcp / 100)) : 25;
    const resourceScore = Math.max(0, 25 - (systemMetrics.resources.cpu / 4));
    
    return Math.round(serviceScore + alertScore + performanceScore + resourceScore);
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
  
  const overallStatus = getOverallStatus();
  const healthScore = getHealthScore();
  const StatusIcon = STATUS_ICONS[overallStatus];
  
  // ============================================
  // RENDERIZAÇÃO
  // ============================================
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saúde do Sistema</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real • Última atualização: {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Relatório
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>
      
      {/* Status Geral */}
      <Card className={cn('border-2', STATUS_COLORS[overallStatus])}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-background">
                <StatusIcon className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  Sistema {overallStatus === 'healthy' ? 'Saudável' : overallStatus === 'warning' ? 'Com Alertas' : 'Crítico'}
                </h2>
                <p className="text-muted-foreground">
                  Score de saúde: {healthScore}/100 • Uptime: {systemMetrics.overall.uptime}%
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{healthScore}</div>
              <div className="text-sm text-muted-foreground">Score de Saúde</div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{services.filter(s => s.status === 'healthy').length}</div>
              <div className="text-sm text-muted-foreground">Serviços Saudáveis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{services.filter(s => s.status === 'warning').length}</div>
              <div className="text-sm text-muted-foreground">Com Alertas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{services.filter(s => s.status === 'critical').length}</div>
              <div className="text-sm text-muted-foreground">Críticos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{alertStats.active}</div>
              <div className="text-sm text-muted-foreground">Alertas Ativos</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="resources">Recursos</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>
        
        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Performance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.performance.avgResponseTime}ms</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingDown className="inline h-3 w-3 mr-1" />
                  -12ms desde ontem
                </p>
              </CardContent>
            </Card>
            
            {/* Throughput */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requisições/min</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.performance.throughput.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +8% desde ontem
                </p>
              </CardContent>
            </Card>
            
            {/* Usuários Ativos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.users.active.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {systemMetrics.users.sessionsToday.toLocaleString()} sessões hoje
                </p>
              </CardContent>
            </Card>
            
            {/* Taxa de Erro */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.performance.errorRate}%</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingDown className="inline h-3 w-3 mr-1" />
                  -0.05% desde ontem
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Alertas Recentes */}
          {alerts.filter(a => !a.resolved).slice(0, 5).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.filter(a => !a.resolved).slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {alert.severity}
                        </Badge>
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Serviços */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid gap-4">
            {services.map((service) => {
              const ServiceStatusIcon = STATUS_ICONS[service.status];
              
              return (
                <Card key={service.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn('p-2 rounded-full', STATUS_COLORS[service.status])}>
                          <ServiceStatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Uptime: {service.uptime}%</span>
                            <span>Resposta: {Math.round(service.responseTime)}ms</span>
                            {service.version && <span>v{service.version}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[service.status]}>
                        {service.status === 'healthy' ? 'Saudável' : 
                         service.status === 'warning' ? 'Atenção' : 
                         service.status === 'critical' ? 'Crítico' : 'Desconhecido'}
                      </Badge>
                    </div>
                    
                    {service.metrics && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {service.metrics.cpu !== undefined && (
                          <div>
                            <div className="flex items-center justify-between text-sm">
                              <span>CPU</span>
                              <span>{service.metrics.cpu}%</span>
                            </div>
                            <Progress value={service.metrics.cpu} className="h-2 mt-1" />
                          </div>
                        )}
                        {service.metrics.memory !== undefined && (
                          <div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Memória</span>
                              <span>{service.metrics.memory}%</span>
                            </div>
                            <Progress value={service.metrics.memory} className="h-2 mt-1" />
                          </div>
                        )}
                        {service.metrics.disk !== undefined && (
                          <div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Disco</span>
                              <span>{service.metrics.disk}%</span>
                            </div>
                            <Progress value={service.metrics.disk} className="h-2 mt-1" />
                          </div>
                        )}
                        {service.metrics.connections !== undefined && (
                          <div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Conexões</span>
                              <span>{service.metrics.connections}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        {/* Performance */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Core Web Vitals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>LCP (Largest Contentful Paint)</span>
                    <span>{performanceMetrics.lcp ? formatDuration(performanceMetrics.lcp) : 'N/A'}</span>
                  </div>
                  <Progress 
                    value={performanceMetrics.lcp ? Math.min((performanceMetrics.lcp / 4000) * 100, 100) : 0} 
                    className="h-2 mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>FID (First Input Delay)</span>
                    <span>{performanceMetrics.fid ? formatDuration(performanceMetrics.fid) : 'N/A'}</span>
                  </div>
                  <Progress 
                    value={performanceMetrics.fid ? Math.min((performanceMetrics.fid / 300) * 100, 100) : 0} 
                    className="h-2 mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>CLS (Cumulative Layout Shift)</span>
                    <span>{performanceMetrics.cls ? performanceMetrics.cls.toFixed(3) : 'N/A'}</span>
                  </div>
                  <Progress 
                    value={performanceMetrics.cls ? Math.min((performanceMetrics.cls / 0.25) * 100, 100) : 0} 
                    className="h-2 mt-1"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Métricas de Rede
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceMetrics.networkInfo ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tipo de Conexão</span>
                      <Badge variant="outline">{performanceMetrics.networkInfo.effectiveType}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Velocidade</span>
                      <Badge variant="outline">{performanceMetrics.networkInfo.downlink} Mbps</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Latência</span>
                      <Badge variant="outline">{performanceMetrics.networkInfo.rtt}ms</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Informações de rede não disponíveis</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Recursos */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.resources.cpu}%</div>
                <Progress value={systemMetrics.resources.cpu} className="h-2 mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memória</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.resources.memory}%</div>
                <Progress value={systemMetrics.resources.memory} className="h-2 mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disco</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.resources.disk}%</div>
                <Progress value={systemMetrics.resources.disk} className="h-2 mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rede</CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.resources.network}%</div>
                <Progress value={systemMetrics.resources.network} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Segurança */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Status de Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Score de Segurança</span>
                  <div className="flex items-center gap-2">
                    <Progress value={systemMetrics.security.score} className="w-20 h-2" />
                    <span className="text-sm font-bold">{systemMetrics.security.score}/100</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Ameaças Bloqueadas</span>
                  <Badge variant="outline">{systemMetrics.security.threatsBlocked}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Vulnerabilidades</span>
                  <Badge variant={systemMetrics.security.vulnerabilities > 0 ? 'destructive' : 'outline'}>
                    {systemMetrics.security.vulnerabilities}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Último Scan</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(systemMetrics.security.lastScan, { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Atividade de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Usuários Ativos</span>
                  <span className="text-lg font-bold">{systemMetrics.users.active.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total de Usuários</span>
                  <span className="text-sm">{systemMetrics.users.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sessões Hoje</span>
                  <span className="text-sm">{systemMetrics.users.sessionsToday.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Duração Média</span>
                  <span className="text-sm">{systemMetrics.users.avgSessionDuration}min</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SystemHealthDashboard;