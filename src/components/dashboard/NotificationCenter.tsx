'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Settings,
  BarChart3,
  Globe,
  FileText,
  Activity,
  Users,
  Mail,
  MessageSquare,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  Download,
  Plus,
  Search,
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Importar componentes específicos
import NotificationDashboard from './NotificationDashboard';
import NotificationTemplateManager from './NotificationTemplateManager';
import NotificationSettings from './NotificationSettings';
import NotificationAnalytics from './NotificationAnalytics';
import NotificationWebhooks from './NotificationWebhooks';

// Tipos para o centro de notificações
interface NotificationSummary {
  total_sent_today: number;
  total_delivered_today: number;
  total_failed_today: number;
  delivery_rate_today: number;
  active_channels: number;
  active_webhooks: number;
  pending_notifications: number;
  recent_notifications: RecentNotification[];
  system_health: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  };
  trends: {
    sent_change: number;
    delivery_rate_change: number;
  };
}

interface RecentNotification {
  id: string;
  type: string;
  channel: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  created_at: string;
  delivered_at?: string;
  error_message?: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'secondary' | 'destructive';
}

const NotificationCenter: React.FC = () => {
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Carregar resumo do sistema
  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/notifications/summary');
      if (!response.ok) throw new Error('Erro ao carregar resumo');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o resumo do sistema',
        variant: 'destructive'
      });
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchSummary();
      setLoading(false);
    };
    loadData();
  }, []);

  // Refresh manual
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
    toast({
      title: 'Atualizado',
      description: 'Dados atualizados com sucesso'
    });
  };

  // Ações rápidas
  const quickActions: QuickAction[] = [
    {
      id: 'send-notification',
      title: 'Enviar Notificação',
      description: 'Enviar uma notificação imediata',
      icon: <Bell className="h-5 w-5" />,
      action: () => {
        // Implementar modal de envio rápido
        toast({
          title: 'Em desenvolvimento',
          description: 'Funcionalidade em desenvolvimento'
        });
      }
    },
    {
      id: 'create-template',
      title: 'Novo Template',
      description: 'Criar um novo template de notificação',
      icon: <FileText className="h-5 w-5" />,
      action: () => setActiveTab('templates')
    },
    {
      id: 'configure-webhook',
      title: 'Configurar Webhook',
      description: 'Adicionar um novo webhook',
      icon: <Globe className="h-5 w-5" />,
      action: () => setActiveTab('webhooks')
    },
    {
      id: 'view-analytics',
      title: 'Ver Analytics',
      description: 'Analisar performance das notificações',
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => setActiveTab('analytics')
    }
  ];

  // Função para formatar números
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  // Função para obter ícone do canal
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Smartphone className="h-4 w-4" />;
      case 'push': return <Bell className="h-4 w-4" />;
      
      case 'webhook': return <Globe className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando centro de notificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Centro de Notificações</h1>
          <p className="text-muted-foreground">
            Gerencie e monitore todas as notificações do sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {summary && (
            <>
              {/* Status do sistema */}
              {summary.system_health.status !== 'healthy' && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <CardTitle className="text-yellow-800">
                        {summary.system_health.status === 'warning' ? 'Atenção' : 'Sistema Crítico'}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {summary.system_health.issues.map((issue, index) => (
                        <li key={index} className="text-sm text-yellow-700">• {issue}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* KPIs principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Enviadas Hoje</CardTitle>
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(summary.total_sent_today)}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      {summary.trends.sent_change > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      {Math.abs(summary.trends.sent_change).toFixed(1)}% vs ontem
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.delivery_rate_today.toFixed(1)}%</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      {summary.trends.delivery_rate_change > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      {Math.abs(summary.trends.delivery_rate_change).toFixed(1)}% vs ontem
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Canais Ativos</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.active_channels}</div>
                    <p className="text-xs text-muted-foreground">
                      Canais configurados
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{summary.pending_notifications}</div>
                    <p className="text-xs text-muted-foreground">
                      Aguardando processamento
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Ações rápidas */}
              <Card>
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                  <CardDescription>
                    Acesso rápido às funcionalidades mais utilizadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action) => (
                      <Button
                        key={action.id}
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start space-y-2"
                        onClick={action.action}
                      >
                        <div className="flex items-center space-x-2">
                          {action.icon}
                          <span className="font-medium">{action.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground text-left">
                          {action.description}
                        </p>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Notificações recentes */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Notificações Recentes</CardTitle>
                      <CardDescription>
                        Últimas notificações enviadas pelo sistema
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('dashboard')}>
                      Ver Todas
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {summary.recent_notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma notificação recente</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {summary.recent_notifications.slice(0, 5).map((notification) => (
                        <div key={notification.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {getChannelIcon(notification.channel)}
                              <Badge variant="outline" className="capitalize">
                                {notification.channel}
                              </Badge>
                            </div>
                            <div>
                              <p className="font-medium">{notification.subject}</p>
                              <p className="text-sm text-muted-foreground">
                                Para: {notification.recipient}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={notification.status === 'delivered' ? 'default' : 
                                      notification.status === 'failed' ? 'destructive' : 'secondary'}
                            >
                              {notification.status === 'delivered' ? 'Entregue' :
                               notification.status === 'failed' ? 'Falhou' :
                               notification.status === 'pending' ? 'Pendente' : 'Enviado'}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumo de status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Entregues Hoje</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {formatNumber(summary.total_delivered_today)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {((summary.total_delivered_today / summary.total_sent_today) * 100).toFixed(1)}% do total
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span>Falhas Hoje</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      {formatNumber(summary.total_failed_today)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {((summary.total_failed_today / summary.total_sent_today) * 100).toFixed(1)}% do total
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="h-5 w-5 text-blue-500" />
                      <span>Webhooks Ativos</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {summary.active_webhooks}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Webhooks configurados
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab: Dashboard */}
        <TabsContent value="dashboard">
          <NotificationDashboard />
        </TabsContent>

        {/* Tab: Templates */}
        <TabsContent value="templates">
          <NotificationTemplateManager />
        </TabsContent>

        {/* Tab: Configurações */}
        <TabsContent value="settings">
          <NotificationSettings />
        </TabsContent>

        {/* Tab: Analytics */}
        <TabsContent value="analytics">
          <NotificationAnalytics />
        </TabsContent>

        {/* Tab: Webhooks */}
        <TabsContent value="webhooks">
          <NotificationWebhooks />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationCenter;
