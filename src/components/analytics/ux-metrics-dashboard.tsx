/**
 * Dashboard de Métricas de UX
 * 
 * Componente para visualização em tempo real das métricas de experiência do usuário,
 * incluindo performance, acessibilidade, interações e issues detectados.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUXMonitoring } from '@/lib/ux-monitoring';
import type { UXMetric, UXIssue, UserInteraction } from '@/lib/ux-monitoring';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock, Eye, MousePointer, Users, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface MetricCardProps {
  title: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  threshold?: { good: number; poor: number };
  icon: React.ReactNode;
  description?: string;
}

interface IssueItemProps {
  issue: UXIssue;
  onResolve?: (issueId: string) => void;
}

interface InteractionHeatmapProps {
  interactions: UserInteraction[];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function UXMetricsDashboard() {
  const { report, isCollecting, startCollecting, stopCollecting } = useUXMonitoring();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  // Função para carregar métricas manualmente
  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      // Simula carregamento de métricas
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Força re-render para atualizar dados
      setSelectedTimeRange(prev => prev);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const metricsData = report?.metrics ?? [];
  const issuesData = report?.issues ?? [];
  const interactionsData = report?.interactions ?? [];

  // Filtrar dados baseado no período selecionado
  const getFilteredData = () => {
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = now - timeRanges[selectedTimeRange];
    
    return {
      metrics: metricsData.filter(m => m.timestamp >= cutoff),
      issues: issuesData.filter(i => i.timestamp >= cutoff),
      interactions: interactionsData.filter(i => i.timestamp >= cutoff)
    };
  };

  const filteredData = getFilteredData();

  // Calcular métricas atuais
  const currentMetrics = {
    pageLoadTime: filteredData.metrics.filter(m => m.type === 'page_load_time').slice(-1)[0]?.value || 0,
    clickDelay: filteredData.metrics.filter(m => m.type === 'click_delay').slice(-1)[0]?.value || 0,
    scrollDepth: filteredData.metrics.filter(m => m.type === 'scroll_depth').slice(-1)[0]?.value || 0,
    errorRate: filteredData.metrics.filter(m => m.type === 'error_rate').slice(-1)[0]?.value || 0,
    accessibilityScore: filteredData.metrics.filter(m => m.type === 'accessibility_score').slice(-1)[0]?.value || 100,
    formCompletionTime: filteredData.metrics.filter(m => m.type === 'form_completion_time').slice(-1)[0]?.value || 0
  };

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // Trigger re-render para atualizar dados
      setSelectedTimeRange(prev => prev);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Métricas de UX</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real da experiência do usuário
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAutoRefresh(false);
              loadMetrics();
            }}
            disabled={loading}
          >
            <Activity className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Métricas
          </Button>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Auto-refresh Ativo' : 'Auto-refresh Inativo'}
          </Button>
          
          {isCollecting ? (
            <Button variant="destructive" size="sm" onClick={stopCollecting}>
              Parar Monitoramento
            </Button>
          ) : (
            <Button size="sm" onClick={startCollecting}>
              Iniciar Monitoramento
            </Button>
          )}
          
        </div>
      </div>

      {/* Status do Monitoramento */}
      {!isCollecting && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            O monitoramento está pausado. Clique em "Iniciar Monitoramento" para começar a coletar métricas.
          </AlertDescription>
        </Alert>
      )}

      {/* Filtros de Tempo */}
      <div className="flex gap-2">
        {(['1h', '6h', '24h', '7d'] as const).map(range => (
          <Button
            key={range}
            variant={selectedTimeRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTimeRange(range)}
          >
            {range === '1h' ? '1 Hora' : 
             range === '6h' ? '6 Horas' : 
             range === '24h' ? '24 Horas' : '7 Dias'}
          </Button>
        ))}
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Tempo de Carregamento"
          value={currentMetrics.pageLoadTime}
          unit="ms"
          threshold={{ good: 2000, poor: 4000 }}
          icon={<Clock className="w-5 h-5" />}
          description="Tempo médio de carregamento da página"
        />
        
        <MetricCard
          title="Delay de Clique"
          value={currentMetrics.clickDelay}
          unit="ms"
          threshold={{ good: 100, poor: 300 }}
          icon={<MousePointer className="w-5 h-5" />}
          description="Tempo de resposta aos cliques"
        />
        
        <MetricCard
          title="Profundidade de Scroll"
          value={currentMetrics.scrollDepth}
          unit="%"
          threshold={{ good: 75, poor: 25 }}
          icon={<Eye className="w-5 h-5" />}
          description="Porcentagem média de scroll na página"
        />
        
        <MetricCard
          title="Taxa de Erro"
          value={currentMetrics.errorRate}
          unit="%"
          threshold={{ good: 1, poor: 5 }}
          icon={<AlertTriangle className="w-5 h-5" />}
          description="Porcentagem de erros JavaScript"
        />
        
        <MetricCard
          title="Score de Acessibilidade"
          value={currentMetrics.accessibilityScore}
          unit="/100"
          threshold={{ good: 90, poor: 70 }}
          icon={<Users className="w-5 h-5" />}
          description="Pontuação de acessibilidade"
        />
        
        <MetricCard
          title="Tempo de Formulário"
          value={currentMetrics.formCompletionTime}
          unit="s"
          threshold={{ good: 30, poor: 120 }}
          icon={<Zap className="w-5 h-5" />}
          description="Tempo médio para completar formulários"
        />
      </div>

      {/* Conteúdo Principal */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="interactions">Interações</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <TrendsView metrics={filteredData.metrics} />
        </TabsContent>

        <TabsContent value="interactions">
          <InteractionsView interactions={filteredData.interactions} />
        </TabsContent>

        <TabsContent value="issues">
          <IssuesView issues={filteredData.issues} />
        </TabsContent>

        <TabsContent value="heatmap">
          <InteractionHeatmap interactions={filteredData.interactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// COMPONENTE DE CARD DE MÉTRICA
// ============================================

function MetricCard({ title, value, unit = '', threshold, icon, description }: MetricCardProps) {
  const getStatus = () => {
    if (!threshold) return 'neutral';
    
    if (title.includes('Taxa de Erro')) {
      // Para taxa de erro, menor é melhor
      if (value <= threshold.good) return 'good';
      if (value >= threshold.poor) return 'poor';
      return 'warning';
    } else {
      // Para outras métricas, maior é melhor (exceto tempo de carregamento)
      if (title.includes('Tempo')) {
        if (value <= threshold.good) return 'good';
        if (value >= threshold.poor) return 'poor';
        return 'warning';
      } else {
        if (value >= threshold.good) return 'good';
        if (value <= threshold.poor) return 'poor';
        return 'warning';
      }
    }
  };

  const status = getStatus();
  const statusColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    poor: 'text-red-600 bg-red-50 border-red-200',
    neutral: 'text-gray-600 bg-gray-50 border-gray-200'
  };

  const statusIcons = {
    good: <CheckCircle className="w-4 h-4" />,
    warning: <Minus className="w-4 h-4" />,
    poor: <AlertTriangle className="w-4 h-4" />,
    neutral: <Activity className="w-4 h-4" />
  };

  return (
    <Card className={`border-2 ${statusColors[status]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-sm">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            {statusIcons[status]}
          </div>
        </div>
        
        <div className="mb-2">
          <span className="text-2xl font-bold">
            {typeof value === 'number' ? value.toFixed(value < 10 ? 1 : 0) : value}
          </span>
          <span className="text-sm text-muted-foreground ml-1">{unit}</span>
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        
        {threshold && (
          <div className="mt-2">
            <Progress 
              value={Math.min(100, (value / (threshold.poor * 1.5)) * 100)} 
              className="h-1"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE DE TENDÊNCIAS
// ============================================

interface TrendsViewProps {
  metrics: UXMetric[];
}

function TrendsView({ metrics }: TrendsViewProps) {
  // Agrupar métricas por tipo e tempo
  const groupedMetrics = metrics.reduce((acc, metric) => {
    const timeKey = new Date(metric.timestamp).toLocaleTimeString();
    if (!acc[timeKey]) acc[timeKey] = { time: timeKey };
    acc[timeKey][metric.type] = metric.value;
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(groupedMetrics).slice(-20); // Últimos 20 pontos

  return (
    <div className="space-y-6">
      {/* Gráfico de Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Tendências de Performance</CardTitle>
          <CardDescription>Evolução das métricas ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="page_load_time" 
                stroke="#3b82f6" 
                name="Tempo de Carregamento (ms)"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="click_delay" 
                stroke="#10b981" 
                name="Delay de Clique (ms)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Engajamento */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Engajamento</CardTitle>
          <CardDescription>Profundidade de scroll e tempo de permanência</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="scroll_depth" 
                stackId="1" 
                stroke="#8b5cf6" 
                fill="#8b5cf6" 
                name="Profundidade de Scroll (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Qualidade */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Qualidade</CardTitle>
          <CardDescription>Taxa de erro e score de acessibilidade</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="error_rate" 
                stroke="#ef4444" 
                name="Taxa de Erro (%)"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="accessibility_score" 
                stroke="#06b6d4" 
                name="Score de Acessibilidade"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// COMPONENTE DE INTERAÇÕES
// ============================================

interface InteractionsViewProps {
  interactions: UserInteraction[];
}

function InteractionsView({ interactions }: InteractionsViewProps) {
  // Agrupar interações por tipo
  const interactionsByType = interactions.reduce((acc, interaction) => {
    acc[interaction.type] = (acc[interaction.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(interactionsByType).map(([type, count]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    count
  }));

  // Interações mais recentes
  const recentInteractions = interactions.slice(-10).reverse();

  return (
    <div className="space-y-6">
      {/* Distribuição de Interações */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Interações</CardTitle>
          <CardDescription>Tipos de interações mais comuns</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Interações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Interações Recentes</CardTitle>
          <CardDescription>Últimas 10 interações registradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentInteractions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma interação registrada ainda
              </p>
            ) : (
              recentInteractions.map((interaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{interaction.type}</Badge>
                    <span className="text-sm">{interaction.element}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(interaction.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// COMPONENTE DE ISSUES
// ============================================

interface IssuesViewProps {
  issues: UXIssue[];
}

function IssuesView({ issues }: IssuesViewProps) {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'critical'>('all');
  
  const filteredIssues = filter === 'all' 
    ? issues 
    : issues.filter(issue => issue.severity === filter);

  const issuesByType = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(issuesByType).map(([type, count]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    count
  }));

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex gap-2">
        {(['all', 'high', 'medium', 'low', 'critical'] as const).map(severity => (
          <Button
            key={severity}
            variant={filter === severity ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(severity)}
          >
            {severity === 'all' ? 'Todos' : 
             severity === 'high' ? 'Alta' : 
             severity === 'medium' ? 'Média' : 
             severity === 'low' ? 'Baixa' : 'Crítica'}
          </Button>
        ))}
      </div>

      {/* Distribuição de Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Issues</CardTitle>
          <CardDescription>Tipos de problemas mais comuns</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                label={(entry: any) => `${entry.type}: ${entry.count}`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lista de Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Issues Detectados</CardTitle>
          <CardDescription>Problemas de UX identificados automaticamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredIssues.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {filter === 'all' ? 'Nenhum issue detectado' : `Nenhum issue de severidade ${filter} detectado`}
              </p>
            ) : (
              filteredIssues.map(issue => (
                <IssueItem key={issue.id} issue={issue} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// COMPONENTE DE ITEM DE ISSUE
// ============================================

function IssueItem({ issue }: IssueItemProps) {
  const severityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    critical: 'bg-red-200 text-red-900 border-red-300'
  } as const;

  const severityIcons = {
    high: <AlertTriangle className="w-4 h-4" />,
    medium: <Clock className="w-4 h-4" />,
    low: <Activity className="w-4 h-4" />,
    critical: <AlertTriangle className="w-4 h-4" />
  } as const;

  return (
    <div className={`border rounded-lg p-4 ${severityColors[issue.severity]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {severityIcons[issue.severity]}
          <span className="font-medium">{issue.type.replace('_', ' ').toUpperCase()}</span>
          <Badge variant="outline" className="text-xs">
            {issue.severity.toUpperCase()}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(issue.timestamp).toLocaleString()}
        </span>
      </div>
      
      <p className="text-sm mb-2">{issue.description}</p>
      
      {issue.element && (
        <div className="text-xs text-muted-foreground">
          <strong>Elemento:</strong> {issue.element}
        </div>
      )}
      
      {issue.page && (
        <div className="text-xs text-muted-foreground">
          <strong>Página:</strong> {issue.page}
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE DE HEATMAP
// ============================================

function InteractionHeatmap({ interactions }: InteractionHeatmapProps) {
  // Agrupar interações por posição
  const heatmapData = interactions.reduce((acc, interaction) => {
    if (interaction.coordinates) {
      const key = `${Math.floor(interaction.coordinates.x / 50)}-${Math.floor(interaction.coordinates.y / 50)}`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const maxInteractions = Math.max(...Object.values(heatmapData), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Heatmap de Interações</CardTitle>
        <CardDescription>Visualização das áreas mais clicadas da página</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
          {Object.entries(heatmapData).map(([key, count]) => {
            const [x, y] = key.split('-').map(Number);
            const intensity = count / maxInteractions;
            
            return (
              <div
                key={key}
                className="absolute w-12 h-12 rounded-full pointer-events-none"
                style={{
                  left: `${x * 50}px`,
                  top: `${y * 50}px`,
                  backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                  transform: 'translate(-50%, -50%)'
                }}
                title={`${count} interações`}
              />
            );
          })}
          
          {Object.keys(heatmapData).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">Nenhuma interação com posição registrada</p>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Menos interações</span>
          <div className="flex items-center gap-1">
            {[0.2, 0.4, 0.6, 0.8, 1.0].map(intensity => (
              <div
                key={intensity}
                className="w-4 h-4 rounded"
                style={{ backgroundColor: `rgba(59, 130, 246, ${intensity})` }}
              />
            ))}
          </div>
          <span>Mais interações</span>
        </div>
      </CardContent>
    </Card>
  );
}
