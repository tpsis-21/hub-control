'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Webhook,
  BarChart3,
  RefreshCw,
  Download,
  Settings,
  Filter,
  Search,
  Calendar,
  Eye,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos para o dashboard
interface NotificationStats {
  total_notifications_24h: number;
  notifications_last_hour: number;
  unique_types_24h: number;
  total_deliveries_24h: number;
  successful_deliveries_24h: number;
  failed_deliveries_24h: number;
  pending_deliveries_24h: number;
  success_rate_24h: number;
  avg_response_time_24h: number;
  active_channels_24h: number;
  pending_queue_items: number;
  processing_queue_items: number;
  failed_queue_items: number;
  total_webhooks: number;
  active_webhooks: number;
  unique_webhook_urls: number;
  generated_at: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'scheduled' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  created_at: string;
  scheduled_for?: string;
  recipient_count?: number;
  delivery_stats?: {
    delivered: number;
    failed: number;
    pending: number;
  };
}

interface ChannelPerformance {
  channel: string;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  avg_response_time: number;
  unique_recipients: number;
}

interface WebhookAnalysis {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  total_calls_24h: number;
  successful_calls_24h: number;
  failed_calls_24h: number;
  success_rate_24h: number;
  avg_response_time_24h: number;
  last_call_at?: string;
}

const NotificationDashboard: React.FC = () => {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [channelPerformance, setChannelPerformance] = useState<ChannelPerformance[]>([]);
  const [webhookAnalysis, setWebhookAnalysis] = useState<WebhookAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    priority: '',
    dateRange: '24h'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Função para buscar estatísticas do dashboard
  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/notifications/stats?dashboard=true');
      if (!response.ok) throw new Error('Erro ao carregar estatísticas');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as estatísticas do dashboard',
        variant: 'destructive'
      });
    }
  };

  // Função para buscar notificações
  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        ...filters,
        search: searchTerm
      });
      
      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar notificações');
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as notificações',
        variant: 'destructive'
      });
    }
  };

  // Função para buscar performance de canais
  const fetchChannelPerformance = async () => {
    try {
      const response = await fetch('/api/notifications/stats?type=channel_performance');
      if (!response.ok) throw new Error('Erro ao carregar performance de canais');
      const data = await response.json();
      setChannelPerformance(data.channels || []);
    } catch (error) {
      console.error('Erro ao carregar performance de canais:', error);
    }
  };

  // Função para buscar análise de webhooks
  const fetchWebhookAnalysis = async () => {
    try {
      const response = await fetch('/api/notifications/webhooks?analysis=true');
      if (!response.ok) throw new Error('Erro ao carregar análise de webhooks');
      const data = await response.json();
      setWebhookAnalysis(data.webhooks || []);
    } catch (error) {
      console.error('Erro ao carregar análise de webhooks:', error);
    }
  };

  // Função para atualizar todos os dados
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchNotifications(),
        fetchChannelPerformance(),
        fetchWebhookAnalysis()
      ]);
      toast({
        title: 'Sucesso',
        description: 'Dados atualizados com sucesso'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar dados',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await refreshData();
      setLoading(false);
    };
    loadInitialData();
  }, []);

  // Recarregar notificações quando filtros mudarem
  useEffect(() => {
    if (!loading) {
      fetchNotifications();
    }
  }, [filters, searchTerm]);

  // Função para obter ícone do canal
  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Smartphone className="h-4 w-4" />;
      case 'push': return <Bell className="h-4 w-4" />;
      case 'webhook': return <Webhook className="h-4 w-4" />;
      
      case 'teams': return <Users className="h-4 w-4" />;
      case 'discord': return <MessageSquare className="h-4 w-4" />;
      case 'telegram': return <Send className="h-4 w-4" />;
      case 'in_app': return <Bell className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  // Função para obter cor da prioridade
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500';
      case 'sent': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      case 'scheduled': return 'bg-purple-500';
      case 'draft': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Função para exportar dados
  const exportData = async (type: 'notifications' | 'stats' | 'logs', format: 'json' | 'csv' | 'xlsx') => {
    try {
      const endpoint = type === 'notifications' ? '/api/notifications' : 
                      type === 'stats' ? '/api/notifications/stats' : 
                      '/api/notifications/logs';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ export: true, format, ...filters })
      });
      
      if (!response.ok) throw new Error('Erro ao exportar dados');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Sucesso',
        description: 'Dados exportados com sucesso'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao exportar dados',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Notificações</h1>
          <p className="text-muted-foreground">
            Monitore e gerencie todas as notificações do sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Select onValueChange={(value) => exportData('stats', value as any)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Exportar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Estatísticas Principais */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total (24h)</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_notifications_24h}</div>
              <p className="text-xs text-muted-foreground">
                {stats.notifications_last_hour} na última hora
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.success_rate_24h}%</div>
              <Progress value={stats.success_rate_24h} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avg_response_time_24h}ms</div>
              <p className="text-xs text-muted-foreground">
                Tempo de resposta médio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fila Pendente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_queue_items}</div>
              <p className="text-xs text-muted-foreground">
                {stats.processing_queue_items} processando
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas */}
      {stats && (stats.failed_deliveries_24h > 0 || stats.failed_queue_items > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Atenção: {stats.failed_deliveries_24h} entregas falharam nas últimas 24h
            {stats.failed_queue_items > 0 && ` e ${stats.failed_queue_items} itens falharam na fila`}.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="channels">Canais</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Estatísticas de Entrega */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Entrega (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Entregues
                      </span>
                      <span className="font-semibold">{stats.successful_deliveries_24h}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        <XCircle className="h-4 w-4 text-red-500 mr-2" />
                        Falharam
                      </span>
                      <span className="font-semibold">{stats.failed_deliveries_24h}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                        Pendentes
                      </span>
                      <span className="font-semibold">{stats.pending_deliveries_24h}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span>Total de Entregas</span>
                      <span className="font-semibold">{stats.total_deliveries_24h}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance de Canais */}
            <Card>
              <CardHeader>
                <CardTitle>Performance de Canais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {channelPerformance.slice(0, 5).map((channel) => (
                    <div key={channel.channel} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getChannelIcon(channel.channel)}
                        <span className="capitalize">{channel.channel}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{channel.success_rate}%</div>
                        <div className="text-xs text-muted-foreground">
                          {channel.total_deliveries} entregas
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Notificações */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar notificações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os tipos</SelectItem>
                    <SelectItem value="security">Segurança</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="backup">Backup</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os status</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="sent">Enviada</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as prioridades</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Notificações */}
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card key={notification.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(notification.status)}>
                          {notification.status}
                        </Badge>
                        <Badge variant="secondary">{notification.type}</Badge>
                      </div>
                      <h3 className="font-semibold mb-1">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.content.substring(0, 150)}
                        {notification.content.length > 150 && '...'}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>
                          Criada {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                        {notification.recipient_count && (
                          <span>{notification.recipient_count} destinatários</span>
                        )}
                        {notification.delivery_stats && (
                          <span>
                            {notification.delivery_stats.delivered} entregues, 
                            {notification.delivery_stats.failed} falharam
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Canais */}
        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channelPerformance.map((channel) => (
              <Card key={channel.channel}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getChannelIcon(channel.channel)}
                    <span className="capitalize">{channel.channel}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Taxa de Sucesso</span>
                      <span className="font-semibold">{channel.success_rate}%</span>
                    </div>
                    <Progress value={channel.success_rate} />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total</div>
                        <div className="font-semibold">{channel.total_deliveries}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Sucesso</div>
                        <div className="font-semibold text-green-600">{channel.successful_deliveries}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Falhas</div>
                        <div className="font-semibold text-red-600">{channel.failed_deliveries}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Tempo Médio</div>
                        <div className="font-semibold">{channel.avg_response_time}ms</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Webhooks */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="space-y-4">
            {webhookAnalysis.map((webhook) => (
              <Card key={webhook.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{webhook.name}</h3>
                        <Badge variant={webhook.enabled ? 'default' : 'secondary'}>
                          {webhook.enabled ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{webhook.url}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Chamadas (24h)</div>
                          <div className="font-semibold">{webhook.total_calls_24h}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Taxa de Sucesso</div>
                          <div className="font-semibold">{webhook.success_rate_24h}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Tempo Médio</div>
                          <div className="font-semibold">{webhook.avg_response_time_24h}ms</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Última Chamada</div>
                          <div className="font-semibold">
                            {webhook.last_call_at ? 
                              formatDistanceToNow(new Date(webhook.last_call_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              }) : 'Nunca'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationDashboard;