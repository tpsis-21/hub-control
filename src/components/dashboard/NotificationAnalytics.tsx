'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Download,
  Filter,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  RefreshCw,
  FileText,
  Zap,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format as formatDate, formatDistanceToNow, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

// Tipos para analytics
interface NotificationStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_pending: number;
  delivery_rate: number;
  avg_delivery_time: number;
  period_comparison: {
    sent_change: number;
    delivery_rate_change: number;
  };
}

interface ChannelStats {
  channel: string;
  sent: number;
  delivered: number;
  failed: number;
  delivery_rate: number;
  avg_delivery_time: number;
}

interface TypeStats {
  type: string;
  count: number;
  percentage: number;
}

interface TimeSeriesData {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
  delivery_rate: number;
}

interface HourlyData {
  hour: number;
  count: number;
}

interface TopRecipient {
  identifier: string;
  name?: string;
  count: number;
  last_notification: string;
}

interface AnalyticsData {
  stats: NotificationStats;
  channel_stats: ChannelStats[];
  type_stats: TypeStats[];
  time_series: TimeSeriesData[];
  hourly_distribution: HourlyData[];
  top_recipients: TopRecipient[];
  error_analysis: {
    error_type: string;
    count: number;
    percentage: number;
  }[];
}

const NotificationAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [filters, setFilters] = useState({
    channel: '',
    type: '',
    priority: '',
    status: ''
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Cores para gráficos
  const colors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6',
    pink: '#ec4899',
    indigo: '#6366f1'
  };

  const channelColors: Record<string, string> = {
    email: colors.primary,
    sms: colors.success,
    push: colors.warning,

    webhook: colors.info,
    teams: colors.indigo,
    discord: colors.pink,
    telegram: colors.danger
  };

  // Função para buscar dados de analytics
  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateRange?.from ? formatDate(startOfDay(dateRange.from), 'yyyy-MM-dd') : '',
        end_date: dateRange?.to ? formatDate(endOfDay(dateRange.to), 'yyyy-MM-dd') : '',
        ...filters
      });
      
      const response = await fetch(`/api/notifications/stats?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar analytics');
      
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de analytics',
        variant: 'destructive'
      });
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAnalytics();
      setLoading(false);
    };
    loadData();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    if (!loading) {
      fetchAnalytics();
    }
  }, [dateRange, filters]);

  // Função para refresh manual
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast({
      title: 'Atualizado',
      description: 'Dados atualizados com sucesso'
    });
  };

  // Função para exportar dados
  const exportData = async (exportFormat: 'json' | 'csv' | 'xlsx') => {
    try {
      const params = new URLSearchParams({
        format: exportFormat,
        start_date: dateRange?.from ? formatDate(startOfDay(dateRange.from), 'yyyy-MM-dd') : '',
        end_date: dateRange?.to ? formatDate(endOfDay(dateRange.to), 'yyyy-MM-dd') : '',
        ...filters
      });
      
      const response = await fetch(`/api/notifications/stats/export?${params}`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Erro ao exportar dados');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notification-analytics-${exportFormat}.${exportFormat === 'xlsx' ? 'xlsx' : exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Sucesso',
        description: 'Dados exportados com sucesso'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

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

  // Função para formatar porcentagem
  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  // Função para formatar tempo
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
        <p className="text-muted-foreground mb-4">
          Não foi possível carregar os dados de analytics.
        </p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics de Notificações</h1>
          <p className="text-muted-foreground">
            Análise detalhada do desempenho das notificações
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Select onValueChange={(value) => exportData(value as 'json' | 'csv' | 'xlsx')}>
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

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={filters.channel} onValueChange={(value) => setFilters(prev => ({ ...prev, channel: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os canais</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push</SelectItem>

                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os tipos</SelectItem>
                  <SelectItem value="security">Segurança</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as prioridades</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os status</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="channels">Canais</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="recipients">Destinatários</TabsTrigger>
          <TabsTrigger value="errors">Erros</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPIs principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enviadas</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data.stats.total_sent)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {data.stats.period_comparison.sent_change > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  {formatPercentage(Math.abs(data.stats.period_comparison.sent_change))} vs período anterior
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(data.stats.delivery_rate)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {data.stats.period_comparison.delivery_rate_change > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  {formatPercentage(Math.abs(data.stats.period_comparison.delivery_rate_change))} vs período anterior
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTime(data.stats.avg_delivery_time)}</div>
                <p className="text-xs text-muted-foreground">
                  Tempo médio de entrega
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Falhas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatNumber(data.stats.total_failed)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatPercentage((data.stats.total_failed / data.stats.total_sent) * 100)} do total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de tendência */}
          <Card>
            <CardHeader>
              <CardTitle>Tendência de Notificações</CardTitle>
              <CardDescription>
                Volume de notificações ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.time_series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => formatDate(new Date(value), 'dd/MM', { locale: ptBR })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => formatDate(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                    formatter={(value: number, name: string) => [
                      formatNumber(value),
                      name === 'sent' ? 'Enviadas' : name === 'delivered' ? 'Entregues' : 'Falhas'
                    ]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="sent" 
                    stackId="1" 
                    stroke={colors.primary} 
                    fill={colors.primary}
                    name="Enviadas"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="delivered" 
                    stackId="1" 
                    stroke={colors.success} 
                    fill={colors.success}
                    name="Entregues"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="failed" 
                    stackId="1" 
                    stroke={colors.danger} 
                    fill={colors.danger}
                    name="Falhas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição por tipo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo</CardTitle>
                <CardDescription>
                  Tipos de notificação mais utilizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.type_stats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type}: ${formatPercentage(percentage)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.type_stats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(colors)[index % Object.values(colors).length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatNumber(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Distribuição Horária</CardTitle>
                <CardDescription>
                  Volume de notificações por hora do dia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.hourly_distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tickFormatter={(value) => `${value}h`} />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => `${value}:00`}
                      formatter={(value: number) => [formatNumber(value), 'Notificações']}
                    />
                    <Bar dataKey="count" fill={colors.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Canais */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Canal</CardTitle>
              <CardDescription>
                Análise detalhada do desempenho de cada canal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.channel_stats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatNumber(value),
                      name === 'sent' ? 'Enviadas' : name === 'delivered' ? 'Entregues' : 'Falhas'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="sent" fill={colors.primary} name="Enviadas" />
                  <Bar dataKey="delivered" fill={colors.success} name="Entregues" />
                  <Bar dataKey="failed" fill={colors.danger} name="Falhas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cards de canal */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.channel_stats.map((channel) => (
              <Card key={channel.channel}>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: channelColors[channel.channel] || colors.primary }}></div>
                    <CardTitle className="capitalize">{channel.channel}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Enviadas:</span>
                      <span className="font-medium">{formatNumber(channel.sent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Entregues:</span>
                      <span className="font-medium text-green-600">{formatNumber(channel.delivered)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Falhas:</span>
                      <span className="font-medium text-red-600">{formatNumber(channel.failed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Taxa de entrega:</span>
                      <Badge variant={channel.delivery_rate > 95 ? 'default' : channel.delivery_rate > 85 ? 'secondary' : 'destructive'}>
                        {formatPercentage(channel.delivery_rate)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tempo médio:</span>
                      <span className="font-medium">{formatTime(channel.avg_delivery_time)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Tendências */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Taxa de Entrega ao Longo do Tempo</CardTitle>
              <CardDescription>
                Evolução da taxa de entrega por período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.time_series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => formatDate(new Date(value), 'dd/MM', { locale: ptBR })}
                  />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    labelFormatter={(value) => formatDate(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa de Entrega']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="delivery_rate" 
                    stroke={colors.primary} 
                    strokeWidth={2}
                    dot={{ fill: colors.primary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Volume de Notificações</CardTitle>
              <CardDescription>
                Comparação do volume enviado vs entregue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.time_series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => formatDate(new Date(value), 'dd/MM', { locale: ptBR })}
                  />
                  <YAxis tickFormatter={formatNumber} />
                  <Tooltip 
                    labelFormatter={(value) => formatDate(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                    formatter={(value: number, name: string) => [
                      formatNumber(value),
                      name === 'sent' ? 'Enviadas' : 'Entregues'
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sent" 
                    stroke={colors.primary} 
                    strokeWidth={2}
                    name="Enviadas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="delivered" 
                    stroke={colors.success} 
                    strokeWidth={2}
                    name="Entregues"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Destinatários */}
        <TabsContent value="recipients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Destinatários</CardTitle>
              <CardDescription>
                Destinatários que mais recebem notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.top_recipients.map((recipient, index) => (
                  <div key={recipient.identifier} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{recipient.name || recipient.identifier}</p>
                        <p className="text-sm text-muted-foreground">
                          Última notificação: {formatDistanceToNow(new Date(recipient.last_notification), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {formatNumber(recipient.count)} notificações
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Erros */}
        <TabsContent value="errors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Erros</CardTitle>
              <CardDescription>
                Tipos de erro mais comuns e suas frequências
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.error_analysis.map((error, index) => (
                  <div key={error.error_type} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">{error.error_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPercentage(error.percentage)} do total de erros
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      {formatNumber(error.count)} ocorrências
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Erros</CardTitle>
              <CardDescription>
                Visualização dos tipos de erro mais frequentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.error_analysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="error_type" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [formatNumber(value), 'Ocorrências']} />
                  <Bar dataKey="count" fill={colors.danger} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationAnalytics;
