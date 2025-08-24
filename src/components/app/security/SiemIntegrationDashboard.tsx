'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  ExternalLink,
  RefreshCw,
  Send,
  Server,
  Shield,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Tipos para dados SIEM
interface SiemConfiguration {
  id: string;
  name: string;
  provider: string;
  description: string;
  endpoint_url: string;
  is_active: boolean;
  is_healthy: boolean;
  last_successful_send: string | null;
  created_at: string;
}

interface SiemMetrics {
  metric: string;
  value: number;
  description: string;
}

interface SiemPerformance {
  name: string;
  provider: string;
  is_healthy: boolean;
  total_events: number;
  successful_events: number;
  failed_events: number;
  success_rate_percentage: number;
  avg_response_time_ms: number;
  last_successful_send: string | null;
}

interface SiemFailedEvent {
  id: string;
  siem_name: string;
  provider: string;
  event_type: string;
  severity: string;
  attempts: number;
  max_attempts: number;
  error_message: string;
  last_error_at: string;
  created_at: string;
}

interface SiemEventQueue {
  id: string;
  event_type: string;
  severity: string;
  status: string;
  attempts: number;
  created_at: string;
  scheduled_at: string;
}

const SiemIntegrationDashboard: React.FC = () => {
  // Estados
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Dados simulados (em produção, viriam da API)
  const [metrics, setMetrics] = useState<SiemMetrics[]>([
    { metric: 'active_configurations', value: 3, description: 'Configurações SIEM ativas' },
    { metric: 'healthy_configurations', value: 2, description: 'Configurações SIEM saudáveis' },
    { metric: 'events_pending', value: 15, description: 'Eventos pendentes na fila' },
    { metric: 'events_sent_24h', value: 1247, description: 'Eventos enviados nas últimas 24h' },
    { metric: 'events_failed_24h', value: 8, description: 'Eventos falharam nas últimas 24h' },
    { metric: 'avg_response_time_ms', value: 245, description: 'Tempo médio de resposta (ms)' },
  ]);

  const [configurations, setConfigurations] = useState<SiemConfiguration[]>([
    {
      id: '1',
      name: 'Splunk Production',
      provider: 'splunk',
      description: 'Splunk SIEM principal para eventos de segurança',
      endpoint_url: 'https://splunk.empresa.com:8088/services/collector/event',
      is_active: true,
      is_healthy: true,
      last_successful_send: '2024-01-15T10:30:00Z',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'ELK Stack Security',
      provider: 'elk',
      description: 'Elasticsearch para logs de segurança',
      endpoint_url: 'https://elasticsearch.empresa.com:9200/security-logs/_doc',
      is_active: true,
      is_healthy: true,
      last_successful_send: '2024-01-15T10:25:00Z',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      name: 'QRadar Enterprise',
      provider: 'qradar',
      description: 'IBM QRadar para análise avançada',
      endpoint_url: 'https://qradar.empresa.com/api/siem/events',
      is_active: true,
      is_healthy: false,
      last_successful_send: '2024-01-15T08:15:00Z',
      created_at: '2024-01-01T00:00:00Z',
    },
  ]);

  const [performance, setPerformance] = useState<SiemPerformance[]>([
    {
      name: 'Splunk Production',
      provider: 'splunk',
      is_healthy: true,
      total_events: 1500,
      successful_events: 1485,
      failed_events: 15,
      success_rate_percentage: 99.0,
      avg_response_time_ms: 180,
      last_successful_send: '2024-01-15T10:30:00Z',
    },
    {
      name: 'ELK Stack Security',
      provider: 'elk',
      is_healthy: true,
      total_events: 1200,
      successful_events: 1175,
      failed_events: 25,
      success_rate_percentage: 97.9,
      avg_response_time_ms: 220,
      last_successful_send: '2024-01-15T10:25:00Z',
    },
    {
      name: 'QRadar Enterprise',
      provider: 'qradar',
      is_healthy: false,
      total_events: 800,
      successful_events: 720,
      failed_events: 80,
      success_rate_percentage: 90.0,
      avg_response_time_ms: 450,
      last_successful_send: '2024-01-15T08:15:00Z',
    },
  ]);

  const [failedEvents, setFailedEvents] = useState<SiemFailedEvent[]>([
    {
      id: '1',
      siem_name: 'QRadar Enterprise',
      provider: 'qradar',
      event_type: 'SECURITY_ALERT',
      severity: 'HIGH',
      attempts: 3,
      max_attempts: 3,
      error_message: 'Connection timeout after 30 seconds',
      last_error_at: '2024-01-15T10:15:00Z',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      siem_name: 'ELK Stack Security',
      provider: 'elk',
      event_type: 'AUDIT_LOG',
      severity: 'MEDIUM',
      attempts: 2,
      max_attempts: 3,
      error_message: 'Authentication failed - invalid credentials',
      last_error_at: '2024-01-15T09:45:00Z',
      created_at: '2024-01-15T09:30:00Z',
    },
  ]);

  const [eventQueue, setEventQueue] = useState<SiemEventQueue[]>([
    {
      id: '1',
      event_type: 'SECURITY_ALERT',
      severity: 'CRITICAL',
      status: 'pending',
      attempts: 0,
      created_at: '2024-01-15T10:35:00Z',
      scheduled_at: '2024-01-15T10:35:00Z',
    },
    {
      id: '2',
      event_type: 'AUDIT_LOG',
      severity: 'HIGH',
      status: 'processing',
      attempts: 1,
      created_at: '2024-01-15T10:30:00Z',
      scheduled_at: '2024-01-15T10:30:00Z',
    },
  ]);

  // Dados para gráficos
  const eventTrendData = [
    { time: '00:00', sent: 45, failed: 2 },
    { time: '04:00', sent: 32, failed: 1 },
    { time: '08:00', sent: 78, failed: 3 },
    { time: '12:00', sent: 95, failed: 5 },
    { time: '16:00', sent: 120, failed: 2 },
    { time: '20:00', sent: 89, failed: 4 },
  ];

  const providerDistribution = [
    { name: 'Splunk', value: 45, color: '#8884d8' },
    { name: 'ELK Stack', value: 35, color: '#82ca9d' },
    { name: 'QRadar', value: 20, color: '#ffc658' },
  ];

  const responseTimeData = [
    { provider: 'Splunk', time: 180 },
    { provider: 'ELK Stack', time: 220 },
    { provider: 'QRadar', time: 450 },
  ];

  // Funções
  const refreshData = async () => {
    setIsLoading(true);
    // Simular carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  const processQueue = async () => {
    setIsLoading(true);
    // Simular processamento da fila
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Atualizar dados simulados
    setEventQueue(prev => prev.map(event => ({
      ...event,
      status: event.status === 'pending' ? 'sent' : event.status,
      attempts: event.attempts + 1,
    })));
    
    setIsLoading(false);
  };

  const testIntegration = async () => {
    setIsLoading(true);
    // Simular teste de integração
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsLoading(false);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'splunk':
        return <Database className="h-4 w-4" />;
      case 'elk':
        return <Server className="h-4 w-4" />;
      case 'qradar':
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'outline';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'active_configurations':
        return <Server className="h-4 w-4" />;
      case 'healthy_configurations':
        return <CheckCircle className="h-4 w-4" />;
      case 'events_pending':
        return <Clock className="h-4 w-4" />;
      case 'events_sent_24h':
        return <Send className="h-4 w-4" />;
      case 'events_failed_24h':
        return <XCircle className="h-4 w-4" />;
      case 'avg_response_time_ms':
        return <Zap className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integração SIEM</h1>
          <p className="text-muted-foreground">
            Monitoramento e gerenciamento de integrações com sistemas SIEM
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={processQueue}
            disabled={isLoading}
          >
            <Send className="h-4 w-4 mr-2" />
            Processar Fila
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={testIntegration}
            disabled={isLoading}
          >
            <Zap className="h-4 w-4 mr-2" />
            Testar Integração
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.slice(0, 6).map((metric) => {
          const isNegative = metric.metric.includes('failed') || metric.metric.includes('pending');
          return (
            <Card key={metric.metric}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.description}
                </CardTitle>
                {getMetricIcon(metric.metric)}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  isNegative && metric.value > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {metric.value.toLocaleString()}
                  {metric.metric === 'avg_response_time_ms' && 'ms'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alertas */}
      {failedEvents.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Eventos com Falha Detectados</AlertTitle>
          <AlertDescription>
            {failedEvents.length} evento(s) falharam no envio para SIEM. 
            Verifique a aba "Eventos com Falha" para mais detalhes.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="configurations">Configurações</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="queue">Fila de Eventos</TabsTrigger>
          <TabsTrigger value="failed">Eventos com Falha</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Tendência de Eventos */}
            <Card>
              <CardHeader>
                <CardTitle>Tendência de Eventos (24h)</CardTitle>
                <CardDescription>
                  Eventos enviados vs falhados ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={eventTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      name="Enviados"
                    />
                    <Area
                      type="monotone"
                      dataKey="failed"
                      stackId="1"
                      stroke="#ff7c7c"
                      fill="#ff7c7c"
                      name="Falhados"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição por Provider */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Provider</CardTitle>
                <CardDescription>
                  Eventos enviados por sistema SIEM
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={providerDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {providerDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tempo de Resposta */}
            <Card>
              <CardHeader>
                <CardTitle>Tempo de Resposta por Provider</CardTitle>
                <CardDescription>
                  Tempo médio de resposta em milissegundos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="provider" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="time" fill="#8884d8" name="Tempo (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status das Configurações */}
            <Card>
              <CardHeader>
                <CardTitle>Status das Configurações</CardTitle>
                <CardDescription>
                  Estado atual das integrações SIEM
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {configurations.map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getProviderIcon(config.provider)}
                        <div>
                          <p className="font-medium">{config.name}</p>
                          <p className="text-sm text-muted-foreground">{config.provider}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={config.is_active ? 'default' : 'secondary'}>
                          {config.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant={config.is_healthy ? 'default' : 'destructive'}>
                          {config.is_healthy ? 'Saudável' : 'Com Problemas'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="configurations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações SIEM</CardTitle>
              <CardDescription>
                Gerenciar integrações com sistemas SIEM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {configurations.map((config) => (
                  <div key={config.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getProviderIcon(config.provider)}
                        <div>
                          <h3 className="font-semibold">{config.name}</h3>
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={config.is_active ? 'default' : 'secondary'}>
                          {config.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant={config.is_healthy ? 'default' : 'destructive'}>
                          {config.is_healthy ? 'Saudável' : 'Com Problemas'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Provider:</p>
                        <p className="font-medium">{config.provider.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Último Envio:</p>
                        <p className="font-medium">
                          {config.last_successful_send 
                            ? formatTimestamp(config.last_successful_send)
                            : 'Nunca'
                          }
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Endpoint:</p>
                        <p className="font-mono text-xs bg-muted p-2 rounded">
                          {config.endpoint_url}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance das Integrações</CardTitle>
              <CardDescription>
                Métricas de performance e confiabilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance.map((perf) => (
                  <div key={perf.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getProviderIcon(perf.provider)}
                        <div>
                          <h3 className="font-semibold">{perf.name}</h3>
                          <p className="text-sm text-muted-foreground">{perf.provider.toUpperCase()}</p>
                        </div>
                      </div>
                      <Badge variant={perf.is_healthy ? 'default' : 'destructive'}>
                        {perf.is_healthy ? 'Saudável' : 'Com Problemas'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{perf.total_events}</p>
                        <p className="text-xs text-muted-foreground">Total de Eventos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{perf.successful_events}</p>
                        <p className="text-xs text-muted-foreground">Enviados</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{perf.failed_events}</p>
                        <p className="text-xs text-muted-foreground">Falhados</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{perf.avg_response_time_ms}ms</p>
                        <p className="text-xs text-muted-foreground">Tempo Médio</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Taxa de Sucesso</span>
                        <span className="font-medium">{perf.success_rate_percentage}%</span>
                      </div>
                      <Progress value={perf.success_rate_percentage} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fila de Eventos */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fila de Eventos SIEM</CardTitle>
              <CardDescription>
                Eventos aguardando processamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eventQueue.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{event.event_type}</p>
                        <p className="text-sm text-muted-foreground">
                          Criado em: {formatTimestamp(event.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getSeverityColor(event.severity)}>
                        {event.severity}
                      </Badge>
                      <Badge variant={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {event.attempts} tentativas
                      </span>
                    </div>
                  </div>
                ))}
                {eventQueue.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhum evento na fila</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Eventos com Falha */}
        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eventos com Falha</CardTitle>
              <CardDescription>
                Eventos que falharam no envio para SIEM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {failedEvents.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <div>
                          <p className="font-medium">{event.event_type}</p>
                          <p className="text-sm text-muted-foreground">{event.siem_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                        <Badge variant="destructive">
                          {event.attempts}/{event.max_attempts} tentativas
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                      <p className="text-sm font-medium text-red-800">Erro:</p>
                      <p className="text-sm text-red-700">{event.error_message}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Último Erro:</p>
                        <p className="font-medium">{formatTimestamp(event.last_error_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Criado em:</p>
                        <p className="font-medium">{formatTimestamp(event.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {failedEvents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhum evento com falha</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiemIntegrationDashboard;