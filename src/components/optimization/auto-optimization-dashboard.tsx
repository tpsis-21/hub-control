/**
 * Dashboard de Otimização Automática
 * 
 * Componente para visualizar e gerenciar otimizações automáticas
 * baseadas em machine learning e análise de padrões de uso.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Brain,
  Zap,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Cpu,
  HardDrive,
  Network,
  Image,
  Database,
  Code,
  Gauge,
  Target,
  Clock,
  Users,
  MemoryStick
} from 'lucide-react';
import {
  useAutoOptimization,
  useOptimizationMetrics,
  getAutoOptimizer,
  OptimizationConfig,
  OptimizationResult
} from '@/lib/auto-optimization';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  type: OptimizationType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: number;
  confidence: number;
  estimatedTime: string;
  category: string;
}

type OptimizationType = 'performance' | 'memory' | 'network' | 'cache' | 'database' | 'ui';

interface OptimizationStats {
  totalRecommendations: number;
  appliedOptimizations: number;
  averageImpact: number;
  averageConfidence: number;
  performanceGain: number;
  memoryGain: number;
  networkGain: number;
}

interface MetricTrend {
  name: string;
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

const RecommendationCard: React.FC<{
  recommendation: OptimizationRecommendation;
  onApply: (id: string) => Promise<void>;
  isApplying: boolean;
}> = ({ recommendation, onApply, isApplying }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: OptimizationType) => {
    switch (type) {
      case 'cache': return <Database className="h-4 w-4" />;
      case 'memory': return <MemoryStick className="h-4 w-4" />;
      case 'performance': return <Cpu className="h-4 w-4" />;
      case 'network': return <Network className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'ui': return <Code className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon(recommendation.type)}
            <CardTitle className="text-lg">{recommendation.description}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityColor(recommendation.priority)}>
              {recommendation.priority}
            </Badge>
            <Badge variant="outline">
              {recommendation.confidence}% confiança
            </Badge>
          </div>
        </div>
        <CardDescription>
          {recommendation.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              +{recommendation.impact}%
            </div>
            <div className="text-sm text-muted-foreground">Impacto</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {recommendation.confidence}%
            </div>
            <div className="text-sm text-muted-foreground">Confiança</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {recommendation.estimatedTime}
            </div>
            <div className="text-sm text-muted-foreground">Tempo Est.</div>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Impacto Estimado</span>
            <span>{recommendation.impact}%</span>
          </div>
          <Progress value={recommendation.impact} className="h-2" />
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Categoria: {recommendation.category}
          </div>
          <Button
            onClick={() => onApply(recommendation.id)}
            disabled={isApplying}
            size="sm"
          >
            {isApplying ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {isApplying ? 'Aplicando...' : 'Aplicar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
}> = ({ title, value, change, icon, description }) => {
  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return 'text-muted-foreground';
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ConfigurationPanel: React.FC<{
  config: OptimizationConfig;
  onConfigChange: (config: Partial<OptimizationConfig>) => void;
}> = ({ config, onConfigChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações de Otimização
        </CardTitle>
        <CardDescription>
          Ajuste os parâmetros do sistema de otimização automática
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Otimização Automática</label>
            <p className="text-xs text-muted-foreground">
              Aplicar otimizações automaticamente quando detectadas
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) =>
              onConfigChange({ enabled: checked })
            }
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Limite Mínimo: {Math.round(config.threshold * 100)}%
          </label>
          <Slider
            value={[config.threshold * 100]}
            onValueChange={([value]) => onConfigChange({ threshold: value / 100 })}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Limite mínimo para aplicar otimizações
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Intervalo de Atualização: {config.interval / 1000}s
          </label>
          <Slider
            value={[config.interval / 1000]}
            onValueChange={([value]) => onConfigChange({ interval: value * 1000 })}
            max={300}
            min={10}
            step={10}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Frequência de coleta de métricas
          </p>
        </div>


      </CardContent>
    </Card>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const AutoOptimizationDashboard: React.FC = () => {
  const {
    isOptimizing,
    results,
    error,
    config
  } = useAutoOptimization();
  
  const metricsHistory = useOptimizationMetrics();
  
  const [isSystemRunning, setIsSystemRunning] = useState(true);
  const [applyingRecommendations, setApplyingRecommendations] = useState<Set<string>>(new Set());
  const [localConfig, setLocalConfig] = useState<OptimizationConfig>({
    enabled: true,
    threshold: 0.7,
    interval: 30000
  });

  // Simular recomendações baseadas nos resultados
  const recommendations: OptimizationRecommendation[] = React.useMemo(() => {
    if (!results?.success) return [];
    
    return [
      {
        id: '1',
        type: 'cache',
        title: 'Otimização de Cache',
        description: 'Implementar cache de recursos estáticos',
        impact: 85,
        confidence: 92,
        estimatedTime: '15 min',
        priority: 'high' as const,
        category: 'Performance'
      },
      {
        id: '2',
        type: 'memory',
        title: 'Gerenciamento de Memória',
        description: 'Otimizar uso de memória',
        impact: 70,
        confidence: 88,
        estimatedTime: '30 min',
        priority: 'medium' as const,
        category: 'Recursos'
      }
    ];
  }, [results]);

  // Calcular estatísticas
  const stats: OptimizationStats = React.useMemo(() => {
    const totalRecommendations = recommendations.length;
    const appliedCount = 0; // Simulado
    const averageImpact = recommendations.length > 0 
      ? recommendations.reduce((sum, rec) => sum + rec.impact, 0) / recommendations.length 
      : 0;
    const averageConfidence = recommendations.length > 0
      ? recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length
      : 0;
    
    const performanceGain = recommendations.reduce((sum, rec) => sum + rec.impact, 0);
    const memoryGain = recommendations.reduce((sum, rec) => sum + rec.confidence, 0);
    const networkGain = recommendations.reduce((sum, rec) => {
      // Extrair número da string estimatedTime (ex: "15 min" -> 15)
      const timeValue = parseInt(rec.estimatedTime.split(' ')[0]) || 0;
      return sum + timeValue;
    }, 0);

    return {
      totalRecommendations,
      appliedOptimizations: appliedCount,
      averageImpact,
      averageConfidence,
      performanceGain,
      memoryGain,
      networkGain
    };
  }, [recommendations]);

  // Preparar dados para gráficos
  const performanceData = React.useMemo(() => {
    // Simular histórico de métricas baseado no valor atual
    const simulatedHistory = Array.from({ length: 20 }, (_, index) => ({
      time: new Date(Date.now() - (19 - index) * 60000).toLocaleTimeString(),
      pageLoad: (metricsHistory.loadTime + Math.random() * 200) / 1000,
      memory: metricsHistory.memoryUsage + Math.random() * 20,
      cacheHit: metricsHistory.cacheHitRate * 100 + Math.random() * 10
    }));
    
    return simulatedHistory;
  }, [metricsHistory]);

  const recommendationsByType = React.useMemo(() => {
    const typeCount: Record<string, number> = {};
    recommendations.forEach(rec => {
      typeCount[rec.type] = (typeCount[rec.type] || 0) + 1;
    });
    
    return Object.entries(typeCount).map(([type, count]) => ({
      name: type,
      value: count
    }));
  }, [recommendations]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Handlers
  const handleApplyRecommendation = async (recommendationId: string) => {
    setApplyingRecommendations(prev => new Set(prev).add(recommendationId));
    
    try {
      // Simular aplicação da recomendação
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Recomendação aplicada:', recommendationId);
    } catch (error) {
      console.error('Erro ao aplicar recomendação:', error);
    } finally {
      setApplyingRecommendations(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendationId);
        return newSet;
      });
    }
  };

  const handleSystemToggle = async () => {
    // Simular toggle do sistema de otimização
    setIsSystemRunning(!isSystemRunning);
    
    if (!isSystemRunning) {
      // Simular início da otimização
      console.log('Sistema de otimização iniciado');
    } else {
      // Simular parada da otimização
      console.log('Sistema de otimização parado');
    }
  };

  const handleConfigChange = (newConfig: Partial<OptimizationConfig>) => {
    const updatedConfig = { ...localConfig, ...newConfig };
    setLocalConfig(updatedConfig);
    // Simular atualização da configuração
    console.log('Configuração atualizada:', updatedConfig);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro no Sistema de Otimização</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8" />
            Otimização Automática
          </h1>
          <p className="text-muted-foreground">
            Sistema inteligente de otimização baseado em machine learning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => console.log('Atualizar recomendações')}
            disabled={isOptimizing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isOptimizing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant={isSystemRunning ? "destructive" : "default"}
            onClick={handleSystemToggle}
          >
            {isSystemRunning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pausar Sistema
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Iniciar Sistema
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Recomendações Ativas"
          value={stats.totalRecommendations}
          icon={<Target className="h-5 w-5 text-blue-500" />}
          description="Otimizações sugeridas"
        />
        <MetricCard
          title="Otimizações Aplicadas"
          value={stats.appliedOptimizations}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          description="Melhorias implementadas"
        />
        <MetricCard
          title="Impacto Médio"
          value={`${stats.averageImpact.toFixed(1)}%`}
          icon={<Gauge className="h-5 w-5 text-orange-500" />}
          description="Ganho estimado"
        />
        <MetricCard
          title="Confiança Média"
          value={`${stats.averageConfidence.toFixed(1)}%`}
          icon={<Brain className="h-5 w-5 text-purple-500" />}
          description="Precisão do modelo"
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recomendações de Otimização</CardTitle>
                  <CardDescription>
                    Sugestões baseadas em análise de machine learning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isOptimizing ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                      Analisando métricas...
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>Nenhuma otimização necessária no momento</p>
                      <p className="text-sm">O sistema está funcionando de forma otimizada</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recommendations.map((recommendation) => (
                        <RecommendationCard
                          key={recommendation.id}
                          recommendation={recommendation}
                          onApply={handleApplyRecommendation}
                          isApplying={applyingRecommendations.has(recommendation.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {/* Ganhos Estimados */}
              <Card>
                <CardHeader>
                  <CardTitle>Ganhos Estimados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Performance</span>
                        <span>+{stats.performanceGain}%</span>
                      </div>
                      <Progress value={Math.min(100, stats.performanceGain)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memória</span>
                        <span>+{stats.memoryGain}%</span>
                      </div>
                      <Progress value={Math.min(100, stats.memoryGain)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Rede</span>
                        <span>+{stats.networkGain}%</span>
                      </div>
                      <Progress value={Math.min(100, stats.networkGain)} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Distribuição por Tipo */}
              {recommendationsByType.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tipos de Otimização</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={recommendationsByType}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {recommendationsByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tendência de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="pageLoad" 
                      stroke="#8884d8" 
                      name="Tempo de Carregamento (s)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uso de Memória</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#82ca9d" 
                      name="Memória (MB)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxa de Acerto do Cache</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="cacheHit" 
                      stroke="#ffc658" 
                      name="Cache Hit Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Histórico de Aplicações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.appliedOptimizations === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhuma otimização aplicada ainda
                    </p>
                  ) : (
                    // Simular otimizações aplicadas baseadas nas recomendações
                    recommendations.slice(0, stats.appliedOptimizations).map((rec, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{rec.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Tempo de Carregamento"
              value={`${(performanceData[performanceData.length - 1]?.pageLoad || 0).toFixed(2)}s`}
              icon={<Clock className="h-5 w-5 text-blue-500" />}
              description="Última medição"
            />
            <MetricCard
              title="Uso de Memória"
              value={`${(performanceData[performanceData.length - 1]?.memory || 0).toFixed(1)}MB`}
              icon={<HardDrive className="h-5 w-5 text-green-500" />}
              description="Consumo atual"
            />
            <MetricCard
              title="Cache Hit Rate"
              value={`${(performanceData[performanceData.length - 1]?.cacheHit || 0).toFixed(1)}%`}
              icon={<Database className="h-5 w-5 text-purple-500" />}
              description="Eficiência do cache"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Métricas Detalhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="pageLoad" 
                    stroke="#8884d8" 
                    name="Tempo de Carregamento (s)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="memory" 
                    stroke="#82ca9d" 
                    name="Memória (MB)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cacheHit" 
                    stroke="#ffc658" 
                    name="Cache Hit Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <ConfigurationPanel
            config={config}
            onConfigChange={handleConfigChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutoOptimizationDashboard;