/**
 * Dashboard de Análise de Comportamento do Usuário
 * 
 * Componente para visualizar métricas de comportamento, segmentação
 * de usuários e recomendações de otimização baseadas em dados reais.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Users,
  Clock,
  MousePointer,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  Target,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import {
  useUserBehaviorAnalytics,
  UserSession,
  AnalyticsReport,
  BehaviorPattern,
  UserSegment,
  OptimizationRecommendation
} from '@/lib/user-behavior-analytics';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface TimeRange {
  label: string;
  value: string;
  start: number;
  end: number;
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  description,
  trend = 'neutral'
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4" />;
      case 'down': return <TrendingDown className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="ml-1">
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

const PatternCard: React.FC<{ pattern: BehaviorPattern }> = ({ pattern }) => {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{pattern.name}</CardTitle>
          <Badge className={getImpactColor(pattern.impact)}>
            {pattern.impact}
          </Badge>
        </div>
        <CardDescription>{pattern.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Frequência:</span>
            <span className="font-medium">{pattern.frequency.toFixed(1)}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Confiança:</span>
            <span className={`font-medium ${getConfidenceColor(pattern.confidence)}`}>
              {pattern.confidence}%
            </span>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Recomendações:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {pattern.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SegmentCard: React.FC<{ segment: UserSegment }> = ({ segment }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{segment.name}</CardTitle>
        <CardDescription>{segment.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Usuários:</span>
            <span className="font-medium">{segment.userCount}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Duração Média:</span>
              <span>{Math.round(segment.characteristics.averageSessionDuration / 1000)}s</span>
            </div>
            
            <div className="flex justify-between text-xs">
              <span>Páginas por Sessão:</span>
              <span>{segment.characteristics.averagePageViews.toFixed(1)}</span>
            </div>
            
            <div className="flex justify-between text-xs">
              <span>Taxa de Rejeição:</span>
              <span>{segment.characteristics.bounceRate.toFixed(1)}%</span>
            </div>
            
            <div className="flex justify-between text-xs">
              <span>Taxa de Conversão:</span>
              <span>{segment.characteristics.conversionRate.toFixed(1)}%</span>
            </div>
          </div>
          
          {segment.behaviorPatterns.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Padrões Identificados:</h4>
              <div className="space-y-1">
                {segment.behaviorPatterns.slice(0, 3).map((pattern, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {pattern.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const RecommendationCard: React.FC<{ recommendation: OptimizationRecommendation }> = ({ recommendation }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{recommendation.title}</CardTitle>
          <Badge className={getPriorityColor(recommendation.priority)}>
            {recommendation.priority}
          </Badge>
        </div>
        <CardDescription>{recommendation.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Impacto Esperado:</span>
            <span className="font-medium text-green-600">+{recommendation.expectedGain}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Esforço:</span>
            <span className={`font-medium ${getEffortColor(recommendation.effort)}`}>
              {recommendation.effort}
            </span>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Implementação:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {recommendation.implementation.map((step, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Métricas a Acompanhar:</h4>
            <div className="flex flex-wrap gap-1">
              {recommendation.metrics.map((metric, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {metric}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const UserBehaviorDashboard: React.FC = () => {
  const {
    currentSession,
    allSessions,
    report,
    trackConversion,
    generateCustomReport
  } = useUserBehaviorAnalytics();

  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 segundos

  // Definir intervalos de tempo
  const timeRanges: TimeRange[] = useMemo(() => {
    const now = Date.now();
    return [
      {
        label: 'Última Hora',
        value: '1h',
        start: now - 60 * 60 * 1000,
        end: now
      },
      {
        label: 'Últimas 24h',
        value: '24h',
        start: now - 24 * 60 * 60 * 1000,
        end: now
      },
      {
        label: 'Últimos 7 dias',
        value: '7d',
        start: now - 7 * 24 * 60 * 60 * 1000,
        end: now
      },
      {
        label: 'Últimos 30 dias',
        value: '30d',
        start: now - 30 * 24 * 60 * 60 * 1000,
        end: now
      }
    ];
  }, []);

  // Gerar relatório personalizado baseado no intervalo selecionado
  const customReport = useMemo(() => {
    const timeRange = timeRanges.find(tr => tr.value === selectedTimeRange);
    if (!timeRange) return report;
    
    return generateCustomReport({
      start: timeRange.start,
      end: timeRange.end
    });
  }, [selectedTimeRange, timeRanges, generateCustomReport, report]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Forçar re-render para atualizar dados
      setSelectedTimeRange(prev => prev);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Preparar dados para gráficos
  const deviceDistribution: ChartData[] = useMemo(() => {
    if (!allSessions.length) return [];
    
    const deviceCounts = allSessions.reduce((acc, session) => {
      const device = session.deviceInfo.type;
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(deviceCounts).map(([device, count]) => ({
      name: device,
      value: count,
      percentage: (count / allSessions.length) * 100
    }));
  }, [allSessions]);

  const sessionDurationDistribution: ChartData[] = useMemo(() => {
    if (!allSessions.length) return [];
    
    const buckets = {
      '0-30s': 0,
      '30s-2m': 0,
      '2m-5m': 0,
      '5m-10m': 0,
      '10m+': 0
    };
    
    allSessions.forEach(session => {
      const duration = session.duration || 0;
      const seconds = duration / 1000;
      
      if (seconds < 30) buckets['0-30s']++;
      else if (seconds < 120) buckets['30s-2m']++;
      else if (seconds < 300) buckets['2m-5m']++;
      else if (seconds < 600) buckets['5m-10m']++;
      else buckets['10m+']++;
    });
    
    return Object.entries(buckets).map(([range, count]) => ({
      name: range,
      value: count,
      percentage: (count / allSessions.length) * 100
    }));
  }, [allSessions]);

  const hourlyActivity: ChartData[] = useMemo(() => {
    if (!allSessions.length) return [];
    
    const hourCounts = new Array(24).fill(0);
    
    allSessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourCounts[hour]++;
    });
    
    return hourCounts.map((count, hour) => ({
      name: `${hour}:00`,
      value: count,
      hour
    }));
  }, [allSessions]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  if (!report && !customReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Coletando dados de comportamento...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Os dados aparecerão conforme os usuários interagem com a aplicação.
          </p>
        </div>
      </div>
    );
  }

  const activeReport = customReport || report;
  if (!activeReport) return null;

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Análise de Comportamento</h1>
          <p className="text-muted-foreground">
            Insights sobre como os usuários interagem com sua aplicação
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAutoRefresh(false);
              loadAnalytics();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </Button>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Auto-refresh Ativo' : 'Auto-refresh Inativo'}
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total de Sessões"
          value={formatNumber(activeReport.totalSessions)}
          icon={<Users className="h-4 w-4" />}
          description="Sessões no período selecionado"
        />
        
        <MetricCard
          title="Usuários Únicos"
          value={formatNumber(activeReport.uniqueUsers)}
          icon={<Eye className="h-4 w-4" />}
          description="Usuários únicos identificados"
        />
        
        <MetricCard
          title="Duração Média"
          value={formatDuration(activeReport.averageSessionDuration)}
          icon={<Clock className="h-4 w-4" />}
          description="Tempo médio por sessão"
        />
        
        <MetricCard
          title="Taxa de Rejeição"
          value={`${activeReport.bounceRate.toFixed(1)}%`}
          icon={<TrendingDown className="h-4 w-4" />}
          description="Usuários que saem rapidamente"
          trend={activeReport.bounceRate > 60 ? 'down' : 'up'}
        />
      </div>

      {/* Tabs principais */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="behavior">Comportamento</TabsTrigger>
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
          <TabsTrigger value="patterns">Padrões</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição por dispositivo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Smartphone className="h-5 w-5 mr-2" />
                  Distribuição por Dispositivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deviceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {deviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Atividade por hora */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Atividade por Hora
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Páginas mais visitadas */}
          <Card>
            <CardHeader>
              <CardTitle>Páginas Mais Visitadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeReport.topPages.slice(0, 5).map((page, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium truncate">{page.title || page.url}</p>
                      <p className="text-sm text-muted-foreground truncate">{page.url}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-medium">{page.views} visualizações</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(page.averageTimeOnPage)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comportamento */}
        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição de duração de sessão */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Duração</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sessionDurationDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Métricas de engajamento */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Engajamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Taxa de Conversão</span>
                      <span className="text-sm font-medium">
                        {activeReport.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={activeReport.conversionRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Taxa de Rejeição</span>
                      <span className="text-sm font-medium">
                        {activeReport.bounceRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={activeReport.bounceRate} className="h-2" />
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Sessões Totais:</span>
                      <span className="text-sm font-medium">{activeReport.totalSessions}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Usuários Únicos:</span>
                      <span className="text-sm font-medium">{activeReport.uniqueUsers}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Duração Média:</span>
                      <span className="text-sm font-medium">
                        {formatDuration(activeReport.averageSessionDuration)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Segmentos */}
        <TabsContent value="segments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeReport.userSegments.map((segment, index) => (
              <SegmentCard key={index} segment={segment} />
            ))}
          </div>
        </TabsContent>

        {/* Padrões */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeReport.behaviorPatterns.map((pattern, index) => (
              <PatternCard key={index} pattern={pattern} />
            ))}
          </div>
        </TabsContent>

        {/* Recomendações */}
        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeReport.recommendations.map((recommendation, index) => (
              <RecommendationCard key={index} recommendation={recommendation} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Sessão atual (se existir) */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Sessão Atual
            </CardTitle>
            <CardDescription>
              Dados da sessão ativa do usuário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Duração:</p>
                <p className="font-medium">
                  {formatDuration(Date.now() - currentSession.startTime)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Páginas Visitadas:</p>
                <p className="font-medium">{currentSession.pageViews.length}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Interações:</p>
                <p className="font-medium">{currentSession.interactions.length}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Dispositivo:</p>
                <p className="font-medium">
                  {currentSession.deviceInfo.type} ({currentSession.deviceInfo.screenWidth}x{currentSession.deviceInfo.screenHeight})
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Navegador:</p>
                <p className="font-medium">
                  {currentSession.browserInfo.name} {currentSession.browserInfo.version}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Erros:</p>
                <p className={`font-medium ${
                  currentSession.errors.length > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {currentSession.errors.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserBehaviorDashboard;