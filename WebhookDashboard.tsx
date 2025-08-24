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
import {
  Webhook,
  Send,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Settings,
  RefreshCw,
  Play,
  Pause,
  TestTube,
  Zap,
  Globe,
  MessageSquare,
  Mail,
  Slack,
  MessageCircle,
} from 'lucide-react';

// Tipos TypeScript
interface WebhookMetrics {
  metric: string;
  value: number;
  description: string;
}

interface WebhookConfig {
  id: string;
  name: string;
  webhook_type: string;
  webhook_url: string;
  is_active: boolean;
  is_healthy: boolean;
  severity_filter: string[];
  rate_limit_per_minute: number;
  last_successful_send: string | null;
  created_at: string;
}

interface WebhookQueueItem {
  id: string;
  webhook_name: string;
  webhook_type: string;
  event_type: string;
  severity: string;
  status: string;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

interface WebhookHealth {
  webhook_id: string;
  name: string;
  type: string;
  is_healthy: boolean;
  last_successful_send: string | null;
}

const WebhookDashboard: React.FC = () => {
  // Estados
  const [metrics, setMetrics] = useState<WebhookMetrics[]>([]);
  const [configurations, setConfigurations] = useState<WebhookConfig[]>([]);
  const [queueItems, setQueueItems] = useState<WebhookQueueItem[]>([]);
  const [healthStatus, setHealthStatus] = useState<WebhookHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Dados simulados para demonstração
  const generateMockData = () => {
    const mockMetrics: WebhookMetrics[] = [
      { metric: 'active_webhooks', value: 4, description: 'Webhooks ativos' },
      { metric: 'healthy_webhooks', value: 3, description: 'Webhooks saudáveis' },
      { metric: 'webhooks_pending', value: 12, description: 'Webhooks pendentes' },
      { metric: 'webhooks_sent_24h', value: 156, description: 'Webhooks enviados nas últimas 24h' },
      { metric: 'webhooks_failed_24h', value: 3, description: 'Webhooks falharam nas últimas 24h' },
    ];

    const mockConfigurations: WebhookConfig[] = [
      {
        id: '1',
        name: 'Slack Security Alerts',
        webhook_type: 'slack',
        webhook_url: 'https://hooks.slack.com/services/...',
        is_active: true,
        is_healthy: true,
        severity_filter: ['CRITICAL', 'HIGH'],
        rate_limit_per_minute: 5,
        last_successful_send: new Date(Date.now() - 300000).toISOString(),
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '2',
        name: 'Teams Security Channel',
        webhook_type: 'teams',
        webhook_url: 'https://outlook.office.com/webhook/...',
        is_active: true,
        is_healthy: true,
        severity_filter: ['CRITICAL', 'HIGH'],
        rate_limit_per_minute: 5,
        last_successful_send: new Date(Date.now() - 600000).toISOString(),
        created_at: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: '3',
        name: 'Discord Alerts',
        webhook_type: 'discord',
        webhook_url: 'https://discord.com/api/webhooks/...',
        is_active: true,
        is_healthy: false,
        severity_filter: ['CRITICAL'],
        rate_limit_per_minute: 3,
        last_successful_send: new Date(Date.now() - 3600000).toISOString(),
        created_at: new Date(Date.now() - 259200000).toISOString(),
      },
      {
        id: '4',
        name: 'Custom API Endpoint',
        webhook_type: 'generic',
        webhook_url: 'https://api.company.com/security-alerts',
        is_active: false,
        is_healthy: true,
        severity_filter: ['CRITICAL', 'HIGH', 'MEDIUM'],
        rate_limit_per_minute: 10,
        last_successful_send: new Date(Date.now() - 7200000).toISOString(),
        created_at: new Date(Date.now() - 345600000).toISOString(),
      },
    ];

    const mockQueueItems: WebhookQueueItem[] = [
      {
        id: '1',
        webhook_name: 'Slack Security Alerts',
        webhook_type: 'slack',
        event_type: 'SECURITY_ALERT',
        severity: 'CRITICAL',
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        error_message: null,
        created_at: new Date(Date.now() - 60000).toISOString(),
        sent_at: null,
      },
      {
        id: '2',
        webhook_name: 'Teams Security Channel',
        webhook_type: 'teams',
        event_type: 'LOGIN_FAILURE',
        severity: 'HIGH',
        status: 'sent',
        attempts: 1,
        max_attempts: 3,
        error_message: null,
        created_at: new Date(Date.now() - 300000).toISOString(),
        sent_at: new Date(Date.now() - 240000).toISOString(),
      },
      {
        id: '3',
        webhook_name: 'Discord Alerts',
        webhook_type: 'discord',
        event_type: 'SUSPICIOUS_ACTIVITY',
        severity: 'CRITICAL',
        status: 'failed',
        attempts: 3,
        max_attempts: 3,
        error_message: 'Connection timeout',
        created_at: new Date(Date.now() - 900000).toISOString(),
        sent_at: null,
      },
    ];

    const mockHealthStatus: WebhookHealth[] = mockConfigurations.map(config => ({
      webhook_id: config.id,
      name: config.name,
      type: config.webhook_type,
      is_healthy: config.is_healthy,
      last_successful_send: config.last_successful_send,
    }));

    setMetrics(mockMetrics);
    setConfigurations(mockConfigurations);
    setQueueItems(mockQueueItems);
    setHealthStatus(mockHealthStatus);
  };

  // Dados para gráficos
  const performanceData = [
    { time: '00:00', sent: 12, failed: 1 },
    { time: '04:00', sent: 8, failed: 0 },
    { time: '08:00', sent: 25, failed: 2 },
    { time: '12:00', sent: 18, failed: 1 },
    { time: '16:00', sent: 32, failed: 0 },
    { time: '20:00', sent: 28, failed: 1 },
  ];

  const webhookTypeData = [
    { name: 'Slack', value: 45, color: '#4A154B' },
    { name: 'Teams', value: 30, color: '#6264A7' },
    { name: 'Discord', value: 15, color: '#5865F2' },
    { name: 'Generic', value: 10, color: '#6B7280' },
  ];

  const severityDistribution = [
    { severity: 'CRITICAL', count: 8 },
    { severity: 'HIGH', count: 24 },
    { severity: 'MEDIUM', count: 45 },
    { severity: 'LOW', count: 12 },
  ];

  // Funções utilitárias
  const getWebhookIcon = (type: string) => {
    switch (type) {
      case 'slack':
        return <Slack className="h-4 w-4" />;
      case 'teams':
        return <MessageSquare className="h-4 w-4" />;
      case 'discord':
        return <MessageCircle className="h-4 w-4" />;
      case 'generic':
        return <Globe className="h-4 w-4" />;
      default:
        return <Webhook className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      failed: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      processing: { variant: 'outline' as const, icon: RefreshCw, color: 'text-blue-600' },
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50';
      case 'LOW':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  // Funções de ação
  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      generateMockData();
      setLastUpdate(new Date());
      setIsLoading(false);
    }, 1000);
  };

  const handleProcessQueue = () => {
    console.log('Processando fila de webhooks...');
    // Simular processamento
    setTimeout(() => {
      setQueueItems(prev => 
        prev.map(item => 
          item.status === 'pending' 
            ? { ...item, status: 'sent', sent_at: new Date().toISOString() }
            : item
        )
      );
    }, 1000);
  };

  const handleTestWebhook = (webhookId: string) => {
    console.log(`Testando webhook ${webhookId}...`);
    // Simular teste
  };

  const handleToggleWebhook = (webhookId: string) => {
    setConfigurations(prev => 
      prev.map(config => 
        config.id === webhookId 
          ? { ...config, is_active: !config.is_active }
          : config
      )
    );
  };

  // Efeitos
  useEffect(() => {
    generateMockData();
    setIsLoading(false);

    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      generateMockData();
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dashboard de webhooks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Webhooks</h1>
          <p className="text-muted-foreground">
            Monitoramento e gerenciamento de notificações de segurança
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleProcessQueue} variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Processar Fila
          </Button>
          <Button onClick={handleRefreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => {
          const icons = {
            active_webhooks: Webhook,
            healthy_webhooks: CheckCircle,
            webhooks_pending: Clock,
            webhooks_sent_24h: Send,
            webhooks_failed_24h: XCircle,
          };
          
          const Icon = icons[metric.metric as keyof typeof icons] || Activity;
          
          return (
            <Card key={metric.metric}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.description}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">
                  Atualizado {formatTimeAgo(lastUpdate.toISOString())}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="configurations">Configurações</TabsTrigger>
          <TabsTrigger value="queue">Fila</TabsTrigger>
          <TabsTrigger value="health">Saúde</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Performance nas últimas 24h */}
            <Card>
              <CardHeader>
                <CardTitle>Performance nas Últimas 24h</CardTitle>
                <CardDescription>
                  Webhooks enviados vs falhados por período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Enviados"
                    />
                    <Area
                      type="monotone"
                      dataKey="failed"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="Falhados"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição por Tipo */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo</CardTitle>
                <CardDescription>
                  Webhooks enviados por plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={webhookTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {webhookTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Distribuição por Severidade */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Severidade</CardTitle>
              <CardDescription>
                Alertas enviados por nível de severidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={severityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="severity" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="configurations" className="space-y-4">
          <div className="grid gap-4">
            {configurations.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getWebhookIcon(config.webhook_type)}
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <Badge variant={config.is_active ? 'default' : 'secondary'}>
                        {config.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Badge variant={config.is_healthy ? 'default' : 'destructive'}>
                        {config.is_healthy ? 'Saudável' : 'Com Problemas'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleTestWebhook(config.id)}
                        variant="outline"
                        size="sm"
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        Testar
                      </Button>
                      <Button
                        onClick={() => handleToggleWebhook(config.id)}
                        variant={config.is_active ? 'destructive' : 'default'}
                        size="sm"
                      >
                        {config.is_active ? (
                          <><Pause className="h-4 w-4 mr-2" />Pausar</>
                        ) : (
                          <><Play className="h-4 w-4 mr-2" />Ativar</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm font-medium">Tipo</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {config.webhook_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Filtro de Severidade</p>
                      <div className="flex gap-1 mt-1">
                        {config.severity_filter.map((severity) => (
                          <Badge
                            key={severity}
                            variant="outline"
                            className={getSeverityColor(severity)}
                          >
                            {severity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Rate Limit</p>
                      <p className="text-sm text-muted-foreground">
                        {config.rate_limit_per_minute}/min
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Último Envio</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTimeAgo(config.last_successful_send)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium">URL</p>
                    <p className="text-sm text-muted-foreground font-mono break-all">
                      {config.webhook_url.replace(/\/[^/]*$/, '/***')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Fila */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fila de Webhooks</CardTitle>
              <CardDescription>
                Webhooks pendentes e histórico recente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queueItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {getWebhookIcon(item.webhook_type)}
                      <div>
                        <p className="font-medium">{item.webhook_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.event_type}
                        </p>
                      </div>
                      <Badge className={getSeverityColor(item.severity)}>
                        {item.severity}
                      </Badge>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {item.attempts}/{item.max_attempts} tentativas
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTimeAgo(item.created_at)}
                      </p>
                      {item.error_message && (
                        <p className="text-sm text-red-600 mt-1">
                          {item.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saúde */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {healthStatus.map((health) => (
              <Card key={health.webhook_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getWebhookIcon(health.type)}
                      <CardTitle className="text-lg">{health.name}</CardTitle>
                    </div>
                    <Badge variant={health.is_healthy ? 'default' : 'destructive'}>
                      {health.is_healthy ? 'Saudável' : 'Com Problemas'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <span className={`text-sm ${health.is_healthy ? 'text-green-600' : 'text-red-600'}`}>
                        {health.is_healthy ? 'Operacional' : 'Indisponível'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Último Sucesso:</span>
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(health.last_successful_send)}
                      </span>
                    </div>
                    <Progress 
                      value={health.is_healthy ? 100 : 0} 
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertTitle>Analytics Avançado</AlertTitle>
            <AlertDescription>
              Métricas detalhadas de performance, tendências e insights sobre o sistema de webhooks.
              Esta seção pode incluir análises de latência, taxa de sucesso por período, 
              identificação de padrões de falha e recomendações de otimização.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Sucesso por Hora</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="sent" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Enviados"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Latência Média</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">245ms</div>
                  <p className="text-sm text-muted-foreground">Tempo médio de resposta</p>
                  <Progress value={75} className="mt-4" />
                  <p className="text-xs text-muted-foreground mt-2">
                    25% melhor que a média histórica
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebhookDashboard;