/**
 * 📊 Dashboard de Analytics - Hub Control
 * 
 * Componente principal para visualização de métricas
 * e relatórios de analytics em tempo real.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar,
  Eye,
  MousePointer,
  CreditCard,
  Clock,
  Server,
  Zap
} from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { analyticsApi } from '../../services/api';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorBoundary from '../ui/ErrorBoundary';

// ============================================================================
// 🎨 CONFIGURAÇÕES E CONSTANTES
// ============================================================================

const DASHBOARD_TYPES = {
  executive: {
    name: 'Executivo',
    description: 'Visão geral do negócio',
    icon: TrendingUp
  },
  operational: {
    name: 'Operacional',
    description: 'Métricas operacionais',
    icon: Activity
  },
  financial: {
    name: 'Financeiro',
    description: 'Análise financeira',
    icon: DollarSign
  }
};

const TIME_PERIODS = {
  '1h': 'Última hora',
  '24h': 'Últimas 24h',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias'
};

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  warning: '#f97316',
  info: '#06b6d4',
  success: '#22c55e'
};

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.accent,
  CHART_COLORS.warning,
  CHART_COLORS.info,
  CHART_COLORS.danger
];

// ============================================================================
// 🧩 COMPONENTE PRINCIPAL
// ============================================================================

const AnalyticsDashboard = () => {
  const [selectedDashboard, setSelectedDashboard] = useState('executive');
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  const [dashboardData, setDashboardData] = useState(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  // ============================================================================
  // 🔄 EFEITOS E CALLBACKS
  // ============================================================================

  // Carregar dados do dashboard
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await analyticsApi.getDashboard(selectedDashboard, selectedPeriod);
      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados do dashboard.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDashboard, selectedPeriod, toast]);

  // Carregar métricas em tempo real
  const loadRealtimeMetrics = useCallback(async () => {
    try {
      const data = await analyticsApi.getRealtimeMetrics();
      setRealtimeMetrics(data);
    } catch (error) {
      console.error('Erro ao carregar métricas em tempo real:', error);
    }
  }, []);

  // Atualizar dados
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      loadRealtimeMetrics()
    ]);
    setRefreshing(false);
    
    toast({
      title: 'Dados atualizados',
      description: 'Dashboard atualizado com sucesso.'
    });
  };

  // Exportar relatório
  const handleExport = async () => {
    try {
      const blob = await analyticsApi.exportReport(selectedDashboard, selectedPeriod);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${selectedDashboard}-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Relatório exportado',
        description: 'Download iniciado com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar o relatório.',
        variant: 'destructive'
      });
    }
  };

  // Efeito inicial
  useEffect(() => {
    loadDashboardData();
    loadRealtimeMetrics();
  }, [loadDashboardData, loadRealtimeMetrics]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadRealtimeMetrics();
    }, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, [autoRefresh, loadRealtimeMetrics]);

  // ============================================================================
  // 🎨 RENDERIZAÇÃO
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-lg">Carregando dashboard...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Acompanhe métricas e indicadores em tempo real
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_PERIODS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Métricas em Tempo Real */}
        {realtimeMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Usuários Ativos"
              value={realtimeMetrics.activeUsers}
              icon={Users}
              color="primary"
              subtitle="Últimos 15 min"
            />
            <MetricCard
              title="Sessões Ativas"
              value={realtimeMetrics.currentSessions}
              icon={Activity}
              color="secondary"
              subtitle="Agora"
            />
            <MetricCard
              title="Transações"
              value={realtimeMetrics.recentTransactions}
              icon={CreditCard}
              color="accent"
              subtitle="Última hora"
            />
            <MetricCard
              title="Taxa de Erro"
              value={formatPercentage(realtimeMetrics.errorRate?.value || 0)}
              icon={AlertTriangle}
              color={realtimeMetrics.errorRate?.value > 5 ? "danger" : "success"}
              subtitle="Última hora"
            />
          </div>
        )}

        {/* Dashboard Tabs */}
        <Tabs value={selectedDashboard} onValueChange={setSelectedDashboard}>
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(DASHBOARD_TYPES).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {config.name}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.keys(DASHBOARD_TYPES).map((dashboardType) => (
            <TabsContent key={dashboardType} value={dashboardType}>
              <DashboardContent
                data={dashboardData}
                type={dashboardType}
                period={selectedPeriod}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </ErrorBoundary>
  );
};

// ============================================================================
// 🧩 COMPONENTES AUXILIARES
// ============================================================================

/**
 * Card de métrica
 */
const MetricCard = ({ title, value, icon: Icon, color, subtitle, trend }) => {
  const colorClasses = {
    primary: 'text-blue-600 bg-blue-50',
    secondary: 'text-green-600 bg-green-50',
    accent: 'text-yellow-600 bg-yellow-50',
    danger: 'text-red-600 bg-red-50',
    warning: 'text-orange-600 bg-orange-50',
    success: 'text-green-600 bg-green-50'
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-full ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        
        {trend && (
          <div className="flex items-center mt-2">
            {trend.direction === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
            )}
            <span className={`text-sm ${
              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.value}%
            </span>
            <span className="text-sm text-muted-foreground ml-1">
              vs período anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Conteúdo do dashboard
 */
const DashboardContent = ({ data, type, period }) => {
  if (!data || !data.widgets) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {data.widgets.map((widget, index) => (
        <WidgetRenderer key={index} widget={widget} />
      ))}
    </div>
  );
};

/**
 * Renderizador de widgets
 */
const WidgetRenderer = ({ widget }) => {
  if (widget.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {widget.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Erro: {widget.error}</p>
        </CardContent>
      </Card>
    );
  }

  switch (widget.type) {
    case 'metric_card':
      return <MetricWidget widget={widget} />;
    case 'line_chart':
      return <LineChartWidget widget={widget} />;
    case 'bar_chart':
      return <BarChartWidget widget={widget} />;
    case 'pie_chart':
      return <PieChartWidget widget={widget} />;
    case 'area_chart':
      return <AreaChartWidget widget={widget} />;
    default:
      return (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Tipo de widget não suportado: {widget.type}
            </p>
          </CardContent>
        </Card>
      );
  }
};

/**
 * Widget de métrica
 */
const MetricWidget = ({ widget }) => {
  const { data } = widget;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        {widget.description && (
          <CardDescription>{widget.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {data.format === 'currency' ? formatCurrency(data.value) :
           data.format === 'percentage' ? formatPercentage(data.value) :
           formatNumber(data.value)}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Widget de gráfico de linha
 */
const LineChartWidget = ({ widget }) => {
  const { data } = widget;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        {widget.description && (
          <CardDescription>{widget.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.datasets[0]?.data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Widget de gráfico de barras
 */
const BarChartWidget = ({ widget }) => {
  const { data } = widget;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        {widget.description && (
          <CardDescription>{widget.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.datasets[0]?.data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill={CHART_COLORS.primary} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Widget de gráfico de pizza
 */
const PieChartWidget = ({ widget }) => {
  const { data } = widget;
  
  const chartData = data.labels?.map((label, index) => ({
    name: label,
    value: data.data[index],
    color: PIE_COLORS[index % PIE_COLORS.length]
  })) || [];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        {widget.description && (
          <CardDescription>{widget.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Widget de gráfico de área
 */
const AreaChartWidget = ({ widget }) => {
  const { data } = widget;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        {widget.description && (
          <CardDescription>{widget.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.datasets[0]?.data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS.primary}
              fill={CHART_COLORS.primary}
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default AnalyticsDashboard;

/**
 * Exemplo de uso:
 * 
 * import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
 * 
 * function App() {
 *   return (
 *     <div className="container mx-auto p-6">
 *       <AnalyticsDashboard />
 *     </div>
 *   );
 * }
 */