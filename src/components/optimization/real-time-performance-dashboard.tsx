/**
 * Dashboard de Otimização de Performance em Tempo Real
 * 
 * Interface para monitorar e gerenciar o sistema de otimização
 * automática de performance, exibindo métricas em tempo real,
 * regras de otimização e resultados das ações executadas.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Play,
  Pause,
  Settings,
  TrendingUp,
  TrendingDown,
  Zap,
  Cpu,
  MemoryStick,
  Network,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Download,
  Upload,
  Activity,
  Gauge,
  Target,
  Brain
} from 'lucide-react';
import {
  useRealTimeOptimization,
  usePerformanceMetrics,
  useOptimizationRules,
  PerformanceUtils,
  OptimizationPresets,
  type PerformanceMetrics,
  type OptimizationResult,
  type OptimizationRule,
  type AdaptiveConfig
} from '@/lib/real-time-performance-optimizer';

// ============================================
// COMPONENTES AUXILIARES
// ============================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  icon: React.ReactNode;
  description?: string;
}

function MetricCard({ title, value, change, status, icon, description }: MetricCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'fair': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getChangeIcon = (change?: number) => {
    if (change === undefined) return null;
    return change > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${getStatusColor(status)}`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {description && (
                <p className="text-xs text-gray-500">{description}</p>
              )}
            </div>
          </div>
          {change !== undefined && (
            <div className="flex items-center space-x-1">
              {getChangeIcon(change)}
              <span className={`text-sm font-medium ${
                change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface OptimizationRuleCardProps {
  rule: OptimizationRule;
  executions: number;
  lastExecution?: number;
  onToggle: (ruleId: string) => void;
  onEdit: (rule: OptimizationRule) => void;
  onRemove: (ruleId: string) => void;
}

function OptimizationRuleCard({
  rule,
  executions,
  lastExecution,
  onToggle,
  onEdit,
  onRemove
}: OptimizationRuleCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'rendering': return 'bg-blue-100 text-blue-800';
      case 'memory': return 'bg-green-100 text-green-800';
      case 'network': return 'bg-purple-100 text-purple-800';
      case 'cpu': return 'bg-orange-100 text-orange-800';
      case 'user_experience': return 'bg-pink-100 text-pink-800';
      case 'energy': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-100 text-red-800';
    if (priority >= 6) return 'bg-orange-100 text-orange-800';
    if (priority >= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const isOnCooldown = lastExecution && (Date.now() - lastExecution) < rule.cooldown;
  const hasReachedMaxExecutions = executions >= rule.maxExecutions;

  return (
    <Card className={`${!rule.enabled ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg">{rule.name}</CardTitle>
            <Badge className={getCategoryColor(rule.category)}>
              {rule.category}
            </Badge>
            <Badge className={getPriorityColor(rule.priority)}>
              P{rule.priority}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={rule.enabled}
              onCheckedChange={() => onToggle(rule.id)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(rule)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRemove(rule.id)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>{rule.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Condição:</span>
            <code className="bg-gray-100 px-2 py-1 rounded">
              {rule.condition.metric} {rule.condition.operator} {rule.condition.threshold}
            </code>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Ação:</span>
            <Badge variant="outline">{rule.action.type}</Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Execuções:</span>
              <p className="font-medium">{executions}/{rule.maxExecutions}</p>
            </div>
            <div>
              <span className="text-gray-600">Cooldown:</span>
              <p className="font-medium">{rule.cooldown / 1000}s</p>
            </div>
            <div>
              <span className="text-gray-600">Impacto:</span>
              <p className="font-medium capitalize">{rule.action.impact}</p>
            </div>
          </div>
          
          {(isOnCooldown || hasReachedMaxExecutions) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isOnCooldown && 'Regra em cooldown'}
                {hasReachedMaxExecutions && 'Máximo de execuções atingido'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface OptimizationResultCardProps {
  result: OptimizationResult;
}

function OptimizationResultCard({ result }: OptimizationResultCardProps) {
  const getImpactColor = (value: number) => {
    if (value > 10) return 'text-green-600';
    if (value > 0) return 'text-blue-600';
    if (value > -10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{result.action.type}</CardTitle>
          <div className="flex items-center space-x-2">
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-xs text-gray-500">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">FPS:</span>
              <span className={`ml-2 font-medium ${getImpactColor(result.impact.fpsImprovement)}`}>
                {result.impact.fpsImprovement > 0 ? '+' : ''}{result.impact.fpsImprovement.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Memória:</span>
              <span className={`ml-2 font-medium ${getImpactColor(result.impact.memoryReduction)}`}>
                {result.impact.memoryReduction > 0 ? '-' : '+'}{Math.abs(result.impact.memoryReduction).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-600">Carregamento:</span>
              <span className={`ml-2 font-medium ${getImpactColor(result.impact.loadTimeReduction)}`}>
                {result.impact.loadTimeReduction > 0 ? '-' : '+'}{Math.abs(result.impact.loadTimeReduction).toFixed(0)}ms
              </span>
            </div>
            <div>
              <span className="text-gray-600">UX Score:</span>
              <span className={`ml-2 font-medium ${getImpactColor(result.impact.userExperienceScore)}`}>
                {result.impact.userExperienceScore > 0 ? '+' : ''}{result.impact.userExperienceScore.toFixed(1)}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            Duração: {result.duration}ms
          </div>
          
          {result.error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {result.error}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function RealTimePerformanceDashboard() {
  const {
    isRunning,
    metrics,
    results,
    rules,
    config,
    performanceScore,
    start,
    stop,
    updateConfig,
    resetExecutions,
    getAverageMetrics,
    getAllMetrics
  } = useRealTimeOptimization();

  const {
    rules: optimizationRules,
    executions,
    toggleRule,
    removeRule
  } = useOptimizationRules();

  const [selectedTimeRange, setSelectedTimeRange] = useState('5m');
  const [selectedPreset, setSelectedPreset] = useState('balanced');
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  // Dados para gráficos
  const [chartData, setChartData] = useState<any[]>([]);
  const [impactData, setImpactData] = useState<any[]>([]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const allMetrics = getAllMetrics();
      const timeWindow = getTimeWindowMs(selectedTimeRange);
      const now = Date.now();
      
      const filteredMetrics = allMetrics.filter(
        m => now - m.timestamp <= timeWindow
      );
      
      const chartData = filteredMetrics.map(m => ({
        time: new Date(m.timestamp).toLocaleTimeString(),
        fps: m.core.fps,
        memory: m.memory.memoryPressure,
        loadTime: m.network.loadTime,
        uxScore: PerformanceUtils.calculateUXScore(m)
      }));
      
      setChartData(chartData);
      
      // Dados de impacto das otimizações
      const recentResults = results.slice(-20);
      const impactData = recentResults.map(r => ({
        action: r.action.type,
        fps: r.impact.fpsImprovement,
        memory: r.impact.memoryReduction,
        loadTime: r.impact.loadTimeReduction,
        uxScore: r.impact.userExperienceScore
      }));
      
      setImpactData(impactData);
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedTimeRange, getAllMetrics, results]);

  const getTimeWindowMs = (range: string): number => {
    switch (range) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      default: return 5 * 60 * 1000;
    }
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const presetConfig = OptimizationPresets[preset as keyof typeof OptimizationPresets];
    if (presetConfig) {
      updateConfig(presetConfig);
    }
  };

  const handleExportData = () => {
    const allMetrics = getAllMetrics();
    const csvData = PerformanceUtils.exportMetrics(allMetrics, 'csv');
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatMetrics = metrics ? PerformanceUtils.formatMetrics(metrics) : null;
  const performanceStatus = PerformanceUtils.getPerformanceStatus(performanceScore);
  const recommendations = metrics ? PerformanceUtils.generateRecommendations(metrics) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Otimização de Performance em Tempo Real</h1>
          <p className="text-gray-600">
            Monitoramento e otimização automática de performance da aplicação
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setLoading(true);
              setAutoRefresh(false);
              try {
                getAllMetrics();
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <Activity className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Métricas
          </Button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Auto-refresh:</span>
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1m</SelectItem>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={isRunning ? "destructive" : "default"}
            onClick={isRunning ? stop : start}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Parar
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gauge className="h-5 w-5" />
            <span>Status da Otimização</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-3 h-3 rounded-full ${
                isRunning ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="font-medium">
                {isRunning ? 'Ativo' : 'Inativo'}
              </span>
              <Badge className={`${
                performanceStatus === 'excellent' ? 'bg-green-100 text-green-800' :
                performanceStatus === 'good' ? 'bg-blue-100 text-blue-800' :
                performanceStatus === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {performanceStatus}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Score de Performance</p>
                <p className="text-2xl font-bold">{performanceScore.toFixed(0)}/100</p>
              </div>
              <Progress value={performanceScore} className="w-32" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principais */}
      {formatMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="FPS"
            value={formatMetrics.fps}
            status={metrics!.core.fps >= 50 ? 'excellent' : metrics!.core.fps >= 30 ? 'good' : 'poor'}
            icon={<Activity className="h-5 w-5" />}
            description="Frames por segundo"
          />
          <MetricCard
            title="Memória"
            value={formatMetrics.memory}
            status={metrics!.memory.memoryPressure <= 60 ? 'excellent' : metrics!.memory.memoryPressure <= 80 ? 'good' : 'poor'}
            icon={<MemoryStick className="h-5 w-5" />}
            description="Pressão de memória"
          />
          <MetricCard
            title="Carregamento"
            value={formatMetrics.loadTime}
            status={metrics!.network.loadTime <= 1000 ? 'excellent' : metrics!.network.loadTime <= 3000 ? 'good' : 'poor'}
            icon={<Network className="h-5 w-5" />}
            description="Tempo de carregamento"
          />
          <MetricCard
            title="UX Score"
            value={formatMetrics.userScore}
            status={performanceStatus}
            icon={<Target className="h-5 w-5" />}
            description="Experiência do usuário"
          />
        </div>
      )}

      {/* Tabs principais */}
      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        {/* Tab: Métricas */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Tendência de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="fps" stroke="#8884d8" name="FPS" />
                    <Line type="monotone" dataKey="uxScore" stroke="#82ca9d" name="UX Score" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Memória */}
            <Card>
              <CardHeader>
                <CardTitle>Uso de Recursos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="memory" stackId="1" stroke="#ffc658" fill="#ffc658" name="Memória %" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recomendações */}
          {recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Recomendações de Otimização</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{rec}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Regras */}
        <TabsContent value="rules" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Regras de Otimização</h2>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={resetExecutions}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Execuções
              </Button>
              <Button>
                <Zap className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {optimizationRules.map(rule => (
              <OptimizationRuleCard
                key={rule.id}
                rule={rule}
                executions={executions.get(rule.id) || 0}
                onToggle={toggleRule}
                onEdit={() => {}}
                onRemove={removeRule}
              />
            ))}
          </div>
        </TabsContent>

        {/* Tab: Resultados */}
        <TabsContent value="results" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Histórico de Otimizações</h2>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Dados
            </Button>
          </div>

          {/* Gráfico de Impacto */}
          {impactData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Impacto das Otimizações</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={impactData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="action" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="fps" fill="#8884d8" name="FPS" />
                    <Bar dataKey="uxScore" fill="#82ca9d" name="UX Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Lista de Resultados */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {results.slice(-10).reverse().map(result => (
              <OptimizationResultCard key={result.id} result={result} />
            ))}
          </div>
        </TabsContent>

        {/* Tab: Configuração */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Presets */}
            <Card>
              <CardHeader>
                <CardTitle>Presets de Configuração</CardTitle>
                <CardDescription>
                  Configurações predefinidas para diferentes cenários
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedPreset} onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lowEnd">Dispositivos Baixa Performance</SelectItem>
                    <SelectItem value="balanced">Balanceado</SelectItem>
                    <SelectItem value="highEnd">Dispositivos Alta Performance</SelectItem>
                    <SelectItem value="energySaver">Economia de Energia</SelectItem>
                  </SelectContent>
                </Select>
                
{config && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Taxa de Aprendizado</label>
                      <Slider
                        value={[config.learningRate * 100]}
                        onValueChange={([value]) => updateConfig({
                          learningRate: value / 100
                        })}
                        min={1}
                        max={50}
                        step={1}
                      />
                      <span className="text-xs text-gray-500">{(config.learningRate * 100).toFixed(1)}%</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Limite de Adaptação</label>
                      <Slider
                        value={[config.adaptationThreshold * 100]}
                        onValueChange={([value]) => updateConfig({
                          adaptationThreshold: value / 100
                        })}
                        min={10}
                        max={90}
                        step={5}
                      />
                      <span className="text-xs text-gray-500">{(config.adaptationThreshold * 100).toFixed(0)}%</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Targets de Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Targets de Performance</CardTitle>
                <CardDescription>
                  Metas de performance para otimização
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {config && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">FPS Target</label>
                      <Slider
                        value={[config.performanceTarget.targetFPS]}
                        onValueChange={([value]) => updateConfig({
                          performanceTarget: { ...config.performanceTarget, targetFPS: value }
                        })}
                        min={30}
                        max={120}
                        step={10}
                      />
                      <span className="text-xs text-gray-500">{config.performanceTarget.targetFPS} FPS</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Máximo Uso de Memória</label>
                      <Slider
                        value={[config.performanceTarget.maxMemoryUsage]}
                        onValueChange={([value]) => updateConfig({
                          performanceTarget: { ...config.performanceTarget, maxMemoryUsage: value }
                        })}
                        min={50}
                        max={95}
                        step={5}
                      />
                      <span className="text-xs text-gray-500">{config.performanceTarget.maxMemoryUsage}%</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Máximo Tempo de Carregamento</label>
                      <Slider
                        value={[config.performanceTarget.maxLoadTime]}
                        onValueChange={([value]) => updateConfig({
                          performanceTarget: { ...config.performanceTarget, maxLoadTime: value }
                        })}
                        min={1000}
                        max={10000}
                        step={500}
                      />
                      <span className="text-xs text-gray-500">{config.performanceTarget.maxLoadTime}ms</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
