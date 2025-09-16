/**
 * Dashboard Principal de Alertas
 * 
 * Componente centralizado para monitorar e gerenciar todos os tipos de alertas
 * do sistema: segurança, performance, sistema, notificações e aplicação.
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Activity,
  Server,
  Database,
  Network,
  Users,
  Globe,
  Mail,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Download,
  Archive,
  X,
  ChevronRight,
  BarChart3,
  PieChart,
  Calendar
} from 'lucide-react';
import { useSystemAlerts } from '@/hooks/use-system-alerts';
import { useToast } from '@/hooks/use-toast';

// ============================================
// TIPOS E INTERFACES
// ============================================

interface AlertsDashboardProps {
  className?: string;
  userId?: string;
  userRole?: string;
}

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'security' | 'performance' | 'system' | 'database' | 'network' | 'application' | 'notification';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  source: string;
  timestamp: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  assignedTo?: string;
  tags: string[];
  metadata: Record<string, any>;
  actions?: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    action: () => void;
  }>;
}

interface AlertStats {
  total: number;
  active: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved24h: number;
  avgResolutionTime: number; // em minutos
  escalated: number;
  suppressed: number;
}

interface AlertFilters {
  search: string;
  type: string;
  severity: string;
  status: string;
  dateRange: string;
  assignedTo: string;
  source: string;
}

// ============================================
// CONSTANTES
// ============================================

const ALERT_TYPES = [
  { value: 'all', label: 'Todos os Tipos', icon: Bell },
  { value: 'security', label: 'Segurança', icon: Shield },
  { value: 'performance', label: 'Performance', icon: Activity },
  { value: 'system', label: 'Sistema', icon: Server },
  { value: 'database', label: 'Banco de Dados', icon: Database },
  { value: 'network', label: 'Rede', icon: Network },
  { value: 'application', label: 'Aplicação', icon: Globe },
  { value: 'notification', label: 'Notificação', icon: Mail }
];

const SEVERITY_CONFIG = {
  critical: {
    label: 'Crítico',
    color: 'bg-red-50 text-red-700 border-red-200',
    bgColor: 'bg-red-500',
    icon: AlertTriangle
  },
  high: {
    label: 'Alto',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    bgColor: 'bg-orange-500',
    icon: AlertTriangle
  },
  medium: {
    label: 'Médio',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    bgColor: 'bg-yellow-500',
    icon: AlertTriangle
  },
  low: {
    label: 'Baixo',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    bgColor: 'bg-blue-500',
    icon: Bell
  }
};

const STATUS_CONFIG = {
  active: { label: 'Ativo', color: 'bg-red-50 text-red-700 border-red-200' },
  acknowledged: { label: 'Reconhecido', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  resolved: { label: 'Resolvido', color: 'bg-green-50 text-green-700 border-green-200' },
  suppressed: { label: 'Suprimido', color: 'bg-gray-50 text-gray-700 border-gray-200' }
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AlertsDashboard({
  className,
  userId,
  userRole = 'user'
}: AlertsDashboardProps) {
  const { toast } = useToast();
  const { alerts: systemAlerts, isLoading, createAlert } = useSystemAlerts();
  
  // Estados
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    active: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolved24h: 0,
    avgResolutionTime: 0,
    escalated: 0,
    suppressed: 0
  });
  const [filters, setFilters] = useState<AlertFilters>({
    search: '',
    type: 'all',
    severity: 'all',
    status: 'all',
    dateRange: '24h',
    assignedTo: 'all',
    source: 'all'
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ============================================
  // SIMULAÇÃO DE DADOS
  // ============================================
  
  const generateMockAlerts = (): Alert[] => {
    const mockAlerts: Alert[] = [
      {
        id: '1',
        title: 'Tentativas de Login Suspeitas',
        message: 'Detectadas 15 tentativas de login falhadas do IP 192.168.1.100 nos últimos 5 minutos',
        type: 'security',
        severity: 'high',
        status: 'active',
        source: 'Sistema de Autenticação',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        tags: ['brute-force', 'authentication', 'suspicious-ip'],
        metadata: { ip: '192.168.1.100', attempts: 15, user: 'admin' }
      },
      {
        id: '2',
        title: 'Alto Uso de CPU',
        message: 'Uso de CPU acima de 90% por mais de 5 minutos no servidor web-01',
        type: 'performance',
        severity: 'critical',
        status: 'acknowledged',
        source: 'Monitor de Sistema',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        acknowledgedAt: new Date(Date.now() - 5 * 60 * 1000),
        acknowledgedBy: 'João Silva',
        tags: ['cpu', 'performance', 'server'],
        metadata: { server: 'web-01', cpuUsage: 94.5, threshold: 90 }
      },
      {
        id: '3',
        title: 'Falha na Conexão com Banco de Dados',
        message: 'Timeout na conexão com o banco de dados principal após 30 segundos',
        type: 'database',
        severity: 'critical',
        status: 'active',
        source: 'Monitor de Banco',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        tags: ['database', 'timeout', 'connection'],
        metadata: { database: 'main_db', timeout: 30, retries: 3 }
      },
      {
        id: '4',
        title: 'Espaço em Disco Baixo',
        message: 'Partição /var/log com apenas 5% de espaço livre disponível',
        type: 'system',
        severity: 'medium',
        status: 'active',
        source: 'Monitor de Sistema',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        tags: ['disk', 'storage', 'system'],
        metadata: { partition: '/var/log', freeSpace: 5, threshold: 10 }
      },
      {
        id: '5',
        title: 'Falha no Envio de Email',
        message: 'Falha ao enviar 12 emails de notificação nos últimos 10 minutos',
        type: 'notification',
        severity: 'medium',
        status: 'resolved',
        source: 'Sistema de Notificação',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 20 * 60 * 1000),
        tags: ['email', 'notification', 'smtp'],
        metadata: { failedEmails: 12, smtpError: 'Connection timeout' }
      }
    ];
    
    return mockAlerts;
  };

  // ============================================
  // EFEITOS
  // ============================================
  
  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [alerts]);

  // ============================================
  // FUNÇÕES
  // ============================================
  
  const loadAlerts = async () => {
    try {
      setIsRefreshing(true);
      
      // Simular carregamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockAlerts = generateMockAlerts();
      setAlerts(mockAlerts);
      
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar alertas do sistema',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const calculateStats = () => {
    const total = alerts.length;
    const active = alerts.filter(a => a.status === 'active').length;
    const critical = alerts.filter(a => a.severity === 'critical').length;
    const high = alerts.filter(a => a.severity === 'high').length;
    const medium = alerts.filter(a => a.severity === 'medium').length;
    const low = alerts.filter(a => a.severity === 'low').length;
    const resolved24h = alerts.filter(a => 
      a.status === 'resolved' && 
      a.resolvedAt && 
      Date.now() - a.resolvedAt.getTime() < 24 * 60 * 60 * 1000
    ).length;
    const escalated = alerts.filter(a => a.assignedTo).length;
    const suppressed = alerts.filter(a => a.status === 'suppressed').length;
    
    // Calcular tempo médio de resolução (simulado)
    const avgResolutionTime = 45; // minutos
    
    setStats({
      total,
      active,
      critical,
      high,
      medium,
      low,
      resolved24h,
      avgResolutionTime,
      escalated,
      suppressed
    });
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { 
            ...alert, 
            status: 'acknowledged', 
            acknowledgedAt: new Date(),
            acknowledgedBy: 'Usuário Atual'
          }
        : alert
    ));
    
    toast({
      title: 'Alerta Reconhecido',
      description: 'O alerta foi marcado como reconhecido'
    });
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { 
            ...alert, 
            status: 'resolved', 
            resolvedAt: new Date()
          }
        : alert
    ));
    
    toast({
      title: 'Alerta Resolvido',
      description: 'O alerta foi marcado como resolvido'
    });
  };

  const handleSuppressAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'suppressed' }
        : alert
    ));
    
    toast({
      title: 'Alerta Suprimido',
      description: 'O alerta foi suprimido temporariamente'
    });
  };

  const handleBulkAction = (action: string) => {
    if (selectedAlerts.length === 0) {
      toast({
        title: 'Nenhum Alerta Selecionado',
        description: 'Selecione pelo menos um alerta para executar a ação',
        variant: 'destructive'
      });
      return;
    }

    switch (action) {
      case 'acknowledge':
        selectedAlerts.forEach(handleAcknowledgeAlert);
        break;
      case 'resolve':
        selectedAlerts.forEach(handleResolveAlert);
        break;
      case 'suppress':
        selectedAlerts.forEach(handleSuppressAlert);
        break;
    }
    
    setSelectedAlerts([]);
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filters.search && !alert.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !alert.message.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.type !== 'all' && alert.type !== filters.type) return false;
    if (filters.severity !== 'all' && alert.severity !== filters.severity) return false;
    if (filters.status !== 'all' && alert.status !== filters.status) return false;
    
    return true;
  });

  const exportAlerts = () => {
    const data = filteredAlerts.map(alert => ({
      ID: alert.id,
      Título: alert.title,
      Tipo: alert.type,
      Severidade: alert.severity,
      Status: alert.status,
      Origem: alert.source,
      'Data/Hora': format(alert.timestamp, 'dd/MM/yyyy HH:mm:ss'),
      Mensagem: alert.message
    }));
    
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alertas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast({
      title: 'Exportação Concluída',
      description: 'Relatório de alertas exportado com sucesso'
    });
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Alertas</h1>
          <p className="text-muted-foreground">
            Monitoramento centralizado de todos os alertas do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAlerts}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAlerts}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} ativos, {stats.resolved24h} resolvidos hoje
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">
              Requer atenção imediata
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Resolução</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResolutionTime}min</div>
            <p className="text-xs text-muted-foreground">
              Baseado nos últimos 30 dias
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resolução</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.total > 0 ? Math.round((stats.resolved24h / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Últimas 24 horas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar alertas..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALERT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Severidade</Label>
                <Select value={filters.severity} onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="low">Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="acknowledged">Reconhecido</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="suppressed">Suprimido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Última hora</SelectItem>
                    <SelectItem value="24h">Últimas 24h</SelectItem>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    search: '',
                    type: 'all',
                    severity: 'all',
                    status: 'all',
                    dateRange: '24h',
                    assignedTo: 'all',
                    source: 'all'
                  })}
                >
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações em Lote */}
      {selectedAlerts.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedAlerts.length} alerta(s) selecionado(s)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('acknowledge')}
                >
                  Reconhecer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('resolve')}
                >
                  Resolver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('suppress')}
                >
                  Suprimir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAlerts([])}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="alerts">Lista de Alertas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição por Severidade */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição por Severidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(SEVERITY_CONFIG).map(([severity, config]) => {
                    const count = stats[severity as keyof typeof stats] as number;
                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    
                    return (
                      <div key={severity} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-full', config.bgColor)} />
                          <span className="text-sm font-medium">{config.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{count}</span>
                          <div className="w-20">
                            <Progress value={percentage} className="h-2" />
                          </div>
                          <span className="text-xs text-muted-foreground w-10">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Distribuição por Tipo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Distribuição por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ALERT_TYPES.slice(1).map(type => {
                    const count = alerts.filter(a => a.type === type.value).length;
                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    const Icon = type.icon;
                    
                    return (
                      <div key={type.value} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{type.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{count}</span>
                          <div className="w-20">
                            <Progress value={percentage} className="h-2" />
                          </div>
                          <span className="text-xs text-muted-foreground w-10">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Alertas Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas Recentes</CardTitle>
              <CardDescription>
                Últimos alertas registrados no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAlerts.slice(0, 5).map(alert => {
                  const SeverityIcon = SEVERITY_CONFIG[alert.severity].icon;
                  
                  return (
                    <div key={alert.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        <SeverityIcon className={cn(
                          'h-5 w-5',
                          alert.severity === 'critical' ? 'text-red-500' :
                          alert.severity === 'high' ? 'text-orange-500' :
                          alert.severity === 'medium' ? 'text-yellow-500' :
                          'text-blue-500'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{alert.title}</h4>
                          <Badge className={SEVERITY_CONFIG[alert.severity].color}>
                            {SEVERITY_CONFIG[alert.severity].label}
                          </Badge>
                          <Badge className={STATUS_CONFIG[alert.status].color}>
                            {STATUS_CONFIG[alert.status].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{alert.source}</span>
                          <span>{formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ptBR })}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {alert.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            Reconhecer
                          </Button>
                        )}
                        {(alert.status === 'active' || alert.status === 'acknowledged') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            Resolver
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Lista de Alertas */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lista de Alertas</CardTitle>
                  <CardDescription>
                    {filteredAlerts.length} de {alerts.length} alertas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum Alerta Encontrado</h3>
                  <p className="text-muted-foreground">
                    Não há alertas que correspondam aos filtros aplicados.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAlerts.map(alert => {
                    const SeverityIcon = SEVERITY_CONFIG[alert.severity].icon;
                    const isSelected = selectedAlerts.includes(alert.id);
                    
                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          'flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors',
                          isSelected && 'bg-muted border-primary'
                        )}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedAlerts(prev => prev.filter(id => id !== alert.id));
                          } else {
                            setSelectedAlerts(prev => [...prev, alert.id]);
                          }
                        }}
                      >
                        <div className="flex-shrink-0 pt-1">
                          <SeverityIcon className={cn(
                            'h-5 w-5',
                            alert.severity === 'critical' ? 'text-red-500' :
                            alert.severity === 'high' ? 'text-orange-500' :
                            alert.severity === 'medium' ? 'text-yellow-500' :
                            'text-blue-500'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge className={SEVERITY_CONFIG[alert.severity].color}>
                              {SEVERITY_CONFIG[alert.severity].label}
                            </Badge>
                            <Badge className={STATUS_CONFIG[alert.status].color}>
                              {STATUS_CONFIG[alert.status].label}
                            </Badge>
                            <Badge variant="outline">{alert.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Server className="h-3 w-3" />
                              {alert.source}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(alert.timestamp, 'dd/MM/yyyy HH:mm:ss')}
                            </span>
                            {alert.acknowledgedBy && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Reconhecido por {alert.acknowledgedBy}
                              </span>
                            )}
                          </div>
                          {alert.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {alert.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {alert.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcknowledgeAlert(alert.id);
                              }}
                            >
                              Reconhecer
                            </Button>
                          )}
                          {(alert.status === 'active' || alert.status === 'acknowledged') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolveAlert(alert.id);
                              }}
                            >
                              Resolver
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuppressAlert(alert.id);
                            }}
                          >
                            Suprimir
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Métricas de Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tempo Médio de Detecção</span>
                    <span className="text-sm text-muted-foreground">2.3 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tempo Médio de Resposta</span>
                    <span className="text-sm text-muted-foreground">8.7 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tempo Médio de Resolução</span>
                    <span className="text-sm text-muted-foreground">{stats.avgResolutionTime} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Taxa de Falsos Positivos</span>
                    <span className="text-sm text-muted-foreground">3.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Taxa de Escalação</span>
                    <span className="text-sm text-muted-foreground">12.5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Tendências */}
            <Card>
              <CardHeader>
                <CardTitle>Tendências (30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total de Alertas</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">+15%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Alertas Críticos</span>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">-8%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tempo de Resolução</span>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">-12%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Taxa de Resolução</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">+5%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AlertsDashboard;