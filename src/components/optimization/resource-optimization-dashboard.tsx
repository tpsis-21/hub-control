/**
 * Dashboard de Otimização de Recursos
 * 
 * Interface para monitorar e gerenciar a otimização automática de recursos
 * do sistema, incluindo métricas em tempo real, histórico de otimizações
 * e configurações do sistema.
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Zap,
  Settings,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  BarChart3,
  Gauge
} from 'lucide-react';
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { logger } from '@/utils/production-logger';
import {
  useResourceOptimization,
  ResourceMetrics,
  OptimizationResult,
  OptimizationRule,
  OptimizationConfig
} from '@/lib/resource-optimization';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  status: 'good' | 'warning' | 'critical';
  trend?: number;
  description?: string;
}

interface OptimizationHistoryProps {
  history: OptimizationResult[];
}

interface ResourceConfigProps {
  config: OptimizationConfig;
  onConfigChange: (config: Partial<OptimizationConfig>) => void;
}

interface RuleManagerProps {
  rules: OptimizationRule[];
  onAddRule: (rule: OptimizationRule) => void;
  onRemoveRule: (ruleId: string) => void;
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  status,
  trend,
  description
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good': return <Badge variant="outline" className="text-green-600 border-green-600">Bom</Badge>;
      case 'warning': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Atenção</Badge>;
      case 'critical': return <Badge variant="destructive">Crítico</Badge>;
      default: return <Badge variant="outline">Normal</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={getStatusColor(status)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">
              {typeof value === 'number' ? value.toFixed(1) : value}{unit}
            </div>
            {trend !== undefined && (
              <div className="flex items-center text-xs text-muted-foreground">
                {trend > 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                ) : trend < 0 ? (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                ) : null}
                {Math.abs(trend).toFixed(1)}% desde a última hora
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div>
            {getStatusBadge(status)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const OptimizationHistory: React.FC<OptimizationHistoryProps> = ({ history }) => {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'memory_cleanup': return <MemoryStick className="h-4 w-4" />;
      case 'cache_optimization': return <HardDrive className="h-4 w-4" />;
      case 'dom_cleanup': return <RefreshCw className="h-4 w-4" />;
      case 'image_optimization': return <Target className="h-4 w-4" />;
      case 'lazy_loading': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActionName = (type: string) => {
    switch (type) {
      case 'memory_cleanup': return 'Limpeza de Memória';
      case 'cache_optimization': return 'Otimização de Cache';
      case 'dom_cleanup': return 'Limpeza do DOM';
      case 'image_optimization': return 'Otimização de Imagens';
      case 'lazy_loading': return 'Carregamento Lazy';
      default: return 'Otimização';
    }
  };

  return (
    <div className="space-y-4">
      {history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma otimização executada ainda</p>
        </div>
      ) : (
        history.map((result, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      {getActionIcon(result.action.type)}
                      <span className="font-medium">
                        {getActionName(result.action.type)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.action.description}
                    </p>
                    {result.error && (
                      <p className="text-sm text-red-600 mt-1">
                        Erro: {result.error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <Badge variant={result.success ? "outline" : "destructive"}>
                      {result.impact > 0 ? '+' : ''}{result.impact.toFixed(1)}%
                    </Badge>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {result.duration.toFixed(0)}ms
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(result.metrics.before.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

const ResourceConfig: React.FC<ResourceConfigProps> = ({ config, onConfigChange }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>
            Configure o comportamento do sistema de otimização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Otimização Automática</label>
              <p className="text-xs text-muted-foreground">
                Ativar otimização automática de recursos
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => onConfigChange({ enabled })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nível de Agressividade</label>
            <Select
              value={config.aggressiveness}
              onValueChange={(aggressiveness: any) => onConfigChange({ aggressiveness })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservador</SelectItem>
                <SelectItem value="moderate">Moderado</SelectItem>
                <SelectItem value="aggressive">Agressivo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Define quão agressivas são as otimizações aplicadas
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Intervalo de Monitoramento: {config.monitoringInterval / 1000}s
            </label>
            <Slider
              value={[config.monitoringInterval / 1000]}
              onValueChange={([value]) => onConfigChange({ monitoringInterval: value * 1000 })}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Intervalo de Otimização: {config.optimizationInterval / 1000}s
            </label>
            <Slider
              value={[config.optimizationInterval / 1000]}
              onValueChange={([value]) => onConfigChange({ optimizationInterval: value * 1000 })}
              min={10}
              max={300}
              step={10}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Máximo de Ações por Minuto: {config.maxActionsPerMinute}
            </label>
            <Slider
              value={[config.maxActionsPerMinute]}
              onValueChange={([value]) => onConfigChange({ maxActionsPerMinute: value })}
              min={1}
              max={20}
              step={1}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Otimização Preditiva</label>
              <p className="text-xs text-muted-foreground">
                Usar machine learning para prever necessidades de otimização
              </p>
            </div>
            <Switch
              checked={config.enablePredictiveOptimization}
              onCheckedChange={(enablePredictiveOptimization) => 
                onConfigChange({ enablePredictiveOptimization })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thresholds de Alerta</CardTitle>
          <CardDescription>
            Configure os limites para acionamento de otimizações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {config.thresholds.map((threshold, index) => (
              <div key={index} className="space-y-2">
                <label className="text-sm font-medium">
                  {threshold.metric} - Crítico: {threshold.critical}{threshold.unit}
                </label>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Aviso</label>
                    <Slider
                      value={[threshold.warning]}
                      onValueChange={([value]) => {
                        const newThresholds = [...config.thresholds];
                        newThresholds[index] = { ...threshold, warning: value };
                        onConfigChange({ thresholds: newThresholds });
                      }}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Crítico</label>
                    <Slider
                      value={[threshold.critical]}
                      onValueChange={([value]) => {
                        const newThresholds = [...config.thresholds];
                        newThresholds[index] = { ...threshold, critical: value };
                        onConfigChange({ thresholds: newThresholds });
                      }}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const RuleManager: React.FC<RuleManagerProps> = ({ rules, onAddRule, onRemoveRule }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Regras de Otimização</h3>
        <Button size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Adicionar Regra
        </Button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{rule.name}</h4>
                    <Badge variant={rule.enabled ? "outline" : "secondary"}>
                      {rule.enabled ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline">
                      Prioridade: {rule.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {rule.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                    <span>Cooldown: {rule.cooldown / 1000}s</span>
                    {rule.lastExecuted && (
                      <span>
                        Última execução: {new Date(rule.lastExecuted).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(enabled) => {
                      // Implementar toggle de regra
                      logger.debug(`Toggle rule ${rule.id}: ${enabled}`);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveRule(rule.id)}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ResourceOptimizationDashboard() {
  const {
    metrics,
    optimizationHistory,
    isOptimizing,
    config,
    startOptimization,
    stopOptimization,
    updateConfig,
    addRule,
    removeRule,
    rules
  } = useResourceOptimization();

  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Determinar status das métricas
  const getMetricStatus = (value: number, thresholds: { warning: number; critical: number }, direction: 'above' | 'below' = 'above') => {
    if (direction === 'above') {
      if (value >= thresholds.critical) return 'critical';
      if (value >= thresholds.warning) return 'warning';
      return 'good';
    } else {
      if (value <= thresholds.critical) return 'critical';
      if (value <= thresholds.warning) return 'warning';
      return 'good';
    }
  };

  // Preparar dados para gráficos
  const chartData = optimizationHistory.slice(-10).map((result, index) => ({
    name: `Ação ${index + 1}`,
    impacto: result.impact,
    duracao: result.duration,
    sucesso: result.success ? 1 : 0
  }));

  const resourceDistribution = metrics ? [
    { name: 'Memória', value: metrics.memory.percentage, color: '#8884d8' },
    { name: 'CPU', value: metrics.cpu.usage, color: '#82ca9d' },
    { name: 'Rede', value: Math.min(100, metrics.network.latency / 5), color: '#ffc658' },
    { name: 'Armazenamento', value: metrics.storage.percentage, color: '#ff7300' }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Otimização de Recursos</h1>
          <p className="text-muted-foreground">
            Monitore e otimize automaticamente o desempenho da aplicação
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAutoRefresh(false);
              // Força uma re-renderização para atualizar as métricas
              window.location.reload();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
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
          <Button
            variant={isOptimizing ? "destructive" : "default"}
            onClick={isOptimizing ? stopOptimization : startOptimization}
          >
            {isOptimizing ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Parar Otimização
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Iniciar Otimização
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Uso de Memória"
            value={metrics.memory.percentage}
            unit="%"
            icon={<MemoryStick className="h-4 w-4" />}
            status={getMetricStatus(metrics.memory.percentage, { warning: 70, critical: 85 })}
            description={`${(metrics.memory.used / 1024 / 1024).toFixed(1)} MB usado`}
          />
          <MetricCard
            title="Uso de CPU"
            value={metrics.cpu.usage}
            unit="%"
            icon={<Cpu className="h-4 w-4" />}
            status={getMetricStatus(metrics.cpu.usage, { warning: 60, critical: 80 })}
            description={`${metrics.cpu.cores} cores disponíveis`}
          />
          <MetricCard
            title="Latência de Rede"
            value={metrics.network.latency}
            unit="ms"
            icon={<Network className="h-4 w-4" />}
            status={getMetricStatus(metrics.network.latency, { warning: 200, critical: 500 })}
            description={`${metrics.network.connectionType} connection`}
          />
          <MetricCard
            title="Performance (FPS)"
            value={metrics.performance.fps}
            unit=""
            icon={<Gauge className="h-4 w-4" />}
            status={getMetricStatus(metrics.performance.fps, { warning: 30, critical: 20 }, 'below')}
            description={`${metrics.dom.nodeCount} elementos DOM`}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Impacto das Otimizações */}
            <Card>
              <CardHeader>
                <CardTitle>Impacto das Otimizações</CardTitle>
                <CardDescription>
                  Efetividade das últimas otimizações executadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="impacto" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição de Recursos */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Recursos</CardTitle>
                <CardDescription>
                  Uso atual dos recursos do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={resourceDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    >
                      {resourceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Métricas Detalhadas */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Métricas Detalhadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">Memória</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Heap Usado</span>
                        <span>{((metrics.memory.heapUsed || 0) / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Heap Total</span>
                        <span>{((metrics.memory.heapTotal || 0) / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <Progress value={metrics.memory.percentage} className="h-2" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Armazenamento</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Usado</span>
                        <span>{(metrics.storage.used / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Disponível</span>
                        <span>{(metrics.storage.available / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <Progress value={metrics.storage.percentage} className="h-2" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Performance</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>FPS</span>
                        <span>{metrics.performance.fps}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Paint Time</span>
                        <span>{metrics.performance.paintTime.toFixed(1)}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Script Time</span>
                        <span>{metrics.performance.scriptTime.toFixed(1)}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Otimizações</CardTitle>
              <CardDescription>
                Registro das otimizações executadas automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OptimizationHistory history={optimizationHistory} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <RuleManager
            rules={rules}
            onAddRule={addRule}
            onRemoveRule={removeRule}
          />
        </TabsContent>

        <TabsContent value="config">
          <ResourceConfig
            config={config}
            onConfigChange={updateConfig}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
